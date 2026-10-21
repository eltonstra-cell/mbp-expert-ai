import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { avisoDeRelatorioParcial, coberturaDoChecklist, textoDasRespostas, textoDoPercentualConforme, textoRespondidos } from "../lib/cobertura.ts";
import { arquivosEmRelatorioEmitido, emitir, secoesDoPedido, TODAS_AS_SECOES } from "../lib/relatorioEmitido.ts";
import { cssDoDocumentoImpresso, linhasParaCss } from "../lib/printFooter.ts";
import { paginasDasSecoes } from "../lib/indicePaginas.ts";
import { montarDossie, opcoesPadraoDoDossie } from "../lib/dossie.ts";
import { MENSAGEM_POUCOS_DADOS, montarResumo, textoDoResumo } from "../lib/painelHoje.ts";
import { assinarToast, limparToast, mostrarToast, toastAtual } from "../lib/toast.ts";
import {
  MENSAGEM_PASSO_EM_BRANCO,
  criarPopDoTextoBase,
  CONJUNTO_DA_NORMA,
  faltasParaEnviar,
  juntarPassosEmBrancoRepetidos,
  limparCargo,
  limparPassosEmBranco,
} from "../lib/popsNorma.ts";
import {
  agruparPorEmpresa,
  avisoDeVisitaAberta,
  diasDeVisitaAberta,
  gravarGruposRecolhidos,
  lerGruposRecolhidos,
  limiteDeDiasDaVisita,
  motivoParaNaoExcluirVisita,
  textoDeProgressoDaVisita,
  textoDoConteudoDaVisita,
} from "../lib/visitasLista.ts";
import { hasLocalOnlyRecords, localOnlyCounts, mergeForRecovery, textoDaRecuperacao } from "../lib/recovery.ts";
import { contagensDoBackup, createLocalBackup } from "../lib/localBackup.ts";
import { acoesDaVisita } from "../lib/menuActions.ts";
import { resumoDosSetores, separarSetores } from "../lib/manualBase.ts";
import { buscar, construirDestinos } from "../lib/commandSearch.ts";
import { comPerguntasNovasDoModelo, itensDoQuestionario, materializarModelo, perguntasNovasDoModelo } from "../lib/questionarioAmbiente.ts";
import { filtrarEstadoPorUsuario } from "../lib/stateAccess.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
const AGORA = new Date("2026-10-20T15:00:00.000Z");
const usuario = (perfil, extra = {}) => ({ id: `u-${perfil}`, perfil, status: "Ativo", empresaIds: ["e1"], nome: `Nome ${perfil}`, email: "x@x.com", ...extra });

// ===== (c)/(d) cobertura e relatório parcial =====
test("cobertura: 3 de 34 respondidos vira relatório parcial e o percentual vale só para o que foi avaliado", () => {
  const itens = [
    ...Array.from({ length: 31 }, () => ({ status: "Pendente" })),
    { status: "Conforme" },
    { status: "Não Conforme" },
    { status: "Não Conforme" },
  ];
  const c = coberturaDoChecklist(itens);
  assert.equal(c.total, 34);
  assert.equal(c.respondidos, 3);
  assert.equal(c.parcial, true);
  assert.equal(c.percentualConforme, 33);
  assert.equal(avisoDeRelatorioParcial(c), "Relatório parcial: 3 de 34 itens respondidos");
  assert.equal(textoRespondidos(c), "3 de 34 respondidos");
  assert.equal(textoDoPercentualConforme(c), "33% conforme entre os itens avaliados (1 de 3)");
  assert.equal(textoDasRespostas(c), "1 conforme, 2 não conformes");
});

test("cobertura: visita completa não tem aviso; sem itens avaliados não inventa percentual; singular certo", () => {
  const completa = coberturaDoChecklist([{ status: "Conforme" }, { status: "Não se aplica" }]);
  assert.equal(completa.parcial, false);
  assert.equal(avisoDeRelatorioParcial(completa), "");
  assert.equal(completa.percentualConforme, 100);
  assert.equal(textoDasRespostas(completa), "1 conforme, 0 não conformes, 1 não se aplica");
  const nada = coberturaDoChecklist([{ status: "Pendente" }]);
  assert.equal(nada.percentualConforme, null);
  assert.equal(textoDoPercentualConforme(nada), "sem itens avaliados");
  assert.equal(avisoDeRelatorioParcial(nada), "Relatório parcial: 0 de 1 item respondido");
  assert.equal(coberturaDoChecklist(undefined).total, 0);
  assert.equal(textoDasRespostas(coberturaDoChecklist([{ status: "Não Conforme" }])), "0 conformes, 1 não conforme");
});

