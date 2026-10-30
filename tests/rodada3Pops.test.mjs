import test from "node:test";
import assert from "node:assert/strict";
import {
  AVISO_DADOS_DE_SAUDE_PESSOA, LIMITE_CARGO_DA_PESSOA, LIMITE_DO_TEXTO_LIVRE, LIMITE_NOME_DA_PESSOA,
  erroDoCpfCnpj, erroDoTelefone, estadoVisualDoPrograma, mascararCpfCnpj, mascararTelefone,
  nomeRepetidoDePessoa, ordenarPorAtencao, resumoDosProgramas, subtituloDePessoas, tomDoResumo, treinamentoDaPessoa,
} from "../lib/documentosCentral.ts";
import { veNomesNoHistorico, versoesDoHistorico } from "../lib/popHistorico.ts";

test("pessoas: limites, nome repetido sem acento nem caixa e plural", () => {
  assert.equal(LIMITE_NOME_DA_PESSOA, 80);
  assert.equal(LIMITE_CARGO_DA_PESSOA, 60);
  const lista = [{ id: "a", nome: "José da Silva" }];
  assert.equal(nomeRepetidoDePessoa("  jose  DA silva ", lista), true);
  assert.equal(nomeRepetidoDePessoa("José da Silva", lista, "a"), false);
  assert.equal(nomeRepetidoDePessoa("", lista), false);
  assert.match(subtituloDePessoas(1), /^1 colaborador ·/);
  assert.match(subtituloDePessoas(4), /^4 colaboradores ·/);
  assert.match(AVISO_DADOS_DE_SAUDE_PESSOA, /Não registre dados de saúde\.$/);
});

test("treinamento da pessoa: sem registro, em dia, pendente, vencido e inativa", () => {
  const hoje = "2026-10-30";
  const cap = (venceEm) => ({ id: "k", empresaId: "e", colaboradorId: "c", conteudo: "x", cargaHoraria: 1, data: "2026-01-01", venceEm, instrutor: "", criadoEm: "2026-01-01T00:00:00.000Z" });
  const p = { id: "c", ativo: true };
  assert.equal(treinamentoDaPessoa(p, [], hoje).id, "sem-registro");
  assert.equal(treinamentoDaPessoa(p, [cap("2027-06-01")], hoje).id, "em-dia");
  assert.equal(treinamentoDaPessoa(p, [cap("2026-11-10")], hoje).id, "pendente");
  assert.equal(treinamentoDaPessoa(p, [cap("2026-10-01")], hoje).id, "vencido");
  assert.equal(treinamentoDaPessoa({ id: "c", ativo: false }, [], hoje).id, "inativa");
});

test("comprovantes: o que precisa de atenção vem primeiro", () => {
  const hoje = "2026-10-30";
  const itens = [{ validade: "2027-03-01" }, { validade: "2026-10-10" }, { validade: "2026-11-15" }];
  assert.deepEqual(ordenarPorAtencao(itens, hoje).map((i) => i.validade), ["2026-10-10", "2026-11-15", "2027-03-01"]);
});

test("programas: Implantado aparece como Ativo e o resumo conta de verdade", () => {
  assert.deepEqual(estadoVisualDoPrograma("Implantado"), { texto: "Ativo", tom: "ativo" });
  assert.equal(estadoVisualDoPrograma("Em implantação").tom, "implantacao");
  assert.equal(resumoDosProgramas([{ status: "Implantado" }, { status: "Em implantação" }, { status: "Não iniciado" }]), "1 ativo e 1 em implantação");
  assert.equal(resumoDosProgramas([{ status: "Implantado" }, { status: "Implantado" }]), "2 ativos e 0 em implantação");
});

test("manual: máscaras e validação na hora de CPF, CNPJ e telefone", () => {
  assert.equal(mascararCpfCnpj("52998224725"), "529.982.247-25");
  assert.equal(mascararCpfCnpj("11222333000181"), "11.222.333/0001-81");
  assert.equal(mascararCpfCnpj("112223330001819999"), "11.222.333/0001-81");
  assert.equal(erroDoCpfCnpj(""), "");
  assert.match(erroDoCpfCnpj("5299"), /Faltam/);
  assert.equal(erroDoCpfCnpj("52998224725"), "");
  assert.match(erroDoCpfCnpj("52998224726"), /CPF inválido/);
  assert.equal(erroDoCpfCnpj("11222333000181"), "");
  assert.match(erroDoCpfCnpj("11222333000180"), /CNPJ inválido/);
  assert.equal(mascararTelefone("11988887777"), "(11) 98888-7777");
  assert.equal(mascararTelefone("1138186800"), "(11) 3818-6800");
  assert.match(erroDoTelefone("1198"), /incompleto/);
  assert.equal(erroDoTelefone(""), "");
  assert.equal(tomDoResumo(2, 10, "completo"), "pendente");
  assert.equal(tomDoResumo(10, 10, "completo"), "ok");
  assert.equal(tomDoResumo(0, 8, "algum"), "pendente");
  assert.equal(tomDoResumo(3, 10, "algum"), "ok");
});

test("F3: limite dos textos livres de Registros", () => {
  assert.equal(LIMITE_DO_TEXTO_LIVRE, 500);
});

test("F1: só gestão e Fiscal veem nomes no Histórico", () => {
  for (const perfil of ["Administrador", "Consultor/RT", "Cliente Gestor", "Fiscal"]) assert.equal(veNomesNoHistorico(perfil), true, perfil);
  assert.equal(veNomesNoHistorico("Executor de campo"), false);
  assert.equal(veNomesNoHistorico(null), false);
  const pop = { versao: "1.0", status: "Vigente", aprovacao: { aprovadoPor: "Maria", aprovadoEm: "2026-10-01T10:00:00.000Z" }, versoes: [] };
  const oculto = versoesDoHistorico(pop, { ocultarNomes: true });
  assert.ok(oculto.every((l) => l.aprovadaPor !== "Maria"));
});
