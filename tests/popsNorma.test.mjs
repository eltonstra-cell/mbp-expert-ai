import assert from "node:assert/strict";
import test from "node:test";

import { CATALOGO_DE_NORMAS, MENSAGEM_SEM_NORMA, normaPorId, normasDisponiveis, normasDaEmpresa, versoesDoCatalogo } from "../lib/normas/index.ts";
import { popsDaVisita } from "../lib/pops.ts";
import {
  aprovarPop,
  compararVersoes,
  conjuntoDaEmpresa,
  criarPopDoTextoBase,
  criarPopsFaltantesDoConjunto,
  enviarParaAprovacao,
  faltasParaEnviar,
  iniciarNovaVersao,
  linhasDoConjunto,
  motivoParaNaoAprovar,
  podeAprovarPop,
  popPrecisaRevisarPorNorma,
  popsComNormaAlterada,
  proximaVersao,
  situacaoDoPop,
  textoDaFaixaDoTextoBase,
  validarAprovacoesDePop,
} from "../lib/popsNorma.ts";
import { mesclarEstadoPorUsuario } from "../lib/stateAccess.ts";

const empresaRS = (extra = {}) => ({ id: "e1", uf: "RS", normasAplicadas: ["rdc-216-2004", "ses-799-2023-rs"], pops: [], responsavelEstabelecimento: { nome: "Carla Dona", cargo: "Proprietária", usuarioId: "u-resp" }, ...extra });
const resp = { id: "u-resp", nome: "Carla Dona", status: "Ativo" };
const outro = { id: "u-rt", nome: "Rita RT", status: "Ativo" };
const AGORA = "2026-10-20T12:00:00.000Z";

test("Catálogo: só RDC 216/2004 e SES 799/2023 (RS), com fonte, conferidoEm e aviso de conferir", () => {
  assert.deepEqual(CATALOGO_DE_NORMAS.map((norma) => norma.id), ["rdc-216-2004", "ses-799-2023-rs"]);
  for (const norma of CATALOGO_DE_NORMAS) {
    assert.ok(norma.fonte.length > 10);
    assert.ok("conferidoEm" in norma);
    assert.ok(norma.versaoCatalogo && norma.dataVersao);
  }
  const rdc = normaPorId("rdc-216-2004");
  assert.ok(rdc.avisos.includes("Conferir no texto oficial da ANVISA antes de usar com clientes."));
  assert.equal(rdc.conferidoEm, null);
  assert.equal(rdc.itens["estrutura-do-pop"].rotulo, "4.11.2");
  assert.equal(rdc.itens["lista-de-pops"].rotulo, "4.11.4");
  assert.equal(rdc.itens["higienizacao"].rotulo, "4.11.5");
  assert.equal(rdc.itens["pragas"].rotulo, "4.11.6");
  assert.equal(rdc.itens["manipuladores"].rotulo, "4.11.8");
  assert.equal(rdc.itens["reservatorio-intervalo"].rotulo, "4.4.4");
  assert.equal(rdc.itens["guarda-de-registros"].rotulo, "4.11.3");
  const ses = normaPorId("ses-799-2023-rs");
  assert.equal(ses.itens["lista-de-pops"].rotulo, "Anexo II, 13.7 (a–d)");
  assert.equal(ses.itens["acao-corretiva"].rotulo, "Anexo II, 13.2");
  assert.equal(ses.itens["guarda-de-registros"].rotulo, "Anexo I, 13.2");
  assert.match(ses.itens["guarda-de-registros"].orientacao, /90 dias/);
  assert.match(rdc.itens["guarda-de-registros"].orientacao, /30 dias/);
  // citações sem numeração confirmada ficam marcadas "conferir"
  assert.equal(ses.itens["manipuladores"].conferir, true);
  assert.ok(ses.avisos.includes("Vigência da Portaria SES 799/2023: confirmar no diário oficial."));
  assert.ok(ses.avisos.includes("Exigência municipal: confirmar com a Vigilância Sanitária."));
});

