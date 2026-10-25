import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { SETORES_OFICIAIS_MANUAL, criarModelosQuestionarioAmbientes } from "../lib/manualBase.ts";
import { ambientesParaVisita } from "../lib/ambientesVisita.ts";
import { criarFluxosOperacionaisPadrao, adequarFluxosAosSetores, obterCriteriosOperacionaisParaSetor, PERGUNTAS_POR_FLUXO } from "../lib/operationalFlows.ts";
import { itensDoAmbiente, perguntasDoAmbiente } from "../lib/perguntasDoAmbiente.ts";
import { modelosChecklist } from "../lib/checklistModelosAntigos.ts";
import {
  FORMULA_DA_COMPARACAO,
  FORMULA_DA_PONTUACAO,
  compararComAnterior,
  estadoDoRelatorio,
  marcasDeRegistro,
  montarRelatorio,
  pontuacaoPorSetor,
  resumoDaVisita,
} from "../lib/relatorioDaVisita.ts";
import { cartaoParaRelatorio, corDoAmbiente, mapaDeRisco, ordenarPorUrgencia, tendenciaDoAmbiente, criteriosReincidentes } from "../lib/mapaDeRisco.ts";
import { emitir } from "../lib/relatorioEmitido.ts";
import { linhasDeTemperaturaDoRelatorio } from "../lib/limitesDeTemperatura.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
const item = (id, ambiente, titulo, status, extra = {}) => ({ id, ambiente, titulo, categoria: "Cat", status, criticidade: "Importante", ...extra });
const visita = (id, data, checklist, extra = {}) => ({ id, empresaId: "e1", data, criadoEm: `${data}T10:00:00.000Z`, checklist, ...extra });
const nc = (id, visitaId, ambiente, titulo, criticidade, status, extra = {}) => ({ id, empresaId: "e1", visitaId, ambiente, categoria: "Cat", titulo, criticidade, status, ...extra });
// Dados SIMULADOS: nenhuma empresa real.

// ===== A1 =====
test("A1: sem o setor padrão na empresa, o fluxo fica SEM setor (nenhum chute); não soma perguntas e a tela pede a escolha", () => {
  const todos = criarFluxosOperacionaisPadrao().map((fluxo) => ({ ...fluxo, aplicavel: true }));
  const so = adequarFluxosAosSetores(todos, ["Meu Salão", "Minha Cozinha"]);
  assert.deepEqual(so.map((fluxo) => fluxo.setorVinculado), Array(11).fill(""), "nenhum setor padrão existe: todos ficam sem setor");
  assert.equal(obterCriteriosOperacionaisParaSetor(so, "Meu Salão").length, 0);
  // com o setor padrão existente, o Manual vale; o vínculo já salvo e existente não muda
  const comCozinha = adequarFluxosAosSetores(todos, [SETORES_OFICIAIS_MANUAL[4]]);
  assert.equal(comCozinha.find((fluxo) => fluxo.tipo === "Manipulação e produção").setorVinculado, SETORES_OFICIAIS_MANUAL[4]);
  assert.equal(comCozinha.find((fluxo) => fluxo.tipo === "Recebimento").setorVinculado, "", "Recebimento não existe na empresa: sem setor");
  const salvo = todos.map((fluxo) => (fluxo.tipo === "Distribuição" ? { ...fluxo, setorVinculado: "Meu Salão" } : fluxo));
  assert.equal(adequarFluxosAosSetores(salvo, ["Meu Salão"]).find((fluxo) => fluxo.tipo === "Distribuição").setorVinculado, "Meu Salão");
  assert.ok(ler("../components/OperationalFlowsFields.tsx").includes("Escolha o setor deste fluxo"));
});

