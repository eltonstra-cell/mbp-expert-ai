import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ressalvasDeFinalizar, tituloFaltam } from "../lib/ressalvasDeFinalizar.ts";
import { ABAS_PADRAO, PASSOS_DA_FAIXA_NO_CAMPO, abasDoCampoDoPerfil, destinoFicaSoNoMais, finalizarComRotulo } from "../lib/abasDoCampo.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("Mais: POPs e Relatórios só ficam no Mais quando a barra de baixo não tem o destino (Executor e Fiscal)", () => {
  assert.equal(destinoFicaSoNoMais("pops", ABAS_PADRAO), false);
  assert.equal(destinoFicaSoNoMais("relatorios", ABAS_PADRAO), false);
  const executor = abasDoCampoDoPerfil("Executor de campo", () => true);
  assert.equal(destinoFicaSoNoMais("pops", executor), true);
  assert.equal(destinoFicaSoNoMais("relatorios", executor), true);
  const fiscal = abasDoCampoDoPerfil("Fiscal", () => true);
  assert.equal(destinoFicaSoNoMais("pops", fiscal), false);
  assert.equal(destinoFicaSoNoMais("relatorios", fiscal), true);
});

test("Finalizar no Campo: o rótulo 'Finalizar' só aparece com o checklist inteiro respondido", () => {
  assert.equal(finalizarComRotulo(0, 0), false, "sem itens não há o que finalizar com rótulo");
  assert.equal(finalizarComRotulo(10, 3), false);
  assert.equal(finalizarComRotulo(10, 1), false);
  assert.equal(finalizarComRotulo(10, 0), true);
});

test("Faixa da visita no Campo: só Checklist, Evidências e Correções (POPs e Relatório ficam em Mais › Desta visita)", () => {
  assert.deepEqual([...PASSOS_DA_FAIXA_NO_CAMPO], ["checklist", "evidencias", "correcoes"]);
});

test("Finalizar visita no Campo: o ✓ abre a confirmação e finalizarInspecao só roda ao confirmar; PC continua chamando direto", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("onFinalizar={() => (campo ? setConfirmaFinalizarCampo(true) : void finalizarInspecao())}"));
  const dialogo = pagina.slice(pagina.indexOf("<ConfirmarFinalizar"), pagina.indexOf("<CommandPalette"));
  assert.ok(dialogo.includes("onCancelar={() => setConfirmaFinalizarCampo(false)}"));
  assert.ok(/onFinalizar=\{\(\) => \{\s*setConfirmaFinalizarCampo\(false\);\s*void finalizarInspecao\(\{ jaConfirmado: true \}\);/.test(dialogo));
  assert.equal(dialogo.split("finalizarInspecao").length, 2, "uma única chamada, dentro do Finalizar da janela única");
  assert.ok(dialogo.includes("faltam={pendentesVisita}") && dialogo.includes("ressalvas={ressalvasDeVisita()}"));
  assert.ok(/onVoltarECompletar=\{\(\) => \{\s*setConfirmaFinalizarCampo\(false\);\s*abrirChecklist\(\);/.test(dialogo));
  const faixa = ler("../components/FaixaDaVisita.tsx");
  assert.ok(faixa.includes('aria-label="Finalizar visita"') && faixa.includes('title={campo ? "Finalizar visita" : undefined}'));
  assert.ok(faixa.includes('{(!campo || comRotulo) && <span>{campo ? "Finalizar" : "Finalizar visita"}</span>}'));
});

test("Confirmação de finalizar: dialog modal com título, Cancelar e Finalizar; Esc fecha; foco no botão seguro", () => {
  const janela = ler("../components/campo/ConfirmarFinalizar.tsx");
  for (const texto of ['role="dialog"', 'aria-modal="true"', 'aria-labelledby="cf-titulo"', "Finalizar a visita?", "Cancelar", 'evento.key === "Escape"', "primeiroRef.current?.focus()"]) assert.ok(janela.replace(/\r\n/g, "\n").includes(texto), texto);
  assert.ok(/Finalizar\s*<\/button>/.test(janela));
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".cf-btn{flex:1 1 0;font-family:inherit;min-height:44px;") && css.includes(".cf-btn--finalizar{border:0;background:var(--rd-verde-botao);color:#fff}"));
});