const base = () => ({
  empresas: {
    e1: {
      id: "e1",
      nomeFantasia: "Padaria",
      cnpj: "00.000.000/0001-00",
      pops: [
        { id: "p1", codigo: "POP-01", titulo: "Higienização", versao: "1.0", status: "Aprovado", programaRelacionado: "", responsavel: "", proximaRevisao: "", aprovacao: { nome: "Marivane", cargo: "N", usuarioId: "u", em: "2026-10-01T10:00:00.000Z", versao: "1.0" } },
        { id: "p2", codigo: "POP-02", titulo: "Pragas", versao: "1.0", status: "Rascunho", programaRelacionado: "", responsavel: "", proximaRevisao: "" },
        { id: "p3", codigo: "POP-09", titulo: "Antigo", versao: "1.0", status: "Rascunho", programaRelacionado: "", responsavel: "", proximaRevisao: "", arquivado: true },
      ],
    },
  },
  empresaAtualId: "e1",
  visitas: [
    {
      id: "v1",
      empresaId: "e1",
      data: "2026-10-10",
      responsavel: "Ana",
      observacoes: "",
      conclusao: "",
      status: "Concluída",
      checklist: [
        { id: "i1", ambiente: "Cozinha", titulo: "Piso", categoria: "Piso", status: "Conforme", observacao: "" },
        { id: "i2", ambiente: "Cozinha", titulo: "Parede", categoria: "Parede", status: "Não Conforme", observacao: "mofo" },
        { id: "i3", ambiente: "Estoque", titulo: "Teto", categoria: "Teto", status: "Pendente", observacao: "" },
      ],
    },
  ],
  ncs: [{ id: "n1", empresaId: "e1", visitaId: "v1", ambiente: "Cozinha", checklistItemId: "i2", titulo: "Parede com mofo", categoria: "Parede", criticidade: "Importante", status: "Aberta", observacao: "", criadoEm: "2026-10-10T10:00:00Z", acaoCorretiva: "Pintar", responsavelAcao: "João", prazo: "2026-11-01" }],
  evidencias: [{ id: "f1", empresaId: "e1", visitaId: "v1", tipo: "Foto", nomeArquivo: "f.jpg", mimeType: "image/jpeg", descricao: "mofo", ambiente: "Cozinha", checklistItemId: "i2", ncId: "n1", blobPathname: "evidencias/v1/f1.jpg", criadoEm: "2026-10-10T10:00:00Z" }],
  usuarios: [],
  registrosAuditoria: [],
  relatoriosEmitidos: [],
});

test("relatório emitido: guarda as seções marcadas, os POPs do dia e a assinatura com CARGO (não o perfil)", () => {
  const admin = usuario("Administrador", { crn: "CRN-2 1", cargo: "Nutricionista RT" });
  const r = emitir(base(), { visitaId: "v1", secoes: { resumo: true, ambientes: false, ncs: true, evidencias: false, pops: true } }, admin, AGORA, "r1");
  assert.equal(r.ok, true);
  assert.deepEqual(r.relatorio.instantaneo.secoes, { resumo: true, ambientes: false, ncs: true, evidencias: false, pops: true });
  assert.equal(r.relatorio.assinatura.cargo, "Nutricionista RT");
  assert.notEqual(r.relatorio.assinatura.cargo, "Administrador");
  // POPs: só os não arquivados, com versão vigente e quem aprovou
  const pops = r.relatorio.instantaneo.pops;
  assert.deepEqual(pops.map((p) => p.codigo), ["POP-01", "POP-02"]);
  assert.equal(pops[0].aprovadoPor, "Marivane");
  assert.equal(pops[1].aprovadoPor, undefined);
  // as correções guardam ação, responsável e prazo
  assert.deepEqual([r.relatorio.instantaneo.ncs[0].acaoCorretiva, r.relatorio.instantaneo.ncs[0].responsavelAcao, r.relatorio.instantaneo.ncs[0].prazo], ["Pintar", "João", "2026-11-01"]);
  // sem o cargo cadastrado: "Responsável técnico", nunca "Administrador"
  const semCargo = emitir(base(), { visitaId: "v1" }, usuario("Administrador"), AGORA, "r2");
  assert.equal(semCargo.relatorio.assinatura.cargo, "Responsável técnico");
  assert.deepEqual(semCargo.relatorio.instantaneo.secoes, TODAS_AS_SECOES);
});

