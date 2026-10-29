import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { DIAS_DA_JANELA_DE_VENCIMENTO, SEM_RESPONSAVEL, caixasDoContinuar, colunasDoInicio, comAmbienteDasCorrecoes, contadorDoPainel, subDaLinhaDoPainel, passosDeConfiguracao, quadradoDoVencimento, resumoDaConfiguracao, textoDoPrazoEm } from "../lib/inicio.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

const visita = (id, data, status = "Em andamento", extra = {}) => ({ id, data, status, ...extra });
const base = (extra = {}) => ({
  telas: [],
  visitas: [],
  pops: [],
  numeroDaVisita: (id) => Number(id.replace("v", "")),
  formatarData: (iso) => iso.split("-").reverse().join("/"),
  proximaEtapa: () => "Recebimento",
  ...extra,
});

test("caixas: no máximo 3, da mais recente para a mais antiga, sem repetir visita", () => {
  const telas = [
    { tipo: "visita", id: "v3", rotulo: "x" },
    { tipo: "comprovantes", id: "", rotulo: "Comprovantes" },
    { tipo: "visita", id: "v3", rotulo: "x" },
    { tipo: "visita", id: "v2", rotulo: "y" },
    { tipo: "visita", id: "v1", rotulo: "z" },
  ];
  const visitas = [visita("v1", "2026-10-01"), visita("v2", "2026-10-05"), visita("v3", "2026-10-20")];
  const caixas = caixasDoContinuar(base({ telas, visitas }));
  assert.equal(caixas.length, 3);
  assert.deepEqual(caixas.map((c) => c.chave), ["visita:v3", "comprovantes:", "visita:v2"], "ordem do que foi aberto por último; v3 não repete");
  assert.equal(caixas[0].titulo, "Visita 3 · 20/10/2026");
  assert.equal(caixas[0].subtitulo, "próxima etapa: Recebimento");
  assert.equal(caixas[1].subtitulo, "", "só a primeira tem 2 linhas");
  assert.equal(caixas[2].subtitulo, "");
});

test("caixas: visita concluída/arquivada e POP que não existe mais ficam de fora; sem nada aberto o cartão some", () => {
  const telas = [{ tipo: "visita", id: "v1", rotulo: "a" }, { tipo: "visita", id: "v2", rotulo: "b" }, { tipo: "pop", id: "p9", rotulo: "POP-09 · X" }, { tipo: "pop", id: "p1", rotulo: "POP-01 · Y" }];
  const caixas = caixasDoContinuar(base({ telas, visitas: [visita("v1", "2026-10-01", "Concluída"), visita("v2", "2026-10-02", "Em andamento", { arquivada: true })], pops: [{ id: "p1" }] }));
  assert.deepEqual(caixas.map((c) => c.chave), ["pop:p1"]);
  assert.equal(caixas[0].subtitulo, "último lugar de trabalho");
  assert.deepEqual(caixasDoContinuar(base()), [], "nada aberto: cartão oculto");
  // sem telas guardadas, as visitas em andamento (a mais recente primeiro) entram
  const sem = caixasDoContinuar(base({ visitas: [visita("v1", "2026-09-01"), visita("v2", "2026-10-02"), visita("v3", "2026-10-03"), visita("v4", "2026-10-04")] }));
  assert.deepEqual(sem.map((c) => c.chave), ["visita:v4", "visita:v3", "visita:v2"]);
});

test("configuração: some quando está completa (7 de 7)", () => {
  const empresa = { id: "e", nomeFantasia: "Beyond Nutri", cnpj: "11222333000181", responsavel: "Elton Volmir Strapazon", setoresManual: ["A"], equipamentosSetores: [{ id: "q" }], fluxosOperacionais: [{ aplicavel: true }] };
  const usuario = { nome: "Elton Volmir Strapazon", cargo: "Nutricionista", perfil: "Administrador", crn: "CRN-2 1", telefone: "5" };
  const completo = resumoDaConfiguracao(passosDeConfiguracao({ usuario, empresa, visitas: [{ empresaId: "e", status: "Concluída" }], relatoriosEmitidos: [] }));
  assert.deepEqual([completo.feitos, completo.total, completo.completo], [7, 7, true]);
  const incompleto = resumoDaConfiguracao(passosDeConfiguracao({ usuario, empresa: { ...empresa, fluxosOperacionais: [] }, visitas: [], relatoriosEmitidos: [] }));
  assert.equal(incompleto.completo, false);
  assert.deepEqual(incompleto.faltam.map((p) => p.chave), ["fluxos", "visita", "relatorio"]);
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("atual && !resumoDoGuia.completo"), "a linha só existe enquanto incompleta");
  const inicio = ler("../components/pc/PcInicio.tsx");
  assert.ok(inicio.includes("Configuração da empresa: {configuracao.feitos} de {configuracao.total} · faltam") && inicio.includes("Guia de uso em Ajuda e guias"));
  assert.ok(inicio.includes("ini3-config"), "sem caixas, fica só a configuração (se incompleta)");
});

