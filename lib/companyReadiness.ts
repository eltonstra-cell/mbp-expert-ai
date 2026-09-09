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
