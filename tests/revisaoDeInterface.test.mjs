import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { contadorDoPainel, partesDoContador } from "../lib/inicio.ts";
import { maisEstaAtivo } from "../lib/navigation.ts";
import { criarRascunhosDeCorrecao, planoAoAbrir, textoDoQueFalta } from "../lib/rascunhoDeCorrecao.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

const luminancia = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const razaoComBranco = (hex) => 1.05 / (luminancia(hex) + 0.05);
const tokenDoCss = (nome) => {
  const achado = ler("../app/globals.css").match(new RegExp(`${nome}:(#[0-9A-Fa-f]{6});`));
  assert.ok(achado, `token ${nome} não encontrado`);
  return achado[1];
};

const base = { acao: "", responsavel: "", prazo: "2026-11-05", causa: "" };

test("rascunho: o que foi digitado volta ao reabrir a correção; sem rascunho valem os valores da correção", () => {
  const rascunhos = criarRascunhosDeCorrecao();
  assert.deepEqual(planoAoAbrir(base, rascunhos.obter("nc-1")), base);
  rascunhos.guardar("nc-1", { ...base, acao: "Trocar o ralo", responsavel: "Ana" }, base);
  assert.deepEqual(planoAoAbrir(base, rascunhos.obter("nc-1")), { ...base, acao: "Trocar o ralo", responsavel: "Ana" });
  assert.equal(rascunhos.obter("nc-2"), undefined, "cada correção tem o seu rascunho");
});

test("rascunho: um por correção, atualizado a cada digitação e removido quando volta ao valor da correção", () => {
  const rascunhos = criarRascunhosDeCorrecao();
  rascunhos.guardar("nc-1", { ...base, acao: "a" }, base);
  rascunhos.guardar("nc-2", { ...base, causa: "Falta de treino" }, base);
  rascunhos.guardar("nc-1", { ...base, acao: "ab" }, base);
  assert.equal(rascunhos.tamanho(), 2);
  assert.equal(rascunhos.obter("nc-1").acao, "ab");
  rascunhos.guardar("nc-1", base, base);
  assert.equal(rascunhos.obter("nc-1"), undefined);
  assert.equal(rascunhos.tamanho(), 1);
});

test("rascunho: limpar ao salvar ou resolver apaga só aquela correção, e o valor devolvido é uma cópia", () => {
  const rascunhos = criarRascunhosDeCorrecao();
  rascunhos.guardar("nc-1", { ...base, acao: "x" }, base);
  rascunhos.guardar("nc-2", { ...base, acao: "y" }, base);
  const copia = planoAoAbrir(base, rascunhos.obter("nc-1"));
  copia.acao = "mudou fora";
  assert.equal(rascunhos.obter("nc-1").acao, "x");
  rascunhos.limpar("nc-1");
  assert.equal(rascunhos.obter("nc-1"), undefined);
  assert.equal(rascunhos.obter("nc-2").acao, "y");
  assert.deepEqual(planoAoAbrir(base, rascunhos.obter("nc-1")), base);
});

test("rascunho parcial: guarda só os campos editados e mescla sobre a base ATUAL da correção", () => {
  const rascunhos = criarRascunhosDeCorrecao();
  rascunhos.guardar("nc-1", { ...base, acao: "Trocar o ralo" }, base);
  assert.deepEqual(rascunhos.obter("nc-1"), { acao: "Trocar o ralo" });
  const baseNova = { ...base, prazo: "2030-01-01", responsavel: "Bia" };
  assert.deepEqual(planoAoAbrir(baseNova, rascunhos.obter("nc-1")), { ...baseNova, acao: "Trocar o ralo" });
  rascunhos.guardar("nc-1", { ...base, acao: "Trocar o ralo", causa: "Falta de treino" }, base);
  assert.deepEqual(rascunhos.obter("nc-1"), { acao: "Trocar o ralo", causa: "Falta de treino" });
});

