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

test("Central: cada cartão tem UMA linha de texto com o número real; o escopo das correções fica no title/aria; sem 'N conformes · N itens sem resposta'", () => {
  assert.ok(pagina.includes('resumo: `${respondidos} de ${totalChecklist} ${totalChecklist === 1 ? "item" : "itens"}`'));
  assert.ok(!pagina.includes('qtd(conformesChecklist, "conforme", "conformes")'));
  assert.ok(pagina.includes('qtd(linhasConferenciaRel.filter((linha) => !linha.ok).length, "pendência", "pendências")'));
  assert.ok(pagina.includes('resumo: qtd(ncsAbertas, "aberta", "abertas")') && pagina.includes("nesta visita (a barra lateral conta só as vencidas da empresa toda)"));
  assert.ok(pagina.includes('"Nenhum a criar"'));
  assert.ok(central.includes("aria-label={passo.titulo ?") && central.includes("title={passo.titulo ??"));
});

test("Central: a faixa de abas NÃO aparece na Central (os cartões são a navegação) e continua nas telas internas; Finalizar visita no topo usa o fluxo da faixa", () => {
  assert.ok(pagina.includes('modoVisitaNoMenu && visitaAtual && view !== "visita" ? ('));
  assert.ok(pagina.includes('onFinalizar={visitaAtual.status !== "Concluída" && permitido("visitas.concluir", visitaAtual.empresaId) ? () => (modo === "campo" ? setConfirmaFinalizarCampo(true) : void finalizarInspecao()) : null}'));
  assert.ok(central.includes("pc-central-finalizar") && central.includes("Finalizar visita") && central.includes("Editar ambientes"));
  assert.ok(central.indexOf("pc-central-finalizar") < central.indexOf("Editar ambientes"), "Finalizar vem antes de Editar ambientes, na mesma linha do título");
  assert.ok(css.includes("pc-central-finalizar{border:0;background:#21805B;color:#fff}"));
});

test("Central: cartões de 84 px com ícone branco em quadrado colorido (cores do DS) e seta '›'; cartão branco com texto grafite", () => {
  assert.ok(css.includes(".pc-steps-row .pc-step-card{height:84px;min-height:84px;"));
  for (const [tom, cor] of [["ok", "#21805B"], ["info", "#1F78B4"], ["nc", "#C83F45"], ["pend", "#168080"], ["lilas", "#526477"]]) assert.ok(css.includes(`.pc-steps-row .pc-step-card--${tom} .pc-step-tile{background:${cor}}`), tom);
  assert.ok(central.includes('className="pc-step-arrow" aria-hidden="true">›<'));
  assert.ok(css.includes(".pc-steps-row .pc-step-name,.pc-steps-row .pc-step-sum{min-width:0;overflow:visible;text-overflow:clip;white-space:normal;overflow-wrap:break-word;font-weight:400;color:#263445}"), "sem reticências nos cartões da Central");
});

test("Central: lista de não conformidades sem chip 'Aberta' nem 'Acompanhar →'; linha inteira clicável com seta; 'Ver todas (N) →' no topo", () => {
  assert.ok(!central.includes("Acompanhar →"));
  assert.ok(central.includes('nc.status !== "Aberta" ?') && central.includes("onClick={nc.onAbrir}") && central.includes("seta"));
  assert.ok(central.includes("Ver todas ({totalNcsAbertas}) →"));
  assert.ok(central.indexOf("Ver todas") < central.indexOf("<ListRow"), "o link fica no topo da lista");
  const linha = ler("../components/ui/ListRow.tsx");
  assert.ok(linha.includes('role={clicavel ? "button" : undefined}') && linha.includes("ui-row-seta"));
  assert.ok(css.includes(".pc-open-list .ui-row.is-clickable:focus-visible{outline:3px solid #264A80"));
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
  assert.ok(nav.includes("na empresa, de todas as visitas") && nav.includes("correções vencidas"));
  assert.ok(pagina.includes("ncsAbertas={ncsAbertas}") && pagina.includes("vencidas={ncsVencidasDaEmpresa}"));
});

test("Central: equipamento e programas vazios viram linha compacta; 'Cadastrar ›' só com permissão de editar a empresa", () => {
  assert.ok(central.includes("pc-vazio-linha") && central.includes("Cadastrar ›") && central.includes("Nenhum programa ativo"));
  assert.ok(central.includes("equipamentos.onCadastrar &&"));
  assert.ok(pagina.includes('"Nenhum equipamento cadastrado"'));
  assert.ok(/onCadastrar: atual && atual\.id === visitaAtual\.empresaId && permitido\("empresas\.editar", atual\.id\) \? \(\) => void abrirSecaoEmpresaPeloMenu\("equipamentos"\) : null/.test(pagina), "Cadastrar leva à aba Equipamentos (Estrutura › Equipamentos)");
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
  assert.ok(css.includes('.ui-screen[aria-label="Visitas técnicas"] .ui-tab.is-active{border-bottom-color:#21A3A3;background:transparent;box-shadow:none}'));
  assert.ok(!visitas.includes('<Pill tom="brand">') && !/<Pill[^>]*>Em andamento<\/Pill>/.test(visitas) && !/<Pill[^>]*>Empresa ativa<\/Pill>/.test(visitas));
  assert.ok(visitas.includes('<h1 className="sr-only">Visitas</h1>') && !visitas.includes("Visitas técnicas</h1>"));
});

test("Checklist: rótulo da observação em grafite 15 px sem maiúsculas; Foto, Falar e IA com 15 px; campo começa com 2 linhas e cresce", () => {
  const item = ler("../components/ChecklistFocoItem.tsx");
  assert.ok(item.includes('<span className="chk-obs-rotulo">') && !item.includes('<span className="ui-eyebrow">{naoConforme'));
  assert.ok(css.includes('html:not([data-modo="campo"]) .chk-pc .chk-obs-campo .chk-obs-area{min-height:56px}'));
  assert.ok(css.includes(".chk-obs-rotulo{font-size:15px;font-weight:400;line-height:22px;letter-spacing:0;text-transform:none;color:#263445}"));
  assert.ok(css.includes("html[data-modo] .chk-foco-obs :is(.chk-linha-foto,.voz-btn,.voz-ia,.voz-barra){font-size:15px}"));
  assert.ok(css.includes('html:not([data-modo="campo"]) .chk-pc .chk-obs-campo .chk-obs-area{flex:none;min-height:84px;max-height:40vh'));
  assert.ok(item.includes("area.style.height = `${area.scrollHeight + 2}px`"));
});
