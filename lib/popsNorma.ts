// Conjunto de POPs da norma da empresa, texto-base (estrutura, sem passos redigidos), versões e aprovação.
// Nada aqui redige procedimento: o texto-base só traz as orientações do que a norma pede, cada uma com a citação do item.
import type {
  AprovacaoPop,
  ConteudoPop,
  PassoPop,
  Empresa,
  ProcedimentoOperacionalPadronizado,
  ReferenciaPop,
  RegistroAuditoria,
  UsuarioSistema,
  VersaoPop,
} from "../types/index.ts";
import { CATALOGO_DE_NORMAS, normasDaEmpresa, type Norma } from "./normas/index.ts";
import { acessoVigente } from "./validadeDeAcesso.ts";
import { hojeLocalISO } from "./dataLocal.ts";
import { limparTextoDePessoa, nomeECargo } from "./nomeCargo.ts";

export type BlocoExtraDoPop = "higienizacao" | "pragas" | "manipuladores";

export type DefinicaoPopDoConjunto = {
  catalogoId: string;
  codigo: string;
  titulo: string;
  /** Letra do item da lista de POPs (4.11.4 a–d; SES 799/2023, Anexo II, 13.7 a–d). */
  letra: "a" | "b" | "c" | "d";
  programaRelacionado: string;
  /** Categorias de NC do checklist que sugerem este POP (vínculo NC → POP). */
  categoriasDeNc: string[];
  /** Ids dos itens do catálogo de normas que este POP cita. */
  itens: string[];
  bloco: BlocoExtraDoPop;
  /** Reservatório e instalações usam o bloco de higienização. */
  eReservatorio?: boolean;
};

export const CONJUNTO_DA_NORMA: DefinicaoPopDoConjunto[] = [
  {
    catalogoId: "higienizacao-instalacoes",
    codigo: "POP-01",
    titulo: "Higienização de instalações, equipamentos e móveis",
    letra: "a",
    programaRelacionado: "Limpeza e higienização/sanitização",
    categoriasDeNc: ["Limpeza e higienização/sanitização"],
    itens: ["estrutura-do-pop", "lista-de-pops", "higienizacao", "guarda-de-registros", "acao-corretiva"],
    bloco: "higienizacao",
  },
  {
    catalogoId: "controle-de-pragas",
    codigo: "POP-02",
    titulo: "Controle integrado de vetores e pragas urbanas",
    letra: "b",
    programaRelacionado: "",
    categoriasDeNc: [],
    itens: ["estrutura-do-pop", "lista-de-pops", "pragas", "guarda-de-registros", "acao-corretiva"],
    bloco: "pragas",
  },
  {
    catalogoId: "higienizacao-reservatorio",
    codigo: "POP-03",
    titulo: "Higienização do reservatório",
    letra: "c",
    programaRelacionado: "Controle da potabilidade da água",
    categoriasDeNc: ["Controle da potabilidade da água"],
    itens: ["estrutura-do-pop", "lista-de-pops", "higienizacao", "reservatorio-pop", "reservatorio-intervalo", "guarda-de-registros", "acao-corretiva"],
    bloco: "higienizacao",
    eReservatorio: true,
  },
  {
    catalogoId: "higiene-saude-manipuladores",
    codigo: "POP-04",
    titulo: "Higiene e saúde dos manipuladores",
    letra: "d",
    programaRelacionado: "Saúde e higiene dos manipuladores",
    categoriasDeNc: ["Saúde e higiene dos manipuladores"],
    itens: ["estrutura-do-pop", "lista-de-pops", "manipuladores", "guarda-de-registros", "acao-corretiva"],
    bloco: "manipuladores",
  },
];

export const MENSAGEM_SEM_NORMA_APLICADA = "Defina as normas aplicadas à empresa em Empresas › Norma aplicável para ver o conjunto de POPs.";

const chave = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();

/** Conjunto de POPs da empresa: só existe quando há norma do catálogo aplicada. */
export function conjuntoDaEmpresa(empresa: { normasAplicadas?: string[] } | undefined, catalogo: Norma[] = CATALOGO_DE_NORMAS): DefinicaoPopDoConjunto[] {
  if (!empresa || normasDaEmpresa(empresa, catalogo).length === 0) return [];
  return CONJUNTO_DA_NORMA;
}

