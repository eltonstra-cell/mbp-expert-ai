import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PALETA_EMPRESA } from "../lib/empresaCor.ts";
import { acoesDaEmpresa } from "../lib/menuActions.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");

test("a lista de Empresas não renderiza mais a fileira de bolinhas em cada cartão", () => {
  const lista = ler("../components/pc/PcEmpresas.tsx");
  assert.ok(!lista.includes("emp-cores"));
  assert.ok(!lista.includes("BolinhasDeCor"));
  assert.ok(!lista.includes("PALETA_EMPRESA"));
});

test("o avatar da lista abre a janelinha de cor e o menu ⋯ ganha Mudar cor", () => {
  const lista = ler("../components/pc/PcEmpresas.tsx");
  assert.ok(lista.includes("emp-avatar-btn") && lista.includes("emp-lapis"));
  assert.ok(lista.includes("CorDaEmpresaJanela"));
  assert.ok(lista.includes("Mudar cor"));
  assert.ok(acoesDaEmpresa({ podeEditar: true, podeGerenciarAcessos: false, arquivada: false }).includes("cor"));
  assert.ok(!acoesDaEmpresa({ podeEditar: false, podeGerenciarAcessos: false, arquivada: false }).includes("cor"));
});

test("escolher aplica e fecha; Esc e toque fora fecham; sem botão Salvar", () => {
  const janela = ler("../components/CorDaEmpresa.tsx");
  assert.ok(/const escolher = [\s\S]*onEscolher\(nova\);[\s\S]*onFechar\(\);/.test(janela));
  assert.ok(janela.includes('evento.key === "Escape"'));
  assert.ok(janela.includes("onClick={onFechar}"));
  assert.ok(!/Salvar/.test(janela));
});

test("cada bolinha tem nome acessível e a paleta tem 8 cores nomeadas", () => {
  assert.deepEqual(
    PALETA_EMPRESA.map((cor) => cor.nome),
    ["Verde", "Coral", "Azul", "Âmbar", "Rosa", "Turquesa", "Grafite", "Oliva"]
  );
  const janela = ler("../components/CorDaEmpresa.tsx");
  assert.ok(janela.includes("aria-label={opcao.nome}") && janela.includes("aria-pressed={marcada}"));
});

test("o formulário da empresa continua com o campo Cor e grava a cor escolhida", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('rotulo="Cor da empresa" variante="linha"'));
  assert.ok(pagina.includes("cor: form.cor ||"));
  assert.ok(pagina.includes("proximaCorLivre(Object.values(db.empresas))"));
});
