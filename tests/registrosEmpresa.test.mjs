import assert from "node:assert/strict";
import test from "node:test";

import { filtrarEstadoPorUsuario, mesclarEstadoPorUsuario, mesclarRegistrosPop } from "../lib/stateAccess.ts";
import { empresaDoCaminhoDeComprovante, validarArquivoComprovante } from "../lib/comprovanteUpload.ts";
import {
  comprovantesVigentes,
  contarPorValidade,
  criarRegistroPop,
  guardaDosRegistros,
  pendenciasDaEmpresa,
  podeCriarRegistroPop,
  podeGerenciarComprovantes,
  podeVerComprovantes,
  podeVerRegistrosPop,
  separarRegistros,
  situacaoDaValidade,
  somarMeses,
  sugerirValidade,
  validarComprovante,
} from "../lib/registrosEmpresa.ts";

const usuario = (perfil, extra = {}) => ({ id: `u-${perfil}`, perfil, status: "Ativo", empresaIds: ["e1"], nome: perfil, email: `${perfil.replace(/\W/g, "")}@x.com`, ...extra });
const PERFIS = ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente", "Executor de campo", "Fiscal"];

test("Perfis: Executor registra mas não vê comprovantes; Fiscal só lê; gestão cria comprovante", () => {
  const por = (fn) => Object.fromEntries(PERFIS.map((perfil) => [perfil, fn(usuario(perfil))]));
  assert.deepEqual(por(podeCriarRegistroPop), { Administrador: true, "Consultor/RT": true, "Cliente Gestor": true, Gerente: true, "Executor de campo": true, Fiscal: false });
  assert.equal(podeVerRegistrosPop(usuario("Fiscal")), true);
  assert.deepEqual(por(podeGerenciarComprovantes), { Administrador: true, "Consultor/RT": true, "Cliente Gestor": true, Gerente: true, "Executor de campo": false, Fiscal: false });
  assert.deepEqual(por(podeVerComprovantes), { Administrador: true, "Consultor/RT": true, "Cliente Gestor": true, Gerente: true, "Executor de campo": false, Fiscal: true });
  assert.equal(podeCriarRegistroPop(usuario("Gerente", { status: "Suspenso" })), false);
  assert.equal(podeVerComprovantes(usuario("Fiscal", { validoAte: "2020-01-01T00:00:00-03:00" })), false);
});

test("Validade: bordas de hoje, 30 dias e dia seguinte", () => {
  const hoje = "2026-10-20";
  assert.equal(situacaoDaValidade("2026-10-19", hoje), "vencido");
  assert.equal(situacaoDaValidade("2026-10-20", hoje), "vence-em-breve", "vence hoje ainda vale");
  assert.equal(situacaoDaValidade("2026-11-19", hoje), "vence-em-breve", "30 dias");
  assert.equal(situacaoDaValidade("2026-11-20", hoje), "em-dia", "31 dias");
  assert.equal(situacaoDaValidade("", hoje), "sem-validade");
  assert.deepEqual(contarPorValidade([{ validade: "2026-10-01" }, { validade: "2026-10-25" }, { validade: "2027-01-01" }, { validade: "2026-11-19" }], hoje), { vencidos: 1, venceEmBreve: 2, emDia: 1 });
});

test("Reservatório: validade sugerida em 6 meses, marcada conferir; outros tipos não sugerem", () => {
  assert.equal(somarMeses("2026-03-15", 6), "2026-09-15");
  assert.equal(somarMeses("2026-08-31", 6), "2027-02-28");
  assert.equal(somarMeses("2027-08-31", 6), "2028-02-29");
  assert.equal(somarMeses("2026-10-20", 6), "2027-04-20");
  const sugestao = sugerirValidade("reservatorio", "2026-10-20");
  assert.equal(sugestao.validade, "2027-04-20");
  assert.equal(sugestao.conferir, false);
  assert.ok(sugestao.texto.includes("Confira no certificado"));
  assert.ok(sugestao.fonte.includes("4.4.4"));
  for (const tipo of ["pragas", "contrato-rt", "outro"]) assert.equal(sugerirValidade(tipo, "2026-10-20"), null);
  assert.equal(sugerirValidade("reservatorio", ""), null);
});

