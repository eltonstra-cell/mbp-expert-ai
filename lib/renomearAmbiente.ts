// Renomear um ambiente próprio da empresa com cascata: o novo nome entra em tudo que cita o antigo (cadastro, equipamentos, fluxos, questionários,
// vínculos, visitas e o que nasceu nelas). Relatórios já emitidos são cópias assinadas e NÃO mudam. Regras puras, sem tela.
import { chaveDoNome, nomeJaExistente } from "./ambientesVisita.ts";
import type { AppDB, Empresa } from "../types/index.ts";

export type ResumoDaRenomeacao = {
  total: number;
  /** Rótulo -> quantidade (só os que têm algo a mudar). */
  partes: { rotulo: string; singular: string; quantidade: number }[];
};

const IGUAL = (a: string | undefined, b: string) => (a || "").trim() === b.trim();
const trocarChave = <T,>(mapa: Record<string, T> | undefined, de: string, para: string): Record<string, T> | undefined => {
  if (!mapa || !(de in mapa)) return mapa;
  const { [de]: valor, ...resto } = mapa;
  return { ...resto, [para]: valor };
};

/** Mensagem de erro do novo nome (vazia = serve). Compara sem acento e sem diferença de maiúsculas, inclusive com os setores oficiais. */
export function erroDoNovoNome(de: string, para: string, cadastro: string[]): string {
  const novo = para.trim();
  if (!novo) return "Escreva o novo nome do ambiente.";
  if (IGUAL(de, novo)) return "O novo nome é igual ao atual.";
  const outros = cadastro.filter((nome) => !IGUAL(nome, de));
  const existente = nomeJaExistente(novo, outros);
  if (existente && chaveDoNome(existente) !== chaveDoNome(de)) return `Já existe: ${existente}.`;
  return "";
}

type Alvo = { visitaIds: Set<string> };
const alvoDaEmpresa = (db: AppDB, empresaId: string): Alvo => ({ visitaIds: new Set(db.visitas.filter((visita) => visita.empresaId === empresaId).map((visita) => visita.id)) });

/** Quantos registros mudam, por tipo, para mostrar antes de confirmar. */
export function resumoDaRenomeacao(db: AppDB, empresaId: string, de: string): ResumoDaRenomeacao {
  const empresa = db.empresas[empresaId];
  const partes: { rotulo: string; singular: string; quantidade: number }[] = [];
  const somar = (rotulo: string, quantidade: number, singular = rotulo) => {
    if (quantidade > 0) partes.push({ rotulo, singular, quantidade });
  };
  if (!empresa) return { total: 0, partes };
  const alvo = alvoDaEmpresa(db, empresaId);
  somar("no cadastro de ambientes", (empresa.setoresManual || []).filter((nome) => IGUAL(nome, de)).length);
  somar("equipamentos", (empresa.equipamentosSetores || []).filter((item) => IGUAL(item.setor, de)).length, "equipamento");
  somar("fluxos", (empresa.fluxosOperacionais || []).filter((item) => IGUAL(item.setorVinculado, de)).length, "fluxo");
  somar("questionários", (empresa.questionarios && de in empresa.questionarios ? 1 : 0) + (empresa.modelosQuestionarioAmbientes && de in empresa.modelosQuestionarioAmbientes ? 1 : 0), "questionário");
  somar("vínculos com setor oficial", empresa.setorOficialDoAmbiente && de in empresa.setorOficialDoAmbiente ? 1 : 0, "vínculo com setor oficial");
  const visitas = db.visitas.filter((visita) => alvo.visitaIds.has(visita.id));
  somar(
    "visitas",
    visitas.filter((visita) => (visita.ambientes || []).some((nome) => IGUAL(nome, de)) || (visita.checklist || []).some((item) => IGUAL(item.ambiente, de)) || (visita.avaliacoesEquipamentos || []).some((item) => IGUAL(item.ambiente, de)) || (visita.ambientesOcultos || []).some((item) => IGUAL(item.ambiente, de))).length,
    "visita"
  );
  somar("itens de checklist", visitas.reduce((total, visita) => total + (visita.checklist || []).filter((item) => IGUAL(item.ambiente, de)).length, 0), "item de checklist");
  somar("avaliações de equipamento", visitas.reduce((total, visita) => total + (visita.avaliacoesEquipamentos || []).filter((item) => IGUAL(item.ambiente, de)).length, 0), "avaliação de equipamento");
  somar("não conformidades", db.ncs.filter((nc) => nc.empresaId === empresaId && IGUAL(nc.ambiente, de)).length, "não conformidade");
  somar("evidências", db.evidencias.filter((evidencia) => alvo.visitaIds.has(evidencia.visitaId) && IGUAL(evidencia.ambiente, de)).length, "evidência");
  somar("registros de POP", (db.registrosPop || []).filter((registro) => registro.empresaId === empresaId && IGUAL(registro.ambiente, de)).length, "registro de POP");
  return { total: partes.reduce((total, parte) => total + parte.quantidade, 0), partes };
}

