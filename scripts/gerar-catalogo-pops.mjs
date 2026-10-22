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
    linhas: t.linhas.map((linha) => Object.values(linha).map((v) => (v === null || v === undefined ? "" : String(v).trim()))),
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


// ---- Texto das pendências: ações claras, sem números nem verbos de auditoria do material de origem. ----
const FRASE_GENERICA = 'Ações corretivas: frase genérica "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores": decidir se mantém, suaviza ou retira.';
const ALCOOL_70 = 'Materiais e procedimento: "Álcool 70" aparece escrito de formas diferentes (70, 70%, 70 °, 70 º): padronizar e informar se é 70 % (v/v) ou 70 °INPM.';
const RODO_FORA_DOS_MATERIAIS = 'Procedimento: o primeiro passo usa "rodo", que não está na lista de materiais: decidir se acrescenta o rodo à lista.';
const PANO_ESPECIFICO = 'Procedimento: um passo manda usar "pano específico", que não está na lista de materiais: acrescentar o pano à lista ou ajustar o passo.';

export const PENDENCIAS_REESCRITAS = {
  "comp-01": [
    'Objetivos: o texto cita contexto hospitalar ("infecções relacionadas com a assistência à saúde", "contato com sangue e outros fluidos corporais", "ao cliente"): adaptar para serviço de alimentação.',
    'Ações corretivas: frase genérica "Tomar medidas previstas em Regulamento Interno" (sem advertência nem suspensão): decidir se mantém, suaviza ou retira.',
  ],
  "comp-02": [
    "Procedimento (retirar os itens): a frase sobre passar os itens para outro equipamento ou caixa térmica com gelo está incompleta e confusa: reescrever.",
    "Procedimento (limpeza interna): a frase sobre esfregar as paredes internas, as borrachas e as paredes externas está confusa: reescrever.",
    "Procedimento (religar): confirmar o tempo de espera de 20 minutos antes de religar o equipamento.",
    FRASE_GENERICA,
    ALCOOL_70,
  ],
  "comp-03": [FRASE_GENERICA, ALCOOL_70],
  "comp-04": [
    'Materiais (solução clorada): "20 ml ou duas colheres de sopa de água sanitária por litro" depende do teor de hipoclorito do produto: conferir o rótulo e a norma aplicada, e confirmar o tempo de imersão de 15 minutos.',
    FRASE_GENERICA,
    ALCOOL_70,
  ],
  "comp-05": [FRASE_GENERICA, ALCOOL_70],
  "comp-06": [
    'Materiais (solução clorada): "20 ml ou 02 colheres de sopa por litro": conferir a concentração pelo teor do produto.',
    RODO_FORA_DOS_MATERIAIS,
    FRASE_GENERICA,
  ],
  "comp-07": [
    'Materiais: "Solução clorada" está sem concentração: completar.',
    FRASE_GENERICA,
    ALCOOL_70,
    'Procedimento: os passos mandam borrifar álcool 70 e depois finalizar com solução clorada na mesma superfície, dois sanitizantes em sequência: decidir qual dos dois mantém, ou se há enxágue entre eles.',
  ],
  "comp-08": [
    'Materiais: a lista traz "Água sanitária" e um passo manda usar "solução clorada" sem concentração: padronizar o nome e informar a concentração.',
    RODO_FORA_DOS_MATERIAIS,
    FRASE_GENERICA,
  ],
  "comp-09": [PANO_ESPECIFICO, FRASE_GENERICA, ALCOOL_70],
  "comp-10": [PANO_ESPECIFICO, FRASE_GENERICA, ALCOOL_70],
  "comp-11": [FRASE_GENERICA, ALCOOL_70],
  "comp-12": [
    'Procedimento: um passo usa "pano umedecido com solução clorada", mas a lista de materiais não traz pano, e a solução clorada está sem concentração: completar.',
    FRASE_GENERICA,
  ],
  "comp-13": [
    'Procedimento (segurança elétrica): confirmar com o RT se o POP deve mesmo mandar limpar tomadas e interruptores e se a frase "se não desligar, não use panos encharcados" é suficiente.',
    FRASE_GENERICA,
    ALCOOL_70,
  ],
  "comp-14": [FRASE_GENERICA, ALCOOL_70],
  "comp-15": [
    "Conferir na norma aplicada se há exigência sobre uso de panos para secagem.",
    FRASE_GENERICA,
    'Materiais: "Água sanitária" / solução clorada sem concentração informada: completar.',
    'Materiais e procedimento: a lista de materiais traz água sanitária, mas nenhum passo a usa: completar o passo ou retirar o item.',
  ],
  "comp-16": [
    "Procedimento (tabela de temperaturas de recebimento: congelados, pescados, carnes e demais produtos): valores sem fonte citada. Conferir com a norma aplicada.",
    'Procedimento: o texto cita "O Estoquista" e "Encarregado ou Responsável", cargos genéricos: adaptar aos cargos da empresa.',
  ],
  "comp-17": ['Procedimento: a sigla "PVPS" não é explicada no texto (primeiro que vence, primeiro que sai): escrever o significado na primeira vez em que aparece.'],
  "comp-18": [
    "Procedimento: o texto não informa as faixas de temperatura. Valores de exemplo: refrigerador de 0 °C a 5 °C e freezer a −18 °C ou mais frio. Conferir com a norma aplicada e informar no passo.",
    "Cuidados especiais: a ideia de manter o equipamento aberto o menor tempo possível se repete nos passos e duas vezes nos cuidados: deixar só uma vez.",
    FRASE_GENERICA,
  ],
  "comp-19": [
    "Procedimentos: temperaturas, tempos e prazos (0 °C a 5 °C; 12 a 48 h por porte; carnes cruas até 2 dias; peixes e frutos do mar 24 h; alimentos prontos 2 a 3 dias; micro-ondas a 30 % a 50 %) sem fonte citada. Conferir com a norma aplicada.",
    'Procedimentos (micro-ondas): a frase sobre "permitido apenas para alimentos…" estava incompleta e a ideia já está no primeiro passo da opção: conferir se ficou clara.',
    'Procedimentos: o texto mistura imperativo ("Coloque", "Leve") e infinitivo: padronizar o tom.',
    "Ações corretivas: o primeiro item foi reescrito de forma mínima por estar confuso: conferir se o sentido está certo.",
    'Responsabilidades: "Cargo responsável" é um rótulo genérico e "Encarregados — Monitorar" ficou sem complemento: adaptar à empresa.',
    "Definições: sem fonte citada; conferir antes de manter.",
  ],
  "res-01": [
    'Responsabilidades: cargos genéricos ("Setor de compras, RH ou cargo do responsável", "Controle de qualidade", "Empresa de coleta…"): adaptar a cada empresa.',
    'Responsabilidades: "Entregar recebido e laudo de destinação final" (3 grupos) provavelmente deveria ser "recibo", como no item de documentação: conferir.',
    'Definições: copiadas de outras fontes (inclui texto da área da saúde e o de "alimentos impróprios para o consumo") sem citar a fonte: conferir antes de manter.',
    'Procedimentos: as três coletas por empresa especializada dizem só "de acordo com a metodologia da empresa especializada": avaliar se anexa o POP da empresa.',
    'Procedimentos: a sigla "DML" não está explicada (depósito de material de limpeza): escrever o significado.',
    "Frequência: as frequências são exemplos (3x por semana, 15 em 15 dias etc.): ajustar à realidade de cada empresa.",
    "Ações corretivas: restam reciclagem de treinamento e revisão do procedimento, porque as medidas punitivas foram retiradas do modelo: conferir se basta.",
  ],
};

