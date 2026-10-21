import assert from "node:assert/strict";
import test from "node:test";

import { contar, naoConformes, palavra, pluralDe, quantidade, vencem } from "../lib/plural.ts";
import {
  comprovantesVigentesDoPop,
  contadoresDaLista,
  correcoesAtrasadasDoPop,
  diasDaFrequencia,
  ordenarLinhas,
  proximaAcaoDoPop,
  registroAtrasado,
  situacaoDeGestao,
} from "../lib/popGestao.ts";
import { CONJUNTO_DA_NORMA } from "../lib/popsNorma.ts";
import {
  destinoDaRotaAntiga,
  grupoDaSubaba,
  gruposVisiveis,
  lerSubabaLembrada,
  lembrarSubaba,
  resolverSubaba,
  subabasVisiveis,
} from "../lib/centralEmpresa.ts";
import { empresaTemImplantacao, implantacaoConcluida, implantacaoDeEmpresaNova, passosDeImplantacao, resumoDaImplantacao } from "../lib/implantacao.ts";
import { divergenciaDeResponsavel, responsavelEfetivo, textoDoResponsavel } from "../lib/responsavelEstabelecimento.ts";

const HOJE = "2026-11-10";
const aprovado = (extra = {}) => ({
  id: "p1",
  codigo: "POP-03",
  titulo: "Higienização do reservatório",
  versao: "1.0",
  status: "Aprovado",
  programaRelacionado: "",
  responsavel: "",
  proximaRevisao: "",
  catalogoId: "higienizacao-reservatorio",
  aprovacao: { nome: "Marivane", cargo: "Nutricionista", usuarioId: "u1", em: "2026-11-04T12:00:00.000Z", versao: "1.0" },
  conteudo: { frequencia: "semestral" },
  ...extra,
});
const comprovante = (validade, extra = {}) => ({ id: `c-${validade}`, empresaId: "e1", tipo: "reservatorio", emissor: "X", dataServico: "2026-05-01", validade, observacao: "", criadoEm: "2026-05-01T00:00:00.000Z", popId: "p1", ...extra });

// ===== plural =====
test("plural: um helper só para singular e plural", () => {
  assert.equal(quantidade(1, "correção", "correções"), "1 correção");
  assert.equal(quantidade(2, "correção", "correções"), "2 correções");
  assert.equal(naoConformes(1), "1 não conforme");
  assert.equal(naoConformes(2), "2 não conformes");
  assert.equal(vencem(1), "1 vence");
  assert.equal(vencem(3), "3 vencem");
  assert.equal(vencem(0), "0 vencem");
  assert.equal(palavra(1, "setor", "setores"), "setor");
  assert.equal(contar(3, "setor"), "3 setores");
  assert.equal(contar(1, "correção"), "1 correção");
  assert.equal(contar(2, "correção"), "2 correções");
  assert.equal(pluralDe("item"), "itens");
  assert.equal(pluralDe("conforme"), "conformes");
});

// ===== situação derivada =====
test("situação do POP: derivada, e revisão vencida só com 'revisar até' ou norma alterada", () => {
  assert.equal(situacaoDeGestao(undefined, HOJE), "Falta criar");
  assert.equal(situacaoDeGestao(aprovado({ status: "Rascunho" }), HOJE), "Rascunho");
  assert.equal(situacaoDeGestao(aprovado({ status: "Aguardando aprovação" }), HOJE), "Aguardando aprovação");
  assert.equal(situacaoDeGestao(aprovado({ status: "Em revisão" }), HOJE), "Aguardando aprovação");
  assert.equal(situacaoDeGestao(aprovado(), HOJE), "Vigente");
  // sem o campo "revisar até": nunca revisão vencida, por mais antiga que seja a aprovação
  assert.equal(situacaoDeGestao(aprovado({ aprovacao: { nome: "A", cargo: "", usuarioId: "u", em: "2001-01-01T00:00:00.000Z", versao: "1.0" } }), HOJE), "Vigente");
  assert.equal(situacaoDeGestao(aprovado({ proximaRevisao: "2026-11-09" }), HOJE), "Revisão vencida");
  assert.equal(situacaoDeGestao(aprovado({ proximaRevisao: "2026-11-10" }), HOJE), "Vigente");
  assert.equal(situacaoDeGestao(aprovado({ versaoCatalogoAprovada: { "rdc-216-2004": "versão-antiga" } }), HOJE), "Revisão vencida");
  assert.equal(situacaoDeGestao(aprovado({ status: "Inativo" }), HOJE), "Inativo");
});

