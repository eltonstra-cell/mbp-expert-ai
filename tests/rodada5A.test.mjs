import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PADRAO_DO_PERFIL } from "../lib/screenAccess.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const css = ler("../app/globals.css");
const item = ler("../components/ChecklistFocoItem.tsx");
const pagina = ler("../app/page.tsx");
const faixa = ler("../components/FaixaDaVisita.tsx");

test("A1/A2: rótulo, Foto/Falar/IA na mesma linha e Limpar resposta na linha das respostas (PC e tablet)", () => {
  assert.ok(item.includes('<div className="chk-obs-cabeca">'));
  assert.ok(item.indexOf('className="chk-obs-rotulo"') < item.indexOf("<FieldVoiceTools"), "o rótulo vem antes de Foto, Falar e IA, no mesmo bloco");
  assert.ok(!item.includes("chk-obs-titulo"), "Limpar resposta saiu da linha da observação");
  assert.ok(item.includes("{botaoLimpar}\n      </div>") && item.indexOf("{botaoLimpar}\n      </div>") < item.indexOf('className="chk-foco-obs"'), "Limpar resposta fica dentro do grupo das respostas, em todos os modos");
  assert.ok(!item.includes("chk-obs-limpar"));
  assert.ok(css.includes('html:not([data-modo="campo"]) .chk-obs-cabeca{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-top:12px}'));
  assert.ok(css.includes('html:not([data-modo="campo"]) .chk-foco-obs :is(.chk-linha-foto,.voz-btn,.voz-ia,.voz-barra){height:40px;min-height:0;padding:0 12px;gap:5px;border-radius:11px;font-size:15px}'));
  assert.ok(css.includes('html:not([data-modo="campo"]) .chk-foco-botoes .chk-limpar{') && css.includes("font-size:15px;font-weight:400;color:#1B2433;text-decoration:underline"));
  assert.ok(css.includes('html:not([data-modo="campo"]) .chk-pc .chk-obs-campo .chk-obs-area{min-height:56px}'));
});

test("A3: aba Central é a primeira, só texto; sem o botão cinza '← Central da visita'", () => {
  assert.ok(faixa.includes('central: "Central"') && !faixa.includes('passo.chave !== "central"'));
  assert.ok(ler("../lib/abasDoCampo.ts").includes('["central", "checklist", "evidencias", "correcoes"]'), "Central também na faixa do Campo");
  for (const arquivo of ["PcChecklist", "PcPopsVisita", "PcRelatorio", "PcAmbientes"]) {
    const fonte = ler(`../components/pc/${arquivo}.tsx`);
    assert.ok(!fonte.includes("← Central") && !fonte.includes("Voltar à Central"), arquivo);
  }
  assert.ok(!pagina.includes("← Central da visita") && !pagina.includes("Voltar à Central\n"));
});

test("A7: a coluna de apoio é decidida pela visita, com largura fixa", () => {
  const pc = ler("../components/pc/PcChecklist.tsx");
  assert.ok(pc.includes("colunaDeApoio?: boolean") && pc.includes("colunaDeApoio ?? !apoioVazio("));
  assert.ok(pagina.includes("colunaDeApoio={colunaDeApoio}"));
  assert.ok(css.includes(".chk-pc-corpo:not(.chk-pc-corpo--sem-apoio){grid-template-columns:minmax(0,1fr) 22rem}"));
});

test("A8: cada cartão da Central some quando o perfil não tem a tela; Executor vê Checklist e Evidências, Fiscal não abre visita", () => {
  assert.ok(pagina.includes('.filter((passo) => telaVisivel(passo.chave === "pops" ? "popsVisita" : (passo.chave as TelaKey)))}\n            onIrPasso'));
  const executor = PADRAO_DO_PERFIL["Executor de campo"];
  assert.deepEqual(["checklist", "evidencias", "correcoes", "popsVisita", "relatorio"].filter((t) => executor[t] !== "oculta"), ["checklist", "evidencias"]);
  const fiscal = PADRAO_DO_PERFIL.Fiscal;
  assert.deepEqual(["checklist", "evidencias", "correcoes", "popsVisita", "relatorio"].filter((t) => fiscal[t] !== "oculta"), []);
});

test("A9: sem espaçamento negativo em títulos e textos de leitura; fica só o logotipo", () => {
  const achados = css.match(/letter-spacing:\s*-[^;}]*/g) || [];
  assert.deepEqual(achados, ["letter-spacing:-.025em"], "só o nome da marca na tela de entrada (.auth-brand-name)");
  assert.ok(css.includes(".auth-brand-name{font-size:1.25rem;font-weight:650;letter-spacing:-.025em}"));
  assert.ok(ler("../components/BrandLogo.tsx").includes("tracking-tight"));
  assert.ok(!pagina.includes("tracking-tight"));
});

test("A6: Conforme e Não conforme não escolhidos com texto grafite mais forte e opacidade reduzida", () => {
  assert.ok(css.includes("html[data-modo] .chk-resp.is-apagado,html[data-modo] .chk-resp.is-apagado span,html[data-modo=\"campo\"] .campo-tela .chk-resp.is-apagado:not(.is-marcado){color:#0B1220}"));
  assert.ok(css.includes('html[data-modo] .chk-resp.is-apagado,html[data-modo="campo"] .campo-tela .chk-resp.is-apagado{opacity:.75}'));
});
