// Gera a versão enxuta do catálogo de modelos de POP (lib/modelos/popsModelosDados.ts) a partir do arquivo
// `catalogo-pops-modelos.json` da raiz do projeto (que NÃO vai para o git). Uso: node scripts/gerar-catalogo-pops.mjs
// A versão enxuta não leva nenhum campo de auditoria, nome de arquivo de origem, número ou título originais, nem referências do material.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGEM = resolve(RAIZ, "catalogo-pops-modelos.json");
const DESTINO = resolve(RAIZ, "lib/modelos/popsModelosDados.ts");

const CHAVES_DE_LISTA = ["materiais", "epis", "cuidadosEspeciais", "acoesNaoConformidade", "verificacao", "quemRealiza", "acoesPreventivas", "acoesCorretivas"];

const ehTexto = (valor) => typeof valor === "string" && valor.trim().length > 0;
const ehItem = (item) =>
  ehTexto(item) ||
  (item &&
    typeof item === "object" &&
    ehTexto(item.texto) &&
    (item.subitens === undefined || (Array.isArray(item.subitens) && item.subitens.every(ehTexto))) &&
    (item.tabela === undefined || ehTexto(item.tabela)));
const ehListaDeItens = (lista) => Array.isArray(lista) && lista.every(ehItem);
const ehListaDeGrupos = (lista) => Array.isArray(lista) && lista.every((grupo) => grupo && typeof grupo === "object" && (grupo.titulo === null || ehTexto(grupo.titulo)) && ehListaDeItens(grupo.itens));

/** Valida o arquivo original. Devolve a lista de problemas (vazia = válido). */
export function validarOriginal(original) {
  const erros = [];
  if (!original || typeof original !== "object") return ["O arquivo não é um objeto JSON."];
  if (typeof original.versao !== "number") erros.push("versao ausente ou não numérica.");
  if (!Array.isArray(original.pops) || original.pops.length === 0) return [...erros, "pops ausente ou vazio."];
  const ids = new Set();
  for (const pop of original.pops) {
    const quem = pop && pop.id ? pop.id : "(sem id)";
    if (!pop || !ehTexto(pop.id)) erros.push(`${quem}: id obrigatório.`);
    else if (ids.has(pop.id)) erros.push(`${quem}: id repetido.`);
    else ids.add(pop.id);
    if (typeof pop?.ordem !== "number") erros.push(`${quem}: ordem obrigatória.`);
    if (!ehTexto(pop?.titulo)) erros.push(`${quem}: titulo obrigatório.`);
    if (pop?.formato !== "curto" && pop?.formato !== "longo") erros.push(`${quem}: formato deve ser curto ou longo.`);
    const s = pop?.secoes;
    if (!s || typeof s !== "object") {
      erros.push(`${quem}: secoes obrigatório.`);
      continue;
    }
    if (!Array.isArray(s.objetivos) || !s.objetivos.every(ehTexto)) erros.push(`${quem}: secoes.objetivos inválido.`);
    if (s.alcance !== undefined && !ehTexto(s.alcance)) erros.push(`${quem}: secoes.alcance deve ser texto.`);
    if (s.definicoes !== undefined && !(Array.isArray(s.definicoes) && s.definicoes.every((d) => ehTexto(d?.termo) && ehTexto(d?.texto)))) erros.push(`${quem}: secoes.definicoes inválido.`);
    for (const chave of CHAVES_DE_LISTA) if (s[chave] !== undefined && !ehListaDeItens(s[chave])) erros.push(`${quem}: secoes.${chave} inválido.`);
    if (s.responsabilidade !== undefined && !ehListaDeItens(s.responsabilidade)) erros.push(`${quem}: secoes.responsabilidade inválido.`);
    if (s.responsabilidades !== undefined && !ehListaDeGrupos(s.responsabilidades)) erros.push(`${quem}: secoes.responsabilidades inválido.`);
    if (!Array.isArray(s.passos) || s.passos.length === 0) erros.push(`${quem}: secoes.passos obrigatório.`);
    else if (pop.formato === "curto" ? !ehListaDeItens(s.passos) : !ehListaDeGrupos(s.passos)) erros.push(`${quem}: secoes.passos fora do formato ${pop.formato}.`);
    if (s.frequencia !== undefined && !(pop.formato === "curto" ? ehListaDeItens(s.frequencia) : ehListaDeGrupos(s.frequencia))) erros.push(`${quem}: secoes.frequencia fora do formato ${pop.formato}.`);
    if (!Array.isArray(pop.tabelas)) erros.push(`${quem}: tabelas deve ser lista.`);
    for (const tabela of pop.tabelas || []) {
      const ok = ehTexto(tabela?.id) && ehTexto(tabela?.titulo) && Array.isArray(tabela?.colunas) && tabela.colunas.length > 0 && Array.isArray(tabela?.linhas) && tabela.linhas.every((linha) => linha && Object.keys(linha).length === tabela.colunas.length);
      if (!ok) erros.push(`${quem}: tabela ${tabela?.id ?? "(sem id)"} inválida.`);
    }
    if (!Array.isArray(pop.notasParaOConsultor)) erros.push(`${quem}: notasParaOConsultor deve ser lista.`);
    if (!Array.isArray(pop.pendencias) || !pop.pendencias.every((p) => ehTexto(p?.texto))) erros.push(`${quem}: pendencias inválido.`);
    if (!Array.isArray(pop.planilhasNoOriginal)) erros.push(`${quem}: planilhasNoOriginal deve ser lista.`);
  }
  return erros;
}