test("Checklist do Campo: busca do PC no cabeçalho, respostas sem ícone, observação sem rótulo e medidas pedidas", () => {
  const busca = ler("../components/BuscaNaBarra.tsx");
  assert.ok(busca.includes('variante?: "inicio" | "campo"') && busca.includes('variante !== "campo" && <kbd'));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('variante="campo"') && pagina.includes("semBusca={modo === \"campo\"}"));
  assert.ok(/onAvancar=\{\(status\) => avancarAposResponder\(foco, status\)\}\s*campo\s*\/>/.test(pagina));
  const item = ler("../components/ChecklistFocoItem.tsx").replace(/\r\n/g, "\n");
  assert.ok(item.includes("{!campo && (estado === \"marcado\" || simbolo)"), "respostas sem ícone no Campo");
  assert.ok(/\{!campo && \(\s*<div className="chk-obs-titulo">/.test(item), "sem o rótulo 'Observação (opcional)' no Campo");
  assert.ok(item.includes('campo ? "Observação" : ""'));
  assert.ok(item.includes("Observação (opcional)"), "o PC mantém o rótulo");
  const css = ler("../app/globals.css");
  for (const regra of [
    "height:46px;margin:0;padding:0 6px 0 6px",
    "height:38px;min-height:38px;padding:0 2px",
    "border-color:#9BD3B0;background:#E3F5EA",
    "border-color:#E9A7A2;background:#FBE4E2",
    "border-color:#C5CCDA;background:#EEF1F7",
    ".chk-linha-foto{background:#AF640A}",
    ".voz-btn{background:#1F78B4}",
    ".voz-ia{background:#1D5F95}",
    "height:34px;min-height:34px;margin:0;padding:0 12px",
    "height:84px;min-height:84px",
    "height:36px;min-height:36px;padding:0 18px",
    "-webkit-line-clamp:2;grid-column:1",
    "html .campo-bar .campo-register-orb{width:40px;height:40px;margin-top:0;border:0;background:var(--rd-ambar);box-shadow:none}",
  ]) assert.ok(css.includes(regra), regra);
});

test("Confirmação de finalizar: ignora o segundo toque, Esc não chega a outros handlers e a busca do Campo não mostra dicas de teclado", () => {
  const janela = ler("../components/campo/ConfirmarFinalizar.tsx").replace(/\r\n/g, "\n");
  assert.ok(janela.includes("if (finalizando.current) return;") && janela.includes("onClick={confirmar}") && !janela.includes("onClick={onFinalizar}"));
  assert.ok(janela.includes("evento.stopPropagation()") && janela.includes('addEventListener("keydown", aoTeclar, true)'));
  const busca = ler("../components/BuscaNaBarra.tsx");
  assert.ok(busca.includes('variante !== "campo" && posicao === indice && digitando') && busca.includes('{variante !== "campo" && (\n            <div className="pc-cmd-foot"') || /variante !== "campo" && \(\s*<div className="pc-cmd-foot"/.test(busca));
});

test("Campo: Limpar resposta em linha própria, textos de apoio de 15 px, foco único e estado desabilitado", () => {
  const css = ler("../app/globals.css").replace(/\r\n/g, "\n");
  assert.ok(css.includes('html[data-modo="campo"] .chk-obs-limpar{position:static;'));
  assert.ok(!css.includes(".chk-obs-campo--limpar .chk-obs-area{padding-bottom:44px}"));
  assert.ok(css.includes(".chk-foto-link,.chk-obs-ouvindo,.chk-obs-aviso,.chk-foto-aviso,.chk-apoio-corpo,.chk-foco-amb-pos){font-size:15px}"));
  assert.ok(css.includes(".campo-register):focus-visible{outline:3px solid var(--rd-acao);outline-offset:2px}"));
  assert.ok(css.includes(".chk-linha-foto:disabled{") && css.includes(".campo-mais-cartao:disabled{"));
  const tela = ler("../components/campo/CampoTelas.tsx");
  assert.ok(tela.includes('el.style.removeProperty("height")') && tela.includes("MutationObserver"));
});

test("Mais no Campo: 'Desta visita' tem 4 atalhos em grade 2x2 (Evidências, POPs, Relatório, Ambientes) e Ambientes exige visitas.executar", () => {
  const pagina = ler("../app/page.tsx");
  const bloco = pagina.slice(pagina.indexOf('titulo: "Desta visita"'), pagina.indexOf('titulo: "Cadastros e documentos"'));
  const ordem = ["evidencias", "popsvisita", "relatorio", "ambientes"].map((id) => bloco.indexOf('id: "' + id + '"'));
  assert.ok(ordem.every((x) => x > 0) && [...ordem].sort((a, b) => a - b).join() === ordem.join(), "ordem Evidências, POPs, Relatório, Ambientes");
  assert.ok(bloco.includes('visiveisNaVisita.has("ambientes") && permitido("visitas.executar", visitaAtual?.empresaId)'));
  assert.ok(bloco.includes('onClick: () => irParaMenu("ambientes")') && /case "ambientes":\s*abrirAmbientes\(\);/.test(pagina));
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".campo-mais-atalhos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));"));
  assert.ok(/\.campo-mais-cartao\{[^}]*height:48px/.test(css) && css.includes('@media (max-height:760px){html[data-modo="campo"] .campo-mais-cartao{height:44px}'));
});

