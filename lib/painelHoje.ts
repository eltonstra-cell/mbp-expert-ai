// Painel "Hoje precisa de você", lembrete ao responsável do estabelecimento e resumo de uma página.
// Lógica pura: os números vêm dos dados que o app já tem; nada é inventado nem arredondado de forma enganosa.
import type { Capacitacao, Colaborador, ComprovanteTerceiro, Empresa, NaoConformidade, PerfilUsuario, ProcedimentoOperacionalPadronizado, UsuarioSistema, Visita } from "../types/index.ts";
import { hojeISO, situacaoDoPop } from "./popsNorma.ts";
import { coberturaDoChecklist, textoDoPercentualConforme } from "./cobertura.ts";
import { quantidade } from "./plural.ts";
import { diasEntre, pendenciasDaEmpresa, podeGerenciarComprovantes, podeGerenciarPessoas, podeVerComprovantes } from "./registrosEmpresa.ts";

type Quem = Pick<UsuarioSistema, "perfil" | "status" | "validoAte" | "acessoEncerradoEm"> | null | undefined;

const PERFIS_DO_PAINEL: PerfilUsuario[] = ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente"];

/** O painel é do gestor (Administrador, RT, Gestor e Gerente); o Fiscal e o Executor não o veem. */
export function podeVerPainel(usuario: Quem): boolean {
  return Boolean(usuario) && usuario!.status !== "Suspenso" && PERFIS_DO_PAINEL.includes(usuario!.perfil) && podeGerenciarComprovantes(usuario);
}

/** Só RT e Administrador montam e abrem o lembrete ao responsável do estabelecimento. */
export function podeEnviarLembrete(usuario: Quem): boolean {
  return Boolean(usuario) && usuario!.status !== "Suspenso" && (usuario!.perfil === "Administrador" || usuario!.perfil === "Consultor/RT") && podeGerenciarComprovantes(usuario);
}

export type OrigemDoItem = "comprovante" | "capacitacao" | "correcao" | "pop";
export type AcaoDoItem = "abrir" | "renovar" | "aprovar";
export type SituacaoDoItem = "vencido" | "vence-em-breve" | "aguardando";

export type ItemDoPainel = {
  id: string;
  origem: OrigemDoItem;
  titulo: string;
  /** Texto do prazo, ex.: "venceu há 3 dias". */
  prazo: string;
  validade?: string;
  situacao: SituacaoDoItem;
  /** Dias até o prazo (negativo = atrasado). */
  dias: number | null;
  /** Quem precisa agir (papel). */
  quem: string;
  acao: AcaoDoItem | null;
  /** Rótulo do botão ao lado do item. */
  rotuloDaAcao: string;
};

export type PainelHoje = {
  vencidos: number;
  vencemEm7Dias: number;
  aguardando: number;
  itens: ItemDoPainel[];
};

export const DIAS_DO_CONTADOR = 7;