// ===== próxima ação: os 7 casos =====
const base = (extra = {}) => ({ pop: aprovado(), hoje: HOJE, podeAprovar: false, comprovantes: [], ncs: [], registros: [], leituraPendente: { lidos: 3, total: 3, faltam: [] }, ...extra });
const ultimoRegistro = { id: "r1", empresaId: "e1", popId: "p1", popVersao: "1.0", dataHora: "2026-11-09T12:00:00.000Z", responsavel: "A", descricao: "x", criadoEm: "2026-11-09T12:00:00.000Z" };

test("próxima ação 1: comprovante vinculado vencido", () => {
  const acao = proximaAcaoDoPop(base({ comprovantes: [comprovante("2026-11-01")], registros: [ultimoRegistro] }));
  assert.equal(acao.tipo, "comprovante-vencido");
  assert.equal(acao.prioridade, 1);
  assert.match(acao.texto, /vencido em 01\/11/);
  assert.equal(acao.botao.destino, "comprovantes");
});

test("próxima ação 2: correção atrasada vinculada ao POP (pelo vínculo ou pela categoria)", () => {
  const nc = (extra) => ({ status: "Aberta", prazo: "2026-11-01", categoria: "Controle da potabilidade da água", ...extra });
  assert.equal(proximaAcaoDoPop(base({ ncs: [nc({})], registros: [ultimoRegistro] })).tipo, "correcao-atrasada");
  // vínculo escolhido à mão para outro POP vale mais que a categoria
  assert.equal(proximaAcaoDoPop(base({ ncs: [nc({ popCatalogoId: "controle-de-pragas" })], registros: [ultimoRegistro] })).tipo, "em-dia");
  assert.equal(proximaAcaoDoPop(base({ ncs: [nc({ categoria: "Outra", popCatalogoId: "higienizacao-reservatorio" })], registros: [ultimoRegistro] })).tipo, "correcao-atrasada");
  // resolvida, sem prazo ou no prazo: não conta
  assert.equal(correcoesAtrasadasDoPop(aprovado(), [nc({ status: "Resolvida" }), nc({ prazo: undefined }), nc({ prazo: "2026-11-10" })], HOJE), 0);
  assert.equal(correcoesAtrasadasDoPop({ catalogoId: undefined }, [nc({})], HOJE), 0);
});

test("próxima ação 3: aguardando aprovação; só o responsável vê 'Aprovar'", () => {
  const pop = aprovado({ status: "Aguardando aprovação" });
  const comAcao = proximaAcaoDoPop(base({ pop, podeAprovar: true }));
  assert.equal(comAcao.tipo, "aguardando-aprovacao");
  assert.equal(comAcao.botao.destino, "aprovar");
  const semAcao = proximaAcaoDoPop(base({ pop, podeAprovar: false }));
  assert.equal(semAcao.tipo, "aguardando-aprovacao");
  assert.equal(semAcao.texto, "Aguardando o responsável");
  assert.equal(semAcao.botao, undefined);
});

test("próxima ação 4: registro atrasado em relação à frequência já cadastrada", () => {
  assert.equal(diasDaFrequencia("Semestral"), 182);
  assert.equal(diasDaFrequencia("Diária, ao fechar"), 1);
  assert.equal(diasDaFrequencia("quando necessário"), null);
  const antigo = { ...ultimoRegistro, dataHora: "2026-03-01T12:00:00.000Z" };
  assert.equal(proximaAcaoDoPop(base({ registros: [antigo] })).tipo, "registro-atrasado");
  assert.equal(proximaAcaoDoPop(base({ registros: [ultimoRegistro] })).tipo, "em-dia");
  // frequência que não dá para ler: nunca cobra registro
  assert.equal(registroAtrasado(aprovado({ conteudo: { frequencia: "quando necessário" } }), [antigo], HOJE), false);
  // sem registro: conta a partir da aprovação
  assert.equal(registroAtrasado(aprovado({ conteudo: { frequencia: "diária" } }), [], HOJE), true);
  assert.equal(registroAtrasado(aprovado({ status: "Rascunho", conteudo: { frequencia: "diária" } }), [], HOJE), false);
});

