// Catálogo de modelos de POP ("A partir de modelo"): lista, busca, código livre e criação do POP em rascunho não conferido.
// Os valores numéricos dos modelos (temperaturas, tempos, concentrações, prazos) NÃO foram verificados.
import type { ConteudoPop, GrupoDeModeloPop, ItemDeModeloPop, PassoPop, ProcedimentoOperacionalPadronizado, TabelaDoPop } from "../types/index.ts";
import { CATALOGO_DE_MODELOS_POP } from "./modelos/popsModelosDados.ts";
import { nomeECargo, limparTextoDePessoa } from "./nomeCargo.ts";
import { textoDoItem, subitensDoItem, tabelaDoItem } from "./popConteudoModelo.ts";
import { CONJUNTO_DA_NORMA } from "./popsNorma.ts";

export type ModeloDePop = {
  id: string;
  ordem: number;
  titulo: string;
  formato: "curto" | "longo";
  secoes: {
    objetivos: string[];
    alcance?: string;
    definicoes?: { termo: string; texto: string }[];
    responsabilidades?: GrupoDeModeloPop[];
    materiais?: ItemDeModeloPop[];
    epis?: ItemDeModeloPop[];
    passos: GrupoDeModeloPop[];
    cuidadosEspeciais?: ItemDeModeloPop[];
    acoesNaoConformidade?: ItemDeModeloPop[];
    verificacao?: ItemDeModeloPop[];
    frequencia?: GrupoDeModeloPop[];
    quemRealiza?: ItemDeModeloPop[];
    acoesPreventivas?: ItemDeModeloPop[];
    acoesCorretivas?: ItemDeModeloPop[];
  };
  tabelas: TabelaDoPop[];
  /** Instruções ao consultor: aparecem na ficha, nunca na folha nem no PDF. */
  notasParaOConsultor: string[];
  pendencias: string[];
  /** Descrição dos registros que acompanham o modelo (só apoio: nenhum registro novo é criado). */
  registrosSugeridos: string[];
};

export type CatalogoDeModelosPop = { versao: number; pops: ModeloDePop[] };

export const CATALOGO_DE_MODELOS: CatalogoDeModelosPop = CATALOGO_DE_MODELOS_POP;

export const listarModelos = (catalogo: CatalogoDeModelosPop = CATALOGO_DE_MODELOS): ModeloDePop[] => catalogo.pops;
export const modeloPorId = (id: string | undefined, catalogo: CatalogoDeModelosPop = CATALOGO_DE_MODELOS): ModeloDePop | undefined => (id ? catalogo.pops.find((modelo) => modelo.id === id) : undefined);

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");

/** Busca por palavras no título (sem acento nem caixa). Busca vazia devolve todos. */
export function buscarModelos(consulta: string, catalogo: CatalogoDeModelosPop = CATALOGO_DE_MODELOS): ModeloDePop[] {
  const palavras = semAcento(consulta).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return catalogo.pops;
  return catalogo.pops.filter((modelo) => {
    const titulo = semAcento(modelo.titulo);
    return palavras.every((palavra) => titulo.includes(palavra));
  });
}

/** "curto" ou "longo", como aparece na lista de modelos. */
export const rotuloDoFormato = (modelo: Pick<ModeloDePop, "formato">) => (modelo.formato === "longo" ? "longo" : "curto");

export function totalDePassos(modelo: ModeloDePop): number {
  return modelo.secoes.passos.reduce((soma, grupo) => soma + grupo.itens.length, 0);
}

// ===== Variáveis {{empresa}} e {{responsavel}} =====

export type VariaveisDoModelo = { empresa: string; responsavel: { nome: string; cargo: string } };

