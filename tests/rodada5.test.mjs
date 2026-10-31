import test from "node:test";
import assert from "node:assert/strict";
import { filtrarEstadoPorUsuario, mesclarEstadoPorUsuario } from "../lib/stateAccess.ts";
import { separarItensInvalidos, validarLimitesDeTexto } from "../lib/limitesDoServidor.ts";
import { montarLinhaDoPop, registroAtrasado } from "../lib/popGestao.ts";
import { resumoDosRegistros } from "../lib/popRegistrosResumo.ts";
import { erroDoVencimento, validarCapacitacao } from "../lib/registrosEmpresa.ts";
import { fraseDoPreencher, mascaraCompletaParaAvancar, proximoCampoDaIdentificacao, sugestoesDeAtividade } from "../lib/manualIdentificacao.ts";
import { contagemDosProgramas } from "../lib/documentosCentral.ts";

const HOJE = "2026-10-31";
const aprovacao = { nome: "Maria Aprovadora", cargo: "Nutricionista", usuarioId: "u-maria", em: "2026-01-01T10:00:00.000Z", versao: "1.0", hashDoConteudo: "abc" };
const diaria = { frequencia: "diária", passos: [] };

// ---------- F2: registro atrasado só para POP aprovado ----------
test("F2: rascunho nunca fica com registro atrasado, mesmo com versão aprovada antiga guardada", () => {
  const aprovado = { id: "p1", codigo: "POP-01", titulo: "Higienização", status: "Aprovado", versao: "1.0", conteudo: diaria, aprovacao, versoes: [] };
  assert.equal(registroAtrasado(aprovado, [], HOJE), true, "aprovado há meses, diário, sem registro: atrasado");
  for (const status of ["Rascunho", "Aguardando aprovação", "Inativo"]) {
    const outro = { ...aprovado, status, versoes: [{ versao: "0.9", status: "Aprovado", conteudo: diaria, aprovacao }] };
    assert.equal(registroAtrasado(outro, [], HOJE), false, status);
  }
  const rascunho = { ...aprovado, status: "Rascunho", aprovacao: undefined, versoes: [] };
  assert.equal(registroAtrasado(rascunho, [], HOJE), false);
});

test("F2: a linha da lista de POPs não marca atraso em rascunho", () => {
  const rascunho = { id: "p2", codigo: "POP-01", titulo: "Higienização", status: "Rascunho", versao: "1.0", conteudo: diaria, aprovacao, versoes: [{ versao: "0.9", status: "Aprovado", conteudo: diaria, aprovacao }] };
  const linha = montarLinhaDoPop(rascunho, undefined, { empresa: { pops: [rascunho] }, registros: [], hoje: HOJE, podeAprovar: false });
  assert.equal(linha.registroAtrasado, false);
  assert.notEqual(linha.acao.tipo, "registro-atrasado");
});

test("F2: o 'Atrasado há N dias' do Resumo e dos Registros também some em rascunho", () => {
  assert.equal(resumoDosRegistros("p1", diaria, [], HOJE, aprovacao.em, false).proximo, null);
  assert.match(resumoDosRegistros("p1", diaria, [], HOJE, aprovacao.em, true).proximo.texto, /Atrasado há/);
});

// ---------- G1: Executor e Fiscal não recebem nomes ----------
const pop = {
  id: "p1", codigo: "POP-01", titulo: "Higienização", status: "Aprovado", versao: "1.0", responsavel: "Joana Responsável",
  conteudo: { responsavelExecucao: { nome: "Pedro Executor", cargo: "Cozinheiro" } }, aprovacao,
  versoes: [{ versao: "1.0", status: "Aprovado", conteudo: { responsavelExecucao: { nome: "Pedro Executor", cargo: "Cozinheiro" } }, aprovacao }],
  conferencia: { conferido: true, por: { nome: "Carlos Conferente", cargo: "RT" }, em: "2026-09-30T10:00:00.000Z" },
};
const empresa = {
  id: "e1", nome: "Beyond Nutri", pops: [pop], consultorNome: "Consuelo Consultora", consultorCpfCnpj: "529.982.247-25", consultorEndereco: "Rua A, 10", consultorTelefone: "(11) 98888-7777",
  elaboradoPor: "Elaine Elaboradora", revisadoPor: "Rui Revisor", aprovadoPor: "Ana Aprovadora",
  responsavelEstabelecimento: { nome: "Roberto Responsável", cargo: "Gerente", usuarioId: "u-rob" },
  cadastrosRevisados: { ambientes: { nome: "Rita Revisora", em: "2026-10-01T00:00:00.000Z", assinatura: "x" } },
};
const registroDeOutro = { id: "r1", empresaId: "e1", popId: "p1", popVersao: "1.0", dataHora: "2026-10-30T10:00:00.000Z", responsavel: "Otávio Outro", responsavelId: "u-outro", descricao: "feito", criadoEm: "2026-10-30T10:00:00.000Z" };
const registroProprio = { ...registroDeOutro, id: "r2", responsavel: "Fiscal", responsavelId: "u-Fiscal" };
const base = { empresas: { e1: empresa }, empresaAtualId: "e1", visitas: [], ncs: [], evidencias: [], usuarios: [], registrosAuditoria: [], colaboradores: [], capacitacoes: [], leiturasPop: [], registrosPop: [registroDeOutro, registroProprio], comprovantes: [] };
const quem = (perfil) => ({ id: `u-${perfil}`, nome: perfil, email: `${perfil}@x.com`, perfil, status: "Ativo", empresaIds: ["e1"], permissoes: [], criadoEm: "2026-01-01T00:00:00.000Z" });
const NOMES = ["Maria Aprovadora", "Carlos Conferente", "Joana Responsável", "Pedro Executor", "Consuelo Consultora", "Elaine Elaboradora", "Rui Revisor", "Ana Aprovadora", "Roberto Responsável", "Rita Revisora", "Otávio Outro", "u-maria", "u-rob", "529.982.247-25", "Rua A, 10", "(11) 98888-7777"];