const painelItem = (id, origem, situacao, dias, validade, extra = {}) => ({ id, origem, titulo: id, prazo: "p", validade, situacao, dias, quem: "Maria", acao: "abrir", rotuloDaAcao: "Abrir", ...extra });

test("vencimentos: janela de 30 dias, ordem por data, POP com data 'Revisar até' entra; vencido e aguardando vão para a esquerda", () => {
  assert.equal(DIAS_DA_JANELA_DE_VENCIMENTO, 30);
  const itens = [
    painelItem("c-atrasada", "correcao", "vencido", -4, "2026-10-19"),
    painelItem("pop-aguarda", "pop", "aguardando", null, undefined),
    painelItem("cap", "capacitacao", "vence-em-breve", 20, "2026-11-12"),
    painelItem("corr", "correcao", "vence-em-breve", 3, "2026-10-26"),
    painelItem("fora", "comprovante", "vence-em-breve", 45, "2026-12-07"),
    painelItem("comp", "comprovante", "vence-em-breve", 10, "2026-11-02"),
  ];
  const pops = [
    { id: "p1", codigo: "POP-01", titulo: "Lavagem", status: "Aprovado", proximaRevisao: "2026-11-05", responsavel: "Ana" },
    { id: "p2", codigo: "POP-02", titulo: "Longe", status: "Aprovado", proximaRevisao: "2027-03-01" },
    { id: "p3", codigo: "POP-03", titulo: "Sem data", status: "Aprovado", proximaRevisao: "" },
    { id: "p4", codigo: "POP-04", titulo: "Rascunho", status: "Rascunho", proximaRevisao: "2026-11-01" },
    { id: "p5", codigo: "POP-05", titulo: "Arquivado", status: "Aprovado", proximaRevisao: "2026-11-01", arquivado: true },
  ];
  const c = colunasDoInicio(itens, pops, "2026-10-23");
  assert.deepEqual(c.precisa.map((i) => i.id), ["c-atrasada", "pop-aguarda"]);
  assert.deepEqual([c.vencidos, c.aguardando], [1, 1]);
  assert.deepEqual(c.vencendo.map((i) => i.id), ["corr", "comp", "revisao:p1", "cap"], "por data; 45 dias fica fora; POP sem data, longe, rascunho e arquivado ficam fora");
  assert.equal(c.vencendo[2].origem, "pop-revisao");
  assert.equal(c.vencendo[2].quem, "Ana");
  assert.deepEqual(quadradoDoVencimento("2026-10-26", 3), { dia: "26", mes: "OUT", tom: "ambar" });
  assert.equal(quadradoDoVencimento("2026-11-05", 14).tom, "ambar");
  assert.equal(quadradoDoVencimento("2026-11-06", 15).tom, "azul");
  assert.equal(textoDoPrazoEm(6), "em 6 dias");
  assert.equal(textoDoPrazoEm(1), "em 1 dia");
});

