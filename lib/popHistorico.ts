// Histórico do POP (rodada 14): a lista de versões e a atividade, só com o que o POP já guarda (versões, aprovações,
// arquivamento e inativação). Não existe registro de "enviada para aprovação" nem de "passos revisados": esses eventos não aparecem.
import type { ProcedimentoOperacionalPadronizado, VersaoPop } from "../types/index.ts";

/** Quem vê o nome de quem aprovou, arquivou ou inativou: perfis de gestão e o Fiscal. Os demais (Executor de campo) veem "Responsável". */
export function veNomesNoHistorico(perfil?: string | null): boolean {
  return perfil === "Administrador" || perfil === "Consultor/RT" || perfil === "Cliente Gestor" || perfil === "Gerente" || perfil === "Fiscal";
}

const ROTULO_SEM_NOME = "Responsável";
const nomeVisivel = (nome: string | undefined, ocultar?: boolean) => (ocultar ? (nome ? ROTULO_SEM_NOME : undefined) : nome);

export type EstadoDaVersao = "vigente" | "arquivada" | "rascunho" | "aguardando";

export type LinhaDeVersao = {
  versao: string;
  estado: EstadoDaVersao;
  rotulo: string;
  aprovadaPor?: string;
  aprovadaEm?: string;
  motivo?: string;
};

export type TomDaAtividade = "ok" | "neutro";

export type EventoDeAtividade = { chave: string; em: string; texto: string; tom: TomDaAtividade };

/** Versões da mais nova para a mais antiga; a versão em edição entra se ainda não foi guardada. */
export function versoesDoHistorico(pop: Pick<ProcedimentoOperacionalPadronizado, "versao" | "status" | "aprovacao" | "versoes" | "motivoDaVersao">, opcoes: { ocultarNomes?: boolean } = {}): LinhaDeVersao[] {
  const guardadas: VersaoPop[] = pop.versoes || [];
  const atual: VersaoPop = { versao: pop.versao, status: pop.status, criadaEm: "", aprovacao: pop.aprovacao, motivo: pop.motivoDaVersao };
  const todas = guardadas.some((versao) => versao.versao === pop.versao) ? guardadas : [...guardadas, atual];
  return todas
    .map((versao): LinhaDeVersao => {
      const ehAtual = versao.versao === pop.versao;
      const estado: EstadoDaVersao =
        ehAtual && pop.status === "Aprovado" ? "vigente" : ehAtual && (pop.status === "Aguardando aprovação" || pop.status === "Em revisão") ? "aguardando" : ehAtual && pop.status === "Inativo" ? "arquivada" : versao.status === "Rascunho" ? "rascunho" : "arquivada";
      const rotulo = estado === "vigente" ? "Vigente" : estado === "aguardando" ? "Aguardando aprovação" : estado === "rascunho" ? "Rascunho" : "Arquivada";
      return { versao: versao.versao, estado, rotulo, aprovadaPor: nomeVisivel(versao.aprovacao?.nome, opcoes.ocultarNomes), aprovadaEm: versao.aprovacao?.em, motivo: versao.motivo?.trim() || undefined };
    })
    .reverse();
}

/** Linha do tempo da mais recente para a mais antiga. Eventos sem data ficam de fora. */
export function atividadeDoPop(pop: Pick<ProcedimentoOperacionalPadronizado, "versao" | "status" | "aprovacao" | "versoes" | "arquivamento" | "inativacao">, opcoes: { ocultarNomes?: boolean } = {}): EventoDeAtividade[] {
  const eventos: EventoDeAtividade[] = [];
  const guardadas = pop.versoes || [];
  const todas = guardadas.some((versao) => versao.versao === pop.versao) ? guardadas : [...guardadas, { versao: pop.versao, status: pop.status, criadaEm: "", aprovacao: pop.aprovacao } as VersaoPop];
  for (const versao of todas) {
    if (versao.criadaEm && !(versao.aprovacao && versao.criadaEm === versao.aprovacao.em)) eventos.push({ chave: `criada-${versao.versao}`, em: versao.criadaEm, texto: `Versão ${versao.versao} criada`, tom: "neutro" });
    if (versao.aprovacao?.em) eventos.push({ chave: `aprovada-${versao.versao}`, em: versao.aprovacao.em, texto: `Versão ${versao.versao} aprovada${versao.aprovacao.nome ? ` por ${nomeVisivel(versao.aprovacao.nome, opcoes.ocultarNomes)}` : ""}`, tom: "ok" });
    if (versao.substituidaEm) eventos.push({ chave: `substituida-${versao.versao}`, em: versao.substituidaEm, texto: `Versão ${versao.versao} substituída por uma versão mais nova`, tom: "neutro" });
  }
  if (pop.inativacao?.em) eventos.push({ chave: "inativado", em: pop.inativacao.em, texto: `Inativado por ${nomeVisivel(pop.inativacao.porNome, opcoes.ocultarNomes) || ROTULO_SEM_NOME}: ${pop.inativacao.motivo}`, tom: "neutro" });
  if (pop.arquivamento?.em) eventos.push({ chave: "arquivado", em: pop.arquivamento.em, texto: `Arquivado por ${nomeVisivel(pop.arquivamento.porNome, opcoes.ocultarNomes) || ROTULO_SEM_NOME}: ${pop.arquivamento.motivo}`, tom: "neutro" });
  return eventos.sort((a, b) => b.em.localeCompare(a.em));
}
