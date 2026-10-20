import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { CAPACIDADE_VAZIA, capacidadeDoFormulario, capacidadeParaFormulario, validarCapacidade } from "../lib/capacidadeEmpresa.ts";
import { montarDossie, opcoesPadraoDoDossie, podeGerarDossie, relatoriosDosUltimos12Meses } from "../lib/dossie.ts";
import { MENSAGEM_POUCOS_DADOS, evolucaoDaEmpresa, reincidentesDaEmpresa, somarMesesAoMes } from "../lib/evolucao.ts";
import { visitasComGuardaVencendo } from "../lib/privacidadeEmpresa.ts";
import {
  AVISO_SEM_ICP,
  TEXTO_CRN_PENDENTE,
  emitir,
  emitirNoArmazem,
  evidenciasEmRelatorioEmitido,
  formatarNumero,
  podeEmitirRelatorio,
  preservarEvidenciasEmRelatorio,
  proximaSequencia,
  ultimaVersao,
} from "../lib/relatorioEmitido.ts";
import { filtrarEstadoPorUsuario } from "../lib/stateAccess.ts";

const usuario = (perfil, extra = {}) => ({ id: `u-${perfil}`, perfil, status: "Ativo", empresaIds: ["e1"], nome: `Nome ${perfil}`, email: "x@x.com", ...extra });
const AGORA = new Date("2026-10-20T15:00:00.000Z");

const base = () => ({
  empresas: { e1: { id: "e1", nomeFantasia: "Padaria", cnpj: "00.000.000/0001-00", municipio: "Porto Alegre", uf: "RS", pops: [] }, e2: { id: "e2", nomeFantasia: "Outra", cnpj: "11", pops: [] } },
  empresaAtualId: "e1",
  visitas: [
    { id: "v1", empresaId: "e1", data: "2026-10-10", responsavel: "Ana", observacoes: "", conclusao: "", status: "Concluída", checklist: [{ id: "i1", ambiente: "Cozinha", titulo: "Piso", categoria: "Piso", status: "Conforme", observacao: "" }, { id: "i2", ambiente: "Cozinha", titulo: "Parede", categoria: "Parede", status: "Não Conforme", observacao: "mofo" }] },
    { id: "v2", empresaId: "e1", data: "2026-10-12", responsavel: "Ana", observacoes: "", conclusao: "", status: "Concluída", checklist: [{ id: "j1", ambiente: "Estoque", titulo: "Teto", categoria: "Teto", status: "Conforme", observacao: "" }] },
    { id: "v9", empresaId: "e2", data: "2026-10-12", responsavel: "Bia", observacoes: "", conclusao: "", status: "Concluída", checklist: [] },
  ],
  ncs: [{ id: "n1", empresaId: "e1", visitaId: "v1", ambiente: "Cozinha", checklistItemId: "i2", titulo: "Parede com mofo", categoria: "Parede", criticidade: "Importante", status: "Resolvida", observacao: "mofo", criadoEm: "2026-10-10T10:00:00Z", resolvidaEm: "2026-10-15T10:00:00Z" }],
  evidencias: [{ id: "f1", empresaId: "e1", visitaId: "v1", tipo: "Foto", nomeArquivo: "f.jpg", mimeType: "image/jpeg", descricao: "mofo", ambiente: "Cozinha", checklistItemId: "i2", ncId: "n1", blobPathname: "evidencias/v1/f1.jpg", criadoEm: "2026-10-10T10:00:00Z" }],
  usuarios: [],
  registrosAuditoria: [],
  relatoriosEmitidos: [],
});