test("Norma aplicável: só o RS tem norma; outro estado vê a mensagem e define os POPs manualmente", () => {
  assert.equal(normasDisponiveis("RS").length, 2);
  assert.equal(normasDisponiveis("rs").length, 2);
  assert.deepEqual(normasDisponiveis("SP"), []);
  assert.deepEqual(normasDisponiveis(""), []);
  assert.equal(MENSAGEM_SEM_NORMA, "Norma ainda não cadastrada no app. Defina os POPs manualmente.");
  assert.deepEqual(conjuntoDaEmpresa({ normasAplicadas: [] }), []);
  assert.deepEqual(conjuntoDaEmpresa({ normasAplicadas: ["norma-inventada"] }), []);
  assert.equal(normasDaEmpresa({ normasAplicadas: ["rdc-216-2004", "x"] }).length, 1);
});

test("Conjunto da norma: 4 POPs com situação, item da norma e contadores", () => {
  const vazio = linhasDoConjunto(empresaRS(), "2026-10-20");
  assert.equal(vazio.linhas.length, 4);
  assert.deepEqual(vazio.resumo, { total: 4, aprovados: 0, rascunho: 0, faltam: 4 });
  assert.ok(vazio.linhas.every((linha) => linha.situacao === "Falta criar"));
  assert.equal(vazio.linhas[0].itemDaNorma, "4.11.4 (a) · Anexo II, 13.7 (a)");
  const so4 = linhasDoConjunto(empresaRS({ normasAplicadas: ["rdc-216-2004"] }), "2026-10-20");
  assert.equal(so4.linhas[3].itemDaNorma, "4.11.4 (d)");

  const pops = [
    { id: "a", catalogoId: "higienizacao-instalacoes", codigo: "POP-01", titulo: "x", versao: "1.0", status: "Aprovado", proximaRevisao: "2027-01-01" },
    { id: "b", catalogoId: "controle-de-pragas", codigo: "POP-02", titulo: "x", versao: "1.0", status: "Rascunho" },
    { id: "c", catalogoId: "higienizacao-reservatorio", codigo: "POP-03", titulo: "x", versao: "1.2", status: "Aprovado", proximaRevisao: "2026-01-01" },
    { id: "d", catalogoId: "higiene-saude-manipuladores", codigo: "POP-04", titulo: "x", versao: "1.0", status: "Aguardando aprovação", responsavel: "Ana" },
  ];
  const cheio = linhasDoConjunto(empresaRS({ pops }), "2026-10-20");
  assert.deepEqual(cheio.linhas.map((linha) => linha.situacao), ["Aprovado", "Rascunho", "Vencido", "Aguardando aprovação"]);
  assert.deepEqual(cheio.resumo, { total: 4, aprovados: 1, rascunho: 2, faltam: 0 });
  assert.equal(cheio.linhas[3].responsavel, "Ana");
  assert.equal(cheio.linhas[2].versao, "1.2");
  assert.equal(situacaoDoPop({ status: "Em revisão", proximaRevisao: "" }), "Aguardando aprovação");
  assert.equal(situacaoDoPop({ status: "Aprovado", proximaRevisao: "" }, "2026-10-20"), "Aprovado");
});