test("seções do pedido: o que não for 'false' vale como ligado; lixo não derruba", () => {
  assert.deepEqual(secoesDoPedido(undefined), TODAS_AS_SECOES);
  assert.deepEqual(secoesDoPedido({ pops: false, ncs: "talvez" }), { resumo: true, ambientes: true, ncs: true, evidencias: true, pops: false });
  assert.deepEqual(secoesDoPedido("texto"), TODAS_AS_SECOES);
});

test("arquivos de foto citados em relatório emitido: o servidor não deixa apagar", () => {
  const r = emitir(base(), { visitaId: "v1" }, usuario("Administrador"), AGORA, "r1");
  const protegidos = arquivosEmRelatorioEmitido([r.relatorio]);
  assert.equal(protegidos.has("evidencias/v1/f1.jpg"), true);
  assert.equal(protegidos.has("evidencias/v1/outra.jpg"), false);
  assert.equal(arquivosEmRelatorioEmitido(undefined).size, 0);
  const rota = ler("../app/api/evidencias/file/route.ts");
  assert.ok(rota.includes("arquivosEmRelatorioEmitido(acesso.data.relatoriosEmitidos).has(pathname)"));
  assert.ok(rota.includes("status: 409"));
});

test("PUT do estado: a lista de relatórios emitidos e as fotos citadas são protegidas no servidor, inclusive para o Administrador", () => {
  const rota = ler("../app/api/state/route.ts");
  assert.ok(rota.includes("relatoriosEmitidos: emitidosNoServidor"));
  assert.ok(rota.includes("preservarEvidenciasEmRelatorio(evidenciasAtuais"));
  // depois do merge por usuário (que devolve tudo ao Administrador): a proteção vem por último
  assert.ok(rota.indexOf("mesclarEstadoPorUsuario(") < rota.indexOf("relatoriosEmitidos: emitidosNoServidor"));
});

// ===== (b) impressão =====
test("impressão: cabeçalho e 'Página X de Y' pelas caixas de margem, com textos protegidos", () => {
  assert.equal(linhasParaCss(["Padaria", "CNPJ 00.000"]), "Padaria\\A CNPJ 00.000");
  assert.equal(linhasParaCss(['Com "aspas" e \\ barra', ""]), 'Com \\"aspas\\" e \\\\ barra');
  const css = cssDoDocumentoImpresso({
    cabecalho: { esquerda: ["Padaria Pão Quente", "CNPJ 00.000.000/0001-00"], direita: ["PC-2026-0042 · versão 2", "Emitido em 20/10/2026", "Motivo da versão: correção do prazo"], rodape: "Não é assinatura digital" },
    comCaixasDeMargem: true,
  });
  assert.ok(css.includes("@top-left") && css.includes("@top-right") && css.includes("@bottom-right"));
  assert.ok(css.includes('"Página " counter(page) " de " counter(pages)'));
  assert.ok(css.includes("PC-2026-0042 · versão 2\\A Emitido em 20/10/2026\\A Motivo da versão: correção do prazo"));
  assert.equal(cssDoDocumentoImpresso({ cabecalho: { esquerda: ["a"], direita: ["b"] }, comCaixasDeMargem: false }), "", "sem suporte: nada de caixas de margem");
});

test("impressão: sem texto cortado com reticências no papel (print) e cada parte do dossiê em página nova", () => {
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".doc-impresso,.doc-impresso *{text-overflow:clip!important;overflow:visible!important}"));
  assert.ok(css.includes("#dossie-pagina .dossie-secao{break-before:page"));
  assert.ok(ler("../app/page.tsx").includes("cssDoDocumentoImpresso"));
  for (const arquivo of ["../components/pc/PcRelatoriosEmitidos.tsx", "../components/pc/PcDossie.tsx", "../components/pc/PcResumo.tsx"]) assert.ok(ler(arquivo).includes("doc-impresso"), arquivo);
});

test("índice do dossiê: capa em página 1, cada parte em página nova, páginas pelo tamanho", () => {
  assert.deepEqual(paginasDasSecoes(300, [500, 1200, 100], 1000), { inicio: [2, 3, 5], total: 5 });
  assert.deepEqual(paginasDasSecoes(1500, [10], 1000), { inicio: [3], total: 3 }, "capa maior que uma página");
  assert.deepEqual(paginasDasSecoes(0, [], 1000), { inicio: [], total: 1 });
});