test("próxima ação 5: leitura pendente da versão vigente", () => {
  const acao = proximaAcaoDoPop(base({ registros: [ultimoRegistro], leituraPendente: { lidos: 3, total: 6, faltam: ["Diego", "Elisa", "Fábio"] } }));
  assert.equal(acao.tipo, "leitura-pendente");
  assert.match(acao.texto, /Faltam 3 pessoas lerem a v1\.0 \(Diego, Elisa, Fábio\)/);
  assert.equal(acao.botao.rotulo, "Registrar leitura");
  assert.match(proximaAcaoDoPop(base({ registros: [ultimoRegistro], leituraPendente: { lidos: 5, total: 6, faltam: ["Ana"] } })).texto, /Falta 1 pessoa ler/);
});

test("próxima ação 6: comprovante vence em até 30 dias", () => {
  const acao = proximaAcaoDoPop(base({ registros: [ultimoRegistro], comprovantes: [comprovante("2026-12-10")] }));
  assert.equal(acao.tipo, "comprovante-vence");
  assert.match(acao.texto, /vence em 10\/12/);
  // 31 dias: ainda em dia
  assert.equal(proximaAcaoDoPop(base({ registros: [ultimoRegistro], comprovantes: [comprovante("2026-12-11")] })).tipo, "em-dia");
});

test("próxima ação 7: nada pendente é 'Em dia'; sem versão é 'Criar do modelo e revisar'", () => {
  assert.deepEqual(proximaAcaoDoPop(base({ registros: [ultimoRegistro] })), { tipo: "em-dia", prioridade: 8, texto: "Em dia" });
  const criar = proximaAcaoDoPop({ pop: undefined, hoje: HOJE, podeAprovar: false });
  assert.equal(criar.tipo, "criar");
  assert.equal(criar.texto, "Criar do modelo e revisar");
  assert.equal(proximaAcaoDoPop(base({ pop: aprovado({ status: "Rascunho" }) })).tipo, "concluir-rascunho");
});

test("próxima ação: em empate vale a primeira da ordem (1 antes de 2 antes de 3...)", () => {
  const nc = { status: "Aberta", prazo: "2026-11-01", categoria: "Controle da potabilidade da água" };
  const tudo = base({
    pop: aprovado({ status: "Aguardando aprovação" }),
    podeAprovar: true,
    ncs: [nc],
    comprovantes: [comprovante("2026-11-01"), comprovante("2026-12-01", { id: "c2" })],
    leituraPendente: { lidos: 0, total: 2, faltam: ["A", "B"] },
  });
  assert.equal(proximaAcaoDoPop(tudo).tipo, "comprovante-vencido");
  assert.equal(proximaAcaoDoPop({ ...tudo, comprovantes: [] }).tipo, "correcao-atrasada");
  assert.equal(proximaAcaoDoPop({ ...tudo, comprovantes: [], ncs: [] }).tipo, "aguardando-aprovacao");
  // a leitura pendente (5) ganha do comprovante que vence (6)
  const cinco = base({ registros: [ultimoRegistro], comprovantes: [comprovante("2026-12-01")], leituraPendente: { lidos: 0, total: 2, faltam: ["A"] } });
  assert.equal(proximaAcaoDoPop(cinco).tipo, "leitura-pendente");
});

test("comprovante renovado deixa de contar como vencido", () => {
  const velho = comprovante("2026-11-01", { id: "velho" });
  const novo = comprovante("2027-05-01", { id: "novo", renovaId: "velho" });
  assert.deepEqual(comprovantesVigentesDoPop([velho, novo], "p1").map((item) => item.id), ["novo"]);
  assert.equal(proximaAcaoDoPop(base({ registros: [ultimoRegistro], comprovantes: [velho, novo] })).tipo, "em-dia");
  // comprovante de outro POP ou geral da empresa não entra
  assert.equal(proximaAcaoDoPop(base({ registros: [ultimoRegistro], comprovantes: [comprovante("2026-11-01", { popId: "outro" }), comprovante("2026-11-01", { popId: undefined, id: "g" })] })).tipo, "em-dia");
});