test("Texto-base: estrutura e orientações com citação, passos em branco, status Rascunho", () => {
  const empresa = empresaRS();
  const pop = criarPopDoTextoBase(conjuntoDaEmpresa(empresa)[3], empresa, "id-4");
  assert.equal(pop.status, "Rascunho");
  assert.equal(pop.versao, "1.0");
  assert.equal(pop.catalogoId, "higiene-saude-manipuladores");
  assert.deepEqual(pop.conteudo.passos, []);
  assert.equal(pop.conteudo.objetivo, "");
  assert.ok(pop.conteudo.referencias.some((ref) => ref.item === "4.11.8" && ref.norma.includes("RDC 216")));
  assert.ok(pop.conteudo.referencias.some((ref) => ref.item === "Anexo II, 13.2"));
  assert.ok(pop.conteudo.referencias.every((ref) => ref.orientacao.length > 10));
  assert.ok(pop.conteudo.manipuladores);
  assert.equal(pop.conteudo.manipuladores.examesApto, "");
  assert.equal(JSON.stringify(pop).toLowerCase().includes("laudo"), false);
  assert.equal(pop.conteudo.higienizacao, undefined);
  assert.deepEqual(pop.origemTextoBase.versaoCatalogo, versoesDoCatalogo());
  assert.match(textoDaFaixaDoTextoBase(pop), /^Este texto veio do texto-base e cita .*4\.11\.8.*Revise, ajuste à rotina da empresa e envie para aprovação do responsável\.$/);
  const higien = criarPopDoTextoBase(conjuntoDaEmpresa(empresa)[0], empresa, "id-1");
  assert.deepEqual(Object.keys(higien.conteudo.higienizacao), ["superficie", "metodo", "produto", "principioAtivo", "concentracao", "tempoContato", "temperatura"]);
  const pragas = criarPopDoTextoBase(conjuntoDaEmpresa(empresa)[1], empresa, "id-2");
  assert.deepEqual(Object.keys(pragas.conteudo.pragas), ["preventivas", "corretivas", "comprovanteEmpresa"]);
  const semSes = criarPopDoTextoBase(conjuntoDaEmpresa(empresa)[0], empresaRS({ normasAplicadas: ["rdc-216-2004"] }), "id-x");
  assert.ok(semSes.conteudo.referencias.every((ref) => !ref.norma.includes("SES")));
  // código já em uso: o POP nasce sem código
  assert.equal(criarPopDoTextoBase(conjuntoDaEmpresa(empresa)[0], empresaRS({ pops: [{ codigo: "POP-01", titulo: "outro" }] }), "i").codigo, "");
});

test("Criar do conjunto: só os que faltam e nunca mexe nos existentes", () => {
  const existente = { id: "ex", catalogoId: "controle-de-pragas", codigo: "POP-02", titulo: "Pragas da empresa", versao: "3.0", status: "Aprovado", programaRelacionado: "", responsavel: "Ana", proximaRevisao: "2027-01-01" };
  let n = 0;
  const r = criarPopsFaltantesDoConjunto(empresaRS({ pops: [existente] }), () => `novo-${++n}`);
  assert.equal(r.criados, 3);
  assert.equal(r.pops.length, 4);
  assert.deepEqual(r.pops[0], existente);
  assert.ok(r.pops.slice(1).every((pop) => pop.status === "Rascunho" && pop.conteudo.passos.length === 0));
  assert.equal(criarPopsFaltantesDoConjunto(empresaRS({ pops: r.pops }), () => "z").criados, 0);
  const um = criarPopsFaltantesDoConjunto(empresaRS(), () => "u", "higienizacao-reservatorio");
  assert.deepEqual(um.pops.map((pop) => pop.catalogoId), ["higienizacao-reservatorio"]);
  assert.equal(criarPopsFaltantesDoConjunto({ normasAplicadas: [], pops: [] }, () => "u").criados, 0);
});

test("POPs da visita: sugestões vêm do conjunto da empresa; sem norma, nenhuma", () => {
  const ncs = [{ numero: 1, categoria: "Limpeza e higienização/sanitização" }, { numero: 2, categoria: "Controle de temperatura" }, { numero: 3, categoria: "Controle da potabilidade da água" }];
  const comNorma = popsDaVisita(ncs, [], conjuntoDaEmpresa(empresaRS()));
  assert.deepEqual(comNorma.linhas.map((linha) => linha.sugestao.codigo), ["POP-01", "POP-03"]);
  assert.deepEqual(comNorma.semPop, [2]);
  const semNorma = popsDaVisita(ncs, [], conjuntoDaEmpresa({ normasAplicadas: [] }));
  assert.equal(semNorma.linhas.length, 0);
  assert.deepEqual(semNorma.semPop, [1, 2, 3]);
});

