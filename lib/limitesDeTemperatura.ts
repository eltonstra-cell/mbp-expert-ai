// Limites de temperatura que classificam a medição como Conforme / Não conforme.
// Os valores vêm do TEXTO OFICIAL da Portaria SES/RS nº 799/2023 (PDF do estado, lido em 23/10/2026), com o item de cada um.
// O texto da RDC ANVISA nº 216/2004 não pôde ser baixado nesta data; por isso nenhum limite foi atribuído a ela (a Portaria é complementar à RDC).
// Sem limite para o tipo de equipamento, NADA é classificado: o campo avisa e o RT decide.

export type OperadorDoLimite = "<=" | ">=" | ">";

export type LimiteDeTemperatura = {
  id: string;
  rotulo: string;
  operador: OperadorDoLimite;
  /** Em °C. */
  valor: number;
  norma: string;
  /** Item da norma que traz o valor. */
  itens: string;
  link: string;
  /** Data (AAAA-MM-DD) em que o texto foi conferido na fonte oficial. */
  conferidoEm: string;
};

const NORMA = "Portaria SES/RS nº 799/2023";
const LINK = "https://estado.rs.gov.br/upload/arquivos/portaria-ses-799-2023.pdf";
const CONFERIDO_EM = "2026-10-23";

export const LIMITES_DE_TEMPERATURA: LimiteDeTemperatura[] = [
  { id: "refrigerado", rotulo: "Refrigerado", operador: "<=", valor: 5, norma: NORMA, itens: "10.09, 10.8, 11.2 b, 12.2 a", link: LINK, conferidoEm: CONFERIDO_EM },
  { id: "congelado", rotulo: "Congelado", operador: "<=", valor: -18, norma: NORMA, itens: "10.10, 11.2 c", link: LINK, conferidoEm: CONFERIDO_EM },
  { id: "quente", rotulo: "Mantido a quente", operador: ">=", valor: 60, norma: NORMA, itens: "10.7 (superior a 60 °C), 11.2 a, 12.2 b", link: LINK, conferidoEm: CONFERIDO_EM },
  { id: "tratamento-termico", rotulo: "Tratamento térmico (todas as partes)", operador: ">=", valor: 70, norma: NORMA, itens: "10.3", link: LINK, conferidoEm: CONFERIDO_EM },
  { id: "reaquecimento", rotulo: "Reaquecimento (todas as partes)", operador: ">=", valor: 75, norma: NORMA, itens: "10.5", link: LINK, conferidoEm: CONFERIDO_EM },
  { id: "fritura", rotulo: "Óleo de fritura", operador: "<=", valor: 180, norma: NORMA, itens: "10.6", link: LINK, conferidoEm: CONFERIDO_EM },
];

export function limiteDoTipo(id: string | null | undefined): LimiteDeTemperatura | undefined {
  return LIMITES_DE_TEMPERATURA.find((limite) => limite.id === id);
}

/** "7", "7,5", "7 °C", "-18" -> número; vazio ou texto sem número -> null. */
export function lerTemperatura(texto: string): number | null {
  const limpo = texto.replace(",", ".").replace(/[°º]?\s*c\b/i, "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(limpo)) return null;
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : null;
}

export type ResultadoDaTemperatura = "Conforme" | "Não Conforme";

export function classificarTemperatura(valor: number | null, limite: LimiteDeTemperatura | undefined): ResultadoDaTemperatura | null {
  if (valor === null || !limite) return null;
  const ok = limite.operador === "<=" ? valor <= limite.valor : limite.operador === ">=" ? valor >= limite.valor : valor > limite.valor;
  return ok ? "Conforme" : "Não Conforme";
}

export function textoDoLimite(limite: LimiteDeTemperatura): string {
  const sinal = limite.operador === "<=" ? "até" : limite.operador === ">=" ? "no mínimo" : "acima de";
  return `${sinal} ${String(limite.valor).replace(".", ",")} °C`;
}

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");

/** Tipo de limite para um equipamento ou critério, pelo nome. Desconhecido -> undefined (o campo avisa; nada é classificado). */
export function limiteSugerido(nomes: string[]): LimiteDeTemperatura | undefined {
  for (const nome of nomes) {
    const t = semAcento(nome);
    if (/freezer|congelad|congelador|ultracongel/.test(t)) return limiteDoTipo("congelado");
    if (/fritadeira|fritura|oleo/.test(t)) return limiteDoTipo("fritura");
    if (/estufa|banho.?maria|balcao termico|chafing|pass.?through quente|mantido a quente|alimentos quentes/.test(t)) return limiteDoTipo("quente");
    if (/camara fria|camara frigorifica|geladeira|refrigerador|balcao refrigerado|refrigerad|resfriad/.test(t)) return limiteDoTipo("refrigerado");
  }
  return undefined;
}
