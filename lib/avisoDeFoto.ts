// "Antes de fotografar": a escolha de não mostrar de novo vale só para a visita aberta.
export const PREFIXO_AVISO_FOTO = "mbp-expert-ai:aviso-foto:v1:";

export function chaveDoAvisoDeFoto(visitaId: string): string {
  return `${PREFIXO_AVISO_FOTO}${visitaId}`;
}

export const TEXTOS_DO_AVISO_DE_FOTO = {
  titulo: "Antes de fotografar",
  sim: "Mostre o ambiente, o equipamento ou o produto.",
  nao: "Evite rostos, crachás e documentos pessoais.",
  naoMostrar: "Não mostrar de novo nesta visita",
  botao: "Entendi, abrir câmera",
} as const;
