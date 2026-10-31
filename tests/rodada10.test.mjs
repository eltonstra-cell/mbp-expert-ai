import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { agruparAmbientesPorVinculo, notaDosProprios } from "../lib/agrupamentoDeAmbientes.ts";
import { ambientesParaVisita } from "../lib/ambientesVisita.ts";
import { botaoConfirmeiTudoVisivel, mensagensDaConsulta } from "../lib/cnpjConsulta.ts";
import { SETORES_OFICIAIS_MANUAL } from "../lib/manualBase.ts";

const lerFonte = (caminho) => readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");
const [RECEBIMENTO, ESTOQUE, , , COZINHA] = SETORES_OFICIAIS_MANUAL;

// ===== 3: lista de Ambientes =====
test("ambientes: próprio vinculado a oficial marcado some como linha e entra na nota do oficial", () => {
  const setores = [RECEBIMENTO, COZINHA, "Cozinha do Chico", "Copa"];
  const { linhas, linhaDoProprio } = agruparAmbientesPorVinculo(setores, { "Cozinha do Chico": COZINHA });
  assert.deepEqual(linhas.map((l) => l.setor), [RECEBIMENTO, COZINHA, "Copa"]);
  assert.deepEqual(linhas.find((l) => l.setor === COZINHA).proprios, ["Cozinha do Chico"]);
  assert.equal(linhaDoProprio["Cozinha do Chico"], COZINHA);
  assert.equal(notaDosProprios(["Cozinha do Chico"]), "vinculado ao ambiente próprio Cozinha do Chico");
});

test("ambientes: vários próprios no mesmo oficial aparecem todos, na ordem da lista", () => {
  const setores = [COZINHA, "Cozinha fria", "Cozinha quente", "Forno"];
  const { linhas } = agruparAmbientesPorVinculo(setores, { "Cozinha quente": COZINHA, "Cozinha fria": COZINHA });
  assert.deepEqual(linhas.map((l) => l.setor), [COZINHA, "Forno"]);
  assert.deepEqual(linhas[0].proprios, ["Cozinha fria", "Cozinha quente"]);
  assert.equal(notaDosProprios(linhas[0].proprios), "vinculado aos ambientes próprios Cozinha fria e Cozinha quente");
  assert.equal(notaDosProprios(["A", "B", "C"]), "vinculado aos ambientes próprios A, B e C");
  assert.equal(notaDosProprios([]), "");
});

test("ambientes: oficial vinculado NÃO marcado mantém o próprio como linha normal; sem vínculo nada muda", () => {
  const { linhas, linhaDoProprio } = agruparAmbientesPorVinculo([RECEBIMENTO, "Cozinha do Chico"], { "Cozinha do Chico": COZINHA });
  assert.deepEqual(linhas.map((l) => l.setor), [RECEBIMENTO, "Cozinha do Chico"]);
  assert.deepEqual(linhaDoProprio, {});
  const semVinculo = agruparAmbientesPorVinculo([COZINHA, "Copa"], undefined);
  assert.deepEqual(semVinculo.linhas, [{ setor: COZINHA, proprios: [] }, { setor: "Copa", proprios: [] }]);
});

test("ambientes: o agrupamento não altera a entrada e a visita continua com um ambiente só", () => {
  const setores = [COZINHA, "Cozinha do Chico"];
  const vinculos = { "Cozinha do Chico": COZINHA };
  const copiaSetores = [...setores];
  const copiaVinculos = { ...vinculos };
  agruparAmbientesPorVinculo(setores, vinculos);
  assert.deepEqual(setores, copiaSetores);
  assert.deepEqual(vinculos, copiaVinculos);
  assert.deepEqual(ambientesParaVisita(setores, vinculos), ["Cozinha do Chico"]);
});

test("ambientes: a tela usa o agrupamento, mostra a nota em #526477 e o menu do oficial traz as opções do próprio", () => {
  const tela = lerFonte("components/pc/CadastroAmbientes.tsx");
  assert.ok(tela.includes("agruparAmbientesPorVinculo(setores, vinculos)") && tela.includes("notaDosProprios(vinculadosAqui)"));
  assert.ok(tela.includes("vinculadosAqui.flatMap((p) => itensDoProprio(p, true))"));
  assert.ok(tela.includes('`Renomear${sufixo}`') && tela.includes('"Trocar vínculo" : "Vincular a setor oficial"') && tela.includes('`Remover${sufixo}`'));
  // A contagem continua com os dados reais (todos os setores e todos os próprios).
  assert.ok(tela.includes("linhaDeContagem(oficiaisMarcados.length, SETORES_OFICIAIS_MANUAL.length") && tela.includes("quantidade(proprios.length"));
  assert.ok(lerFonte("app/cadastro-estrutura.css").includes(".cadest-vinculado{font-size:15px;line-height:22px;color:#526477;font-weight:400"));
});

