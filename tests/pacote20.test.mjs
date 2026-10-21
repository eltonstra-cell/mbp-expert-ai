import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MENSAGEM_POUCOS_DADOS,
  montarLembrete,
  montarPainelHoje,
  montarResumo,
  percentualDeConformidade,
  podeEnviarLembrete,
  podeVerPainel,
  textoDoResumo,
} from "../lib/painelHoje.ts";

const usuario = (perfil, extra = {}) => ({ id: `u-${perfil}`, perfil, status: "Ativo", empresaIds: ["e1"], nome: perfil, email: "x@x.com", ...extra });
const HOJE = "2026-10-20";

const empresa = (extra = {}) => ({
  id: "e1",
  responsavelEstabelecimento: { nome: "Carla Dona", cargo: "Proprietária", usuarioId: "u-resp" },
  pops: [],
  ...extra,
});
const comprovante = (id, validade, tipo = "pragas") => ({ id, empresaId: "e1", tipo, emissor: `Emissor ${id}`, dataServico: "2026-01-01", validade, observacao: "", criadoEm: "" });
const nc = (id, prazo, extra = {}) => ({ id, empresaId: "e1", visitaId: "v1", titulo: `Correção ${id}`, status: "Aberta", prazo, observacao: "Observação sensível do achado", responsavelAcao: "Fulano", ...extra });
const colaborador = (id, nome) => ({ id, empresaId: "e1", nome, cargo: "Auxiliar", ativo: true, criadoEm: "" });
const capacitacao = (id, colaboradorId, venceEm, conteudo = "Boas práticas") => ({ id, empresaId: "e1", colaboradorId, conteudo, cargaHoraria: 4, data: "2025-10-01", venceEm, criadoEm: "2025-10-01" });

test("Painel: vencidos primeiro, contadores de vencidos e de 7 dias, e quem age em cada item", () => {
  const painel = montarPainelHoje({
    empresa: empresa({ pops: [{ id: "p1", codigo: "POP-01", titulo: "Higienização", versao: "1.1", status: "Aguardando aprovação" }] }),
    usuario: usuario("Consultor/RT"),
    usuarioId: "u-resp",
    hoje: HOJE,
    comprovantes: [comprovante("a", "2026-10-25"), comprovante("b", "2026-10-10"), comprovante("c", "2026-11-15"), comprovante("d", "2027-06-01")],
    colaboradores: [colaborador("c1", "Maria Souza")],
    capacitacoes: [capacitacao("k1", "c1", "2026-10-01")],
    ncs: [nc("n1", "2026-10-18"), nc("n2", "2026-10-22"), nc("n3", "2026-12-30"), nc("n4", "2026-10-01", { status: "Resolvida" })],
    podeVerCorrecoes: true,
  });
  const ids = painel.itens.map((item) => item.id);
  const vencidos = painel.itens.filter((item) => item.situacao === "vencido").map((item) => item.id);
  assert.deepEqual(ids.slice(0, vencidos.length).sort(), vencidos.sort(), "vencidos vêm antes");
  assert.equal(painel.vencidos, 3, "comprovante b, capacitação k1 e correção n1");
  assert.equal(painel.vencemEm7Dias, 2, "comprovante a (5 dias) e correção n2 (2 dias)");
  assert.equal(painel.aguardando, 1);
  assert.ok(!ids.includes("correcao:n3") && !ids.includes("correcao:n4") && !ids.includes("comprovante:d"), "fora da janela e resolvida não entram");
  assert.equal(painel.itens[0].dias <= painel.itens[1].dias, true);
  const pop = painel.itens.find((item) => item.origem === "pop");
  assert.ok(pop.quem.includes("Responsável do estabelecimento"));
  assert.equal(pop.rotuloDaAcao, "Aprovar", "o responsável vinculado aprova");
  assert.equal(painel.itens.find((item) => item.id === "comprovante:b").rotuloDaAcao, "Renovar");
  assert.equal(painel.itens.find((item) => item.id === "correcao:n1").quem, "Fulano");
});

