import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { seloDeSincronizacao } from "../lib/conexao.ts";
import { blocoAtivoDaBarra, GRUPOS_DA_CENTRAL, ROTULO_DA_SUBABA, subabasDaBarra } from "../lib/centralEmpresa.ts";
import {
  DIAS_DE_VISITA_PARADA,
  linhaDaVisita,
  ordenarRecentes,
  passosDeConfiguracao,
  resumoDaConfiguracao,
  resumoDeVisitasRecentes,
  textoDasParadas,
  textoDeProgresso,
  visitasParadas,
} from "../lib/inicio.ts";
import { COR_DO_ESTADO, estadoVisualDaLinha, grupoComecaAberto, linhasDoGrupo, resumoDoGrupo } from "../lib/popGestao.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("61. visitas recentes da mais recente para a mais antiga", () => {
  const ordenadas = ordenarRecentes([
    { id: "a", data: "2026-10-01", criadoEm: "2026-10-01T10:00:00Z" },
    { id: "c", data: "2026-10-20", criadoEm: "2026-10-20T08:00:00Z" },
    { id: "b", data: "2026-10-20", criadoEm: "2026-10-20T12:00:00Z" },
  ]);
  assert.deepEqual(ordenadas.map((v) => v.id), ["b", "c", "a"]);
});

test("57/70. linha da visita e progresso: sem itens não há '0 de 0'", () => {
  assert.equal(linhaDaVisita(5, "22/10/2026"), "Visita 5 · 22/10/2026");
  assert.equal(textoDeProgresso(0, 0), "ainda sem itens respondidos");
  assert.equal(textoDeProgresso(5, 12), "5 de 12 itens respondidos");
  const inicio = ler("../components/pc/PcInicio.tsx");
  assert.ok(inicio.includes("continuar.total > 0 &&") && inicio.includes("visita.total > 0 &&"), "barra só quando há itens");
});

test("68/73. visitas paradas há mais de 30 dias e o resumo do cabeçalho recolhido", () => {
  assert.equal(DIAS_DE_VISITA_PARADA, 30);
  const visitas = [
    { id: "1", status: "Em andamento", data: "2026-09-01" },
    { id: "2", status: "Em andamento", data: "2026-10-10" },
    { id: "3", status: "Concluída", data: "2026-01-01" },
    { id: "4", status: "Em andamento", data: "2026-08-01", arquivada: true },
    { id: "5", status: "Em andamento", data: "2026-09-22" },
  ];
  assert.deepEqual(visitasParadas(visitas, "2026-10-23").map((v) => v.id), ["1", "5"], "só em andamento, não arquivada e com mais de 30 dias (22/09 já passa)");
  assert.equal(textoDasParadas(1), "1 visita parada há mais de 30 dias");
  assert.equal(textoDasParadas(3), "3 visitas paradas há mais de 30 dias");
  assert.equal(resumoDeVisitasRecentes(4, 2), "4 em andamento · 2 paradas há mais de 30 dias");
  assert.equal(resumoDeVisitasRecentes(1, 0), "1 em andamento");
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('acao: "visita.arquivada"') && pagina.includes("arquivarVisitasParadas"), "arquivar registra quem e quando na auditoria, sem apagar");
  assert.ok(pagina.includes("Arquivar visitas paradas"), "pede confirmação");
});

test("58/65. UM cálculo de configuração: 7 passos na ordem e o 'faltam'", () => {
  const empresa = { id: "e1", nomeFantasia: "Beyond Nutri", cnpj: "11222333000181", responsavel: "Elton Volmir Strapazon", setoresManual: ["Cozinha"], equipamentosSetores: [], fluxosOperacionais: [{ aplicavel: false }] };
  const passos = passosDeConfiguracao({ usuario: { nome: "Elton Volmir Strapazon", cargo: "Nutricionista", perfil: "Administrador", crn: "CRN-2 1", telefone: "5" }, empresa, visitas: [{ empresaId: "e1", status: "Em andamento" }], relatoriosEmitidos: [] });
  assert.deepEqual(passos.map((p) => p.chave), ["perfil", "empresa", "ambientes", "equipamentos", "fluxos", "visita", "relatorio"]);
  assert.deepEqual(passos.filter((p) => p.feito).map((p) => p.chave), ["perfil", "empresa", "ambientes", "visita"]);
  const resumo = resumoDaConfiguracao(passos);
  assert.deepEqual([resumo.feitos, resumo.total, resumo.completo], [4, 7, false]);
  assert.deepEqual(resumo.faltam.map((p) => p.chave), ["equipamentos", "fluxos", "relatorio"]);
  // tudo feito: a linha some
  const completos = passosDeConfiguracao({ usuario: { nome: "A", cargo: "B", perfil: "Gerente" }, empresa: { ...empresa, equipamentosSetores: [{ id: "x" }], fluxosOperacionais: [{ aplicavel: true }] }, visitas: [{ empresaId: "e1", status: "Concluída" }] });
  assert.equal(resumoDaConfiguracao(completos).completo, true);
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("atual && !resumoDoGuia.completo"), "a linha some quando tudo está completo");
  assert.ok(ler("../components/pc/PcAjuda.tsx").includes("primeirosPassos"), "o guia usa o mesmo cálculo");
});