test("ordem da lista: quem precisa de alguém primeiro, depois Em dia, depois Falta criar; contadores", () => {
  const linha = (nome, pop, acao) => ({ nome, situacao: situacaoDeGestao(pop, HOJE), acao });
  const emDia = proximaAcaoDoPop(base({ registros: [ultimoRegistro] }));
  const criar = proximaAcaoDoPop({ pop: undefined, hoje: HOJE, podeAprovar: false });
  const leitura = proximaAcaoDoPop(base({ registros: [ultimoRegistro], leituraPendente: { lidos: 1, total: 2, faltam: ["A"] } }));
  const aguardando = proximaAcaoDoPop(base({ pop: aprovado({ status: "Aguardando aprovação" }) }));
  const linhas = [linha("criar", undefined, criar), linha("em dia", aprovado(), emDia), linha("leitura", aprovado(), leitura), linha("aguardando", aprovado({ status: "Aguardando aprovação" }), aguardando)];
  assert.deepEqual(ordenarLinhas(linhas).map((item) => item.nome), ["aguardando", "leitura", "em dia", "criar"]);
  // empate: mantém a ordem de entrada
  assert.deepEqual(ordenarLinhas([linha("a", aprovado(), leitura), linha("b", aprovado(), leitura)]).map((item) => item.nome), ["a", "b"]);
  const c = contadoresDaLista(linhas);
  assert.deepEqual(c, { total: 4, vigentesEmDia: 1, vigentesComPendencia: 1, aguardando: 1, rascunho: 0, faltaCriar: 1 });
  assert.equal(c.vigentesEmDia + c.vigentesComPendencia + c.aguardando + c.rascunho + c.faltaCriar, c.total, "contadores exclusivos: a soma é o total");
});

// ===== Central em 3 grupos =====
test("Central: 3 grupos com as sub-abas pedidas e rotas antigas que continuam valendo", () => {
  const todos = { editar: true, verComprovantes: true, gerenciarPessoas: true };
  const grupos = gruposVisiveis(todos);
  assert.deepEqual(grupos.map((grupo) => grupo.rotulo), ["Empresa", "Estrutura", "Documentos"]);
  assert.deepEqual(grupos[0].subabas, ["dados", "norma", "privacidade"]);
  assert.deepEqual(grupos[1].subabas, ["ambientes", "fluxos"]);
  assert.deepEqual(grupos[2].subabas, ["manual", "pops", "programas", "comprovantes", "pessoas"]);
  assert.equal(grupoDaSubaba("pops"), "documentos");
  for (const chave of ["dados", "manual", "ambientes", "fluxos", "programas", "norma", "privacidade", "pops", "comprovantes", "pessoas"]) assert.equal(destinoDaRotaAntiga(chave), chave);
  assert.equal(destinoDaRotaAntiga("treinamento"), "pops");
  assert.equal(destinoDaRotaAntiga("qualquer"), null);
});

test("Central: quem não edita só vê POPs, Comprovantes e Pessoas conforme a permissão", () => {
  assert.deepEqual(subabasVisiveis({ editar: false, verComprovantes: true, gerenciarPessoas: true }), ["pops", "comprovantes", "pessoas"]);
  assert.deepEqual(subabasVisiveis({ editar: false, verComprovantes: true, gerenciarPessoas: false }), ["pops", "comprovantes"]);
  assert.deepEqual(subabasVisiveis({ editar: false, verComprovantes: false, gerenciarPessoas: false }), ["pops"]);
  const visiveis = subabasVisiveis({ editar: false, verComprovantes: false, gerenciarPessoas: false });
  assert.equal(resolverSubaba("dados", "norma", visiveis), "pops");
  assert.equal(resolverSubaba("pops", null, visiveis), "pops");
  const todas = subabasVisiveis({ editar: true, verComprovantes: true, gerenciarPessoas: true });
  assert.equal(resolverSubaba(null, "manual", todas), "manual");
  assert.equal(resolverSubaba(null, null, todas), "dados");
});

