import assert from "node:assert/strict";
import test from "node:test";

import {
  MENSAGEM_DE_NOME_CURTO,
  adicionarEquipamentoNoSetor,
  avisoDeNomeCurto,
  avisoDeNomeRepetido,
  contagemPorSetor,
  copiarEquipamentos,
  equipamentoParecidoNoSetor,
  equipamentoRepetidoNoSetor,
  letrasDoNome,
  mesmoNomeOuSinonimo,
  moverSomandoSeRepetir,
  mudarNomeEQuantidade,
  confirmarItensFalados,
  nomeDeEquipamentoValido,
  podeAdicionarEquipamento,
} from "../lib/equipamentosCadastro.ts";
import { sugerirNomesDeEquipamento } from "../lib/autocompletarEquipamento.ts";
import { conflitoDeNomeNovo, mensagemDoConflito, rotuloDoSetor } from "../lib/nomesDeAmbiente.ts";
import { erroDoNovoNome } from "../lib/renomearAmbiente.ts";
import { migrarSetoresLegados } from "../lib/manualBase.ts";
import { sinonimosDe } from "../lib/sinonimosEquipamentos.ts";
import { avisoQuandoNaoHaSugestao, equipamentosSugeridosParaSetor, formatarCnae, setorCasaComOficial, sugestaoPorCnae } from "../lib/sugestaoPorCnae.ts";
import { limiteSugeridoParaEquipamento, normalizarCnae, tipoSugeridoPorCnae } from "../lib/tiposDeEstabelecimento.ts";

const COZINHA = "Cozinha / Produção";
const ESTOQUE = "Estoque de matérias-primas, ingredientes e embalagens";
const eq = (id, setor, nome, quantidade = 1) => ({ id, setor, nome, quantidade, estado: "Não avaliado", observacao: "" });

// ===== A1: CNAE com e sem pontuação =====
test("A1: CNAE sem pontuação, com pontuação e secundário dão a mesma sugestão", () => {
  assert.equal(normalizarCnae("5611201"), "5611201");
  assert.equal(normalizarCnae("5611-2/01"), "5611201");
  assert.equal(normalizarCnae("56.11-2-01"), "5611201");
  assert.equal(normalizarCnae(5611201), "5611201", "número também");
  assert.equal(normalizarCnae(undefined), "");
  for (const cnae of ["5611201", "5611-2/01", "56.11-2-01"]) {
    const sugestao = sugestaoPorCnae({ cnae, cnaeDescricao: "Restaurantes e similares", cnaesSecundarios: [] });
    assert.equal(sugestao.situacao, "ok", cnae);
    assert.equal(sugestao.codigo, "5611-2/01");
    assert.equal(sugestao.origem, "principal");
  }
  const secundario = sugestaoPorCnae({ cnae: "9999999", cnaeDescricao: "Outra", cnaesSecundarios: [{ codigo: "5611201", descricao: "Restaurantes" }] });
  assert.equal(secundario.situacao, "ok");
  assert.equal(secundario.origem, "secundario");
  assert.equal(tipoSugeridoPorCnae("9999-9/99", [{ codigo: "5611-2/01" }]).tipo, "restaurante");
  assert.equal(formatarCnae("5611201"), "5611-2/01");
});

test("A1: o setor 'Cozinha' da empresa casa com 'Cozinha / Produção' do pacote (nome curto, vínculo ou apelido do catálogo)", () => {
  const sugestao = sugestaoPorCnae({ cnae: "5611201", cnaeDescricao: "Restaurantes e similares" });
  const mesmo = (a, b) => a.toLowerCase() === b.toLowerCase();
  const doCozinha = equipamentosSugeridosParaSetor(sugestao, COZINHA, [], mesmo);
  assert.ok(doCozinha.length > 0, "Cozinha / Produção recebe as sugestões do pacote");
  assert.ok(doCozinha.some((item) => item.nome === "Fogão"));
  assert.deepEqual(equipamentosSugeridosParaSetor(sugestao, COZINHA, [], mesmo).map((i) => i.nome), doCozinha.map((i) => i.nome), "nome oficial completo dá o mesmo resultado");
  assert.ok(equipamentosSugeridosParaSetor(sugestao, "Cozinha", [], mesmo, { Cozinha: COZINHA }).length > 0, "próprio com vínculo explícito casa");
  assert.ok(equipamentosSugeridosParaSetor(sugestao, ESTOQUE, [], mesmo).some((i) => i.nome === "Freezer"), "o oficial casa pelo seu nome");
  assert.equal(equipamentosSugeridosParaSetor(sugestao, "Cozinha da frente", [], mesmo).length, 0, "sem vínculo, nome sem relação não recebe");
  assert.ok(equipamentosSugeridosParaSetor(sugestao, "Cozinha da frente", [], mesmo, { "Cozinha da frente": COZINHA }).length > 0, "vínculo com o setor oficial vale");
  assert.equal(equipamentosSugeridosParaSetor(sugestao, COZINHA, ["fogão"], mesmo).some((i) => i.nome === "Fogão"), false, "o que o setor já tem não volta");
  assert.equal(setorCasaComOficial("Estoque seco", ESTOQUE), true, "apelido do catálogo (migra para o oficial)");
  assert.equal(setorCasaComOficial("Salão", COZINHA), false);
});

