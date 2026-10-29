import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ABAS_PADRAO, TELA_DA_ABA, abasDoCampoDoPerfil, barraComLarguraIgual } from "../lib/abasDoCampo.ts";
import { PADRAO_DO_PERFIL, podeVerTela } from "../lib/screenAccess.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("número do trilho: correções abertas da empresa, pela mesma função da Central (escopo é o único parâmetro), com a permissão de acompanhar", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('permitido("ncs.acompanhar", atual.id) ? correcoesAbertas(db.ncs, { empresaId: atual.id }) : 0'));
  assert.ok(pagina.includes("return correcoesAbertasDaEmpresa(db.ncs, visitaAtual.empresaId);"), "a lista da empresa usa a mesma função de base");
  assert.ok(pagina.includes("vencidas={ncsVencidasDaEmpresa}"));
  assert.ok(pagina.includes("correcoesDoInicio(db.ncs, atual.id, hojeISO())"), "Rodada 12d: o Início lista as mesmas correções abertas que o número do trilho conta");
});

test("topo: dentro da visita o título é só 'Visita N'; o Início usa a mesma barra das outras telas", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('? [`Visita ${numeroVisitaPorId.get(visitaAtual?.id || "") || "—"}`]'));
  assert.equal(pagina.includes('variante={view === "inicio"'), false);
});

test("Correções: aviso do responsável abaixo da lista de pessoas, abas sempre filtram a lista, lista só de pessoas cadastradas", () => {
  const tela = ler("../components/pc/PcCorrecoes.tsx");
  // o aviso do responsável e a lista de pessoas são medidos no navegador (verificar-offline 17g, 17o, 17ac)
  assert.ok(tela.includes("useState<EtapaCorrecao>(() => etapaInicial(itens, selecionadaInicial))") && tela.includes("if (etapaDaCorrecao(nc) !== etapa) return false;"));
  assert.ok(tela.includes("pc-acao-linha") && tela.includes("sugestões"), "ferramentas e sugestões numa linha abaixo da caixa");
});

test("avatar do trilho é um ícone de pessoa (não as iniciais)", () => {
  const nav = ler("../components/AppNavigation.tsx");
  assert.ok(nav.includes('<NavIcon name="acessos" size={22} strokeWidth={1.8} />') && !nav.includes("{usuario.iniciais}"));
});

const pode = (usuario) => (tela) => podeVerTela(usuario, tela);

test("abas do Campo: com o padrão do perfil, Executor e Fiscal mantêm todas as abas-base e nenhuma é de tela oculta", () => {
  for (const perfil of ["Executor de campo", "Fiscal"]) {
    const abas = abasDoCampoDoPerfil(perfil, pode({ perfil }));
    assert.ok(abas.length >= 2, perfil + " ficou com a barra quase vazia");
    for (const aba of abas) {
      const tela = TELA_DA_ABA[aba];
      assert.ok(!tela || PADRAO_DO_PERFIL[perfil][tela] !== "oculta", perfil + " não deveria ter a aba " + aba);
    }
  }
});

test("abas do Campo: se a permissão esconde tudo, a barra nunca fica vazia", () => {
  assert.deepEqual(abasDoCampoDoPerfil("Fiscal", () => false), ["inicio"]);
  assert.deepEqual(abasDoCampoDoPerfil("Executor de campo", () => false), ["registrar"]);
});

test("abas do Campo: Executor = Início, Checklist, Registrar, Evidências; Fiscal = Início e POPs; os demais usam a lista padrão", () => {
  assert.deepEqual(abasDoCampoDoPerfil("Executor de campo", pode({ perfil: "Executor de campo" })), ["inicio", "checklist", "registrar", "evidencias"]);
  assert.deepEqual(abasDoCampoDoPerfil("Fiscal", pode({ perfil: "Fiscal" })), ["inicio", "pops"]);
  assert.equal(abasDoCampoDoPerfil("Consultor/RT", pode({ perfil: "Consultor/RT" })), ABAS_PADRAO);
  assert.equal(abasDoCampoDoPerfil(undefined, () => true), ABAS_PADRAO);
});

test("abas do Campo: tela oculta por ajuste tira a aba do Executor e do Fiscal; o Registrar fica onde está", () => {
  const executor = { perfil: "Executor de campo", telas: { evidencias: "oculta" } };
  assert.deepEqual(abasDoCampoDoPerfil(executor.perfil, pode(executor)), ["inicio", "checklist", "registrar"]);
  const semChecklist = { perfil: "Executor de campo", telas: { checklist: "oculta" } };
  assert.deepEqual(abasDoCampoDoPerfil(semChecklist.perfil, pode(semChecklist)), ["inicio", "registrar", "evidencias"]);
  const fiscal = { perfil: "Fiscal", telas: { pops: "oculta" } };
  assert.deepEqual(abasDoCampoDoPerfil(fiscal.perfil, pode(fiscal)), ["inicio"]);
});

test("barra do Campo: largura igual com 5 abas ou menos; a de 7 abas não muda", () => {
  assert.equal(barraComLarguraIgual(2), true);
  assert.equal(barraComLarguraIgual(4), true);
  assert.equal(barraComLarguraIgual(5), true);
  assert.equal(barraComLarguraIgual(ABAS_PADRAO.length), false);
  const css = ler("../app/globals.css");
  assert.ok(css.includes("html .campo-bar--iguais>*{flex:1 1 0;max-width:96px}"));
});