test("Comprovante: campos obrigatórios e validade depois do serviço", () => {
  assert.deepEqual(Object.keys(validarComprovante({ emissor: "", dataServico: "", validade: "" })).sort(), ["dataServico", "emissor", "validade"]);
  assert.equal(validarComprovante({ emissor: "Dedetiz", dataServico: "2026-10-20", validade: "2026-10-19" }).validade, "A validade não pode ser antes da data do serviço.");
  assert.deepEqual(validarComprovante({ emissor: "Dedetiz", dataServico: "2026-10-20", validade: "2027-04-20" }), {});
});

test("Guarda: RS usa 90 dias da SES (conferir); outra UF usa o prazo do RT, com sugestão e aviso; nada é apagado", () => {
  const rs = guardaDosRegistros({ normasAplicadas: ["rdc-216-2004", "ses-799-2023-rs"] });
  assert.equal(rs.dias, 90);
  assert.equal(rs.origem, "norma");
  assert.ok(rs.citacao.includes("Anexo I, 13.2"));
  assert.equal(rs.conferir, false);
  assert.ok(rs.aviso.includes("Confira no texto oficial"));

  const sem = guardaDosRegistros({ normasAplicadas: ["rdc-216-2004"] });
  assert.equal(sem.dias, null);
  assert.equal(sem.origem, "sugestao");
  assert.equal(sem.sugestaoDias, 30);
  assert.ok(sem.aviso.includes("Defina o prazo"));

  const rt = guardaDosRegistros({ normasAplicadas: ["rdc-216-2004"], guardaRegistrosDias: 45 });
  assert.equal(rt.dias, 45);
  assert.equal(rt.origem, "rt");
  assert.ok(rt.aviso.includes("Vigilância Sanitária"));

  const agora = new Date("2026-10-20T12:00:00Z");
  const registro = (id, dias) => ({ id, popId: "p1", dataHora: new Date(agora.getTime() - dias * 86400000).toISOString() });
  const todos = [registro("a", 1), registro("b", 89), registro("c", 91), registro("d", 400), { ...registro("x", 1), popId: "outro" }];
  const { recentes, revisar } = separarRegistros(todos, "p1", 90, agora);
  assert.deepEqual(recentes.map((r) => r.id), ["a", "b"]);
  assert.deepEqual(revisar.map((r) => r.id), ["c", "d"]);
  assert.equal(recentes.length + revisar.length, 4, "nenhum registro some");
  assert.deepEqual(separarRegistros(todos, "p1", null, agora).revisar, []);
});

test("Registro por POP: valida, não aceita futuro e a correção cita o anterior", () => {
  const agora = new Date("2026-10-20T12:00:00Z");
  const base = { id: "r1", empresaId: "e1", popId: "p1", popVersao: "1.0", dataHora: "2026-10-20T11:00:00Z", responsavel: "Ana", descricao: "Higienizei a bancada" };
  assert.equal(criarRegistroPop({ ...base, descricao: " " }, agora).ok, false);
  assert.equal(criarRegistroPop({ ...base, responsavel: "" }, agora).ok, false);
  assert.equal(criarRegistroPop({ ...base, dataHora: "2026-10-21T11:00:00Z" }, agora).ok, false);
  assert.equal(criarRegistroPop({ ...base, dataHora: "lixo" }, agora).ok, false);
  const ok = criarRegistroPop({ ...base, corrigeRegistroId: "r0", ambiente: "Cozinha" }, agora);
  assert.equal(ok.ok, true);
  assert.equal(ok.registro.corrigeRegistroId, "r0");
  assert.equal(ok.registro.popVersao, "1.0");
  assert.equal(ok.registro.criadoEm, agora.toISOString());
});

