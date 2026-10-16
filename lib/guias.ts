// Guias em PDF: só nomes desta lista fixa são servidos, e cada um exige a tela liberada.
import { podeVerTela, type TelaKey } from "./screenAccess.ts";
import type { PerfilUsuario } from "../types/index.ts";

export const GUIAS: Record<string, { arquivo: string; tela: TelaKey }> = {
  "guia-rapido": { arquivo: "guia-rapido-mbp-expert-ai.pdf", tela: "guiaRapido" },
  "manual-completo": { arquivo: "manual-completo-mbp-expert-ai.pdf", tela: "manualCompleto" },
};

export type ResultadoGuia = { status: "ok"; arquivo: string } | { status: "nao-encontrado" } | { status: "negado" };

/** `usuario` = null quando o acesso não é aplicado (desenvolvimento local): nesse caso libera. */
export function autorizarGuia(
  nome: string,
  usuario: { perfil: PerfilUsuario; telas?: Parameters<typeof podeVerTela>[0]["telas"] } | null | "nao-aplicado"
): ResultadoGuia {
  if (!Object.prototype.hasOwnProperty.call(GUIAS, nome)) return { status: "nao-encontrado" };
  const guia = GUIAS[nome];
  if (usuario === "nao-aplicado") return { status: "ok", arquivo: guia.arquivo };
  if (!usuario || !podeVerTela(usuario, guia.tela)) return { status: "negado" };
  return { status: "ok", arquivo: guia.arquivo };
}
