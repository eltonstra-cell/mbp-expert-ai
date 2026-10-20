import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { acharItemDeDestino, mostrarCartaoProximaEtapa, primeiroItemSemResposta, proximaEtapaDaVisita, textoDoContinuar } from "../lib/proximaEtapa.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
const css = ler("../app/globals.css");

const lista = [
  { id: "a1", ambiente: "Área de resíduos", titulo: "Lixeiras", status: "Conforme" },
  { id: "p1", ambiente: "Pré-preparo", titulo: "Bancadas", status: "Conforme" },
  { id: "p2", ambiente: "Pré-preparo", titulo: "Facas", status: "Pendente" },
  { id: "a2", ambiente: "Área de resíduos", titulo: "Piso", status: "Pendente" },
];

test("C: o destino é o primeiro item sem resposta na ordem da visita", () => {
  assert.equal(primeiroItemSemResposta(lista, ["Pré-preparo", "Área de resíduos"])?.id, "p2");
  assert.equal(primeiroItemSemResposta(lista, ["Área de resíduos", "Pré-preparo"])?.id, "a2");
  assert.equal(primeiroItemSemResposta(lista.map((i) => ({ ...i, status: "Conforme" })), []), undefined);
});

test("C: o item do cartão é achado pelo id e, se o id mudou, por ambiente e título", () => {
  assert.equal(acharItemDeDestino(lista, { id: "p2", ambiente: "x", titulo: "y" })?.id, "p2");
  assert.equal(acharItemDeDestino(lista, { id: "novo", ambiente: "Pré-preparo", titulo: "Facas" })?.id, "p2");
  assert.equal(acharItemDeDestino(lista, { id: "novo", ambiente: "Pré-preparo", titulo: "Outro" }), undefined);
});

test("C: cartão escondido enquanto há itens sem resposta e texto no botão Continuar", () => {
  const faltam = proximaEtapaDaVisita(48, []);
  assert.equal(mostrarCartaoProximaEtapa(faltam), false);
  assert.equal(textoDoContinuar(faltam), "48 itens sem resposta");
  assert.equal(textoDoContinuar(proximaEtapaDaVisita(1, [])), "1 item sem resposta");
  const semPlano = proximaEtapaDaVisita(0, [{ id: "n1", status: "Aberta" }]);
  assert.equal(mostrarCartaoProximaEtapa(semPlano), true);
  assert.equal(semPlano.tipo, "correcoes");
  assert.equal(textoDoContinuar(semPlano), undefined);
  const relatorio = proximaEtapaDaVisita(0, []);
  assert.equal(mostrarCartaoProximaEtapa(relatorio), true);
  assert.equal(relatorio.titulo, "Gerar relatório");
});

test("C: Continuar checklist e o cartão abrem o item de destino, sem usar o último guardado", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("continuar(alvo.id, true, proximoItem)"));
  assert.ok(pagina.includes("continuarDetalhe={textoDoContinuar(etapaDoAlvo)}"));
  assert.ok(pagina.includes("etapaDoAlvo && mostrarCartaoProximaEtapa(etapaDoAlvo)"));
  assert.ok(pagina.includes("if (itemEscolhido) setItemFocoId(itemEscolhido.id);"));
  assert.ok(ler("../components/campo/CampoTelas.tsx").includes("campo-btn-detalhe"));
});