test("dossiê: cada parte do índice traz a contagem de itens", () => {
  const dados = {
    empresa: { id: "e1", nomeFantasia: "Padaria", razaoSocial: "P", cnpj: "00", pops: base().empresas.e1.pops },
    relatorios: [],
    registros: [{ id: "r1", empresaId: "e1", popId: "p1", popVersao: "1.0", dataHora: "2026-10-10T10:00:00.000Z", responsavel: "A", descricao: "x", criadoEm: "x" }],
    comprovantes: [],
    colaboradores: [],
    capacitacoes: [],
  };
  const dossie = montarDossie(dados, opcoesPadraoDoDossie(), "2026-10-20");
  const por = Object.fromEntries(dossie.indice.map((item) => [item.id, item.contagem]));
  assert.deepEqual(por, { relatorios: 0, pops: 1, registros: 1, comprovantes: 0, capacitacao: 0 });
});

// ===== (d) resumo de uma página =====
test("resumo: percentual só entre itens avaliados, denominador visível e escopos separados", () => {
  const dados = base();
  const painel = { vencidos: 0, vencemEm30Dias: 0, aguardando: 0, itens: [] };
  const resumo = montarResumo({ empresaNome: "Padaria", empresaCnpj: "00", visitas: dados.visitas, ncs: dados.ncs, painel, hoje: "2026-10-20" });
  assert.equal(resumo.empresaCnpj, "00");
  assert.equal(resumo.conformidade.percentual, 50);
  assert.equal(resumo.conformidade.respondidos, 2, "avaliados: conforme + não conforme");
  assert.equal(resumo.conformidade.totalDeItens, 3);
  assert.equal(resumo.conformidade.respondidosNoChecklist, 2);
  assert.equal(resumo.conformidade.parcial, true);
  assert.equal(resumo.conformidade.abertasDaVisita, 1);
  assert.equal(resumo.abertas, 1);
  const texto = textoDoResumo(resumo);
  assert.ok(texto.includes("50% conforme entre os itens avaliados (1 de 2); 2 de 3 itens respondidos (visita parcial)"));
  assert.ok(texto.includes("Da empresa: 1 não conformidade aberta"));
  assert.ok(!texto.includes("1 não conformidades"));
  assert.equal(MENSAGEM_POUCOS_DADOS, "Poucos dados para comparar.");
  const tela = ler("../components/pc/PcResumo.tsx");
  assert.ok(tela.includes("Da visita de") && tela.includes("Da empresa") && tela.includes("TIPO_DO_ITEM"));
});

// ===== (e) toast =====
test("toast: 'Salvo' aparece e some sozinho; aviso tem tipo próprio", async () => {
  limparToast();
  let avisos = 0;
  const parar = assinarToast(() => (avisos += 1));
  mostrarToast("Salvo", { duracaoMs: 20 });
  assert.equal(toastAtual().texto, "Salvo");
  assert.equal(toastAtual().tipo, "ok");
  mostrarToast("Escolha os ambientes", { tipo: "aviso", duracaoMs: 20 });
  assert.equal(toastAtual().tipo, "aviso");
  mostrarToast("   ");
  assert.equal(toastAtual().texto, "Escolha os ambientes", "texto vazio não troca o aviso");
  await new Promise((resolver) => setTimeout(resolver, 60));
  assert.equal(toastAtual(), null);
  assert.ok(avisos >= 3);
  parar();
  limparToast();
  for (const arquivo of ["../components/pc/PcComprovantes.tsx", "../app/page.tsx"]) assert.ok(ler(arquivo).includes("mostrarToast(\"Salvo\")"), arquivo);
});