export function textoDoResumo(resumo: ResumoDaRenomeacao): string {
  if (resumo.total === 0) return "Nenhum outro registro usa este nome.";
  return `${resumo.total === 1 ? "1 registro será atualizado" : `${resumo.total} registros serão atualizados`}: ${resumo.partes.map((parte) => `${parte.quantidade} ${parte.quantidade === 1 ? parte.singular : parte.rotulo}`).join(", ")}.`;
}

/** Devolve um novo estado com o nome trocado em tudo. Relatórios emitidos não são tocados. */
export function renomearAmbiente(db: AppDB, empresaId: string, de: string, para: string): AppDB {
  const empresa = db.empresas[empresaId];
  const novo = para.trim();
  if (!empresa || !novo || IGUAL(de, novo)) return db;
  const nome = (valor: string) => (IGUAL(valor, de) ? novo : valor);
  const atualizada: Empresa = {
    ...empresa,
    ...(empresa.setoresManual ? { setoresManual: empresa.setoresManual.map(nome) } : {}),
    ...(empresa.equipamentosSetores ? { equipamentosSetores: empresa.equipamentosSetores.map((item) => (IGUAL(item.setor, de) ? { ...item, setor: novo } : item)) } : {}),
    ...(empresa.fluxosOperacionais ? { fluxosOperacionais: empresa.fluxosOperacionais.map((item) => (IGUAL(item.setorVinculado, de) ? { ...item, setorVinculado: novo } : item)) } : {}),
  };
  if (empresa.modelosQuestionarioAmbientes) atualizada.modelosQuestionarioAmbientes = trocarChave(empresa.modelosQuestionarioAmbientes, de, novo);
  if (empresa.setorOficialDoAmbiente) atualizada.setorOficialDoAmbiente = trocarChave(empresa.setorOficialDoAmbiente, de, novo);
  if (empresa.questionarios && de in empresa.questionarios) {
    const trocados = trocarChave(empresa.questionarios, de, novo)!;
    atualizada.questionarios = { ...trocados, [novo]: { ...trocados[novo], ambiente: novo } };
  }
  const alvo = alvoDaEmpresa(db, empresaId);
  return {
    ...db,
    empresas: { ...db.empresas, [empresaId]: atualizada },
    visitas: db.visitas.map((visita) => {
      if (!alvo.visitaIds.has(visita.id)) return visita;
      return {
        ...visita,
        ...(visita.ambientes ? { ambientes: visita.ambientes.map(nome) } : {}),
        ...(visita.modelosQuestionarioAmbientes ? { modelosQuestionarioAmbientes: trocarChave(visita.modelosQuestionarioAmbientes, de, novo) } : {}),
        ...(visita.avaliacoesEquipamentos ? { avaliacoesEquipamentos: visita.avaliacoesEquipamentos.map((item) => (IGUAL(item.ambiente, de) ? { ...item, ambiente: novo } : item)) } : {}),
        ...(visita.checklist ? { checklist: visita.checklist.map((item) => (IGUAL(item.ambiente, de) ? { ...item, ambiente: novo } : item)) } : {}),
        ...(visita.ambientesOcultos
          ? { ambientesOcultos: visita.ambientesOcultos.map((oculto) => (IGUAL(oculto.ambiente, de) ? { ...oculto, ambiente: novo, itens: oculto.itens.map((item) => ({ ...item, ambiente: novo })) } : oculto)) }
          : {}),
      };
    }),
    ncs: db.ncs.map((nc) => (nc.empresaId === empresaId && IGUAL(nc.ambiente, de) ? { ...nc, ambiente: novo } : nc)),
    evidencias: db.evidencias.map((evidencia) => (alvo.visitaIds.has(evidencia.visitaId) && IGUAL(evidencia.ambiente, de) ? { ...evidencia, ambiente: novo } : evidencia)),
    ...(db.registrosPop ? { registrosPop: db.registrosPop.map((registro) => (registro.empresaId === empresaId && IGUAL(registro.ambiente, de) ? { ...registro, ambiente: novo } : registro)) } : {}),
  };
}