// ---- Ajustes de conteúdo: marcas viram termo genérico; trechos de risco saem; nada aqui altera valores numéricos. ----
const NOTA_TOMADAS = "Trecho de limpeza química das tomadas removido do modelo por risco elétrico e químico.";
const CUIDADO_PANOS = "Os panos de cozinha ou de mão representam grandes focos de contaminação. Para a secagem de equipamentos, utensílios e mãos, devem ser usados panos descartáveis.";
const SUBSTITUICOES_DE_TEXTO = [
  [/Pano descartável\s*-\s*perfex/gi, "Pano descartável"],
  [/Pano descartável tipo Perfex/gi, "Pano descartável"],
  [/passar o perfex úmido/gi, "passar o pano descartável úmido"],
  [/com perfex\./gi, "com pano descartável."],
  [/caixa de isopor (?:e|com) gelo ou caixa termobox/gi, "caixa térmica com gelo"],
  [/\s*\(conforme o material\)/gi, ""],
];
export const TERMOS_PROIBIDOS = /perfex|isopor|termobox|conforme o material|do original|no original|do curso|do material de origem|valores do material|\bnull\b|undefined/i;

function trocarTextos(valor) {
  if (typeof valor === "string") return SUBSTITUICOES_DE_TEXTO.reduce((texto, [de, para]) => texto.replace(de, para), valor);
  if (Array.isArray(valor)) return valor.map(trocarTextos);
  if (valor && typeof valor === "object") return Object.fromEntries(Object.entries(valor).map(([chave, v]) => [chave, trocarTextos(v)]));
  return valor;
}