test("Emitir: só RT e Administrador; o número sai no formato PC-AAAA-NNNN e a assinatura leva o CRN do cadastro", () => {
  for (const perfil of ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente", "Executor de campo", "Fiscal"]) {
    assert.equal(podeEmitirRelatorio(usuario(perfil)), perfil === "Administrador" || perfil === "Consultor/RT", perfil);
  }
  assert.equal(emitir(base(), { visitaId: "v1" }, usuario("Gerente"), AGORA, "r1").ok, false);
  assert.equal(emitir(base(), { visitaId: "v1" }, usuario("Gerente"), AGORA, "r1").status, 403);
  const rt = usuario("Consultor/RT", { crn: "CRN-2 12345" });
  const r = emitir(base(), { visitaId: "v1" }, rt, AGORA, "r1");
  assert.equal(r.ok, true);
  assert.equal(r.relatorio.numero, "PC-2026-0001");
  assert.equal(r.relatorio.versao, 1);
  assert.equal(r.relatorio.emitidoEm, AGORA.toISOString());
  assert.deepEqual([r.relatorio.assinatura.nome, r.relatorio.assinatura.crn, r.relatorio.assinatura.crnPendente], ["Nome Consultor/RT", "CRN-2 12345", false]);
  assert.equal(r.relatorio.aviso, AVISO_SEM_ICP);
  assert.equal(AVISO_SEM_ICP, "Não é assinatura digital com certificado ICP-Brasil.");
  assert.equal(formatarNumero(2026, 12), "PC-2026-0012");
  const semCrn = emitir(base(), { visitaId: "v1" }, usuario("Consultor/RT"), AGORA, "r2");
  assert.equal(semCrn.relatorio.assinatura.crn, TEXTO_CRN_PENDENTE);
  assert.equal(semCrn.relatorio.assinatura.crnPendente, true);
  // RT de outra empresa não emite
  assert.equal(emitir(base(), { visitaId: "v9" }, usuario("Consultor/RT"), AGORA, "r3").status, 403);
  assert.equal(emitir(base(), { visitaId: "nao-existe" }, usuario("Consultor/RT"), AGORA, "r3").status, 404);
});

test("Instantâneo imutável e versão 2: a 1 continua guardada, com o mesmo número", () => {
  const dados = base();
  const rt = usuario("Consultor/RT", { crn: "CRN-2 1" });
  const v1 = emitir(dados, { visitaId: "v1" }, rt, AGORA, "r1");
  const copiaDaV1 = JSON.parse(JSON.stringify(v1.relatorio));
  // mudar os dados depois não muda o instantâneo
  dados.visitas[0].checklist[1].status = "Conforme";
  dados.ncs[0].titulo = "Outro título";
  assert.deepEqual(JSON.parse(JSON.stringify(v1.relatorio)), copiaDaV1);
  assert.equal(v1.relatorio.instantaneo.conformidade.percentual, 50);
  assert.equal(v1.relatorio.instantaneo.ncs[0].titulo, "Parede com mofo");

  dados.relatoriosEmitidos = v1.relatorios;
  const semMotivo = emitir(dados, { visitaId: "v1" }, rt, AGORA, "r2");
  assert.equal(semMotivo.ok, false);
  assert.equal(semMotivo.status, 409, "já emitido: é preciso pedir a nova versão");
  const semTexto = emitir(dados, { visitaId: "v1", novaVersao: true }, rt, AGORA, "r2");
  assert.equal(semTexto.ok, false);
  assert.equal(semTexto.status, 400);
  const v2 = emitir(dados, { visitaId: "v1", novaVersao: true, motivo: "Corrigido o item da parede" }, rt, new Date("2026-10-21T10:00:00Z"), "r2");
  assert.equal(v2.ok, true);
  assert.equal(v2.relatorio.numero, "PC-2026-0001");
  assert.equal(v2.relatorio.versao, 2);
  assert.equal(v2.relatorio.instantaneo.conformidade.percentual, 100, "a v2 reflete a correção");
  assert.equal(v2.relatorios.length, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(v2.relatorios[0])), copiaDaV1, "a versão 1 não foi alterada");
  assert.equal(ultimaVersao(v2.relatorios, "v1").versao, 2);
  assert.equal(emitir(dados, { visitaId: "v2", novaVersao: true, motivo: "x" }, rt, AGORA, "r9").status, 409, "sem relatório anterior não há versão 2");
});

test("Numeração sem repetição: o número é por empresa e ano; a versão 2 não gasta número", () => {
  const rt = usuario("Administrador");
  let dados = base();
  const a = emitir(dados, { visitaId: "v1" }, rt, AGORA, "r1");
  dados = { ...dados, relatoriosEmitidos: a.relatorios };
  const b = emitir(dados, { visitaId: "v2" }, rt, AGORA, "r2");
  assert.deepEqual([a.relatorio.numero, b.relatorio.numero], ["PC-2026-0001", "PC-2026-0002"]);
  dados = { ...dados, relatoriosEmitidos: b.relatorios };
  const v2 = emitir(dados, { visitaId: "v1", novaVersao: true, motivo: "Correção" }, rt, AGORA, "r3");
  assert.equal(v2.relatorio.numero, "PC-2026-0001");
  assert.equal(proximaSequencia(v2.relatorios, "e1", 2026), 3);
  assert.equal(proximaSequencia(v2.relatorios, "e2", 2026), 1, "outra empresa começa do 1");
  assert.equal(proximaSequencia(v2.relatorios, "e1", 2027), 1, "novo ano recomeça");
});