/** Acha o POP do conjunto: pelo id do catálogo ou, em POPs antigos, pelo título. */
export function popDoConjunto(pops: ProcedimentoOperacionalPadronizado[], definicao: DefinicaoPopDoConjunto): ProcedimentoOperacionalPadronizado | undefined {
  const ativos = pops.filter((pop) => !pop.arquivado);
  return (
    ativos.find((pop) => pop.catalogoId === definicao.catalogoId) ||
    ativos.find((pop) => !pop.catalogoId && chave(pop.titulo) === chave(definicao.titulo))
  );
}

export type SituacaoDoPop = "Falta criar" | "Rascunho" | "Aguardando aprovação" | "Aprovado" | "Vencido" | "Inativo";

export function hojeISO(agora: Date = new Date()): string {
  return hojeLocalISO(agora);
}

/** Situação mostrada: "Revisar até" vencido torna o POP aprovado "Vencido". */
export function situacaoDoPop(pop: ProcedimentoOperacionalPadronizado | undefined, hoje: string = hojeISO()): SituacaoDoPop {
  if (!pop) return "Falta criar";
  if (pop.status === "Inativo") return "Inativo";
  if (pop.status === "Aprovado") return pop.proximaRevisao && pop.proximaRevisao < hoje ? "Vencido" : "Aprovado";
  if (pop.status === "Aguardando aprovação" || pop.status === "Em revisão") return "Aguardando aprovação";
  return "Rascunho";
}

export type LinhaDoConjunto = {
  definicao: DefinicaoPopDoConjunto;
  pop?: ProcedimentoOperacionalPadronizado;
  situacao: SituacaoDoPop;
  versao: string;
  responsavel: string;
  /** "4.11.4 (a)" e, para a norma estadual, "Anexo II, 13.7 (a)". */
  itemDaNorma: string;
};

export function itemDaListaDeNormas(definicao: DefinicaoPopDoConjunto, normas: Norma[]): string {
  const partes = normas
    .map((norma) => {
      const item = norma.itens["lista-de-pops"];
      if (!item) return "";
      return `${item.rotulo.replace(/\s*\(a–d\)/, "")} (${definicao.letra})`;
    })
    .filter(Boolean);
  return partes.join(" · ");
}

export function linhasDoConjunto(
  empresa: Pick<Empresa, "normasAplicadas" | "pops">,
  hoje: string = hojeISO(),
  catalogo: Norma[] = CATALOGO_DE_NORMAS
): { linhas: LinhaDoConjunto[]; resumo: { total: number; aprovados: number; rascunho: number; faltam: number } } {
  const normas = normasDaEmpresa(empresa, catalogo);
  const pops = empresa.pops || [];
  const linhas = conjuntoDaEmpresa(empresa, catalogo).map((definicao): LinhaDoConjunto => {
    const pop = popDoConjunto(pops, definicao);
    return {
      definicao,
      pop,
      situacao: situacaoDoPop(pop, hoje),
      versao: pop?.versao || "—",
      responsavel: pop?.responsavel || pop?.conteudo?.responsavelExecucao?.nome || "—",
      itemDaNorma: itemDaListaDeNormas(definicao, normas),
    };
  });
  return {
    linhas,
    resumo: {
      total: linhas.length,
      aprovados: linhas.filter((linha) => linha.situacao === "Aprovado").length,
      rascunho: linhas.filter((linha) => linha.situacao === "Rascunho" || linha.situacao === "Aguardando aprovação").length,
      faltam: linhas.filter((linha) => linha.situacao === "Falta criar").length,
    },
  };
}

// ===== Texto-base: estrutura e orientações com citação; passos em branco =====

export function referenciasDoTextoBase(definicao: DefinicaoPopDoConjunto, normas: Norma[]): ReferenciaPop[] {
  const referencias: ReferenciaPop[] = [];
  for (const norma of normas) {
    for (const id of definicao.itens) {
      const item = norma.itens[id];
      if (!item) continue;
      referencias.push({ norma: norma.nome, item: item.rotulo, orientacao: item.orientacao, ...(item.conferir ? { conferir: true } : {}) });
    }
  }
  return referencias;
}

