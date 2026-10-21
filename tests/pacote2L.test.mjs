import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { LIMITE_DE_RECENTES, chaveDosRecentes, lerRecentes, podeVirarRecente, registrarRecente } from "../lib/buscaRecentes.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

function armazemEmMemoria() {
  const dados = {};
  return { dados, getItem: (k) => dados[k] ?? null, setItem: (k, v) => { dados[k] = v; } };
}
const destino = (n, extra = {}) => ({ id: `ir:central:${n}`, grupo: "ir", titulo: `Destino ${n}`, detalhe: `Central › Documentos › ${n}`, ...extra });

test("recentes da busca: no máximo 5, mais novo primeiro, sem repetir a rota", () => {
  const armazem = armazemEmMemoria();
  for (let n = 1; n <= 7; n += 1) registrarRecente(destino(n), "u1", armazem);
  const lista = lerRecentes("u1", armazem);
  assert.equal(lista.length, LIMITE_DE_RECENTES);
  assert.deepEqual(lista.map((item) => item.rotulo), ["Destino 7", "Destino 6", "Destino 5", "Destino 4", "Destino 3"]);
  registrarRecente(destino(5), "u1", armazem);
  assert.deepEqual(lerRecentes("u1", armazem).map((item) => item.rotulo), ["Destino 5", "Destino 7", "Destino 6", "Destino 4", "Destino 3"]);
});

test("recentes da busca: guardam só rótulo, rota e caminho, e só destinos de navegação e ação", () => {
  const armazem = armazemEmMemoria();
  registrarRecente({ ...destino(1), acao: { tipo: "empresa", id: "e1" }, empresaId: "e1", cnpj: "11222333000181" }, "u1", armazem);
  const guardado = JSON.parse(armazem.dados[chaveDosRecentes("u1")]);
  assert.deepEqual(Object.keys(guardado[0]).sort(), ["caminho", "rota", "rotulo"]);
  assert.ok(!JSON.stringify(guardado).includes("11222333000181") && !JSON.stringify(guardado).includes("e1"));
  // empresas, visitas e itens do checklist (dados do cliente) nunca viram recente
  for (const grupo of ["empresas", "itens"]) {
    assert.equal(podeVirarRecente({ grupo }), false);
    registrarRecente({ id: `x:${grupo}`, grupo, titulo: "Churrascaria do Chico" }, "u1", armazem);
  }
  assert.equal(lerRecentes("u1", armazem).length, 1);
  assert.equal(podeVirarRecente({ grupo: "agir" }), true);
});

test("recentes da busca: por usuário e a tela funciona sem localStorage", () => {
  const armazem = armazemEmMemoria();
  registrarRecente(destino(1), "u1", armazem);
  assert.equal(lerRecentes("u2", armazem).length, 0);
  assert.equal(lerRecentes(undefined, armazem).length, 0);
  assert.notEqual(chaveDosRecentes("u1"), chaveDosRecentes("u2"));
  const quebrado = { getItem: () => { throw new Error("sem acesso"); }, setItem: () => { throw new Error("cheio"); } };
  assert.deepEqual(lerRecentes("u1", quebrado), []);
  assert.equal(registrarRecente(destino(2), "u1", quebrado).length, 1, "devolve a lista mesmo sem armazenamento");
  assert.deepEqual(lerRecentes("u1", null), []);
  assert.equal(registrarRecente(destino(3), "u1", null).length, 1);
  const ruim = { getItem: () => "{não é json", setItem: () => {} };
  assert.deepEqual(lerRecentes("u1", ruim), []);
  const lixo = { getItem: () => JSON.stringify([{ rotulo: 1 }, null, "x", { rotulo: "A", rota: "r" }]), setItem: () => {} };
  assert.deepEqual(lerRecentes("u1", lixo), [{ rotulo: "A", rota: "r" }]);
});

test("busca no topo: na linha do nome da página, atalhos e recentes dentro do painel, sem a faixa fixa de atalhos", () => {
  const topo = ler("../components/AppTopbar.tsx");
  assert.ok(!topo.includes("pc-smartwrap") && !topo.includes('aria-label="Atalhos"'));
  assert.ok(topo.indexOf("<BuscaNaBarra") > topo.indexOf('aria-label="Caminho"') && topo.indexOf("<BuscaNaBarra") < topo.indexOf("pc-topbar-end"));
  const busca = ler("../components/BuscaNaBarra.tsx");
  assert.ok(busca.includes("Recentes") && busca.includes("Atalhos") && busca.includes("registrarRecente(") && busca.includes("lerRecentes("));
  assert.ok(busca.includes("Digite para buscar · ↑↓ navegam · Enter abre · Esc fecha"));
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".pc-topbar .pc-busca{flex:0 1 520px") && css.includes(".pc-busca-painel{top:100%;margin-top:8px"));
});