test("Pendências: vencido e a vencer em 30 dias entram; o comprovante renovado tira o antigo", () => {
  const hoje = "2026-10-20";
  const c = (id, validade, extra = {}) => ({ id, empresaId: "e1", tipo: "pragas", emissor: `Emissor ${id}`, dataServico: "2026-01-01", validade, observacao: "", criadoEm: "", ...extra });
  const lista = [c("a", "2026-10-01"), c("b", "2026-11-10"), c("c", "2027-06-01"), c("d", "2026-09-01"), c("e", "2027-09-01", { renovaId: "d" }), { ...c("z", "2026-10-01"), empresaId: "e2" }];
  assert.deepEqual(comprovantesVigentes(lista).map((i) => i.id).sort(), ["a", "b", "c", "e", "z"]);
  const pendencias = pendenciasDaEmpresa("e1", { comprovantes: lista }, hoje);
  assert.deepEqual(pendencias.map((p) => [p.id, p.situacao]), [["a", "vencido"], ["b", "vence-em-breve"]]);
  assert.ok(pendencias[0].dias < 0);
});

const estado = () => ({
  empresas: {
    e1: { id: "e1", pops: [{ id: "p1", status: "Aprovado", versao: "1.0", titulo: "POP" }] },
    e2: { id: "e2", pops: [{ id: "p9", status: "Aprovado", versao: "1.0", titulo: "POP" }] },
  },
  empresaAtualId: "e1",
  visitas: [],
  ncs: [],
  evidencias: [],
  usuarios: [],
  registrosAuditoria: [],
  registrosPop: [
    { id: "r1", empresaId: "e1", popId: "p1", popVersao: "1.0", dataHora: "2026-10-01T10:00:00Z", responsavel: "Ana", descricao: "Original", criadoEm: "" },
    { id: "r2", empresaId: "e2", popId: "p9", popVersao: "1.0", dataHora: "2026-10-01T10:00:00Z", responsavel: "Outra", descricao: "De outra empresa", criadoEm: "" },
  ],
  comprovantes: [
    { id: "c1", empresaId: "e1", tipo: "pragas", emissor: "Dedetiz", dataServico: "2026-01-01", validade: "2027-01-01", observacao: "", criadoEm: "" },
    { id: "c2", empresaId: "e2", tipo: "pragas", emissor: "Outra", dataServico: "2026-01-01", validade: "2027-01-01", observacao: "", criadoEm: "" },
  ],
});

test("Servidor: o Executor recebe os registros e nunca os comprovantes; o Fiscal recebe os dois, só da própria empresa", () => {
  const executor = filtrarEstadoPorUsuario(estado(), usuario("Executor de campo"));
  assert.deepEqual(executor.registrosPop.map((r) => r.id), ["r1"]);
  assert.deepEqual(executor.comprovantes, []);
  const fiscal = filtrarEstadoPorUsuario(estado(), usuario("Fiscal", { validoAte: "2099-01-01T00:00:00-03:00" }));
  assert.deepEqual(fiscal.registrosPop.map((r) => r.id), ["r1"]);
  assert.deepEqual(fiscal.comprovantes.map((c) => c.id), ["c1"]);
  const gerente = filtrarEstadoPorUsuario(estado(), usuario("Gerente"));
  assert.deepEqual(gerente.comprovantes.map((c) => c.id), ["c1"]);
});

test("Servidor: Executor registra (com o responsável do servidor) mas não grava comprovante; registro antigo não muda nem some", () => {
  const atual = estado();
  const recebido = estado();
  const executor = usuario("Executor de campo");
  recebido.registrosPop = [
    { ...atual.registrosPop[0], descricao: "ADULTERADO" },
    { id: "r3", empresaId: "e1", popId: "p1", popVersao: "1.0", dataHora: "2026-10-20T10:00:00Z", responsavel: "Ex", responsavelId: "falso", descricao: "Novo", criadoEm: "" },
    { id: "r4", empresaId: "e2", popId: "p9", popVersao: "1.0", dataHora: "2026-10-20T10:00:00Z", responsavel: "Ex", descricao: "Empresa alheia", criadoEm: "" },
    { id: "r5", empresaId: "e1", popId: "nao-existe", popVersao: "1.0", dataHora: "2026-10-20T10:00:00Z", responsavel: "Ex", descricao: "POP inexistente", criadoEm: "" },
  ];
  recebido.comprovantes = [{ ...atual.comprovantes[0], emissor: "Forjado" }, { id: "c9", empresaId: "e1", tipo: "outro", emissor: "Novo", dataServico: "2026-10-01", validade: "2027-10-01", observacao: "", criadoEm: "" }];
  const novo = mesclarEstadoPorUsuario(atual, recebido, executor, "auth-x");
  assert.deepEqual(novo.registrosPop.map((r) => r.id).sort(), ["r1", "r2", "r3"]);
  assert.equal(novo.registrosPop.find((r) => r.id === "r1").descricao, "Original");
  assert.equal(novo.registrosPop.find((r) => r.id === "r3").responsavelId, executor.id);
  assert.deepEqual(novo.comprovantes.map((c) => c.id).sort(), ["c1", "c2"]);
  assert.equal(novo.comprovantes.find((c) => c.id === "c1").emissor, "Dedetiz");
});

