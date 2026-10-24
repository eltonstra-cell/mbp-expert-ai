import assert from "node:assert/strict";
import test from "node:test";

import { formatarCnae, formatarTelefone, propostaDaConsulta } from "../lib/cnpjConsulta.ts";
import { consultarComReserva } from "../lib/consultaCnpjFontes.ts";
import {
  ESTADO_INICIAL_DO_PACOTE,
  alternarAmbiente,
  alternarItem,
  chaveDeAmbiente,
  chaveDeEquipamento,
  contagemDoGrupo,
  equipamentoBloqueado,
  estaMarcado,
  marcarTodosOsAmbientes,
  marcarTodosOsItens,
  quantosMarcados,
} from "../lib/escolhaDoPacote.ts";
import { SETORES_OFICIAIS_MANUAL } from "../lib/manualBase.ts";
import { TIPOS_DE_ESTABELECIMENTO, nomeCurtoDoSetor, pacoteDoTipo } from "../lib/tiposDeEstabelecimento.ts";
import { resolverUf, ufValida } from "../lib/ufBrasil.ts";

// Consultas SIMULADAS: nenhum teste usa CNPJ real de cliente.
const base = { cnpj: "01937526000165", razao_social: "EMPRESA SIMULADA LTDA", descricao_situacao_cadastral: "Ativa", cep: "01452921", municipio: "SAO PAULO" };

test("UF 'EX' (Exterior) da consulta nunca chega ao formulário: deduz pelo CEP e avisa", () => {
  const proposta = propostaDaConsulta({ ...base, uf: "EX" });
  assert.equal(proposta.uf, "SP");
  assert.equal(proposta.ufOrigem, "cep");
  assert.match(proposta.ufAviso, /UF não veio da consulta, confirme/);
  assert.ok(ufValida(proposta.uf));
});

test("UF inválida sem CEP nem município reconhecível fica VAZIA, com aviso", () => {
  const proposta = propostaDaConsulta({ cnpj: "01937526000165", uf: "EX", cep: "", municipio: "" });
  assert.equal(proposta.uf, "");
  assert.equal(proposta.ufOrigem, "vazia");
  assert.match(proposta.ufAviso, /confirme/);
});

test("UF vinda da outra fonte vale; UF válida da consulta não gera aviso", () => {
  assert.equal(resolverUf({ uf: "EX", outraFonte: "RS", cep: "01452921" }).uf, "RS");
  const normal = resolverUf({ uf: "rs" });
  assert.equal(normal.uf, "RS");
  assert.equal(normal.aviso, "");
});

test("Fontes do CNPJ: a primeira (BrasilAPI) vale; a reserva só entra se a primeira falhar; a fonte exibida é a usada", async () => {
  const chamadas = [];
  const fonte = (nome, falha, uf = "SP") => ({ nome, consultar: async () => { chamadas.push(nome); if (falha) throw new Error("403"); return { uf, source: nome }; } });
  const primeira = await consultarComReserva([fonte("BrasilAPI", false), fonte("CNPJ.ws", false)]);
  assert.equal(primeira.fonte, "BrasilAPI");
  assert.deepEqual(chamadas, ["BrasilAPI"]);

  chamadas.length = 0;
  const reserva = await consultarComReserva([fonte("BrasilAPI", true), fonte("CNPJ.ws", false)]);
  assert.equal(reserva.fonte, "CNPJ.ws");
  assert.deepEqual(reserva.tentativas.map((t) => [t.fonte, t.ok]), [["BrasilAPI", false], ["CNPJ.ws", true]]);

  const nenhuma = await consultarComReserva([fonte("BrasilAPI", true), fonte("CNPJ.ws", true)]);
  assert.equal(nenhuma.dados, null);
});

test("Fontes do CNPJ: UF inválida na fonte usada busca a UF na outra, sem trocar a fonte exibida", async () => {
  const resultado = await consultarComReserva([
    { nome: "BrasilAPI", consultar: async () => ({ uf: "" }) },
    { nome: "CNPJ.ws", consultar: async () => ({ uf: "MG" }) },
  ]);
  assert.equal(resultado.fonte, "BrasilAPI");
  assert.equal(resultado.ufDaOutraFonte, "MG");
});

test("Telefone formatado e CNAE com máscara", () => {
  assert.equal(formatarTelefone("1138186800"), "(11) 3818-6800");
  assert.equal(formatarTelefone("11987654321"), "(11) 98765-4321");
  assert.equal(formatarTelefone("123"), "123");
  assert.equal(formatarCnae("5611203"), "5611-2/03");
  assert.equal(propostaDaConsulta({ ...base, uf: "SP", ddd_telefone_1: "1138186800" }).telefone, "(11) 3818-6800");
});

test("CNAEs secundários vêm com código e descrição", () => {
  const proposta = propostaDaConsulta({ ...base, uf: "SP", cnaes_secundarios: [{ codigo: "5611203", descricao: "Lanchonetes, casas de chá, de sucos e similares" }, { codigo: "0", descricao: "" }] });
  assert.deepEqual(proposta.cnaesSecundarios, [{ codigo: "5611203", descricao: "Lanchonetes, casas de chá, de sucos e similares" }]);
});