const popPronto = (extra = {}) => ({
  ...criarPopDoTextoBase(conjuntoDaEmpresa(empresaRS())[0], empresaRS(), "p1"),
  ...extra,
});
const comPassos = () => {
  const pop = popPronto();
  return { ...pop, conteudo: { ...pop.conteudo, passos: [{ id: "1", texto: "Lavar" }], frequencia: "Diária", responsavelExecucao: { nome: "Ana", cargo: "Auxiliar" } } };
};

test("Enviar para aprovação exige passos, frequência e responsável pela execução", () => {
  assert.equal(faltasParaEnviar(popPronto()).length, 3);
  assert.throws(() => enviarParaAprovacao(popPronto()), /ao menos um passo/);
  const enviado = enviarParaAprovacao(comPassos());
  assert.equal(enviado.status, "Aguardando aprovação");
  assert.throws(() => enviarParaAprovacao(enviado), /rascunho/);
});

test("Aprovar e assinar: só o responsável do estabelecimento; grava nome, cargo, data e versão", () => {
  const empresa = empresaRS();
  assert.equal(podeAprovarPop(resp, empresa), true);
  assert.equal(podeAprovarPop(outro, empresa), false);
  assert.equal(podeAprovarPop(null, empresa), false);
  assert.equal(podeAprovarPop({ ...resp, status: "Suspenso" }, empresa), false);
  assert.equal(podeAprovarPop({ ...resp, acessoEncerradoEm: AGORA }, empresa), false);
  assert.match(motivoParaNaoAprovar(outro, empresa), /responsável do estabelecimento aprova/);
  assert.match(motivoParaNaoAprovar(resp, { responsavelEstabelecimento: { nome: "Sem vínculo", cargo: "Dona" } }), /Vincule/);
  const aguardando = enviarParaAprovacao(comPassos());
  assert.throws(() => aprovarPop(aguardando, outro, empresa, AGORA), /responsável/);
  assert.throws(() => aprovarPop(comPassos(), resp, empresa, AGORA), /aguardando aprovação/);
  const aprovado = aprovarPop(aguardando, resp, empresa, AGORA);
  assert.equal(aprovado.status, "Aprovado");
  assert.deepEqual(aprovado.aprovacao, { nome: "Carla Dona", cargo: "Proprietária", usuarioId: "u-resp", em: AGORA, versao: "1.0" });
  assert.equal(aprovado.versoes.length, 1);
  assert.equal(aprovado.versoes[0].versao, "1.0");
  assert.deepEqual(aprovado.versaoCatalogoAprovada, versoesDoCatalogo());
});

test("Editar POP aprovado cria nova versão em Rascunho e guarda as aprovadas; comparar versões", () => {
  const empresa = empresaRS();
  const aprovado = aprovarPop(enviarParaAprovacao(comPassos()), resp, empresa, AGORA);
  assert.throws(() => iniciarNovaVersao(comPassos()), /aprovado/);
  const nova = iniciarNovaVersao(aprovado);
  assert.equal(nova.versao, "1.1");
  assert.equal(nova.status, "Rascunho");
  assert.equal(nova.aprovacao, undefined);
  assert.equal(nova.versoes.length, 1);
  assert.equal(nova.versoes[0].status, "Aprovado");
  const editada = { ...nova, conteudo: { ...nova.conteudo, passos: [{ id: "1", texto: "Lavar com água morna" }, { id: "2", texto: "Enxaguar" }], frequencia: "Diária" } };
  const aprovada2 = aprovarPop(enviarParaAprovacao(editada), resp, empresa, "2026-11-01T10:00:00.000Z");
  assert.deepEqual(aprovada2.versoes.map((versao) => versao.versao), ["1.0", "1.1"]);
  const linhas = compararVersoes(aprovada2.versoes[0].conteudo, aprovada2.versoes[1].conteudo);
  assert.equal(linhas.find((linha) => linha.campo === "Passo 1").igual, false);
  assert.equal(linhas.find((linha) => linha.campo === "Passo 1").a, "Lavar");
  assert.equal(linhas.find((linha) => linha.campo === "Passo 2").a, "");
  assert.equal(linhas.find((linha) => linha.campo === "Frequência").igual, true);
  assert.equal(proximaVersao("1.0"), "1.1");
  assert.equal(proximaVersao("2.9"), "2.10");
  assert.equal(proximaVersao("rascunho"), "1.1");
});

