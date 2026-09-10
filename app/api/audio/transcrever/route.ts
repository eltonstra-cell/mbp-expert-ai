import { NextResponse } from "next/server";
import { obterAcessoServidor } from "@/lib/serverAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const TIPOS_ACEITOS = new Set([
  "audio/mp4",
  "audio/mpeg",
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/x-m4a",
]);

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
      return NextResponse.json({ error: "O áudio está vazio." }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "O ditado ficou muito longo. Grave um trecho menor e tente novamente." },
        { status: 413 }
      );
    }

    const tipoBase = (audio.type || "").toLowerCase().split(";")[0];
    if (tipoBase && !TIPOS_ACEITOS.has(tipoBase)) {
      return NextResponse.json(
        { error: "Formato de áudio não compatível para transcrição." },
        { status: 400 }
      );
    }

    const modelo = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
    const openAiForm = new FormData();
    openAiForm.append("file", audio, audio.name || "ditado.m4a");
    openAiForm.append("model", modelo);
    openAiForm.append("language", "pt");
    openAiForm.append("response_format", "json");
    openAiForm.append(
      "prompt",
      "Transcreva fielmente em português do Brasil. Preserve termos técnicos de segurança dos alimentos, higiene, checklist, não conformidade e plano de ação."
    );

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openAiForm,
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("Falha na transcrição OpenAI:", response.status, body?.error?.type);
      return NextResponse.json(
        { error: response.status === 429 ? "O serviço de voz está ocupado. Tente novamente em alguns instantes." : "Não foi possível transcrever o áudio agora." },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const texto = typeof body?.text === "string" ? body.text.trim() : "";
    if (!texto) {
      return NextResponse.json(
        { error: "Não foi possível identificar fala nesse áudio." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: texto, model: modelo });
  } catch (error) {
    console.error("POST /api/audio/transcrever", error);
    return NextResponse.json(
      { error: "Não foi possível concluir a transcrição por voz." },
      { status: 500 }
    );
  }
}