test("Pacotes: só os 13 setores oficiais, e o pacote muda conforme o tipo", () => {
  const assinaturas = new Set();
  for (const tipo of TIPOS_DE_ESTABELECIMENTO) {
    const pacote = pacoteDoTipo(tipo.id);
    for (const ambiente of pacote.ambientes) assert.ok(SETORES_OFICIAIS_MANUAL.includes(ambiente), `${tipo.id}: ${ambiente} não é setor oficial`);
    for (const equipamento of pacote.equipamentos) assert.ok(pacote.ambientes.includes(equipamento.ambiente), `${tipo.id}: equipamento fora dos ambientes do pacote`);
    assinaturas.add(pacote.ambientes.join("|"));
  }
  assert.ok(assinaturas.size >= 5, "os ambientes precisam variar por tipo");
  assert.equal(pacoteDoTipo("restaurante").ambientes.length, 13);
  assert.ok(!pacoteDoTipo("padaria").ambientes.some((a) => a === "Central de gás"));
  assert.ok(!pacoteDoTipo("acougue").ambientes.includes("Refeitório e salão de consumação"));
  assert.ok(pacoteDoTipo("ambulante").ambientes.length < pacoteDoTipo("restaurante").ambientes.length);
});

test("Nomes curtos dos setores oficiais, com o nome oficial como reserva", () => {
  assert.equal(nomeCurtoDoSetor("Cozinha / Produção"), "Cozinha");
  assert.equal(nomeCurtoDoSetor("Depósito de material de limpeza (DML)"), "DML");
  assert.equal(nomeCurtoDoSetor("Refeitório e salão de consumação"), "Refeitório");
  assert.equal(nomeCurtoDoSetor("Meu ambiente"), "Meu ambiente");
});

test("Desmarcar um ambiente desmarca os equipamentos dele; marcar de novo devolve só esses", () => {
  const pacote = pacoteDoTipo("restaurante");
  const cozinha = "Cozinha / Produção";
  const doAmbiente = pacote.equipamentos.filter((e) => e.ambiente === cozinha);
  assert.ok(doAmbiente.length >= 2);
  const desmarcado = alternarAmbiente(ESTADO_INICIAL_DO_PACOTE, cozinha, pacote.equipamentos);
  assert.equal(desmarcado.saiuJuntos, doAmbiente.length);
  assert.ok(!estaMarcado(desmarcado.estado, chaveDeAmbiente(cozinha)));
  for (const e of doAmbiente) assert.ok(!estaMarcado(desmarcado.estado, chaveDeEquipamento(e)));
  const fora = pacote.equipamentos.find((e) => e.ambiente !== cozinha);
  assert.ok(estaMarcado(desmarcado.estado, chaveDeEquipamento(fora)));
  assert.ok(equipamentoBloqueado(desmarcado.estado, doAmbiente[0], pacote.ambientes));

  const de_novo = alternarAmbiente(desmarcado.estado, cozinha, pacote.equipamentos);
  assert.equal(de_novo.voltaramJuntos, doAmbiente.length);
  assert.deepEqual(de_novo.estado.desmarcados, []);
});

test("Equipamento que já estava desmarcado à mão NÃO volta quando o ambiente é marcado de novo", () => {
  const pacote = pacoteDoTipo("restaurante");
  const cozinha = "Cozinha / Produção";
  const doAmbiente = pacote.equipamentos.filter((e) => e.ambiente === cozinha);
  const aMao = alternarItem(ESTADO_INICIAL_DO_PACOTE, chaveDeEquipamento(doAmbiente[0]));
  const saiu = alternarAmbiente(aMao, cozinha, pacote.equipamentos);
  assert.equal(saiu.saiuJuntos, doAmbiente.length - 1);
  const voltou = alternarAmbiente(saiu.estado, cozinha, pacote.equipamentos);
  assert.deepEqual(voltou.estado.desmarcados, [chaveDeEquipamento(doAmbiente[0])]);
});

test("Marcar todos / Desmarcar todos por grupo e contagem 'N de N marcados'", () => {
  const pacote = pacoteDoTipo("restaurante");
  const chavesEq = pacote.equipamentos.map(chaveDeEquipamento);
  const nenhum = marcarTodosOsAmbientes(ESTADO_INICIAL_DO_PACOTE, pacote.ambientes, pacote.equipamentos, false);
  assert.equal(quantosMarcados(nenhum.estado, pacote.ambientes.map(chaveDeAmbiente)), 0);
  assert.equal(quantosMarcados(nenhum.estado, chavesEq), 0);
  assert.equal(nenhum.saiuJuntos, pacote.equipamentos.length);
  const todos = marcarTodosOsAmbientes(nenhum.estado, pacote.ambientes, pacote.equipamentos, true);
  assert.deepEqual(todos.estado.desmarcados, []);
  const semEq = marcarTodosOsItens(ESTADO_INICIAL_DO_PACOTE, chavesEq, false);
  assert.equal(quantosMarcados(semEq, chavesEq), 0);
  assert.equal(contagemDoGrupo(13, 13), "13 de 13 marcados");
  assert.equal(contagemDoGrupo(1, 1), "1 de 1 marcado");
});
