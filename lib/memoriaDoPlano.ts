// Plano de ação inteligente e reincidência: memória do que a empresa já usou (responsável do ambiente, últimas ações), "pela 2ª/3ª vez",
// a ação que funcionou antes e a causa raiz exigida quando o problema volta. Tudo sai do histórico que já está no aparelho (funciona sem sinal)
// e só PROPÕE: nada é gravado até o RT salvar o plano.
import { chaveDoCriterio } from "./actionPlan.ts";

type NcDaMemoria = {
  id: string;
  empresaId: string;
  visitaId: string;
  ambiente: string;
  categoria: string;
  titulo: string;
  status?: string;
  acaoCorretiva?: string;
  responsavelAcao?: string;
  criadoEm?: string;
};

const maisRecentePrimeiro = (a: NcDaMemoria, b: NcDaMemoria) => (b.criadoEm || "").localeCompare(a.criadoEm || "");

function unicos(valores: string[], limite: number): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const valor of valores) {
    const limpo = valor.trim();
    const chave = limpo.toLocaleLowerCase("pt-BR");
    if (!limpo || vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(limpo);
    if (saida.length >= limite) break;
  }
  return saida;
}

export type MemoriaDoPlano = {
  /** Último responsável que a empresa indicou para correções deste ambiente. */
  responsavelDoAmbiente: string;
  /** Últimos responsáveis da empresa (mais recente primeiro). */
  responsaveis: string[];
  /** Últimas ações: as do mesmo critério primeiro, depois as do mesmo ambiente. */
  acoes: string[];
};

export function memoriaDoPlano(ncs: NcDaMemoria[], nc: NcDaMemoria, limite = 4): MemoriaDoPlano {
  const daEmpresa = ncs.filter((outra) => outra.empresaId === nc.empresaId && outra.id !== nc.id).sort(maisRecentePrimeiro);
  const doAmbiente = daEmpresa.filter((outra) => outra.ambiente === nc.ambiente);
  const chave = chaveDoCriterio(nc);
  const doCriterio = daEmpresa.filter((outra) => chaveDoCriterio(outra) === chave);
  return {
    responsavelDoAmbiente: doAmbiente.find((outra) => (outra.responsavelAcao || "").trim())?.responsavelAcao?.trim() || "",
    responsaveis: unicos(daEmpresa.map((outra) => outra.responsavelAcao || ""), limite),
    acoes: unicos([...doCriterio, ...doAmbiente].map((outra) => outra.acaoCorretiva || ""), limite),
  };
}

export type HistoricoDaReincidencia = {
  /** 1 = primeira vez; 2 = "pela 2ª vez"... */
  vezes: number;
  /** Ação da correção anterior do mesmo critério que foi RESOLVIDA (a que funcionou); vazio se não houver. */
  acaoQueFuncionou: string;
};

/** `dataDaVisita` devolve AAAA-MM-DD; só visitas mais antigas e distintas contam. */
export function historicoDaReincidencia(nc: NcDaMemoria, todas: NcDaMemoria[], dataDaVisita: (visitaId: string) => string): HistoricoDaReincidencia {
  const minhaData = dataDaVisita(nc.visitaId);
  const chave = chaveDoCriterio(nc);
  const anteriores = todas
    .filter((outra) => outra.id !== nc.id && outra.empresaId === nc.empresaId && outra.visitaId !== nc.visitaId && chaveDoCriterio(outra) === chave)
    .map((outra) => ({ outra, data: dataDaVisita(outra.visitaId) }))
    .filter((registro) => registro.data && registro.data < minhaData)
    .sort((a, b) => b.data.localeCompare(a.data));
  const visitasAnteriores = new Set(anteriores.map((registro) => registro.outra.visitaId));
  const funcionou = anteriores.find((registro) => registro.outra.status === "Resolvida" && (registro.outra.acaoCorretiva || "").trim());
  return { vezes: visitasAnteriores.size + 1, acaoQueFuncionou: funcionou?.outra.acaoCorretiva?.trim() || "" };
}

export const ordinalDaVez = (vezes: number): string => `${vezes}ª vez`;

/** "Pela 2ª vez" no item e na correção; vazio na primeira. */
export const seloDaReincidencia = (vezes: number): string => (vezes >= 2 ? `Pela ${ordinalDaVez(vezes)}` : "");

export const CAUSAS_RAIZ = [
  "Falta de treinamento",
  "Procedimento (POP) ausente ou desatualizado",
  "Equipamento ou estrutura inadequados",
  "Falta de material ou insumo",
  "Falta de supervisão",
  "Rotina não cumprida",
] as const;

/** Na reincidência a causa raiz é obrigatória: repetir a mesma ação não resolveu. */
export function validarCausaRaiz(reincidente: boolean, causaRaiz: string): string | undefined {
  if (!reincidente) return undefined;
  return causaRaiz.trim() ? undefined : "Este problema voltou: informe a causa raiz.";
}
