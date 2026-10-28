import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const css = ler("../app/globals.css");
const central = ler("../components/pc/PcCentral.tsx");
const pagina = ler("../app/page.tsx");

test("Central da visita: sem a fileira de 4 números nem o cartão 'Atividade da visita'; ficam Próxima etapa, atalhos e NCs em aberto", () => {
  assert.ok(!central.includes("StatStrip") && !central.includes("Resumo da visita") && !central.includes("Atividade da visita"));
  assert.ok(central.includes("Próxima etapa") && central.includes("pc-steps-row") && central.includes("Não conformidades em aberto"));
  assert.ok(!pagina.includes("indicadores={{") && !pagina.includes("atividade={{"));
});

test("Central: cada número aparece uma vez, com rótulo que diz o que conta (checklist sem resposta; pendências do relatório; correções abertas da visita)", () => {
  assert.ok(pagina.includes('qtd(pendentesChecklist, "item sem resposta", "itens sem resposta")'));
  assert.ok(pagina.includes('"pendência do relatório", "pendências do relatório"'));
  assert.ok(pagina.includes('qtd(ncsAbertas, "aberta", "abertas")} nesta visita'));
});

test("Correções: a aba da visita conta abertas da visita; a barra lateral conta vencidas da empresa; os dois dizem isso no title e no aria", () => {
  const faixa = ler("../components/FaixaDaVisita.tsx");
  const nav = ler("../components/AppNavigation.tsx");
  assert.ok(faixa.includes("nesta visita") && faixa.includes("title={badge > 0"));
  assert.ok(nav.includes("na empresa, de todas as visitas") && nav.includes("correções vencidas"));
  assert.ok(pagina.includes("ncsAbertas={ncsAbertas}") && pagina.includes("vencidas={ncsVencidasDaEmpresa}"));
});

test("Central: equipamento e programas vazios viram linha compacta; 'Cadastrar ›' só com permissão de editar a empresa", () => {
  assert.ok(central.includes("pc-vazio-linha") && central.includes("Cadastrar ›") && central.includes("Nenhum programa ativo"));
  assert.ok(central.includes("equipamentos.onCadastrar &&"));
  assert.ok(pagina.includes('"Nenhum equipamento cadastrado"'));
  assert.ok(/onCadastrar: atual && atual\.id === visitaAtual\.empresaId && permitido\("empresas\.editar", atual\.id\) \? \(\) => irParaMenu\("cadastros"\) : null/.test(pagina));
  assert.ok(!central.includes("Nenhum programa ativo para esta visita"));
});

test("Pontinhos coloridos dos cartões de número saíram; espaço entre a faixa de abas e o título da Central", () => {
  assert.ok(!/\.ui-stat::after/.test(css));
  assert.ok(css.includes('.ui-screen[aria-label="Central da visita"]{padding-top:16px}'));
});

test("Topo do Completo: Empresa ativa com contorno na cor da empresa; o modo de tela sai do topo e fica no menu ⋯", () => {
  assert.ok(css.includes('html[data-modo="completo"] .pc-topbar:not(.pc-topbar--inicio) .emp-ativa-caixa{height:38px;padding:0 12px;border:2px solid var(--emp-cor)'));
  assert.ok(css.includes('html[data-modo="completo"] .pc-topbar .pc-mode-chip{display:none}'));
  const topo = ler("../components/AppTopbar.tsx");
  assert.ok(topo.includes('{itensModo.length > 0 && <RowMenu itens={itensModo} rotulo="Modo de tela" />}'));
});

test("Caminho do topo dentro da visita é só 'Visita N' (sem empresa nem nome da página repetido); título 'Checklist' fica só para leitor de tela", () => {
  assert.ok(/\? \[`Visita \$\{numeroVisitaPorId\.get\(visitaAtual\?\.id \|\| ""\) \|\| "—"\}`\]/.test(pagina));
  assert.ok(css.includes('.ui-screen[aria-label="Checklist"] .ui-head .ui-title{position:absolute;width:1px'));
});

test("Visitas: abas em texto com sublinhado na ativa (sem pílula), sem chip 'Em andamento' nem 'Empresa ativa' nas linhas, um só título", () => {
  const visitas = ler("../components/pc/PcVisitas.tsx");
  assert.ok(css.includes('.ui-screen[aria-label="Visitas técnicas"] .ui-tab.is-active{border-bottom-color:#AF640A;background:transparent;box-shadow:none}'));
  assert.ok(!visitas.includes('<Pill tom="brand">') && !/<Pill[^>]*>Em andamento<\/Pill>/.test(visitas) && !/<Pill[^>]*>Empresa ativa<\/Pill>/.test(visitas));
  assert.ok(visitas.includes('<h1 className="sr-only">Visitas</h1>') && !visitas.includes("Visitas técnicas</h1>"));
});

test("Checklist: rótulo da observação em grafite 15 px sem maiúsculas; Foto, Falar e IA com 15 px; campo começa com 84 px e cresce", () => {
  const item = ler("../components/ChecklistFocoItem.tsx");
  assert.ok(item.includes('<span className="chk-obs-rotulo">') && !item.includes('<span className="ui-eyebrow">{naoConforme'));
  assert.ok(css.includes(".chk-obs-rotulo{font-size:15px;font-weight:400;line-height:22px;letter-spacing:0;text-transform:none;color:#1B2433}"));
  assert.ok(css.includes("html[data-modo] .chk-foco-obs :is(.chk-linha-foto,.voz-btn,.voz-ia,.voz-barra){font-size:15px}"));
  assert.ok(css.includes('html:not([data-modo="campo"]) .chk-pc .chk-obs-campo .chk-obs-area{flex:none;min-height:84px;max-height:40vh'));
  assert.ok(item.includes("area.style.height = `${area.scrollHeight + 2}px`"));
});
