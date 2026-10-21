import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { formatarDataCurta, formatarDataCurtaHora } from "../lib/dataLocal.ts";
import { casarPalavra, compararComRotulo, melhorCandidato } from "../lib/buscaAproximada.ts";
import { buscar, construirDestinos, construirDestinosDaVisita } from "../lib/commandSearch.ts";
import { dividirComandoComposto, interpretarVoz } from "../lib/vozComando.ts";
import { TERMOS_DO_APP, empresasDoUsuarioParaVocabulario, ehEcoDoPromptDaBusca, montarPromptDaBusca, nomeSeguroParaVocabulario, nomesParaVocabulario } from "../lib/vocabularioDeVoz.ts";
import { podeVirarRecente } from "../lib/buscaRecentes.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

// ===== 1, 2, 3 =====
test("topo: o modo compacto mostra um ícone de monitor reconhecível na pílula, com dica e aria-label", () => {
  const topo = ler("../components/AppTopbar.tsx");
  assert.ok(!topo.includes("▭"), "o retângulo vazio saiu");
  assert.ok(topo.includes('className="pc-mode-icone"') && topo.includes('<rect x="3" y="4" width="18" height="12" rx="2" />') && topo.includes("M8 20h8M12 16v4"));
  assert.ok(topo.includes("title={`${ROTULO_DE_USO[modo]}. Configurar o modo de tela`}") && topo.includes("aria-label={`${ROTULO_DE_USO[modo]}. Configurar o modo de tela`}"));
  assert.ok(topo.includes('className="pc-sync-dot"'), "Sincronizado continua a bolinha");
});

test("lista de Empresas: uma só marca de empresa ativa (o botão 'Ativa ✓' desabilitado), sem o rótulo ao lado do nome", () => {
  const tela = ler("../components/pc/PcEmpresas.tsx");
  assert.ok(!tela.includes("<Pill tom=\"brand\">Empresa ativa</Pill>"));
  assert.ok(tela.includes('aria-current="true" disabled') && tela.includes("Ativa ✓"));
});

test("data curta: com ano quando não for o ano corrente, em um helper só", () => {
  assert.equal(formatarDataCurta("2027-10-21", "2026-10-21"), "21/10/2027", "vence no ano que vem: não parece hoje");
  assert.equal(formatarDataCurta("2026-10-21", "2026-10-21"), "21/10");
  assert.equal(formatarDataCurta("2025-12-31", "2026-01-02"), "31/12/2025");
  assert.equal(formatarDataCurta("2026-10-21T00:26:00.000Z", "2026-10-21"), "20/10", "instante convertido para São Paulo");
  assert.equal(formatarDataCurta("", "2026-10-21"), "");
  assert.equal(formatarDataCurtaHora("2027-03-05T15:00:00.000Z", "2026-10-21"), "05/03/2027 · 12:00");
  assert.equal(formatarDataCurtaHora("2026-03-05T15:00:00.000Z", "2026-10-21"), "05/03 · 12:00");
  // Resumo da ficha, comprovantes (próxima ação) e demais usam o mesmo helper
  assert.ok(ler("../components/pc/PcFichaPop.tsx").includes("const dataCurta = (iso?: string) => formatarDataCurta(iso);"));
  assert.ok(ler("../lib/popGestao.ts").includes("return formatarDataCurta(iso);"));
  assert.ok(ler("../lib/validadeDeAcesso.ts").includes("formatarDataCurta(dataNoFuso("));
  // ninguém corta dia/mês do texto completo na mão
  for (const arquivo of readdirSync(new URL("../lib/", import.meta.url)).filter((nome) => nome.endsWith(".ts"))) {
    const texto = ler(`../lib/${arquivo}`);
    assert.ok(!/formatarData\([^)]*\)\.slice\(0, 5\)/.test(texto) && !/dataDaValidade\([^)]*\)\.slice\(0, 5\)/.test(texto), arquivo);
  }
});

// ===== 4 =====
test("correspondência aproximada: 'autonvolmir estrapazon' casa com 'Elton Volmir Strapazon', mas não é exata", () => {
  const c = compararComRotulo("autonvolmir estrapazon", "Elton Volmir Strapazon");
  assert.ok(c);
  assert.equal(c.exata, false);
  assert.equal(c.casadas, 2);
  assert.equal(compararComRotulo("elton volmir strapazon", "Elton Volmir Strapazon").exata, true);
  assert.equal(compararComRotulo("beyond nutri", "Elton Volmir Strapazon"), null);
  assert.equal(casarPalavra("estrapazon", "strapazon"), "aproximado");
  assert.equal(casarPalavra("autonvolmir", "volmir"), "aproximado");
  assert.equal(casarPalavra("volmir", "volmir"), "exato");
  assert.equal(casarPalavra("casa", "mesa"), null);
  const empresas = [
    { item: "e1", rotulo: "Elton Volmir Strapazon" },
    { item: "e2", rotulo: "Beyond Nutri" },
    { item: "e3", rotulo: "Churrascaria do Chico" },
  ];
  assert.equal(melhorCandidato("autonvolmir estrapazon", empresas).item, "e1");
  assert.equal(melhorCandidato("churascaria chico", empresas).item, "e3");
  assert.equal(melhorCandidato("xyz", empresas), null);
  // empate não escolhe nenhum
  assert.equal(melhorCandidato("nutri", [{ item: "a", rotulo: "Beyond Nutri" }, { item: "b", rotulo: "Nutri Mais" }]), null);
});