test("Central: lembra o último grupo e sub-aba por empresa, e não quebra sem armazenamento", () => {
  const memoria = new Map();
  const armazem = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v) };
  lembrarSubaba("e1", "manual", armazem);
  lembrarSubaba("e2", "pops", armazem);
  assert.equal(lerSubabaLembrada("e1", armazem), "manual");
  assert.equal(lerSubabaLembrada("e2", armazem), "pops");
  assert.equal(lerSubabaLembrada("e3", armazem), null);
  const quebrado = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
  assert.equal(lerSubabaLembrada("e1", quebrado), null);
  assert.doesNotThrow(() => lembrarSubaba("e1", "dados", quebrado));
  assert.equal(lerSubabaLembrada("e1", null), null);
  const corrompido = { getItem: () => "{não é json", setItem: (k, v) => memoria.set(k, v) };
  assert.equal(lerSubabaLembrada("e1", corrompido), null);
});

// ===== Colocar a empresa em dia =====
const empresaNova = (extra = {}) => ({ id: "e1", nomeFantasia: "Churrascaria", normasAplicadas: ["rdc-216-2004"], pops: [], ...extra });

test("implantação: empresa antiga (sem o campo) não tem cartão; só empresa nova nasce com ele", () => {
  assert.equal(empresaTemImplantacao(empresaNova()), false);
  assert.equal(empresaTemImplantacao(undefined), false);
  assert.equal(empresaTemImplantacao(empresaNova({ implantacao: implantacaoDeEmpresaNova("2026-11-10T00:00:00.000Z") })), true);
  assert.deepEqual(implantacaoDeEmpresaNova("x"), { ativa: true, criadaEm: "x" });
});

test("implantação: 5 passos derivados dos dados, o primeiro pendente é o atual", () => {
  const vazio = passosDeImplantacao(empresaNova(), {}, HOJE);
  assert.deepEqual(vazio.map((passo) => passo.estado), ["atual", "pendente", "pendente", "pendente", "pendente"]);
  assert.equal(vazio[0].destino, "dados");
  assert.equal(vazio.length, 5);

  const comResp = empresaNova({ responsavelEstabelecimento: { nome: "Marivane", cargo: "Nutricionista", usuarioId: "u1" }, normasAplicadas: ["rdc-216-2004"], normasConfirmadasPeloRt: { nome: "RT", em: "x" } });
  const passos = passosDeImplantacao(comResp, {}, HOJE);
  assert.deepEqual(passos.map((passo) => passo.estado), ["feito", "feito", "atual", "pendente", "pendente"]);
  assert.match(passos[2].detalhe, /0 criados, 4 faltam/);
  assert.equal(passos[2].destino, "pops");
  assert.equal(resumoDaImplantacao(passos).feitos, 2);
  assert.equal(resumoDaImplantacao(passos).percentual, 40);

  // sem vínculo em Acessos o passo 1 não está feito
  const semVinculo = passosDeImplantacao(empresaNova({ responsavelEstabelecimento: { nome: "Marivane", cargo: "N" } }), {}, HOJE);
  assert.equal(semVinculo[0].estado, "atual");
  assert.match(semVinculo[0].detalhe, /falta vincular/);
});