test("Mudança de norma no catálogo: POP aprovado ganha Revisar; só o mecanismo, sem norma inventada", () => {
  const empresa = empresaRS();
  const aprovado = aprovarPop(enviarParaAprovacao(comPassos()), resp, empresa, AGORA);
  assert.equal(popPrecisaRevisarPorNorma(aprovado), false);
  const catalogoNovo = CATALOGO_DE_NORMAS.map((norma) => (norma.id === "rdc-216-2004" ? { ...norma, versaoCatalogo: "2", dataVersao: "2027-03-01" } : norma));
  assert.equal(popPrecisaRevisarPorNorma(aprovado, catalogoNovo), true);
  assert.equal(popPrecisaRevisarPorNorma({ ...aprovado, status: "Rascunho" }, catalogoNovo), false);
  assert.deepEqual(popsComNormaAlterada([aprovado, comPassos()], catalogoNovo).map((pop) => pop.id), ["p1"]);
  // depois de aprovar de novo com o catálogo novo, a etiqueta some
  const nova = iniciarNovaVersao(aprovado);
  const reaprovado = aprovarPop(enviarParaAprovacao(nova), resp, empresa, AGORA, catalogoNovo);
  assert.equal(popPrecisaRevisarPorNorma(reaprovado, catalogoNovo), false);
  assert.equal(reaprovado.versaoCatalogoAprovada["rdc-216-2004"], "2");
});

test("Servidor: só o responsável aprova; aprovação válida gera registro; versões aprovadas não somem", () => {
  const empresa = empresaRS();
  const aguardando = enviarParaAprovacao(comPassos());
  const atuais = { e1: { ...empresa, pops: [aguardando] } };
  const aprovado = aprovarPop(aguardando, resp, empresa, AGORA);

  const ok = validarAprovacoesDePop(atuais, { e1: { ...empresa, pops: [aprovado] } }, resp, AGORA);
  assert.equal(ok.empresas.e1.pops[0].status, "Aprovado");
  assert.equal(ok.registros.length, 1);
  assert.equal(ok.registros[0].acao, "pop.aprovado");
  assert.equal(ok.registros[0].usuarioNome, "Carla Dona");
  assert.match(ok.registros[0].detalhes, /aprovou e assinou o POP POP-01/);

  const barrado = validarAprovacoesDePop(atuais, { e1: { ...empresa, pops: [{ ...aprovado, aprovacao: { ...aprovado.aprovacao, usuarioId: "u-rt" } }] } }, outro, AGORA);
  assert.equal(barrado.empresas.e1.pops[0].status, "Aguardando aprovação");
  assert.equal(barrado.registros.length, 0);

  const semAguardar = validarAprovacoesDePop({ e1: { ...empresa, pops: [comPassos()] } }, { e1: { ...empresa, pops: [{ ...aprovado }] } }, resp, AGORA);
  assert.equal(semAguardar.empresas.e1.pops[0].status, "Rascunho");

  const novoJaAprovado = validarAprovacoesDePop({ e1: { ...empresa, pops: [] } }, { e1: { ...empresa, pops: [{ ...aprovado, id: "novo" }] } }, resp, AGORA);
  assert.equal(novoJaAprovado.empresas.e1.pops[0].status, "Rascunho");
  assert.equal(novoJaAprovado.empresas.e1.pops[0].aprovacao, undefined);

  // POP já aprovado: o texto, a versão e a assinatura não mudam por gravação comum; "Revisar até" pode mudar
  const gravados = { e1: { ...empresa, pops: [aprovado] } };
  const adulterado = { ...aprovado, conteudo: { ...aprovado.conteudo, objetivo: "trocado" }, proximaRevisao: "2027-12-31", aprovacao: { ...aprovado.aprovacao, nome: "Outra pessoa" } };
  const mantido = validarAprovacoesDePop(gravados, { e1: { ...empresa, pops: [adulterado] } }, outro, AGORA).empresas.e1.pops[0];
  assert.equal(mantido.conteudo.objetivo, "");
  assert.equal(mantido.aprovacao.nome, "Carla Dona");
  assert.equal(mantido.proximaRevisao, "2027-12-31");

  // as versões aprovadas guardadas voltam se alguém tentar apagá-las
  const sem = validarAprovacoesDePop(gravados, { e1: { ...empresa, pops: [{ ...aprovado, versoes: [] }] } }, outro, AGORA).empresas.e1.pops[0];
  assert.equal(sem.versoes.length, 1);
});