// Índice como a página monta (Administrador, empresa ativa Elton)
const itensMenu = [
  { key: "inicio", rotulo: "Início", curto: "Início", tom: "indigo", grupo: "agora" },
  { key: "visitas", rotulo: "Visitas", curto: "Visitas", tom: "indigo", grupo: "agora" },
  { key: "checklist", rotulo: "Checklist", curto: "Checklist", tom: "verde", grupo: "agora" },
  { key: "evidencias", rotulo: "Evidências", curto: "Evidências", tom: "ceu", grupo: "agora" },
  { key: "ncs", rotulo: "Correções", curto: "Correções", tom: "vermelho", grupo: "acompanhamento" },
  { key: "relatorio", rotulo: "Relatório", curto: "Relatório", tom: "ardosia", grupo: "acompanhamento" },
  { key: "relatorios", rotulo: "Relatórios", curto: "Relatórios", tom: "ardosia", grupo: "acompanhamento" },
];
const EMPRESAS = [
  { id: "e1", nome: "Elton Volmir Strapazon" },
  { id: "e2", nome: "Beyond Nutri" },
];
const entradaBase = (extra = {}) => ({
  itensMenu,
  empresas: EMPRESAS,
  empresaAtivaId: "e1",
  visitas: [],
  dentroDeVisita: false,
  ambientes: [],
  itensChecklist: [],
  visitaEmAndamentoId: null,
  podeChecklist: false,
  subabasCentral: [],
  temVisitaEmAndamento: true,
  podePopsDaVisita: true,
  ...extra,
});
const contexto = (comVisita) => ({
  destinos: construirDestinos(entradaBase({ temVisitaEmAndamento: comVisita.includes("e1") })),
  destinosDaVisita: construirDestinosDaVisita(entradaBase()),
  empresas: EMPRESAS,
  empresaAtivaId: "e1",
  temVisitaNaEmpresa: (id) => comVisita.includes(id),
});

test("destinos da visita (Checklist, Evidências, Relatório, POPs da visita) só entram no índice com visita em andamento na empresa ativa", () => {
  const titulos = (lista) => lista.map((d) => d.titulo);
  const com = construirDestinos(entradaBase({ temVisitaEmAndamento: true }));
  const sem = construirDestinos(entradaBase({ temVisitaEmAndamento: false }));
  for (const t of ["Checklist", "Evidências", "Relatório", "POPs desta visita"]) {
    assert.ok(titulos(com).includes(t), `com visita: ${t}`);
    assert.ok(!titulos(sem).includes(t), `sem visita: ${t}`);
  }
  // o resto continua: navegação geral e Correções (que funciona também sem visita)
  for (const t of ["Início", "Visitas", "Relatórios", "Correções"]) assert.ok(titulos(sem).includes(t), `sem visita: ${t}`);
  // a lista completa existe para a voz explicar "não há visita"
  assert.deepEqual(titulos(construirDestinosDaVisita(entradaBase({ temVisitaEmAndamento: false }))).sort(), ["Checklist", "Evidências", "POPs desta visita", "Relatório"]);
  // respeita permissão: sem o item no menu do perfil, o destino não existe
  const semPermissao = construirDestinosDaVisita(entradaBase({ itensMenu: itensMenu.filter((item) => item.key !== "evidencias"), podePopsDaVisita: false }));
  assert.deepEqual(titulos(semPermissao).sort(), ["Checklist", "Relatório"]);
  assert.equal(buscar("evidencias", sem).filter((r) => r.destino.titulo === "Evidências").length, 0);
});

test("comando composto: dividir em '[destino] em [empresa]'", () => {
  assert.deepEqual(dividirComandoComposto("Evidências em Elton Volmir Strapazon"), { destino: "evidencias", empresa: "elton volmir strapazon" });
  assert.deepEqual(dividirComandoComposto("relatórios emitidos em Beyond Nutri"), { destino: "relatorios emitidos", empresa: "beyond nutri" });
  assert.equal(dividirComandoComposto("evidências"), null);
  assert.equal(dividirComandoComposto("em beyond"), null);
});

