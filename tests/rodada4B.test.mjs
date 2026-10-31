import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const css = ler("../app/globals.css");
const central = ler("../components/pc/PcCentral.tsx");
const pagina = ler("../app/page.tsx");

test("Central da visita (rodada 5): sem a fileira de 4 números nem o cartão 'Atividade da visita'; ficam Próxima etapa, seis cartões e NCs em aberto", () => {
  assert.ok(!central.includes("StatStrip") && !central.includes("Resumo da visita") && !central.includes("Atividade da visita"));
  assert.ok(central.includes("Próxima etapa") && central.includes("cc2-grade") && central.includes("Não conformidades em aberto"));
  assert.ok(!pagina.includes("indicadores={{") && !pagina.includes("atividade={{"));
});

test("Central: cada cartão tem UMA linha de texto; o Checklist diz 'N itens a responder'; o escopo das correções fica no title/aria", () => {
  assert.ok(pagina.includes('qtd(pendentesChecklist, "item a responder", "itens a responder")'));
  assert.ok(!pagina.includes('qtd(conformesChecklist, "conforme", "conformes")'));
  assert.ok(pagina.includes('qtd(linhasConferenciaRel.filter((linha) => !linha.ok).length, "pendência", "pendências")'));
  assert.ok(pagina.includes('resumo: `${ncsAbertas} ${ncsAbertas === 1 ? "aberta" : "abertas"} nesta visita`') && pagina.includes("nesta visita (o menu conta as abertas da empresa toda)"));
  assert.ok(pagina.includes('"Nenhum a criar"'));
  assert.ok(central.includes("aria-label={passo.titulo ?") && central.includes("title={passo.titulo ??"));
  // o "X de Y respondidos" fica só na Próxima etapa
  assert.ok(central.includes("respondidos · {proxima.percentual}%") && !/resumo: `${respondidos} de/.test(pagina));
});

test("Central: a faixa de abas NÃO aparece na Central e continua nas telas internas; 'Finalizar visita' é botão de contorno e usa o fluxo da faixa", () => {
  assert.ok(pagina.includes('modoVisitaNoMenu && visitaAtual && view !== "visita" ? ('));
  assert.ok(pagina.includes('onFinalizar={visitaAtual.status !== "Concluída" && permitido("visitas.concluir", visitaAtual.empresaId) ? () => (modo === "campo" ? setConfirmaFinalizarCampo(true) : void finalizarInspecao()) : null}'));
  assert.ok(central.includes("cc2-finalizar") && central.includes("Finalizar visita") && !central.includes("Editar ambientes"));
  assert.ok(css.includes("cc2-finalizar{flex:none;height:40px;padding:0 18px;border:1.5px solid #7F8BA3;border-radius:10px;background:#fff;color:#1B2433"), "contorno #7F8BA3 com texto preto (verde só em Salvar)");
});

test("Central: seis cartões iguais com círculo de cor forte e ícone branco, em grade de 3 colunas (2 no tablet e no celular)", () => {
  for (const [chave, cor] of [["checklist", "#21805B"], ["evidencias", "#2874DB"], ["correcoes", "#C83F45"], ["pops", "#168080"], ["relatorio", "#526477"], ["equipamentos", "#B4491C"]]) assert.ok(central.includes(`${chave}: "${cor}"`), chave);
  assert.ok(central.includes('className="cc2-seta" aria-hidden="true">›<'));
  assert.ok(css.includes("cc2-grade{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))"));
  assert.ok(css.includes("@media (max-width:1099px){html:root:root body .cc2-grade{grid-template-columns:repeat(2,minmax(0,1fr))}}"));
  assert.ok(css.includes("cc2-icone{display:grid;flex:none;place-items:center;width:44px;height:44px;border-radius:50%;color:#fff}"));
  assert.ok(css.includes("cc2-cartao{display:flex;align-items:center;gap:12px;min-width:0;min-height:76px;padding:10px 14px;border:1px solid #E3E8EE"));
});

test("Central: Próxima etapa em cartão branco (borda #E3E8EE), ícone circular marinho, barra de 6 px e botão laranja com texto branco", () => {
  assert.ok(css.includes("cc2-proxima{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:16px;flex:none;padding:16px 18px;border:1px solid #E3E8EE;border-radius:12px;background:#fff}"));
  assert.ok(css.includes("cc2-proxima-icone{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:#264A80;color:#fff}"));
  assert.ok(css.includes("cc2-barra{height:6px;"));
  assert.ok(css.includes("cc2-continuar{flex:none;height:44px;padding:0 20px;border:0;border-radius:10px;background:var(--botao-laranja);color:#fff"));
});

test("Central: lista de não conformidades com círculo vermelho e ícone branco; linha inteira clicável; 'Ver todas (N) →' no topo; só ela rola", () => {
  assert.ok(!central.includes("Acompanhar →") && !central.includes("<ListRow"));
  assert.ok(central.includes('nc.status !== "Aberta"') && central.includes("onClick={nc.onAbrir}"));
  assert.ok(central.includes("Ver todas ({totalNcsAbertas}) →"));
  assert.ok(central.indexOf("Ver todas") < central.indexOf("className=\"cc2-ncs-lista\""), "o link fica no topo da lista");
  assert.ok(css.includes("cc2-nc-icone{display:grid;flex:none;place-items:center;width:32px;height:32px;border-radius:50%;background:#C83F45;color:#fff}"));
  assert.ok(css.includes("cc2-ncs-lista{display:flex;flex:1 1 0;flex-direction:column;gap:0;min-height:0;overflow-y:auto;"));
  assert.ok(css.includes("cc2-ver-todas{border:0;background:transparent;font:inherit;font-size:15px;color:#264A80"));
  assert.ok(pagina.includes("nomeCurtoDoAmbiente(nomeDeExibicaoDoAmbiente(nc.ambiente))"));
});

test("Nome curto do ambiente: primeiro trecho antes de vírgula, parênteses, barra, ' de ' ou ' e '", async () => {
  const { nomeCurtoDoAmbiente } = await import("../lib/checklistEnvs.ts");
  assert.equal(nomeCurtoDoAmbiente("Recebimento de matérias-primas, ingredientes e embalagens"), "Recebimento");
  assert.equal(nomeCurtoDoAmbiente("Cozinha"), "Cozinha");
});

test("Seletor 'Empresa ativa': sem avatar com iniciais (Completo, Equilibrado e Campo) e rótulo de 15 px", () => {
  const topo = ler("../components/AppTopbar.tsx");
  const campo = ler("../components/campo/CampoTelas.tsx");
  assert.ok(!topo.includes('className="emp-ativa-avatar"') && !campo.includes('className="emp-ativa-avatar"'));
  assert.ok(!topo.includes("empresaIniciais") && !campo.includes("empresaIniciais") && !pagina.includes("empresaIniciais"));
  assert.ok(/.emp-ativa-selo{[^}]*font-size:15px/.test(css));
  assert.ok(css.includes(".emp-ativa-avatar{display:none!important}"));
});

test("Correções: a aba da visita conta abertas da visita; a barra lateral conta vencidas da empresa; os dois dizem isso no title e no aria", () => {
  const faixa = ler("../components/FaixaDaVisita.tsx");
  const nav = ler("../components/AppNavigation.tsx");
  assert.ok(faixa.includes("nesta visita") && faixa.includes("title={badge > 0"));
  assert.ok(nav.includes("na empresa (") && nav.includes("de todas as visitas") && nav.includes("correções abertas"));
  assert.ok(pagina.includes('ncsAbertas={campo && view === "correcoes" ? 0 : ncsAbertas}') && pagina.includes("vencidas={ncsVencidasDaEmpresa}"));
});

test("Central: Equipamentos e móveis é o sexto cartão; vazio diz 'Nenhum cadastrado' e 'Cadastrar' só com permissão de editar a empresa", () => {
  assert.ok(central.includes("Nenhum cadastrado") && central.includes("Equipamentos e móveis"));
  assert.ok(central.includes("disabled={!equipamentos.onCadastrar}"));
  assert.ok(pagina.includes('"Nenhum equipamento cadastrado"'));
  assert.ok(/onCadastrar: atual && atual\.id === visitaAtual\.empresaId && permitido\("empresas\.editar", atual\.id\) \? \(\) => void abrirSecaoEmpresaPeloMenu\("equipamentos"\) : null/.test(pagina), "Cadastrar leva à aba Equipamentos (Estrutura › Equipamentos)");
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
  assert.ok(css.includes('.ui-screen[aria-label="Visitas técnicas"] .ui-tab.is-active{border-bottom-color:#21A3A3;background:transparent;box-shadow:none}'));
  assert.ok(!visitas.includes('<Pill tom="brand">') && !/<Pill[^>]*>Em andamento<\/Pill>/.test(visitas) && !/<Pill[^>]*>Empresa ativa<\/Pill>/.test(visitas));
  assert.ok(visitas.includes('<h1 className="sr-only">Visitas</h1>') && !visitas.includes("Visitas técnicas</h1>"));
});

test("Checklist: rótulo da observação em grafite 15 px sem maiúsculas; Foto, Falar e IA com 15 px; campo começa com 2 linhas e cresce", () => {
  const item = ler("../components/ChecklistFocoItem.tsx");
  assert.ok(item.includes("chk-obs-rotulo") && !item.includes('<span className="ui-eyebrow">{naoConforme'));
  assert.ok(css.includes('html:not([data-modo="campo"]) .chk-pc .chk-obs-campo .chk-obs-area{min-height:56px}'));
  assert.ok(css.includes(".chk-obs-rotulo{font-size:15px;font-weight:400;line-height:22px;letter-spacing:0;text-transform:none;color:#263445}"));
  assert.ok(css.includes("html[data-modo] .chk-foco-obs :is(.chk-linha-foto,.voz-btn,.voz-ia,.voz-barra){font-size:15px}"));
  assert.ok(css.includes('html:not([data-modo="campo"]) .chk-pc .chk-obs-campo .chk-obs-area{flex:none;min-height:84px;max-height:40vh'));
  assert.ok(item.includes("area.style.height = `${area.scrollHeight + 2}px`"));
});