// ===== A2 / A3 =====
test("A2: o número de perguntas do Cadastro é o da visita, para qualquer ambiente (inclusive os 5 nomes do mapa antigo)", () => {
  for (const nome of ["Câmara refrigerada", "Câmara de congelamento", "Sanitários / Vestiários", "Área de resíduos", "Área externa"]) {
    assert.equal(modelosChecklist[nome].length, 5, nome);
    assert.equal(perguntasDoAmbiente(nome), 5, `${nome}: a visita traz 5`);
    assert.equal(itensDoAmbiente(nome).length, 5);
  }
  assert.equal(perguntasDoAmbiente("Varanda"), 3, "nome próprio comum: questionário básico");
  assert.equal(perguntasDoAmbiente(SETORES_OFICIAIS_MANUAL[6]), 11);
  // fluxos ligados entram na conta
  const fluxos = criarFluxosOperacionaisPadrao().map((fluxo) => (fluxo.tipo === "Congelamento" ? { ...fluxo, aplicavel: true, setorVinculado: "Varanda" } : fluxo));
  assert.equal(perguntasDoAmbiente("Varanda", { fluxos }), 3 + PERGUNTAS_POR_FLUXO);
  const campos = ler("../components/ManualBaseFields.tsx");
  assert.ok(campos.includes("perguntasDoAmbiente(nome") && campos.includes("textoDaConta(setor)") && campos.includes("cadamb-conta"));
  assert.equal(campos.includes("PERGUNTAS_DO_QUESTIONARIO_BASICO_VISITA"), false, "nada de número fixo 3 no Cadastro");
  // a visita usa a MESMA função
  assert.ok(ler("../app/page.tsx").includes("itensDoAmbiente(ambiente, { modelosQuestionario, questionarios, fluxos: fluxosOperacionais })"));
});

test("A3: 'Salão' vinculado a 'Refeitório e salão de consumação', setor oficial DESMARCADO, nova visita: recebe 11 perguntas (as do setor)", () => {
  const refeitorio = SETORES_OFICIAIS_MANUAL[6];
  const setoresDaEmpresa = ["Salão"]; // o setor oficial NÃO está marcado
  const vinculos = { Salão: refeitorio };
  const ambientesDaVisita = ambientesParaVisita(setoresDaEmpresa, vinculos);
  assert.deepEqual(ambientesDaVisita, ["Salão"]);
  const modelos = criarModelosQuestionarioAmbientes(ambientesDaVisita, {}, vinculos);
  assert.equal(modelos["Salão"], refeitorio);
  assert.equal(itensDoAmbiente("Salão", { modelosQuestionario: modelos }).length, 11);
  // sem o vínculo (o RT tira): questionário básico, 3 perguntas
  assert.equal(itensDoAmbiente("Salão", { modelosQuestionario: criarModelosQuestionarioAmbientes(["Salão"], {}, {}) }).length, 3);
});

// ===== Pontuação =====
test("pontuação do setor: conformes ÷ (conformes + não conformes); Não se aplica e sem resposta ficam fora; NC nunca escondida", () => {
  const itens = [
    item("1", "Cozinha", "a", "Conforme"),
    item("2", "Cozinha", "b", "Conforme"),
    item("3", "Cozinha", "c", "Não Conforme"),
    item("4", "Cozinha", "d", "Não se aplica"),
    item("5", "Cozinha", "e", "Pendente"),
    item("6", "Estoque", "f", "Pendente"),
    item("7", "Estoque", "g", "Não se aplica"),
  ];
  const [cozinha, estoque] = pontuacaoPorSetor(itens);
  assert.deepEqual([cozinha.conformes, cozinha.naoConformes, cozinha.naoSeAplica, cozinha.semResposta, cozinha.avaliados, cozinha.percentual], [2, 1, 1, 1, 3, 67]);
  assert.equal(estoque.percentual, null, "sem item avaliado não existe pontuação (nem 0% nem 100%)");
  assert.equal(estoque.semResposta, 1);
  assert.ok(FORMULA_DA_PONTUACAO.includes("conformes ÷ (itens conformes + itens não conformes)") && FORMULA_DA_PONTUACAO.includes("nunca valem como conformes"));
  // item sem resposta nunca vira conforme
  const soPendentes = pontuacaoPorSetor([item("1", "Cozinha", "a", "Pendente")])[0];
  assert.equal(soPendentes.conformes, 0);
  assert.equal(soPendentes.percentual, null);
  // o relatório não inventa faixa nem aprovado/reprovado
  const textoVisivel = ler("../components/RelatorioMontadoVista.tsx") + FORMULA_DA_PONTUACAO + FORMULA_DA_COMPARACAO;
  assert.equal(/aprovad[oa]|reprovad[oa]|nota de corte/i.test(textoVisivel), false);
});