test("G1: Executor de campo e Fiscal não recebem nenhum nome residual no payload (resposta da API)", () => {
  for (const perfil of ["Executor de campo", "Fiscal"]) {
    const json = JSON.stringify(filtrarEstadoPorUsuario(base, quem(perfil)));
    for (const nome of NOMES) assert.equal(json.includes(nome), false, `${perfil} recebeu ${nome}`);
    assert.equal(json.includes("Beyond Nutri"), true);
    assert.equal(json.includes("Higienização"), true, "o conteúdo do POP continua");
  }
});

test("G1: o registro feito pelo próprio usuário continua com o nome dele; o dos outros vira 'Responsável'", () => {
  const fiscal = filtrarEstadoPorUsuario(base, quem("Fiscal"));
  assert.equal(fiscal.registrosPop.find((item) => item.id === "r1").responsavel, "Responsável");
  assert.equal(fiscal.registrosPop.find((item) => item.id === "r2").responsavel, "Fiscal");
});

test("G1: gestão continua recebendo tudo", () => {
  for (const perfil of ["Consultor/RT", "Cliente Gestor", "Gerente"]) {
    const json = JSON.stringify(filtrarEstadoPorUsuario(base, quem(perfil)));
    for (const nome of ["Maria Aprovadora", "Consuelo Consultora", "Roberto Responsável"]) assert.equal(json.includes(nome), true, `${perfil} ${nome}`);
  }
});

test("G1: o merge nunca grava de volta a visão sem nomes (Executor com ajuste de tela que edita a empresa)", () => {
  const usuario = { ...quem("Executor de campo"), telas: { pops: "editar" } };
  const visao = filtrarEstadoPorUsuario(base, usuario);
  visao.empresas.e1 = { ...visao.empresas.e1, nome: "Beyond Nutri Ltda" };
  const gravado = mesclarEstadoPorUsuario(base, visao, usuario, "auth-1");
  const e = gravado.empresas.e1;
  assert.equal(e.nome, "Beyond Nutri Ltda");
  assert.equal(e.consultorNome, "Consuelo Consultora");
  assert.equal(e.elaboradoPor, "Elaine Elaboradora");
  assert.equal(e.responsavelEstabelecimento.nome, "Roberto Responsável");
  assert.equal(e.cadastrosRevisados.ambientes.nome, "Rita Revisora");
  assert.equal(e.pops[0].aprovacao.nome, "Maria Aprovadora");
  assert.equal(e.pops[0].responsavel, "Joana Responsável");
  assert.equal(gravado.registrosPop.find((item) => item.id === "r1").responsavel, "Otávio Outro");
});

// ---------- G2/G3: limites estendidos, item inválido não trava o resto ----------
const capacitacao = { id: "c1", empresaId: "e1", colaboradorId: "col1", conteudo: "Boas práticas", cargaHoraria: 8, data: "2026-10-01", venceEm: "2027-10-01", criadoEm: "2026-10-01T00:00:00.000Z" };