test("linha inteira clicável, sem botão Abrir; barras e quadradinhos nas cores do desenho", () => {
  const inicio = ler("../components/pc/PcInicio.tsx");
  assert.ok(inicio.includes('<button key={item.id} type="button" className={`ini3-linha ini3-linha--${item.vencida ? "vencida" : "aberta"}`} onClick={() => onAbrir(item.id)}>'));
    assert.equal(/>\s*Abrir\s*</.test(inicio), false, "nenhum botão Abrir");
  assert.ok(inicio.includes("`Ver todas as correções (${itens.length})`") && inicio.includes("correcoes.onAbrirCorrecoes") && inicio.includes("correcoes.onTodosVencimentos") && inicio.includes("Lembrete ao responsável"));
  const css = ler("../app/globals.css");
  const bloco = css.slice(css.indexOf("/* ----- Início ----- */"));
  assert.match(bloco, /\.ini3-linha--vencida \.ini3-faixa\{background:var\(--rd-venceu\)\}/);
  assert.match(bloco, /\.ini3-faixa\{[^}]*background:var\(--rd-faixa-aberta\)\}/);
  assert.match(bloco, /\.ini3-tag--venceu\{background:var\(--rd-venceu-fundo\)\}/);
  assert.match(bloco, /\.ini3-colunas\{display:grid;[^}]*grid-template-columns:minmax\(0,2fr\) minmax\(0,1fr\)/);
  assert.equal(inicio.includes("useLinhasQueCabem") || inicio.includes("ResizeObserver"), false, "sem altura calculada em runtime");
  assert.match(bloco, /html\[data-modo="completo"\] \.pc-offset:has\(\.ini3\)\{display:flex;flex-direction:column;height:100dvh;/);
});

