import assert from "node:assert/strict";
import test from "node:test";

import {
  barraInferior,
  chaveAtiva,
  etapasDaVisita,
  menuLateralPC,
  itensDaBarra,
  itensDaFolhaMais,
  itensVisiveis,
  registrarDisponivel,
  trilhoDoTablet,
} from "../lib/navigation.ts";
import { PERMISSIONS_BY_PROFILE } from "../lib/permissions.ts";

const contexto = (perfil, dentroDeVisita) => ({
  dentroDeVisita,
  pode: (acao) => PERMISSIONS_BY_PROFILE[perfil].includes(acao),
});
const semUsuario = (dentroDeVisita) => ({ dentroDeVisita, pode: () => false });
const chaves = (itens) => itens.map((item) => item.key);
const rotulosDaBarra = (slots) => slots.map((slot) => (slot.tipo === "mais" ? "mais" : slot.item.key));

test("consultor dentro da visita: Central, Checklist, Registrar no centro, Não conf. e Mais", () => {
  const barra = barraInferior(contexto("Consultor/RT", true));
  assert.deepEqual(rotulosDaBarra(barra), ["central", "checklist", "registrar", "ncs", "mais"]);
});

test("consultor fora da visita: Início, Visitas, Registrar no centro, Empresas e Mais", () => {
  const barra = barraInferior(contexto("Consultor/RT", false));
  assert.deepEqual(rotulosDaBarra(barra), ["inicio", "visitas", "registrar", "empresas", "mais"]);
});

test("administrador vê o mesmo que o consultor e também Acessos", () => {
  const ctx = contexto("Administrador", false);
  assert.deepEqual(rotulosDaBarra(barraInferior(ctx)), ["inicio", "visitas", "registrar", "empresas", "mais"]);
  assert.ok(chaves(itensVisiveis(ctx)).includes("acessos"));
  assert.ok(!chaves(itensVisiveis(contexto("Consultor/RT", false))).includes("acessos"));
});

test("cliente gestor: sem Registrar, Checklist, Ambientes, Evidências, POPs e Acessos", () => {
  for (const dentro of [true, false]) {
    const ctx = contexto("Cliente Gestor", dentro);
    const visiveis = chaves(itensVisiveis(ctx));
    for (const proibido of ["registrar", "checklist", "ambientes", "evidencias", "pops", "acessos"]) {
      assert.ok(!visiveis.includes(proibido), `${proibido} (dentro=${dentro})`);
    }
    assert.equal(registrarDisponivel(ctx), false);
    for (const permitido of ["inicio", "ncs", "plano", "relatorio"]) {
      assert.ok(visiveis.includes(permitido), `${permitido} (dentro=${dentro})`);
    }
  }
  assert.ok(chaves(itensVisiveis(contexto("Cliente Gestor", true))).includes("acompanhamento"));
});

test("cliente gestor na visita: barra de 5 itens sem Registrar, Mais por último", () => {
  const barra = barraInferior(contexto("Cliente Gestor", true));
  assert.equal(barra.length, 5);
  assert.equal(barra.at(-1).tipo, "mais");
  assert.ok(!rotulosDaBarra(barra).includes("registrar"));
  assert.deepEqual(rotulosDaBarra(barra), ["central", "ncs", "plano", "relatorio", "mais"]);
});

test("barra tem no máximo 5 posições, sem repetição, e termina em Mais", () => {
  for (const perfil of ["Administrador", "Consultor/RT", "Cliente Gestor"]) {
    for (const dentro of [true, false]) {
      const barra = barraInferior(contexto(perfil, dentro));
      assert.ok(barra.length <= 5);
      assert.equal(barra.at(-1).tipo, "mais");
      const itens = chaves(itensDaBarra(barra));
      assert.equal(new Set(itens).size, itens.length);
    }
  }
});

test("sem usuário identificado (modo local), os itens básicos continuam visíveis", () => {
  const visiveis = chaves(itensVisiveis(semUsuario(false)));
  assert.deepEqual(visiveis, ["inicio", "visitas", "empresas", "ajuda"]);
  assert.deepEqual(rotulosDaBarra(barraInferior(semUsuario(false))), ["inicio", "visitas", "empresas", "ajuda", "mais"]);
});

test("itens exclusivos da visita só aparecem dentro dela", () => {
  const fora = chaves(itensVisiveis(contexto("Consultor/RT", false)));
  for (const key of ["central", "ambientes", "acompanhamento"]) assert.ok(!fora.includes(key), key);
  const dentro = chaves(itensVisiveis(contexto("Consultor/RT", true)));
  for (const key of ["central", "ambientes", "acompanhamento"]) assert.ok(dentro.includes(key), key);
});