test("G2: limites dos treinamentos, comprovantes, registros e Manual são validados no servidor", () => {
  const tem = (recebido, campo, atual = {}) => {
    const resultado = validarLimitesDeTexto(atual, recebido);
    return !resultado.ok && resultado.rejeitados.some((item) => item.campo === campo);
  };
  assert.equal(validarLimitesDeTexto({}, { capacitacoes: [capacitacao] }).ok, true);
  assert.equal(tem({ capacitacoes: [{ ...capacitacao, conteudo: "x".repeat(201) }] }, "conteudo"), true);
  assert.equal(tem({ capacitacoes: [{ ...capacitacao, conteudo: "   " }] }, "conteudo"), true);
  assert.equal(tem({ capacitacoes: [{ ...capacitacao, instrutor: "y".repeat(81) }] }, "instrutor"), true);
  assert.equal(tem({ capacitacoes: [{ ...capacitacao, cargaHoraria: 0 }] }, "cargaHoraria"), true);
  assert.equal(tem({ capacitacoes: [{ ...capacitacao, cargaHoraria: "8" }] }, "cargaHoraria"), true);
  assert.equal(tem({ capacitacoes: [{ ...capacitacao, cpf: "1" }] }, "cpf"), true);
  assert.equal(tem({ comprovantes: [{ id: "k", empresaId: "e1", observacao: "z".repeat(501) }] }, "observacao"), true);
  assert.equal(tem({ comprovantes: [{ id: "k", empresaId: "e1", emissor: "z".repeat(81) }] }, "emissor"), true);
  assert.equal(tem({ registrosPop: [{ ...registroDeOutro, responsavel: "n".repeat(81) }] }, "responsavel"), true);
  assert.equal(tem({ registrosPop: [{ ...registroDeOutro, ambiente: "n".repeat(81) }] }, "ambiente"), true);
  assert.equal(tem({ empresas: { e1: { ...empresa, atividadeDescricao: "a".repeat(201) } } }, "atividadeDescricao"), true);
  assert.equal(tem({ empresas: { e1: { ...empresa, responsabilidadesManual: [{ id: "x", papel: "Proprietário", descricao: "r".repeat(501), ativa: true }] } } }, "responsabilidadesManual"), true);
  assert.equal(tem({ empresas: { e1: { ...empresa, pops: [{ ...pop, responsavel: "p".repeat(81) }] } } }, "responsavel"), true);
});

test("G2: dado antigo fora do limite não trava gravações sem relação (só o que mudou é conferido)", () => {
  const velho = { ...capacitacao, conteudo: "x".repeat(300) };
  assert.equal(validarLimitesDeTexto({ capacitacoes: [velho] }, { capacitacoes: [{ ...velho }] }).ok, true);
});

test("G3: o item inválido é recusado com o campo e o RESTO é gravado; nunca corta o texto", () => {
  const ruim = { ...capacitacao, id: "c2", conteudo: "x".repeat(250) };
  const bom = { ...capacitacao, id: "c3" };
  const { estado, rejeitados } = separarItensInvalidos({ capacitacoes: [capacitacao] }, { capacitacoes: [capacitacao, ruim, bom] });
  assert.deepEqual(estado.capacitacoes.map((item) => item.id), ["c1", "c3"], "o novo inválido some, o bom entra");
  assert.equal(rejeitados.length, 1);
  assert.equal(rejeitados[0].campo, "conteudo");
  assert.equal(rejeitados[0].item, "c2");
  assert.match(rejeitados[0].mensagem, /200 caracteres/);
  // edição inválida de um item que já existia: volta o que estava gravado
  const editado = { ...capacitacao, conteudo: "x".repeat(250) };
  const volta = separarItensInvalidos({ capacitacoes: [capacitacao] }, { capacitacoes: [editado] });
  assert.equal(volta.estado.capacitacoes[0].conteudo, "Boas práticas");
});

// ---------- B4: Vence em depois de Feito em ----------
test("B4: 'Vence em' precisa ser depois de 'Feito em' (navegador e servidor com a mesma regra)", () => {
  const ok = { colaboradorId: "a", conteudo: "Boas práticas", cargaHoraria: "8", data: "2026-10-01", venceEm: "2027-10-01" };
  assert.equal(erroDoVencimento("2026-10-01", "2026-10-01"), "Precisa ser depois de Feito em");
  assert.equal(erroDoVencimento("2026-10-01", "2026-09-30"), "Precisa ser depois de Feito em");
  assert.equal(erroDoVencimento("2026-10-01", "2026-10-02"), "");
  assert.equal(erroDoVencimento("2026-10-01", ""), "");
  assert.equal(validarCapacitacao({ ...ok, venceEm: "2026-10-01" }).venceEm, "Precisa ser depois de Feito em");
  assert.equal(validarCapacitacao({ ...ok, cargaHoraria: "0" }).cargaHoraria, "Precisa ser maior que zero.");
  assert.equal(validarCapacitacao({ ...ok, cargaHoraria: "" }).cargaHoraria, "Informe a carga horária em horas.");
  assert.equal(validarCapacitacao({ ...ok, cargaHoraria: "abc" }).cargaHoraria, "Informe a carga horária em horas.");
  assert.equal(validarCapacitacao({ ...ok, conteudo: " " }).conteudo, "Informe o conteúdo do treinamento.");
  assert.deepEqual(validarCapacitacao(ok), {});
  const servidor = validarLimitesDeTexto({}, { capacitacoes: [{ ...capacitacao, venceEm: "2026-10-01" }] });
  assert.equal(servidor.ok, false);
  assert.equal(servidor.rejeitados[0].campo, "venceEm");
  assert.match(servidor.mensagem, /depois de Feito em/);
});