test("64. chip de sincronização sempre com texto: Sincronizado, Sem sinal, N pendentes de envio", () => {
  assert.deepEqual(seloDeSincronizacao({ online: true, syncStatus: "sincronizado", pendentes: 0 }).rotulo, "Sincronizado");
  assert.equal(seloDeSincronizacao({ online: false, syncStatus: "sincronizado", pendentes: 0 }).rotulo, "Sem sinal");
  assert.equal(seloDeSincronizacao({ online: true, syncStatus: "sincronizado", pendentes: 1 }).rotulo, "1 pendente de envio");
  assert.equal(seloDeSincronizacao({ online: true, syncStatus: "sincronizado", pendentes: 4 }).rotulo, "4 pendentes de envio");
  assert.equal(seloDeSincronizacao({ online: true, syncStatus: "erro", pendentes: 0 }).rotulo, "Não sincronizou");
  assert.equal(seloDeSincronizacao({ online: true, syncStatus: "conectando", pendentes: 0 }).rotulo, "Sincronizando…");
  assert.ok(seloDeSincronizacao({ online: true, syncStatus: "sincronizado", pendentes: 0 }).dica.length > 10, "tem tooltip");
  const css = ler("../app/globals.css");
  assert.equal(/\.pc-sync-texto\{display:none\}/.test(css), false, "o texto do chip nunca é escondido");
});

test("59/60. um só avatar do usuário (menu) e o nome da empresa só no seletor", () => {
  const topo = ler("../components/AppTopbar.tsx");
  assert.equal(topo.includes('className="pc-avatar"'), false);
  const nav = ler("../components/AppNavigation.tsx");
  assert.ok(nav.includes("Visita {visitaMenu.numero") && !nav.includes("{visitaMenu.empresa}</span>"));
  const inicio = ler("../components/pc/PcInicio.tsx");
  assert.ok(inicio.includes("linhaDaVisita(continuar.numero, continuar.data)"));
});

test("62/66/67. Hoje precisa de você: bolinha + chip, Ver todas (N) com o total real, lembrete em link; sem chips de relatório", () => {
  const painel = ler("../components/PainelHoje.tsx");
  assert.ok(painel.includes("Ver todas (${total})") && painel.includes("const total = painel.itens.length"));
  assert.ok(painel.includes("hoje-bolinha") && painel.includes("hoje-tipo") && painel.includes("Lembrete ao responsável"));
  for (const chip of ["Resumo de uma página", "Evolução", "Relatórios emitidos", "Dossiê"]) assert.equal(painel.includes(chip), false, chip);
  const css = ler("../app/globals.css");
  assert.match(css, /\.hoje-titulo-card\{[^}]*font-weight:500/);
  assert.equal(/\.hoje-item--vencido\{border-left-color/.test(css.slice(css.indexOf("/* ===== Pacote 4"))), false);
  assert.ok(ler("../components/pc/PcCorrecoes.tsx").includes("Lembrete ao responsável"), "o lembrete também fica em Correções");
});

test("69/70/73. Visitas recentes: da empresa ativa, 5 linhas, recolhível e lembrada no aparelho", () => {
  const inicio = ler("../components/pc/PcInicio.tsx");
  assert.ok(inicio.includes("LINHAS_RECENTES = 5") && inicio.includes("Ver todas as visitas →") && inicio.includes("Recolher") && inicio.includes('aria-expanded={recentes.aberto}'));
  assert.ok(inicio.includes("Todas as empresas") && inicio.includes('role="switch"'));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("recentesTodasEmpresas || visita.empresaId === atual?.id") && pagina.includes("useState(false)"), "chave desligada por padrão");
  assert.ok(pagina.includes('"mbp-inicio-visitas-recentes"') && pagina.includes("try {"));
});

