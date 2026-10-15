import type { Empresa } from "@/types";

export type EtapaConfiguracaoEmpresa = {
  id: "dados" | "manual" | "ambientes" | "fluxos" | "programas" | "pops";
  titulo: string;
  concluida: boolean;
  essencial: boolean;
};

function preenchido(valor?: string) {
  return Boolean(valor?.trim());
}

export function etapasConfiguracaoEmpresa(
  empresa?: Empresa
): EtapaConfiguracaoEmpresa[] {
  if (!empresa) return [];

  const responsabilidadesAtivas = (empresa.responsabilidadesManual || []).filter(
    (item) => item.ativa
  ).length;
  const fluxosAtivos = (empresa.fluxosOperacionais || []).filter(
    (item) => item.aplicavel
  ).length;
  const programasInformados = (empresa.programasControleQualidade || []).filter(
    (item) => item.status !== "Não iniciado"
  ).length;

  return [
    {
      id: "dados",
      titulo: "Dados da empresa",
      concluida:
        preenchido(empresa.nomeFantasia || empresa.razaoSocial) &&
        preenchido(empresa.cnpj) &&
        preenchido(empresa.responsavel),
      essencial: true,
    },
    {
      id: "manual",
      titulo: "Manual e responsáveis",
      concluida:
        preenchido(empresa.atividadeDescricao) &&
        preenchido(empresa.consultorNome) &&
        responsabilidadesAtivas > 0,
      essencial: false,
    },
    {
      id: "ambientes",
      titulo: "Ambientes e equipamentos",
      concluida: (empresa.setoresManual || []).length > 0,
      essencial: true,
    },
    {
      id: "fluxos",
      titulo: "Fluxos operacionais",
      concluida: fluxosAtivos > 0,
      essencial: false,
    },
    {
      id: "programas",
      titulo: "Programas de Controle",
      concluida: programasInformados > 0,
      essencial: false,
    },
    {
      id: "pops",
      titulo: "POPs",
      concluida: (empresa.pops || []).length > 0,
      essencial: false,
    },
  ];
}

export function resumoConfiguracaoEmpresa(empresa?: Empresa) {
  const etapas = etapasConfiguracaoEmpresa(empresa);
  const concluidas = etapas.filter((item) => item.concluida).length;
  const essenciaisConcluidas = etapas
    .filter((item) => item.essencial)
    .every((item) => item.concluida);

  return {
    etapas,
    concluidas,
    total: etapas.length,
    percentual: etapas.length
      ? Math.round((concluidas / etapas.length) * 100)
      : 0,
    prontaParaVisita: etapas.length > 0 && essenciaisConcluidas,
    proximaEtapa:
      etapas.find((item) => item.essencial && !item.concluida) ||
      etapas.find((item) => !item.concluida) ||
      null,
  };
}

export type ItemPreparacao = { id: string; titulo: string; ok: boolean };

/**
 * Preparação da empresa para a lista de Empresas: 6 itens calculados SÓ com dados que já existem
 * (responsável, horário, ≥1 setor, ≥1 equipamento, ≥1 programa, ≥1 POP). Cadastro completo = 100%.
 */
export function preparacaoDaEmpresa(empresa?: Empresa) {
  const setores = (empresa?.setoresManual || []).length;
  const equipamentos = (empresa?.equipamentosSetores || []).length;
  const programas = (empresa?.programasControleQualidade || []).filter(
    (item) => item.status !== "Não iniciado"
  ).length;
  const pops = (empresa?.pops || []).length;
  const temHorario =
    preenchido(empresa?.horarioFuncionamento) ||
    (empresa?.horariosFuncionamento || []).some((dia) => dia.aberto);
  const itens: ItemPreparacao[] = [
    { id: "responsavel", titulo: "Responsável", ok: preenchido(empresa?.responsavel) },
    { id: "horario", titulo: "Horário de funcionamento", ok: temHorario },
    { id: "setores", titulo: "Pelo menos 1 setor", ok: setores > 0 },
    { id: "equipamentos", titulo: "Pelo menos 1 equipamento", ok: equipamentos > 0 },
    { id: "programas", titulo: "Pelo menos 1 programa", ok: programas > 0 },
    { id: "pops", titulo: "Pelo menos 1 POP", ok: pops > 0 },
  ];
  const preenchidos = itens.filter((item) => item.ok).length;
  const percentual = Math.round((preenchidos / itens.length) * 100);
  return {
    itens,
    preenchidos,
    total: itens.length,
    percentual,
    completo: percentual === 100,
    contagens: { setores, equipamentos, programas, pops },
  };
}