test("PC: topo, grupo da visita (só dentro dela), apoio e administração; Registrar fica fora", () => {
  const dentro = menuLateralPC(contexto("Administrador", true));
  assert.deepEqual(chaves(dentro.topo), ["inicio", "visitas", "empresas", "pops"]);
  assert.deepEqual(chaves(dentro.etapas), ["central", "checklist", "evidencias", "ncs", "plano", "acompanhamento", "relatorio"]);
  assert.deepEqual(chaves(dentro.apoio), ["ajuda"]);
  assert.deepEqual(chaves(dentro.admin), ["acessos"]);
  const todas = [...dentro.topo, ...dentro.etapas, ...dentro.apoio, ...dentro.admin];
  assert.ok(!chaves(todas).includes("registrar"));
  const fora = menuLateralPC(contexto("Administrador", false));
  assert.deepEqual(fora.etapas, []);
});

test("PC: Ambientes não é etapa do menu (é o passo 1 da visita)", () => {
  assert.ok(!chaves(menuLateralPC(contexto("Administrador", true)).etapas).includes("ambientes"));
});

test("etapas: tons aprovados para cada etapa", () => {
  const tons = Object.fromEntries(etapasDaVisita(contexto("Administrador", true)).map((item) => [item.key, item.tom]));
  assert.deepEqual(tons, {
    central: "azul",
    ambientes: "turquesa",
    checklist: "verde",
    evidencias: "ceu",
    ncs: "vermelho",
    plano: "ambar",
    acompanhamento: "violeta",
    relatorio: "ardosia",
  });
});

test("etapas: cada perfil vê só o que pode usar", () => {
  assert.deepEqual(chaves(etapasDaVisita(contexto("Consultor/RT", true))).length, 8);
  assert.deepEqual(chaves(etapasDaVisita(contexto("Cliente Gestor", true))), [
    "central",
    "ncs",
    "plano",
    "acompanhamento",
    "relatorio",
  ]);
  assert.deepEqual(chaves(etapasDaVisita(semUsuario(true))), ["central"]);
  const cliente = menuLateralPC(contexto("Cliente Gestor", true));
  assert.deepEqual(chaves(cliente.topo), ["inicio", "visitas", "empresas"]);
  assert.deepEqual(chaves(cliente.etapas), ["central", "ncs", "plano", "acompanhamento", "relatorio"]);
  assert.deepEqual(chaves(cliente.apoio), ["ajuda"]);
  assert.deepEqual(cliente.admin, []);
  const consultor = menuLateralPC(contexto("Consultor/RT", true));
  assert.deepEqual(consultor.admin, []);
  assert.ok(chaves(consultor.topo).includes("pops"));
  const local = menuLateralPC(semUsuario(false));
  assert.deepEqual([...chaves(local.topo), ...chaves(local.apoio), ...chaves(local.admin)], ["inicio", "visitas", "empresas", "ajuda"]);
});

test("tablet fora da visita: Início, Visitas, Empresas e Acessos (Ajuda no lugar sem Acessos)", () => {
  assert.deepEqual(chaves(trilhoDoTablet(contexto("Administrador", false))), ["inicio", "visitas", "empresas", "acessos"]);
  assert.deepEqual(chaves(trilhoDoTablet(contexto("Consultor/RT", false))), ["inicio", "visitas", "empresas", "ajuda"]);
  assert.deepEqual(chaves(trilhoDoTablet(semUsuario(false))), ["inicio", "visitas", "empresas", "ajuda"]);
});

test("tablet dentro da visita: Central, Checklist, Evidências, Não conf. e Plano", () => {
  const ctx = contexto("Consultor/RT", true);
  const trilho = trilhoDoTablet(ctx);
  assert.deepEqual(chaves(trilho), ["central", "checklist", "evidencias", "ncs", "plano"]);
  const resto = chaves(itensDaFolhaMais(ctx, trilho));
  for (const key of ["ambientes", "acompanhamento", "relatorio", "empresas", "pops", "ajuda", "inicio", "visitas"]) {
    assert.ok(resto.includes(key), key);
  }
  for (const key of chaves(trilho)) assert.ok(!resto.includes(key));
  assert.ok(!resto.includes("acessos") && !resto.includes("registrar"));
});

test("tablet dentro da visita para Cliente Gestor: sem Checklist e Evidências, completa com Relatório e Acompanhamento", () => {
  const trilho = trilhoDoTablet(contexto("Cliente Gestor", true));
  assert.deepEqual(chaves(trilho), ["central", "ncs", "plano", "relatorio", "acompanhamento"]);
  assert.ok(trilho.length <= 5);
});

test("a folha Mais do celular não repete a barra e respeita o perfil", () => {
  const ctx = contexto("Cliente Gestor", false);
  const barra = itensDaBarra(barraInferior(ctx));
  const resto = chaves(itensDaFolhaMais(ctx, barra));
  for (const item of barra) assert.ok(!resto.includes(item.key));
  assert.ok(!resto.includes("acessos") && !resto.includes("registrar"));
});

test("tela atual vira o item ativo", () => {
  assert.equal(chaveAtiva("inicio"), "inicio");
  assert.equal(chaveAtiva("ajuda"), "ajuda");
  assert.equal(chaveAtiva("visita"), "central");
  assert.equal(chaveAtiva("historico"), "central");
  assert.equal(chaveAtiva("checklist"), "checklist");
  assert.equal(chaveAtiva("acessos"), "acessos");
  assert.equal(chaveAtiva("desconhecida"), null);
});
