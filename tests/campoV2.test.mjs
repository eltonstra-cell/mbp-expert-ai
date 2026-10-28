import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { COR_DO_SEGMENTO, COR_DO_SEGMENTO_CAMPO } from "../lib/checklistSegmentos.ts";
import { ressalvasDeFinalizar, semRespostaPorAmbiente, tituloFaltam } from "../lib/ressalvasDeFinalizar.ts";
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

test("Checklist do Campo: busca do PC no cabeçalho, respostas só com texto até serem escolhidas, observação sem rótulo e medidas pedidas", () => {
  const busca = ler("../components/BuscaNaBarra.tsx");
  assert.ok(busca.includes('variante?: "inicio" | "campo"') && busca.includes('variante !== "campo" && <kbd'));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('variante="campo"') && pagina.includes("semBusca={modo === \"campo\"}"));
  assert.ok(/onAvancar=\{\(\) => avancarAposResponder\(foco\)\}\s*campo\s*\/>/.test(pagina));
  const item = ler("../components/ChecklistFocoItem.tsx").replace(/\r\n/g, "\n");
  assert.ok(item.includes("{estado === \"marcado\" && ("), "ícone ✓ só na resposta escolhida (Campo e PC)");
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
    "height:auto;min-height:84px",
    "height:44px;min-height:44px;padding:0 18px",
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
  assert.ok(!janela.includes("textoSemResposta") && !janela.includes("cf-resumo"), "sem a linha 'N itens sem resposta' abaixo do título");
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

test("Janela de finalizar (faltam itens): título 'Faltam N itens' (sem a linha 'N itens sem resposta') e dois grupos, 'Impede finalizar' e 'Fica como ressalva'", () => {
  assert.deepEqual(semRespostaPorAmbiente([{ status: "Pendente", ambiente: "Cozinha" }, { status: "Conforme", ambiente: "Cozinha" }, { status: "Pendente", ambiente: "Cozinha" }, { status: "Pendente", ambiente: "Estoque" }]), ["Cozinha · 2 itens", "Estoque · 1 item"]);
  assert.deepEqual(semRespostaPorAmbiente([{ status: "Conforme", ambiente: "Cozinha" }]), []);
  const janela = ler("../components/campo/ConfirmarFinalizar.tsx").replace(/\r\n/g, "\n");
  for (const texto of ["Impede finalizar", "Fica como ressalva", "cf-ico--impede", "cf-ico--ressalva", "aria-labelledby=\"cf-g-impede\"", "Voltar e completar"]) assert.ok(janela.includes(texto), texto);
  assert.ok(janela.includes('{caso === "c" && ('), "grupo 'Impede finalizar' só quando faltam itens");
  assert.ok(janela.includes("{ressalvas.length > 0 && ("), "grupo de ressalvas só quando há ressalvas");
  assert.ok(ler("../app/page.tsx").includes("semResposta={semRespostaPorAmbiente(checklistAtual)}"));
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".cf-sub--impede{color:#B83A33}") && css.includes(".cf-sub--ressalva{color:#AF640A}") && css.includes(".cf-corpo{display:flex;min-height:0;flex:1 1 auto;flex-direction:column;gap:12px;overflow-y:auto;"));
});

test("Ajustes de janela estreita: '+ Nova' no azul padrão, Próxima etapa sem reticências, Visitas sem estourar e Checklist compacto", () => {
  const css = ler("../app/globals.css");
  assert.ok(/\.campo-mais-nova\{[^}]*color:#2B54CF/.test(css));
  assert.ok(/\.campo-proxima-amb\{[^}]*white-space:normal/.test(css) && !/\.campo-proxima-amb\{[^}]*text-overflow:ellipsis/.test(css));
  assert.ok(/\.pc-next-title\{[^}]*white-space:normal/.test(css) && !/\.pc-next-title\{[^}]*text-overflow:ellipsis/.test(css));
  assert.ok(css.includes("@media (max-width:899px){\n  .ui-screen[aria-label=\"Visitas técnicas\"] .vis-toolbar{flex-wrap:wrap;") || css.includes("@media (max-width:899px){\r\n  .ui-screen[aria-label=\"Visitas técnicas\"] .vis-toolbar{flex-wrap:wrap;"));
  assert.ok(css.includes('html[data-modo="campo"] .campo-head--busca{display:grid;') && css.includes('html[data-modo="campo"] .campo-tela .chk-foco-topo{display:grid;'));
});

test("Respostas do checklist: só texto sem seleção; selecionada = ícone ✓ de 16 px nos três, nunca o ×; cores #1E7A3E, vermelho e grafite #5B6575", () => {
  const item = ler("../components/ChecklistFocoItem.tsx");
  assert.ok(item.includes('estado === "marcado" && ('), "ícone só quando selecionada");
  assert.ok(item.includes('className="chk-resp-check" width="16" height="16"') && item.includes('stroke="currentColor"'));
  assert.ok(!item.includes('"×"') && !item.includes("simbolo"), "sem × nem símbolo fixo");
  assert.ok(item.includes("aria-pressed={estado === \"marcado\"}"));
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".chk-resp.is-marcado.chk-resp--ok{background:#1E7A3E}") && css.includes(".chk-resp.is-marcado.chk-resp--na{background:#5B6575}"));
  assert.ok(css.includes('.chk-resp.is-marcado.chk-resp--ok{border-color:#1E7A3E;background:#1E7A3E}') && css.includes('.chk-resp.is-marcado.chk-resp--na{border-color:#5B6575;background:#5B6575}'));
  assert.ok(!css.includes('.chk-resp.is-marcado.chk-resp--ok{border-color:#15803D'));
});