test("Servidor: Gerente cria e edita comprovante da própria empresa; o Fiscal não grava nada", () => {
  const atual = estado();
  const recebido = estado();
  recebido.comprovantes = [{ ...atual.comprovantes[0], emissor: "Dedetiz Nova" }, { id: "c9", empresaId: "e1", tipo: "reservatorio", emissor: "Limpa Caixa", dataServico: "2026-10-01", validade: "2027-04-01", observacao: "", criadoEm: "" }, { id: "c8", empresaId: "e2", tipo: "outro", emissor: "Alheio", dataServico: "2026-10-01", validade: "2027-04-01", observacao: "", criadoEm: "" }];
  const gerente = usuario("Gerente");
  const novo = mesclarEstadoPorUsuario(atual, recebido, gerente, "auth-g");
  assert.deepEqual(novo.comprovantes.map((c) => c.id).sort(), ["c1", "c2", "c9"]);
  assert.equal(novo.comprovantes.find((c) => c.id === "c1").emissor, "Dedetiz Nova");
  assert.equal(novo.comprovantes.find((c) => c.id === "c9").criadoPorId, gerente.id);

  const fiscal = usuario("Fiscal", { validoAte: "2099-01-01T00:00:00-03:00" });
  const tentativa = mesclarEstadoPorUsuario(atual, { ...recebido, registrosPop: [...atual.registrosPop, { id: "r7", empresaId: "e1", popId: "p1", popVersao: "1.0", dataHora: "2026-10-20T10:00:00Z", responsavel: "F", descricao: "x", criadoEm: "" }] }, fiscal, "auth-f");
  assert.deepEqual(tentativa.comprovantes.map((c) => c.id).sort(), ["c1", "c2"]);
  assert.deepEqual(tentativa.registrosPop.map((r) => r.id).sort(), ["r1", "r2"]);
  // mesclarRegistrosPop sozinha: sem novidade devolve a mesma lista
  assert.equal(mesclarRegistrosPop(atual.registrosPop, [], atual.empresas, new Set(["e1"]), "u"), atual.registrosPop);
});

test("Arquivo do comprovante: PDF ou JPEG, até 8 MB, conferido pelos primeiros bytes; caminho só de comprovante", () => {
  const pdf = new TextEncoder().encode("%PDF-1.7\n");
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
  assert.deepEqual(validarArquivoComprovante("application/pdf", pdf, 1000), { ok: true, contentType: "application/pdf" });
  assert.deepEqual(validarArquivoComprovante("", jpeg, 1000), { ok: true, contentType: "image/jpeg" });
  assert.equal(validarArquivoComprovante("image/jpeg", pdf, 1000).ok, false);
  assert.equal(validarArquivoComprovante("application/pdf", new Uint8Array([1, 2, 3, 4, 5]), 1000).motivo, "ASSINATURA");
  assert.equal(validarArquivoComprovante("application/pdf", pdf, 0).motivo, "VAZIO");
  assert.equal(validarArquivoComprovante("application/pdf", pdf, 9 * 1024 * 1024).motivo, "GRANDE");
  assert.equal(empresaDoCaminhoDeComprovante("comprovantes/e1/abc-arquivo.pdf"), "e1");
  assert.equal(empresaDoCaminhoDeComprovante("evidencias/v1/abc.jpg"), null);
  assert.equal(empresaDoCaminhoDeComprovante("comprovantes/e1/../x/abc.pdf"), null);
});