export function conteudoEmBranco(definicao: DefinicaoPopDoConjunto, referencias: ReferenciaPop[] = []): ConteudoPop {
  return {
    objetivo: "",
    campoAplicacao: "",
    referencias,
    responsavelExecucao: { nome: "", cargo: "" },
    frequencia: "",
    passos: [],
    acaoCorretiva: "",
    registroProva: "",
    ...(definicao.bloco === "higienizacao"
      ? { higienizacao: { superficie: "", metodo: "", produto: "", principioAtivo: "", concentracao: "", tempoContato: "", temperatura: "" } }
      : {}),
    ...(definicao.bloco === "pragas" ? { pragas: { preventivas: "", corretivas: "", comprovanteEmpresa: "" } } : {}),
    ...(definicao.bloco === "manipuladores"
      ? {
          manipuladores: {
            lavagemMaosEtapas: "",
            lavagemMaosFrequencia: "",
            lesoesSintomas: "",
            examesApto: "" as const,
            examesValidade: "",
            examesPeriodicidade: "",
            capacitacaoCargaHoraria: "",
            capacitacaoConteudo: "",
            capacitacaoFrequencia: "",
          },
        }
      : {}),
  };
}

/** Cria o POP com a estrutura e as orientações do catálogo, status Rascunho e nenhum passo redigido. */
export function criarPopDoTextoBase(
  definicao: DefinicaoPopDoConjunto,
  empresa: Pick<Empresa, "normasAplicadas" | "pops">,
  id: string,
  catalogo: Norma[] = CATALOGO_DE_NORMAS
): ProcedimentoOperacionalPadronizado {
  const normas = normasDaEmpresa(empresa, catalogo);
  const codigoEmUso = (empresa.pops || []).some((pop) => chave(pop.codigo) === chave(definicao.codigo));
  const referencias = referenciasDoTextoBase(definicao, normas);
  return {
    id,
    codigo: codigoEmUso ? "" : definicao.codigo,
    titulo: definicao.titulo,
    versao: "1.0",
    status: "Rascunho",
    programaRelacionado: definicao.programaRelacionado,
    responsavel: "",
    proximaRevisao: "",
    catalogoId: definicao.catalogoId,
    origemTextoBase: {
      normas: normas.map((norma) => norma.id),
      // Uma frase por norma: "RDC 216/2004 (ANVISA): 4.11.2, 4.11.4".
      itens: normas
        .map((norma) => {
          const doNorma = Array.from(new Set(referencias.filter((ref) => ref.norma === norma.nome).map((ref) => ref.item)));
          return doNorma.length ? `${norma.nome}: ${doNorma.join(", ")}` : "";
        })
        .filter(Boolean),
      versaoCatalogo: Object.fromEntries(normas.map((norma) => [norma.id, norma.versaoCatalogo])),
    },
    conteudo: conteudoEmBranco(definicao, referencias),
  };
}

/** Cria só os POPs do conjunto que ainda não existem (nunca altera um POP existente). */
export function criarPopsFaltantesDoConjunto(
  empresa: Pick<Empresa, "normasAplicadas" | "pops">,
  gerarId: () => string,
  apenas?: string,
  catalogo: Norma[] = CATALOGO_DE_NORMAS
): { pops: ProcedimentoOperacionalPadronizado[]; criados: number } {
  let pops = empresa.pops || [];
  let criados = 0;
  for (const definicao of conjuntoDaEmpresa(empresa, catalogo)) {
    if (apenas && definicao.catalogoId !== apenas) continue;
    if (popDoConjunto(pops, definicao)) continue;
    pops = [...pops, criarPopDoTextoBase(definicao, { normasAplicadas: empresa.normasAplicadas, pops }, gerarId(), catalogo)];
    criados += 1;
  }
  return { pops, criados };
}

/** "Este texto veio do texto-base e cita RDC 216/2004 4.11.2, ... Revise, ajuste à rotina da empresa e envie para aprovação do responsável." */
export function textoDaFaixaDoTextoBase(pop: ProcedimentoOperacionalPadronizado): string {
  const itens = pop.origemTextoBase?.itens || [];
  const citados = itens.length ? itens.join("; ") : "as normas aplicadas";
  return `Este texto veio do texto-base e cita ${citados}. Revise, ajuste à rotina da empresa e envie para aprovação do responsável.`;
}