test("Janela única de finalizar: três casos (nada pendente, só ressalvas, faltam itens) e ressalvas com os textos de sempre", () => {
  const janela = ler("../components/campo/ConfirmarFinalizar.tsx").replace(/\r\n/g, "\n");
  assert.ok(janela.includes('faltam > 0 ? "c" : ressalvas.length > 0 ? "b" : "a"'));
  for (const texto of ["Finalizar a visita?", "Antes de finalizar", "Voltar e completar", "Finalizar com ressalvas", "Não dá para finalizar enquanto faltam itens", "tituloFaltam(faltam)"]) assert.ok(janela.includes(texto), texto);
  assert.ok(janela.includes('caso === "b" && ('), "'Finalizar com ressalvas' só no caso b");
  assert.equal(tituloFaltam(1), "Falta 1 item");
  assert.equal(tituloFaltam(3), "Faltam 3 itens");
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".cf-btn--acao{border:0;background:var(--rd-acao);color:#fff}") && css.includes(".cf-btn--outline{border:2px solid var(--rd-acao);background:#fff;color:#000}"));
  assert.deepEqual(ressalvasDeFinalizar({ ncsSomenteAbertas: 0, ncsSemAcao: 0, analisesIAPendentes: 0, conclusao: "Parecer escrito" }), []);
  assert.deepEqual(ressalvasDeFinalizar({ ncsSomenteAbertas: 1, ncsSemAcao: 2, analisesIAPendentes: 1, conclusao: "  " }), [
    "1 não conformidade seguirá aberta para acompanhamento",
    "2 não conformidades ainda estão sem ação corretiva definida",
    "1 sugestão de análise fotográfica por IA ainda aguarda confirmação ou descarte",
    "o parecer do RT ainda está em branco (o app não escreve parecer)",
  ]);
});

test("finalizarInspecao({ jaConfirmado }) pula SOMENTE o confirmar final; permissão, aviso, pendências e salvamento ficam iguais", () => {
  const pagina = ler("../app/page.tsx");
  const inicio = pagina.indexOf("async function finalizarInspecao(");
  const corpo = pagina.slice(inicio, pagina.indexOf("async function reabrirInspecao"));
  assert.ok(corpo.startsWith("async function finalizarInspecao(opcoes?: { jaConfirmado?: boolean })"));
  for (const trecho of ['exigirPermissao("visitas.concluir", visitaAtual.empresaId)', "avisoParaFinalizar(itensRespondidos(checklistAtual))", "if (pendentesVisita > 0) {", "ressalvasDeVisita()", "await salvarEstadoImediato(novo)", "setRevisaoAberta(true)"]) assert.ok(corpo.includes(trecho), trecho);
  assert.equal(corpo.split("await confirmar(").length, 2, "um único confirmar, o final");
  assert.ok(corpo.includes("opcoes?.jaConfirmado !== true && !(await confirmar(`Finalizar esta inspeção?"));
  assert.ok(corpo.indexOf("pendentesVisita > 0") < corpo.indexOf("opcoes?.jaConfirmado"), "pendências validadas antes de pular o confirmar");
  assert.ok(pagina.includes("onFinalizar={() => (campo ? setConfirmaFinalizarCampo(true) : void finalizarInspecao())}"), "PC sem o parâmetro");
});

test("Verde dos botões de Finalizar e Salvar e próximo no Campo: #1E7A3E (o #2E8B57 continua nos outros usos e na faixa do PC)", () => {
  const css = ler("../app/globals.css");
  assert.ok(css.includes("--rd-verde-botao:#1E7A3E;") && css.includes("--rd-verde-acao:#2E8B57;"));
  assert.ok(css.includes('html[data-modo="campo"] .fv--campo .fv-finalizar{background:var(--rd-verde-botao)}'));
  assert.ok(/\.fv-finalizar\{[^}]*background:var\(--rd-verde-acao\)/.test(css), "a faixa do PC não mudou");
  assert.ok(css.includes(".chk-foco-rodape .ui-btn--save:not(:disabled){border:0;background:var(--rd-verde-botao);color:#fff}"));
  assert.ok(css.includes(".cf-btn--finalizar:hover,.cf-btn--finalizar:active{background:var(--rd-verde-botao-escuro)}"));
  assert.ok(css.includes('.fv--campo .fv-finalizar:hover,html[data-modo="campo"] .fv--campo .fv-finalizar:active{background:var(--rd-verde-botao-escuro)}'));
});