// Armazém com comparar-e-trocar, como o banco: grava só se a versão ainda for a lida.
function armazemComVersao(dados) {
  let versao = 1;
  let relatorios = dados.relatoriosEmitidos || [];
  const esperas = [];
  return {
    get relatorios() {
      return relatorios;
    },
    ler: async () => {
      // Força a corrida: todos leem antes de qualquer um gravar.
      const lida = { data: { ...dados, relatoriosEmitidos: relatorios }, versao: String(versao) };
      await new Promise((resolver) => setTimeout(resolver, 5));
      return lida;
    },
    gravar: async (novos, versaoEsperada) => {
      esperas.push(versaoEsperada);
      if (String(versao) !== versaoEsperada) return false;
      relatorios = novos;
      versao += 1;
      return true;
    },
  };
}

test("Emissões simultâneas: nunca repetem o número (comparar e trocar com nova tentativa)", async () => {
  const dados = base();
  dados.visitas.push(...["v3", "v4", "v5", "v6"].map((id) => ({ id, empresaId: "e1", data: "2026-10-13", responsavel: "Ana", observacoes: "", conclusao: "", status: "Concluída", checklist: [] })));
  const armazem = armazemComVersao(dados);
  let n = 0;
  const rt = usuario("Consultor/RT", { crn: "CRN" });
  const ids = ["v1", "v2", "v3", "v4", "v5", "v6"];
  const resultados = await Promise.all(ids.map((visitaId) => emitirNoArmazem(armazem, { visitaId }, rt, () => AGORA, () => `rel-${++n}`)));
  assert.ok(resultados.every((r) => r.ok), JSON.stringify(resultados.filter((r) => !r.ok)));
  const numeros = resultados.map((r) => r.relatorio.numero).sort();
  assert.deepEqual(numeros, ["PC-2026-0001", "PC-2026-0002", "PC-2026-0003", "PC-2026-0004", "PC-2026-0005", "PC-2026-0006"]);
  assert.equal(new Set(armazem.relatorios.map((r) => r.numero)).size, 6);
  assert.equal(armazem.relatorios.length, 6);
  // duas pessoas emitindo a MESMA visita ao mesmo tempo: só uma emite; a outra recebe "já emitido"
  const outro = armazemComVersao(base());
  const duplas = await Promise.all([1, 2].map((i) => emitirNoArmazem(outro, { visitaId: "v1" }, rt, () => AGORA, () => `d-${i}`)));
  assert.equal(duplas.filter((r) => r.ok).length, 1);
  assert.equal(duplas.find((r) => !r.ok).status, 409);
  assert.equal(outro.relatorios.length, 1);
});

test("Rota e estado: a emissão não depende da lista do cliente e o PUT nunca a substitui", () => {
  const rota = readFileSync(new URL("../app/api/relatorios/emitir/route.ts", import.meta.url), "utf8");
  assert.ok(rota.includes("jsonb_set(data, '{relatoriosEmitidos}'") && rota.includes("date_trunc('milliseconds', updated_at) = ${versaoEsperada}"));
  assert.ok(rota.includes("emitirNoArmazem"));
  const estado = readFileSync(new URL("../app/api/state/route.ts", import.meta.url), "utf8");
  assert.ok(estado.includes("relatoriosEmitidos: emitidosNoServidor"));
  const dados = base();
  const rel = emitir(dados, { visitaId: "v1" }, usuario("Administrador"), AGORA, "r1").relatorio;
  dados.relatoriosEmitidos = [rel, { ...rel, id: "r2", empresaId: "e2", visitaId: "v9", numero: "PC-2026-0001" }];
  assert.deepEqual(filtrarEstadoPorUsuario(dados, usuario("Gerente")).relatoriosEmitidos.map((r) => r.id), ["r1"], "só da própria empresa");
  assert.deepEqual(filtrarEstadoPorUsuario(dados, usuario("Executor de campo")).relatoriosEmitidos, []);
  assert.deepEqual(filtrarEstadoPorUsuario(dados, usuario("Fiscal", { validoAte: "2099-01-01T00:00:00-03:00" })).relatoriosEmitidos.map((r) => r.id), ["r1"]);
});

