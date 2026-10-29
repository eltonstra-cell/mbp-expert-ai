// "Vincular os sugeridos": para cada ambiente PRÓPRIO sem vínculo, o setor oficial sugerido. Só vem marcado por padrão quando o casamento é exato
// (`oficialExatoDoSetor`); o que é só "parecido" (`sugerirSetorOficial`) aparece desmarcado para o RT decidir. Nada é gravado antes da confirmação.
// Aplicar e Desfazer trabalham em delta sobre a empresa de AGORA (nunca sobre um retrato antigo).
import { SETORES_OFICIAIS_MANUAL } from "./manualBase.ts";
import { sugerirSetorOficial } from "./setorOficialSugerido.ts";
import { oficialExatoDoSetor } from "./sugestaoPorCnae.ts";
import type { EquipamentoSetor } from "../types/index.ts";

export type LinhaDeVinculoSugerido = { ambiente: string; oficial: string; exato: boolean };
export type EscolhaDeVinculo = { ambiente: string; oficial: string };

const eOficial = (setor: string) => (SETORES_OFICIAIS_MANUAL as readonly string[]).includes(setor);

/** Ambientes próprios sem vínculo que têm um setor oficial sugerido (exato ou parecido), na ordem da lista da empresa. */
export function vinculosSugeridos(setores: string[], vinculos: Record<string, string> = {}): LinhaDeVinculoSugerido[] {
  const linhas: LinhaDeVinculoSugerido[] = [];
  for (const ambiente of setores) {
    if (eOficial(ambiente) || vinculos[ambiente]) continue;
    const exato = oficialExatoDoSetor(ambiente, vinculos);
    const oficial = exato || sugerirSetorOficial(ambiente)?.oficial || null;
    if (oficial) linhas.push({ ambiente, oficial, exato: Boolean(exato) });
  }
  return linhas;
}

/** Quantos já vêm marcados na lista (casamento exato). */
export const quantosExatos = (linhas: LinhaDeVinculoSugerido[]): number => linhas.filter((linha) => linha.exato).length;

/**
 * Vincula as escolhas: grava o vínculo e, como "Vincular" já faz um a um, marca o setor oficial que ainda não estava na lista.
 * Escolha de ambiente que já tem vínculo, que não existe mais ou com setor que não é oficial é ignorada. `adicionados` = setores oficiais que entraram na lista.
 */
export function aplicarVinculosEmLote(setores: string[], vinculos: Record<string, string>, escolhas: EscolhaDeVinculo[]): { setores: string[]; vinculos: Record<string, string>; vinculados: EscolhaDeVinculo[]; adicionados: string[] } {
  let proximosSetores = setores;
  const proximosVinculos = { ...vinculos };
  const vinculados: EscolhaDeVinculo[] = [];
  const adicionados: string[] = [];
  for (const { ambiente, oficial } of escolhas) {
    if (!setores.includes(ambiente) || eOficial(ambiente) || proximosVinculos[ambiente] || !eOficial(oficial)) continue;
    proximosVinculos[ambiente] = oficial;
    vinculados.push({ ambiente, oficial });
    if (!proximosSetores.includes(oficial)) {
      proximosSetores = [...proximosSetores, oficial];
      adicionados.push(oficial);
    }
  }
  return { setores: proximosSetores, vinculos: proximosVinculos, vinculados, adicionados };
}

/**
 * Desfaz em delta: tira só os vínculos que o lote criou (e que continuam iguais) e só os setores oficiais que o lote marcou, se ainda não têm equipamento
 * nem outro ambiente vinculado a eles, nem `protegidos` (questionário, fluxo ou visita: ver `setoresOficiaisEmUso`). Qualquer outra mudança feita depois fica como está.
 */
export function desfazerVinculosEmLote(setores: string[], vinculos: Record<string, string>, equipamentos: EquipamentoSetor[], feitos: { vinculados: EscolhaDeVinculo[]; adicionados: string[] }, protegidos: string[] = []): { setores: string[]; vinculos: Record<string, string> } {
  const proximosVinculos = { ...vinculos };
  for (const { ambiente, oficial } of feitos.vinculados) if (proximosVinculos[ambiente] === oficial) delete proximosVinculos[ambiente];
  const emUso = (oficial: string) => protegidos.includes(oficial) || equipamentos.some((item) => item.setor === oficial) || Object.values(proximosVinculos).includes(oficial);
  const proximosSetores = setores.filter((setor) => !(feitos.adicionados.includes(setor) && !emUso(setor)));
  return { setores: proximosSetores, vinculos: proximosVinculos };
}

/** "3 ambientes vinculados" / "1 ambiente vinculado". */
export const textoDosVinculados = (n: number): string => `${n} ${n === 1 ? "ambiente vinculado" : "ambientes vinculados"}`;

/** Setores oficiais que já têm algo apoiado neles: equipamento, questionário (modelo), fluxo ligado ou ambiente numa visita. Não saem no Desfazer. */
export function setoresOficiaisEmUso(candidatos: string[], dados: { equipamentos: EquipamentoSetor[]; modelos?: Record<string, string>; fluxos?: { setorVinculado?: string }[]; ambientesEmVisitas?: string[] }): string[] {
  return candidatos.filter(
    (oficial) =>
      dados.equipamentos.some((item) => item.setor === oficial) ||
      Boolean(dados.modelos?.[oficial]) ||
      (dados.fluxos || []).some((fluxo) => fluxo.setorVinculado === oficial) ||
      (dados.ambientesEmVisitas || []).includes(oficial)
  );
}