test("A1: Churrascaria do Chico: setor Cozinha oficial, legado/migrado ou apelido recebe as sugestões; só próprio de verdade sem vínculo não", () => {
  const empresa = { cnae: "5611201", cnaeDescricao: "Restaurantes e similares", cnaesSecundarios: [] };
  const sugestao = sugestaoPorCnae(empresa);
  const mesmo = (a, b) => a.toLowerCase() === b.toLowerCase();
  assert.equal(sugestao.situacao, "ok");
  const migrados = migrarSetoresLegados(["Cozinha", "Estoque seco"]);
  assert.ok(migrados.includes(COZINHA));
  for (const setor of [COZINHA, "Cozinha", "cozinha", ...migrados.filter((s) => s === COZINHA)]) {
    const itens = equipamentosSugeridosParaSetor(sugestao, setor, [], mesmo);
    assert.ok(itens.some((i) => i.nome === "Fogão"), `setor "${setor}" recebe as sugestões`);
  }
  assert.ok(equipamentosSugeridosParaSetor(sugestao, "Copa", [], mesmo).length > 0, "apelido do catálogo");
  assert.equal(equipamentosSugeridosParaSetor(sugestao, "Cozinha da frente", [], mesmo).length, 0, "próprio de verdade sem vínculo");
  assert.ok(equipamentosSugeridosParaSetor(sugestao, "Cozinha da frente", [], mesmo, { "Cozinha da frente": COZINHA }).length > 0, "com vínculo");
  assert.equal(avisoQuandoNaoHaSugestao(sugestao, equipamentosSugeridosParaSetor(sugestao, "Cozinha da frente", [], mesmo)), "sem-sugestao-do-setor");
});

test("A1: nunca em silêncio: sem CNAE e sem sugestão para o setor têm aviso próprio", () => {
  assert.equal(avisoQuandoNaoHaSugestao(sugestaoPorCnae({ cnae: "" }), []), "sem-cnae");
  assert.equal(avisoQuandoNaoHaSugestao(sugestaoPorCnae({ cnae: "9999999" }), []), "sem-sugestao-do-setor");
  const ok = sugestaoPorCnae({ cnae: "5611201" });
  assert.equal(avisoQuandoNaoHaSugestao(ok, []), "sem-sugestao-do-setor", "CNAE com pacote, mas o setor não tem item");
  assert.equal(avisoQuandoNaoHaSugestao(ok, [{ nome: "Fogão" }]), null, "há sugestão: aparece o lote, sem aviso");
});

// ===== A3(c): nome repetido na hora =====
test("A3(c): nome igual a setor oficial marcado ou a outro ambiente próprio é conflito (sem acento e sem diferença de caixa)", () => {
  const setores = [COZINHA, "Salão da frente"];
  const oficial = conflitoDeNomeNovo("cozinha", setores);
  assert.deepEqual(oficial, { tipo: "oficial", setor: COZINHA, marcado: true });
  assert.equal(mensagemDoConflito(oficial), "Já existe o setor oficial Cozinha / Produção");
  assert.equal(conflitoDeNomeNovo("COZINHA / PRODUCAO", setores)?.tipo, "oficial", "nome completo, sem acento");
  const proprio = conflitoDeNomeNovo("  salao DA frente ", setores);
  assert.deepEqual(proprio, { tipo: "proprio", setor: "Salão da frente" });
  assert.equal(mensagemDoConflito(proprio), "Já existe um ambiente com este nome");
  for (const apelido of ["Churrasqueira", "Copa", "Pré-preparo", "Preparo/cocção", "Salão de Atendimento", "Recebimento de mercadorias"]) {
    const c = conflitoDeNomeNovo(apelido, [COZINHA]);
    assert.equal(c?.tipo, "oficial", apelido);
    assert.ok(mensagemDoConflito(c).includes("setor oficial"), apelido);
  }
  assert.equal(mensagemDoConflito(conflitoDeNomeNovo("Copa", [COZINHA])), "Já existe o setor oficial Cozinha / Produção");
  assert.equal(mensagemDoConflito(conflitoDeNomeNovo("Copa", [])), "Esse nome é o setor oficial Cozinha / Produção", "oficial ainda não marcado");
  assert.match(erroDoNovoNome("Sala 2", "Churrasqueira", ["Sala 2"]), /Já existe/, "renomear usa a mesma regra");
  assert.equal(conflitoDeNomeNovo("Sushi bar", setores), null);
  assert.equal(conflitoDeNomeNovo("", setores), null);
  assert.equal(mensagemDoConflito(null), "");
  assert.equal(conflitoDeNomeNovo("Cozinha", ["Salão"])?.marcado, false, "setor oficial ainda não marcado também avisa, mas sem vincular");
});