test("Fotos em relatório emitido: marcadas, protegidas e fora da revisão da guarda (nada é apagado)", () => {
  const dados = base();
  const rel = emitir(dados, { visitaId: "v1" }, usuario("Administrador"), AGORA, "r1").relatorio;
  const ids = evidenciasEmRelatorioEmitido([rel]);
  assert.deepEqual([...ids], ["f1"]);
  // uma lista recebida sem a foto: o servidor a recoloca
  const restaurada = preservarEvidenciasEmRelatorio(dados.evidencias, [], [rel]);
  assert.deepEqual(restaurada.map((e) => e.id), ["f1"]);
  assert.deepEqual(preservarEvidenciasEmRelatorio(dados.evidencias, [], []), []);
  // guarda: a foto citada não entra na contagem para revisão
  const visitas = [{ id: "v1", status: "Concluída", encerradaEm: "2026-01-01T00:00:00Z" }];
  const comFoto = visitasComGuardaVencendo(visitas, dados.evidencias, 90, AGORA);
  assert.equal(comFoto.length, 1);
  const protegida = visitasComGuardaVencendo(visitas, dados.evidencias, 90, AGORA, 30, ids);
  assert.equal(protegida.length, 0, "só havia a foto citada: nada a revisar");
  const duas = [...dados.evidencias, { ...dados.evidencias[0], id: "f2" }];
  const parcial = visitasComGuardaVencendo(visitas, duas, 90, AGORA, 30, ids);
  assert.equal(parcial[0].fotos, 1);
  assert.equal(parcial[0].fotosEmRelatorio, 1);
});

const relatorioFake = (id, emitidoEm, extra = {}) => ({ id, empresaId: "e1", visitaId: id, numero: `PC-2026-${id}`, ano: 2026, sequencia: 1, versao: 1, emitidoEm, assinatura: { nome: "Rita", cargo: "RT", crn: "CRN-2 1", crnPendente: false }, aviso: AVISO_SEM_ICP, instantaneo: { empresa: {}, visita: { data: "2026-10-10" }, conformidade: { conformes: 8, naoConformes: 2, respondidos: 10, percentual: 80 }, itens: [], ncs: [], evidencias: [{ id: `foto-${id}`, tipo: "Foto", ambiente: "Cozinha", descricao: "", criadoEm: emitidoEm, blobPathname: `evidencias/${id}/a.jpg` }] }, ...extra });

