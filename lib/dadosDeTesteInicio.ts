// Dados de teste do Início, SÓ para a empresa "Beyond Nutri": uma correção vencida, um treinamento que vence em até 14 dias, um POP aguardando
// aprovação e um POP aprovado com "Revisar até" em até 30 dias. Tudo leva o prefixo "teste-inicio-" no id, para remover depois sem tocar em mais nada.
// Recusa qualquer outra empresa (em especial a Churrascaria do Chico, que é real).
import { CATALOGO_DE_MODELOS, criarPopDeModelo } from "./popModelos.ts";
import type { AppDB, Capacitacao, Colaborador, NaoConformidade, ProcedimentoOperacionalPadronizado, Visita } from "../types/index.ts";

export const PREFIXO_DE_TESTE = "teste-inicio-";
export const EMPRESA_DE_TESTE = "Beyond Nutri";

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLocaleLowerCase("pt-BR");

/** Só a empresa de teste: nome fantasia exatamente "Beyond Nutri". */
export function eEmpresaDeTeste(empresa: { nomeFantasia?: string } | undefined): boolean {
  return semAcento(empresa?.nomeFantasia || "") === semAcento(EMPRESA_DE_TESTE);
}

const somarDias = (iso: string, dias: number): string => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
};

export type ItensDeTeste = {
  visita: Visita;
  nc: NaoConformidade;
  colaborador: Colaborador;
  capacitacao: Capacitacao;
  popAguardando: ProcedimentoOperacionalPadronizado;
  popComRevisao: ProcedimentoOperacionalPadronizado;
};

export function itensDeTeste(empresaId: string, hoje: string, responsavelDoRt = { nome: "Elton Volmir Strapazon", cargo: "Nutricionista" }): ItensDeTeste {
  const criadoEm = `${hoje}T09:00:00.000Z`;
  const modelo = CATALOGO_DE_MODELOS.pops.find((item) => item.id === "comp-02") || CATALOGO_DE_MODELOS.pops[0];
  let n = 0;
  const gerarId = () => `${PREFIXO_DE_TESTE}passo-${(n += 1)}`;
  const novoPop = (id: string, codigo: string) => {
    const resultado = criarPopDeModelo({ modelo, pops: [], empresa: EMPRESA_DE_TESTE, responsavel: responsavelDoRt, id, codigo, titulo: `${modelo.titulo} (teste)`, gerarId });
    if (!resultado.ok) throw new Error("Não foi possível montar o POP de teste.");
    return { ...resultado.pop, conferencia: { conferido: true }, itensAConferir: [] } as ProcedimentoOperacionalPadronizado;
  };
  const aprovacao = { nome: responsavelDoRt.nome, cargo: responsavelDoRt.cargo, em: `${somarDias(hoje, -60)}T12:00:00.000Z`, versao: "1.0" };
  const visita = {
    id: `${PREFIXO_DE_TESTE}visita`,
    empresaId,
    data: somarDias(hoje, -7),
    status: "Em andamento",
    responsavel: responsavelDoRt.nome,
    observacoes: "",
    progresso: 0,
    criadoEm,
    ambientes: ["Recebimento"],
    checklistVersao: 1,
    checklist: [{ id: `${PREFIXO_DE_TESTE}item`, ambiente: "Recebimento", titulo: "Piso limpo e sem acúmulo de resíduos", categoria: "Higiene", status: "Não Conforme", observacao: "" }],
  } as Visita;
  const nc = {
    id: `${PREFIXO_DE_TESTE}nc`,
    empresaId,
    visitaId: visita.id,
    ambiente: "Recebimento",
    checklistItemId: `${PREFIXO_DE_TESTE}item`,
    titulo: "Piso com acúmulo de resíduos (teste)",
    categoria: "Higiene",
    criticidade: "Importante",
    referencia: "",
    orientacao: "",
    observacao: "",
    prioridade: "Média",
    status: "Aberta",
    acaoCorretiva: "Limpar e reforçar a rotina de higienização.",
    responsavelAcao: "Maria (teste)",
    prazo: somarDias(hoje, -5),
    criadoEm,
  } as NaoConformidade;
  const colaborador = { id: `${PREFIXO_DE_TESTE}pessoa`, empresaId, nome: "Pessoa de Teste", cargo: "Auxiliar de cozinha", ativo: true, criadoEm } as Colaborador;
  const capacitacao = { id: `${PREFIXO_DE_TESTE}treino`, empresaId, colaboradorId: colaborador.id, conteudo: "Boas práticas de manipulação (teste)", horas: 4, realizadaEm: somarDias(hoje, -350), venceEm: somarDias(hoje, 10), criadoEm } as unknown as Capacitacao;
  const popAguardando = { ...novoPop(`${PREFIXO_DE_TESTE}pop-aguardando`, "POP-T1"), status: "Aguardando aprovação" } as ProcedimentoOperacionalPadronizado;
  const popComRevisao = { ...novoPop(`${PREFIXO_DE_TESTE}pop-revisao`, "POP-T2"), status: "Aprovado", aprovacao, proximaRevisao: somarDias(hoje, 20) } as ProcedimentoOperacionalPadronizado;
  return { visita, nc, colaborador, capacitacao, popAguardando, popComRevisao };
}

