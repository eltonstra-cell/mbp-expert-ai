import assert from "node:assert/strict";
import test from "node:test";

import { AVISO_SECAO_VAZIA, TEXTO_SECAO_VAZIA, compararItensDeNorma, folhaDoPop, referenciasCompactas } from "../lib/popDocumento.ts";

const ref = (norma, item) => ({ norma, item, orientacao: "x" });
const SES = "Portaria SES 799/2023 (RS)";
const pop = (conteudo, extra = {}) => ({ codigo: "POP-01", titulo: "Higienização", versao: "1.1", status: "Rascunho", conteudo, ...extra });

test("referências: itens da RDC em ordem numérica e Portaria agrupada por anexo, sem a menção solta", () => {
  const linhas = referenciasCompactas([
    ref("RDC 216/2004", "4.11.2"), ref("RDC 216/2004", "4.11.4"), ref("RDC 216/2004", "4.11.5"), ref("RDC 216/2004", "4.11.3"),
    ref(SES, "Anexo II (item a conferir)"), ref(SES, "Anexo II, 13.7 (a–d)"), ref(SES, "Anexo I, 13.2"), ref(SES, "Anexo II, 13.2"), ref(SES, "Anexo II"),
  ]);
  assert.deepEqual(linhas, [
    "RDC 216/2004 (4.11.2; 4.11.3; 4.11.4; 4.11.5) · conferir",
    `${SES} (Anexo I: 13.2 · Anexo II: 13.2, 13.7 (a–d)) · conferir`,
  ]);
  assert.ok(linhas.length <= 2 && linhas.every((linha) => linha.endsWith("· conferir")));
});

test("referências: anexo sem detalhe é mantido quando é tudo o que existe; ordem natural (4.11.10 depois de 4.11.9)", () => {
  assert.deepEqual(referenciasCompactas([ref(SES, "Anexo II (item a conferir)")]), [`${SES} (Anexo II) · conferir`]);
  assert.ok(compararItensDeNorma("4.11.9", "4.11.10") < 0);
  assert.ok(compararItensDeNorma("13.2", "13.7 (a–d)") < 0);
  assert.equal(compararItensDeNorma("4.11.2", "4.11.2"), 0);
});

test("folha: toda seção sem texto mostra 'Não preenchida'; Registro e Detalhes opcionais não aparecem vazios", () => {
  const folha = folhaDoPop(pop({}), { nome: "Padaria" });
  const titulos = folha.blocos.map((bloco) => bloco.titulo);
  assert.deepEqual(titulos, ["Objetivo", "Responsável e frequência", "Passos", "Ação corretiva"]);
  assert.ok(folha.blocos.every((bloco) => bloco.vazia && bloco.linhas[0] === TEXTO_SECAO_VAZIA));
  const preenchido = folhaDoPop(pop({ objetivo: "Limpar", passos: [{ id: "1", texto: "a" }], acaoCorretiva: "Repetir", frequencia: "diária", responsavelExecucao: { nome: "A", cargo: "B" } }), {});
  assert.ok(preenchido.blocos.every((bloco) => !bloco.vazia));
  const passosVazios = folhaDoPop(pop({ passos: [{ id: "1", texto: " " }] }), {});
  assert.equal(passosVazios.blocos.find((bloco) => bloco.titulo === "Passos").vazia, true);
});

test("folha: aviso 'Seção vazia' em Ação corretiva só com a SES 799/2023 ativa", () => {
  const vazia = pop({ objetivo: "x" });
  const com = folhaDoPop(vazia, {}, { exigeAcaoCorretiva: true }).blocos.find((bloco) => bloco.titulo === "Ação corretiva");
  assert.equal(com.aviso, AVISO_SECAO_VAZIA);
  const sem = folhaDoPop(vazia, {}, { exigeAcaoCorretiva: false }).blocos.find((bloco) => bloco.titulo === "Ação corretiva");
  assert.equal(sem.aviso, undefined);
  const preenchida = folhaDoPop(pop({ acaoCorretiva: "Repetir" }), {}, { exigeAcaoCorretiva: true }).blocos.find((bloco) => bloco.titulo === "Ação corretiva");
  assert.equal(preenchida.aviso, undefined);
  const objetivo = folhaDoPop(vazia, {}, { exigeAcaoCorretiva: true }).blocos.find((bloco) => bloco.titulo === "Objetivo");
  assert.equal(objetivo.aviso, undefined, "Objetivo e Aplicação: sem aviso");
});

test("folha: responsável vem do usuário vinculado e a razão social sai em formato de título", () => {
  const aprovacao = { nome: "Élton Volmir Strapazon", cargo: "", usuarioId: "u1", em: "2026-10-21T15:00:00.000Z" };
  const responsavel = { nome: "Elton", cargo: "Nutricionista RT", usuarioId: "u1" };
  const aprovado = pop({ frequencia: "diária" }, { status: "Aprovado", aprovacao });
  const folha = folhaDoPop(aprovado, { nome: "44.150.273 ELTON VOLMIR STRAPAZON", cnpj: "44150273000198" }, { responsavel });
  assert.equal(folha.situacao, "Aprovada por Elton, Nutricionista RT, em 21/10/2026");
  assert.equal(folha.blocos.find((bloco) => bloco.titulo === "Responsável e frequência").linhas[0], "Elton, Nutricionista RT · diária");
  assert.equal(folha.esquerda, "Elton Volmir Strapazon · CNPJ 44150273000198");
  // aprovação por outra pessoa mantém o que foi gravado
  const outra = folhaDoPop({ ...aprovado, aprovacao: { ...aprovacao, usuarioId: "u2" } }, {}, { responsavel });
  assert.equal(outra.situacao, "Aprovada por Élton Volmir Strapazon, em 21/10/2026");
  assert.equal(folhaDoPop(pop({}), { nome: "PADARIA DO JOSE ME" }).esquerda, "Padaria do Jose ME");
});