const textoDoItem = (item) => (typeof item === "string" ? item : item.texto);

function trocarItem(lista, procurado, fazer) {
  const indice = lista.findIndex((item) => procurado.test(textoDoItem(item)));
  if (indice < 0) throw new Error(`Ajuste de conteúdo não encontrou o trecho ${procurado}.`);
  const resultado = fazer(lista[indice]);
  if (resultado === null) lista.splice(indice, 1);
  else lista[indice] = resultado;
}

/** Ajustes pedidos para modelos específicos (conteúdo de risco ou afirmação não sustentada). */
function ajustarConteudo(pop) {
  const s = pop.secoes;
  if (pop.id === "comp-13") {
    trocarItem(s.cuidadosEspeciais, /^Para retirar amarelado do espelho das tomadas/, () => null);
    trocarItem(s.cuidadosEspeciais, /limpador específico para contato elétrico ou vinagre/, (item) => item.replace(/ ou vinagre\.?$/, "."));
    pop.notasParaOConsultor = [...pop.notasParaOConsultor, NOTA_TOMADAS];
  }
  if (pop.id === "comp-15") trocarItem(s.cuidadosEspeciais, /^Os panos de cozinha ou de mão/, () => CUIDADO_PANOS);
  return pop;
}

const celulasSemNulo = (tabela) => ({ ...tabela, linhas: tabela.linhas.map((linha) => linha.map((celula) => (celula === "null" || celula === "" ? "—" : celula))) });

export function varrerTermosProibidos(catalogo) {
  const achados = [];
  const andar = (valor, caminho) => {
    if (typeof valor === "string") {
      if (TERMOS_PROIBIDOS.test(valor)) achados.push(`${caminho}: ${valor.slice(0, 80)}`);
    } else if (Array.isArray(valor)) valor.forEach((v, i) => andar(v, `${caminho}[${i}]`));
    else if (valor && typeof valor === "object") for (const [chave, v] of Object.entries(valor)) andar(v, `${caminho}.${chave}`);
  };
  andar(catalogo, "catalogo");
  return achados;
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
  const pops = realocarRegistroDeTemperatura([...original.pops].sort((a, b) => a.ordem - b.ordem).map(enxugarPop)).map((pop) => {
    const ajustado = trocarTextos(ajustarConteudo(pop));
    return { ...ajustado, tabelas: ajustado.tabelas.map(celulasSemNulo), pendencias: PENDENCIAS_REESCRITAS[pop.id] ?? ajustado.pendencias };
  });
  return { versao: original.versao, pops };
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
  const achados = varrerTermosProibidos(catalogo);
  if (achados.length) {
    console.error(`Termos proibidos no catálogo (${achados.length}):\n- ${achados.join("\n- ")}`);
    process.exit(1);
  }
  mkdirSync(dirname(DESTINO), { recursive: true });
  writeFileSync(DESTINO, textoDoArquivoGerado(catalogo));
  console.log(`Gerado ${catalogo.pops.length} modelos em lib/modelos/popsModelosDados.ts`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