test("barra do topo do Início: título 30 px, busca sem Ctrl K nem Ir, microfone azul, sincronização sem pílula, seletor sem borda", () => {
  const busca = ler("../components/BuscaNaBarra.tsx");
  const trecho = busca.slice(busca.indexOf('variante === "inicio" ? ('), busca.indexOf(") : (\n    <div className=\"pc-smartbar-campos\">"));
  assert.ok(trecho.includes("pc-busca-lupa") && trecho.includes("{campo}") && trecho.includes("{microfone}"));
  assert.equal(/Ctrl K|kbd|\{ir\}/.test(trecho), false, "sem Ctrl K e sem Ir na variante do Início");
  assert.ok(busca.includes('"Busque ou diga o que quer fazer"') && busca.includes('variante !== "inicio"'), "Início nunca usa a busca compacta");
  const css = ler("../app/globals.css");
  assert.match(css, /\.pc-topbar--inicio \.pc-crumb-current\{[^}]*font-size:30px;font-weight:500/);
  assert.match(css, /\.pc-topbar--inicio \.pc-smartbar\{border:0;box-shadow:none;background:#F5F7FA;border-radius:14px;height:46px\}/);
  assert.match(css, /\.pc-topbar--inicio \.pc-mic\{[^}]*background:#1F78B4/);
  assert.match(css, /\.pc-topbar--inicio \.pc-sync-chip\{background:transparent/);
  assert.match(css, /\.pc-topbar--inicio \.emp-ativa-caixa\{[^}]*height:44px;padding:0 14px;border:1\.5px solid #264A80;border-radius:12px;background:#FFFFFF\}/);
  assert.match(css, /\.pc-topbar--inicio \.emp-ativa-selo\{position:absolute;top:-9px;left:12px;[^}]*background:#FFFFFF;font-size:15px;[^}]*color:#264A80\}/);
  assert.match(css, /\.pc-topbar--inicio \.emp-ativa-nome\{[^}]*font-size:16px/);
  const pagina = ler("../app/page.tsx");
  assert.equal(pagina.includes('variante={view === "inicio"'), false, "o Início usa a mesma barra do topo das outras telas (sem variante própria)");
});

test("fora do Início nada mudou: celular/campo e demais telas seguem no estado anterior", () => {
  const topo = ler("../components/AppTopbar.tsx");
  assert.ok(topo.includes('variante === "inicio" ? " pc-topbar--inicio" : ""'));
  const pagina = ler("../app/page.tsx");
  assert.ok((pagina.match(/inicioElemento/g) || []).length >= 3, "Rodada 12d: tablet e celular usam o mesmo Início do PC");
});

test("correções abertas sem prazo entram em Hoje precisa de você, depois das vencidas e dos POPs aguardando", async () => {
  const { correcoesSemPrazo } = await import("../lib/inicio.ts");
  const ncs = [
    { id: "a", empresaId: "e", titulo: "Sem prazo", status: "Aberta", prazo: "", responsavelAcao: "Maria" },
    { id: "b", empresaId: "e", titulo: "Com prazo", status: "Aberta", prazo: "2026-11-01" },
    { id: "c", empresaId: "e", titulo: "Resolvida", status: "Resolvida", prazo: "" },
    { id: "d", empresaId: "outra", titulo: "Outra empresa", status: "Aberta", prazo: "" },
    { id: "f", empresaId: "e", titulo: "Inativa", status: "Aberta", prazo: "", inativaNoChecklist: true },
    { id: "g", empresaId: "e", titulo: "Em tratamento sem responsável", status: "Em tratamento", prazo: "  " },
  ];
  const extras = correcoesSemPrazo(ncs, "e");
  assert.deepEqual(extras.map((i) => i.id), ["correcao:a", "correcao:g"]);
  assert.equal(extras[0].quem, "Maria");
  assert.equal(extras[1].quem, "Responsável ainda não definido");
  assert.equal(extras[0].prazo, "aberta", "linha: Correção · aberta · responsável");
  const itens = [painelItem("venc", "correcao", "vencido", -2, "2026-10-21"), painelItem("pop", "pop", "aguardando", null, undefined)];
  const c = colunasDoInicio(itens, [], "2026-10-23", extras);
  assert.deepEqual(c.precisa.map((i) => i.id), ["venc", "pop", "correcao:a", "correcao:g"]);
  assert.deepEqual([c.vencidos, c.aguardando], [1, 1], "o contador só conta vencidos e aprovações");
});

test("estados vazios: Tudo em dia, só um bloco e contadores/lembrete só com itens; sem visita, Comece por aqui com Nova visita", () => {
  const inicio = ler("../components/pc/PcInicio.tsx");
  assert.ok(inicio.includes("correcoes && itens.length === 0") && inicio.includes("Tudo em dia") && inicio.includes("Nenhuma correção aberta e nada vencendo nos próximos 30 dias."));
  assert.ok(inicio.includes("correcoes && itens.length > 0"), "sem correções o bloco não aparece");
  assert.equal(inicio.includes("Nada vence nos próximos 30 dias."), false);
  assert.ok(inicio.includes("Continuar de onde parei") && inicio.includes("Nenhuma visita para continuar.") && inicio.includes("Nova visita"));
  // contador e lembrete ficam dentro do bloco que só existe com itens
  assert.ok(inicio.includes("ini3-parte") && inicio.includes('rotulo: "Lembrete ao responsável"'), "o lembrete virou link do rodapé");
  const css = ler("../app/globals.css");
  assert.match(css, /.ini2-tudo-em-dia{padding:22px 26px;border-radius:20px;background:#F0FAF3}/);
  assert.match(css, /\.ini3-botao\{[^}]*height:40px;[^}]*background:var\(--rd-acao\)[^}]*color:#fff/);
  assert.match(css, /\.ini3-cartoes\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:16px\}/);
  assert.match(css, /\.ini3-colunas\.is-uma\{grid-template-columns:minmax\(0,1fr\)\}/);
});

test("dados de teste do Início: só Beyond Nutri, 4 itens, remoção limpa e Chico recusado", async () => {
  const { adicionarDadosDeTeste, contarDadosDeTeste, eEmpresaDeTeste, removerDadosDeTeste } = await import("../lib/dadosDeTesteInicio.ts");
  const db = () => ({ empresas: { b: { id: "b", nomeFantasia: "Beyond Nutri", pops: [] }, o: { id: "o", nomeFantasia: "Outra Empresa", pops: [] } }, empresaAtualId: "b", visitas: [], ncs: [], evidencias: [], usuarios: [], registrosAuditoria: [] });
  assert.equal(eEmpresaDeTeste({ nomeFantasia: "beyond nutri " }), true);
  assert.equal(eEmpresaDeTeste({ nomeFantasia: "Churrascaria do Chico" }), false);
  const com = adicionarDadosDeTeste(db(), "2026-10-23");
  assert.equal(contarDadosDeTeste(com), 6, "visita, correção, pessoa, treinamento e 2 POPs");
  assert.equal(com.empresas.o.pops.length, 0, "nada em outra empresa");
  assert.equal(com.empresas.b.pops.length, 2);
  assert.equal(com.ncs[0].prazo, "2026-10-18", "correção vencida há 5 dias");
  assert.equal(com.ncs[0].responsavelAcao, "Maria (teste)");
  assert.equal(com.capacitacoes[0].venceEm, "2026-11-02", "treinamento vence em 10 dias");
  assert.equal(com.empresas.b.pops.find((p) => p.codigo === "POP-T1").status, "Aguardando aprovação");
  assert.equal(com.empresas.b.pops.find((p) => p.codigo === "POP-T2").proximaRevisao, "2026-11-12", "revisão em 20 dias");
  assert.equal(contarDadosDeTeste(adicionarDadosDeTeste(com, "2026-10-23")), 6, "rodar de novo não duplica");
  // as colunas do Início enxergam os 4 itens
  const { colunasDoInicio, correcoesSemPrazo } = await import("../lib/inicio.ts");
  const semChico = removerDadosDeTeste(com);
  assert.equal(contarDadosDeTeste(semChico), 0);
  const { colaboradores, capacitacoes, ...resto } = semChico;
  assert.deepEqual(resto, db(), "remover devolve o estado anterior (só sobram listas vazias de pessoas e treinamentos)");
  assert.deepEqual([colaboradores, capacitacoes], [[], []]);
  assert.throws(() => adicionarDadosDeTeste({ ...db(), empresas: { c: { id: "c", nomeFantasia: "Churrascaria do Chico", pops: [] } } }, "2026-10-23"), /não encontrada/);
  void colunasDoInicio; void correcoesSemPrazo;
});

test("segunda rodada: contador só com partes maiores que zero, sem prazo à parte de vencidos", () => {
  assert.equal(contadorDoPainel({ vencidosPorOrigem: { correcao: 0, comprovante: 0, capacitacao: 0, pop: 0 }, aguardando: 0, semPrazo: 0 }), "");
  assert.equal(contadorDoPainel({ vencidosPorOrigem: { correcao: 1, comprovante: 0, capacitacao: 0, pop: 0 }, aguardando: 0, semPrazo: 0 }), "1 correção vencida");
  assert.equal(contadorDoPainel({ vencidosPorOrigem: { correcao: 2, comprovante: 0, capacitacao: 0, pop: 0 }, aguardando: 1, semPrazo: 3 }), "2 correções vencidas · 1 aguardando aprovação · 3 abertas sem prazo");
  assert.equal(contadorDoPainel({ vencidosPorOrigem: { correcao: 0, comprovante: 0, capacitacao: 0, pop: 0 }, aguardando: 0, semPrazo: 1 }), "1 aberta sem prazo");
  const extras = [{ id: "correcao:a", origem: "correcao", titulo: "A", prazo: "aberta", situacao: "sem-prazo", dias: null, quem: SEM_RESPONSAVEL, acao: "abrir", rotuloDaAcao: "Abrir" }];
  const c = colunasDoInicio([], [], "2026-10-23", extras);
  assert.deepEqual([c.vencidos, c.aguardando, c.semPrazo, c.semResponsavel], [0, 0, 1, 1]);
});

test("segunda rodada: ordem vencidas, aguardando aprovação, sem prazo", () => {
  const item = (id, origem, situacao) => ({ id, origem, titulo: id, prazo: "x", situacao, dias: null, quem: "Ana", acao: "abrir", rotuloDaAcao: "Abrir" });
  const sem = { ...item("correcao:s", "correcao", "sem-prazo") };
  const c = colunasDoInicio([item("p", "pop", "aguardando"), item("v", "correcao", "vencido")], [], "2026-10-23", [sem]);
  assert.deepEqual(c.precisa.map((i) => i.id), ["v", "p", "correcao:s"]);
});

test("segunda rodada: linha da correção com ambiente e sem repetir o responsável indefinido", () => {
  const nc = { id: "a", ambiente: "Cozinha / Produção" };
  const base = { id: "correcao:a", origem: "correcao", titulo: "A", prazo: "aberta", situacao: "sem-prazo", dias: null, quem: SEM_RESPONSAVEL };
  const [com] = comAmbienteDasCorrecoes([base], [nc]);
  assert.equal(subDaLinhaDoPainel(com, "Correção"), "Cozinha / Produção · Correção · aberta");
  assert.equal(subDaLinhaDoPainel(base, "Correção"), "Correção · aberta");
  assert.equal(subDaLinhaDoPainel({ ...com, quem: "Maria" }, "Correção"), "Cozinha / Produção · Correção · aberta · Maria");
  const inicio = ler("../components/pc/PcInicio.tsx");
  assert.equal(inicio.includes("verTodas"), false, "Ver todas leva às correções, não expande a lista");
});
