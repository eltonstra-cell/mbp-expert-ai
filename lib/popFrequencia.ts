// Frequência do POP em campo estruturado (rodada 12e; semestral e anual na 13): diária, semanal, mensal, semestral, anual ou outra (texto).
// POP antigo só tem o texto em `conteudo.frequencia`: lê-se dele SEM regravar nada. Só vira "diária/semanal/mensal" quando o texto é
// reconhecido por inteiro; qualquer outro texto (quinzenal, trimestral, "a cada turno"...) fica como "outra" com o texto original.
import type { ConteudoPop, FrequenciaDoPop, TipoDeFrequencia } from "../types/index.ts";

export const OPCOES_DE_FREQUENCIA: { tipo: TipoDeFrequencia; rotulo: string }[] = [
  { tipo: "diaria", rotulo: "Diária" },
  { tipo: "semanal", rotulo: "Semanal" },
  { tipo: "mensal", rotulo: "Mensal" },
  { tipo: "semestral", rotulo: "Semestral" },
  { tipo: "anual", rotulo: "Anual" },
  { tipo: "outra", rotulo: "Outra" },
];

const DIAS_DO_TIPO: Record<Exclude<TipoDeFrequencia, "outra">, number> = { diaria: 1, semanal: 7, mensal: 30, semestral: 182, anual: 365 };

const sem = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[.;,]+$/g, "")
    .trim();

/** Reconhece só o que é inequívoco: o texto inteiro é uma destas palavras. */
export function tipoReconhecidoNoTexto(texto: string | undefined): Exclude<TipoDeFrequencia, "outra"> | null {
  const t = sem(texto || "");
  if (["diaria", "diario", "todo dia", "todos os dias", "cada dia"].includes(t)) return "diaria";
  if (["semanal", "toda semana", "todas as semanas", "uma vez por semana"].includes(t)) return "semanal";
  if (["mensal", "todo mes", "todos os meses", "uma vez por mes"].includes(t)) return "mensal";
  if (["semestral", "a cada seis meses", "a cada 6 meses"].includes(t)) return "semestral";
  if (["anual", "todo ano", "todos os anos", "uma vez por ano"].includes(t)) return "anual";
  return null;
}

/** A frequência do POP: a estruturada, se existe; senão a lida do texto antigo; vazio = ainda não definida (null). */
export function frequenciaDoPop(conteudo: Pick<ConteudoPop, "frequencia" | "frequenciaEstruturada"> | undefined): FrequenciaDoPop | null {
  const estruturada = conteudo?.frequenciaEstruturada;
  if (estruturada) {
    if (estruturada.tipo === "outra") return (estruturada.texto || "").trim() ? { tipo: "outra", texto: estruturada.texto!.trim() } : null;
    return { tipo: estruturada.tipo };
  }
  const texto = (conteudo?.frequencia || "").trim();
  if (!texto) return null;
  const tipo = tipoReconhecidoNoTexto(texto);
  return tipo ? { tipo } : { tipo: "outra", texto };
}

/** O texto que os documentos e a folha mostram (o campo antigo `frequencia` continua sendo a fonte do que se imprime). */
export function textoDaFrequencia(frequencia: FrequenciaDoPop | null): string {
  if (!frequencia) return "";
  if (frequencia.tipo === "outra") return (frequencia.texto || "").trim();
  return OPCOES_DE_FREQUENCIA.find((opcao) => opcao.tipo === frequencia.tipo)!.rotulo;
}

/** Os dois campos juntos, para gravar: o estruturado e o texto legível (POP e regras antigas seguem lendo o texto). */
export function conteudoComFrequencia<T extends Pick<ConteudoPop, "frequencia" | "frequenciaEstruturada">>(conteudo: T, frequencia: FrequenciaDoPop | null): T {
  if (!frequencia) {
    const { frequenciaEstruturada: _tirada, ...resto } = conteudo;
    return { ...resto, frequencia: "" } as T;
  }
  // O texto de "outra" fica como foi digitado (espaços no fim valem enquanto se digita); só o campo legível `frequencia` sai aparado.
  const normalizada: FrequenciaDoPop = frequencia.tipo === "outra" ? { tipo: "outra", texto: frequencia.texto || "" } : { tipo: frequencia.tipo };
  return { ...conteudo, frequenciaEstruturada: normalizada, frequencia: textoDaFrequencia(normalizada) };
}

/**
 * A frequência em dias, para o atraso de registro. Estruturada: diária 1, semanal 7, mensal 30. "Outra": só se o texto for uma
 * periodicidade que o app entende (quinzenal, trimestral...); senão null e nenhum registro é cobrado como atrasado.
 */
export function diasDaFrequenciaDoPop(conteudo: Pick<ConteudoPop, "frequencia" | "frequenciaEstruturada"> | undefined, diasDoTexto: (texto: string) => number | null): number | null {
  const frequencia = frequenciaDoPop(conteudo);
  if (!frequencia) return null;
  if (frequencia.tipo !== "outra") return DIAS_DO_TIPO[frequencia.tipo];
  return diasDoTexto(frequencia.texto || "");
}