function textoDoPrazo(dias: number): string {
  if (dias < 0) return `venceu há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`;
  if (dias === 0) return "vence hoje";
  return `vence em ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

export type EntradaDoPainel = {
  empresa: Pick<Empresa, "id" | "responsavelEstabelecimento" | "pops">;
  usuario: Quem;
  usuarioId?: string;
  hoje?: string;
  comprovantes?: ComprovanteTerceiro[];
  capacitacoes?: Capacitacao[];
  colaboradores?: Colaborador[];
  ncs?: NaoConformidade[];
  /** Pode ver e agir nas correções (ncs.acompanhar). */
  podeVerCorrecoes: boolean;
};

/** Itens do painel por urgência: vencidos primeiro; só o que o perfil pode ver e fazer. */
export function montarPainelHoje(entrada: EntradaDoPainel): PainelHoje {
  const hoje = entrada.hoje || hojeISO();
  const empresaId = entrada.empresa.id;
  const itens: ItemDoPainel[] = [];

  const base = pendenciasDaEmpresa(
    empresaId,
    { comprovantes: entrada.comprovantes, capacitacoes: entrada.capacitacoes, colaboradores: entrada.colaboradores },
    hoje
  );
  for (const pendencia of base) {
    if (pendencia.origem === "comprovante" && !podeVerComprovantes(entrada.usuario)) continue;
    if (pendencia.origem === "capacitacao" && !podeGerenciarPessoas(entrada.usuario)) continue;
    const podeAgir = pendencia.origem === "comprovante" ? podeGerenciarComprovantes(entrada.usuario) : podeGerenciarPessoas(entrada.usuario);
    itens.push({
      id: `${pendencia.origem}:${pendencia.id}`,
      origem: pendencia.origem,
      titulo: pendencia.titulo,
      prazo: textoDoPrazo(pendencia.dias),
      validade: pendencia.validade,
      situacao: pendencia.situacao,
      dias: pendencia.dias,
      quem: pendencia.origem === "comprovante" ? "RT ou Gestor" : "RT ou Gerente",
      acao: pendencia.origem === "comprovante" ? "renovar" : "abrir",
      rotuloDaAcao: !podeAgir ? "Abrir" : pendencia.origem === "comprovante" ? "Renovar" : "Abrir",
    });
  }

  if (entrada.podeVerCorrecoes) {
    for (const nc of entrada.ncs || []) {
      if (nc.empresaId !== empresaId || nc.inativaNoChecklist || nc.status === "Resolvida" || !nc.prazo) continue;
      const dias = diasEntre(hoje, nc.prazo);
      if (dias > 30) continue;
      itens.push({
        id: `correcao:${nc.id}`,
        origem: "correcao",
        titulo: nc.titulo,
        prazo: textoDoPrazo(dias),
        validade: nc.prazo,
        situacao: dias < 0 ? "vencido" : "vence-em-breve",
        dias,
        quem: nc.responsavelAcao?.trim() ? nc.responsavelAcao.trim() : "Responsável ainda não definido",
        acao: "abrir",
        rotuloDaAcao: "Abrir",
      });
    }
  }

  const responsavel = entrada.empresa.responsavelEstabelecimento;
  for (const pop of entrada.empresa.pops || []) {
    if (pop.arquivado || situacaoDoPop(pop, hoje) !== "Aguardando aprovação") continue;
    const ehOResponsavel = Boolean(responsavel?.usuarioId) && responsavel!.usuarioId === entrada.usuarioId;
    itens.push({
      id: `pop:${pop.id}`,
      origem: "pop",
      titulo: `${pop.codigo ? `${pop.codigo} · ` : ""}${pop.titulo} (versão ${pop.versao})`,
      prazo: "aguardando aprovação",
      situacao: "aguardando",
      dias: null,
      quem: responsavel?.nome ? `Responsável do estabelecimento (${responsavel.cargo || "cargo não informado"})` : "Responsável do estabelecimento (não definido)",
      acao: ehOResponsavel ? "aprovar" : "abrir",
      rotuloDaAcao: ehOResponsavel ? "Aprovar" : "Abrir",
    });
  }

  // Vencidos primeiro (os mais atrasados antes); depois o que vence logo; POP aguardando entra junto dos prazos de até 7 dias.
  const ordem = (item: ItemDoPainel) => (item.situacao === "aguardando" ? DIAS_DO_CONTADOR : (item.dias as number));
  itens.sort((a, b) => ordem(a) - ordem(b) || a.titulo.localeCompare(b.titulo, "pt-BR"));

  return {
    vencidos: itens.filter((item) => item.situacao === "vencido").length,
    vencemEm7Dias: itens.filter((item) => item.situacao === "vence-em-breve" && (item.dias as number) <= DIAS_DO_CONTADOR).length,
    aguardando: itens.filter((item) => item.situacao === "aguardando").length,
    itens,
  };
}

// ===== Lembrete ao responsável do estabelecimento =====

export type Lembrete = { assunto: string; corpo: string; para: string; mailto: string };

const MAX_ITENS_NO_LEMBRETE = 12;

function dataBr(iso?: string) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Texto do lembrete. Lista só título e prazo das pendências. Nunca leva dado de saúde, foto, conteúdo de evidência,
 * texto de observação nem nome de colaborador ligado a capacitação (capacitação entra só como contagem).
 */
export function montarLembrete(dados: { empresaNome: string; painel: PainelHoje; remetente: string; destinatarioNome?: string; destinatarioEmail?: string; hoje?: string }): Lembrete {
  const hoje = dados.hoje || hojeISO();
  const linhasDatadas = dados.painel.itens.filter((item) => item.origem !== "capacitacao");
  const capacitacoes = dados.painel.itens.filter((item) => item.origem === "capacitacao");
  const mostrados = linhasDatadas.slice(0, MAX_ITENS_NO_LEMBRETE);
  const saudacao = dados.destinatarioNome?.trim() ? `Olá, ${dados.destinatarioNome.trim().split(" ")[0]},` : "Olá,";
  const linhas = [
    saudacao,
    "",
    `Resumo do que precisa de atenção em ${dados.empresaNome} (${dataBr(hoje)}):`,
    "",
  ];
  if (mostrados.length === 0 && capacitacoes.length === 0) {
    linhas.push("Nenhuma pendência com prazo vencido ou vencendo.");
  }
  for (const item of mostrados) {
    const prazo = item.validade ? `${item.prazo} (${dataBr(item.validade)})` : item.prazo;
    linhas.push(`- ${item.titulo}: ${prazo}`);
  }
  if (linhasDatadas.length > mostrados.length) linhas.push(`- e mais ${quantidade(linhasDatadas.length - mostrados.length, "item", "itens")} no painel do Ponto Certo.`);
  if (capacitacoes.length > 0) {
    const vencidas = capacitacoes.filter((item) => item.situacao === "vencido").length;
    const aVencer = capacitacoes.length - vencidas;
    linhas.push(`- Capacitações da equipe: ${quantidade(vencidas, "vencida", "vencidas")} e ${aVencer} vencendo. Veja os detalhes no Ponto Certo.`);
  }
  linhas.push("", "Este lembrete foi preparado no Ponto Certo e não substitui o relatório completo.", "", `${dados.remetente}`);
  const corpo = linhas.join("\n");
  const assunto = `Ponto Certo · pendências de ${dados.empresaNome}`;
  const para = dados.destinatarioEmail?.trim() || "";
  return {
    assunto,
    corpo,
    para,
    mailto: `mailto:${encodeURIComponent(para).replace(/%40/g, "@")}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`,
  };
}

// ===== Resumo de uma página =====

export type ResumoDeUmaPagina = {
  empresaNome: string;
  empresaCnpj?: string;
  geradoEm: string;
  /** Percentual de conformidade da última visita com respostas; null quando não há respostas. */
  conformidade: {
    /** Conforme ÷ itens avaliados (nunca da visita inteira quando ela ficou parcial). */
    percentual: number;
    /** Itens avaliados (conformes + não conformes). */
    respondidos: number;
    conformes: number;
    naoConformes: number;
    dataDaVisita: string;
    /** Itens da visita e quantos têm resposta: o denominador que fica visível ("3 de 34 respondidos"). */
    totalDeItens: number;
    respondidosNoChecklist: number;
    parcial: boolean;
    /** Não conformidades ainda abertas que nasceram nesta visita. */
    abertasDaVisita: number;
  } | null;
  /** Não conformidades abertas da EMPRESA (todas as visitas). */
  abertas: number;
  /** Comparação com a visita anterior (só quando as duas têm respostas suficientes). */
  melhoria: { texto: string; pontos: number | null; resolvidasNoPeriodo: number } | null;
  precisaDeAcao: ItemDoPainel[];
  documentosVencendo: number;
  treinamentosVencendo: number;
  /** Mínimo de itens respondidos para comparar visitas sem enganar. */
  minimoParaComparar: number;
};

export const MINIMO_DE_RESPOSTAS_PARA_COMPARAR = 10;
export const MENSAGEM_POUCOS_DADOS = "Poucos dados para comparar.";

function respostasDaVisita(visita: Pick<Visita, "checklist">) {
  const itens = visita.checklist || [];
  const conformes = itens.filter((item) => item.status === "Conforme").length;
  const naoConformes = itens.filter((item) => item.status === "Não Conforme").length;
  return { conformes, naoConformes, respondidos: conformes + naoConformes };
}

/** Percentual exato dos itens respondidos (Conforme ÷ Conforme + Não conforme); "Não se aplica" e pendentes ficam de fora. */
export function percentualDeConformidade(visita: Pick<Visita, "checklist">): number | null {
  const { conformes, respondidos } = respostasDaVisita(visita);
  return respondidos === 0 ? null : Math.round((conformes / respondidos) * 100);
}

export function montarResumo(dados: {
  empresaNome: string;
  empresaCnpj?: string;
  visitas: Visita[];
  ncs: NaoConformidade[];
  painel: PainelHoje;
  hoje?: string;
}): ResumoDeUmaPagina {
  const hoje = dados.hoje || hojeISO();
  const comRespostas = dados.visitas.filter((visita) => respostasDaVisita(visita).respondidos > 0).sort((a, b) => b.data.localeCompare(a.data));
  const ultima = comRespostas[0];
  const anterior = comRespostas[1];
  const r = ultima ? respostasDaVisita(ultima) : null;
  const abertas = dados.ncs.filter((nc) => !nc.inativaNoChecklist && nc.status !== "Resolvida").length;
  const cobertura = ultima ? coberturaDoChecklist(ultima.checklist) : null;
  const abertasDaVisita = ultima ? dados.ncs.filter((nc) => nc.visitaId === ultima.id && !nc.inativaNoChecklist && nc.status !== "Resolvida").length : 0;

  let melhoria: ResumoDeUmaPagina["melhoria"] = null;
  if (ultima && anterior) {
    const a = respostasDaVisita(anterior);
    const atual = respostasDaVisita(ultima);
    const resolvidasNoPeriodo = dados.ncs.filter((nc) => nc.status === "Resolvida" && !!nc.resolvidaEm && nc.resolvidaEm.slice(0, 10) > anterior.data && nc.resolvidaEm.slice(0, 10) <= hoje).length;
    if (a.respondidos >= MINIMO_DE_RESPOSTAS_PARA_COMPARAR && atual.respondidos >= MINIMO_DE_RESPOSTAS_PARA_COMPARAR) {
      const pontos = Math.round((atual.conformes / atual.respondidos) * 100) - Math.round((a.conformes / a.respondidos) * 100);
      melhoria = {
        pontos,
        resolvidasNoPeriodo,
        texto: pontos > 0 ? `Conformidade subiu ${quantidade(pontos, "ponto percentual", "pontos percentuais")} desde a visita anterior.` : pontos < 0 ? `Conformidade caiu ${quantidade(Math.abs(pontos), "ponto percentual", "pontos percentuais")} desde a visita anterior.` : "Conformidade igual à da visita anterior.",
      };
    } else {
      melhoria = { pontos: null, resolvidasNoPeriodo, texto: MENSAGEM_POUCOS_DADOS };
    }
  }

  return {
    empresaNome: dados.empresaNome,
    empresaCnpj: dados.empresaCnpj,
    geradoEm: hoje,
    conformidade:
      ultima && r && cobertura
        ? {
            percentual: Math.round((r.conformes / r.respondidos) * 100),
            respondidos: r.respondidos,
            conformes: r.conformes,
            naoConformes: r.naoConformes,
            dataDaVisita: ultima.data,
            totalDeItens: cobertura.total,
            respondidosNoChecklist: cobertura.respondidos,
            parcial: cobertura.parcial,
            abertasDaVisita,
          }
        : null,
    abertas,
    melhoria,
    precisaDeAcao: dados.painel.itens.slice(0, 6),
    documentosVencendo: dados.painel.itens.filter((item) => item.origem === "comprovante").length,
    treinamentosVencendo: dados.painel.itens.filter((item) => item.origem === "capacitacao").length,
    minimoParaComparar: MINIMO_DE_RESPOSTAS_PARA_COMPARAR,
  };
}

/** Texto curto do resumo para WhatsApp: os mesmos números da página. */
export function textoDoResumo(resumo: ResumoDeUmaPagina): string {
  const linhas = [`Resumo · ${resumo.empresaNome} · ${dataBr(resumo.geradoEm)}`];
  linhas.push(
    resumo.conformidade
      ? `Visita de ${dataBr(resumo.conformidade.dataDaVisita)}: ${resumo.conformidade.percentual}% conforme entre os itens avaliados (${resumo.conformidade.conformes} de ${resumo.conformidade.respondidos}); ${resumo.conformidade.respondidosNoChecklist} de ${resumo.conformidade.totalDeItens} itens respondidos${resumo.conformidade.parcial ? " (visita parcial)" : ""}`
      : "Visita: sem itens respondidos ainda"
  );
  linhas.push(`Da empresa: ${quantidade(resumo.abertas, "não conformidade aberta", "não conformidades abertas")}`);
  if (resumo.melhoria) linhas.push(resumo.melhoria.texto);
  linhas.push(`Da empresa: ${quantidade(resumo.documentosVencendo, "documento vencido ou vencendo", "documentos vencidos ou vencendo")} · ${quantidade(resumo.treinamentosVencendo, "treinamento vencido ou vencendo", "treinamentos vencidos ou vencendo")}`);
  linhas.push("Não substitui o relatório completo.");
  return linhas.join("\n");
}

export type { ProcedimentoOperacionalPadronizado };
