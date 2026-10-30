import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { CATALOGO_DE_MODELOS, avisoDeModeloJaCriado, buscarModelos, codigoEmUso, criarPopDeModelo, listarModelos, modeloPorId, proximoCodigoLivre, resolverVariaveis } from "../lib/popModelos.ts";
import {
  MODELOS_COM_BLOQUEIO,
  MENSAGEM_APROVAR_NAO_CONFERIDO,
  MENSAGEM_BLOQUEIO_DE_APROVACAO,
  bloqueioDeAprovacao,
  exigenciaDeAprovacao,
  marcarComoConferido,
  marcarItemAConferir,
  podeMarcarComoConferido,
  popNaoConferido,
} from "../lib/popConferencia.ts";
import { itensParaTexto, sugestaoDeFrequencia, textoParaGrupos, textoParaItens, gruposParaTexto } from "../lib/popConteudoModelo.ts";
import { folhaDoPop } from "../lib/popDocumento.ts";
import { aprovarPop, compararVersoes, validarAprovacoesDePop } from "../lib/popsNorma.ts";
import { enxugar, validarOriginal } from "../scripts/gerar-catalogo-pops.mjs";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");
let contador = 0;
const gerarId = () => `id-${(contador += 1)}`;
const responsavel = { nome: "Maria da Silva", cargo: "Nutricionista RT" };
const semResponsavel = { nome: "", cargo: "" };
const criar = (modeloId, extra = {}) => {
  const resultado = criarPopDeModelo({ modelo: modeloPorId(modeloId), pops: [], empresa: "Beyond Nutri", responsavel, id: `pop-${modeloId}`, gerarId, ...extra });
  assert.equal(resultado.ok, true, JSON.stringify(resultado));
  return resultado.pop;
};
const textoDaFolha = (folha) => JSON.stringify(folha);

// ===== Catálogo =====
const CAMPOS_DE_AUDITORIA = ["arquivoOrigem", "numeroOriginal", "tituloOriginal", "referenciasOriginais", "alteracoes", "conciliacao", "origem", "decisoes", "tituloCapa", "planilhasNoOriginal", "motivo", "geradoEm"];
const TERCEIROS = /\.docx|\bcurso\b|\bkit\b|terceiros|POPs COMPLEMENTARES|CAPAS DOS POPs|MANEJO DE RESÍDUOS\.docx|arquivoOrigem|numeroOriginal|tituloOriginal|conciliacao/i;

test("catálogo: 20 modelos, ids únicos e válidos", () => {
  const modelos = listarModelos();
  assert.equal(modelos.length, 20);
  const ids = modelos.map((modelo) => modelo.id);
  assert.equal(new Set(ids).size, 20);
  assert.deepEqual(ids, [...Array.from({ length: 19 }, (_, i) => `comp-${String(i + 1).padStart(2, "0")}`), "res-01"]);
  for (const modelo of modelos) {
    assert.ok(modelo.titulo.trim(), modelo.id);
    assert.ok(modelo.formato === "curto" || modelo.formato === "longo", modelo.id);
    assert.ok(modelo.secoes.objetivos.length > 0, modelo.id);
    assert.ok(modelo.secoes.passos.length > 0 && modelo.secoes.passos.every((grupo) => grupo.itens.length > 0), modelo.id);
    assert.ok(Array.isArray(modelo.notasParaOConsultor) && Array.isArray(modelo.pendencias) && Array.isArray(modelo.tabelas), modelo.id);
  }
  assert.equal(CATALOGO_DE_MODELOS.versao, 1);
});

test("catálogo enxuto: nenhum campo de auditoria nem nome de terceiros ou de arquivo", () => {
  const arquivo = ler("../lib/modelos/popsModelosDados.ts");
  assert.doesNotMatch(arquivo, TERCEIROS);
  for (const campo of CAMPOS_DE_AUDITORIA) assert.equal(arquivo.includes(`"${campo}"`), false, campo);
  assert.deepEqual(Object.keys(CATALOGO_DE_MODELOS).sort(), ["pops", "versao"]);
  for (const modelo of listarModelos()) {
    assert.deepEqual(Object.keys(modelo).sort(), ["formato", "id", "notasParaOConsultor", "ordem", "pendencias", "registrosSugeridos", "secoes", "tabelas", "titulo"]);
  }
  // Nenhuma referência de legislação do material nos modelos.
  assert.equal(listarModelos().some((modelo) => "referencias" in modelo.secoes), false);
});