// ===== 4: "Confirmei tudo" =====
test("consulta: 'Confirmei tudo' fica visível com campos pendentes, mesmo com a consulta falhando", () => {
  assert.equal(botaoConfirmeiTudoVisivel({ camposPendentes: true, propostaPendente: false }), true);
  assert.equal(botaoConfirmeiTudoVisivel({ camposPendentes: false, propostaPendente: false }), false);
  assert.equal(botaoConfirmeiTudoVisivel({ camposPendentes: true, propostaPendente: true }), false);
  // Falha da consulta: a mensagem aparece sozinha (sem "Preenchido pela consulta") e o botão continua.
  const falha = mensagensDaConsulta({ mensagem: "Não foi possível consultar agora. Preencha à mão.", propostaPendente: false, camposPendentes: true });
  assert.equal(falha.avisoPreenchido, false);
  assert.ok(falha.mensagem);
  assert.equal(botaoConfirmeiTudoVisivel({ camposPendentes: true, propostaPendente: false }), true);
  const tela = lerFonte("app/page.tsx");
  // Rodada 9 (v2.46): a Nova empresa não tem mais o botão "Confirmei tudo"; a regra pura continua valendo para quem a usar.
  assert.equal(tela.includes("Confirmei tudo"), false);
});

// ===== 1: chip Sincronizado sem caixa =====
test("chip Sincronizado: sem fundo, sem borda, ponto na cor do estado e texto #263445 de 15 px", () => {
  const css = lerFonte("app/globals.css");
  assert.ok(css.includes("background:transparent;border:0;border-radius:0;box-shadow:none;padding:0 4px;color:#263445;font-size:15px;font-weight:400"));
  assert.ok(css.includes("html body .pc-sync-chip.pc-sync-chip.is-ok .pc-sync-dot,html body .campo-sync.campo-sync.is-ok span:first-child{background:#21805B}"));
  assert.ok(css.includes("is-erro .pc-sync-dot,html body .campo-sync.campo-sync.is-erro span:first-child{background:#C83F45}"));
  const page = lerFonte("app/page.tsx");
  assert.equal(page.includes("bg-[#DCEBF7]"), false);
});

// ===== 2: gravidade =====
test("gravidade: Importante em âmbar #E0A800 com texto #263445; Crítica #C83F45 com texto branco; Leve não muda", () => {
  const css = lerFonte("app/globals.css");
  assert.ok(css.includes(".chk-grav--amber.is-on{background:#E0A800;color:#263445}"));
  assert.ok(css.includes(".chk-grav--nc.is-on{background:#C83F45;color:#fff}"));
  assert.ok(css.includes(".chk-grav-linha .chk-grav--leve{--grav:#1F78B4}"));
  assert.ok(css.includes(".chk-grav.is-on.chk-grav--amber .chk-grav-sug{color:#263445}"));
  for (const arquivo of ["components/pc/PcCorrecoes.tsx", "components/campo/CampoTelas.tsx"]) {
    const texto = lerFonte(arquivo);
    assert.ok(texto.includes('Importante: "#E0A800"') && texto.includes('Crítica: "#C83F45"') && texto.includes('Rotina: "#1F78B4"'), arquivo);
  }
  assert.ok(lerFonte("app/page.tsx").includes('"before:bg-[#E0A800]"'));
});

// ===== revisão da rodada 10 =====
test("revisão 10: gravidade não selecionada branca com borda da cor, selecionada preenchida; sem #E0A800 de gravidade", () => {
  const css = lerFonte("app/globals.css");
  assert.ok(css.includes(".chk-grav-linha .chk-grav{min-height:40px;padding:0 14px;border:2px solid var(--grav);"));
  assert.ok(css.includes("background:var(--grav);border-color:var(--grav);color:#fff}"));
  assert.equal(/chk-grav[^{]*\{[^}]*F5A623/.test(css), false);
});

test("revisão 10: botão de sincronização antigo usa o ponto do chip (âmbar e vermelho) e a lista agrupada conta as perguntas do próprio", () => {
  const page = lerFonte("app/page.tsx");
  assert.ok(page.includes('<span className="pc-sync-dot" aria-hidden="true" />') && page.includes('? "Recuperação necessária"') && page.includes('? "Nuvem indisponível"'));
  assert.equal(page.includes('style={{ color: "#1F78B4" }}'), false);
  const tela = lerFonte("components/pc/CadastroAmbientes.tsx");
  assert.ok(tela.includes("vinculadosAqui.length > 0 ? vinculadosAqui : [setor]).map(contaDe)"));
  assert.ok(tela.includes("`Mais ações de ${setor} · ${vinculadosAqui[0]}`"));
  assert.equal(tela.includes("!renomeandoVinculado && ("), false, "o menu não some durante o renomear");
});
