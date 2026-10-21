import type { Empresa } from "@/types";
import { responsavelEfetivo } from "./responsavelEstabelecimento.ts";

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
        Boolean(responsavelEfetivo(empresa).nome),
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
    { id: "responsavel", titulo: "Responsável", ok: Boolean(responsavelEfetivo(empresa).nome) },
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

/**
 * Campos obrigatórios do cadastro para a empresa estar "pronta para visita": nome, CNPJ, responsável e
 * pelo menos 1 ambiente (as etapas essenciais de resumoConfiguracaoEmpresa). Devolve os que faltam.
 * Já a "Preparação" (preparacaoDaEmpresa) mede 6 itens, inclusive os opcionais; as duas medidas são diferentes.
 */
export function faltasDoCadastro(empresa?: Empresa): string[] {
  if (!empresa) return ["nome", "CNPJ", "responsável", "ambientes"];
  const faltas: string[] = [];
  if (!preenchido(empresa.nomeFantasia || empresa.razaoSocial)) faltas.push("nome");
  if (!preenchido(empresa.cnpj)) faltas.push("CNPJ");
  if (!responsavelEfetivo(empresa).nome) faltas.push("responsável");
  if ((empresa.setoresManual || []).length === 0) faltas.push("ambientes");
  return faltas;
}

const ROTULO_CURTO_DA_PREPARACAO: Record<string, string> = {
  responsavel: "responsável do estabelecimento (em Dados)",
  horario: "horário de funcionamento",
  setores: "setores",
  equipamentos: "equipamentos",
  programas: "programas",
  pops: "POPs",
};

/**
 * O que falta para a empresa estar completa: os itens da preparação ainda vazios (mais nome e CNPJ do cadastro).
 * Lista vazia = preparação em 100% e cadastro em ordem: só então vale "Cadastro completo".
 */
export function pendenciasDaEmpresa(empresa?: Empresa): string[] {
  const preparacao = preparacaoDaEmpresa(empresa);
  const cadastro = faltasDoCadastro(empresa).filter((falta) => falta === "nome" || falta === "CNPJ");
  const faltantes = preparacao.itens.filter((item) => !item.ok).map((item) => ROTULO_CURTO_DA_PREPARACAO[item.id] || item.titulo.toLocaleLowerCase("pt-BR"));
  return [...cadastro, ...faltantes];
}

/** Para o cartão da lista: a primeira pendência e quantas mais ("Falta: horário de funcionamento +2"); a lista inteira vai na dica. */
export function textoDaPendenciaCurta(faltas: string[]): string {
  if (faltas.length === 0) return "";
  return faltas.length === 1 ? `Falta: ${faltas[0]}` : `Falta: ${faltas[0]} +${faltas.length - 1}`;
}

/** "Falta: equipamentos e programas" */
export function textoDaPendencia(faltas: string[]): string {
  if (faltas.length === 0) return "";
  const lista = faltas.length === 1 ? faltas[0] : `${faltas.slice(0, -1).join(", ")} e ${faltas[faltas.length - 1]}`;
  return `Falta: ${lista}`;
}

/** Texto do chip de pendências do cartão: uma só mostra o nome; várias, "N pendências ▸" (a lista completa abre numa janelinha). */
export function rotuloDoChipDePendencias(faltas: string[]): string {
  if (faltas.length === 0) return "";
  return faltas.length === 1 ? `Falta: ${faltas[0]}` : `${faltas.length} pendências ▸`;
}