test("74. duas barras de blocos na Central; Ambientes e equipamentos é um bloco só; sem chip de modo", () => {
  assert.deepEqual(GRUPOS_DA_CENTRAL.map((g) => g.rotulo), ["Empresa", "Estrutura", "Documentos"]);
  assert.equal(ROTULO_DA_SUBABA.ambientes, "Ambientes e equipamentos");
  assert.deepEqual(subabasDaBarra(["ambientes", "equipamentos", "fluxos"]), ["ambientes", "fluxos"]);
  assert.equal(blocoAtivoDaBarra("equipamentos"), "ambientes");
  const css = ler("../app/globals.css");
  assert.match(css, /\.cen-barra\{display:inline-flex;align-items:stretch;height:40px;border-radius:12px;background:#EEF1F5\}/);
  assert.match(css, /\.cen-bloco \+ \.cen-bloco::before\{[^}]*background:#CBD5E1\}/);
  assert.match(css, /\.cen-bloco\.is-ativa\{border-radius:9px;background:#BFDDF7;color:#12202B\}/);
  assert.match(css, /\.pgg-conta-num\{font-family:var\(--font-display\),"Outfit",sans-serif;font-size:22px/);
  assert.match(css, /\.pgg-faixa--norma\{background:#D6E7F8\}/);
  assert.match(css, /\.pgg-faixa--outros\{background:#FFEBCB\}/);
  assert.match(css, /\.pgl-adicionar-botao\{height:44px;[^}]*background:#FFB35C/);
  assert.match(css, /\.pgl-aprovar\{height:40px;[^}]*background:#FFB35C/);
  assert.ok(ler("../components/AppTopbar.tsx").includes("!ocultarChipDeModo"));
});

test("74. cor e estado de cada POP: atrasado vence rascunho; vigente verde, aguardando azul", () => {
  assert.deepEqual(COR_DO_ESTADO, { atrasado: "#D93A3A", rascunho: "#E89A0C", aguardando: "#0E7FB8", vigente: "#15803D", pendencia: "#B35A36", neutro: "#B4C2CE" });
  assert.equal(estadoVisualDaLinha({ situacao: "Rascunho", registroAtrasado: true }), "atrasado");
  assert.equal(estadoVisualDaLinha({ situacao: "Rascunho" }), "rascunho");
  assert.equal(estadoVisualDaLinha({ situacao: "Aguardando aprovação" }), "aguardando");
  assert.equal(estadoVisualDaLinha({ situacao: "Vigente" }), "vigente");
  assert.equal(estadoVisualDaLinha({ situacao: "Falta criar" }), "neutro");
});

test("75. grupos que abrem e fecham: resumo, abertura automática, 5 mais urgentes acima de 8", () => {
  const vigentes = Array.from({ length: 3 }, () => ({ situacao: "Vigente" }));
  assert.equal(grupoComecaAberto(vigentes), false, "tudo vigente começa fechado");
  assert.equal(grupoComecaAberto([...vigentes, { situacao: "Aguardando aprovação" }]), true);
  assert.equal(grupoComecaAberto([...vigentes, { situacao: "Vigente", registroAtrasado: true }]), true);
  assert.equal(resumoDoGrupo([{ situacao: "Vigente" }, { situacao: "Rascunho" }, { situacao: "Vigente", registroAtrasado: true }]), "3 POPs · 1 atrasado · 1 rascunho");
  const muitos = Array.from({ length: 10 }, (_, i) => ({ id: i, acao: { prioridade: 10 - i } }));
  assert.equal(linhasDoGrupo(muitos.slice(0, 8), false).length, 8, "até 8 mostra todos");
  const urgentes = linhasDoGrupo(muitos, false);
  assert.equal(urgentes.length, 5);
  assert.deepEqual(urgentes.map((l) => l.id), [9, 8, 7, 6, 5], "os mais urgentes (menor prioridade primeiro)");
  assert.equal(linhasDoGrupo(muitos, true).length, 10);
  const lista = ler("../components/pc/PcPopsLista.tsx");
  assert.ok(lista.includes("mbp-pops-grupos:") && lista.includes("grupoComecaAberto(todas)") && lista.includes("Ver todos ("));
});
