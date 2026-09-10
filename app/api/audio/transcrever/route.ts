import { NextResponse } from "next/server";
import { obterAcessoServidor } from "@/lib/serverAccess";

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
  modelo: string
): Promise<{ ok: true; text: string } | { ok: false; status: number; tipo?: string }> {
  const openAiForm = new FormData();
  openAiForm.append("file", audio, audio.name || "ditado.m4a");
  openAiForm.append("model", modelo);
  openAiForm.append("language", "pt");
  openAiForm.append("response_format", "json");
  openAiForm.append(
    "prompt",
    "Transcreva fielmente em português do Brasil. Preserve termos técnicos de segurança dos alimentos, higiene, checklist, não conformidade, POP e plano de ação."
  );

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
  if (!text) return { ok: false, status: 422 };
  return { ok: true, text };
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
    if (acesso.aplicado && !acesso.autorizado) {
      return NextResponse.json(
        { error: "Sua sessão não permite usar a transcrição por voz." },
        { status: 403 }
      );
    }

    const form = await request.formData();
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

    const modeloPrincipal = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
    const principal = await transcreverComModelo(apiKey, audio, modeloPrincipal);
    if (principal.ok) {
      return NextResponse.json({ text: principal.text, model: modeloPrincipal });
    }

    if (principal.status === 429) {
      return NextResponse.json(
        { error: "O serviço de voz está ocupado. Tente novamente em alguns instantes." },
        { status: 429 }
      );
    }

    // Fallback para compatibilidade com formatos enviados por alguns iPhones/PWAs.
    if (modeloPrincipal !== "whisper-1") {
      const fallback = await transcreverComModelo(apiKey, audio, "whisper-1");
      if (fallback.ok) {
        return NextResponse.json({ text: fallback.text, model: "whisper-1" });
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