// ---------- C, E: textos e avanço ----------
test("C: contagens dos programas à direita do cabeçalho", () => {
  assert.equal(contagemDosProgramas([{ status: "Implantado" }, { status: "Implantado" }, { status: "Em implantação" }]), "2 ativos · 1 em implantação");
  assert.equal(contagemDosProgramas([{ status: "Implantado" }]), "1 ativo · 0 em implantação");
});

test("E1: o 'Preencher com dados do RT' diz quantos campos entraram e o que falta no cadastro do RT", () => {
  assert.equal(fraseDoPreencher(3, 2), "3 campos preenchidos. Faltam 2, preencha abaixo.");
  assert.equal(fraseDoPreencher(1, 0), "1 campo preenchido. Salve para guardar.");
  assert.equal(fraseDoPreencher(0, 1), "Nada novo para preencher. Faltam 1, preencha abaixo.");
});

test("E2: sugestões de atividade vêm do CNAE principal e dos secundários, sem repetir e só as que cabem no campo", () => {
  const lista = sugestoesDeAtividade("Restaurantes e similares", [{ descricao: "Lanchonetes" }, { descricao: "restaurantes e similares" }, { descricao: "x".repeat(300) }], 200);
  assert.deepEqual(lista, ["Restaurantes e similares", "Lanchonetes"]);
  assert.deepEqual(sugestoesDeAtividade("", undefined, 200), []);
});

test("E3: avanço automático só em máscara completa; texto livre nunca avança sozinho", () => {
  assert.equal(mascaraCompletaParaAvancar("consultorCpfCnpj", "12.345.678/0001-95"), "agora");
  assert.equal(mascaraCompletaParaAvancar("consultorCpfCnpj", "529.982.247-25"), "depois", "11 dígitos esperam, para não cortar um CNPJ");
  assert.equal(mascaraCompletaParaAvancar("consultorCpfCnpj", "529.982"), "nao");
  assert.equal(mascaraCompletaParaAvancar("consultorTelefone", "(11) 98888-7777"), "agora");
  assert.equal(mascaraCompletaParaAvancar("consultorTelefone", "(11) 3888-7777"), "depois");
  assert.equal(mascaraCompletaParaAvancar("dataElaboracaoManual", "2026-10-31"), "depois");
  assert.equal(mascaraCompletaParaAvancar("dataElaboracaoManual", "0002-10-31"), "nao");
  for (const campo of ["atividadeDescricao", "consultorNome", "consultorEndereco", "consultorRegistro", "elaboradoPor", "revisadoPor", "aprovadoPor"]) assert.equal(mascaraCompletaParaAvancar(campo, "texto qualquer longo"), "nao", campo);
  assert.equal(proximoCampoDaIdentificacao("atividadeDescricao"), "consultorNome");
  assert.equal(proximoCampoDaIdentificacao("aprovadoPor"), null);
});

test("F1/H: a lista de POPs estica na largura de Documentos e o laranja dos botões de texto passa de 4,5:1", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.ok(css.includes("body .cen-doc .pgl{align-items:stretch}"));
  const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const razao = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  assert.ok(razao("#E8591A", "#FFFFFF") < 4.5);
  assert.ok(razao("#D9500F", "#FFFFFF") >= 4);
});

test("Rodada 6 · I4: um campo da identificação acima do limite é recusado sozinho; os outros são salvos", () => {
  const gravada = { e1: { id: "e1", nome: "Casa", consultorNome: "Ana", atividadeDescricao: "Antiga" } };
  const recebida = { e1: { id: "e1", nome: "Casa", consultorNome: "Ana Maria", atividadeDescricao: "x".repeat(5000) } };
  const { estado, rejeitados } = separarItensInvalidos({ empresas: gravada }, { empresas: recebida });
  assert.equal(rejeitados.length, 1);
  assert.equal(rejeitados[0].colecao, "empresas");
  assert.equal(rejeitados[0].campo, "atividadeDescricao");
  assert.equal(estado.empresas.e1.consultorNome, "Ana Maria");
  assert.equal(estado.empresas.e1.atividadeDescricao, "Antiga");
});