test("rascunho: lote, marcar como feita, desfazer e troca de empresa/usuário limpam o rascunho", () => {
  const tela = ler("../components/pc/PcCorrecoes.tsx");
  assert.match(tela, /onLote\(ids, valoresDeLoteNormalizados\(valores, pessoas\)\);\s*ids\.forEach\(\(id\) => rascunhos\.limpar\(id\)\)/);
  assert.match(tela, /onMarcarFeita\(id, observacao\);\s*rascunhos\.limpar\(id\)/);
  assert.match(tela, /onDesfazerFeita\(id\);\s*rascunhos\.limpar\(id\)/);
  const pagina = ler("../app/page.tsx");
  assert.match(pagina, /<PcCorrecoes\s+key=\{\x60\$\{visitaAtual\.empresaId\}:\$\{usuarioDaSessao\?\.id/);
});

test("Correções: o motivo do Salvar plano e o aviso do responsável não se repetem para leitor de tela", () => {
  const tela = ler("../components/pc/PcCorrecoes.tsx");
  assert.ok(!tela.includes("title={motivoDoBotao}") && !/title=\{motivoDoBotao \? (?!undefined)/.test(tela) && !tela.includes("resp-aviso"), "o motivo do botão desabilitado não vai em title");
  assert.ok(tela.includes("aria-describedby={motivoDoBotao"));
});

test("rascunho: só memória, sem localStorage nem rede", () => {
  const fonte = ler("../lib/rascunhoDeCorrecao.ts");
  assert.ok(!/localStorage|sessionStorage|fetch\(|indexedDB/.test(fonte));
  const tela = ler("../components/pc/PcCorrecoes.tsx");
  assert.ok(!/localStorage|sessionStorage/.test(tela));
});

test("Salvar plano desabilitado diz o motivo na hora, em texto", () => {
  assert.equal(textoDoQueFalta([]), "");
  assert.equal(textoDoQueFalta(["a ação"]), "Falta: a ação");
  assert.equal(textoDoQueFalta(["a ação", "o responsável"]), "Falta: a ação e o responsável");
  assert.equal(textoDoQueFalta(["a ação", "o responsável", "o prazo"]), "Falta: a ação, o responsável e o prazo");
});

test("âmbar do trilho: texto e ícone brancos passam no contraste (texto 4,5:1; ícone 3:1)", () => {
  const ambar = tokenDoCss("--rd-ambar");
  assert.equal(ambar.toUpperCase(), "#AF640A");
  assert.ok(razaoComBranco(ambar) >= 4.5, `contraste ${razaoComBranco(ambar).toFixed(3)}`);
  assert.ok(razaoComBranco(ambar) >= 3);
  assert.ok(razaoComBranco("#D9890B") < 3, "o âmbar antigo não passava");
});

test("âmbar: nenhum hex literal antigo sobrou no CSS, nos componentes nem no CLAUDE.md", () => {
  for (const arquivo of ["../app/globals.css", "../scripts/verificar-offline.mjs", "../components/pc/PcInicio.tsx", "../components/pc/PcCorrecoes.tsx", "../components/AppNavigation.tsx", "../CLAUDE.md"]) {
    assert.ok(!/D9890B|217,s*137,s*11/i.test(ler(arquivo)), `${arquivo} ainda cita o âmbar antigo`);
  }
});

test("vencidas do Início: vermelho de função com contraste de 4,5:1 sobre o branco do Início", () => {
  assert.ok(razaoComBranco(tokenDoCss("--rd-venceu")) >= 4.5);
  assert.ok(razaoComBranco(tokenDoCss("--rd-cinza")) >= 4.5, "texto de apoio do Início");
  assert.ok(razaoComBranco(tokenDoCss("--rd-laranja-texto")) >= 4.5, "'N sem responsável'");
  const css = ler("../app/globals.css");
  assert.match(css, /\.ini3-parte--urgente\{color:var\(--rd-venceu\)\}/, "sem negrito, só a cor");
});

test("partes do contador: vencidas são urgentes; aguardando e sem prazo não; a string continua a mesma", () => {
  const zero = { correcao: 0, comprovante: 0, capacitacao: 0, pop: 0 };
  const entrada = { vencidosPorOrigem: { correcao: 3, comprovante: 1, capacitacao: 2, pop: 1 }, aguardando: 2, semPrazo: 1 };
  const partes = partesDoContador(entrada);
  assert.deepEqual(partes.map((p) => p.texto), ["3 correções vencidas", "1 comprovante vencido", "2 treinamentos vencidos", "1 POP vencido", "2 aguardando aprovação", "1 aberta sem prazo"]);
  assert.deepEqual(partes.map((p) => p.urgente), [true, true, true, true, false, false]);
  assert.equal(contadorDoPainel(entrada), partes.map((p) => p.texto).join(" · "));
  assert.deepEqual(partesDoContador({ vencidosPorOrigem: zero, aguardando: 0, semPrazo: 0 }), []);
  assert.equal(contadorDoPainel({ vencidosPorOrigem: zero, aguardando: 0, semPrazo: 0 }), "");
});

test("'Mais' do trilho é a página atual nos destinos que ele guarda, e só neles", () => {
  const extras = ["empresas", "cadastros", "ajuda", "acessos"].map((key) => ({ key }));
  for (const chave of ["empresas", "cadastros", "ajuda", "acessos"]) assert.equal(maisEstaAtivo(chave, extras), true, chave);
  for (const chave of ["inicio", "visitas", "ncs", "pops", "relatorios", null]) assert.equal(maisEstaAtivo(chave, extras), false, String(chave));
  assert.equal(maisEstaAtivo("empresas", []), false, "sem destinos no Mais (perfil sem acesso) não há ladrilho");
  const nav = ler("../components/AppNavigation.tsx");
  assert.ok(nav.includes("<Ladrilho ativo={maisAtivo}>") && nav.includes('aria-current={maisAtivo ? "page" : undefined}'));
});

test("Início: 'Hoje precisa de você' é o h2 da seção; o rótulo PENDÊNCIAS não é título", () => {
  const inicio = ler("../components/pc/PcInicio.tsx");
  assert.ok(inicio.includes('<p className="ini3-rotulo">PENDÊNCIAS</p>'));
  assert.ok(!inicio.includes("CORREÇÕES"));
  assert.ok(inicio.includes('<h2 id="ini3-pendencias-titulo" className="ini3-titulo">Hoje precisa de você</h2>'));
  assert.ok(inicio.includes('aria-labelledby="ini3-pendencias-titulo"') && !inicio.includes('aria-label="Hoje precisa de você"'));
});

test("Início: lista sem variável inerte, linha de 60 px com line-height fixo, botão do cartão limitado e texto de apoio em 15 px", () => {
  const css = ler("../app/globals.css");
  assert.ok(!css.includes("--ini3-minimo") && !ler("../components/pc/PcInicio.tsx").includes("--ini3-minimo"));
  assert.match(css, /\.ini3-linha-titulo\{[^}]*line-height:22px/);
  assert.match(css, /\.ini3-linha-sub\{[^}]*line-height:22px/);
  assert.match(css, /\.ini3-botao--cartao\{align-self:flex-start;min-width:160px;max-width:220px\}/);
  for (const seletor of [".ini3-resumo", ".ini3-linha-sub", ".ini3-tag", ".ini3-config", ".ini3-cartao-sub", ".ini3-rodape-lista"]) {
    const regra = css.match(new RegExp(`${seletor.replace(".", "\\.")}\\{[^}]*\\}`));
    assert.ok(regra && /font-size:15px/.test(regra[0]), `${seletor} em 15 px`);
  }
  assert.match(css, /\.ini3-botao\{[^}]*height:40px/);
});

test("Correções: botões 'Aplicar a N' e 'Confirmar e resolver' seguem o azul de ação (40 px), sem mexer no .ui-btn--primary global", () => {
  const tela = ler("../components/pc/PcCorrecoes.tsx");
  assert.ok(!tela.includes("ui-btn--primary"));
  assert.ok((tela.match(/ui-btn--acao/g) || []).length >= 3);
  const css = ler("../app/globals.css");
  assert.match(css, /html \.ui-btn\.ui-btn--acao\{height:40px;[^}]*background:var\(--rd-acao\)[^}]*color:#fff/);
});