// ===== Vínculo NC → POP a partir do conjunto da empresa =====

export function popSugeridoParaNcDoConjunto(nc: { categoria: string }, definicoes: DefinicaoPopDoConjunto[]): DefinicaoPopDoConjunto | null {
  return definicoes.find((definicao) => definicao.categoriasDeNc.some((categoria) => chave(categoria) === chave(nc.categoria))) || null;
}

// ===== Enviar para aprovação, aprovar e versões =====

export function faltasParaEnviar(pop: ProcedimentoOperacionalPadronizado): string[] {
  const conteudo = pop.conteudo || {};
  const faltas: string[] = [];
  if (!(conteudo.passos || []).some((passo) => passo.texto.trim())) faltas.push("Escreva ao menos um passo.");
  if ((conteudo.passos || []).some((passo) => !passo.texto.trim()) && (conteudo.passos || []).some((passo) => passo.texto.trim())) faltas.push(MENSAGEM_PASSO_EM_BRANCO);
  if (!(conteudo.frequencia || "").trim()) faltas.push("Informe a frequência.");
  if (!(conteudo.responsavelExecucao?.nome || "").trim() || !(conteudo.responsavelExecucao?.cargo || "").trim()) {
    faltas.push("Informe o responsável pela execução, com nome e cargo.");
  }
  return faltas;
}

export function enviarParaAprovacao(pop: ProcedimentoOperacionalPadronizado): ProcedimentoOperacionalPadronizado {
  if (pop.status !== "Rascunho") throw new Error("Só um rascunho pode ser enviado para aprovação.");
  const faltas = faltasParaEnviar(pop);
  if (faltas.length) throw new Error(faltas[0]);
  return { ...pop, status: "Aguardando aprovação" };
}

export const MENSAGEM_PASSO_EM_BRANCO = "Há passo em branco: escreva o texto ou remova o passo.";

/** Passos com texto, na ordem (a numeração é pela posição, sem buracos). Passo em branco não vai para aprovação. */
export function limparPassosEmBranco(passos: PassoPop[] | undefined): PassoPop[] {
  return (passos || []).filter((passo) => passo.texto.trim());
}

/** Mais de um passo em branco vira um só (sobra no máximo o que a pessoa está escrevendo). */
export function juntarPassosEmBrancoRepetidos(passos: PassoPop[] | undefined): PassoPop[] {
  let jaTemBranco = false;
  return (passos || []).filter((passo) => {
    if (passo.texto.trim()) return true;
    if (jaTemBranco) return false;
    jaTemBranco = true;
    return true;
  });
}

/** Tira vírgula, ponto e vírgula e espaços do começo de um cargo (", Nutricionista" vira "Nutricionista"). */
export function limparCargo(texto: string | undefined): string {
  return (texto || "").replace(/^[\s,;:.\-–]+/, "").replace(/\s+/g, " ").trim();
}

/** Só a pessoa cadastrada como responsável do estabelecimento (e vinculada em Acessos) aprova. */
export function podeAprovarPop(
  usuario: Pick<UsuarioSistema, "id" | "status" | "validoAte" | "acessoEncerradoEm"> | null | undefined,
  empresa: Pick<Empresa, "responsavelEstabelecimento"> | undefined
): boolean {
  if (!usuario || usuario.status !== "Ativo" || !acessoVigente(usuario)) return false;
  const vinculado = empresa?.responsavelEstabelecimento?.usuarioId;
  return !!vinculado && vinculado === usuario.id;
}

export function motivoParaNaoAprovar(
  usuario: Pick<UsuarioSistema, "id" | "status" | "validoAte" | "acessoEncerradoEm"> | null | undefined,
  empresa: Pick<Empresa, "responsavelEstabelecimento"> | undefined
): string {
  if (!empresa?.responsavelEstabelecimento?.usuarioId) return "Vincule o responsável do estabelecimento a uma pessoa de Acessos para poder aprovar.";
  if (!podeAprovarPop(usuario, empresa)) return "Só o responsável do estabelecimento aprova e assina o POP.";
  return "";
}

/** "1.0" → "1.1". */
export function proximaVersao(versao: string): string {
  const m = /^(\d+)\.(\d+)$/.exec((versao || "").trim());
  return m ? `${m[1]}.${Number(m[2]) + 1}` : "1.1";
}

