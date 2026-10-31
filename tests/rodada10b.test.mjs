import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CAMPOS_QUE_CONTAM,
  camposAindaDoPreencher,
  contarPreenchidos,
  identificacaoCompleta,
  ofertaDeOutroManual,
  origemParaGravar,
  preencherIdentificacao,
  registroDoRt,
} from "../lib/manualIdentificacao.ts";
import { origemDoPreencherMalFormada, separarItensInvalidos } from "../lib/limitesDoServidor.ts";
import { filtrarEstadoPorUsuario } from "../lib/stateAccess.ts";

const ler = (caminho) => readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");
const juntar = registroDoRt;
const rtAna = { nome: "Ana Souza", cargo: "Nutricionista RT", crn: "6599", telefone: "51999990000" };

test("B: nome, telefone, registro, elaborado e revisado vêm todos da MESMA pessoa", () => {
  const r = preencherIdentificacao({}, { rt: rtAna, juntar, hoje: "2026-10-31", responsavel: "Maria" });
  assert.equal(r.valores.consultorNome, "Ana Souza");
  assert.equal(r.valores.consultorTelefone, "(51) 99999-0000");
  assert.equal(r.valores.consultorRegistro, "Nutricionista RT · CRN 6599");
  assert.equal(r.valores.elaboradoPor, "Ana Souza");
  assert.equal(r.valores.revisadoPor, "Ana Souza");
});

test("B: nome digitado de outra pessoa → telefone e registro do RT NÃO entram (não mistura)", () => {
  const r = preencherIdentificacao({ consultorNome: "Élton Teste Consultor" }, { rt: rtAna, juntar, hoje: "2026-10-31" });
  assert.equal(r.valores.consultorNome, undefined);
  assert.equal(r.valores.consultorTelefone, undefined);
  assert.equal(r.valores.consultorRegistro, undefined);
  assert.equal(r.valores.elaboradoPor, "Élton Teste Consultor");
});

test("B: nome digitado igual ao do RT (sem acento/caixa) completa o resto; campo digitado nunca é sobrescrito", () => {
  const r = preencherIdentificacao({ consultorNome: "ana souza", consultorTelefone: "(11) 3333-4444" }, { rt: rtAna, juntar });
  assert.equal(r.valores.consultorTelefone, undefined);
  assert.equal(r.valores.consultorRegistro, "Nutricionista RT · CRN 6599");
});

test("B: origem — campo ainda do Preencher é atualizado num novo clique; editado deixa de ser", () => {
  const origem = { consultorNome: { usuarioId: "u-velho", valor: "Marivane" }, consultorTelefone: { usuarioId: "u-velho", valor: "(51) 98888-0000" } };
  const atuais = { consultorNome: "Marivane", consultorTelefone: "(51) 97777-1111" };
  const aindas = camposAindaDoPreencher(origem, atuais);
  assert.deepEqual(aindas, ["consultorNome"]);
  const r = preencherIdentificacao(atuais, { rt: rtAna, juntar, daAutomacao: aindas });
  assert.equal(r.valores.consultorNome, "Ana Souza");
  assert.equal(r.valores.consultorTelefone, undefined);
});

test("B: origemParaGravar mantém a origem anterior do que não mudou e usa o RT atual no que o Preencher pôs", () => {
  const antes = { consultorNome: { usuarioId: "u1", valor: "Ana Souza" } };
  const origem = origemParaGravar(["consultorNome", "consultorTelefone"], { consultorNome: "Ana Souza", consultorTelefone: "(51) 99999-0000" }, antes, "u1");
  assert.deepEqual(origem, { consultorNome: { usuarioId: "u1", valor: "Ana Souza" }, consultorTelefone: { usuarioId: "u1", valor: "(51) 99999-0000" } });
  assert.deepEqual(origemParaGravar(["consultorNome"], { consultorNome: "" }, undefined, "u1"), {});
});