test("resumo da visita: só contas sobre o que foi registrado, com correções abertas, prazo e responsável", () => {
  const v = visita("v1", "2026-10-10", [item("1", "Cozinha", "a", "Conforme"), item("2", "Cozinha", "b", "Não Conforme"), item("3", "Cozinha", "c", "Pendente"), item("4", "Cozinha", "d", "Não se aplica")], { ambientes: ["Cozinha"] });
  const ncs = [nc("n1", "v1", "Cozinha", "b", "Crítica", "Aberta", { prazo: "2026-10-01", responsavelAcao: "Ana" }), nc("n2", "v1", "Cozinha", "x", "Rotina", "Resolvida")];
  const r = resumoDaVisita(v, ncs, "2026-10-20");
  assert.deepEqual([r.total, r.respondidos, r.conformes, r.naoConformes, r.naoSeAplica, r.semResposta], [4, 3, 1, 1, 1, 1]);
  assert.equal(r.correcoesAbertas.length, 1);
  assert.deepEqual([r.correcoesAbertas[0].vencida, r.correcoesAbertas[0].responsavel, r.correcoesAbertas[0].prazo], [true, "Ana", "2026-10-01"]);
});

// ===== Comparação =====
test("comparação: só com as mesmas perguntas; senão 'sem visita comparável' e nada estimado", () => {
  const antes = visita("v1", "2026-09-10", [item("1", "Cozinha", "a", "Conforme"), item("2", "Cozinha", "b", "Não Conforme"), item("3", "Cozinha", "c", "Não Conforme"), item("1", "Estoque", "x", "Conforme")]);
  const agora = visita("v2", "2026-10-10", [item("1", "Cozinha", "a", "Conforme"), item("2", "Cozinha", "b", "Conforme"), item("3", "Cozinha", "c", "Não Conforme"), item("9", "Cozinha", "d", "Conforme"), item("1", "Estoque", "x", "Conforme"), item("1", "Varanda", "v", "Conforme")]);
  const [cozinha, estoque, varanda] = compararComAnterior(agora, [antes, agora]);
  assert.equal(cozinha.comparavel, false, "a Cozinha ganhou uma pergunta: não é comparável");
  assert.equal(cozinha.texto, "sem visita comparável");
  assert.equal(cozinha.motivo, "perguntas mudaram");
  assert.equal(estoque.comparavel, true);
  assert.equal(varanda.comparavel, false);
  assert.equal(varanda.motivo, "setor novo");
  // mesmas perguntas: diferença e NCs resolvidas, mantidas e novas
  const agora2 = visita("v3", "2026-10-20", [item("1", "Cozinha", "a", "Não Conforme"), item("2", "Cozinha", "b", "Conforme"), item("3", "Cozinha", "c", "Não Conforme")]);
  const [c2] = compararComAnterior(agora2, [antes, agora2]);
  assert.equal(c2.comparavel, true);
  assert.deepEqual([c2.anterior, c2.atual, c2.diferenca, c2.resolvidas, c2.mantidas, c2.novas], [33, 33, 0, 1, 1, 1]);
  assert.equal(c2.visitaDaComparacao, "2026-09-10");
  assert.ok(FORMULA_DA_COMPARACAO.includes("sem visita comparável"));
  // arquivada não conta; primeira visita: tudo "setor novo"
  const [primeira] = compararComAnterior(antes, [antes]);
  assert.equal(primeira.comparavel, false);
});