export function versaoDoCatalogoUsada(pop: ProcedimentoOperacionalPadronizado, empresa: Pick<Empresa, "normasAplicadas">, catalogo: Norma[] = CATALOGO_DE_NORMAS): Record<string, string> {
  const ids = pop.origemTextoBase?.normas?.length ? pop.origemTextoBase.normas : normasDaEmpresa(empresa, catalogo).map((norma) => norma.id);
  return Object.fromEntries(ids.map((id) => [id, catalogo.find((norma) => norma.id === id)?.versaoCatalogo || ""]).filter(([, versao]) => versao));
}

/** "Aprovar e assinar": grava nome, cargo, data e versão da PESSOA responsável; guarda a versão aprovada. */
export function aprovarPop(
  pop: ProcedimentoOperacionalPadronizado,
  usuario: Pick<UsuarioSistema, "id" | "nome" | "status" | "validoAte" | "acessoEncerradoEm">,
  empresa: Pick<Empresa, "responsavelEstabelecimento" | "normasAplicadas">,
  agora: string,
  catalogo: Norma[] = CATALOGO_DE_NORMAS
): ProcedimentoOperacionalPadronizado {
  const motivo = motivoParaNaoAprovar(usuario, empresa);
  if (motivo) throw new Error(motivo);
  if (pop.status !== "Aguardando aprovação" && pop.status !== "Em revisão") throw new Error("O POP precisa estar aguardando aprovação.");
  const aprovacao: AprovacaoPop = {
    nome: usuario.nome,
    cargo: limparTextoDePessoa(empresa.responsavelEstabelecimento?.cargo),
    usuarioId: usuario.id,
    em: agora,
    versao: pop.versao,
  };
  const catalogoUsado = versaoDoCatalogoUsada(pop, empresa, catalogo);
  const snapshot: VersaoPop = {
    versao: pop.versao,
    status: "Aprovado",
    criadaEm: agora,
    conteudo: pop.conteudo,
    aprovacao,
    revisarAte: pop.proximaRevisao || undefined,
    versaoCatalogo: catalogoUsado,
    ...(pop.motivoDaVersao?.trim() ? { motivo: pop.motivoDaVersao.trim() } : {}),
  };
  return {
    ...pop,
    status: "Aprovado",
    aprovacao,
    versaoCatalogoAprovada: catalogoUsado,
    versoes: [...(pop.versoes || []).filter((versao) => versao.versao !== pop.versao), snapshot],
  };
}

/** Editar um POP aprovado cria uma nova versão em Rascunho; as aprovadas ficam guardadas em `versoes`. */
export function iniciarNovaVersao(pop: ProcedimentoOperacionalPadronizado): ProcedimentoOperacionalPadronizado {
  if (pop.status !== "Aprovado") throw new Error("Só um POP aprovado gera uma nova versão.");
  const guardadas = pop.versoes || [];
  const jaGuardada = guardadas.some((versao) => versao.versao === pop.versao);
  const snapshot: VersaoPop[] = jaGuardada
    ? guardadas
    : [...guardadas, { versao: pop.versao, status: "Aprovado", criadaEm: pop.aprovacao?.em || "", conteudo: pop.conteudo, aprovacao: pop.aprovacao, revisarAte: pop.proximaRevisao || undefined, versaoCatalogo: pop.versaoCatalogoAprovada }];
  // `motivoDaVersao` que chega junto é o motivo da versão nova (digitado ao pedir a edição) e fica nela.
  const { aprovacao: _aprovacao, versaoCatalogoAprovada: _usada, ...resto } = pop;
  return { ...resto, versao: proximaVersao(pop.versao), status: "Rascunho", versoes: snapshot };
}

// ===== Comparar versões (texto simples) =====