test("Barra de progresso do Campo: 'Não se aplica' em grafite #5B6575 (distinto dos pendentes claros); o PC mantém a cor antiga", () => {
  assert.equal(COR_DO_SEGMENTO_CAMPO["Não se aplica"], "#5B6575");
  assert.notEqual(COR_DO_SEGMENTO_CAMPO["Não se aplica"], COR_DO_SEGMENTO_CAMPO.Pendente);
  assert.equal(COR_DO_SEGMENTO["Não se aplica"], "#C3CDD6");
  assert.equal(COR_DO_SEGMENTO_CAMPO.Conforme, "#1E7A3E");
  assert.equal(COR_DO_SEGMENTO.Conforme, "#15803D", "o PC não muda");
  assert.equal(COR_DO_SEGMENTO_CAMPO["Não Conforme"], COR_DO_SEGMENTO["Não Conforme"]);
  assert.ok(ler("../components/ChecklistFocoItem.tsx").includes("(campo ? COR_DO_SEGMENTO_CAMPO : COR_DO_SEGMENTO)"));
});

test("Visitas em janela estreita: abas numa linha sem pílulas, sem legenda das abas, ⋯ junto de Continuar e sub da empresa sem reticências", () => {
  const css = ler("../app/globals.css");
  const tela = ler("../components/pc/PcVisitas.tsx");
  assert.ok(tela.includes('curto: "Andamento"'));
  assert.ok(!tela.includes("Contagem de todas as empresas") && !tela.includes("vis-legenda-abas") && !css.includes(".vis-legenda-abas"), "legenda removida");
  assert.ok(!tela.includes("vis-chip-ativa") && !css.includes(".vis-chip-ativa"), "sem o chip Empresa ativa");
  assert.ok(tela.includes('aria-current={grupo.ativa ? "true" : undefined}') && tela.includes('<span className="sr-only">Empresa ativa</span>') && css.includes(".vis-grupo-inteiro.is-ativa::before{content:\"\";position:absolute;left:2px;top:8px;bottom:8px;width:4px") && css.includes("forced-colors:active") && !css.includes("box-shadow:inset 4px 0 0 var(--emp-cor"), "marcador discreto e acessível");
  assert.ok(tela.includes('<div className="vis-col-fim">'), "Continuar e ⋯ no mesmo bloco");
  assert.ok(/.ui-tab-count.is-acao{margin-left:4px;padding:0;border-radius:0;background:transparent/.test(css), "contagem em texto simples");
  assert.ok(css.includes(".vis-abas-bloco .ui-tab-longo{display:none}") && css.includes(".vis-abas-bloco .ui-tab-curto{display:inline}"));
  assert.ok(/.vis-grupo-textos .ui-row-sub{overflow:visible;text-overflow:clip;white-space:normal}/.test(css));
  assert.ok(ler("../components/ui/SegmentedTabs.tsx").includes("ui-tab-curto"));
});

test("Checklist em janela estreita: respostas dentro do cartão e 'Pular ambiente' na mesma linha do 'Próximo'", () => {
  const css = ler("../app/globals.css");
  assert.ok(css.includes('html[data-modo="campo"] .campo-tela .chk-foco-botoes{width:100%;padding:0 1px}'));
  assert.ok(css.includes('.chk-foco-corpo,html[data-modo="campo"] .campo-tela .chk-foco-botoes{box-sizing:border-box;min-width:0;max-width:100%}'));
  assert.ok(ler("../components/ChecklistFocoItem.tsx").includes("chk-foco-count-texto"));
});

test("Pacote de ajustes: pastel com texto grafite, aviso com ação sublinhada, pergunta e observação sem caixa, apoio sem frase repetida", async () => {
  const css = ler("../app/globals.css");
  for (const regra of [
    ".chk-acao--voz{background:#DCEBFB;border-color:#9CBFE6;color:#1B2433}",
    ".chk-acao--conforme{background:#E3F5EA;border-color:#9BD3B0;color:#1B2433}",
    "text-decoration:underline",
    "html .chk-foco-card,html[data-modo=\"campo\"] .campo-tela .chk-foco-card{border:0;background:transparent;box-shadow:none}",
    "{padding:0;border:0;background:transparent;box-shadow:none}",
  ]) assert.ok(css.includes(regra), regra);
  assert.ok(/\.toast-salvo \.toast-acao\{[^}]*min-height:36px/.test(css), "área de toque de Desfazer >= 34 px");
  const { mostrarToast, toastAtual, limparToast } = await import("../lib/toast.ts");
  mostrarToast("Algo", { duracaoMs: 50, acao: { rotulo: "Desfazer", aoClicar() {} } });
  assert.equal(toastAtual().tom, undefined);
  limparToast();
  assert.ok(!ler("../components/ToastHost.tsx").includes("toast-tom"), "sem tom no aviso");
  const apoio = ler("../components/pc/PcChecklist.tsx");
  assert.ok(!apoio.includes("Sem material de apoio"), "uma linha só: Fonte não registrada");
  assert.ok(apoio.includes("linhaDeFonteDoApoio(apoio.fonte, !vazio)"));
});

test("responder o checklist não mostra aviso com Desfazer; lote e 'Resposta limpa' ficam acima do rodapé; tocar na resposta marcada limpa", () => {
  const pagina = ler("../app/page.tsx");
  const trecho = pagina.slice(pagina.indexOf("function avancarAposResponder"), pagina.indexOf("function registrarRapido"));
  assert.ok(!trecho.includes("mostrarToast") && !trecho.includes("Desfazer"));
  assert.ok(pagina.includes('className="lote-desfazer aviso-acima-do-rodape"'));
  assert.ok(/.aviso-acima-do-rodape{bottom:104px!important}/.test(ler("../app/globals.css")));
  const foco = ler("../components/ChecklistFocoItem.tsx");
  assert.ok(/if \(estado === "marcado"\) \{[\s\S]*?reToqueValido\(Date\.now\(\), marcadoEmRef\.current\)\) onLimpar\?\.\(\);\s*return;/.test(foco));
});

test("linha de fonte do apoio: com outro material e sem fonte não mostra 'Fonte não registrada'; sem nada mostra uma linha só; fonte real sempre aparece", async () => {
  const { linhaDeFonteDoApoio } = await import("../lib/fonteDaPergunta.ts");
  assert.equal(linhaDeFonteDoApoio("", true), "");
  assert.equal(linhaDeFonteDoApoio("Fonte não registrada", true), "");
  assert.equal(linhaDeFonteDoApoio("", false), "Fonte não registrada");
  assert.equal(linhaDeFonteDoApoio("Derivada do Manual, cap. 1, item 2.5", true), "Fonte: Derivada do Manual, cap. 1, item 2.5");
  assert.equal(linhaDeFonteDoApoio("Derivada do Manual, cap. 1, item 2.5", false), "Fonte: Derivada do Manual, cap. 1, item 2.5");
});

test("Pacote de ajustes (parte 2): rodapé de 44 px, cores do DS, faixa fina em 2 linhas, Não conforme do Campo #B83A33 e 'próxima etapa' em até 2 linhas", () => {
  const css = ler("../app/globals.css");
  assert.ok(css.includes("html .chk-foco-rodape .ui-btn{height:44px!important;min-height:44px!important"));
  assert.ok(css.includes("html .chk-foco-rodape{padding-top:0}"));
  assert.ok(css.includes(".chk-linha-foto{background:#AF640A;cursor:pointer}"));
  assert.ok(css.includes(".voz-btn{background:#1F78B4;cursor:pointer}"));
  assert.ok(css.includes("border:0;background:#1D5F95;color:#fff;font-weight:400}"));
  assert.ok(css.includes(".ui-btn--primary{background:#AF640A;color:#fff}"));
  assert.ok(css.includes(".ui-btn--criar{background:#AF640A;color:#fff;font-weight:400}"));
  const semCartaz = css.split("\n").filter((linha) => !/\.cz[-\s{,:]|\.cz--/.test(linha)).join("\n");
  assert.ok(!/#E8760A/i.test(semCartaz), "o laranja forte antigo só resta no cartaz impresso");
  assert.ok(/\.faixa-fina\{[^}]*white-space:normal/.test(css) && !/\.faixa-fina\{[^}]*text-overflow/.test(css));
  assert.ok(css.includes('.chk-resp.is-marcado.chk-resp--nc{border-color:#B83A33;background:#B83A33;color:#fff}'));
  assert.ok(!css.includes("chk-resp--nc{border-color:#C9473F"));
  assert.ok(/\.ini3-cartao-sub\{[^}]*white-space:normal/.test(css) && !/\.ini3-cartao-sub\{[^}]*text-overflow/.test(css));
  assert.ok(ler("../lib/brand.ts").includes('"--count": "#AF640A"'));
});

test("re-toque na resposta marcada: ignora toque duplo nos primeiros 700 ms e vale depois", async () => {
  const { reToqueValido } = await import("../lib/reToque.ts");
  assert.equal(reToqueValido(1000, null), true);
  assert.equal(reToqueValido(1300, 1000), false);
  assert.equal(reToqueValido(1699, 1000), false);
  assert.equal(reToqueValido(1700, 1000), true);
});
