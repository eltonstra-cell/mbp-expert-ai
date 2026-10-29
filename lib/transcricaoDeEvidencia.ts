// Transcrição do áudio de uma evidência: só roda quando o usuário toca em "Transcrever".
// O servidor confere a IA liberada e o consentimento de áudio da empresa; o áudio não é guardado pela rota.
export async function transcreverAudioDeEvidencia(arquivo: File, empresaId: string, duracaoSeg?: number): Promise<string> {
  const form = new FormData();
  form.append("audio", arquivo, arquivo.name || "evidencia.m4a");
  form.append("contexto", "evidencia");
  form.append("empresaId", empresaId);
  if (duracaoSeg && duracaoSeg > 0) form.append("duracao", String(duracaoSeg));
  const resposta = await fetch("/api/audio/transcrever", { method: "POST", credentials: "same-origin", body: form });
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new Error(corpo?.error || "Não foi possível transcrever o áudio.");
  const texto = typeof corpo?.text === "string" ? corpo.text.trim() : "";
  if (!texto) throw new Error("Não consegui identificar fala neste áudio.");
  return texto;
}
