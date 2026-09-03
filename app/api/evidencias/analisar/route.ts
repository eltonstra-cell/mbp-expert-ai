import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import {
  autorizaAcaoServidor,
  obterAcessoServidor,
} from "@/lib/serverAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const schemaAnalise = {
  type: "object",
  additionalProperties: false,
  required: [
    "analisavel",
    "resumo",
    "classificacao",
    "achados",
    "alertasPrivacidade",
    "observacoesLimitacoes",
  ],
  properties: {
    analisavel: { type: "boolean" },
    resumo: { type: "string" },
    classificacao: {
      type: "string",
      enum: [
        "Visão geral",
        "Detalhe",
        "Possível evidência de não conformidade",
        "Comprovação de correção",
        "Não determinada",
      ],
    },
    achados: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titulo", "descricao", "confianca", "requerConfirmacao"],
        properties: {
          titulo: { type: "string" },
          descricao: { type: "string" },
          confianca: { type: "string", enum: ["Baixa", "Média", "Alta"] },
          requerConfirmacao: { type: "boolean" },
        },
      },
    },
    alertasPrivacidade: { type: "array", items: { type: "string" }, maxItems: 5 },
    observacoesLimitacoes: { type: "array", items: { type: "string" }, maxItems: 5 },
  },
} as const;

function extrairTextoResposta(body: any): string {
  if (typeof body?.output_text === "string") return body.output_text;

  for (const item of Array.isArray(body?.output) ? body.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "output_text" && typeof content?.text === "string") {
        return content.text;
      }
    }
  }

  return "";
}

function contextoSeguro(valor: unknown, limite = 800): string {
  return typeof valor === "string" ? valor.trim().slice(0, limite) : "";
}

async function carregarImagem(pathname: string) {
  if (!pathname.startsWith("evidencias/")) {
    throw new Error("PATH_INVALIDO");
  }

  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error("ARQUIVO_NAO_ENCONTRADO");
  }

  const contentType = (result.blob.contentType || "").toLowerCase();
  if (!IMAGE_TYPES.has(contentType)) {
    throw new Error("TIPO_INVALIDO");
  }

  const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("ARQUIVO_GRANDE");
  }

  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "A análise por IA ainda não foi configurada no servidor." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const pathname = contextoSeguro(body?.pathname, 1200);
    if (!pathname) {
      return NextResponse.json({ error: "Foto não informada." }, { status: 400 });
    }

    const acesso = await obterAcessoServidor();
    const evidencia = acesso.autorizado && acesso.data
      ? acesso.data.evidencias.find((item) => item.blobPathname === pathname)
      : undefined;
    if (
      acesso.aplicado &&
      (!evidencia ||
        !autorizaAcaoServidor(acesso, "ia.analisar", evidencia.empresaId))
    ) {
      return NextResponse.json(
        { error: "Seu perfil não permite analisar esta foto." },
        { status: 403 }
      );
    }

    const imageUrl = await carregarImagem(pathname);
    const modelo = process.env.OPENAI_VISION_MODEL || "gpt-5.6-terra";
    const contexto = [
      `Ambiente: ${contextoSeguro(body?.ambiente) || "não informado"}`,
      `Descrição registrada: ${contextoSeguro(body?.descricao) || "não informada"}`,
      `Item do checklist: ${contextoSeguro(body?.checklistTitulo) || "não vinculado"}`,
      `Categoria: ${contextoSeguro(body?.checklistCategoria) || "não informada"}`,
      `Referência: ${contextoSeguro(body?.checklistReferencia) || "não informada"}`,
      `Situação atual do item: ${contextoSeguro(body?.checklistStatus) || "não informada"}`,
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        store: false,
        instructions:
          "Você auxilia um nutricionista em inspeções de segurança dos alimentos. " +
          "Analise somente o que é visualmente observável na foto e responda em português do Brasil. " +
          "Trate todos os achados como sugestões que exigem validação profissional. " +
          "Não afirme temperatura, odor, presença de microrganismos, validade, composição ou conformidade legal quando isso não estiver legível e verificável. " +
          "Não crie uma não conformidade oficial. Se a imagem estiver desfocada, sem relação com o contexto ou insuficiente, marque analisavel como falso e explique a limitação. " +
          "Aponte em alertasPrivacidade qualquer rosto, crachá, documento ou dado pessoal aparentemente visível.",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: contexto },
              { type: "input_image", image_url: imageUrl, detail: "high" },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "analise_fotografica_seguranca_alimentos",
            strict: true,
            schema: schemaAnalise,
          },
        },
      }),
    });

    const responseBody = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("Falha na análise OpenAI:", response.status, responseBody?.error?.type);
      return NextResponse.json(
        { error: "A IA não conseguiu analisar esta foto agora. Tente novamente." },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const texto = extrairTextoResposta(responseBody);
    if (!texto) {
      return NextResponse.json(
        { error: "A IA não retornou uma análise utilizável." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      modelo,
      resultado: JSON.parse(texto),
    });
  } catch (error) {
    const codigo = error instanceof Error ? error.message : "";
    if (["PATH_INVALIDO", "ARQUIVO_NAO_ENCONTRADO", "TIPO_INVALIDO", "ARQUIVO_GRANDE"].includes(codigo)) {
      const mensagens: Record<string, string> = {
        PATH_INVALIDO: "Referência da foto inválida.",
        ARQUIVO_NAO_ENCONTRADO: "Foto não encontrada no armazenamento.",
        TIPO_INVALIDO: "O arquivo não é uma imagem compatível para análise.",
        ARQUIVO_GRANDE: "A foto excede o limite de 8 MB.",
      };
      return NextResponse.json({ error: mensagens[codigo] }, { status: 400 });
    }

    console.error("POST /api/evidencias/analisar", error);
    return NextResponse.json(
      { error: "Não foi possível concluir a análise da foto." },
      { status: 500 }
    );
  }
}