test("Dossiê: fotos desligadas por padrão, só a empresa ativa e só os últimos 12 meses", () => {
  assert.equal(opcoesPadraoDoDossie().fotos, false);
  for (const perfil of ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente", "Executor de campo", "Fiscal"]) {
    assert.equal(podeGerarDossie(usuario(perfil)), !["Executor de campo", "Fiscal"].includes(perfil), perfil);
  }
  const dados = {
    empresa: { id: "e1", nomeFantasia: "Padaria", razaoSocial: "Padaria Ltda", cnpj: "1", pops: [{ id: "p1", codigo: "POP-01", titulo: "Higiene", versao: "1.0", status: "Aprovado", aprovacao: { nome: "Carla", em: "2026-09-01T10:00:00Z" }, conteudo: { objetivo: "Manter limpo", frequencia: "Diária" } }, { id: "p2", titulo: "Rascunho", versao: "1.0", status: "Rascunho" }] },
    relatorios: [relatorioFake("a", "2026-10-01T10:00:00Z"), relatorioFake("b", "2025-01-01T10:00:00Z"), relatorioFake("c", "2026-09-01T10:00:00Z", { empresaId: "e2" })],
    registros: [{ id: "r1", empresaId: "e1", popId: "p1", popVersao: "1.0", dataHora: "2026-10-02T10:00:00Z", responsavel: "Ana", descricao: "Higienizei", criadoEm: "" }, { id: "r2", empresaId: "e2", popId: "p9", popVersao: "1.0", dataHora: "2026-10-02T10:00:00Z", responsavel: "Outra", descricao: "NÃO DEVE ENTRAR", criadoEm: "" }],
    comprovantes: [{ id: "c1", empresaId: "e1", tipo: "pragas", emissor: "Dedetiz", dataServico: "2026-01-01", validade: "2027-01-01", observacao: "", criadoEm: "" }, { id: "c2", empresaId: "e2", tipo: "outro", emissor: "ALHEIO", dataServico: "2026-01-01", validade: "2027-01-01", observacao: "", criadoEm: "" }],
    colaboradores: [{ id: "k1", empresaId: "e1", nome: "Maria Souza", cargo: "Cozinheira", ativo: true, criadoEm: "" }],
    capacitacoes: [{ id: "t1", empresaId: "e1", colaboradorId: "k1", conteudo: "BPF", cargaHoraria: 8, data: "2026-02-01", venceEm: "2027-02-01", criadoEm: "" }],
  };
  const padrao = montarDossie(dados, opcoesPadraoDoDossie(), "2026-10-20");
  assert.deepEqual(padrao.indice.map((i) => i.id), ["relatorios", "pops", "registros", "comprovantes", "capacitacao"]);
  assert.equal(padrao.comFotos, false);
  assert.ok(!JSON.stringify(padrao).includes("evidencias/"), "nenhum caminho de foto no dossiê padrão");
  assert.ok(padrao.secoes.every((s) => !s.fotos));
  const texto = JSON.stringify(padrao);
  for (const alheio of ["NÃO DEVE ENTRAR", "ALHEIO", "PC-2026-c"]) assert.ok(!texto.includes(alheio), alheio);
  assert.ok(!texto.includes("PC-2026-b"), "relatório de mais de 12 meses fica de fora");
  assert.ok(texto.includes("PC-2026-a") && texto.includes("Maria Souza") && texto.includes("Manter limpo"));
  assert.ok(!texto.includes("Rascunho"), "só POP aprovado");
  assert.equal(relatoriosDosUltimos12Meses(dados.relatorios, "2026-10-20").length, 2);

  const comFotos = montarDossie(dados, { ...opcoesPadraoDoDossie(), fotos: true }, "2026-10-20");
  assert.equal(comFotos.comFotos, true);
  assert.deepEqual(comFotos.secoes.find((s) => s.id === "fotos").fotos.map((f) => f.id), ["foto-a"]);
  const so = montarDossie(dados, { relatorios: false, pops: false, registros: false, comprovantes: true, capacitacao: false, fotos: false }, "2026-10-20");
  assert.deepEqual(so.indice.map((i) => i.id), ["comprovantes"]);
});

const visitaComRespostas = (id, data, ambiente, conformes, naoConformes) => ({ id, empresaId: "e1", data, checklist: [...Array.from({ length: conformes }, (_, i) => ({ id: `${id}c${i}`, ambiente, status: "Conforme" })), ...Array.from({ length: naoConformes }, (_, i) => ({ id: `${id}n${i}`, ambiente, status: "Não Conforme" }))] });

test("Evolução: conformidade por mês e por ambiente, com comparação só quando há dados suficientes", () => {
  assert.equal(somarMesesAoMes("2026-01", -1), "2025-12");
  const visitas = [visitaComRespostas("a", "2026-08-10", "Cozinha", 6, 4), visitaComRespostas("b", "2026-09-10", "Cozinha", 8, 2), visitaComRespostas("c", "2026-10-10", "Cozinha", 9, 1), visitaComRespostas("d", "2026-10-11", "Salão", 2, 1)];
  const e = evolucaoDaEmpresa({ visitas, ncs: [], hoje: "2026-10-20", periodo: 6 });
  assert.equal(e.serie.length, 6);
  assert.equal(e.serie[5].mes, "2026-10");
  assert.deepEqual(e.serie.filter((m) => m.percentual !== null).map((m) => [m.mes, m.percentual]), [["2026-08", 60], ["2026-09", 80], ["2026-10", 85]]);
  const cozinha = e.ambientes.find((a) => a.ambiente === "Cozinha");
  assert.equal(cozinha.percentual, 90);
  assert.equal(cozinha.variacao, 10, "90% contra 80% de setembro");
  assert.equal(cozinha.mesComparado, "2026-09");
  const salao = e.ambientes.find((a) => a.ambiente === "Salão");
  assert.equal(salao.suficiente, false);
  assert.equal(salao.variacao, null, "poucos dados: não compara");
  assert.equal(e.mensagemDeDados, null);
  assert.equal(evolucaoDaEmpresa({ visitas, ncs: [], hoje: "2026-10-20", periodo: 12 }).serie.length, 12);
  const uma = evolucaoDaEmpresa({ visitas: [visitas[0]], ncs: [], hoje: "2026-08-20", periodo: 6 });
  assert.equal(uma.mensagemDeDados, MENSAGEM_POUCOS_DADOS);
});