test("Servidor: responsável sem permissão de editar só aprova; ninguém troca o responsável vinculado", () => {
  const empresa = empresaRS();
  const aguardando = enviarParaAprovacao(comPassos());
  const atual = { empresas: { e1: { ...empresa, pops: [aguardando] } }, visitas: [], ncs: [], evidencias: [], usuarios: [], registrosAuditoria: [] };
  const aprovado = aprovarPop(aguardando, resp, empresa, AGORA);
  const gestor = { id: "u-resp", perfil: "Cliente Gestor", status: "Ativo", empresaIds: ["e1"], nome: "Carla Dona", email: "c@x.com" };
  const recebido = { ...atual, empresas: { e1: { ...empresa, nomeFantasia: "Hackeada", pops: [aprovado] } } };
  const novo = mesclarEstadoPorUsuario(atual, recebido, gestor, "auth-g");
  assert.equal(novo.empresas.e1.pops[0].status, "Aprovado");
  assert.equal(novo.empresas.e1.nomeFantasia, undefined);

  const rt = { id: "u-rt", perfil: "Consultor/RT", status: "Ativo", empresaIds: ["e1"], nome: "Rita RT", email: "r@x.com" };
  const tentativa = { ...atual, empresas: { e1: { ...empresa, responsavelEstabelecimento: { nome: "Rita", cargo: "RT", usuarioId: "u-rt" }, pops: [aguardando] } } };
  const gravado = mesclarEstadoPorUsuario(atual, tentativa, rt, "auth-rt");
  assert.equal(gravado.empresas.e1.responsavelEstabelecimento.usuarioId, "u-resp");
});

test("Aviso do Início: só aparece quando há POP aprovado com norma alterada", async () => {
  const { avisoDePopsComNormaAlterada } = await import("../lib/popsNorma.ts");
  const empresa = empresaRS();
  const aprovado = aprovarPop(enviarParaAprovacao(comPassos()), resp, empresa, AGORA);
  assert.equal(avisoDePopsComNormaAlterada([aprovado]), null);
  const novo = CATALOGO_DE_NORMAS.map((norma) => (norma.id === "ses-799-2023-rs" ? { ...norma, versaoCatalogo: "2" } : norma));
  assert.equal(avisoDePopsComNormaAlterada([aprovado], novo), "1 POP tem a norma citada alterada. Confira o texto e aprove de novo.");
  assert.equal(avisoDePopsComNormaAlterada([aprovado, { ...aprovado, id: "p2" }], novo), "2 POPs têm a norma citada alterada. Confira o texto e aprove de novo.");
  assert.equal(avisoDePopsComNormaAlterada([{ ...aprovado, arquivado: true }], novo), null);
});