export function linhasDoConteudo(conteudo: ConteudoPop | undefined): { campo: string; valor: string }[] {
  const c = conteudo || {};
  const linhas: { campo: string; valor: string }[] = [
    { campo: "Objetivo", valor: c.objetivo || "" },
    { campo: "Campo de aplicação", valor: c.campoAplicacao || "" },
    { campo: "Responsável pela execução", valor: nomeECargo(c.responsavelExecucao?.nome, c.responsavelExecucao?.cargo) },
    { campo: "Frequência", valor: c.frequencia || "" },
    ...(c.passos || []).map((passo, indice) => ({ campo: `Passo ${indice + 1}`, valor: passo.texto })),
    { campo: "Ação corretiva", valor: c.acaoCorretiva || "" },
    { campo: "Registro que prova a execução", valor: c.registroProva || "" },
  ];
  if (c.higienizacao) {
    const h = c.higienizacao;
    linhas.push(
      { campo: "Superfície", valor: h.superficie },
      { campo: "Método", valor: h.metodo },
      { campo: "Produto", valor: h.produto },
      { campo: "Princípio ativo", valor: h.principioAtivo },
      { campo: "Concentração", valor: h.concentracao },
      { campo: "Tempo de contato", valor: h.tempoContato },
      { campo: "Temperatura", valor: h.temperatura }
    );
  }
  if (c.pragas) linhas.push({ campo: "Medidas preventivas", valor: c.pragas.preventivas }, { campo: "Medidas corretivas", valor: c.pragas.corretivas }, { campo: "Comprovante da empresa especializada", valor: c.pragas.comprovanteEmpresa });
  if (c.manipuladores) {
    const m = c.manipuladores;
    linhas.push(
      { campo: "Lavagem das mãos: etapas", valor: m.lavagemMaosEtapas },
      { campo: "Lavagem das mãos: frequência", valor: m.lavagemMaosFrequencia },
      { campo: "Lesões e sintomas", valor: m.lesoesSintomas },
      { campo: "Exames: situação", valor: m.examesApto === "apto" ? "Apto" : m.examesApto === "nao-apto" ? "Não apto" : "" },
      { campo: "Exames: validade", valor: m.examesValidade },
      { campo: "Exames: periodicidade", valor: m.examesPeriodicidade },
      { campo: "Capacitação: carga horária", valor: m.capacitacaoCargaHoraria },
      { campo: "Capacitação: conteúdo", valor: m.capacitacaoConteudo },
      { campo: "Capacitação: frequência", valor: m.capacitacaoFrequencia }
    );
  }
  return linhas;
}

export type LinhaComparada = { campo: string; a: string; b: string; igual: boolean };

export function compararVersoes(a: ConteudoPop | undefined, b: ConteudoPop | undefined): LinhaComparada[] {
  const la = linhasDoConteudo(a);
  const lb = linhasDoConteudo(b);
  const campos = Array.from(new Set([...la.map((l) => l.campo), ...lb.map((l) => l.campo)]));
  return campos
    .map((campo) => {
      const va = la.find((l) => l.campo === campo)?.valor || "";
      const vb = lb.find((l) => l.campo === campo)?.valor || "";
      return { campo, a: va, b: vb, igual: va === vb };
    })
    .filter((linha) => linha.a || linha.b);
}

// ===== Mudança de norma no catálogo (2-F) =====

export const MENSAGEM_NORMA_ALTERADA = "Norma citada neste POP foi alterada. Confira o texto e aprove de novo.";

/** Aviso do Início para o RT: quantos POPs aprovados citam uma norma que mudou no catálogo. */
export function avisoDePopsComNormaAlterada(pops: ProcedimentoOperacionalPadronizado[], catalogo: Norma[] = CATALOGO_DE_NORMAS): string | null {
  const n = popsComNormaAlterada(pops, catalogo).length;
  if (n === 0) return null;
  return `${n} ${n === 1 ? "POP tem" : "POPs têm"} a norma citada alterada. Confira o texto e aprove de novo.`;
}

/** O POP aprovado cita uma norma cuja versão no catálogo mudou depois da aprovação. */
export function popPrecisaRevisarPorNorma(pop: ProcedimentoOperacionalPadronizado, catalogo: Norma[] = CATALOGO_DE_NORMAS): boolean {
  if (pop.status !== "Aprovado" || !pop.versaoCatalogoAprovada) return false;
  return Object.entries(pop.versaoCatalogoAprovada).some(([normaId, versao]) => {
    const atual = catalogo.find((norma) => norma.id === normaId);
    return !!atual && atual.versaoCatalogo !== versao;
  });
}