// ===== (f) POP: passos em branco =====
test("POP: passo em branco não vai para aprovação; repetidos viram um; renumera sem buracos", () => {
  const passos = [{ id: "a", texto: "Lavar" }, { id: "b", texto: "  " }, { id: "c", texto: "" }, { id: "d", texto: "Secar" }];
  assert.deepEqual(limparPassosEmBranco(passos).map((p) => p.id), ["a", "d"]);
  assert.deepEqual(juntarPassosEmBrancoRepetidos(passos).map((p) => p.id), ["a", "b", "d"]);
  const pop = criarPopDoTextoBase(CONJUNTO_DA_NORMA[0], { normasAplicadas: ["rdc-216-2004"], pops: [] }, "p1");
  const comBranco = { ...pop, conteudo: { ...pop.conteudo, frequencia: "diária", responsavelExecucao: { nome: "A", cargo: "B" }, passos } };
  assert.ok(faltasParaEnviar(comBranco).includes(MENSAGEM_PASSO_EM_BRANCO));
  const limpo = { ...comBranco, conteudo: { ...comBranco.conteudo, passos: limparPassosEmBranco(passos) } };
  assert.deepEqual(faltasParaEnviar(limpo), []);
  // todos em branco: só a falta de escrever ao menos um passo
  const todos = { ...comBranco, conteudo: { ...comBranco.conteudo, passos: [{ id: "x", texto: "" }] } };
  assert.deepEqual(faltasParaEnviar(todos), ["Escreva ao menos um passo."]);
  assert.equal(limparCargo(" , Nutricionista  RT "), "Nutricionista RT");
  assert.equal(limparCargo(undefined), "");
});

test("POP: aprovar e assinar pede confirmação com nome e cargo; passos em uma coluna com barra única", () => {
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes("Você está aprovando e assinando este POP como"));
  assert.ok(editor.includes("setConfirmandoAprovacao(true)") && editor.includes("Confirmar") && editor.includes("Cancelar"));
  assert.ok(editor.includes("Rascunho salvo às ${salvoEm}"));
  assert.ok(editor.includes("pdoc-barra-ia") && editor.includes("passos.indexOf(passoFocado)"));
  assert.ok(!editor.includes("PASSOS_POR_PAGINA"), "sem paginar de 5 em 5");
});

// ===== (g)(h) visitas =====
test("visitas: o que existe numa visita sem progresso, e 'aberta há X dias'", () => {
  assert.equal(textoDoConteudoDaVisita({ evidencias: 2, naoConformidades: 1 }), "2 evidências, 1 não conformidade");
  assert.equal(textoDoConteudoDaVisita({ evidencias: 1, naoConformidades: 0 }), "1 evidência");
  assert.equal(textoDoConteudoDaVisita({ evidencias: 0, naoConformidades: 0 }), "");
  assert.equal(textoDeProgressoDaVisita(0, { evidencias: 2, naoConformidades: 1 }), "2 evidências, 1 não conformidade");
  assert.equal(textoDeProgressoDaVisita(0, { evidencias: 0, naoConformidades: 0 }), "0% concluída");
  assert.equal(textoDeProgressoDaVisita(40, { evidencias: 1, naoConformidades: 0 }), "40% do checklist · 1 evidência");
  assert.equal(diasDeVisitaAberta("2026-10-10", "2026-10-13"), 3);
  assert.equal(diasDeVisitaAberta("2026-10-20", "2026-10-13"), 0);
  assert.equal(avisoDeVisitaAberta("Em andamento", "2026-10-10", "2026-10-13", 3), "Aberta há 3 dias");
  assert.equal(avisoDeVisitaAberta("Em andamento", "2026-10-12", "2026-10-13", 3), "");
  assert.equal(avisoDeVisitaAberta("Em andamento", "2026-10-12", "2026-10-13", 1), "Aberta há 1 dia");
  assert.equal(avisoDeVisitaAberta("Concluída", "2020-01-01", "2026-10-13", 3), "");
  assert.equal(limiteDeDiasDaVisita(undefined), 3);
  assert.equal(limiteDeDiasDaVisita(0), 3);
  assert.equal(limiteDeDiasDaVisita(61), 3);
  assert.equal(limiteDeDiasDaVisita(5), 5);
});

test("visitas: agrupadas por empresa (ativa primeiro) e grupos recolhidos lembrados com try/catch", () => {
  const linhas = [
    { id: "1", empresaId: "b", empresa: "Beta", empresaAtiva: false },
    { id: "2", empresaId: "a", empresa: "Alfa", empresaAtiva: false },
    { id: "3", empresaId: "c", empresa: "Zeta", empresaAtiva: true },
    { id: "4", empresaId: "b", empresa: "Beta", empresaAtiva: false },
  ];
  const grupos = agruparPorEmpresa(linhas);
  assert.deepEqual(grupos.map((g) => g.empresa), ["Zeta", "Alfa", "Beta"]);
  assert.deepEqual(grupos[2].itens.map((i) => i.id), ["1", "4"]);
  const memoria = new Map();
  const armazem = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v) };
  gravarGruposRecolhidos(["a", "c"], armazem);
  assert.deepEqual(lerGruposRecolhidos(armazem), ["a", "c"]);
  assert.deepEqual(lerGruposRecolhidos({ getItem: () => "lixo{", setItem: () => {} }), []);
  assert.deepEqual(lerGruposRecolhidos({ getItem: () => { throw new Error("x"); }, setItem: () => {} }), []);
  assert.doesNotThrow(() => gravarGruposRecolhidos(["a"], { getItem: () => null, setItem: () => { throw new Error("x"); } }));
});