const ehDeTeste = (id: string | undefined) => (id || "").startsWith(PREFIXO_DE_TESTE);

/** Tira tudo que tem o prefixo de teste (em qualquer empresa) e nada mais. */
export function removerDadosDeTeste(db: AppDB): AppDB {
  const empresas = Object.fromEntries(Object.entries(db.empresas).map(([id, empresa]) => [id, empresa.pops?.some((pop) => ehDeTeste(pop.id)) ? { ...empresa, pops: empresa.pops.filter((pop) => !ehDeTeste(pop.id)) } : empresa]));
  return {
    ...db,
    empresas,
    visitas: db.visitas.filter((visita) => !ehDeTeste(visita.id)),
    ncs: db.ncs.filter((nc) => !ehDeTeste(nc.id)),
    ...(db.colaboradores ? { colaboradores: db.colaboradores.filter((pessoa) => !ehDeTeste(pessoa.id)) } : {}),
    ...(db.capacitacoes ? { capacitacoes: db.capacitacoes.filter((item) => !ehDeTeste(item.id)) } : {}),
  };
}

/** Quantos registros de teste existem (para conferir depois de remover: deve dar 0). */
export function contarDadosDeTeste(db: AppDB): number {
  const pops = Object.values(db.empresas).reduce((total, empresa) => total + (empresa.pops || []).filter((pop) => ehDeTeste(pop.id)).length, 0);
  return pops + db.visitas.filter((v) => ehDeTeste(v.id)).length + db.ncs.filter((n) => ehDeTeste(n.id)).length + (db.colaboradores || []).filter((p) => ehDeTeste(p.id)).length + (db.capacitacoes || []).filter((c) => ehDeTeste(c.id)).length;
}

/** Acrescenta os dados de teste na empresa "Beyond Nutri" (idempotente). Qualquer outra empresa é recusada. */
export function adicionarDadosDeTeste(db: AppDB, hoje: string): AppDB {
  const alvo = Object.values(db.empresas).find((empresa) => eEmpresaDeTeste(empresa));
  if (!alvo) throw new Error(`Empresa “${EMPRESA_DE_TESTE}” não encontrada: nada foi alterado.`);
  const limpo = removerDadosDeTeste(db);
  const itens = itensDeTeste(alvo.id, hoje);
  return {
    ...limpo,
    empresas: { ...limpo.empresas, [alvo.id]: { ...limpo.empresas[alvo.id], pops: [...(limpo.empresas[alvo.id].pops || []), itens.popAguardando, itens.popComRevisao] } },
    visitas: [...limpo.visitas, itens.visita],
    ncs: [...limpo.ncs, itens.nc],
    colaboradores: [...(limpo.colaboradores || []), itens.colaborador],
    capacitacoes: [...(limpo.capacitacoes || []), itens.capacitacao],
  };
}