export function popsComNormaAlterada(pops: ProcedimentoOperacionalPadronizado[], catalogo: Norma[] = CATALOGO_DE_NORMAS): ProcedimentoOperacionalPadronizado[] {
  return pops.filter((pop) => !pop.arquivado && popPrecisaRevisarPorNorma(pop, catalogo));
}

// ===== Servidor: quem pode aprovar e histórico =====

type EmpresasPorId = Record<string, Empresa>;

const ID_DE_AUDITORIA = (empresaId: string, popId: string, versao: string) => `pop-aprovado:${empresaId}:${popId}:${versao}`;

function mesmaAprovacao(a: AprovacaoPop | undefined, b: AprovacaoPop | undefined): boolean {
  return !!a && !!b && a.usuarioId === b.usuarioId && a.em === b.em && a.versao === b.versao;
}

/**
 * Confere as aprovações de POP que chegam numa gravação. Uma aprovação só vale se vier da pessoa cadastrada como
 * responsável do estabelecimento (lida do estado já gravado, nunca do que chegou) e se o POP estava aguardando
 * aprovação. O que não vale volta ao que estava gravado. As versões aprovadas nunca somem. Cada aprovação válida
 * gera um registro para o Histórico de acessos (feito aqui, no servidor, porque quem aprova nem sempre grava a auditoria).
 */
export function validarAprovacoesDePop(
  atuais: EmpresasPorId,
  recebidas: EmpresasPorId,
  usuario: Pick<UsuarioSistema, "id" | "nome" | "status" | "validoAte" | "acessoEncerradoEm">,
  agora: string
): { empresas: EmpresasPorId; registros: Omit<RegistroAuditoria, "id">[] } {
  const registros: Omit<RegistroAuditoria, "id">[] = [];
  const resultado: EmpresasPorId = { ...recebidas };
  for (const [empresaId, recebida] of Object.entries(recebidas)) {
    const atual = atuais[empresaId];
    const popsRecebidos = recebida.pops || [];
    if (!atual && popsRecebidos.every((pop) => pop.status !== "Aprovado")) continue;
    const popsAtuais = atual?.pops || [];
    const podeAprovar = podeAprovarPop(usuario, atual);
    const corrigidos = popsRecebidos.map((pop) => {
      const anterior = popsAtuais.find((item) => item.id === pop.id);
      let final = pop;
      if (pop.status === "Aprovado") {
        const igualAoGravado = anterior?.status === "Aprovado" && anterior.versao === pop.versao;
        if (igualAoGravado) {
          // POP já aprovado: conteúdo, versão e assinatura não mudam por aqui (mudar o texto exige nova versão).
          final = { ...pop, versao: anterior.versao, conteudo: anterior.conteudo, aprovacao: anterior.aprovacao, versaoCatalogoAprovada: anterior.versaoCatalogoAprovada };
        } else {
          const aguardava = anterior?.status === "Aguardando aprovação" || anterior?.status === "Em revisão";
          const valida = podeAprovar && aguardava && anterior?.versao === pop.versao && pop.aprovacao?.usuarioId === usuario.id;
          if (valida) {
            registros.push({
              criadoEm: agora,
              usuarioId: usuario.id,
              usuarioNome: usuario.nome,
              acao: "pop.aprovado",
              entidade: "Empresa",
              entidadeId: ID_DE_AUDITORIA(empresaId, pop.id, pop.versao),
              empresaId,
              detalhes: `${usuario.nome} aprovou e assinou o POP ${pop.codigo ? `${pop.codigo} · ` : ""}${pop.titulo}, versão ${pop.versao}.`,
            });
          } else {
            final = anterior ? { ...anterior } : { ...pop, status: "Rascunho", aprovacao: undefined, versaoCatalogoAprovada: undefined };
          }
        }
      } else if (anterior?.status === "Aprovado" && anterior.versao === pop.versao && mesmaAprovacao(pop.aprovacao, anterior.aprovacao)) {
        // Voltou de Aprovado sem trocar de versão (ex.: arquivar/inativar): mantém a assinatura e o conteúdo gravados.
        final = { ...pop, conteudo: anterior.conteudo };
      }
      // As versões aprovadas já guardadas nunca desaparecem.
      const guardadas = anterior?.versoes || [];
      if (guardadas.length) {
        const nomes = new Set((final.versoes || []).map((versao) => versao.versao));
        final = { ...final, versoes: [...guardadas.filter((versao) => !nomes.has(versao.versao)), ...(final.versoes || [])] };
      }
      return final;
    });
    // Responsável do estabelecimento: só mudar o vínculo com a pessoa quem já podia (Administrador) — ver mesclarEstadoPorUsuario.
    resultado[empresaId] = { ...recebida, pops: corrigidos };
  }
  return { empresas: resultado, registros };
}