// ===== Marcas de registro honesto =====
test("marcas de registro: lote, voz, avanço automático, temperatura classificada e gravidade sugerida mantida", () => {
  const itens = [
    item("1", "Cozinha", "a", "Conforme", { lote: { em: "x" } }),
    item("2", "Cozinha", "b", "Conforme", { porVoz: true }),
    item("3", "Cozinha", "c", "Conforme", { avancouSozinho: true }),
    item("4", "Cozinha", "d", "Pendente", { avancouSozinho: true }),
    item("5", "Cozinha", "e", "Conforme", { temperatura: { valor: 4, limiteId: "refrigerado" } }),
    item("6", "Cozinha", "f", "Não Conforme", { criticidade: "Crítica" }),
    item("7", "Cozinha", "g", "Não Conforme", { criticidade: "Rotina", criticidadeSugerida: "Importante" }),
  ];
  const marcas = marcasDeRegistro(itens);
  assert.deepEqual(marcas, { lote: 1, porVoz: 1, avancoAutomatico: 1, temperaturaClassificada: 1, gravidadeSugeridaMantida: 1, naoConformes: 2 });
  const linhas = linhasDeTemperaturaDoRelatorio([item("5", "Cozinha", "Temperatura da câmara", "Conforme", { temperatura: { valor: 4, limiteId: "refrigerado" } })]);
  assert.match(linhas[0], /classificado pelo app, confirmado pelo RT/);
  assert.match(linhas[0], /Portaria SES\/RS.*item .*conferido em \d{2}\/\d{2}\/\d{4}/, "norma, item e data de conferência");
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("atualizarChecklistItem(item.id, { avancouSozinho: true })"));
  assert.ok(pagina.includes('patch.status !== undefined && item.avancouSozinho'), "a marca some quando o RT responde de novo");
});

// ===== Rascunho, emitido, nova versão =====
const dadosParaEmitir = () => ({
  empresas: { e1: { id: "e1", nomeFantasia: "Empresa de Teste", cnpj: "00.000.000/0001-00", municipio: "Porto Alegre", uf: "RS", pops: [], setoresManual: ["Cozinha"] } },
  empresaAtualId: "e1",
  visitas: [
    visita("v0", "2026-09-10", [item("1", "Cozinha", "a", "Conforme"), item("2", "Cozinha", "b", "Não Conforme")], { responsavel: "Ana", observacoes: "", conclusao: "", status: "Concluída" }),
    visita("v1", "2026-10-10", [item("1", "Cozinha", "a", "Conforme"), item("2", "Cozinha", "b", "Conforme", { avancouSozinho: true }), item("3", "Cozinha", "c", "Pendente")].slice(0, 2), { responsavel: "Ana", observacoes: "", conclusao: "", status: "Concluída" }),
  ],
  ncs: [nc("n0", "v0", "Cozinha", "b", "Importante", "Aberta", { prazo: "2026-09-30", criadoEm: "2026-09-10T10:00:00Z" })],
  evidencias: [],
  usuarios: [],
  registrosAuditoria: [],
  relatoriosEmitidos: [],
});
const RT = { id: "u1", perfil: "Consultor/RT", status: "Ativo", empresaIds: ["e1"], nome: "RT de Teste", email: "rt@teste.example", crn: "CRN-2 1" };

test("rascunho até o RT emitir; emitido com o relatório montado e SEM parecer escrito pelo app; nova versão sem apagar a anterior", () => {
  const dados = dadosParaEmitir();
  assert.deepEqual(estadoDoRelatorio(dados.relatoriosEmitidos, "v1"), { estado: "Rascunho" });
  const v1 = emitir(dados, { visitaId: "v1" }, RT, new Date("2026-10-20T15:00:00Z"), "r1");
  assert.equal(v1.ok, true);
  const montado = v1.relatorio.instantaneo.montado;
  assert.ok(montado, "o instantâneo guarda o relatório montado");
  assert.equal(v1.relatorio.instantaneo.visita.conclusao, "", "o app não escreve parecer: o campo fica vazio até o RT escrever");
  assert.equal(montado.pontuacao[0].percentual, 100);
  assert.equal(montado.comparacao[0].comparavel, true);
  assert.equal(montado.comparacao[0].resolvidas, 1, "a NC da visita anterior está conforme agora");
  assert.equal(montado.marcas.avancoAutomatico, 1);
  assert.ok(montado.mapa.length >= 1 && montado.mapa[0].cor);
  assert.match(montado.formulaDaPontuacao, /Não se aplica/);
  dados.relatoriosEmitidos = v1.relatorios;
  const estado = estadoDoRelatorio(dados.relatoriosEmitidos, "v1");
  assert.equal(estado.estado, "Emitido");
  assert.equal(estado.versao, 1);
  assert.equal(emitir(dados, { visitaId: "v1" }, RT, new Date(), "r2").status, 409, "emitido: para mudar só com nova versão");
  dados.visitas[1].conclusao = "Parecer escrito pelo RT.";
  const v2 = emitir(dados, { visitaId: "v1", novaVersao: true, motivo: "Parecer incluído" }, RT, new Date("2026-10-21T10:00:00Z"), "r2");
  assert.equal(v2.ok, true);
  assert.equal(v2.relatorios.length, 2, "a versão 1 continua guardada");
  assert.equal(v2.relatorios[0].instantaneo.visita.conclusao, "", "a versão 1 não muda");
  assert.equal(v2.relatorio.instantaneo.visita.conclusao, "Parecer escrito pelo RT.");
  assert.equal(estadoDoRelatorio(v2.relatorios, "v1").versao, 2);
});

