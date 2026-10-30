import assert from "node:assert/strict";
import test from "node:test";
import { jsonEstavel, sha256Hex } from "../lib/sha256.ts";
import { conteudoComFrequencia, diasDaFrequenciaDoPop, frequenciaDoPop, tipoReconhecidoNoTexto } from "../lib/popFrequencia.ts";
import { diasDaFrequencia, registroAtrasado, detalheDaLinha } from "../lib/popGestao.ts";
import { ETAPAS_DO_POP, etapaDoPop, linhaDeEtapas, textoDaEtapa, verificacoesDeAprovacao } from "../lib/popCiclo.ts";
import { aprovarPop, enviarParaAprovacao, hashDoConteudoDoPop, iniciarNovaVersao, mesclarVersoesGuardadas, validarAprovacoesDePop } from "../lib/popsNorma.ts";
import { arquivarPop, duplicarPop } from "../lib/pops.ts";
import { inativarPop, podeInativarPop, reativarPop } from "../lib/popInativo.ts";
import { unirAuditoriaSemApagar } from "../lib/auditoriaNaoApagavel.ts";
import { diasDeGuardaParaExclusao, registroEmGuarda, restaurarRegistrosEmGuarda } from "../lib/guardaDeRegistros.ts";
import { cienciaPorFuncao, equipeDaCiencia, novaCiencia } from "../lib/cienciaPop.ts";

const AGORA = "2026-10-20T12:00:00.000Z";
const resp = { id: "u-resp", nome: "Carla Dona", status: "Ativo" };
const empresa = { id: "e1", uf: "RS", normasAplicadas: [], pops: [], responsavelEstabelecimento: { nome: "Carla Dona", cargo: "Proprietária", usuarioId: "u-resp" } };
const pop = (extra = {}) => ({
  id: "p1", codigo: "POP-07", titulo: "Lavagem", versao: "1.0", status: "Rascunho", programaRelacionado: "", responsavel: "", proximaRevisao: "",
  conteudo: { passos: [{ id: "a", texto: "Lavar as mãos" }], frequencia: "Diária", responsavelExecucao: { nome: "Carla Dona", cargo: "Proprietária" } },
  ...extra,
});

