import assert from "node:assert/strict";
import test from "node:test";

import { camposDaProposta, mensagemDeFalhaDaConsulta, propostaDaConsulta, semCpf, titularEPessoaFisica } from "../lib/cnpjConsulta.ts";
import { copiarEquipamentos, confirmarSugestao, definirLimite, desfazerCopia, equipamentosDoPacote } from "../lib/equipamentosCadastro.ts";
import { FONTE_DOS_SETORES, sugerirSetorOficial } from "../lib/setorOficialSugerido.ts";
import { PERGUNTAS_SEMPRE_PADRAO, TIPOS_DE_ESTABELECIMENTO, limiteSugeridoParaEquipamento, pacoteDoTipo, tipoSugeridoPorCnae } from "../lib/tiposDeEstabelecimento.ts";
import { SETORES_OFICIAIS_MANUAL } from "../lib/manualBase.ts";
import { erroDoCnpj } from "../lib/regrasDoPacote3.ts";

test("CNPJ: valida os dígitos na hora, no campo (faltando, sobrando, dígito verificador errado)", () => {
  assert.equal(erroDoCnpj("11.222.333/0001-81"), "");
  assert.match(erroDoCnpj("11222333"), /Faltam 6 dígitos/);
  assert.match(erroDoCnpj("11222333000182"), /inválido/);
  assert.equal(erroDoCnpj(""), "");
});

const brutaDeEmpresa = {
  source: "BrasilAPI", cnpj: "11222333000181", razao_social: "RESTAURANTE SABOR LTDA", nome_fantasia: "Sabor da Casa", descricao_situacao_cadastral: "ATIVA",
  cnae_fiscal: 5611201, cnae_fiscal_descricao: "Restaurantes e similares", cnaes_secundarios: [{ codigo: 5611203, descricao: "Lanchonetes" }, { codigo: 0, descricao: "" }],
  natureza_juridica: "Sociedade Empresária Limitada", codigo_natureza_juridica: 2062, logradouro: "RUA A", numero: "10", cep: "90000000", municipio: "PORTO ALEGRE", uf: "RS",
};

test("consulta de CNPJ vira proposta com razão social, fantasia, endereço, CNAE principal e secundários e situação", () => {
  const p = propostaDaConsulta(brutaDeEmpresa);
  assert.equal(p.razaoSocial, "RESTAURANTE SABOR LTDA");
  assert.equal(p.nomeFantasia, "Sabor da Casa");
  assert.deepEqual(p.cnaePrincipal, { codigo: "5611201", descricao: "Restaurantes e similares" });
  assert.deepEqual(p.cnaesSecundarios, [{ codigo: "5611203", descricao: "Lanchonetes" }], "o secundário vazio (código 0) não entra");
  assert.equal(p.situacaoAtiva, true);
  assert.deepEqual(p.avisos, []);
  const { valores, campos } = camposDaProposta(p);
  assert.equal(valores.cnae, "5611201");
  assert.ok(campos.includes("logradouro") && campos.includes("municipio"));
});

test("situação cadastral não ativa: avisa, sem bloquear", () => {
  const p = propostaDaConsulta({ ...brutaDeEmpresa, descricao_situacao_cadastral: "BAIXADA" });
  assert.equal(p.situacaoAtiva, false);
  assert.match(p.avisos[0], /Situação cadastral: BAIXADA/);
  assert.equal(p.razaoSocial, "RESTAURANTE SABOR LTDA", "o cadastro continua possível");
});

test("MEI / empresário individual: nome do titular e CPF não são propostos, guardados nem exibidos", () => {
  const mei = propostaDaConsulta({ ...brutaDeEmpresa, razao_social: "MARIA DA SILVA 12345678900", nome_fantasia: "Marmitas da Maria", natureza_juridica: "Empresário (Individual)", codigo_natureza_juridica: 2135, opcao_pelo_mei: true });
  assert.equal(mei.titularPessoaFisica, true);
  assert.equal(mei.razaoSocial, "", "a razão social do MEI é o nome da pessoa e fica de fora");
  assert.equal(mei.nomeFantasia, "Marmitas da Maria");
  assert.match(mei.avisos[0], /nome do titular e o CPF não são guardados/);
  const { valores } = camposDaProposta(mei);
  assert.equal("razaoSocial" in valores, false);
  assert.equal(JSON.stringify(mei).includes("MARIA DA SILVA"), false);
  assert.equal(JSON.stringify(mei).includes("12345678900"), false);
  assert.equal(titularEPessoaFisica({ codigoNaturezaJuridica: "213-5" }), true);
  assert.equal(titularEPessoaFisica({ naturezaJuridica: "Sociedade Empresária Limitada" }), false);
  assert.equal(semCpf("Fantasia 123.456.789-00"), "Fantasia");
});

