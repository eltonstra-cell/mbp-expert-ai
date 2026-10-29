import { NextResponse } from "next/server";
import { autorizaAcaoServidor, obterAcessoServidor } from "@/lib/serverAccess";
import { corpoExcedeLimite } from "@/lib/requestLimits";
import { decidirTranscricaoDeAudio } from "@/lib/privacidadeEmpresa";
import { INSTRUCAO_DE_TRANSCRICAO, MENSAGEM_SEM_FALA, avaliarTranscricao } from "@/lib/transcricao";
import { empresasDoUsuarioParaVocabulario, ehEcoDoPromptDaBusca, montarPromptDaBusca } from "@/lib/vocabularioDeVoz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const TIPOS_ACEITOS = new Set([
  "audio/mp4",
  "audio/m4a",
  "audio/mpeg",
  "audio/mp3",
  "audio/mpga",
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/x-m4a",
  "video/mp4",
]);

async function transcreverComModelo(
  apiKey: string,
  audio: File,
  modelo: string,
  duracaoSeg?: number,
  /** Contexto da transcrição (parâmetro "prompt"). Na busca por voz leva termos do app e nomes das empresas da pessoa. */
  prompt: string = INSTRUCAO_DE_TRANSCRICAO,
  contextoDaBusca = false
): Promise<{ ok: true; text: string } | { ok: false; status: number; tipo?: string; semFala?: boolean }> {
  const openAiForm = new FormData();
  openAiForm.append("file", audio, audio.name || "ditado.m4a");
  openAiForm.append("model", modelo);
  openAiForm.append("language", "pt");
  openAiForm.append("response_format", "json");
  openAiForm.append("prompt", prompt);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: openAiForm,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Falha na transcrição OpenAI:", modelo, response.status, body?.error?.type, body?.error?.message);
    return { ok: false, status: response.status, tipo: body?.error?.type };
  }

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  // Áudio sem fala faz o serviço devolver a própria instrução: isso nunca pode virar texto do usuário.
  const avaliacao = avaliarTranscricao(text, duracaoSeg);
  if (!avaliacao.ok || (contextoDaBusca && ehEcoDoPromptDaBusca(text, prompt))) return { ok: false, status: 422, semFala: true };
  return { ok: true, text: avaliacao.texto };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "A transcrição por voz ainda não foi configurada no servidor." },
      { status: 503 }
    );
  }

  try {
    const acesso = await obterAcessoServidor();
    if (!autorizaAcaoServidor(acesso, "ia.analisar")) {
      return NextResponse.json(
        { error: "Seu perfil não permite usar a transcrição por voz." },
        { status: 403 }
      );
    }

    if (corpoExcedeLimite(request.headers.get("content-length"), MAX_AUDIO_BYTES + 1024 * 1024)) {
      return NextResponse.json(
        { error: "O ditado ficou muito longo. Grave um trecho menor e tente novamente." },
        { status: 413 }
      );
    }

    const form = await request.formData();

    // Áudio de evidência: além da permissão de IA, a empresa precisa ter a IA liberada E o consentimento específico de áudio.
    // Sem o estado para conferir, nega. Nada disso é decidido pelo navegador.
    if (form.get("contexto") === "evidencia") {
      const empresaIdInformada = form.get("empresaId");
      const empresaId = typeof empresaIdInformada === "string" ? empresaIdInformada : "";
      if (!acesso.data || !autorizaAcaoServidor(acesso, "ia.analisar", empresaId)) {
        return NextResponse.json({ error: "Seu perfil não permite transcrever o áudio desta empresa." }, { status: 403 });
      }
      const decisao = decidirTranscricaoDeAudio(acesso.data, empresaId);
      if (!decisao.ok) {
        return NextResponse.json({ error: decisao.motivo, codigo: decisao.codigo }, { status: 403 });
      }
    }
    const audio = form.get("audio");
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Áudio não informado." }, { status: 400 });
    }

    if (!audio.size) {
      return NextResponse.json(
        { error: "O áudio chegou vazio. Fale por pelo menos 1 segundo e toque novamente em Parar." },
        { status: 400 }
      );
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "O ditado ficou muito longo. Grave um trecho menor e tente novamente." },
        { status: 413 }
      );
    }

    const tipoBase = (audio.type || "").toLowerCase().split(";")[0];
    if (tipoBase && !TIPOS_ACEITOS.has(tipoBase)) {
      console.warn("Tipo de áudio não listado, tentando transcrever mesmo assim:", tipoBase);
    }

    const duracaoInformada = Number(form.get("duracao"));
    const duracaoSeg = Number.isFinite(duracaoInformada) && duracaoInformada > 0 ? duracaoInformada : undefined;

    // Busca por voz: o contexto leva os termos do app e os NOMES das empresas que a pessoa acessa (no máximo 20), calculados aqui no servidor
    // pelo perfil dela, nunca vindos do navegador. Ditado de correções não recebe contexto de empresa. Sem controle de acesso ativo, só os termos do app.
    const contextoDaBusca = form.get("contexto") === "busca";
    const promptDaBusca = contextoDaBusca
      ? montarPromptDaBusca(acesso.aplicado && acesso.autorizado ? empresasDoUsuarioParaVocabulario(acesso.data.empresas, acesso.usuario) : [])
      : INSTRUCAO_DE_TRANSCRICAO;

    const modeloPrincipal = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
    const principal = await transcreverComModelo(apiKey, audio, modeloPrincipal, duracaoSeg, promptDaBusca, contextoDaBusca);
    if (principal.ok) {
      return NextResponse.json({ text: principal.text, model: modeloPrincipal });
    }

    if (!principal.ok && principal.semFala) {
      return NextResponse.json({ error: MENSAGEM_SEM_FALA, semFala: true }, { status: 422 });
    }

    if (principal.status === 429) {
      return NextResponse.json(
        { error: "O serviço de voz está ocupado. Tente novamente em alguns instantes." },
        { status: 429 }
      );
    }

    // Fallback para compatibilidade com formatos enviados por alguns iPhones/PWAs.
    if (modeloPrincipal !== "whisper-1") {
      const fallback = await transcreverComModelo(apiKey, audio, "whisper-1", duracaoSeg, promptDaBusca, contextoDaBusca);
      if (fallback.ok) {
        return NextResponse.json({ text: fallback.text, model: "whisper-1" });
      }
      if (fallback.semFala) {
        return NextResponse.json({ error: MENSAGEM_SEM_FALA, semFala: true }, { status: 422 });
      }
    }

    return NextResponse.json(
      { error: "O áudio foi gravado, mas não consegui transformá-lo em texto. Tente falar por 2 a 5 segundos e toque em Parar." },
      { status: 502 }
    );
  } catch (error) {
    console.error("POST /api/audio/transcrever", error);
    return NextResponse.json(
      { error: "Não foi possível concluir a transcrição por voz." },
      { status: 500 }
    );
  }
}