test("B: o servidor valida o metadado de origem (tipo e tamanho) e Executor/Fiscal não o recebem", () => {
  assert.equal(origemDoPreencherMalFormada(undefined), false);
  assert.equal(origemDoPreencherMalFormada({ consultorNome: { usuarioId: "u1", valor: "Ana" } }), false);
  assert.equal(origemDoPreencherMalFormada([]), true);
  assert.equal(origemDoPreencherMalFormada({ outroCampo: { usuarioId: "u1", valor: "x" } }), true);
  assert.equal(origemDoPreencherMalFormada({ consultorNome: { usuarioId: "u1", valor: "x".repeat(601) } }), true);
  assert.equal(origemDoPreencherMalFormada({ consultorNome: { usuarioId: "u1", valor: "x", extra: 1 } }), true);
  assert.equal(origemDoPreencherMalFormada({ consultorNome: { usuarioId: "fantasma", valor: "x" } }, new Set(["u1"])), true);
  const atual = { empresas: { e1: { id: "e1", nome: "X", pops: [] } } };
  const ruim = separarItensInvalidos(atual, { empresas: { e1: { id: "e1", nome: "X", pops: [], origemDoPreencher: "lixo" } } });
  assert.equal(ruim.rejeitados[0]?.campo, "origemDoPreencher");
  assert.equal(ruim.estado.empresas.e1.origemDoPreencher, undefined);
  const estado = { empresas: { e1: { id: "e1", nome: "X", pops: [], consultorNome: "Ana", origemDoPreencher: { consultorNome: { usuarioId: "u1", valor: "Ana" } } } }, empresaAtualId: "e1", visitas: [], ncs: [], evidencias: [], usuarios: [], registrosAuditoria: [], colaboradores: [], capacitacoes: [], leiturasPop: [], registrosPop: [], comprovantes: [], relatoriosEmitidos: [] };
  const base = { id: "f", nome: "F", email: "f@x.com", status: "Ativo", empresaIds: ["e1"], criadoEm: "2026-01-01", atualizadoEm: "2026-01-01" };
  for (const perfil of ["Fiscal", "Executor de campo"]) {
    const visto = JSON.stringify(filtrarEstadoPorUsuario(estado, { ...base, perfil }));
    assert.equal(visto.includes("origemDoPreencher"), false, perfil);
    assert.equal(visto.includes("u1"), false, perfil);
  }
});

test("C: CPF/CNPJ, endereço e telefone do RT são opcionais — fora de 'Faltam' e do contador 'N de 7'", () => {
  assert.equal(CAMPOS_QUE_CONTAM.length, 7);
  const sete = { atividadeDescricao: "a", consultorNome: "b", consultorRegistro: "c", dataElaboracaoManual: "2026-10-31", elaboradoPor: "d", revisadoPor: "e", aprovadoPor: "f" };
  assert.deepEqual(contarPreenchidos(sete), { preenchidos: 7, total: 7 });
  assert.equal(identificacaoCompleta(sete), true);
  const r = preencherIdentificacao(sete, { juntar });
  assert.deepEqual(r.semFonte, []);
  const rotulos = ler("app/page.tsx");
  for (const rotulo of ["CPF ou CNPJ do Consultor/RT (opcional)", "Endereço do Consultor/RT (opcional)", "Telefone do Consultor/RT (opcional)"]) assert.ok(rotulos.includes(rotulo), rotulo);
});

test("C: oferta de CPF/endereço de outro Manual do MESMO RT (por id, não por nome), CPF mascarado", () => {
  const empresas = [
    { id: "e2", nomeFantasia: "Outra", consultorCpfCnpj: "123.456.789-09", consultorEndereco: "Rua A, 1", origemDoPreencher: { consultorNome: { usuarioId: "u1", valor: "Ana" } } },
    { id: "e3", nomeFantasia: "Homônimo", consultorCpfCnpj: "000.000.000-00", origemDoPreencher: { consultorNome: { usuarioId: "u9", valor: "Ana" } } },
  ];
  const oferta = ofertaDeOutroManual(empresas, "u1", "e1", {});
  assert.equal(oferta.empresaNome, "Outra");
  assert.equal(oferta.cpfFinal, "09");
  assert.ok(oferta.endereco);
  assert.equal(ofertaDeOutroManual(empresas, "u1", "e1", { consultorCpfCnpj: "x", consultorEndereco: "y" }), null);
  assert.equal(ofertaDeOutroManual(empresas, undefined, "e1", {}), null);
  assert.equal(ofertaDeOutroManual([empresas[1]], "u1", "e1", {}), null);
  const tela = ler("components/pc/PcManualDocumento.tsx");
  assert.ok(tela.includes("Encontrado no Manual de") && tela.includes("Usar"));
  assert.ok(ler("app/page.tsx").includes('usuarioDaSessao.perfil !== "Administrador" && usuarioDaSessao.perfil !== "Consultor/RT"'));
});

test("A: janelas do Manual têm altura mínima, espaçador na página e rolagem só da lista", () => {
  const tela = ler("components/pc/PcManualDocumento.tsx");
  assert.ok(tela.includes("ALTURA_MINIMA_DA_JANELA") && tela.includes("espacador"));
  assert.ok(tela.includes("scrollTop"));
});

test("D: Nova empresa — frase do desenho, Buscar em contorno, duas colunas no PC e resumo do pacote", () => {
  const pagina = ler("app/page.tsx");
  assert.ok(pagina.includes("Digite o CNPJ: o app busca os dados e você só completa o que faltar."));
  assert.ok(pagina.includes('"ui-btn--secondary"'));
  const css = ler("app/globals.css");
  assert.ok(css.includes("RODADA 10 · D") && css.includes("@media (min-width:1200px)"));
  const pacote = ler("components/PacoteDoTipo.tsx");
  assert.ok(pacote.includes("Nada é criado sem você escolher.") && pacote.includes("Ambientes e equipamentos"));
});