test("A3: ambientes com o mesmo nome na lista: o próprio mostra '(próprio)'", () => {
  const setores = [COZINHA, "Cozinha", "Salão"];
  assert.equal(rotuloDoSetor(COZINHA, setores), "Cozinha");
  assert.equal(rotuloDoSetor("Cozinha", setores), "Cozinha (próprio)");
  assert.equal(rotuloDoSetor("Salão", setores), "Salão");
  assert.equal(rotuloDoSetor("Cozinha", ["Cozinha"]), "Cozinha", "sozinho, sem sufixo");
});

// ===== A6(c): dois setores com o mesmo nome não misturam equipamentos =====
test("A6(c): 'Cozinha' próprio e 'Cozinha' oficial guardam cada um os seus equipamentos", () => {
  const setores = ["Cozinha", COZINHA];
  const lista = [eq("a", "Cozinha", "Fogão", 1), eq("b", COZINHA, "Fogão", 2), eq("c", COZINHA, "Forno")];
  assert.deepEqual(contagemPorSetor(lista, setores), { Cozinha: 1, [COZINHA]: 2 });
  assert.equal(equipamentoRepetidoNoSetor(lista, "Cozinha", "fogão")?.id, "a");
  assert.equal(equipamentoRepetidoNoSetor(lista, COZINHA, "fogão")?.id, "b");
  assert.equal(equipamentoRepetidoNoSetor(lista, "Cozinha", "Forno"), undefined, "o Forno é só do oficial");
  const novo = adicionarEquipamentoNoSetor(lista, { id: "d", setor: "Cozinha", nome: "Forno", quantidade: 1 }).equipamentos;
  assert.equal(novo.filter((i) => i.setor === COZINHA).length, 2, "o oficial não ganhou nada");
  assert.equal(novo.filter((i) => i.setor === "Cozinha").length, 2);
  const movido = moverSomandoSeRepetir(lista, "a", COZINHA);
  assert.equal(movido.somouEm?.id, "b", "mover soma só no item do destino escolhido");
  assert.equal(movido.somouEm?.quantidade, 3);
  const copia = copiarEquipamentos(lista, ["c"], ["Cozinha"], () => "novo");
  assert.equal(copia.equipamentos.filter((i) => i.setor === COZINHA).length, 2, "a origem continua só com os seus");
  assert.equal(copia.equipamentos.find((i) => i.id === "novo")?.setor, "Cozinha");
});

// ===== A7(a): nome com no mínimo 3 letras =====
test("A7(a): menos de 3 letras bloqueia Adicionar e mostra a mensagem na hora", () => {
  assert.equal(letrasDoNome("Re"), 2);
  assert.equal(letrasDoNome(" r e 1 "), 2, "números e espaços não contam");
  assert.equal(nomeDeEquipamentoValido("Re"), false);
  assert.equal(nomeDeEquipamentoValido("Réa"), true);
  assert.equal(podeAdicionarEquipamento("Re", undefined, null), false, "'Re' + Enter não cadastra 're'");
  assert.equal(podeAdicionarEquipamento("Rei", undefined, null), true);
  assert.equal(MENSAGEM_DE_NOME_CURTO, "Digite o nome do equipamento (mínimo 3 letras)");
  assert.equal(avisoDeNomeCurto("Re", false), MENSAGEM_DE_NOME_CURTO, "enquanto digita");
  assert.equal(avisoDeNomeCurto("", false), "", "campo vazio e sem tentativa: sem mensagem");
  assert.equal(avisoDeNomeCurto("", true), MENSAGEM_DE_NOME_CURTO, "Enter com o campo vazio");
  assert.equal(avisoDeNomeCurto("Coifa", true), "");
});

