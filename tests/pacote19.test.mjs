import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { MAX_FOTOS_POR_ITEM, comprovacaoDaCorrecao, fotosDoItem, podeAdicionarFotoNoItem, protegerCarimboDasEvidencias } from "../lib/fotosDoItem.ts";
import {
  adicionarPergunta,
  desligarPergunta,
  itensDoQuestionario,
  materializarModelo,
  moverPergunta,
  perguntaFoiUsada,
  perguntasVigentes,
  podeEditarQuestionario,
  religarPergunta,
  removerOuDesativarPergunta,
} from "../lib/questionarioAmbiente.ts";
import { mesclarEstadoPorUsuario } from "../lib/stateAccess.ts";

const usuario = (perfil, extra = {}) => ({ id: `u-${perfil}`, perfil, status: "Ativo", empresaIds: ["e1"], nome: `Nome ${perfil}`, email: `${perfil.replace(/\W/g, "")}@x.com`, ...extra });
const foto = (id, extra = {}) => ({ id, empresaId: "e1", visitaId: "v1", tipo: "Foto", nomeArquivo: `${id}.jpg`, mimeType: "image/jpeg", descricao: "", ambiente: "Cozinha", checklistItemId: "i1", criadoEm: "2026-10-20T10:00:00.000Z", registradoPorId: "u-orig", registradoPorNome: "Quem fez", ...extra });
const AGORA = "2026-10-20T12:00:00.000Z";

test("Fotos por item: no máximo 5; a foto do depois não conta", () => {
  assert.equal(MAX_FOTOS_POR_ITEM, 5);
  const quatro = [1, 2, 3, 4].map((n) => foto(`f${n}`));
  assert.equal(podeAdicionarFotoNoItem(quatro, "v1", "i1"), true);
  const cinco = [...quatro, foto("f5")];
  assert.equal(podeAdicionarFotoNoItem(cinco, "v1", "i1"), false);
  assert.equal(podeAdicionarFotoNoItem(cinco, "v1", "outro-item"), true);
  assert.equal(fotosDoItem([...cinco, foto("d1", { papel: "depois" })], "v1", "i1").length, 5, "o depois não entra na conta");
  assert.equal(podeAdicionarFotoNoItem([...cinco, foto("a1", { tipo: "Áudio" })], "v1", "i1"), false);
});

test("Servidor: a 6ª foto do item é descartada, o depois passa e o registrador é quem está logado", () => {
  const atuais = [1, 2, 3, 4].map((n) => foto(`f${n}`));
  const recebidas = [...atuais, foto("f5", { registradoPorId: "falso", registradoPorNome: "Falso" }), foto("f6"), foto("d1", { papel: "depois" })];
  const quem = usuario("Executor de campo");
  const resultado = protegerCarimboDasEvidencias(atuais, recebidas, quem, new Set(["e1"]));
  assert.deepEqual(resultado.map((ev) => ev.id), ["f1", "f2", "f3", "f4", "f5", "d1"]);
  assert.equal(resultado.find((ev) => ev.id === "f5").registradoPorId, quem.id);
  assert.equal(resultado.find((ev) => ev.id === "f5").registradoPorNome, quem.nome);
});