test("visitas: exclusão bloqueada sugere Arquivar; relatório emitido nunca deixa excluir; arquivar vira ação do menu", () => {
  const vazia = { respostas: 0, naoConformidades: 0, evidencias: 0, concluida: false, temRelatorioEmitido: false };
  assert.equal(motivoParaNaoExcluirVisita(vazia), "");
  assert.match(motivoParaNaoExcluirVisita({ ...vazia, evidencias: 2 }), /Arquivar/);
  assert.match(motivoParaNaoExcluirVisita({ ...vazia, concluida: true }), /Arquivar/);
  assert.match(motivoParaNaoExcluirVisita({ ...vazia, temRelatorioEmitido: true }), /relatório emitido[\s\S]*Arquivar/);
  assert.match(motivoParaNaoExcluirVisita({ ...vazia, temRelatorioEmitido: true, evidencias: 5 }), /relatório emitido/);
  const base2 = { status: "Em andamento", podeContinuar: true, podeRelatorio: false, podeConcluir: true, podeExcluir: false };
  assert.deepEqual(acoesDaVisita(base2), ["abrir", "encerrar"]);
  assert.deepEqual(acoesDaVisita({ ...base2, podeArquivar: true }), ["abrir", "encerrar", "arquivar"]);
  assert.deepEqual(acoesDaVisita({ ...base2, podeArquivar: true, arquivada: true, podeExcluir: true }), ["abrir", "encerrar", "desarquivar", "excluir"]);
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('usuarioDaSessao.perfil !== "Administrador"') && pagina.includes("visita.excluida") && pagina.includes("Motivo"));
});

test("visitas: o responsável vem preenchido com o usuário atual e o separador de ambientes não soma modelo com empresa", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('responsavel: usuarioDaSessao?.nome || sessaoAtual?.name || "", responsavelIdentificacao'));
  const { doModelo, daEmpresa } = separarSetores(["Cozinha / Produção", "Central de gás", "Churrasqueira do Chico"]);
  assert.equal(daEmpresa.length, 1);
  assert.equal(doModelo.length, 2);
  assert.equal(resumoDosSetores(["Churrasqueira do Chico"]), "0 ambientes do modelo · 1 ambiente próprio da empresa");
  assert.ok(!ler("../components/ManualBaseFields.tsx").includes("setor(es)"));
});

// ===== (i) busca =====
test("busca inteligente acha a Central da Empresa e as sub-abas novas", () => {
  const destinos = construirDestinos({
    itensMenu: [{ key: "pops", rotulo: "POPs e documentos" }, { key: "empresas", rotulo: "Empresas" }],
    empresas: [{ id: "e1", nome: "Padaria" }],
    empresaAtivaId: "e1",
    visitas: [],
    dentroDeVisita: false,
    ambientes: [],
    itensChecklist: [],
    visitaEmAndamentoId: null,
    podeChecklist: false,
    subabasCentral: ["dados", "norma", "privacidade", "ambientes", "fluxos", "manual", "pops", "programas", "comprovantes", "pessoas"],
  });
  const primeiro = (consulta) => buscar(consulta, destinos)[0]?.destino;
  for (const consulta of ["central da empresa", "central", "empresa"]) {
    assert.ok(buscar(consulta, destinos).some((r) => r.destino.id === "ir:central-empresa"), consulta);
  }
  assert.equal(primeiro("dados da empresa").acao.tipo, "central");
  assert.equal(primeiro("dados da empresa").acao.subaba, "dados");
  assert.equal(primeiro("norma").acao.subaba, "norma");
  assert.ok(buscar("pops", destinos).some((r) => r.destino.acao.tipo === "central" && r.destino.acao.subaba === "pops"));
  assert.ok(buscar("pops", destinos).some((r) => r.destino.acao.tipo === "nav" && r.destino.acao.key === "pops"));
  // sem empresa ativa ou sem acesso: o destino não existe
  const sem = construirDestinos({ itensMenu: [], empresas: [], empresaAtivaId: null, visitas: [], dentroDeVisita: false, ambientes: [], itensChecklist: [], visitaEmAndamentoId: null, podeChecklist: false, subabasCentral: ["dados"] });
  assert.equal(sem.some((d) => d.id === "ir:central-empresa"), false);
  // quem só lê não enxerga Dados: só POPs
  const leitor = construirDestinos({ itensMenu: [], empresas: [], empresaAtivaId: "e1", visitas: [], dentroDeVisita: false, ambientes: [], itensChecklist: [], visitaEmAndamentoId: null, podeChecklist: false, subabasCentral: ["pops"] });
  assert.deepEqual(leitor.filter((d) => d.acao.tipo === "central").map((d) => d.acao.subaba).sort(), ["pops", "pops"]);
});