test("SHA-256: vetores conhecidos e JSON estável", () => {
  assert.equal(sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(sha256Hex("a".repeat(1000)), "41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3");
  assert.equal(jsonEstavel({ b: 1, a: [2, { d: 1, c: undefined }] }), '{"a":[2,{"d":1}],"b":1}');
});

test("B1: frequência estruturada; texto antigo só vira diária/semanal/mensal quando reconhecido por inteiro", () => {
  assert.equal(tipoReconhecidoNoTexto("Diária"), "diaria");
  assert.equal(tipoReconhecidoNoTexto("todos os dias."), "diaria");
  assert.equal(tipoReconhecidoNoTexto("Semanal"), "semanal");
  assert.equal(tipoReconhecidoNoTexto("quinzenal"), null);
  assert.deepEqual(frequenciaDoPop({ frequencia: "mensal" }), { tipo: "mensal" });
  assert.deepEqual(frequenciaDoPop({ frequencia: "A cada turno" }), { tipo: "outra", texto: "A cada turno" }, "não reconhecido: outra com o texto original");
  assert.equal(frequenciaDoPop({ frequencia: "  " }), null);
  assert.equal(frequenciaDoPop({}), null);
  const gravado = conteudoComFrequencia({ frequencia: "" }, { tipo: "semanal" });
  assert.deepEqual(gravado, { frequenciaEstruturada: { tipo: "semanal" }, frequencia: "Semanal" }, "o texto legível acompanha (regras antigas seguem lendo)");
  const outra = conteudoComFrequencia({ frequencia: "x" }, { tipo: "outra", texto: "cada turno " });
  assert.equal(outra.frequencia, "cada turno");
  assert.equal(outra.frequenciaEstruturada.texto, "cada turno ", "o texto digitado não é aparado a cada tecla");
  assert.equal(conteudoComFrequencia({ frequencia: "x", frequenciaEstruturada: { tipo: "outra", texto: "x" } }, null).frequenciaEstruturada, undefined);
});

test("B1: o atraso usa o campo estruturado; 'outra' só conta com periodicidade conhecida", () => {
  assert.equal(diasDaFrequenciaDoPop({ frequenciaEstruturada: { tipo: "diaria" } }, diasDaFrequencia), 1);
  assert.equal(diasDaFrequenciaDoPop({ frequenciaEstruturada: { tipo: "semanal" } }, diasDaFrequencia), 7);
  assert.equal(diasDaFrequenciaDoPop({ frequenciaEstruturada: { tipo: "mensal" } }, diasDaFrequencia), 30);
  assert.equal(diasDaFrequenciaDoPop({ frequenciaEstruturada: { tipo: "outra", texto: "quinzenal" } }, diasDaFrequencia), 15);
  assert.equal(diasDaFrequenciaDoPop({ frequenciaEstruturada: { tipo: "outra", texto: "a cada turno" } }, diasDaFrequencia), null);
  assert.equal(diasDaFrequenciaDoPop({ frequencia: "diária" }, diasDaFrequencia), 1, "POP antigo, só texto");
  const vigente = pop({ status: "Aprovado", aprovacao: { nome: "C", cargo: "D", usuarioId: "u", em: "2026-10-01T12:00:00.000Z", versao: "1.0" }, conteudo: { frequenciaEstruturada: { tipo: "semanal" }, frequencia: "texto que o atraso não lê" } });
  assert.equal(registroAtrasado(vigente, [], "2026-10-20"), true);
  assert.equal(registroAtrasado(vigente, [], "2026-10-05"), false);
});

test("A1/A3: etapa derivada do estado, sem estado novo gravado", () => {
  assert.deepEqual(ETAPAS_DO_POP, ["Criar", "Conferir", "Aprovar", "Equipe", "Registros", "Revisar"]);
  const e = (p, c) => etapaDoPop(p, { hoje: "2026-10-20", ...c })?.numero;
  assert.equal(e(pop({ conteudo: {} })), 1, "sem passos: Criar");
  assert.equal(e(pop({ origemModelo: { id: "comp-01", versaoCatalogo: 1 }, conferencia: { conferido: false } })), 2, "modelo não conferido: Conferir");
  assert.equal(e(pop({ conteudo: { passos: [{ id: "a", texto: "x" }] } })), 2, "falta frequência e responsável: Conferir");
  assert.equal(e(pop()), 3, "completo: Aprovar");
  assert.equal(e(pop({ status: "Aguardando aprovação" })), 3);
  const aprovado = pop({ status: "Aprovado", aprovacao: { nome: "C", cargo: "D", usuarioId: "u", em: AGORA, versao: "1.0" } });
  assert.equal(e(aprovado, { equipe: { total: 4, confirmadas: 2 } }), 4, "equipe incompleta: Equipe");
  assert.equal(e(aprovado, { equipe: { total: 4, confirmadas: 4 } }), 5);
  assert.equal(e(aprovado, { equipe: { total: 0, confirmadas: 0 } }), 5, "sem equipe cadastrada não trava em Equipe");
  assert.equal(e({ ...aprovado, proximaRevisao: "2026-01-01" }, { equipe: { total: 1, confirmadas: 1 } }), 6, "revisão vencida: Revisar");
  assert.equal(etapaDoPop(pop({ status: "Inativo" })), null);
  assert.equal(etapaDoPop(pop({ arquivado: true })), null);
  assert.equal(textoDaEtapa(etapaDoPop(pop(), { hoje: "2026-10-20" })), "Etapa 3 de 6 · Aprovar");
  assert.deepEqual(linhaDeEtapas({ numero: 3, nome: "Aprovar" }).map((x) => x.situacao), ["concluida", "concluida", "atual", "futura", "futura", "futura"]);
  assert.match(detalheDaLinha(pop(), undefined, undefined), /^Etapa 3 de 6 · Aprovar$/);
});

test("A5: quatro verificações da faixa 'Pronto para aprovar'", () => {
  const v = verificacoesDeAprovacao(pop({ origemModelo: { id: "x", versaoCatalogo: 1 }, conferencia: { conferido: true }, itensAConferir: [{ texto: "a", feito: true }, { texto: "b", feito: true }] }));
  assert.deepEqual(v.map((x) => x.id), ["passos", "responsavel", "frequencia", "conferidos"]);
  assert.ok(v.every((x) => x.ok));
  assert.equal(v[2].texto, "Frequência definida: diária");
  assert.equal(v[3].texto, "Itens conferidos (2 de 2)");
  assert.equal(verificacoesDeAprovacao(pop({ conteudo: {} })).filter((x) => !x.ok).length, 3);
});

test("B2/B3: aprovação grava hash; versão antiga vira Substituída; histórico não muda por gravação", () => {
  const v1 = aprovarPop(enviarParaAprovacao(pop()), resp, empresa, AGORA);
  assert.equal(v1.aprovacao.hashDoConteudo, hashDoConteudoDoPop(v1.conteudo));
  const rascunho2 = { ...iniciarNovaVersao(v1), conteudo: { ...v1.conteudo, passos: [{ id: "a", texto: "Lavar com sabão" }] } };
  const v2 = aprovarPop(enviarParaAprovacao(rascunho2), resp, empresa, "2026-11-01T12:00:00.000Z");
  const antiga = v2.versoes.find((v) => v.versao === "1.0");
  assert.equal(antiga.status, "Substituída");
  assert.equal(antiga.substituidaEm, "2026-11-01T12:00:00.000Z");
  assert.equal(v2.versoes.find((v) => v.versao === "1.1").status, "Aprovado");
  assert.notEqual(v2.aprovacao.hashDoConteudo, v1.aprovacao.hashDoConteudo);
  // Adulterar o texto de versão guardada pelo estado não vale; só Aprovada → Substituída é aceito.
  const adulterada = v2.versoes.map((v) => (v.versao === "1.0" ? { ...v, conteudo: { passos: [{ id: "x", texto: "outro" }] }, aprovacao: { ...v.aprovacao, nome: "Fulano" }, status: "Aprovado" } : v));
  const volta = mesclarVersoesGuardadas(v2.versoes, adulterada);
  const v10 = volta.find((v) => v.versao === "1.0");
  assert.equal(v10.aprovacao.nome, "Carla Dona");
  assert.equal(v10.conteudo.passos[0].texto, "Lavar as mãos");
  assert.equal(v10.status, "Substituída", "não volta atrás");
  assert.equal(mesclarVersoesGuardadas(v2.versoes, []).length, 2, "versão guardada que não veio, volta");
});

test("B2: o servidor recalcula o hash na aprovação e o Administrador não altera versões guardadas", () => {
  const aguardando = enviarParaAprovacao(pop());
  const aprovado = aprovarPop(aguardando, resp, empresa, AGORA);
  const forjado = { ...aprovado, aprovacao: { ...aprovado.aprovacao, hashDoConteudo: "forjado" }, versoes: aprovado.versoes.map((v) => ({ ...v, aprovacao: { ...v.aprovacao, hashDoConteudo: "forjado" } })) };
  const r = validarAprovacoesDePop({ e1: { ...empresa, pops: [aguardando] } }, { e1: { ...empresa, pops: [forjado] } }, resp, AGORA);
  assert.equal(r.empresas.e1.pops[0].aprovacao.hashDoConteudo, hashDoConteudoDoPop(aprovado.conteudo));
  assert.equal(r.empresas.e1.pops[0].versoes[0].aprovacao.hashDoConteudo, hashDoConteudoDoPop(aprovado.conteudo));
  assert.equal(r.registros.length, 1);
});

test("B2: a auditoria só cresce, mesmo quando o Administrador grava o estado inteiro", () => {
  const no = [{ id: "1", acao: "a" }, { id: "2", acao: "b" }];
  assert.deepEqual(unirAuditoriaSemApagar(no, []).map((x) => x.id), ["1", "2"]);
  assert.deepEqual(unirAuditoriaSemApagar(no, [{ id: "2", acao: "ALTERADO" }, { id: "3", acao: "c" }]).map((x) => `${x.id}:${x.acao}`), ["1:a", "2:b", "3:c"]);
  assert.equal(unirAuditoriaSemApagar(no, no), no);
  assert.deepEqual(unirAuditoriaSemApagar(undefined, [{ id: "9" }]).map((x) => x.id), ["9"]);
});

test("B3: arquivar exige motivo, autor e data; inativar e reativar", () => {
  const p = pop({ status: "Aprovado", aprovacao: { nome: "C", cargo: "D", usuarioId: "u", em: AGORA, versao: "1.0" } });
  assert.deepEqual(arquivarPop([p], "p1", true), [p]);
  assert.deepEqual(arquivarPop([p], "p1", true, { motivo: "  ", porNome: "A", em: AGORA }), [p]);
  const arq = arquivarPop([p], "p1", true, { motivo: " Duplicado ", porNome: "Ana", porId: "u1", em: AGORA })[0];
  assert.equal(arq.arquivado, true);
  assert.deepEqual(arq.arquivamento, { motivo: "Duplicado", porNome: "Ana", porId: "u1", em: AGORA });
  assert.equal(podeInativarPop(p), true);
  assert.equal(podeInativarPop(pop()), false, "rascunho nunca aprovado: arquiva-se");
  assert.throws(() => inativarPop(p, { motivo: "", porNome: "A", em: AGORA }), /motivo/);
  const inativo = inativarPop(p, { motivo: "Procedimento encerrado", porNome: "Ana", em: AGORA });
  assert.equal(inativo.status, "Inativo");
  assert.equal(inativo.aprovacao.nome, "C", "a assinatura fica guardada");
  assert.throws(() => reativarPop(p), /inativo/);
  const volta = reativarPop(inativo);
  assert.equal(volta.status, "Rascunho");
  assert.equal(volta.versao, "1.1");
  assert.equal(volta.inativacao, undefined);
  assert.equal(volta.versoes[0].status, "Aprovado", "a versão antiga continua guardada");
});

test("B4: a cópia nasce Rascunho sem aprovação nem versões; POP de modelo não se duplica", () => {
  const origem = pop({ status: "Aprovado", aprovacao: { nome: "C", cargo: "D", usuarioId: "u", em: AGORA, versao: "1.0" }, versoes: [{ versao: "1.0", status: "Aprovado", criadaEm: AGORA }], versaoCatalogoAprovada: { a: "1" }, proximaRevisao: "2027-01-01", motivoDaVersao: "x" });
  const lista = duplicarPop([origem], "p1", "p2");
  const copia = lista[1];
  assert.equal(copia.status, "Rascunho");
  for (const campo of ["aprovacao", "versoes", "versaoCatalogoAprovada", "motivoDaVersao", "arquivamento", "inativacao"]) assert.equal(copia[campo], undefined, campo);
  assert.equal(copia.proximaRevisao, "");
  assert.equal(copia.versao, "1.0");
  const deModelo = pop({ origemModelo: { id: "comp-01", versaoCatalogo: 1 } });
  assert.equal(duplicarPop([deModelo], "p1", "p2").length, 1, "dois POPs do mesmo modelo: bloqueado");
  assert.equal(duplicarPop([pop({ catalogoId: "pop-01" })], "p1", "p2").length, 1);
});

test("B5: guarda de registros: RS 90 dias, demais UF 30; excluídos em guarda voltam", () => {
  const rs = { normasAplicadas: ["rdc-216-2004", "ses-799-2023-rs"] };
  const sp = { normasAplicadas: ["rdc-216-2004"] };
  assert.equal(diasDeGuardaParaExclusao(rs), 90, "RS: a Portaria SES 799/2023 (90) é mais rígida que a RDC 216 (30)");
  assert.equal(diasDeGuardaParaExclusao(sp), 30);
  assert.equal(diasDeGuardaParaExclusao({ normasAplicadas: [] }), 30, "nunca menos que 30");
  assert.equal(diasDeGuardaParaExclusao({ normasAplicadas: ["rdc-216-2004"], guardaRegistrosDias: 45 }), 45, "o RT pode definir prazo maior");
  assert.equal(registroEmGuarda("2026-08-01T12:00:00.000Z", rs, "2026-10-20T12:00:00.000Z"), true, "80 dias no RS: em guarda");
  assert.equal(registroEmGuarda("2026-08-01T12:00:00.000Z", sp, "2026-10-20T12:00:00.000Z"), false, "80 dias em SP: fora da guarda");
  const antes = [{ id: "r1", empresaId: "e1", criadoEm: "2026-10-10T12:00:00.000Z" }, { id: "r2", empresaId: "e1", criadoEm: "2025-01-01T12:00:00.000Z" }];
  const depois = restaurarRegistrosEmGuarda(antes, [], () => rs, "2026-10-20T12:00:00.000Z");
  assert.deepEqual(depois.map((r) => r.id), ["r1"], "o recente volta; o antigo pode sair");
});

test("D: ciência por pessoa (só pessoa, versão, data e hora), uma por versão; relatório por função", () => {
  const aprovado = aprovarPop(enviarParaAprovacao(pop()), resp, empresa, AGORA);
  const dados = {
    empresas: { e1: { ...empresa, pops: [aprovado] } },
    colaboradores: [
      { id: "c1", empresaId: "e1", nome: "Ana", cargo: "Cozinha", ativo: true, criadoEm: AGORA },
      { id: "c2", empresaId: "e1", nome: "Bruna", cargo: "Salão", ativo: true, criadoEm: AGORA },
      { id: "c3", empresaId: "e1", nome: "Carlos", cargo: "Cozinha", ativo: true, criadoEm: AGORA },
      { id: "c4", empresaId: "e1", nome: "Inativo", cargo: "Cozinha", ativo: false, criadoEm: AGORA },
    ],
    leiturasPop: [],
  };
  const r = novaCiencia(dados, { empresaId: "e1", popId: "p1", colaboradorId: "c1" }, new Date("2026-10-21T15:30:00.000Z"), "id-1");
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.leitura).sort(), ["colaboradorId", "criadoEm", "data", "empresaId", "id", "popId", "popVersao", "viaPin"]);
  assert.equal(r.leitura.popVersao, "1.0");
  assert.equal(r.leitura.data, "2026-10-21");
  assert.equal(novaCiencia({ ...dados, leiturasPop: [r.leitura] }, { empresaId: "e1", popId: "p1", colaboradorId: "c1" }, new Date(), "x").status, 409);
  assert.equal(novaCiencia(dados, { empresaId: "e1", popId: "p1", colaboradorId: "c4" }, new Date(), "x").status, 404, "inativo");
  assert.equal(novaCiencia(dados, { empresaId: "e2", popId: "p1", colaboradorId: "c1" }, new Date(), "x").ok, false, "outra empresa");
  assert.equal(novaCiencia({ ...dados, empresas: { e1: { ...empresa, pops: [pop()] } } }, { empresaId: "e1", popId: "p1", colaboradorId: "c1" }, new Date(), "x").status, 409, "sem versão aprovada");
  const equipe = equipeDaCiencia("p1", "1.0", dados.colaboradores, [r.leitura]);
  assert.equal(`${equipe.confirmadas} de ${equipe.total}`, "1 de 3");
  assert.deepEqual(cienciaPorFuncao(equipe.linhas), [{ funcao: "Cozinha", total: 2, confirmadas: 1 }, { funcao: "Salão", total: 1, confirmadas: 0 }]);
});
