import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("UMA regra para o número vermelho: o trilho em Correções usa o mesmo 'vencidos' do Início", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("const ncsVencidasDaEmpresa = dadosDasColunas?.vencidos ?? 0;"));
  assert.ok(pagina.includes("vencidas={ncsVencidasDaEmpresa}"));
  assert.ok(ler("../components/pc/PcInicio.tsx").includes("contadorDoPainel(colunas)"), "o Início escreve o 'N vencidos' pela mesma contagem (colunas.vencidos)");
});

test("topo: dentro da visita o título é só 'Visita N'; o Início usa a mesma barra das outras telas", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('? [`Visita ${numeroVisitaPorId.get(visitaAtual?.id || "") || "—"}`]'));
  assert.equal(pagina.includes('variante={view === "inicio"'), false);
});

test("Correções: aviso do responsável dentro do campo, abas sempre filtram a lista, chips só de pessoas cadastradas", () => {
  const tela = ler("../components/pc/PcCorrecoes.tsx");
  assert.ok(tela.includes('"Escolha o responsável"') && !tela.includes('<span className="ui-field-error">Escolha o responsável</span>'));
  assert.ok(tela.includes("useState<EtapaCorrecao>(() => etapaInicial(itens, selecionadaInicial))") && tela.includes("if (etapaDaCorrecao(nc) !== etapa) return false;"));
  assert.ok(tela.includes("sugestoesDeResponsavel({ cadastradas: pessoas") && !tela.includes("memoriaResponsaveis || []"));
  assert.ok(tela.includes("pc-acao-linha") && tela.includes("sugestões"), "ferramentas e sugestões numa linha abaixo da caixa");
});

test("avatar do trilho é um ícone de pessoa (não as iniciais)", () => {
  const nav = ler("../components/AppNavigation.tsx");
  assert.ok(nav.includes('<NavIcon name="acessos" size={22} strokeWidth={1.8} />') && !nav.includes("{usuario.iniciais}"));
});

test("barras do Campo do Executor e do Fiscal: mesmo visual do trilho, destinos limitados pela permissão", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes(`ehExecutor ? ["inicio", "checklist", "registrar", "evidencias"] : ehFiscal ? ["inicio", "pops"] : ABAS_PADRAO`));
});