// ===== A7(b): autocompletar =====
test("A7(b): autocompletar a partir de 2 letras, até 6 sugestões, catálogo e equipamentos da empresa", () => {
  assert.deepEqual(sugerirNomesDeEquipamento("r", []), [], "1 letra não sugere");
  const re = sugerirNomesDeEquipamento("re", []);
  assert.ok(re.includes("Refrigerador"));
  assert.ok(re.length <= 6);
  assert.ok(sugerirNomesDeEquipamento("camara", []).includes("Câmara fria"), "sem acento");
  const comEmpresa = sugerirNomesDeEquipamento("ba", ["Batedeira planetária"]);
  assert.equal(comEmpresa[0], "Batedeira planetária", "o que a empresa já tem vem primeiro");
  assert.ok(comEmpresa.includes("Balança"));
  assert.equal(new Set(comEmpresa.map((n) => n.toLowerCase())).size, comEmpresa.length, "sem repetir");
  assert.equal(sugerirNomesDeEquipamento("freezer", []).includes("Freezer"), false, "não devolve o que já está digitado por inteiro");
  assert.equal(sugerirNomesDeEquipamento("zz", []).length, 0);
  assert.equal(sugerirNomesDeEquipamento("e", ["Estufa"]).length, 0);
  const muitos = sugerirNomesDeEquipamento("ar", ["Arara 1", "Arara 2", "Arara 3", "Arara 4", "Arara 5", "Arara 6", "Arara 7"]);
  assert.equal(muitos.length, 6);
});

// ===== A7(c): sinônimos =====
test("A7(c): Geladeira = Refrigerador no aviso de repetido e no limite sugerido", () => {
  assert.deepEqual(sinonimosDe("geladeira").sort(), ["Refrigerador", "Refrigeradora"].sort());
  assert.deepEqual(sinonimosDe("Fogão"), []);
  assert.equal(mesmoNomeOuSinonimo("Geladeira", "refrigerador"), true);
  assert.equal(mesmoNomeOuSinonimo("Micro-ondas", "Microondas"), true);
  assert.equal(mesmoNomeOuSinonimo("Geladeira", "Freezer"), false);
  assert.equal(mesmoNomeOuSinonimo("Mesa 1", "Mesa1"), false, "espaços contam fora da lista de sinônimos");
  assert.equal(nomeDeEquipamentoValido("AB"), false);
  assert.equal(mudarNomeEQuantidade([eq("a", COZINHA, "Forno")], "a", "Fo", 1)[0].nome, "Forno", "edição também exige 3 letras");
  assert.equal(confirmarItensFalados([], [{ id: "x", setor: COZINHA, nome: "Re", quantidade: 1 }]).criados.length, 0, "voz rejeita nome curto");
  const lista = [eq("a", COZINHA, "Geladeira", 1), eq("b", ESTOQUE, "Refrigerador")];
  const parecido = equipamentoParecidoNoSetor(lista, COZINHA, "Refrigerador");
  assert.equal(parecido?.id, "a");
  assert.equal(avisoDeNomeRepetido(parecido, "Refrigerador"), "Parece Geladeira (Qtd 1) neste setor");
  assert.equal(avisoDeNomeRepetido(parecido, "geladeira"), "Já existe Geladeira (Qtd 1) neste setor", "nome igual mantém o aviso de sempre");
  assert.equal(avisoDeNomeRepetido(parecido), "Já existe Geladeira (Qtd 1) neste setor", "sem o nome digitado, o aviso de sempre");
  assert.equal(equipamentoParecidoNoSetor(lista, COZINHA, "Freezer"), undefined);
  assert.equal(equipamentoRepetidoNoSetor(lista, COZINHA, "Refrigerador"), undefined, "a edição de nome continua só pelo nome igual");
  assert.equal(podeAdicionarEquipamento("Refrigerador", parecido, null), false, "como o aviso atual: só depois de Somar ou Outro item");
  assert.equal(podeAdicionarEquipamento("Refrigerador", parecido, "somar"), true);
  assert.equal(limiteSugeridoParaEquipamento("Geladeira")?.id, "refrigerado");
  assert.equal(limiteSugeridoParaEquipamento("Congelador")?.id, "congelado");
  assert.equal(limiteSugeridoParaEquipamento("Fogão"), undefined, "sem limite conhecido, nada é sugerido");
});