test("implantação: some sozinha quando os 5 passos estão feitos", () => {
  const pops = CONJUNTO_DA_NORMA.map((definicao, indice) => aprovado({ id: `p${indice}`, catalogoId: definicao.catalogoId, titulo: definicao.titulo, codigo: definicao.codigo }));
  const empresa = empresaNova({ pops, responsavelEstabelecimento: { nome: "Marivane", cargo: "Nutricionista", usuarioId: "u1" }, normasConfirmadasPeloRt: { nome: "RT", em: "x" } });
  const colaboradores = [{ id: "c1", empresaId: "e1", nome: "Diego", cargo: "Cozinheiro", ativo: true, criadoEm: "x" }];
  const leiturasPop = pops.map((pop, indice) => ({ id: `l${indice}`, empresaId: "e1", popId: pop.id, popVersao: "1.0", colaboradorId: "c1", data: "2026-11-05", criadoEm: "x" }));
  const registrosPop = pops.map((pop, indice) => ({ id: `r${indice}`, empresaId: "e1", popId: pop.id, popVersao: "1.0", dataHora: "2026-11-06T10:00:00.000Z", responsavel: "A", descricao: "x", criadoEm: "x" }));
  assert.equal(implantacaoConcluida(passosDeImplantacao(empresa, { colaboradores, leiturasPop, registrosPop }, HOJE)), true);
  // falta uma leitura: o passo 4 é o atual
  const faltaLeitura = passosDeImplantacao(empresa, { colaboradores, leiturasPop: leiturasPop.slice(1), registrosPop }, HOJE);
  assert.equal(faltaLeitura[3].estado, "atual");
  assert.equal(implantacaoConcluida(faltaLeitura), false);
  // sem colaboradores ativos o passo 4 não pode estar feito
  assert.equal(passosDeImplantacao(empresa, { registrosPop }, HOJE)[3].estado, "atual");
});

// ===== Um só responsável =====
test("responsável: Dados vence; só o campo antigo de POPs vira fallback; divergência vira aviso", () => {
  assert.deepEqual(responsavelEfetivo(undefined), { nome: "", cargo: "", origem: "nenhum", vinculado: false });
  const so = responsavelEfetivo({ pops: [{ id: "p", responsavel: "Carla Antiga", titulo: "x", codigo: "", versao: "1", status: "Rascunho", programaRelacionado: "", proximaRevisao: "" }] });
  assert.equal(so.origem, "pops");
  assert.equal(so.nome, "Carla Antiga");
  const dados = responsavelEfetivo({ responsavel: "Marivane", cargoResponsavel: "Nutricionista", responsavelEstabelecimento: { nome: "Marivane", cargo: "Nutricionista", usuarioId: "u1" } });
  assert.deepEqual([dados.origem, dados.vinculado, textoDoResponsavel(dados)], ["dados", true, "Marivane · Nutricionista"]);
  const soContato = responsavelEfetivo({ responsavel: "Joana", cargoResponsavel: "" });
  assert.deepEqual([soContato.origem, soContato.vinculado], ["dados", false]);
  const empresa = { responsavelEstabelecimento: { nome: "Marivane", cargo: "N", usuarioId: "u1" }, pops: [{ id: "p", responsavel: "Carla Antiga" }, { id: "q", responsavel: "marivane" }, { id: "r", responsavel: "Carla Antiga", arquivado: true }] };
  assert.deepEqual(divergenciaDeResponsavel(empresa), { dados: "Marivane", pops: ["Carla Antiga"] });
  assert.equal(divergenciaDeResponsavel({ responsavelEstabelecimento: { nome: "Marivane", cargo: "N" }, pops: [{ id: "q", responsavel: "MARIVANE" }] }), null);
  // sem Dados: o campo antigo é fallback, não divergência
  assert.equal(divergenciaDeResponsavel({ pops: [{ id: "p", responsavel: "Carla Antiga" }] }), null);
});

// ===== Proteção no servidor das ações novas =====
import { filtrarEstadoPorUsuario, mesclarEstadoPorUsuario } from "../lib/stateAccess.ts";