test("voz: o caso real 'Evidências em autonvolmir estrapazon' pergunta 'Você quis dizer', nunca abre sozinho", () => {
  const r = interpretarVoz("Evidências em autonvolmir estrapazon", contexto(["e1"]));
  assert.equal(r.tipo, "quis-dizer");
  assert.equal(r.rotulo, "Evidências em Elton Volmir Strapazon");
  assert.equal(r.depois.tipo, "abrir-agora", "só depois do clique");
  assert.notEqual(r.tipo, "abrir");
});

test("voz: comando composto com a empresa ativa vai direto (contagem e Cancelar); outra empresa pede confirmação; sem visita explica", () => {
  // empresa ativa dita corretamente: abre com contagem
  const ativa = interpretarVoz("Evidências em Elton Volmir Strapazon", contexto(["e1"]));
  assert.equal(ativa.tipo, "abrir");
  assert.equal(ativa.destino.titulo, "Evidências");
  // nenhuma empresa citada: fluxo normal
  assert.equal(interpretarVoz("Relatórios", contexto(["e1"])).tipo, "abrir");
  // outra empresa, com visita: confirma a troca (nunca sozinho)
  const outra = interpretarVoz("Evidências em Beyond Nutri", contexto(["e1", "e2"]));
  assert.equal(outra.tipo, "trocar-e-abrir");
  assert.equal(outra.empresa.nome, "Beyond Nutri");
  assert.equal(outra.destino.titulo, "Evidências");
  // destino que não é da visita, em outra empresa: também pede a troca
  const geral = interpretarVoz("Relatórios em Beyond Nutri", contexto(["e1"]));
  assert.equal(geral.tipo, "trocar-e-abrir");
  // outra empresa sem visita e destino da visita: mensagem com Abrir Visitas
  const sem = interpretarVoz("Evidências em Beyond Nutri", contexto(["e1"]));
  assert.equal(sem.tipo, "sem-visita");
  assert.equal(sem.empresa.nome, "Beyond Nutri");
  // empresa ativa sem visita
  const semAtiva = interpretarVoz("Checklist em Elton Volmir Strapazon", contexto([]));
  assert.equal(semAtiva.tipo, "sem-visita");
  assert.equal(semAtiva.empresa.id, "e1");
  // simples, sem empresa, sem visita na ativa
  assert.equal(interpretarVoz("checklist", contexto([])).tipo, "sem-visita");
  // empresa aproximada em outra empresa: pergunta primeiro e, ao confirmar, ainda pede a troca
  const aprox = interpretarVoz("Evidências em beyon nutri", contexto(["e1", "e2"]));
  assert.equal(aprox.tipo, "quis-dizer");
  assert.equal(aprox.depois.tipo, "trocar-e-abrir");
});

test("voz: nunca fica calada — 'Não entendi' com o texto, e empresa dita sozinha vira 'Você quis dizer'", () => {
  const nada = interpretarVoz("blablabla zzz", contexto(["e1"]));
  assert.equal(nada.tipo, "nao-entendi");
  assert.equal(nada.texto, "blablabla zzz");
  assert.equal(interpretarVoz("   ", contexto(["e1"])).tipo, "nao-entendi");
  const empresaSo = interpretarVoz("autonvolmir estrapazon", contexto(["e1"]));
  assert.equal(empresaSo.tipo, "quis-dizer");
  assert.equal(empresaSo.rotulo, "Elton Volmir Strapazon");
  assert.equal(empresaSo.depois.tipo, "abrir-agora");
  // vários resultados parecidos e nenhum com o título exato: o usuário escolhe
  const parecidos = interpretarVoz("relatorios e", contexto(["e1"]));
  assert.notEqual(parecidos.tipo, "abrir");
  const parcial = interpretarVoz("dados", { ...contexto(["e1"]), destinos: [{ id: "a", grupo: "ir", titulo: "Dados da empresa", acao: { tipo: "central", subaba: "dados" } }, { id: "b", grupo: "ir", titulo: "Dados do responsável", acao: { tipo: "central", subaba: "dados" } }] });
  assert.equal(parcial.tipo, "escolher");
});

test("tela da voz: 'Não entendi' mantém o texto editável na barra e o microfone pronto; perguntas têm botões", () => {
  const busca = ler("../components/BuscaNaBarra.tsx");
  assert.ok(busca.includes("Não entendi. Você disse:") && busca.includes("Falar de novo") && busca.includes("Edite o texto na barra"));
  assert.ok(busca.includes("Você quis dizer:") && busca.includes("Trocar e abrir") && busca.includes("Abrir Visitas") && busca.includes("Não há visita em andamento em"));
  const cancelar = busca.slice(busca.indexOf("onChange={(evento) => {"), busca.indexOf("onChange={(evento) => {") + 400);
  assert.ok(cancelar.includes("setPergunta(null)"), "digitar descarta a pergunta; o texto fica editável");
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("destinoAposTrocaRef") && pagina.includes('confirmarComFila("trocar")') && pagina.includes('case "popsvisita"'));
});

