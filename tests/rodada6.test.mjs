import test from "node:test";
import assert from "node:assert/strict";
import { filtrarEstadoPorUsuario, mesclarEstadoPorUsuario } from "../lib/stateAccess.ts";
import { registroAtrasado } from "../lib/popGestao.ts";
import { sugestoesQueFaltam, fraseDoPreencher } from "../lib/manualIdentificacao.ts";

const HOJE = "2026-10-31";
const aprovacao = { nome: "Maria Aprovadora", cargo: "Nutricionista", usuarioId: "u-maria", em: "2026-01-01T10:00:00.000Z", versao: "1.0", hashDoConteudo: "abc" };
const diaria = { frequencia: "diária", passos: [] };

// ---------- I3: registro atrasado por situação do POP ----------
test("I3: rascunho nunca atrasa; vigente atrasado aparece; Em revisão com versão aprovada vigente continua contando", () => {
  const aprovado = { id: "p1", codigo: "POP-01", titulo: "Higienização", status: "Aprovado", versao: "1.0", conteudo: diaria, aprovacao, versoes: [{ versao: "1.0", status: "Aprovado", conteudo: diaria, aprovacao }] };
  assert.equal(registroAtrasado(aprovado, [], HOJE), true, "vigente atrasado");
  const rascunho = { ...aprovado, status: "Rascunho", aprovacao: undefined, versoes: [] };
  assert.equal(registroAtrasado(rascunho, [], HOJE), false, "rascunho sem versão aprovada");
  assert.equal(registroAtrasado({ ...aprovado, status: "Rascunho" }, [], HOJE), false, "rascunho nunca, mesmo com versão aprovada antiga");
  assert.equal(registroAtrasado({ ...aprovado, status: "Em revisão" }, [], HOJE), true, "em revisão com versão aprovada em uso");
  assert.equal(registroAtrasado({ ...aprovado, status: "Em revisão", versoes: [] }, [], HOJE), false, "em revisão sem versão aprovada");
});

// ---------- I1: Executor não recebe nem apaga nomes de visitas e evidências ----------
const visita = { id: "v1", empresaId: "e1", responsavel: "Vera Visitante", responsavelIdentificacao: "Vera Visitante", status: "Em andamento", checklist: [], progresso: 0, historicoStatus: [{ id: "h1", criadoEm: "2026-10-01T10:00:00.000Z", de: "Em andamento", para: "Concluída", motivo: "x", responsavel: "Hugo Historiador" }] };
const evidencia = { id: "ev1", empresaId: "e1", visitaId: "v1", tipo: "foto", ambiente: "Cozinha", descricao: "d", criadoEm: "2026-10-01T10:00:00.000Z", registradoPorNome: "Fátima Fotógrafa", registradoPorId: "u-fatima" };
const base = { empresas: { e1: { id: "e1", nome: "Beyond Nutri", pops: [] } }, empresaAtualId: "e1", visitas: [visita], ncs: [], evidencias: [evidencia], usuarios: [], registrosAuditoria: [], colaboradores: [], capacitacoes: [], leiturasPop: [], registrosPop: [], comprovantes: [], relatoriosEmitidos: [] };
const quem = (perfil) => ({ id: `u-${perfil}`, nome: perfil, email: `${perfil}@x.com`, perfil, status: "Ativo", empresaIds: ["e1"], permissoes: [], criadoEm: "2026-01-01T00:00:00.000Z" });
const NOMES = ["Vera Visitante", "Hugo Historiador", "Fátima Fotógrafa"];

test("I1 (a): a resposta ao Executor não contém os nomes de visitas e evidências", () => {
  const json = JSON.stringify(filtrarEstadoPorUsuario(base, quem("Executor de campo")));
  for (const nome of NOMES) assert.ok(!json.includes(nome), nome);
});

test("I1 (b): o Executor salva sem apagar os nomes gravados", () => {
  const executor = quem("Executor de campo");
  const visao = filtrarEstadoPorUsuario(base, executor);
  visao.visitas[0].checklist = [];
  const gravado = mesclarEstadoPorUsuario(base, visao, executor, "auth-1");
  const json = JSON.stringify(gravado);
  for (const nome of NOMES) assert.ok(json.includes(nome), nome);
  assert.equal(gravado.visitas[0].responsavel, "Vera Visitante");
  assert.equal(gravado.evidencias[0].registradoPorNome, "Fátima Fotógrafa");
});

test("I1 (c): Consultor/RT e Cliente Gestor continuam recebendo os nomes", () => {
  for (const perfil of ["Consultor/RT", "Cliente Gestor"]) {
    const json = JSON.stringify(filtrarEstadoPorUsuario(base, quem(perfil)));
    for (const nome of NOMES) assert.ok(json.includes(nome), `${perfil}: ${nome}`);
  }
});

// ---------- F: Manual ----------
test("F: frase do Preencher em uma linha e sugestões que já estão no campo somem", () => {
  assert.equal(fraseDoPreencher(3, 2), "3 campos preenchidos. Faltam 2, preencha abaixo.");
  assert.deepEqual(sugestoesQueFaltam(["Restaurante", "Lanchonete"], "restaurante, bar"), ["Lanchonete"]);
  assert.deepEqual(sugestoesQueFaltam(["Restaurante"], "Restaurante"), []);
});