const pessoa = (perfil, extra = {}) => ({ id: `u-${perfil}`, perfil, status: "Ativo", empresaIds: ["e1"], nome: perfil, email: `${perfil.replace(/\W/g, "")}@x.com`, ...extra });
const popGravado = (extra = {}) => ({ id: "p1", codigo: "POP-03", titulo: "Reservatório", versao: "1.0", status: "Aprovado", programaRelacionado: "", responsavel: "", proximaRevisao: "", ...extra });
const estadoBase = () => ({
  empresas: { e1: { id: "e1", nomeFantasia: "Churrascaria", pops: [popGravado(), popGravado({ id: "p2", status: "Rascunho", titulo: "Rascunho" })], implantacao: { ativa: true, criadaEm: "2026-11-01T00:00:00.000Z" }, normasAplicadas: ["rdc-216-2004"] } },
  empresaAtualId: "e1",
  visitas: [],
  ncs: [],
  evidencias: [],
  usuarios: [pessoa("Administrador"), pessoa("Consultor/RT"), pessoa("Cliente Gestor"), pessoa("Gerente"), pessoa("Executor de campo"), pessoa("Fiscal")],
  registrosAuditoria: [],
  configuracaoAcesso: {},
  comprovantes: [{ id: "c1", empresaId: "e1", tipo: "reservatorio", emissor: "X", dataServico: "2026-05-01", validade: "2026-11-01", observacao: "", criadoEm: "x", popId: "p1" }],
  colaboradores: [{ id: "col1", empresaId: "e1", nome: "Diego", cargo: "C", ativo: true, criadoEm: "x" }],
});

test("servidor: RT e Gestor não ligam nem desligam o 'Colocar em dia' (só nasce com a empresa)", () => {
  const atual = estadoBase();
  const rt = pessoa("Consultor/RT");
  const recebido = structuredClone(atual);
  recebido.empresas.e1.implantacao = undefined;
  const mesclado = mesclarEstadoPorUsuario(atual, recebido, rt, "auth-rt", "2026-11-10T00:00:00.000Z");
  assert.deepEqual(mesclado.empresas.e1.implantacao, { ativa: true, criadaEm: "2026-11-01T00:00:00.000Z" });
  // empresa antiga continua sem o campo: RT não consegue criá-lo
  const antiga = estadoBase();
  delete antiga.empresas.e1.implantacao;
  const tentativa = structuredClone(antiga);
  tentativa.empresas.e1.implantacao = { ativa: true, criadaEm: "agora" };
  assert.equal(mesclarEstadoPorUsuario(antiga, tentativa, rt, "auth-rt", "2026-11-10T00:00:00.000Z").empresas.e1.implantacao, undefined);
});

test("servidor: o POP vinculado ao comprovante precisa existir na empresa", () => {
  const atual = estadoBase();
  const gerente = pessoa("Gerente");
  const recebido = structuredClone(atual);
  recebido.comprovantes.push({ id: "c2", empresaId: "e1", tipo: "pragas", emissor: "Y", dataServico: "2026-05-01", validade: "2027-05-01", observacao: "", criadoEm: "x", popId: "pop-que-nao-existe" });
  recebido.comprovantes.push({ id: "c3", empresaId: "e1", tipo: "pragas", emissor: "Z", dataServico: "2026-05-01", validade: "2027-05-01", observacao: "", criadoEm: "x", popId: "p1" });
  const mesclado = mesclarEstadoPorUsuario(atual, recebido, gerente, "auth-g", "2026-11-10T00:00:00.000Z");
  const por = Object.fromEntries(mesclado.comprovantes.map((item) => [item.id, item.popId]));
  assert.equal(por.c1, "p1");
  assert.equal(por.c2, undefined);
  assert.equal(por.c3, "p1");
});

test("servidor: Executor só recebe POP aprovado e nada de comprovantes ou pessoas; Fiscal vê aprovados e comprovantes, sem pessoas", () => {
  const dados = estadoBase();
  const executor = filtrarEstadoPorUsuario(dados, pessoa("Executor de campo"));
  assert.deepEqual(executor.empresas.e1.pops.map((pop) => pop.id), ["p1"]);
  assert.equal(executor.comprovantes.length, 0);
  assert.equal((executor.colaboradores || []).length, 0);
  const fiscal = filtrarEstadoPorUsuario(dados, pessoa("Fiscal", { validoAte: "2099-12-31T23:59:59-03:00" }));
  assert.deepEqual(fiscal.empresas.e1.pops.map((pop) => pop.id), ["p1"]);
  assert.equal(fiscal.comprovantes.length, 1);
  assert.equal((fiscal.colaboradores || []).length, 0);
  const gerente = filtrarEstadoPorUsuario(dados, pessoa("Gerente"));
  assert.equal(gerente.empresas.e1.pops.length, 2);
  assert.equal(gerente.colaboradores.length, 1);
});