test("o app não escreve parecer: sem 'sugestão automática', sem preenchimento ao finalizar; 'Parecer do RT' começa vazio", () => {
  const pagina = ler("../app/page.tsx");
  assert.equal(pagina.includes("gerarConclusaoAutomatica"), false);
  assert.equal(pagina.includes("Gerar sugestão automática"), false);
  assert.ok(pagina.includes("O app não escreve parecer nem conclusão"));
  const vista = ler("../components/RelatorioMontadoVista.tsx");
  assert.ok(vista.includes("Parecer do RT") && vista.includes("Como se calcula") && vista.includes("Como se compara") && vista.includes("critério do app") === false ? vista.includes("dados.criterio") : true);
  assert.ok(ler("../components/pc/PcRelatorio.tsx").includes("Confirmar e emitir") && ler("../components/pc/PcRelatorio.tsx").includes("Revisar"));
  assert.ok(pagina.includes("setRevisaoAberta(true)"), "ao finalizar a visita abre a revisão do rascunho");
  assert.ok(ler("../components/pc/PcRelatoriosEmitidos.tsx").includes("RelatorioMontadoVista") && ler("../components/pc/PcRelatoriosEmitidos.tsx").includes("fonteParaExibir(nc.referencia)"));
});

test("montarRelatorio é puro e funciona só com dados locais (sem rede)", () => {
  const dados = dadosParaEmitir();
  const a = montarRelatorio({ visita: dados.visitas[1], visitas: dados.visitas, ncs: dados.ncs, hoje: "2026-10-20" });
  const b = montarRelatorio({ visita: dados.visitas[1], visitas: dados.visitas, ncs: dados.ncs, hoje: "2026-10-20" });
  assert.deepEqual(a, b);
  assert.equal(a.fontes.semFonte, 2, "itens sem referência registrada aparecem como 'Fonte não registrada'");
});

// ===== Mapa de risco =====
test("regra da cor e motivo: cinza sem dados; vermelho com NC crítica aberta; laranja com correção vencida ou reincidência; amarelo com NC aberta; azul sem NC aberta", () => {
  const hoje = "2026-10-20";
  const nenhum = new Set();
  const base = { hoje, reincidentes: nenhum, teveAvaliacao: true };
  assert.deepEqual(corDoAmbiente({ ...base, ncsAbertas: [], teveAvaliacao: false }), { cor: "cinza", motivo: "sem dados" });
  assert.deepEqual(corDoAmbiente({ ...base, ncsAbertas: [] }), { cor: "azul", motivo: "nenhuma NC aberta" });
  assert.deepEqual(corDoAmbiente({ ...base, ncsAbertas: [nc("1", "v", "A", "t", "Rotina", "Aberta")] }), { cor: "amarelo", motivo: "1 NC aberta" });
  assert.equal(corDoAmbiente({ ...base, ncsAbertas: [nc("1", "v", "A", "t", "Rotina", "Aberta", { prazo: "2026-10-01" })] }).cor, "laranja");
  const critica = corDoAmbiente({ ...base, ncsAbertas: [nc("1", "v", "A", "t1", "Crítica", "Aberta"), nc("2", "v", "A", "t2", "Importante", "Aberta", { prazo: "2026-10-01" }), nc("3", "v", "A", "t3", "Rotina", "Aberta", { prazo: "2026-10-02" })] });
  assert.deepEqual(critica, { cor: "vermelho", motivo: "1 NC crítica aberta, 2 correções vencidas" });
  // resolvida e prazo de hoje não contam
  assert.equal(corDoAmbiente({ ...base, ncsAbertas: [] }).cor, "azul");
  assert.equal(corDoAmbiente({ ...base, ncsAbertas: [nc("1", "v", "A", "t", "Rotina", "Aberta", { prazo: "2026-10-20" })] }).cor, "amarelo", "vence hoje ainda não está vencida");
  // reincidência: mesmo critério aberto em 2 visitas
  const ncs = [nc("1", "v1", "A", "t", "Rotina", "Aberta"), nc("2", "v2", "A", "t", "Rotina", "Aberta")];
  const reincidentes = criteriosReincidentes(ncs);
  assert.equal(reincidentes.size, 1);
  assert.deepEqual(corDoAmbiente({ ...base, ncsAbertas: [ncs[1]], reincidentes }), { cor: "laranja", motivo: "1 reincidência" });
});