const SEM_REPETIR = (lista) => [...new Set(lista)];
const MOTIVO_SO_DE_AUDITORIA = new Set(["numeracao"]);
const NOTA_SO_DE_AUDITORIA = /imagens? do original|marca de terceiros|planilhas?\] as \d+ planilhas/i;
const PENDENCIA_SO_DE_AUDITORIA = /^(No arquivo, este POP aparece numerado|No original as seções estão fora de ordem)/;

function limparItem(item) {
  if (typeof item === "string") return item.trim();
  const saida = { texto: item.texto.trim() };
  if (item.subitens?.length) saida.subitens = item.subitens.map((s) => s.trim());
  if (item.tabela) saida.tabela = item.tabela;
  return saida;
}
const limparLista = (lista) => (lista || []).map(limparItem);
const limparGrupos = (grupos) => (grupos || []).map((g) => ({ titulo: g.titulo === null ? null : g.titulo.trim(), itens: limparLista(g.itens) }));

/** Descrição do registro sugerido: só o que descreve colunas e campos (sem marca, sem imagem e sem valores lidos de imagem). */
function descreverPlanilha(texto) {
  const sem = texto
    .replace(/\s*\((?:imagem[^)]*)\)/gi, "")
    .replace(/\s*A imagem indica[^.]*\./gi, "")
    .replace(/^Mesma planilha/, "Mesmo registro")
    .replace(/^Planilha de (?:registro de )?/, "Registro de ")
    .trim();
  return sem;
}

