import { palavra as pal, quantidade as qtd } from "./plural.ts";

/** Números que alimentam as ressalvas de "Finalizar": os mesmos que o PC e o Campo já usam. */
export type EntradaRessalvas = {
  ncsSomenteAbertas: number;
  ncsSemAcao: number;
  analisesIAPendentes: number;
  /** Parecer do RT (campo `conclusao` da visita). */
  conclusao?: string | null;
};

/** Ressalvas que NÃO impedem finalizar (textos únicos: a janela do Campo e a confirmação do PC usam esta lista). */
export function ressalvasDeFinalizar(e: EntradaRessalvas): string[] {
  const alertas: string[] = [];
  if (e.ncsSomenteAbertas > 0) alertas.push(`${qtd(e.ncsSomenteAbertas, "não conformidade", "não conformidades")} ${pal(e.ncsSomenteAbertas, "seguirá", "seguirão")} ${pal(e.ncsSomenteAbertas, "aberta", "abertas")} para acompanhamento`);
  if (e.ncsSemAcao > 0) alertas.push(`${qtd(e.ncsSemAcao, "não conformidade", "não conformidades")} ainda ${pal(e.ncsSemAcao, "está", "estão")} sem ação corretiva definida`);
  if (e.analisesIAPendentes > 0) alertas.push(`${qtd(e.analisesIAPendentes, "sugestão", "sugestões")} de análise fotográfica por IA ainda ${pal(e.analisesIAPendentes, "aguarda", "aguardam")} confirmação ou descarte`);
  if (!(e.conclusao || "").trim()) alertas.push("o parecer do RT ainda está em branco (o app não escreve parecer)");
  return alertas;
}

/** Título da janela do Campo quando faltam itens: "Falta 1 item" / "Faltam 3 itens". */
export function tituloFaltam(faltam: number): string {
  return `${pal(faltam, "Falta", "Faltam")} ${qtd(faltam, "item", "itens")}`;
}