test("mapa de risco: um cartão por ambiente, ambiente sem dado fica cinza, nada de verde, e a cor não depende de nota de corte", () => {
  const v1 = visita("v1", "2026-09-10", [item("1", "Cozinha", "a", "Conforme"), item("2", "Cozinha", "b", "Não Conforme")]);
  const v2 = visita("v2", "2026-10-10", [item("1", "Cozinha", "a", "Conforme"), item("2", "Cozinha", "b", "Conforme")]);
  const ncs = [nc("n1", "v1", "Cozinha", "b", "Crítica", "Aberta")];
  const cartoes = mapaDeRisco({ empresaId: "e1", visitas: [v1, v2], ncs, hoje: "2026-10-20", ambientesCadastrados: ["Cozinha", "Depósito novo"] });
  const cozinha = cartoes.find((c) => c.ambiente === "Cozinha");
  const novo = cartoes.find((c) => c.ambiente === "Depósito novo");
  assert.equal(cozinha.cor, "vermelho");
  assert.equal(cozinha.motivo, "1 NC crítica aberta");
  assert.equal(cozinha.pontuacao.percentual, 100);
  assert.deepEqual(cozinha.tendencia.serie.map((p) => p.percentual), [50, 100]);
  assert.equal(cozinha.tendencia.sentido, "subiu");
  assert.equal(novo.cor, "cinza");
  assert.equal(novo.pontuacao, null);
  assert.equal(novo.tendencia.texto, "sem visita comparável");
  assert.deepEqual(ordenarPorUrgencia(cartoes).map((c) => c.cor), ["vermelho", "cinza"]);
  assert.deepEqual(cartaoParaRelatorio(cozinha).ncsAbertas.map((n) => n.titulo), ["b"]);
  const css = ler("../app/globals.css");
  for (const cor of ["vermelho", "laranja", "amarelo", "azul", "cinza"]) assert.ok(css.includes(`.mr-cartao--${cor}{background:#`), cor);
  assert.equal(/\.mr-cartao--verde/.test(css), false);
  assert.ok(ler("../components/pc/PcMapaDeRisco.tsx").includes("Ver a regra") && ler("../components/pc/PcMapaDeRisco.tsx").includes("quem decide é o RT"));
});

test("tendência só com visitas comparáveis (mesmas perguntas); com perguntas diferentes: 'sem visita comparável'", () => {
  const v1 = visita("v1", "2026-09-10", [item("1", "Cozinha", "a", "Conforme"), item("2", "Cozinha", "b", "Não Conforme")]);
  const v2 = visita("v2", "2026-10-10", [item("1", "Cozinha", "a", "Conforme"), item("2", "Cozinha", "b", "Conforme"), item("3", "Cozinha", "novo", "Conforme")]);
  assert.equal(tendenciaDoAmbiente("Cozinha", [v1, v2]).texto, "sem visita comparável");
  assert.equal(tendenciaDoAmbiente("Inexistente", [v1, v2]).texto, "sem visita comparável");
});

test("o mapa está em Relatórios (aba), no Início do celular e dentro do relatório; é informação, não decide nada", () => {
  assert.ok(ler("../components/pc/RelatoriosAbas.tsx").includes('mapa: "Mapa de risco"'));
  assert.ok(ler("../app/page.tsx").includes('abasDeRelatorios("mapa")') && ler("../app/page.tsx").includes("onMapa={() => setView(\"mapa\")}"));
  assert.ok(ler("../lib/mapaDeRisco.ts").includes("NÃO altera o") || ler("../lib/mapaDeRisco.ts").includes("a cor NÃO altera"));
  assert.ok(ler("../lib/relatorioEmitido.ts").includes("montado.mapa"));
});
