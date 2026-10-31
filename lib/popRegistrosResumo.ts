// Resumo dos registros de um POP vigente (Resumo etapa 5 e aba Registros): próximo registro, último e os últimos 30 dias.
// Tudo é calculado na hora a partir dos registros que já existem; nada é gravado. "Feitos" nos últimos 30 dias conta no máximo
// o esperado pela frequência (convenção do app: 30 dividido pelos dias da frequência, no mínimo 1).
import type { ConteudoPop, RegistroPop } from "../types/index.ts";
import { dataISOLocal, diasEntreDatas, formatarDataCurta, somarDias } from "./dataLocal.ts";
import { diasDaFrequencia } from "./popGestao.ts";
import { diasDaFrequenciaDoPop, frequenciaDoPop, textoDaFrequencia } from "./popFrequencia.ts";

export type ResumoDeRegistros = {
  /** "Diária", "Semanal"… ou vazio quando não há frequência definida. */
  frequencia: string;
  /** "Hoje", "Atrasado há N dias" ou a data; nulo sem frequência legível. */
  proximo: { texto: string; urgente: boolean } | null;
  ultimo: { dataHora: string; quem: string; comDesvio: boolean } | null;
  feitos30: number;
  esperados30: number | null;
};

export function resumoDosRegistros(
  popId: string,
  conteudo: ConteudoPop | undefined,
  registros: RegistroPop[] | undefined,
  hoje: string,
  aprovadoEm?: string,
  /** Só POP aprovado (ativado) tem registro a cobrar: rascunho nunca fica "atrasado". */
  ativado = true
): ResumoDeRegistros {
  const doPop = (registros || []).filter((registro) => registro.popId === popId).sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  const dias = diasDaFrequenciaDoPop(conteudo, diasDaFrequencia);
  const frequencia = textoDaFrequencia(frequenciaDoPop(conteudo));
  const ultimoRegistro = doPop[0];
  const base = ultimoRegistro ? dataISOLocal(ultimoRegistro.dataHora) : aprovadoEm ? dataISOLocal(aprovadoEm) : "";
  let proximo: ResumoDeRegistros["proximo"] = null;
  if (ativado && dias && base) {
    const devido = somarDias(base, dias);
    const atraso = diasEntreDatas(devido, hoje);
    proximo = atraso === 0 ? { texto: "Hoje", urgente: true } : atraso > 0 ? { texto: `Atrasado há ${atraso} ${atraso === 1 ? "dia" : "dias"}`, urgente: true } : { texto: formatarDataCurta(devido, hoje), urgente: false };
  }
  const recentes = doPop.filter((registro) => {
    const idade = diasEntreDatas(dataISOLocal(registro.dataHora), hoje);
    return idade >= 0 && idade < 30;
  });
  const esperados30 = dias ? Math.max(1, Math.floor(30 / dias)) : null;
  const feitos30 = esperados30 === null ? recentes.length : Math.min(recentes.length, esperados30);
  return {
    frequencia,
    proximo,
    ultimo: ultimoRegistro ? { dataHora: ultimoRegistro.dataHora, quem: ultimoRegistro.responsavel, comDesvio: Boolean(ultimoRegistro.desvio) } : null,
    feitos30,
    esperados30,
  };
}
