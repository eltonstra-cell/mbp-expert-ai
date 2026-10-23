// Voz por ambiente: "câmara fria, sete graus, piso com sujidade" vira itens PROPOSTOS do checklist do ambiente.
// Interpretador LOCAL: nenhuma IA externa interpreta a frase e nenhum nome de pessoa precisa ser dito (só o texto técnico da frase passa pela
// transcrição, que já existe). Nada é gravado aqui: o resultado vai para uma tela de conferência (editar/remover) e só então vira resposta.
import type { ChecklistItem, ChecklistStatus } from "../types/index.ts";
import { classificarTemperatura, limiteDoTipo, limiteSugerido } from "./limitesDeTemperatura.ts";

export type PropostaDeVoz = {
  id: string;
  /** O trecho falado de onde veio a proposta. */
  falado: string;
  itemId: string | null;
  status: ChecklistStatus | null;
  observacao: string;
  temperatura?: { valor: number; limiteId: string };
};

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");

const NUMEROS: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
  quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
  setenta: 70, oitenta: 80, noventa: 90, cem: 100,
};

const NEGATIVAS = /\b(sujo|suja|sujeira|sujidade|vencid|ausen|falta|faltando|quebrad|danificad|inadequad|aberto|aberta|vazando|vazamento|mofo|ferrugem|enferrujad|praga|barata|rato|inseto|mosca|gordura|acumulo|acumulad|rachad|solto|solta|sem protecao|nao tem|nao possui|nao ha|irregular|errad|pegajos|mal conservad|nao conforme|nao esta)\b/;
const POSITIVAS = /\b(ok|conforme|limpo|limpa|adequad|em ordem|bom estado|certo|correto|tudo certo|sem problema|organizad)\b/;
const TEMPERATURA = /(menos\s+|-\s*)?(\d+(?:[.,]\d+)?|[a-z]+)\s*(?:graus?|°\s*c?|º\s*c?)\b/;
const FRACAS = new Set(["de", "da", "do", "das", "dos", "com", "sem", "na", "no", "nas", "nos", "em", "e", "o", "a", "os", "as", "um", "uma", "para", "por", "que", "esta", "estao", "tem", "ha"]);

function numeroDito(token: string): number | null {
  if (/^\d+(?:[.,]\d+)?$/.test(token)) return Number(token.replace(",", "."));
  return token in NUMEROS ? NUMEROS[token] : null;
}

/** "sete graus", "menos dezoito graus", "4,5 °C", "-18 graus" -> número; sem temperatura no trecho -> null. */
export function temperaturaFalada(trecho: string): number | null {
  const composto = /\b(vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)\s+e\s+(um|dois|tres|quatro|cinco|seis|sete|oito|nove)\b/g;
  // "vinte e cinco" vira 25 antes de procurar o número.
  const t = semAcento(trecho)
    .replace(/(\d)\s*,\s*(\d)/g, "$1,$2")
    .replace(composto, (_todo, dezena: string, unidade: string) => String(NUMEROS[dezena] + NUMEROS[unidade]));
  const m = t.match(TEMPERATURA);
  if (!m) return null;
  const negativo = Boolean(m[1]);
  const valor = numeroDito(m[2]);
  if (valor === null) return null;
  return negativo ? -valor : valor;
}

const tokens = (texto: string) => semAcento(texto).replace(/[^a-z0-9\s]/g, " ").split(" ").filter((p) => p.length >= 4 && !FRACAS.has(p));
const prefixo = (palavra: string) => palavra.slice(0, 5);

function melhorItem(trecho: string, itens: ChecklistItem[]): ChecklistItem | null {
  const chaves = new Set(tokens(trecho).map(prefixo));
  if (chaves.size === 0) return null;
  let melhor: { item: ChecklistItem; pontos: number } | null = null;
  for (const item of itens) {
    const alvo = new Set(tokens(`${item.titulo} ${item.categoria}`).map(prefixo));
    let pontos = 0;
    chaves.forEach((c) => {
      if (alvo.has(c)) pontos += 1;
    });
    if (pontos > 0 && (!melhor || pontos > melhor.pontos)) melhor = { item, pontos };
  }
  return melhor ? melhor.item : null;
}

const ehItemDeTemperatura = (item: ChecklistItem) => /temperatura|refriger|congel|resfri|fritur|reaquec/i.test(item.titulo);

const maiuscula = (texto: string) => (texto ? texto.charAt(0).toLocaleUpperCase("pt-BR") + texto.slice(1) : texto);

/**
 * `itens`: os itens do ambiente onde o RT está. `equipamentos`: nomes dos equipamentos do ambiente (ajudam a escolher o limite de temperatura).
 * Trechos curtos que só nomeiam o lugar ou o equipamento ("câmara fria") viram contexto e não geram proposta.
 */
export function interpretarDitadoDoAmbiente(texto: string, itens: ChecklistItem[], equipamentos: string[] = []): PropostaDeVoz[] {
  const trechos = texto
    .split(/[,.;\n]+|\s+e\s+(?=\S+\s+\S+)/i)
    .map((t) => t.trim())
    .filter(Boolean);
  const propostas: PropostaDeVoz[] = [];
  let contexto: string[] = [];
  const itensDeTemperatura = itens.filter(ehItemDeTemperatura);

  trechos.forEach((trecho, indice) => {
    const id = `voz-${indice}`;
    const graus = temperaturaFalada(trecho);
    if (graus !== null) {
      const alvo = itensDeTemperatura.find((i) => i.status === "Pendente") || itensDeTemperatura[0] || null;
      const limite = limiteSugerido([...contexto, ...(alvo ? [alvo.titulo] : []), ...equipamentos]);
      const resultado = classificarTemperatura(graus, limite);
      propostas.push({ id, falado: trecho, itemId: alvo ? alvo.id : null, status: resultado, observacao: "", ...(limite ? { temperatura: { valor: graus, limiteId: limite.id } } : {}) });
      return;
    }
    const item = melhorItem(trecho, itens);
    const t = semAcento(trecho);
    const status: ChecklistStatus | null = NEGATIVAS.test(t) ? "Não Conforme" : POSITIVAS.test(t) ? "Conforme" : null;
    if (!status && trecho.split(/\s+/).length <= 3 && (!item || ehItemDeTemperatura(item))) {
      contexto = [...contexto, trecho];
      return;
    }
    propostas.push({ id, falado: trecho, itemId: item ? item.id : null, status, observacao: status === "Não Conforme" ? maiuscula(trecho) : "" });
  });
  return propostas;
}

/** Proposta pronta para gravar: precisa de item e de resposta definidos. */
export const propostaCompleta = (p: PropostaDeVoz): boolean => Boolean(p.itemId && p.status);

// Mantém limiteDoTipo exportado para a tela de conferência mostrar o limite usado.
export { limiteDoTipo };