test("falha da consulta não trava: manual segue e a consulta pode ser refeita depois como proposta", () => {
  assert.match(mensagemDeFalhaDaConsulta(true), /Preencha à mão/);
  assert.match(mensagemDeFalhaDaConsulta(false), /Sem sinal: preencha à mão[\s\S]*proposta/);
});

test("CNAE sugere o tipo (com troca pelo RT); sem correspondência cai em 'Outro' sem bloquear", () => {
  assert.equal(tipoSugeridoPorCnae("5611201").tipo, "restaurante");
  assert.equal(tipoSugeridoPorCnae("5611-2/03").tipo, "lanchonete");
  assert.equal(tipoSugeridoPorCnae("4722901").tipo, "acougue");
  assert.equal(tipoSugeridoPorCnae("4729602").tipo, "conveniencia");
  assert.equal(tipoSugeridoPorCnae("5620101").tipo, "uan");
  assert.equal(tipoSugeridoPorCnae("9999999").tipo, "outro");
  assert.equal(tipoSugeridoPorCnae("9999999").correspondencia, false);
  assert.equal(tipoSugeridoPorCnae("9999999", [{ codigo: "1091102" }]).tipo, "padaria", "sem correspondência no principal, olha os secundários");
  assert.ok(TIPOS_DE_ESTABELECIMENTO.length >= 10 && TIPOS_DE_ESTABELECIMENTO.some((t) => t.id === "outro"));
});

test("pacote por tipo: ambientes são setores oficiais, equipamentos e fluxos propostos; perguntas SEMPRE as padrão", () => {
  for (const tipo of TIPOS_DE_ESTABELECIMENTO) {
    const pacote = pacoteDoTipo(tipo.id);
    assert.ok(pacote.ambientes.length > 0 && pacote.ambientes.every((a) => SETORES_OFICIAIS_MANUAL.includes(a)), tipo.id);
    for (const e of pacote.equipamentos) assert.ok(pacote.ambientes.includes(e.ambiente), `${tipo.id}: ${e.nome} em ambiente do pacote`);
  }
  assert.equal(PERGUNTAS_SEMPRE_PADRAO, true);
  // nenhuma estrutura do pacote fala de perguntas
  assert.deepEqual(Object.keys(pacoteDoTipo("restaurante")).sort(), ["ambientes", "equipamentos", "fluxos"]);
  assert.equal(limiteSugeridoParaEquipamento("Câmara fria")?.id, "refrigerado");
  assert.equal(limiteSugeridoParaEquipamento("Bancada de inox"), undefined);
});