// ===== POP vigente (leitura no checklist e na Correção) =====

export type PopVigente = {
  versao: string;
  conteudo: ConteudoPop | undefined;
  aprovacao?: AprovacaoPop;
};

/** Versão vigente: a aprovada em uso; se o POP está em nova versão (rascunho), vale a última aprovada guardada. Rascunho nunca é vigente. */
export function popVigente(pop: ProcedimentoOperacionalPadronizado | undefined): PopVigente | null {
  if (!pop || pop.arquivado || pop.status === "Inativo") return null;
  if (pop.status === "Aprovado") return { versao: pop.versao, conteudo: pop.conteudo, aprovacao: pop.aprovacao };
  const aprovadas = (pop.versoes || []).filter((versao) => versao.status === "Aprovado");
  const ultima = aprovadas[aprovadas.length - 1];
  return ultima ? { versao: ultima.versao, conteudo: ultima.conteudo, aprovacao: ultima.aprovacao } : null;
}

/**
 * O POP como quem só lê deve vê-lo: a versão vigente aprovada, mesmo com um rascunho de nova versão em andamento
 * (o conteúdo do rascunho não sai). Sem versão aprovada, devolve null.
 */
export function popComoVigente(pop: ProcedimentoOperacionalPadronizado): ProcedimentoOperacionalPadronizado | null {
  if (pop.arquivado || pop.status === "Inativo") return null;
  if (pop.status === "Aprovado") return pop;
  const aprovadas = (pop.versoes || []).filter((versao) => versao.status === "Aprovado");
  const ultima = aprovadas[aprovadas.length - 1];
  if (!ultima) return null;
  return {
    ...pop,
    versao: ultima.versao,
    status: "Aprovado",
    conteudo: ultima.conteudo,
    aprovacao: ultima.aprovacao,
    proximaRevisao: ultima.revisarAte || "",
    versaoCatalogoAprovada: ultima.versaoCatalogo,
    motivoDaVersao: ultima.motivo,
    versoes: aprovadas,
  };
}

/** Só quem tem uma versão aprovada guardada pode descartar o rascunho (volta à aprovada); o primeiro rascunho se arquiva ou exclui. */
export function podeDescartarRascunho(pop: ProcedimentoOperacionalPadronizado): boolean {
  return pop.status === "Rascunho" && (pop.versoes || []).some((versao) => versao.status === "Aprovado");
}

/** Descarta o rascunho da nova versão: o POP volta a ser a última versão aprovada, que nunca deixou de valer. */
export function descartarRascunho(pop: ProcedimentoOperacionalPadronizado): ProcedimentoOperacionalPadronizado {
  if (!podeDescartarRascunho(pop)) throw new Error("Só dá para descartar o rascunho de uma nova versão de um POP já aprovado.");
  const aprovadas = (pop.versoes || []).filter((versao) => versao.status === "Aprovado");
  const ultima = aprovadas[aprovadas.length - 1];
  const { aprovacao: _a, versaoCatalogoAprovada: _v, motivoDaVersao: _m, ...resto } = pop;
  return {
    ...resto,
    versao: ultima.versao,
    status: "Aprovado",
    conteudo: ultima.conteudo,
    aprovacao: ultima.aprovacao,
    proximaRevisao: ultima.revisarAte || "",
    versaoCatalogoAprovada: ultima.versaoCatalogo,
    ...(ultima.motivo ? { motivoDaVersao: ultima.motivo } : {}),
    versoes: (pop.versoes || []).filter((versao) => versao.status === "Aprovado"),
  };
}

/** Texto da ação corretiva cadastrada no POP vigente, ou vazio quando não há. */
export function acaoCorretivaDoPopVigente(pop: ProcedimentoOperacionalPadronizado | undefined): string {
  return (popVigente(pop)?.conteudo?.acaoCorretiva || "").trim();
}