// ===== (j) recuperação e backup =====
test("recuperação e backup contam e mesclam as coleções novas", () => {
  const vazio = { empresas: {}, empresaAtualId: null, visitas: [], ncs: [], evidencias: [] };
  const local = {
    ...vazio,
    registrosPop: [{ id: "r1" }, { id: "r2" }],
    comprovantes: [{ id: "c1" }],
    colaboradores: [{ id: "p1" }],
    capacitacoes: [{ id: "k1" }, { id: "k2" }, { id: "k3" }],
    leiturasPop: [{ id: "l1" }],
    relatoriosEmitidos: [{ id: "e1" }],
  };
  const nuvem = { ...vazio, registrosPop: [{ id: "r1" }], comprovantes: [{ id: "c1" }] };
  const contagens = localOnlyCounts(local, nuvem);
  assert.deepEqual(contagens, { empresas: 0, visitas: 0, ncs: 0, evidencias: 0, registrosPop: 1, comprovantes: 0, colaboradores: 1, capacitacoes: 3, leiturasPop: 1, relatoriosEmitidos: 1 });
  assert.equal(hasLocalOnlyRecords(contagens), true);
  assert.equal(hasLocalOnlyRecords(localOnlyCounts(nuvem, nuvem)), false);
  const mesclado = mergeForRecovery(local, nuvem);
  assert.deepEqual(mesclado.registrosPop.map((i) => i.id).sort(), ["r1", "r2"]);
  assert.equal(mesclado.capacitacoes.length, 3);
  // o que só a nuvem tem não some quando o local não tem a coleção
  assert.deepEqual(mergeForRecovery(vazio, nuvem).registrosPop.map((i) => i.id), ["r1"]);
  assert.equal(textoDaRecuperacao({ ...contagens, empresas: 1 }), "1 empresa, 1 registro por POP, 1 pessoa da equipe, 3 capacitações e 1 leitura de POP");
  assert.equal(textoDaRecuperacao({ ...contagens, registrosPop: 0, colaboradores: 0, capacitacoes: 0, leiturasPop: 0 }), "nenhum registro");
  const backup = createLocalBackup({ ...local, empresas: { a: {} } }, "2026-10-20T00:00:00.000Z");
  assert.deepEqual(backup.contagens, contagensDoBackup({ ...local, empresas: { a: {} } }));
  assert.equal(backup.contagens.registrosPop, 2);
  assert.equal(backup.contagens.relatoriosEmitidos, 1);
  assert.equal(backup.data.capacitacoes.length, 3);
});

