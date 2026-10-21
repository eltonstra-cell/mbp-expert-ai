// Aba Documento do POP: seções do editor (com marcador de preenchida) e a folha formatada (leitura e pré-visualização).
import type { ConteudoPop, ProcedimentoOperacionalPadronizado } from "../types/index.ts";
import { formatarData } from "./dataLocal.ts";
import { nomeECargo } from "./nomeCargo.ts";
import { linhasDoConteudo, type DefinicaoPopDoConjunto } from "./popsNorma.ts";

export type IdDaSecao = "identificacao" | "objetivo" | "referencias" | "responsavel" | "passos" | "acao" | "extra" | "extra2";

export type SecaoDoEditor = { id: IdDaSecao; titulo: string; preenchida: boolean };

const escrito = (valor: string | undefined | null) => Boolean((valor || "").trim());

/** Seções na ordem do editor. "Preenchida" só olha os campos que a pessoa escreve; Referências vêm da norma. */
export function secoesDoEditor(pop: Pick<ProcedimentoOperacionalPadronizado, "codigo" | "titulo" | "conteudo">, definicao?: Pick<DefinicaoPopDoConjunto, "bloco" | "eReservatorio">): SecaoDoEditor[] {
  const c: ConteudoPop = pop.conteudo || {};
  const secoes: SecaoDoEditor[] = [
    { id: "identificacao", titulo: "Identificação", preenchida: escrito(pop.titulo) },
    { id: "objetivo", titulo: "Objetivo e aplicação", preenchida: escrito(c.objetivo) },
    { id: "referencias", titulo: "Referências", preenchida: true },
    { id: "responsavel", titulo: "Responsável e frequência", preenchida: escrito(c.responsavelExecucao?.nome) && escrito(c.responsavelExecucao?.cargo) && escrito(c.frequencia) },
    { id: "passos", titulo: "Passos", preenchida: (c.passos || []).some((passo) => escrito(passo.texto)) && (c.passos || []).every((passo) => escrito(passo.texto)) },
    { id: "acao", titulo: "Ação corretiva e registro", preenchida: escrito(c.acaoCorretiva) },
  ];
  if (definicao?.bloco === "higienizacao" && c.higienizacao) {
    secoes.push({ id: "extra", titulo: definicao.eReservatorio ? "Higienização do reservatório" : "Higienização das instalações", preenchida: escrito(c.higienizacao.superficie) && escrito(c.higienizacao.metodo) && escrito(c.higienizacao.produto) });
  }
  if (definicao?.bloco === "pragas" && c.pragas) {
    secoes.push({ id: "extra", titulo: "Controle de pragas", preenchida: escrito(c.pragas.preventivas) && escrito(c.pragas.corretivas) });
  }
  if (definicao?.bloco === "manipuladores" && c.manipuladores) {
    secoes.push(
      { id: "extra", titulo: "Higiene e saúde", preenchida: escrito(c.manipuladores.lavagemMaosEtapas) && escrito(c.manipuladores.lavagemMaosFrequencia) && escrito(c.manipuladores.lesoesSintomas) },
      { id: "extra2", titulo: "Exames e capacitação", preenchida: Boolean(c.manipuladores.examesApto) && escrito(c.manipuladores.capacitacaoConteudo) }
    );
  }
  return secoes;
}

/** "5 de 7 preenchidas" */
export function textoDasSecoes(secoes: Pick<SecaoDoEditor, "preenchida">[]): string {
  const feitas = secoes.filter((secao) => secao.preenchida).length;
  return `${feitas} de ${secoes.length} ${feitas === 1 ? "preenchida" : "preenchidas"}`;
}

const SEM_RUIDO = /\s*\((?:item\s+)?a\s+conferir\)\s*/gi;

/** Item de norma sem o ruído do catálogo: "Anexo II (item a conferir)" vira "Anexo II". */
export function itemLimpo(item: string): string {
  return item.replace(SEM_RUIDO, " ").replace(/\s+/g, " ").trim();
}

/**
 * Referências da folha em poucas linhas: uma por norma, itens sem repetição, cada linha terminando em "conferir".
 * Só limpa e agrupa o que já existe no POP (nenhum item de norma é acrescentado). Passando de duas normas, as demais entram na segunda linha.
 */