test("Carimbo não editável: data e hora, ambiente e registrador voltam ao gravado, também pela mesclagem do servidor", () => {
  const atual = { empresas: { e1: { id: "e1", pops: [] } }, empresaAtualId: "e1", visitas: [], ncs: [], evidencias: [foto("f1")], usuarios: [], registrosAuditoria: [] };
  const adulterada = foto("f1", { criadoEm: "2020-01-01T00:00:00.000Z", ambiente: "Banheiro", registradoPorId: "outro", registradoPorNome: "Outro", descricao: "legenda nova" });
  const executor = usuario("Executor de campo");
  const novo = mesclarEstadoPorUsuario(atual, { ...atual, evidencias: [adulterada] }, executor, "auth");
  const guardada = novo.evidencias.find((ev) => ev.id === "f1");
  assert.equal(guardada.criadoEm, "2026-10-20T10:00:00.000Z");
  assert.equal(guardada.ambiente, "Cozinha");
  assert.equal(guardada.registradoPorId, "u-orig");
  assert.equal(guardada.registradoPorNome, "Quem fez");
  // não existe campo de localização
  const tipos = readFileSync(new URL("../types/index.ts", import.meta.url), "utf8");
  const trecho = tipos.slice(tipos.indexOf("export type Evidencia = {"), tipos.indexOf("};", tipos.indexOf("export type Evidencia = {")));
  assert.ok(!/gps|latitude|longitude|geolocal|coordenad/i.test(trecho.replace(/\/\*\*[\s\S]*?\*\//g, "")));
});

test("Antes e depois: resolver sem foto do depois marca \"sem comprovação\"", () => {
  const nc = (status) => ({ id: "nc1", status, checklistItemId: "i1", visitaId: "v1" });
  const antes = foto("a1", { ncId: "nc1" });
  const depois = foto("d1", { ncId: "nc1", papel: "depois" });
  let c = comprovacaoDaCorrecao(nc("Resolvida"), [antes]);
  assert.equal(c.semComprovacao, true);
  assert.deepEqual([c.antes.length, c.depois.length], [1, 0]);
  c = comprovacaoDaCorrecao(nc("Resolvida"), [antes, depois]);
  assert.equal(c.semComprovacao, false);
  assert.deepEqual([c.antes.length, c.depois.length], [1, 1]);
  assert.equal(comprovacaoDaCorrecao(nc("Aberta"), [antes]).semComprovacao, false, "só vale para correção resolvida");
  // a foto do item sem ncId também é o antes
  assert.equal(comprovacaoDaCorrecao(nc("Resolvida"), [foto("x")]).antes.length, 1);
});

const REF = "Manual de Boas Práticas — Capítulo 1";
const itens = ["Piso e ralos", "Paredes", "Janelas e telas", "Portas", "Teto", "Iluminação"].map((categoria) => ({ categoria, titulo: `${categoria} estão conservados`, criticidade: "Importante", referencia: REF, orientacao: "" }));

test("Questionário: desligar pergunta do modelo exige justificativa; a da empresa não", () => {
  let config = materializarModelo(itens, "Cozinha", AGORA);
  assert.ok(config.perguntas.length > 3);
  assert.ok(config.perguntas.every((p) => p.origem === "modelo" && p.ativa));
  const modelo = config.perguntas[0];
  const semTexto = desligarPergunta(config, modelo.id, { id: "u1", nome: "Rita RT" }, AGORA, "  ");
  assert.equal(semTexto.ok, false);
  assert.ok(semTexto.erro.includes("Explique"));
  assert.equal(desligarPergunta(config, modelo.id, {}, AGORA, "abc").ok, false);
  const ok = desligarPergunta(config, modelo.id, { id: "u1", nome: "Rita RT" }, AGORA, "Não há esse item nesta cozinha");
  assert.equal(ok.ok, true);
  const desligada = ok.config.perguntas.find((p) => p.id === modelo.id);
  assert.equal(desligada.ativa, false);
  assert.equal(desligada.justificativaDeDesligar, "Não há esse item nesta cozinha");
  assert.equal(desligada.desligadaPorNome, "Rita RT");
  assert.equal(desligada.desligadaEm, AGORA);

  const nova = adicionarPergunta(config, { id: "emp-1", titulo: "A balança está calibrada e limpa?" }, AGORA);
  assert.equal(nova.ok, true);
  config = nova.config;
  const propria = config.perguntas.find((p) => p.id === "emp-1");
  assert.equal(propria.origem, "empresa");
  const semJust = desligarPergunta(config, "emp-1", {}, AGORA);
  assert.equal(semJust.ok, true, "pergunta da empresa desliga sem justificativa");
  assert.equal(adicionarPergunta(config, { id: "x", titulo: "ok" }, AGORA).ok, false, "pergunta muito curta");
  assert.equal(adicionarPergunta(config, { id: "x", titulo: "a balança está calibrada e limpa?" }, AGORA).ok, false, "duplicada");
});

test("Questionário: pergunta usada em visita vira inativa e não some; a da empresa nunca usada pode sair", () => {
  let config = materializarModelo(itens, "Cozinha", AGORA);
  config = adicionarPergunta(config, { id: "emp-1", titulo: "A balança está calibrada e limpa?" }, AGORA).config;
  config = adicionarPergunta(config, { id: "emp-2", titulo: "O termômetro de espeto está limpo?" }, AGORA).config;
  const total = config.perguntas.length;

  const usadaNaVisita = [{ checklist: [{ ambiente: "Cozinha", categoria: "Pergunta da empresa", titulo: "A balança está calibrada e limpa?" }] }];
  const p1 = config.perguntas.find((p) => p.id === "emp-1");
  assert.equal(perguntaFoiUsada(p1, "Cozinha", usadaNaVisita), true);
  assert.equal(perguntaFoiUsada(p1, "Estoque", usadaNaVisita), false);
  const usada = removerOuDesativarPergunta(config, "emp-1", true, {}, AGORA);
  assert.equal(usada.ok && usada.removida, false);
  assert.equal(usada.config.perguntas.length, total, "continua na lista");
  assert.equal(usada.config.perguntas.find((p) => p.id === "emp-1").ativa, false);

  const naoUsada = removerOuDesativarPergunta(config, "emp-2", false, {}, AGORA);
  assert.equal(naoUsada.removida, true);
  assert.equal(naoUsada.config.perguntas.length, total - 1);

  // pergunta do modelo nunca sai da lista, usada ou não
  const modelo = config.perguntas[1];
  assert.equal(removerOuDesativarPergunta(config, modelo.id, false, {}, AGORA).ok, false, "sem justificativa não desliga");
  const desativada = removerOuDesativarPergunta(config, modelo.id, false, {}, AGORA, "Não se aplica ao nosso serviço");
  assert.equal(desativada.removida, false);
  assert.equal(desativada.config.perguntas.length, total);
});

test("Questionário: ordem, religar e itens que o checklist usa", () => {
  let config = materializarModelo(itens, "Cozinha", AGORA);
  const primeiro = config.perguntas[0].titulo;
  const segundo = config.perguntas[1].titulo;
  config = moverPergunta(config, config.perguntas[0].id, 1, AGORA);
  const vigentes = perguntasVigentes(config);
  assert.equal(vigentes[0].titulo, segundo);
  assert.equal(vigentes[1].titulo, primeiro);
  assert.deepEqual(vigentes.map((p) => p.ordem), vigentes.map((_, i) => i));
  assert.equal(moverPergunta(config, vigentes[0].id, -1, AGORA), config, "primeiro não sobe");
  const desligada = desligarPergunta(config, vigentes[0].id, {}, AGORA, "Não se aplica aqui").config;
  assert.equal(perguntasVigentes(desligada).length, vigentes.length - 1);
  assert.equal(perguntasVigentes(religarPergunta(desligada, vigentes[0].id, AGORA)).length, vigentes.length);
  const itensChecklist = itensDoQuestionario(desligada);
  assert.ok(itensChecklist.every((i) => i.titulo !== segundo), "desligada não entra no checklist");
  assert.equal(itensDoQuestionario(undefined), null, "sem questionário personalizado vale o modelo do app");
  assert.ok(config.perguntas.every((p) => p.referencia), "o modelo traz a fonte que já existe no app");
});

test("Permissões: só Administrador e RT editam o questionário; o servidor ignora os demais", () => {
  for (const perfil of ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente", "Executor de campo", "Fiscal"]) {
    assert.equal(podeEditarQuestionario(usuario(perfil)), perfil === "Administrador" || perfil === "Consultor/RT", perfil);
  }
  assert.equal(podeEditarQuestionario(usuario("Consultor/RT", { status: "Suspenso" })), false);
  const config = materializarModelo(itens, "Cozinha", AGORA);
  const atual = { empresas: { e1: { id: "e1", pops: [], questionarios: undefined } }, empresaAtualId: "e1", visitas: [], ncs: [], evidencias: [], usuarios: [], registrosAuditoria: [] };
  const recebido = { ...atual, empresas: { e1: { id: "e1", pops: [], questionarios: { Cozinha: config } } } };
  const rt = mesclarEstadoPorUsuario(atual, recebido, usuario("Consultor/RT"), "a1");
  assert.ok(rt.empresas.e1.questionarios?.Cozinha, "RT grava");
  for (const perfil of ["Gerente", "Cliente Gestor", "Executor de campo", "Fiscal"]) {
    const outro = mesclarEstadoPorUsuario(atual, recebido, usuario(perfil, { validoAte: "2099-01-01T00:00:00-03:00" }), "a2");
    assert.equal(outro.empresas.e1.questionarios, undefined, perfil);
  }
});

test("Telas: edição do questionário só no PC e só para quem pode; foto até 5 e antes/depois nas telas", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("onQuestionario={ehPC && (!usuarioDaSessao || podeEditarQuestionario(usuarioDaSessao)) ? abrirQuestionario : undefined}"));
  assert.ok(page.includes("fotosNoItem={fotosDoItem("));
  const quest = readFileSync(new URL("../components/pc/PcQuestionario.tsx", import.meta.url), "utf8");
  assert.ok(readFileSync(new URL("../lib/questionarioAmbiente.ts", import.meta.url), "utf8").includes("Modelo da norma"));
  for (const texto of ["conferir", "ORIGEM_DA_PERGUNTA", "Por que desligar esta pergunta do modelo?"]) assert.ok(quest.includes(texto), texto);
  const ad = readFileSync(new URL("../components/AntesDepois.tsx", import.meta.url), "utf8");
  assert.ok(ad.includes("Adicionar foto do depois") && ad.includes("sem comprovação"));
});