/** Versão enxuta de um pop: só o que o app usa. */
export function enxugarPop(pop) {
  const s = pop.secoes;
  const curto = pop.formato === "curto";
  const responsabilidades = s.responsabilidades ? limparGrupos(s.responsabilidades) : s.responsabilidade ? [{ titulo: null, itens: limparLista(s.responsabilidade) }] : [];
  const passos = curto ? [{ titulo: null, itens: limparLista(s.passos) }] : limparGrupos(s.passos);
  const frequencia = !s.frequencia ? [] : curto ? [{ titulo: null, itens: limparLista(s.frequencia) }] : limparGrupos(s.frequencia);
  const secoes = {
    objetivos: s.objetivos.map((t) => t.trim()),
    ...(s.alcance ? { alcance: s.alcance.trim() } : {}),
    ...(s.definicoes?.length ? { definicoes: s.definicoes.map((d) => ({ termo: d.termo.trim(), texto: d.texto.trim() })) } : {}),
    ...(responsabilidades.length ? { responsabilidades } : {}),
    ...(s.materiais?.length ? { materiais: limparLista(s.materiais) } : {}),
    ...(s.epis?.length ? { epis: limparLista(s.epis) } : {}),
    passos,
    ...(s.cuidadosEspeciais?.length ? { cuidadosEspeciais: limparLista(s.cuidadosEspeciais) } : {}),
    ...(s.acoesNaoConformidade?.length ? { acoesNaoConformidade: limparLista(s.acoesNaoConformidade) } : {}),
    ...(s.verificacao?.length ? { verificacao: limparLista(s.verificacao) } : {}),
    ...(frequencia.length ? { frequencia } : {}),
    ...(s.quemRealiza?.length ? { quemRealiza: limparLista(s.quemRealiza) } : {}),
    ...(s.acoesPreventivas?.length ? { acoesPreventivas: limparLista(s.acoesPreventivas) } : {}),
    ...(s.acoesCorretivas?.length ? { acoesCorretivas: limparLista(s.acoesCorretivas) } : {}),
  };
  const tabelas = pop.tabelas.map((t) => ({
    id: t.id,
    titulo: t.titulo.trim(),
    colunas: t.colunas.map((c) => c.trim()),
    linhas: t.linhas.map((linha) => Object.values(linha).map((v) => String(v).trim())),
  }));
  const pendencias = pop.pendencias
    .filter((p) => !MOTIVO_SO_DE_AUDITORIA.has(p.motivo) && !PENDENCIA_SO_DE_AUDITORIA.test(p.texto.trim()))
    .map((p) => (p.secao && p.secao.trim() && p.secao !== "estrutura" ? `${p.secao.trim()}: ${p.texto.trim()}` : p.texto.trim()));
  const notas = SEM_REPETIR(pop.notasParaOConsultor.map((n) => n.trim()).filter((n) => !NOTA_SO_DE_AUDITORIA.test(n)));
  const registros = pop.planilhasNoOriginal.filter((p) => /^(Planilha|Mesma planilha)/.test(p)).map(descreverPlanilha);
  return {
    id: pop.id,
    ordem: pop.ordem,
    titulo: pop.titulo.trim(),
    formato: pop.formato,
    secoes,
    tabelas,
    notasParaOConsultor: notas,
    pendencias: SEM_REPETIR(pendencias),
    registrosSugeridos: registros,
  };
}

/** No arquivo, o registro de temperatura dos equipamentos está listado no modelo de descongelamento; ele pertence ao controle de temperatura (comp-18). */
function realocarRegistroDeTemperatura(pops) {
  const origem = pops.find((pop) => pop.id === "comp-19");
  const destino = pops.find((pop) => pop.id === "comp-18");
  if (!origem || !destino) return pops;
  const mover = origem.registrosSugeridos.filter((texto) => /temperatura de equipamentos/i.test(texto));
  origem.registrosSugeridos = origem.registrosSugeridos.filter((texto) => !mover.includes(texto));
  destino.registrosSugeridos = [...destino.registrosSugeridos, ...mover];
  return pops;
}

export function enxugar(original) {
  return {
    versao: original.versao,
    pops: realocarRegistroDeTemperatura([...original.pops].sort((a, b) => a.ordem - b.ordem).map(enxugarPop)),
  };
}

export function textoDoArquivoGerado(catalogo) {
  return (
    `// GERADO por scripts/gerar-catalogo-pops.mjs. Não editar à mão.\n` +
    `// Versão enxuta: só o conteúdo dos modelos. Os valores numéricos (temperaturas, tempos, concentrações, prazos) NÃO foram verificados.\n` +
    `import type { CatalogoDeModelosPop } from "../popModelos.ts";\n\n` +
    `export const CATALOGO_DE_MODELOS_POP: CatalogoDeModelosPop = ${JSON.stringify(catalogo, null, 1)};\n`
  );
}

function principal() {
  if (!existsSync(ORIGEM)) {
    console.error("catalogo-pops-modelos.json não está na raiz do projeto. Nada foi gerado.");
    process.exit(1);
  }
  const original = JSON.parse(readFileSync(ORIGEM, "utf8"));
  const erros = validarOriginal(original);
  if (erros.length) {
    console.error(`Arquivo inválido (${erros.length} problema(s)):\n- ${erros.join("\n- ")}`);
    process.exit(1);
  }
  const catalogo = enxugar(original);
  mkdirSync(dirname(DESTINO), { recursive: true });
  writeFileSync(DESTINO, textoDoArquivoGerado(catalogo));
  console.log(`Gerado ${catalogo.pops.length} modelos em lib/modelos/popsModelosDados.ts`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