test("o arquivo original da raiz não entra no git", () => {
  assert.match(ler("../.gitignore"), /^catalogo-pops-modelos\.json$/m);
});

test("nenhum texto de modelo nem folha impressa cita terceiros, cursos ou kits (textos e PDF)", () => {
  for (const modelo of listarModelos()) {
    const pop = criar(modelo.id);
    const folha = textoDaFolha(folhaDoPop(pop, { nome: "Beyond Nutri", cnpj: "" }));
    assert.doesNotMatch(folha, TERCEIROS, modelo.id);
    assert.doesNotMatch(JSON.stringify(modelo), TERCEIROS, modelo.id);
  }
  for (const caminho of ["../components/pc/PcModelosPop.tsx", "../components/pc/PopFolha.tsx", "../lib/popModelos.ts", "../lib/popDocumento.ts"]) assert.doesNotMatch(ler(caminho), /\bcurso\b|\bkit\b/i, caminho);
});

test("busca de modelos: sem acento nem caixa, por palavras", () => {
  assert.equal(buscarModelos("").length, 20);
  assert.deepEqual(buscarModelos("residuos").map((modelo) => modelo.id), ["res-01"]);
  assert.ok(buscarModelos("HIGIENIZAÇÃO de").length >= 14);
  assert.deepEqual(buscarModelos("descongelamento carnes").map((modelo) => modelo.id), ["comp-19"]);
  assert.equal(buscarModelos("xyz").length, 0);
});

// ===== Validação e geração do arquivo =====
const modeloOriginalMinimo = (extra = {}) => ({
  id: "comp-99",
  ordem: 1,
  arquivoOrigem: "arquivo.docx",
  numeroOriginal: 9,
  tituloOriginal: "TITULO",
  titulo: "Higienização de teste",
  tituloCapa: "CAPA",
  formato: "curto",
  secoes: { objetivos: ["Objetivo."], passos: ["Passo um.", { texto: "Veja a tabela:", tabela: "t1" }], responsabilidade: ["{{responsavel}}"], acoesCorretivas: ["Treinar."], frequencia: ["Diária."] },
  tabelas: [{ id: "t1", titulo: "Tabela", colunas: ["A", "B"], linhas: [{ a: "1", b: "2" }], conferirComNorma: true }],
  planilhasNoOriginal: ["Planilha de controle (imagem com marca de terceiros): colunas data e hora."],
  notasParaOConsultor: ["Verifique.", "Verifique."],
  referenciasOriginais: ["RDC 216"],
  alteracoes: ["x"],
  pendencias: [
    { secao: "Procedimento", texto: "Confirmar tempo.", motivo: null },
    { secao: "Procedimento", texto: "Numeração original irregular.", motivo: "numeracao" },
  ],
  conciliacao: { ok: true },
  ...extra,
});

test("validação do arquivo original: aceita o válido e aponta tipos e campos obrigatórios", () => {
  const valido = { versao: 1, origem: {}, decisoes: [], pops: [modeloOriginalMinimo()] };
  assert.deepEqual(validarOriginal(valido), []);
  assert.ok(validarOriginal(null).length > 0);
  assert.ok(validarOriginal({ versao: 1, pops: [] }).length > 0);
  assert.ok(validarOriginal({ pops: [modeloOriginalMinimo()] }).some((erro) => /versao/.test(erro)));
  assert.ok(validarOriginal({ versao: 1, pops: [modeloOriginalMinimo(), modeloOriginalMinimo()] }).some((erro) => /repetido/.test(erro)));
  assert.ok(validarOriginal({ versao: 1, pops: [modeloOriginalMinimo({ formato: "médio" })] }).some((erro) => /formato/.test(erro)));
  assert.ok(validarOriginal({ versao: 1, pops: [modeloOriginalMinimo({ titulo: "" })] }).some((erro) => /titulo/.test(erro)));
  assert.ok(validarOriginal({ versao: 1, pops: [modeloOriginalMinimo({ secoes: { objetivos: ["a"], passos: [] } })] }).some((erro) => /passos/.test(erro)));
  assert.ok(validarOriginal({ versao: 1, pops: [modeloOriginalMinimo({ tabelas: [{ id: "t", titulo: "T", colunas: ["A"], linhas: [{ a: 1, b: 2 }] }] })] }).some((erro) => /tabela/.test(erro)));
});