/** Troca {{empresa}} pelo nome de exibição e {{responsavel}} por "nome, cargo". Sem responsável, a variável some (nada é inventado). */
export function resolverVariaveis(texto: string, variaveis: VariaveisDoModelo): string {
  if (!/\{\{/.test(texto)) return texto.trim();
  const responsavel = nomeECargo(variaveis.responsavel.nome, variaveis.responsavel.cargo);
  return texto
    .replace(/\{\{\s*empresa\s*\}\}/gi, () => variaveis.empresa.trim())
    .replace(/\{\{\s*responsavel\s*\}\}/gi, () => responsavel)
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

function resolverItem(item: ItemDeModeloPop, variaveis: VariaveisDoModelo): ItemDeModeloPop | null {
  const texto = resolverVariaveis(textoDoItem(item), variaveis);
  if (!texto) return null;
  if (typeof item === "string") return texto;
  const subitens = (item.subitens || []).map((sub) => resolverVariaveis(sub, variaveis)).filter(Boolean);
  return { texto, ...(subitens.length ? { subitens } : {}), ...(item.tabela ? { tabela: item.tabela } : {}) };
}

function resolverItens(itens: ItemDeModeloPop[] | undefined, variaveis: VariaveisDoModelo): ItemDeModeloPop[] | undefined {
  if (!itens || itens.length === 0) return undefined;
  const resolvidos = itens.map((item) => resolverItem(item, variaveis)).filter((item): item is ItemDeModeloPop => item !== null);
  return resolvidos.length ? resolvidos : undefined;
}

function resolverGrupos(grupos: GrupoDeModeloPop[] | undefined, variaveis: VariaveisDoModelo): GrupoDeModeloPop[] | undefined {
  if (!grupos) return undefined;
  const resolvidos = grupos
    .map((grupo) => ({ titulo: grupo.titulo, itens: resolverItens(grupo.itens, variaveis) || [] }))
    .filter((grupo) => grupo.itens.length > 0);
  return resolvidos.length ? resolvidos : undefined;
}

// ===== Código "POP-NN" livre =====

const chave = (texto: string) => texto.trim().toLocaleLowerCase("pt-BR");

export function codigoEmUso(pops: Pick<ProcedimentoOperacionalPadronizado, "codigo">[], codigo: string): boolean {
  return Boolean(codigo.trim()) && pops.some((pop) => chave(pop.codigo) === chave(codigo));
}

/** Próximo "POP-NN" livre: acima de todos os já usados na empresa e acima dos códigos reservados ao conjunto da norma (POP-01 a 04). */
export function proximoCodigoLivre(pops: Pick<ProcedimentoOperacionalPadronizado, "codigo">[]): string {
  const numeros = [...pops.map((pop) => pop.codigo), ...CONJUNTO_DA_NORMA.map((definicao) => definicao.codigo)]
    .map((codigo) => /^POP-(\d+)$/i.exec((codigo || "").trim()))
    .filter((achado): achado is RegExpExecArray => Boolean(achado))
    .map((achado) => Number(achado[1]));
  let proximo = Math.max(0, ...numeros) + 1;
  while (codigoEmUso(pops, `POP-${String(proximo).padStart(2, "0")}`)) proximo += 1;
  return `POP-${String(proximo).padStart(2, "0")}`;
}

/** POPs da empresa (não arquivados) já criados deste modelo: serve para o aviso "Já existe POP-NN criado deste modelo". */
export function popsCriadosDoModelo(pops: ProcedimentoOperacionalPadronizado[], modeloId: string): ProcedimentoOperacionalPadronizado[] {
  return pops.filter((pop) => !pop.arquivado && pop.origemModelo?.id === modeloId);
}

export function avisoDeModeloJaCriado(pops: ProcedimentoOperacionalPadronizado[], modeloId: string): string {
  const existente = popsCriadosDoModelo(pops, modeloId)[0];
  if (!existente) return "";
  return `Já existe ${existente.codigo || "um POP"} criado deste modelo`;
}

// ===== Criação =====

const linhaDoItem = (item: ItemDeModeloPop) => [textoDoItem(item), ...subitensDoItem(item)].join(" ").trim();

/**
 * Passos do modelo → passos do POP. O passo guarda só texto: o título de um grupo (subtítulo no modelo) vira prefixo de cada item do grupo,
 * e a citação de tabela de um item fica no passo para a folha imprimir a tabela logo depois dele.
 */
export function passosDoModelo(modelo: ModeloDePop, variaveis: VariaveisDoModelo, gerarId: () => string): PassoPop[] {
  const passos: PassoPop[] = [];
  for (const grupo of resolverGrupos(modelo.secoes.passos, variaveis) || []) {
    for (const item of grupo.itens) {
      const texto = linhaDoItem(item);
      const tabela = tabelaDoItem(item);
      passos.push({ id: gerarId(), texto: grupo.titulo ? `${grupo.titulo}: ${texto}` : texto, ...(tabela ? { tabela } : {}) });
    }
  }
  return passos;
}

export function conteudoDoModelo(modelo: ModeloDePop, variaveis: VariaveisDoModelo, gerarId: () => string): ConteudoPop {
  const s = modelo.secoes;
  const resolvido = <T extends keyof ModeloDePop["secoes"]>(chaveDaLista: T) => resolverItens(s[chaveDaLista] as ItemDeModeloPop[] | undefined, variaveis);
  const acaoCorretiva = (resolvido("acoesCorretivas") || []).map(linhaDoItem).join("\n");
  const definicoes = (s.definicoes || []).map((d) => ({ termo: d.termo, texto: resolverVariaveis(d.texto, variaveis) }));
  const responsabilidades = resolverGrupos(s.responsabilidades, variaveis);
  const frequenciaDetalhe = resolverGrupos(s.frequencia, variaveis);
  const materiais = resolvido("materiais");
  const epis = resolvido("epis");
  const cuidadosEspeciais = resolvido("cuidadosEspeciais");
  const acoesNaoConformidade = resolvido("acoesNaoConformidade");
  const verificacao = resolvido("verificacao");
  const quemRealiza = resolvido("quemRealiza");
  const acoesPreventivas = resolvido("acoesPreventivas");
  return {
    objetivo: s.objetivos.map((texto) => resolverVariaveis(texto, variaveis)).filter(Boolean).join("\n"),
    campoAplicacao: "",
    referencias: [],
    // Só o responsável da empresa; sem responsável cadastrado, os campos ficam vazios.
    responsavelExecucao: { nome: limparTextoDePessoa(variaveis.responsavel.nome), cargo: limparTextoDePessoa(variaveis.responsavel.cargo) },
    // A frequência do modelo é só sugestão: o campo existente fica vazio.
    frequencia: "",
    passos: passosDoModelo(modelo, variaveis, gerarId),
    acaoCorretiva,
    registroProva: "",
    ...(s.alcance ? { alcance: resolverVariaveis(s.alcance, variaveis) } : {}),
    ...(definicoes.length ? { definicoes } : {}),
    ...(materiais ? { materiais } : {}),
    ...(epis ? { epis } : {}),
    ...(cuidadosEspeciais ? { cuidadosEspeciais } : {}),
    ...(acoesNaoConformidade ? { acoesNaoConformidade } : {}),
    ...(verificacao ? { verificacao } : {}),
    ...(quemRealiza ? { quemRealiza } : {}),
    ...(acoesPreventivas ? { acoesPreventivas } : {}),
    ...(responsabilidades ? { responsabilidades } : {}),
    ...(modelo.tabelas.length ? { tabelas: modelo.tabelas.map((tabela) => ({ ...tabela, colunas: [...tabela.colunas], linhas: tabela.linhas.map((linha) => [...linha]) })) } : {}),
    ...(frequenciaDetalhe ? { frequenciaDetalhe } : {}),
  };
}

export type EntradaDeCriacao = {
  modelo: ModeloDePop;
  pops: ProcedimentoOperacionalPadronizado[];
  /** Nome de exibição da empresa ({{empresa}}). */
  empresa: string;
  /** Responsável definido na empresa ({{responsavel}}); vazio quando não há. */
  responsavel: { nome: string; cargo: string };
  id: string;
  gerarId: () => string;
  codigo?: string;
  titulo?: string;
  versaoCatalogo?: number;
};

export type ResultadoDaCriacao = { ok: true; pop: ProcedimentoOperacionalPadronizado } | { ok: false; campo: "titulo" | "codigo"; aviso: string };

/** Cria o POP do modelo: sempre rascunho, nunca vigente, com a conferência pendente e a lista de itens a conferir. */
export function criarPopDeModelo(entrada: EntradaDeCriacao): ResultadoDaCriacao {
  const { modelo, pops } = entrada;
  const titulo = (entrada.titulo ?? modelo.titulo).trim();
  const codigo = (entrada.codigo ?? proximoCodigoLivre(pops)).trim();
  if (!titulo) return { ok: false, campo: "titulo", aviso: "Informe o título do POP." };
  if (codigoEmUso(pops, codigo)) return { ok: false, campo: "codigo", aviso: "Este código já está sendo utilizado em outro POP." };
  const variaveis: VariaveisDoModelo = { empresa: entrada.empresa, responsavel: entrada.responsavel };
  return {
    ok: true,
    pop: {
      id: entrada.id,
      codigo,
      titulo,
      versao: "1.0",
      status: "Rascunho",
      programaRelacionado: "",
      responsavel: limparTextoDePessoa(entrada.responsavel.nome),
      proximaRevisao: "",
      conteudo: conteudoDoModelo(modelo, variaveis, entrada.gerarId),
      origemModelo: { id: modelo.id, versaoCatalogo: entrada.versaoCatalogo ?? CATALOGO_DE_MODELOS.versao },
      conferencia: { conferido: false },
      itensAConferir: modelo.pendencias.map((texto) => ({ texto: resolverVariaveis(texto, variaveis), feito: false })).filter((item) => item.texto),
    },
  };
}
