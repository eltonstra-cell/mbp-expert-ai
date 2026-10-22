// Campos de lista vindos de um modelo de POP: como aparecem na folha e como viram texto para editar (um item por linha).
import type { ConteudoPop, GrupoDeModeloPop, ItemDeModeloPop } from "../types/index.ts";
import { semSubtitulosVazios } from "./popPassos.ts";

export type ChaveDeLista = "materiais" | "epis" | "cuidadosEspeciais" | "verificacao" | "quemRealiza" | "acoesPreventivas" | "acoesNaoConformidade";

/** Seções de lista novas, na ordem em que aparecem na folha (as de Alcance, Definições e Responsabilidades têm tratamento próprio). */
export const SECOES_DE_LISTA: { chave: ChaveDeLista; titulo: string }[] = [
  { chave: "materiais", titulo: "Materiais" },
  { chave: "epis", titulo: "EPIs" },
  { chave: "cuidadosEspeciais", titulo: "Cuidados especiais" },
  { chave: "acoesNaoConformidade", titulo: "Ações em caso de não conformidade" },
  { chave: "verificacao", titulo: "Verificação" },
  { chave: "quemRealiza", titulo: "Quem realiza" },
  { chave: "acoesPreventivas", titulo: "Ações preventivas" },
];

/** Estas ficam antes dos passos na folha; as demais, depois. */
export const SECOES_ANTES_DOS_PASSOS: ChaveDeLista[] = ["materiais", "epis"];

export const textoDoItem = (item: ItemDeModeloPop): string => (typeof item === "string" ? item : item.texto);
export const subitensDoItem = (item: ItemDeModeloPop): string[] => (typeof item === "string" ? [] : item.subitens || []);
export const tabelaDoItem = (item: ItemDeModeloPop): string | undefined => (typeof item === "string" ? undefined : item.tabela);

const escrito = (texto: string | undefined | null) => Boolean((texto || "").trim());

/** Itens com algum texto (item vazio não imprime). */
export function itensEscritos(itens: ItemDeModeloPop[] | undefined): ItemDeModeloPop[] {
  return (itens || []).filter((item) => escrito(textoDoItem(item)));
}

/** Linhas de um item na folha: o texto e, depois, cada subitem com travessão. */
export function linhasDoItem(item: ItemDeModeloPop): string[] {
  return [textoDoItem(item).trim(), ...subitensDoItem(item).filter(escrito).map((sub) => `– ${sub.trim()}`)];
}

/** Um item por linha; subitem em linha própria começando com "- ". */
export function itensParaTexto(itens: ItemDeModeloPop[] | undefined): string {
  return (itens || []).flatMap((item) => [textoDoItem(item), ...subitensDoItem(item).map((sub) => `- ${sub}`)]).join("\n");
}

/** Volta do texto da edição para os itens. A citação de tabela de cada item é mantida pela posição (o texto do item pode mudar). */
export function textoParaItens(texto: string, anteriores: ItemDeModeloPop[] = []): ItemDeModeloPop[] {
  const itens: { texto: string; subitens: string[] }[] = [];
  for (const linha of texto.split("\n")) {
    const limpa = linha.trim();
    if (!limpa) continue;
    if (/^-\s+/.test(limpa) && itens.length) itens[itens.length - 1].subitens.push(limpa.replace(/^-\s+/, ""));
    else itens.push({ texto: limpa, subitens: [] });
  }
  return itens.map((item, indice) => {
    const tabela = anteriores[indice] ? tabelaDoItem(anteriores[indice]) : undefined;
    if (!item.subitens.length && !tabela) return item.texto;
    return { texto: item.texto, ...(item.subitens.length ? { subitens: item.subitens } : {}), ...(tabela ? { tabela } : {}) };
  });
}

/** Grupos com título: "# Título" abre um grupo; os itens vêm nas linhas seguintes. Grupo sem título não leva a linha "#". */
export function gruposParaTexto(grupos: GrupoDeModeloPop[] | undefined): string {
  return (grupos || [])
    .map((grupo) => [grupo.titulo ? `# ${grupo.titulo}` : "", itensParaTexto(grupo.itens)].filter((parte) => parte !== "").join("\n"))
    .join("\n");
}