test("recentes: comando composto guarda só o destino, nunca o nome da empresa", () => {
  assert.equal(podeVirarRecente({ grupo: "empresas" }), false);
  const busca = ler("../components/BuscaNaBarra.tsx");
  const trocar = busca.slice(busca.indexOf('pergunta.tipo === "trocar-e-abrir") {'), busca.indexOf('pergunta.tipo === "sem-visita") {'));
  assert.ok(trocar.includes("registrarRecente(destino, usuarioId)") && !trocar.includes("registrarRecente(empresa") && !trocar.includes("empresa.nome"));
});

test("vocabulário da transcrição: termos do app e até 20 nomes de empresa; nada de paciente, pessoa, visita ou saúde", () => {
  assert.ok(TERMOS_DO_APP.includes("Central da Empresa") && TERMOS_DO_APP.includes("Nova visita") && TERMOS_DO_APP.includes("Evidências"));
  const empresas = Array.from({ length: 30 }, (_, i) => ({ nomeFantasia: `EMPRESA ${String(i).padStart(2, "0")}`, razaoSocial: "x", cnpj: "11222333000181", responsavel: "Fulana", email: "x@y.com" }));
  const nomes = nomesParaVocabulario(empresas);
  assert.equal(nomes.length, 20);
  const prompt = montarPromptDaBusca(empresas);
  assert.ok(prompt.includes("Termos do aplicativo:") && prompt.includes("Empresas: ") && prompt.includes("Empresa 00"));
  assert.ok(!prompt.includes("11222333000181") && !prompt.includes("Fulana") && !prompt.includes("x@y.com"), "só o nome de exibição");
  assert.ok(!prompt.includes("Empresa 25"), "no máximo 20");
  // arquivada não entra; duplicada entra uma vez; caracteres estranhos saem
  assert.deepEqual(nomesParaVocabulario([{ nomeFantasia: "Beyond Nutri" }, { nomeFantasia: "BEYOND NUTRI" }, { nomeFantasia: "Velha", arquivada: true }]), ["Beyond Nutri"]);
  assert.equal(nomeSeguroParaVocabulario("Padaria <script>\nZé"), "Padaria script Zé");
  assert.equal(nomeSeguroParaVocabulario("x".repeat(200)).length, 60);
  // quem entra é decidido pelo perfil: Administrador todas; os demais, só as próprias
  const todas = { a: { id: "a", nomeFantasia: "A" }, b: { id: "b", nomeFantasia: "B" } };
  assert.equal(empresasDoUsuarioParaVocabulario(todas, { perfil: "Administrador", empresaIds: [] }).length, 2);
  assert.deepEqual(empresasDoUsuarioParaVocabulario(todas, { perfil: "Consultor/RT", empresaIds: ["b"] }).map((e) => e.id), ["b"]);
  // o vocabulário nunca recebe pessoas de Acessos, visitas ou o estado inteiro: a função só aceita empresas
  const fonte = ler("../lib/vocabularioDeVoz.ts");
  for (const proibido of ["usuarios", "visitas", "evidencias", "colaboradores", "ncs", "registrosPop"]) assert.ok(!fonte.includes(`.${proibido}`), proibido);
  // eco do prompt: devolver o próprio contexto não vira comando; um comando de verdade passa
  assert.equal(ehEcoDoPromptDaBusca(prompt, prompt), true);
  assert.equal(ehEcoDoPromptDaBusca("Evidências em Empresa 00", prompt), false);
});

test("rota de transcrição: language pt, contexto só na busca, calculado no servidor pelo perfil; modelo padrão aceita 'prompt'", () => {
  const rota = ler("../app/api/audio/transcrever/route.ts");
  assert.ok(rota.includes('openAiForm.append("language", "pt")') && rota.includes('openAiForm.append("prompt", prompt)'));
  assert.ok(rota.includes('form.get("contexto") === "busca"') && rota.includes("empresasDoUsuarioParaVocabulario(acesso.data.empresas, acesso.usuario)"));
  assert.ok(rota.includes('process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe"'), "o modelo em uso segue sendo o configurado; nada foi trocado");
  assert.ok(!rota.includes("form.get(\"vocabulario\")") && !rota.includes("form.get(\"empresas\")"), "o navegador não envia nomes: o servidor decide");
  const gancho = ler("../components/useVoiceCapture.ts");
  assert.ok(gancho.includes('if (contexto) form.append("contexto", contexto)'));
  assert.ok(ler("../components/BuscaNaBarra.tsx").includes('contexto: "busca"') && ler("../components/CommandPalette.tsx").includes('contexto: "busca"'));
});
