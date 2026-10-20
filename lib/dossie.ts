// Dossiê para fiscalização: um PDF único com índice, com o que a pessoa escolher. Só a empresa ativa entra.
// Fotos ficam DESLIGADAS por padrão (LGPD e tamanho). Aqui só se monta o conteúdo; a impressão é a do navegador.
import type { Capacitacao, Colaborador, ComprovanteTerceiro, Empresa, PerfilUsuario, RegistroPop, RelatorioEmitido, UsuarioSistema } from "../types/index.ts";
import { hojeISO, linhasDoConteudo, popVigente } from "./popsNorma.ts";
import { ROTULO_DA_VALIDADE, comprovantesVigentes, rotuloDoTipo, situacaoDaValidade, capacitacoesVigentes } from "./registrosEmpresa.ts";

export type OpcoesDoDossie = {
  relatorios: boolean;
  pops: boolean;
  registros: boolean;
  comprovantes: boolean;
  capacitacao: boolean;
  fotos: boolean;
};

/** Fotos desligadas por padrão. */
export function opcoesPadraoDoDossie(): OpcoesDoDossie {
  return { relatorios: true, pops: true, registros: true, comprovantes: true, capacitacao: true, fotos: false };
}

const PERFIS_DO_DOSSIE: PerfilUsuario[] = ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente"];

/** Só RT, Administrador, Gestor e Gerente geram o dossiê. */
export function podeGerarDossie(usuario: Pick<UsuarioSistema, "perfil" | "status"> | null | undefined): boolean {
  return Boolean(usuario) && usuario!.status !== "Suspenso" && PERFIS_DO_DOSSIE.includes(usuario!.perfil);
}

export type SecaoDoDossie = {
  id: string;
  titulo: string;
  /** Linhas de texto simples (já formatadas). */
  linhas: string[];
  /** Referências de fotos (só quando as fotos foram ligadas). */
  fotos?: { id: string; legenda: string; pathname: string }[];
};

export type Dossie = {
  empresaNome: string;
  geradoEm: string;
  indice: { id: string; titulo: string }[];
  secoes: SecaoDoDossie[];
  /** O dossiê leva fotos? */
  comFotos: boolean;
};

export type DadosDoDossie = {
  empresa: Pick<Empresa, "id" | "nomeFantasia" | "razaoSocial" | "cnpj" | "pops">;
  relatorios?: RelatorioEmitido[];
  registros?: RegistroPop[];
  comprovantes?: ComprovanteTerceiro[];
  colaboradores?: Colaborador[];
  capacitacoes?: Capacitacao[];
};

const dataBr = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const dataHoraBr = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