// ===== (j) perguntas novas do modelo =====
test("pergunta nova do modelo entra no ambiente já editado: ativa, marcada como nova, sem apagar edições", () => {
  const modeloAntigo = [{ categoria: "Piso", titulo: "Piso limpo" }, { categoria: "Parede", titulo: "Parede sem mofo" }];
  const config0 = materializarModelo(modeloAntigo, "Cozinha", "2026-01-01T00:00:00.000Z");
  // a empresa desligou uma pergunta e escreveu a sua
  const editada = {
    ...config0,
    perguntas: [
      ...config0.perguntas.map((p) => (p.titulo === "Parede sem mofo" ? { ...p, ativa: false, justificativaDeDesligar: "não tem parede" } : p)),
      { id: "emp-1", origem: "empresa", titulo: "Pergunta da casa", categoria: "Casa", ativa: true, ordem: 2, criadoEm: "x" },
    ],
  };
  const modeloNovo = [...modeloAntigo, { categoria: "Teto", titulo: "Teto sem goteira", criticidade: "Importante" }];
  assert.deepEqual(perguntasNovasDoModelo(editada, modeloNovo).map((i) => i.titulo), ["Teto sem goteira"]);
  const mesclada = comPerguntasNovasDoModelo(editada, modeloNovo, "2026-10-20T00:00:00.000Z");
  const nova = mesclada.perguntas.find((p) => p.titulo === "Teto sem goteira");
  assert.deepEqual([nova.ativa, nova.nova, nova.origem], [true, true, "modelo"]);
  // edições da empresa intactas
  assert.equal(mesclada.perguntas.find((p) => p.titulo === "Parede sem mofo").ativa, false);
  assert.ok(mesclada.perguntas.some((p) => p.id === "emp-1"));
  assert.equal(mesclada.perguntas.length, editada.perguntas.length + 1);
  // sem pergunta nova: mesmo objeto; idempotente
  assert.equal(comPerguntasNovasDoModelo(editada, modeloAntigo, "x"), editada);
  assert.equal(comPerguntasNovasDoModelo(mesclada, modeloNovo, "y"), mesclada);
  // o checklist usa as vigentes + a nova, sem a desligada
  const titulos = itensDoQuestionario(editada, modeloNovo).map((i) => i.titulo);
  assert.deepEqual(titulos, ["Piso limpo", "Pergunta da casa", "Teto sem goteira"].sort((a, b) => titulos.indexOf(a) - titulos.indexOf(b)));
  assert.ok(titulos.includes("Teto sem goteira") && !titulos.includes("Parede sem mofo"));
  // sem o modelo informado o comportamento antigo continua
  assert.equal(itensDoQuestionario(editada).some((i) => i.titulo === "Teto sem goteira"), false);
});

// ===== (j) Fiscal =====
test("Fiscal recebe os relatórios emitidos da empresa e vê a tela de leitura, sem pessoas", () => {
  const dados = base();
  const rt = usuario("Administrador");
  dados.relatoriosEmitidos = [emitir(dados, { visitaId: "v1" }, rt, AGORA, "r1").relatorio];
  dados.comprovantes = [];
  const fiscal = filtrarEstadoPorUsuario(dados, usuario("Fiscal", { validoAte: "2099-12-31T23:59:59-03:00" }));
  assert.equal(fiscal.relatoriosEmitidos.length, 1);
  assert.equal(fiscal.relatoriosEmitidos[0].numero, "PC-2026-0001");
  assert.deepEqual(fiscal.empresas.e1.pops.map((p) => p.id), ["p1"], "só POP aprovado");
  assert.equal((fiscal.colaboradores || []).length, 0);
  assert.equal((fiscal.capacitacoes || []).length, 0);
  const fiscalVencido = filtrarEstadoPorUsuario(dados, usuario("Fiscal", { validoAte: "2020-01-01T00:00:00-03:00" }));
  assert.equal(Object.keys(fiscalVencido.empresas).length, 0, "fora da validade não vê nada");
  const tela = ler("../components/FiscalInicio.tsx");
  assert.ok(tela.includes("onAbrirRelatorios") && tela.includes("Relatórios emitidos"));
  const executor = filtrarEstadoPorUsuario(dados, usuario("Executor de campo"));
  assert.equal(executor.relatoriosEmitidos.length, 0);
});

// ===== (a) a página rola até o fim =====
test("causa da rolagem cortada: o contêiner das telas rola em vez de esconder o que passa da altura", () => {
  const css = ler("../app/globals.css");
  const ultimo = css.lastIndexOf(':is(html[data-modo="completo"],html[data-modo="equilibrado"]) .pc-offset:has(.ui-screen){height:100vh;overflow-x:hidden;overflow-y:auto}');
  const antigo = css.indexOf(':is(html[data-modo="completo"],html[data-modo="equilibrado"]) .pc-offset:has(.ui-screen){height:100vh;overflow:hidden}');
  assert.ok(ultimo > antigo && antigo >= 0, "a regra nova vem depois da antiga e a substitui");
  assert.ok(css.includes('html[data-modo="campo"] .ui-screen{overflow-x:hidden;overflow-y:auto}'));
  assert.ok(css.includes(".ui-screen>.ui-scroll{min-height:min(200px,40vh)}"));
});