export function textoParaGrupos(texto: string): GrupoDeModeloPop[] {
  const grupos: { titulo: string | null; linhas: string[] }[] = [];
  for (const linha of texto.split("\n")) {
    if (/^#\s+/.test(linha.trim())) grupos.push({ titulo: linha.trim().replace(/^#\s+/, ""), linhas: [] });
    else if (linha.trim()) {
      if (!grupos.length) grupos.push({ titulo: null, linhas: [] });
      grupos[grupos.length - 1].linhas.push(linha);
    }
  }
  return grupos.map((grupo) => ({ titulo: grupo.titulo, itens: textoParaItens(grupo.linhas.join("\n")) }));
}

export function definicoesParaTexto(definicoes: ConteudoPop["definicoes"]): string {
  return (definicoes || []).map((item) => `${item.termo}: ${item.texto}`).join("\n");
}

export function textoParaDefinicoes(texto: string): NonNullable<ConteudoPop["definicoes"]> {
  return texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) => {
      const corte = linha.indexOf(":");
      return corte > 0 ? { termo: linha.slice(0, corte).trim(), texto: linha.slice(corte + 1).trim() } : { termo: linha, texto: "" };
    });
}

/** "Sugestão do modelo" para o campo Frequência: título do grupo (quando há) e os itens, sem preencher nada sozinha. */
export function sugestaoDeFrequencia(grupos: GrupoDeModeloPop[] | undefined): string {
  return (grupos || [])
    .map((grupo) => {
      const itens = itensEscritos(grupo.itens).map((item) => textoDoItem(item).trim()).join(" ");
      return grupo.titulo && itens ? `${grupo.titulo}: ${itens}` : itens;
    })
    .filter(Boolean)
    .join(" · ");
}

// ===== Seções do modelo no editor: só as que têm conteúdo aparecem; as vazias entram por "+ Adicionar seção" =====

export type IdDaSecaoDoModelo = "alcance" | "definicoes" | "responsabilidades" | ChaveDeLista;

export const SECOES_DO_MODELO: { id: IdDaSecaoDoModelo; titulo: string }[] = [
  { id: "alcance", titulo: "Alcance" },
  { id: "definicoes", titulo: "Definições" },
  { id: "responsabilidades", titulo: "Responsabilidades" },
  ...SECOES_DE_LISTA.map((secao) => ({ id: secao.chave, titulo: secao.titulo })),
];

export function secaoDoModeloTemConteudo(conteudo: ConteudoPop, id: IdDaSecaoDoModelo): boolean {
  if (id === "alcance") return escrito(conteudo.alcance);
  if (id === "definicoes") return (conteudo.definicoes || []).some((item) => escrito(item.termo) || escrito(item.texto));
  if (id === "responsabilidades") return (conteudo.responsabilidades || []).some((grupo) => escrito(grupo.titulo) || itensEscritos(grupo.itens).length > 0);
  return itensEscritos(conteudo[id]).length > 0;
}

export const secoesDoModeloComConteudo = (conteudo: ConteudoPop): IdDaSecaoDoModelo[] => SECOES_DO_MODELO.filter((secao) => secaoDoModeloTemConteudo(conteudo, secao.id)).map((secao) => secao.id);

/** Tira do conteúdo o que ficou em branco na edição (definição sem termo e sem texto, grupo vazio, lista vazia, subtítulo em branco). */
export function limparConteudoDoModelo(conteudo: ConteudoPop): ConteudoPop {
  const limpo: ConteudoPop = { ...conteudo };
  const definicoes = (conteudo.definicoes || []).filter((item) => escrito(item.termo) || escrito(item.texto)).map((item) => ({ termo: item.termo.trim(), texto: item.texto.trim() }));
  if (definicoes.length) limpo.definicoes = definicoes;
  else delete limpo.definicoes;
  const grupos = (conteudo.responsabilidades || [])
    .map((grupo) => ({ titulo: escrito(grupo.titulo) ? (grupo.titulo || "").trim() : null, itens: itensEscritos(grupo.itens) }))
    .filter((grupo) => grupo.itens.length > 0 || grupo.titulo);
  if (grupos.length) limpo.responsabilidades = grupos;
  else delete limpo.responsabilidades;
  if (!escrito(conteudo.alcance)) delete limpo.alcance;
  for (const secao of SECOES_DE_LISTA) {
    const itens = itensEscritos(conteudo[secao.chave]);
    if (itens.length) limpo[secao.chave] = itens;
    else delete limpo[secao.chave];
  }
  if (conteudo.passos) limpo.passos = semSubtitulosVazios(conteudo.passos);
  return limpo;
}