/** Relatórios emitidos dos últimos 12 meses (a data de emissão decide). */
export function relatoriosDosUltimos12Meses(relatorios: RelatorioEmitido[], hoje: string): RelatorioEmitido[] {
  const [ano, mes, dia] = hoje.split("-").map(Number);
  const corte = `${String(ano - 1).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  return relatorios.filter((item) => item.emitidoEm.slice(0, 10) >= corte).sort((a, b) => b.emitidoEm.localeCompare(a.emitidoEm));
}

export function montarDossie(dados: DadosDoDossie, opcoes: OpcoesDoDossie, hoje: string = hojeISO()): Dossie {
  const empresaId = dados.empresa.id;
  const secoes: SecaoDoDossie[] = [];

  const relatorios = relatoriosDosUltimos12Meses((dados.relatorios || []).filter((item) => item.empresaId === empresaId), hoje);
  if (opcoes.relatorios) {
    secoes.push({
      id: "relatorios",
      titulo: "Relatórios emitidos (últimos 12 meses)",
      linhas: relatorios.length
        ? relatorios.map((item) => {
            const c = item.instantaneo.conformidade;
            return `${item.numero} · versão ${item.versao} · emitido em ${dataHoraBr(item.emitidoEm)} · visita de ${dataBr(item.instantaneo.visita.data)} · ${c.percentual === null ? "sem itens respondidos" : `${c.percentual}% de conformidade (${c.conformes} de ${c.respondidos})`} · assinado por ${item.assinatura.nome}, ${item.assinatura.crn}. ${item.aviso}`;
          })
        : ["Nenhum relatório emitido nos últimos 12 meses."],
    });
  }

  if (opcoes.pops) {
    const linhas: string[] = [];
    for (const pop of (dados.empresa.pops || []).filter((item) => !item.arquivado)) {
      const vigente = popVigente(pop);
      if (!vigente) continue;
      linhas.push(`${pop.codigo ? `${pop.codigo} · ` : ""}${pop.titulo} · versão vigente ${vigente.versao}${vigente.aprovacao ? ` · aprovada por ${vigente.aprovacao.nome} em ${dataBr(vigente.aprovacao.em)}` : ""}`);
      for (const linha of linhasDoConteudo(vigente.conteudo).filter((item) => item.valor.trim())) linhas.push(`    ${linha.campo}: ${linha.valor}`);
    }
    secoes.push({ id: "pops", titulo: "POPs aprovados (versão vigente)", linhas: linhas.length ? linhas : ["Nenhum POP aprovado."] });
  }

  if (opcoes.registros) {
    const doPop = new Map((dados.empresa.pops || []).map((pop) => [pop.id, `${pop.codigo ? `${pop.codigo} · ` : ""}${pop.titulo}`]));
    const lista = (dados.registros || []).filter((item) => item.empresaId === empresaId).sort((a, b) => b.dataHora.localeCompare(a.dataHora));
    secoes.push({
      id: "registros",
      titulo: "Registros por POP",
      linhas: lista.length ? lista.map((item) => `${dataHoraBr(item.dataHora)} · ${doPop.get(item.popId) || "POP"} (v${item.popVersao}) · ${item.responsavel}${item.ambiente ? ` · ${item.ambiente}` : ""} · ${item.descricao}`) : ["Nenhum registro."],
    });
  }

  if (opcoes.comprovantes) {
    const lista = comprovantesVigentes((dados.comprovantes || []).filter((item) => item.empresaId === empresaId)).sort((a, b) => a.validade.localeCompare(b.validade));
    secoes.push({
      id: "comprovantes",
      titulo: "Comprovantes de terceiros",
      linhas: lista.length ? lista.map((item) => `${rotuloDoTipo(item.tipo)} · ${item.emissor} · serviço em ${dataBr(item.dataServico)} · validade ${dataBr(item.validade)} (${ROTULO_DA_VALIDADE[situacaoDaValidade(item.validade, hoje)]})`) : ["Nenhum comprovante."],
    });
  }

  if (opcoes.capacitacao) {
    const nomes = new Map((dados.colaboradores || []).filter((item) => item.empresaId === empresaId).map((item) => [item.id, `${item.nome} (${item.cargo})`]));
    const lista = capacitacoesVigentes((dados.capacitacoes || []).filter((item) => item.empresaId === empresaId));
    secoes.push({
      id: "capacitacao",
      titulo: "Capacitação nominal",
      linhas: lista.length
        ? lista.map((item) => `${nomes.get(item.colaboradorId) || "Pessoa"} · ${item.conteudo} · ${item.cargaHoraria} h · feito em ${dataBr(item.data)} · ${item.venceEm ? `vence em ${dataBr(item.venceEm)}` : "sem vencimento"}`)
        : ["Nenhuma capacitação registrada."],
    });
  }

  // Fotos: só dos relatórios incluídos, e só se a pessoa ligou. Nunca de outra empresa.
  if (opcoes.fotos) {
    const fotos = relatorios.flatMap((relatorio) =>
      relatorio.instantaneo.evidencias.filter((ev) => ev.blobPathname).map((ev) => ({ id: ev.id, legenda: `${relatorio.numero} v${relatorio.versao} · ${ev.ambiente || "Sem ambiente"} · ${dataHoraBr(ev.criadoEm)}${ev.descricao ? ` · ${ev.descricao}` : ""}`, pathname: ev.blobPathname as string }))
    );
    secoes.push({ id: "fotos", titulo: "Fotos dos relatórios emitidos", linhas: fotos.length ? [] : ["Nenhuma foto nos relatórios incluídos."], fotos });
  }

  return {
    empresaNome: dados.empresa.nomeFantasia || dados.empresa.razaoSocial,
    geradoEm: hoje,
    indice: secoes.map((secao) => ({ id: secao.id, titulo: secao.titulo })),
    secoes,
    comFotos: opcoes.fotos,
  };
}