test("geração enxuta: tira auditoria e arquivo de origem, mantém tabela e passo que a cita", () => {
  const catalogo = enxugar({ versao: 1, origem: { arquivos: ["x.docx"] }, decisoes: ["d"], pops: [modeloOriginalMinimo()] });
  const texto = JSON.stringify(catalogo);
  assert.doesNotMatch(texto, TERCEIROS);
  for (const campo of CAMPOS_DE_AUDITORIA.filter((campo) => campo !== "planilhasNoOriginal")) assert.equal(texto.includes(`"${campo}"`), false, campo);
  const [pop] = catalogo.pops;
  assert.deepEqual(pop.tabelas[0].linhas, [["1", "2"]]);
  assert.equal(pop.secoes.passos[0].itens[1].tabela, "t1");
  assert.deepEqual(pop.pendencias, ["Procedimento: Confirmar tempo."]);
  assert.deepEqual(pop.notasParaOConsultor, ["Verifique."]);
  assert.deepEqual(pop.registrosSugeridos, ["Registro de controle: colunas data e hora."]);
  assert.deepEqual(pop.secoes.responsabilidades, [{ titulo: null, itens: ["{{responsavel}}"] }]);
});

// ===== Variáveis =====
test("{{empresa}} e {{responsavel}}: com e sem responsável", () => {
  assert.equal(resolverVariaveis("Todos da {{empresa}}.", { empresa: "Beyond Nutri", responsavel }), "Todos da Beyond Nutri.");
  assert.equal(resolverVariaveis("{{responsavel}}", { empresa: "X", responsavel }), "Maria da Silva, Nutricionista RT");
  assert.equal(resolverVariaveis("{{responsavel}}", { empresa: "X", responsavel: semResponsavel }), "");
  assert.equal(resolverVariaveis("Texto sem variável.", { empresa: "X", responsavel }), "Texto sem variável.");
  const com = criar("comp-02");
  assert.deepEqual(com.conteudo.responsabilidades, [{ titulo: null, itens: ["Maria da Silva, Nutricionista RT"] }]);
  assert.deepEqual(com.conteudo.responsavelExecucao, responsavel);
  const sem = criar("comp-02", { responsavel: semResponsavel });
  assert.equal(sem.conteudo.responsabilidades, undefined);
  assert.deepEqual(sem.conteudo.responsavelExecucao, { nome: "", cargo: "" });
  assert.doesNotMatch(JSON.stringify(sem), /\{\{/);
  assert.doesNotMatch(JSON.stringify(criar("comp-01")), /\{\{/);
  assert.match(JSON.stringify(criar("comp-01")), /Beyond Nutri/);
});

// ===== Código livre =====
test("código POP-NN livre: acima dos usados e dos reservados ao conjunto da norma", () => {
  assert.equal(proximoCodigoLivre([]), "POP-05");
  assert.equal(proximoCodigoLivre([{ codigo: "POP-05" }, { codigo: "POP-07" }]), "POP-08");
  assert.equal(proximoCodigoLivre([{ codigo: "POP-12" }, { codigo: "XYZ" }, { codigo: "" }]), "POP-13");
  assert.equal(codigoEmUso([{ codigo: "pop-05" }], "POP-05"), true);
  assert.equal(codigoEmUso([{ codigo: "POP-05" }], ""), false);
});

test("criação: código repetido e título vazio viram erro inline; dois modelos recebem códigos diferentes", () => {
  const base = { modelo: modeloPorId("comp-03"), pops: [{ id: "a", codigo: "POP-09", titulo: "x" }], empresa: "E", responsavel, id: "n", gerarId };
  const repetido = criarPopDeModelo({ ...base, codigo: "pop-09" });
  assert.equal(repetido.ok, false);
  assert.equal(repetido.campo, "codigo");
  const semTitulo = criarPopDeModelo({ ...base, titulo: "  " });
  assert.deepEqual([semTitulo.ok, semTitulo.campo], [false, "titulo"]);
  const livre = criarPopDeModelo(base);
  assert.equal(livre.pop.codigo, "POP-10");
  assert.equal(livre.pop.titulo, modeloPorId("comp-03").titulo);
  assert.equal(criarPopDeModelo({ ...base, titulo: "  Meu título " }).pop.titulo, "Meu título");
});

test("modelo já criado: aviso inline sem bloquear", () => {
  const primeiro = criar("comp-05");
  assert.equal(avisoDeModeloJaCriado([primeiro], "comp-05"), `Já existe ${primeiro.codigo} criado deste modelo`);
  assert.equal(avisoDeModeloJaCriado([primeiro], "comp-06"), "");
  assert.equal(avisoDeModeloJaCriado([{ ...primeiro, arquivado: true }], "comp-05"), "");
  const outro = criarPopDeModelo({ modelo: modeloPorId("comp-05"), pops: [primeiro], empresa: "E", responsavel, id: "outro", gerarId });
  assert.equal(outro.ok, true);
});

// ===== Mapeamento dos campos =====
test("mapeamento: objetivos, frequência não inferida, referências vazias, ação corretiva", () => {
  const modelo = modeloPorId("comp-01");
  const pop = criar("comp-01");
  assert.equal(pop.conteudo.objetivo, modelo.secoes.objetivos.join("\n"));
  assert.equal(pop.conteudo.frequencia, "");
  assert.equal(modelo.secoes.frequencia, undefined, "comp-01 não traz frequência");
  assert.ok(sugestaoDeFrequencia(criar("comp-02").conteudo.frequenciaDetalhe).length > 0);
  assert.deepEqual(pop.conteudo.referencias, []);
  assert.equal(pop.conteudo.acaoCorretiva, modelo.secoes.acoesCorretivas.map((item) => (typeof item === "string" ? item : item.texto)).join("\n"));
  assert.equal(pop.conteudo.passos.length, modelo.secoes.passos[0].itens.length);
  assert.ok(pop.conteudo.passos.every((passo) => passo.id && passo.texto));
  assert.equal(pop.versao, "1.0");
  assert.equal(pop.proximaRevisao, "");
  // Subitens do modelo ficam no campo novo.
  const cuidados = pop.conteudo.cuidadosEspeciais.find((item) => typeof item !== "string" && item.subitens);
  assert.ok(cuidados.subitens.length > 3);
});

test("mapeamento dos passos: modelo curto sem subtítulo; modelo longo com subtítulo no primeiro passo de cada grupo (sem prefixo)", () => {
  const curto = criar("comp-02");
  assert.equal(curto.conteudo.passos.every((passo) => !passo.subtitulo), true);
  const longo = criar("comp-19");
  const textos = longo.conteudo.passos.map((passo) => passo.texto);
  assert.ok(textos[0].startsWith("O descongelamento"), "grupo sem título não leva subtítulo");
  assert.equal(longo.conteudo.passos[0].subtitulo, undefined);
  assert.ok(textos.every((texto) => !/^(Opção|Observações importantes)[^:]*: /.test(texto)), "o título do grupo não é mais prefixado no texto");
  assert.deepEqual(longo.conteudo.passos.filter((passo) => passo.subtitulo).map((passo) => passo.subtitulo), ["Opção 01: Em refrigerador", "Opção 02: Micro-ondas", "Observações importantes"]);
  const residuos = criar("res-01");
  assert.ok(residuos.conteudo.passos.some((passo) => passo.subtitulo === "Higienização de caixa de gordura"));
  assert.ok(residuos.conteudo.frequenciaDetalhe.length > 1);
  assert.equal(residuos.conteudo.frequencia, "");
});

test("sugestão de frequência: texto do modelo, com título do grupo quando há (e nunca preenche o campo)", () => {
  assert.equal(sugestaoDeFrequencia(criar("comp-18").conteudo.frequenciaDetalhe), "Diária.");
  assert.match(sugestaoDeFrequencia(criar("res-01").conteudo.frequenciaDetalhe), /^Da retirada do resíduos dos setores de produção: Diariamente/);
  assert.equal(sugestaoDeFrequencia(undefined), "");
  for (const modelo of listarModelos()) assert.equal(criar(modelo.id).conteudo.frequencia, "", modelo.id);
});

// ===== Nasce rascunho não conferido =====
test("POP de modelo nasce como rascunho, não conferido e com itens a conferir", () => {
  for (const modelo of listarModelos()) {
    const pop = criar(modelo.id);
    assert.equal(pop.status, "Rascunho");
    assert.equal(pop.aprovacao, undefined);
    assert.equal(pop.versoes, undefined);
    assert.deepEqual(pop.origemModelo, { id: modelo.id, versaoCatalogo: 1 });
    assert.deepEqual(pop.conferencia, { conferido: false });
    assert.equal(popNaoConferido(pop), true);
    assert.equal(pop.itensAConferir.length, modelo.pendencias.length);
    assert.ok(pop.itensAConferir.every((item) => item.feito === false && item.texto));
  }
});

// ===== Conferência =====
test("Marcar como conferido só com todos os itens marcados; grava quem e quando", () => {
  let pop = criar("comp-02");
  assert.ok(pop.itensAConferir.length >= 2);
  assert.equal(podeMarcarComoConferido(pop), false);
  assert.throws(() => marcarComoConferido(pop, responsavel, "2026-10-21T12:00:00.000Z"), /todos os itens/);
  pop.itensAConferir.forEach((_, indice) => {
    pop = marcarItemAConferir(pop, indice, true);
  });
  assert.equal(podeMarcarComoConferido(pop), true);
  const conferido = marcarComoConferido(pop, { nome: ", Maria da Silva", cargo: "Nutricionista RT" }, "2026-10-21T12:00:00.000Z");
  assert.deepEqual(conferido.conferencia, { conferido: true, por: { nome: "Maria da Silva", cargo: "Nutricionista RT" }, em: "2026-10-21T12:00:00.000Z" });
  assert.equal(popNaoConferido(conferido), false);
  assert.equal(podeMarcarComoConferido(conferido), false);
  // Desmarcar um item de um POP conferido volta ao estado de não conferido.
  const reaberto = marcarItemAConferir(conferido, 0, false);
  assert.equal(popNaoConferido(reaberto), true);
  assert.equal(marcarItemAConferir(pop, 99, true), pop);
});

test("POP que não veio de modelo nunca fica 'não conferido' nem exige confirmação", () => {
  const antigo = { id: "a", codigo: "POP-01", titulo: "Antigo", versao: "1.0", status: "Aguardando aprovação", conteudo: {} };
  assert.equal(popNaoConferido(antigo), false);
  assert.equal(exigenciaDeAprovacao(antigo), "nenhuma");
  assert.equal(bloqueioDeAprovacao(antigo), "");
  assert.equal(podeMarcarComoConferido(antigo), false);
});

// ===== Aprovação =====
const usuarioAprova = { id: "u1", nome: "Maria da Silva", cargo: "Nutricionista RT", status: "Ativo" };
const empresaAprova = { responsavelEstabelecimento: { usuarioId: "u1", nome: "Maria da Silva", cargo: "Nutricionista RT" }, normasAplicadas: [] };
const aguardando = (pop) => ({ ...pop, status: "Aguardando aprovação" });

test("aprovar POP de modelo não conferido pede confirmação (não bloqueia)", () => {
  const pop = aguardando(criar("comp-01"));
  assert.equal(exigenciaDeAprovacao(pop), "confirmar");
  assert.equal(MENSAGEM_APROVAR_NAO_CONFERIDO, "Este POP veio de modelo e ainda não foi conferido. Aprovar mesmo assim?");
  const aprovado = aprovarPop(pop, usuarioAprova, empresaAprova, "2026-10-21T12:00:00.000Z");
  assert.equal(aprovado.status, "Aprovado");
  const conferidoTodo = { ...pop, itensAConferir: pop.itensAConferir.map((item) => ({ ...item, feito: true })) };
  assert.equal(exigenciaDeAprovacao(marcarComoConferido(conferidoTodo, responsavel, "2026-10-21T12:00:00.000Z")), "nenhuma");
});

test("comp-13 (interruptores e tomadas): sem conferência a aprovação fica bloqueada", () => {
  assert.deepEqual([...MODELOS_COM_BLOQUEIO], ["comp-13"]);
  assert.equal(MENSAGEM_BLOQUEIO_DE_APROVACAO, "Revise os itens de segurança antes de aprovar");
  const pop = aguardando(criar("comp-13"));
  assert.equal(exigenciaDeAprovacao(pop), "bloqueada");
  assert.equal(bloqueioDeAprovacao(pop), "Revise os itens de segurança antes de aprovar");
  assert.throws(() => aprovarPop(pop, usuarioAprova, empresaAprova, "2026-10-21T12:00:00.000Z"), /Revise os itens de segurança antes de aprovar/);
  const marcados = { ...pop, itensAConferir: pop.itensAConferir.map((item) => ({ ...item, feito: true })) };
  const conferido = marcarComoConferido(marcados, responsavel, "2026-10-21T12:00:00.000Z");
  assert.equal(exigenciaDeAprovacao(conferido), "nenhuma");
  assert.equal(aprovarPop(conferido, usuarioAprova, empresaAprova, "2026-10-21T12:00:00.000Z").status, "Aprovado");
});

test("servidor: aprovação de comp-13 não conferido volta ao que estava gravado", () => {
  const pop = aguardando(criar("comp-13"));
  const atuais = { e1: { ...empresaAprova, pops: [pop] } };
  const recebidas = { e1: { ...empresaAprova, pops: [{ ...pop, status: "Aprovado", aprovacao: { nome: "Maria da Silva", cargo: "RT", usuarioId: "u1", em: "2026-10-21T12:00:00.000Z", versao: "1.0" } }] } };
  const resultado = validarAprovacoesDePop(atuais, recebidas, { ...usuarioAprova }, "2026-10-21T12:00:00.000Z");
  assert.equal(resultado.empresas.e1.pops[0].status, "Aguardando aprovação");
  assert.equal(resultado.registros.length, 0);
  const livre = aguardando(criar("comp-01"));
  const ok = validarAprovacoesDePop({ e1: { ...empresaAprova, pops: [livre] } }, { e1: { ...empresaAprova, pops: [{ ...livre, status: "Aprovado", aprovacao: { nome: "Maria da Silva", cargo: "RT", usuarioId: "u1", em: "2026-10-21T12:00:00.000Z", versao: "1.0" } }] } }, { ...usuarioAprova }, "2026-10-21T12:00:00.000Z");
  assert.equal(ok.empresas.e1.pops[0].status, "Aprovado");
});

// ===== Folha e PDF =====
const titulosDaFolha = (pop) => folhaDoPop(pop, { nome: "Beyond Nutri", cnpj: "" }).blocos.map((bloco) => bloco.titulo);

test("seções novas só aparecem quando preenchidas e nunca como 'Não preenchida'", () => {
  const completo = folhaDoPop(criar("comp-02"), { nome: "Beyond Nutri", cnpj: "" });
  const titulos = completo.blocos.map((bloco) => bloco.titulo);
  for (const esperado of ["Responsabilidades", "Materiais", "Cuidados especiais"]) assert.ok(titulos.includes(esperado), esperado);
  const vazio = folhaDoPop({ codigo: "POP-9", titulo: "Vazio", versao: "1.0", status: "Rascunho", conteudo: { objetivo: "", passos: [], materiais: [], epis: [""], alcance: "  ", definicoes: [], verificacao: [] } }, { nome: "E", cnpj: "" });
  const tituloVazio = vazio.blocos.map((bloco) => bloco.titulo);
  for (const nova of ["Alcance", "Definições", "Materiais", "EPIs", "Verificação", "Quem realiza", "Ações preventivas", "Ações em caso de não conformidade", "Cuidados especiais", "Responsabilidades"]) assert.equal(tituloVazio.includes(nova), false, nova);
  assert.equal(vazio.blocos.filter((bloco) => bloco.vazia).length >= 1, true);
  assert.equal(vazio.blocos.filter((bloco) => !bloco.vazia).every((bloco) => !bloco.linhas.includes("Não preenchida")), true);
  // Modelos com alcance, definições, EPIs, verificação e ações preventivas imprimem essas seções.
  const todos = new Set(listarModelos().flatMap((modelo) => titulosDaFolha(criar(modelo.id))));
  for (const nova of ["Alcance", "Definições", "EPIs", "Verificação", "Quem realiza", "Ações preventivas", "Ações em caso de não conformidade"]) assert.ok(todos.has(nova), `${nova} aparece em algum modelo`);
});

test("notas para o consultor nunca vão para a folha nem para o PDF", () => {
  let comNotas = 0;
  for (const modelo of listarModelos()) {
    const folha = textoDaFolha(folhaDoPop(criar(modelo.id), { nome: "E", cnpj: "" }));
    for (const nota of modelo.notasParaOConsultor) {
      comNotas += 1;
      assert.equal(folha.includes(nota), false, `${modelo.id}: ${nota.slice(0, 40)}`);
    }
    for (const pendencia of modelo.pendencias) assert.equal(folha.includes(pendencia), false, `${modelo.id} pendência`);
  }
  assert.ok(comNotas > 10);
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.match(editor, /Notas do modelo \(só para o RT\)/);
  assert.match(editor, /className=\{`pop-notas-selo no-print/, "o selo Notas do modelo abre o painel inline (etapa 3)");
  assert.match(ler("../app/globals.css"), /\.pop-notas-painel,\.pop-notas-selo,\.pdoc-proxima\{display:none!important\}/, "nunca no papel");
  assert.match(ler("../app/globals.css"), /\.pop-notas\{display:none!important\}/);
});

test("tabela impressa logo depois do passo que a cita, com a linha de conferir enquanto não conferido", () => {
  for (const [id, titulo] of [["comp-16", "Passos"], ["comp-19", "Passos"]]) {
    const pop = criar(id);
    const folha = folhaDoPop(pop, { nome: "E", cnpj: "" });
    const passos = folha.blocos.find((bloco) => bloco.titulo === titulo);
    const indice = passos.tabelas.findIndex(Boolean);
    assert.ok(indice >= 0, id);
    const passo = pop.conteudo.passos[indice];
    assert.ok(passo.tabela, id);
    assert.equal(passos.tabelas[indice].titulo, pop.conteudo.tabelas.find((tabela) => tabela.id === passo.tabela).titulo);
    assert.equal(passos.tabelas[indice].aviso, "Valores do modelo, a conferir com a norma aplicada.");
    assert.ok(passos.tabelas[indice].linhas.length >= 3 && passos.tabelas[indice].linhas.every((linha) => linha.length === passos.tabelas[indice].colunas.length));
    assert.equal(passos.tabelas.filter(Boolean).length, 1);
    // Conferido: o aviso some.
    const marcados = { ...pop, itensAConferir: pop.itensAConferir.map((item) => ({ ...item, feito: true })) };
    const conferido = marcarComoConferido(marcados, responsavel, "2026-10-21T12:00:00.000Z");
    const depois = folhaDoPop(conferido, { nome: "E", cnpj: "" }).blocos.find((bloco) => bloco.titulo === titulo);
    assert.equal(depois.tabelas[indice].aviso, undefined);
    assert.equal(textoDaFolha(depois).includes("a conferir com a norma aplicada"), false);
  }
  const folha = ler("../components/pc/PopFolha.tsx");
  assert.match(folha, /pfolha-tabela-aviso/);
});

test("capa opcional: desligada por padrão, com código, título, empresa e versão, sem logotipo", () => {
  const pop = criar("comp-04");
  const folha = folhaDoPop(pop, { nome: "Mello Servicos Ltda", cnpj: "00.000.000/0001-00" });
  assert.deepEqual(folha.capa, { codigo: pop.codigo, titulo: pop.titulo, empresa: "Mello Servicos Ltda", versao: "versão 1.0", cnpj: "00.000.000/0001-00" });
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.match(editor, /useState<ModeloDaCapa \| null>\(null\)/, "desligada por padrão: sem capa no papel");
  assert.match(ler("../components/pc/ConfigCapaDoPop.tsx"), /Incluir capa/);
  assert.match(editor, /onClick=\{\(\) => setEscolhendoImpressao\(true\)\}/);
  const componente = ler("../components/pc/PopFolha.tsx");
  assert.match(componente, /capa = null/);
  assert.doesNotMatch(componente, /<img|<svg|logo/i);
  assert.match(ler("../app/globals.css"), /\.pfolha-capa\{display:none\}/);
  assert.match(ler("../app/globals.css"), /@media print\{\s*\n\s*\.pfolha-capa\{display:block/);
});

test("mantém o que foi corrigido antes: cabeçalho corrido enxuto, sem chip de tela no papel", () => {
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.match(editor, /ocultarNoCorpo: \["#pop-folha \.pfolha-topo"\]/);
  assert.match(editor, /direita: \[`\$\{rascunho\.codigo \? `\$\{rascunho\.codigo\} · ` : ""\}versão \$\{rascunho\.versao\}`\]/);
  const folha = folhaDoPop({ codigo: "POP-1", titulo: "T", versao: "1.0", status: "Aprovado", conteudo: { objetivo: "O", passos: [{ id: "1", texto: "p" }] }, aprovacao: { nome: "Maria", cargo: "RT", usuarioId: "u", em: "2026-10-21T15:00:00.000Z", versao: "1.0" } }, { nome: "E", cnpj: "" });
  assert.equal(JSON.stringify(folha).match(/Aprovada por/g).length, 1);
  assert.match(ler("../app/globals.css"), /\.pfolha-aviso,#pop-folha \.pfolha-aviso,\.no-print\{display:none!important\}/);
});

// ===== POPs antigos =====
test("POP antigo sem os campos novos continua igual (folha, comparação e capa sem modelo)", () => {
  const antigo = {
    codigo: "POP-01",
    titulo: "Higienização",
    versao: "1.2",
    status: "Rascunho",
    conteudo: { objetivo: "Objetivo.", campoAplicacao: "Cozinha.", responsavelExecucao: { nome: "Ana", cargo: "Cozinheira" }, frequencia: "Diária", passos: [{ id: "1", texto: "Lavar." }, { id: "2", texto: "Secar." }], acaoCorretiva: "Refazer." },
  };
  const folha = folhaDoPop(antigo, { nome: "E", cnpj: "" });
  assert.deepEqual(folha.blocos.map((bloco) => bloco.titulo), ["Objetivo", "Responsável e frequência", "Passos", "Ação corretiva"]);
  assert.deepEqual(folha.blocos[2].linhas, ["Lavar.", "Secar."]);
  assert.equal(folha.blocos[2].tabelas, undefined);
  assert.equal(popNaoConferido(antigo), false);
  assert.equal(compararVersoes(antigo.conteudo, antigo.conteudo).every((linha) => linha.igual), true);
  assert.equal(compararVersoes(antigo.conteudo, antigo.conteudo).some((linha) => /Materiais|Alcance|EPIs/.test(linha.campo)), false);
});

test("listas do modelo: editar como texto (um item por linha, subitens e grupos) sem perder a tabela citada", () => {
  const itens = ["Item A.", { texto: "Item B:", subitens: ["b1", "b2"] }];
  assert.equal(itensParaTexto(itens), "Item A.\nItem B:\n- b1\n- b2");
  assert.deepEqual(textoParaItens("Item A.\nItem B:\n- b1\n- b2\n\n"), itens);
  assert.deepEqual(textoParaItens("Novo texto\nOutro", [{ texto: "x", tabela: "t1" }]), [{ texto: "Novo texto", tabela: "t1" }, "Outro"]);
  const grupos = [{ titulo: null, itens: ["a"] }, { titulo: "Proprietário", itens: ["b", "c"] }];
  assert.equal(gruposParaTexto(grupos), "a\n# Proprietário\nb\nc");
  assert.deepEqual(textoParaGrupos("a\n# Proprietário\nb\nc"), grupos);
});

test("registros sugeridos: só linha de apoio nos modelos de resíduos e de temperatura (nada implementado)", () => {
  assert.equal(modeloPorId("comp-18").registrosSugeridos.length, 1);
  assert.equal(modeloPorId("res-01").registrosSugeridos.length, 4);
  assert.equal(modeloPorId("comp-01").registrosSugeridos.length, 0);
  assert.match(ler("../components/pc/PcRegistrosDoPop.tsx"), /Registro sugerido: \{descricao\}/);
  assert.doesNotMatch(modeloPorId("comp-18").registrosSugeridos.join(" "), /\d+\s?°C|imagem/i);
});

// ===== Telas =====
test("lista de POPs: '+ Adicionar POP' abre direto a janela de modelos (com 'Começar em branco'); chip âmbar até conferir", () => {
  const lista = ler("../components/pc/PcPopsLista.tsx");
  assert.match(lista, /Começar em branco|onEmBranco/);
  assert.match(lista, /setDeModelo\(true\)/);
  assert.match(lista, /popNaoConferido\(linha\.pop\)/);
  // rodada 12e: a conferência é a etapa 2 do Resumo; o estado do POP aparece como "Etapa N de 6" (sem o chip âmbar na ficha)
  const resumo = ler("../components/pc/PcResumoDoPop.tsx");
  assert.match(resumo, /Para conferir antes de aprovar/);
  assert.match(resumo, /Marcar como conferido/);
  const painel = ler("../components/pc/PcModelosPop.tsx");
  assert.match(painel, /Criar POP/);
  assert.match(painel, /aria-label="Buscar modelo de POP"/);
});

test("guia rápido: modelo, conferência e capa", () => {
  const guia = ler("../conteudo-privado/guias/fonte/guia-rapido.html");
  assert.match(guia, /A partir de modelo/);
  assert.match(guia, /Para conferir antes de aprovar/);
  assert.match(guia, /Incluir capa/);
});