test("nome próprio sugere o setor oficial, com fonte da norma ou fonte vazia", () => {
  const salao = sugerirSetorOficial("Salão");
  assert.equal(salao.oficial, "Refeitório e salão de consumação");
  assert.equal(salao.fonte.norma, "Portaria SES/RS nº 799/2023");
  assert.match(salao.fonte.link, /portaria-ses-799-2023\.pdf/);
  assert.match(salao.fonte.conferidoEm, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(sugerirSetorOficial("Cozinha da frente").oficial, "Cozinha / Produção");
  assert.equal(sugerirSetorOficial("Banheiro feminino dos clientes").oficial, "Banheiro feminino de clientes");
  assert.equal(sugerirSetorOficial("Banheiro"), null, "ambíguo: não sugere");
  assert.equal(sugerirSetorOficial("Sala da diretoria"), null);
  assert.equal(sugerirSetorOficial("Cozinha / Produção"), null, "setor oficial não recebe sugestão");
  // sem texto da norma encontrado: fonte vazia (nada inventado)
  assert.equal(sugerirSetorOficial("DML do fundo").fonte, null);
  assert.equal(sugerirSetorOficial("Central de gás nova").fonte, null);
  assert.equal(FONTE_DOS_SETORES["Depósito de material de limpeza (DML)"], null);
});

const lista = () => [
  { id: "a", setor: "Cozinha / Produção", nome: "Refrigerador", quantidade: 2, estado: "Não avaliado", observacao: "porta com borracha ruim" },
  { id: "b", setor: "Cozinha / Produção", nome: "Fogão", quantidade: 1, estado: "Não avaliado", observacao: "" },
];

test("copiar equipamentos para outros ambientes: leva nome e quantidade, não leva observação, não repete e desfaz", () => {
  let n = 0;
  const novoId = () => `novo-${++n}`;
  const r = copiarEquipamentos(lista(), ["a"], ["Estoque de matérias-primas, ingredientes e embalagens", "Cozinha / Produção"], novoId);
  assert.equal(r.criados.length, 1, "o ambiente de origem é ignorado");
  const copia = r.equipamentos.find((e) => e.id === "novo-1");
  assert.deepEqual([copia.setor, copia.nome, copia.quantidade, copia.observacao], ["Estoque de matérias-primas, ingredientes e embalagens", "Refrigerador", 2, ""]);
  const de_novo = copiarEquipamentos(r.equipamentos, ["a"], ["Estoque de matérias-primas, ingredientes e embalagens"], novoId);
  assert.equal(de_novo.criados.length, 0);
  assert.equal(de_novo.ignorados, 1, "quem já tem o mesmo equipamento não recebe repetido");
  assert.equal(de_novo.equipamentos, r.equipamentos, "nada mudou: mesmo array");
  const desfeito = desfazerCopia(r.equipamentos, r.criados);
  assert.deepEqual(desfeito.map((e) => e.id), ["a", "b"], "desfazer tira só o que a cópia criou");
});

test("equipamentos do pacote vêm marcados como sugeridos, com limite proposto; o RT confirma e troca o limite", () => {
  let n = 0;
  const pacote = pacoteDoTipo("restaurante");
  const marcados = ["Cozinha / Produção", "Estoque de matérias-primas, ingredientes e embalagens"];
  const itens = equipamentosDoPacote(pacote.equipamentos, marcados, [], () => `p-${++n}`, (nome) => limiteSugeridoParaEquipamento(nome)?.id);
  assert.ok(itens.length > 0 && itens.every((e) => e.sugerido === true && marcados.includes(e.setor)));
  const camara = itens.find((e) => e.nome === "Câmara fria");
  assert.equal(camara.limiteTemperaturaId, "refrigerado");
  assert.equal(camara.limiteConfirmado, undefined, "proposto, ainda não confirmado");
  assert.equal(itens.find((e) => e.nome === "Fogão").limiteTemperaturaId, undefined, "sem limite conhecido: nada é classificado");
  const confirmado = confirmarSugestao(itens, camara.id).find((e) => e.id === camara.id);
  assert.deepEqual([confirmado.sugerido, confirmado.limiteConfirmado], [undefined, true]);
  const trocado = definirLimite(itens, camara.id, "congelado").find((e) => e.id === camara.id);
  assert.deepEqual([trocado.limiteTemperaturaId, trocado.limiteConfirmado], ["congelado", true]);
  assert.equal(definirLimite(itens, camara.id, "").find((e) => e.id === camara.id).limiteTemperaturaId, undefined);
  // já existente no ambiente: não duplica
  assert.equal(equipamentosDoPacote(pacote.equipamentos, marcados, itens, () => "x", () => undefined).length, 0);
});

test("perguntas sempre as padrão: nenhum código de checklist ou questionário usa o tipo, o CNAE ou o pacote", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const dir = new URL("../lib/", import.meta.url);
  const arquivos = readdirSync(dir).filter((nome) => /(checklist|questionario|manualChecklist|ambientesVisita)/i.test(nome) && nome.endsWith(".ts"));
  assert.ok(arquivos.length >= 2);
  for (const nome of arquivos) {
    const texto = readFileSync(new URL(nome, dir), "utf8");
    assert.equal(/tiposDeEstabelecimento|tipoSugeridoPorCnae|pacoteDoTipo/.test(texto), false, `${nome} não pode depender do tipo de estabelecimento`);
  }
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.equal(/criarChecklist\([^)]*tipo/.test(page.replace(/\s+/g, " ")), false, "criarChecklist não recebe o tipo");
});

test("o servidor não devolve nome do titular nem CPF de MEI (a rota aplica a proteção antes de responder)", async () => {
  const { readFileSync } = await import("node:fs");
  const rota = readFileSync(new URL("../app/api/cnpj/[cnpj]/route.ts", import.meta.url), "utf8");
  assert.ok(rota.includes("protegerDadosDePessoa(data)") && rota.includes("titularEPessoaFisica") && rota.includes("semCpf"));
  assert.equal((rota.match(/protegerDadosDePessoa\(data\)/g) || []).length, 2, "vale para as duas fontes (BrasilAPI e CNPJ.ws)");
});