test("Evolução: reincidentes (3 visitas ou mais), tempo médio e resolvidas no mês, sem número inventado", () => {
  const nc = (id, visitaId, extra = {}) => ({ id, empresaId: "e1", visitaId, ambiente: "Cozinha", categoria: "Piso", titulo: "Piso com rachaduras", status: "Aberta", criadoEm: "2026-10-01T10:00:00Z", ...extra });
  const ncs = [nc("1", "v1"), nc("2", "v2"), nc("3", "v3"), nc("4", "v1", { titulo: "Outra", categoria: "Teto" }), nc("5", "v2", { titulo: "Outra", categoria: "Teto" }), nc("6", "v1", { ambiente: "Salão" }), nc("7", "v1", { inativaNoChecklist: true, titulo: "Inativa" })];
  const r = reincidentesDaEmpresa(ncs);
  assert.equal(r.length, 1);
  assert.deepEqual([r[0].titulo, r[0].ambiente, r[0].visitas], ["Piso com rachaduras", "Cozinha", 3]);
  assert.equal(reincidentesDaEmpresa([nc("a", "v1"), nc("b", "v1"), nc("c", "v1")]).length, 0, "3 NCs na mesma visita não é reincidência");

  const resolvida = (id, criada, resolvida) => nc(id, "v1", { status: "Resolvida", criadoEm: `${criada}T10:00:00Z`, resolvidaEm: `${resolvida}T10:00:00Z`, titulo: `T${id}` });
  const poucas = evolucaoDaEmpresa({ visitas: [], ncs: [resolvida("1", "2026-10-01", "2026-10-05"), resolvida("2", "2026-10-01", "2026-10-07")], hoje: "2026-10-20", periodo: 6 });
  assert.equal(poucas.tempoMedioParaResolverDias, null, "só 2 resolvidas: sem média");
  assert.equal(poucas.resolvidasNoMes, 2);
  const tres = evolucaoDaEmpresa({ visitas: [], ncs: [resolvida("1", "2026-10-01", "2026-10-05"), resolvida("2", "2026-10-01", "2026-10-07"), resolvida("3", "2026-09-20", "2026-09-30")], hoje: "2026-10-20", periodo: 6 });
  assert.equal(tres.tempoMedioParaResolverDias, 6.7, "(4 + 6 + 10) ÷ 3");
  assert.equal(tres.resolvidasNoMes, 2);
});

test("Capacidade e turnos: validação na hora, só números inteiros, nada vira regra automática", () => {
  assert.deepEqual(validarCapacidade(CAPACIDADE_VAZIA), {});
  assert.deepEqual(Object.keys(validarCapacidade({ ...CAPACIDADE_VAZIA, refeicoesPorDia: "0", funcionarios: "abc", turnos: "9" })).sort(), ["funcionarios", "refeicoesPorDia", "turnos"]);
  assert.equal(capacidadeDoFormulario({ ...CAPACIDADE_VAZIA, turnos: "9" }), undefined, "inválido não grava");
  assert.equal(capacidadeDoFormulario(CAPACIDADE_VAZIA), undefined);
  const ok = capacidadeDoFormulario({ refeicoesPorDia: "300", funcionarios: "12", turnos: "2", tipoDeServico: " Restaurante ", vigilanciaDeReferencia: "" });
  assert.deepEqual(ok, { refeicoesPorDia: 300, funcionarios: 12, turnos: 2, tipoDeServico: "Restaurante" });
  assert.deepEqual(capacidadeParaFormulario(ok), { refeicoesPorDia: "300", funcionarios: "12", turnos: "2", tipoDeServico: "Restaurante", vigilanciaDeReferencia: "" });
  const lib = readFileSync(new URL("../lib/capacidadeEmpresa.ts", import.meta.url), "utf8");
  assert.ok(lib.includes("Usado para dimensionar o plano e sugerir a frequência das visitas. Não é critério de norma."));
});
