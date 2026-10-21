// Datas do app: SEMPRE no fuso de São Paulo, ao formatar e ao comparar.
// Um instante guardado em UTC (ex.: 2026-10-21T00:26:00Z) é 20/10 às 21:26 em São Paulo; cortar o texto ISO (slice(0, 10)) trazia o dia errado.
// Texto só de data (AAAA-MM-DD: validade, prazo, data de serviço) não é instante e nunca passa por conversão de fuso.

export const FUSO_DO_APP = "America/Sao_Paulo";

const SO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Texto AAAA-MM-DD (sem hora): é uma data de calendário, não um instante. */
export function ehSoData(texto: string | undefined | null): texto is string {
  return typeof texto === "string" && SO_DATA.test(texto);
}

type Entrada = string | number | Date | undefined | null;

function comoData(entrada: Entrada): Date | null {
  if (entrada === undefined || entrada === null || entrada === "") return null;
  const data = entrada instanceof Date ? entrada : new Date(entrada);
  return Number.isNaN(data.getTime()) ? null : data;
}

function partes(data: Date): { ano: string; mes: string; dia: string; hora: string; minuto: string } {
  const formato = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_DO_APP, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const mapa: Record<string, string> = {};
  for (const parte of formato.formatToParts(data)) mapa[parte.type] = parte.value;
  return { ano: mapa.year, mes: mapa.month, dia: mapa.day, hora: mapa.hour === "24" ? "00" : mapa.hour, minuto: mapa.minute };
}

/** AAAA-MM-DD do dia em São Paulo. Texto só de data volta como está; instante é convertido. */
export function dataISOLocal(entrada: Entrada): string {
  if (ehSoData(entrada as string)) return entrada as string;
  const data = comoData(entrada);
  if (!data) return "";
  const p = partes(data);
  return `${p.ano}-${p.mes}-${p.dia}`;
}

/** Hoje (AAAA-MM-DD) em São Paulo. */
export function hojeLocalISO(agora: Date = new Date()): string {
  return dataISOLocal(agora);
}

/** "20/10/2026". Vazio quando não há data. */
export function formatarData(entrada: Entrada): string {
  const iso = dataISOLocal(entrada);
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** "20/10". */
export function formatarDataCurta(entrada: Entrada): string {
  return formatarData(entrada).slice(0, 5);
}

/** "21:26" em São Paulo (só para instantes; texto só de data não tem hora). */
export function formatarHora(entrada: Entrada): string {
  if (ehSoData(entrada as string)) return "";
  const data = comoData(entrada);
  if (!data) return "";
  const p = partes(data);
  return `${p.hora}:${p.minuto}`;
}

/** "20/10/2026 21:26". */
export function formatarDataHora(entrada: Entrada): string {
  const data = formatarData(entrada);
  const hora = formatarHora(entrada);
  return hora ? `${data} ${hora}` : data;
}

/** "20/10 · 21:26". */
export function formatarDataCurtaHora(entrada: Entrada): string {
  const data = formatarDataCurta(entrada);
  const hora = formatarHora(entrada);
  return hora ? `${data} · ${hora}` : data;
}

const DIA_MS = 24 * 60 * 60 * 1000;

function diaEmMs(iso: string): number {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return Date.UTC(ano, (mes || 1) - 1, dia || 1);
}

/** Dias de calendário de `de` até `ate` (cada um em São Paulo); negativo quando `ate` é antes. */
export function diasEntreDatas(de: Entrada, ate: Entrada): number {
  const a = dataISOLocal(de);
  const b = dataISOLocal(ate);
  if (!a || !b) return 0;
  return Math.round((diaEmMs(b) - diaEmMs(a)) / DIA_MS);
}

/** Valor de <input type="datetime-local"> ("2026-10-20T21:26") para o instante ISO, lido como horário de São Paulo. */
export function localParaISO(valor: string): string {
  const base = Date.parse(`${valor}${valor.length === 16 ? ":00" : ""}Z`);
  if (Number.isNaN(base)) return "";
  // Descobre o deslocamento de São Paulo naquele momento (hoje é -03:00; o cálculo continua certo se mudar).
  let instante = base + 3 * 60 * 60 * 1000;
  for (let i = 0; i < 2; i += 1) {
    const p = partes(new Date(instante));
    const lido = Date.UTC(Number(p.ano), Number(p.mes) - 1, Number(p.dia), Number(p.hora), Number(p.minuto));
    instante += base - lido;
  }
  return new Date(instante).toISOString();
}

/** Instante ISO para o valor de <input type="datetime-local"> no horário de São Paulo. */
export function isoParaLocal(entrada: Entrada): string {
  const data = comoData(entrada);
  if (!data) return "";
  const p = partes(data);
  return `${p.ano}-${p.mes}-${p.dia}T${p.hora}:${p.minuto}`;
}

/** Valor de datetime-local de agora, em São Paulo. */
export function agoraParaCampoLocal(agora: Date = new Date()): string {
  return isoParaLocal(agora);
}

/** Soma dias a uma data AAAA-MM-DD. */
export function somarDias(iso: string, dias: number): string {
  return new Date(diaEmMs(iso) + dias * DIA_MS).toISOString().slice(0, 10);
}
