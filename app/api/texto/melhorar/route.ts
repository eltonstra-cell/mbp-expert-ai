import { NextResponse } from "next/server";
import { obterAcessoServidor } from "@/lib/serverAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extrairTextoResposta(body: any): string {
  if (typeof body?.output_text === "string") return body.output_text.trim();
  for (const item of Array.isArray(body?.output) ? body.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "output_text" && typeof content?.text === "string") {
        return content.text.trim();
      }
    }
  }
  return "";
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "A melhoria de texto por IA ainda não foi configurada no servidor." },
      { status: 503 }
    );
  }

  try {
    const acesso = await obterAcessoServidor();
    if (acesso.aplicado && !acesso.autorizado) {
      return NextResponse.json(
        { error: "Sua sessão não permite usar a melhoria de texto com IA." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const texto = typeof body?.texto === "string" ? body.texto.trim().slice(0, 6000) : "";
    const contexto = typeof body?.contexto === "string" ? body.contexto.trim().slice(0, 1000) : "";

    if (!texto) {
      return NextResponse.json({ error: "Texto não informado." }, { status: 400 });
    }

    // Reaproveita a mesma configuração de IA já usada pelo módulo de fotos.
    const modelo =
      process.env.OPENAI_TEXT_MODEL ||
      process.env.OPENAI_VISION_MODEL ||
      "gpt-5.6-terra";

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
          "Você revisa textos de inspeções de Boas Práticas e segurança dos alimentos. " +
          "Melhore somente a redação fornecida pelo usuário. Preserve integralmente os fatos, o sentido e o grau de certeza. " +
          "Não invente problemas, causas, medidas, normas, temperaturas, prazos ou conclusões que não estejam no texto. " +
          "Use português do Brasil, linguagem profissional, clara, técnica e objetiva, sem ficar excessivamente formal. " +
          "Corrija gramática, pontuação e repetições. Prefira frases curtas. " +
          "Retorne apenas a versão revisada, sem introdução, aspas, explicações ou comentários.",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `${contexto ? `Contexto do campo: ${contexto}\n\n` : ""}Texto para revisar:\n${texto}`,
              },
            ],
          },
        ],
      }),
    });

    const responseBody = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("Falha ao melhorar texto com IA:", response.status, responseBody?.error?.type);
      return NextResponse.json(
        {
          error:
            response.status === 429
              ? "A IA está ocupada. Tente novamente em alguns instantes."
              : "Não foi possível melhorar o texto agora.",
        },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const melhorado = extrairTextoResposta(responseBody);
    if (!melhorado) {
      return NextResponse.json(
        { error: "A IA não retornou uma versão revisada do texto." },
        { status: 502 }
      );
    }

    return NextResponse.json({ text: melhorado, model: modelo });
  } catch (error) {
    console.error("POST /api/texto/melhorar", error);
    return NextResponse.json(
      { error: "Não foi possível concluir a melhoria do texto." },
      { status: 500 }
    );
  }
}