export function referenciasCompactas(referencias: { norma: string; item: string }[] | undefined): string[] {
  const porNorma = new Map<string, string[]>();
  for (const ref of referencias || []) {
    const norma = ref.norma.trim();
    if (!norma) continue;
    const itens = porNorma.get(norma) || [];
    const item = itemLimpo(ref.item || "");
    if (item && !itens.some((existente) => existente.toLocaleLowerCase("pt-BR") === item.toLocaleLowerCase("pt-BR"))) itens.push(item);
    porNorma.set(norma, itens);
  }
  const partes = [...porNorma.entries()].map(([norma, itens]) => (itens.length ? `${norma} (${itens.join("; ")})` : norma));
  if (partes.length === 0) return [];
  const linhas = partes.length <= 2 ? partes : [partes[0], partes.slice(1).join(" · ")];
  return linhas.map((linha) => `${linha} · conferir`);
}

export type BlocoDaFolha = { titulo: string; tipo: "texto" | "passos" | "lista"; linhas: string[] };

export type FolhaDoPop = {
  esquerda: string;
  direita: string;
  titulo: string;
  /** "Aprovada por Elton, Nutricionista RT, em 21/10/2026" ou "Rascunho · v1.2". */
  situacao: string;
  blocos: BlocoDaFolha[];
};

const CAMPOS_BASE = new Set(["Objetivo", "Campo de aplicação", "Responsável pela execução", "Frequência", "Ação corretiva", "Registro que prova a execução"]);

/** A folha do POP como a pessoa vai ler. Com `marcarBranco`, passo sem texto aparece como "(em branco)" (pré-visualização). */
export function folhaDoPop(
  pop: Pick<ProcedimentoOperacionalPadronizado, "codigo" | "titulo" | "versao" | "status" | "conteudo" | "aprovacao">,
  empresa: { nome?: string; cnpj?: string },
  opcoes: { marcarBranco?: boolean } = {}
): FolhaDoPop {
  const c: ConteudoPop = pop.conteudo || {};
  const blocos: BlocoDaFolha[] = [];
  const objetivo = [c.objetivo, c.campoAplicacao].filter((texto): texto is string => escrito(texto)).map((texto) => texto.trim());
  if (objetivo.length) blocos.push({ titulo: "Objetivo", tipo: "texto", linhas: objetivo });
  const referencias = referenciasCompactas(c.referencias);
  if (referencias.length) blocos.push({ titulo: "Referências", tipo: "lista", linhas: referencias });
  const responsavel = [nomeECargo(c.responsavelExecucao?.nome, c.responsavelExecucao?.cargo), (c.frequencia || "").trim()].filter(Boolean).join(" · ");
  if (responsavel) blocos.push({ titulo: "Responsável e frequência", tipo: "texto", linhas: [responsavel] });
  const passos = (c.passos || []).map((passo) => passo.texto.trim()).map((texto) => texto || (opcoes.marcarBranco ? "(em branco)" : ""));
  const passosVisiveis = opcoes.marcarBranco ? passos : passos.filter(Boolean);
  if (passosVisiveis.length) blocos.push({ titulo: "Passos", tipo: "passos", linhas: passosVisiveis });
  if (escrito(c.acaoCorretiva)) blocos.push({ titulo: "Ação corretiva", tipo: "texto", linhas: [(c.acaoCorretiva || "").trim()] });
  if (escrito(c.registroProva)) blocos.push({ titulo: "Registro que prova a execução", tipo: "texto", linhas: [(c.registroProva || "").trim()] });
  const extras = linhasDoConteudo(c)
    .filter((linha) => !CAMPOS_BASE.has(linha.campo) && !/^Passo \d+$/.test(linha.campo) && escrito(linha.valor))
    .map((linha) => `${linha.campo}: ${linha.valor.trim()}`);
  if (extras.length) blocos.push({ titulo: "Detalhes do POP", tipo: "lista", linhas: extras });

  const aprovacao = pop.aprovacao;
  return {
    esquerda: [empresa.nome, empresa.cnpj ? `CNPJ ${empresa.cnpj}` : ""].filter(Boolean).join(" · "),
    direita: `${pop.codigo ? `${pop.codigo} · ` : ""}versão ${pop.versao}`,
    titulo: pop.titulo || "POP",
    situacao: pop.status === "Aprovado" && aprovacao ? `Aprovada por ${nomeECargo(aprovacao.nome, aprovacao.cargo)}, em ${formatarData(aprovacao.em)}` : `${pop.status} · v${pop.versao}`,
    blocos,
  };
}