test("Painel: respeita o perfil (só o que a pessoa pode ver e fazer); quem não é o responsável só abre o POP", () => {
  const base = { empresa: empresa({ pops: [{ id: "p1", titulo: "POP", versao: "1.0", status: "Aguardando aprovação" }] }), hoje: HOJE, comprovantes: [comprovante("b", "2026-10-10")], colaboradores: [colaborador("c1", "Maria")], capacitacoes: [capacitacao("k1", "c1", "2026-10-01")], ncs: [nc("n1", "2026-10-18")] };
  const gerente = montarPainelHoje({ ...base, usuario: usuario("Gerente"), usuarioId: "u-Gerente", podeVerCorrecoes: false });
  assert.deepEqual(gerente.itens.map((item) => item.origem).sort(), ["capacitacao", "comprovante", "pop"], "sem correções quando o perfil não acompanha");
  assert.equal(gerente.itens.find((item) => item.origem === "pop").rotuloDaAcao, "Abrir");
  const fiscal = montarPainelHoje({ ...base, usuario: usuario("Fiscal", { validoAte: "2099-01-01T00:00:00-03:00" }), podeVerCorrecoes: false });
  assert.deepEqual(fiscal.itens.filter((item) => item.origem === "comprovante" || item.origem === "capacitacao").length, 1, "o Fiscal lê comprovante mas não vê capacitação");
});

test("Permissões: Fiscal e Executor não veem o painel; só RT e Administrador abrem o lembrete", () => {
  for (const perfil of ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente", "Executor de campo", "Fiscal"]) {
    assert.equal(podeVerPainel(usuario(perfil)), ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente"].includes(perfil), perfil);
    assert.equal(podeEnviarLembrete(usuario(perfil)), perfil === "Administrador" || perfil === "Consultor/RT", perfil);
  }
  assert.equal(podeVerPainel(null), false);
  assert.equal(podeVerPainel(usuario("Gerente", { status: "Suspenso" })), false);
});

test("Lembrete: só título e prazo; sem nome de colaborador, observação, foto nem dado de saúde", () => {
  const painel = montarPainelHoje({
    empresa: empresa(),
    usuario: usuario("Consultor/RT"),
    usuarioId: "u-rt",
    hoje: HOJE,
    comprovantes: [comprovante("b", "2026-10-10")],
    colaboradores: [colaborador("c1", "Maria Souza")],
    capacitacoes: [capacitacao("k1", "c1", "2026-10-01"), capacitacao("k2", "c1", "2026-10-25", "Manipulação segura")],
    ncs: [nc("n1", "2026-10-18")],
    podeVerCorrecoes: true,
  });
  const lembrete = montarLembrete({ empresaNome: "Padaria Pão Quente", painel, remetente: "Rita RT", destinatarioNome: "Carla Dona", destinatarioEmail: "carla@exemplo.com", hoje: HOJE });
  assert.ok(lembrete.corpo.includes("Correção n1"));
  assert.ok(lembrete.corpo.includes("Emissor b"));
  assert.ok(lembrete.corpo.includes("18/10/2026"));
  assert.ok(lembrete.corpo.includes("Capacitações da equipe: 1 vencida e 1 vencendo"));
  for (const proibido of ["Maria", "Souza", "Observação sensível", "Fulano", "saúde", "atestado", "exame", "foto", "evidência"]) {
    assert.ok(!lembrete.corpo.toLowerCase().includes(proibido.toLowerCase()), proibido);
  }
  assert.ok(lembrete.corpo.includes("Olá, Carla,"));
  assert.ok(lembrete.corpo.includes("não substitui o relatório completo"));
  assert.ok(lembrete.mailto.startsWith("mailto:carla@exemplo.com?subject="));
  assert.ok(lembrete.mailto.includes("body="));
  const semEmail = montarLembrete({ empresaNome: "X", painel, remetente: "Rita", hoje: HOJE });
  assert.equal(semEmail.para, "");
  assert.ok(semEmail.mailto.startsWith("mailto:?subject="));
  // muitas pendências: a lista é cortada e avisa quantas faltam
  const muitas = montarPainelHoje({ empresa: empresa(), usuario: usuario("Consultor/RT"), hoje: HOJE, comprovantes: Array.from({ length: 20 }, (_, i) => comprovante(`m${i}`, "2026-10-01")), podeVerCorrecoes: false });
  assert.ok(montarLembrete({ empresaNome: "X", painel: muitas, remetente: "R", hoje: HOJE }).corpo.includes("e mais 8 itens"));
  // nada pendente
  const vazio = montarPainelHoje({ empresa: empresa(), usuario: usuario("Gerente"), hoje: HOJE, podeVerCorrecoes: true });
  assert.ok(montarLembrete({ empresaNome: "X", painel: vazio, remetente: "R", hoje: HOJE }).corpo.includes("Nenhuma pendência"));
});

const visita = (id, data, conformes, naoConformes, extra = {}) => ({
  id,
  empresaId: "e1",
  data,
  status: "Concluída",
  checklist: [
    ...Array.from({ length: conformes }, (_, i) => ({ id: `${id}c${i}`, status: "Conforme" })),
    ...Array.from({ length: naoConformes }, (_, i) => ({ id: `${id}n${i}`, status: "Não Conforme" })),
    { id: `${id}na`, status: "Não se aplica" },
    { id: `${id}p`, status: "Pendente" },
  ],
  ...extra,
});

test("Resumo: percentual exato dos itens respondidos, sem arredondar para enganar", () => {
  assert.equal(percentualDeConformidade(visita("a", "2026-10-01", 8, 2)), 80);
  assert.equal(percentualDeConformidade(visita("a", "2026-10-01", 2, 1)), 67);
  assert.equal(percentualDeConformidade({ checklist: [{ status: "Pendente" }, { status: "Não se aplica" }] }), null);
  const resumo = montarResumo({
    empresaNome: "Padaria",
    visitas: [visita("v1", "2026-09-01", 14, 6), visita("v2", "2026-10-10", 17, 3)],
    ncs: [nc("n1", "2026-10-30"), nc("n2", "2026-09-30", { status: "Resolvida", resolvidaEm: "2026-10-05T10:00:00Z" }), nc("n3", "2026-10-30", { inativaNoChecklist: true })],
    painel: montarPainelHoje({ empresa: empresa(), usuario: usuario("Gerente"), hoje: HOJE, comprovantes: [comprovante("b", "2026-10-10")], podeVerCorrecoes: true }),
    hoje: HOJE,
  });
  assert.equal(resumo.conformidade.percentual, 85);
  assert.deepEqual([resumo.conformidade.respondidos, resumo.conformidade.conformes, resumo.conformidade.naoConformes, resumo.conformidade.dataDaVisita], [20, 17, 3, "2026-10-10"]);
  assert.equal(resumo.conformidade.totalDeItens >= resumo.conformidade.respondidosNoChecklist, true, "o denominador da visita inteira fica visível");
  assert.equal(resumo.abertas, 1, "resolvida e inativa não contam");
  assert.equal(resumo.melhoria.pontos, 15, "85% menos 70%");
  assert.equal(resumo.melhoria.resolvidasNoPeriodo, 1);
  assert.equal(resumo.documentosVencendo, 1);
  const texto = textoDoResumo(resumo);
  assert.ok(texto.includes("85% conforme entre os itens avaliados (17 de 20)"));
  assert.ok(texto.includes("Não substitui o relatório completo."));
});

test("Resumo: com poucos dados não compara nem inventa número", () => {
  const painel = montarPainelHoje({ empresa: empresa(), usuario: usuario("Gerente"), hoje: HOJE, podeVerCorrecoes: true });
  const poucos = montarResumo({ empresaNome: "X", visitas: [visita("v1", "2026-09-01", 3, 1), visita("v2", "2026-10-10", 4, 0)], ncs: [], painel, hoje: HOJE });
  assert.equal(poucos.melhoria.texto, MENSAGEM_POUCOS_DADOS);
  assert.equal(poucos.melhoria.pontos, null);
  const uma = montarResumo({ empresaNome: "X", visitas: [visita("v1", "2026-10-10", 12, 1)], ncs: [], painel, hoje: HOJE });
  assert.equal(uma.melhoria, null);
  const nenhuma = montarResumo({ empresaNome: "X", visitas: [], ncs: [], painel, hoje: HOJE });
  assert.equal(nenhuma.conformidade, null);
  assert.ok(textoDoResumo(nenhuma).includes("sem itens respondidos ainda"));
});

test("Telas: o painel só aparece para o gestor, o lembrete abre no e-mail da pessoa e o resumo avisa que não substitui o relatório", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("podeVerPainel(usuarioDaSessao)"));
  assert.ok(page.includes("podeEnviarLembrete(usuarioDaSessao) ? () => setLembreteAberto(true) : undefined"));
  assert.ok(page.includes("painel={painelNode}"));
  const lembrete = readFileSync(new URL("../components/pc/PcLembrete.tsx", import.meta.url), "utf8");
  assert.ok(lembrete.includes("Abrir no meu e-mail") && !lembrete.includes("Enviar lembrete"));
  const resumo = readFileSync(new URL("../components/pc/PcResumo.tsx", import.meta.url), "utf8");
  assert.ok(resumo.includes("Não substitui o relatório completo."));
  const painel = readFileSync(new URL("../components/PainelHoje.tsx", import.meta.url), "utf8");
  assert.ok(painel.includes("Hoje precisa de você") && painel.includes("vencem em 7 dias") && painel.includes("quem age"));
});
