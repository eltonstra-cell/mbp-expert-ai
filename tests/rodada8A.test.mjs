// Rodada 8, parte A (cadastro): só lógica. Quadro de sugestões (A1), sinônimos (A2), nome ao salvar e autocompletar (A3), casamento EXATO do setor (A4),
// sobras por nome e sinônimo (A5), faixa e vínculo em lote nos Ambientes (A6), CNAE e tipo (A7) e agrupamento dos avisos de um toque (A9).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { CATALOGO_DE_NOMES_DE_EQUIPAMENTOS } from "../lib/catalogoNomesEquipamentos.ts";
import { sugerirNomesDeEquipamento } from "../lib/autocompletarEquipamento.ts";
import {
  JANELA_DE_AGRUPAMENTO_MS,
  acumularAdicao,
  adicionarEquipamentoNoSetor,
  botaoDoLote,
  desfazerCopia,
  equipamentoRepetidoNoSetor,
  mesmoNomeOuSinonimo,
  mostrarQuantidadeNaLinha,
  mudarNomeEQuantidade,
  normalizarNomeDeEquipamento,
  textoDoAvisoDeAdicoes,
} from "../lib/equipamentosCadastro.ts";
import { GRUPOS_DE_SINONIMOS, mesmoEquipamentoOuSinonimo } from "../lib/sinonimosEquipamentos.ts";
import {
  avisoQuandoNaoHaSugestao,
  equipamentosSugeridosParaSetor,
  faixaDeAmbientesVisivel,
  listaComPontoFinal,
  oficialExatoDoSetor,
  setorCasaComOficial,
  sugestaoPorCnae,
  tituloDaSugestao,
} from "../lib/sugestaoPorCnae.ts";
import {
  OPCAO_SEGUIR_O_CNAE,
  MENSAGEM_CNAE_NAO_RECONHECIDO,
  TIPO_OUTRO_ESCOLHIDO,
  cnaeBloqueiaSalvar,
  cnaeReconhecido,
  consultaPodeTrocarOTipo,
  mensagemSemSugestaoDoCnae,
  limiteSugeridoParaEquipamento,
  nomeCurtoDoSetor,
  pacoteDoTipo,
  tipoEfetivoDaEmpresa,
  validarCnae,
  valorDoTipoParaGuardar,
} from "../lib/tiposDeEstabelecimento.ts";
import { SETORES_OFICIAIS_MANUAL } from "../lib/manualBase.ts";
import { aplicarVinculosEmLote, desfazerVinculosEmLote, quantosExatos, textoDosVinculados, vinculosSugeridos } from "../lib/vinculoEmLote.ts";

const [RECEBIMENTO, ESTOQUE, DML, , COZINHA] = SETORES_OFICIAIS_MANUAL;
const lerFonte = (caminho) => readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");
const eq = (id, setor, nome, quantidade = 1) => ({ id, setor, nome, quantidade, estado: "Não avaliado", observacao: "" });
const restaurante = () => sugestaoPorCnae({ cnae: "5611201" });
const nomes = (lista) => lista.map((item) => item.nome);

// ===== A1: Qtd só nas linhas marcadas; botão azul só com N > 0 =====
test("A1: a quantidade só aparece na linha marcada; o botão 'Adicionar N itens' liga só com N > 0", () => {
  assert.equal(mostrarQuantidadeNaLinha(true), true);
  assert.equal(mostrarQuantidadeNaLinha(false), false);
  assert.deepEqual(botaoDoLote(0), { rotulo: "Adicionar itens", habilitado: false });
  assert.deepEqual(botaoDoLote(1), { rotulo: "Adicionar 1 item", habilitado: true });
  assert.deepEqual(botaoDoLote(5), { rotulo: "Adicionar 5 itens", habilitado: true });
  const tela = lerFonte("components/pc/CadastroEquipamentos.tsx");
  assert.ok(tela.includes("mostrarQuantidadeNaLinha(marcado) &&") && tela.includes("botaoDoLote(loteAtual.marcados.length)"), "a tela usa as regras");
  assert.ok(lerFonte("app/cadastro-estrutura.css").includes(".cadest-btn--azul,.cadest-azul .esc-botao{border-color:#2B54CF;background:#2B54CF;color:#fff}"), "azul #2B54CF com texto branco");
});

// ===== A2: o grupo Estufa = Balcão térmico saiu =====
test("A2: 'Estufa' e 'Balcão térmico' não são mais sinônimos; os outros grupos continuam", () => {
  assert.equal(mesmoEquipamentoOuSinonimo("Estufa", "Balcão térmico"), false);
  assert.equal(mesmoEquipamentoOuSinonimo("Estufa", "Estufa / balcão térmico"), false);
  assert.equal(GRUPOS_DE_SINONIMOS.some((grupo) => grupo.some((nome) => /estufa|t[ée]rmico/i.test(nome))), false);
  assert.equal(GRUPOS_DE_SINONIMOS.length, 6);
  assert.equal(mesmoEquipamentoOuSinonimo("Geladeira", "Refrigerador"), true);
  assert.equal(mesmoEquipamentoOuSinonimo("Freezer", "Congelador"), true);
  assert.equal(mesmoEquipamentoOuSinonimo("Fritadeira", "Fritador"), true);
  assert.equal(limiteSugeridoParaEquipamento("Geladeira")?.id, "refrigerado");
  assert.equal(limiteSugeridoParaEquipamento("Congelador")?.id, "congelado");
});

// ===== A3: nome ao salvar e catálogo do autocompletar =====
test("A3: o nome é gravado sem espaços sobrando, sem ponto final e com a primeira letra maiúscula", () => {
  assert.equal(normalizarNomeDeEquipamento("  fogão   industrial. "), "Fogão industrial");
  assert.equal(normalizarNomeDeEquipamento("coifa.."), "Coifa");
  assert.equal(normalizarNomeDeEquipamento("água quente"), "Água quente");
  assert.equal(normalizarNomeDeEquipamento("Freezer horizontal"), "Freezer horizontal");
  assert.equal(normalizarNomeDeEquipamento("   "), "");
  const novo = adicionarEquipamentoNoSetor([], { id: "a", setor: COZINHA, nome: "  bancada   de aço inoxidável. ", quantidade: 1 });
  assert.equal(novo.criado.nome, "Bancada de aço inoxidável");
  // ponto final de abreviatura curta (até 4 letras, nome com mais de uma palavra) fica
  assert.equal(normalizarNomeDeEquipamento("câmara vert."), "Câmara vert.");
  assert.equal(normalizarNomeDeEquipamento("balcão exp.."), "Balcão exp.");
  assert.equal(normalizarNomeDeEquipamento("Coifa."), "Coifa", "uma palavra só: o ponto sai");
  // nome com ponto final e o mesmo sem ponto contam como repetido
  assert.ok(equipamentoRepetidoNoSetor([eq("1", COZINHA, "Coifa")], COZINHA, "coifa."));
});

test("A3: itens existentes não são reformatados; só o que for editado", () => {
  const antes = [eq("1", COZINHA, "geladeira  velha. "), eq("2", COZINHA, "forno")];
  const semMexerNoNome = mudarNomeEQuantidade(antes, "1", "geladeira  velha. ", 3);
  assert.equal(semMexerNoNome[0].nome, "geladeira  velha. ", "nome intocado, só a quantidade muda");
  assert.equal(semMexerNoNome[0].quantidade, 3);
  assert.equal(semMexerNoNome[1].nome, "forno", "os outros itens nunca mudam");
  const editado = mudarNomeEQuantidade(antes, "1", " geladeira industrial. ", 1);
  assert.equal(editado[0].nome, "Geladeira industrial");
});

test("A3: o autocompletar usa só o catálogo de nomes e os equipamentos da PRÓPRIA empresa", () => {
  assert.ok(CATALOGO_DE_NOMES_DE_EQUIPAMENTOS.length >= 22 && CATALOGO_DE_NOMES_DE_EQUIPAMENTOS.includes("Processador de alimentos") && CATALOGO_DE_NOMES_DE_EQUIPAMENTOS.includes("Lixeira com pedal"));
  assert.ok(sugerirNomesDeEquipamento("fri", []).includes("Fritadeira"));
  assert.ok(sugerirNomesDeEquipamento("proc", []).includes("Processador de alimentos"));
  assert.ok(sugerirNomesDeEquipamento("bat", ["Batedeira planetária"]).includes("Batedeira planetária"), "equipamento já cadastrado na empresa");
  // nomes que só existiam nos pacotes por tipo ou nos sinônimos não aparecem mais
  assert.equal(sugerirNomesDeEquipamento("mass", []).length, 0, "Masseira era só do pacote da padaria");
  assert.equal(sugerirNomesDeEquipamento("estu", []).length, 0, "Estufa / balcão térmico era só do pacote");
  assert.equal(sugerirNomesDeEquipamento("cong", []).length, 0, "Congelador era só sinônimo");
  const fonte = lerFonte("lib/autocompletarEquipamento.ts");
  assert.equal(/from "\.\/tiposDeEstabelecimento/.test(fonte), false, "não depende do pacote por tipo");
  assert.equal(/TODOS_OS_NOMES_COM_SINONIMO/.test(fonte), false);
  assert.ok(lerFonte("lib/catalogoNomesEquipamentos.ts").includes("a validar pela RT"));
  // o catálogo não gera limite de temperatura nem sugestão em lote: é só lista de nomes
  assert.equal(/limiteSugerido|limitesDeTemperatura|pacoteDoTipo/.test(lerFonte("lib/catalogoNomesEquipamentos.ts")), false);
  assert.equal(limiteSugeridoParaEquipamento("Batedeira"), undefined);
  assert.equal(/import /.test(lerFonte("lib/catalogoNomesEquipamentos.ts")), false, "arquivo só de dados");
});

// ===== A4: casamento EXATO do setor =====
test("A4: 'Depósito de Embalagens e Descartáveis' NÃO recebe sugestões; 'Estoque' e 'Cozinha / Produção' recebem", () => {
  const sugestao = restaurante();
  const mesmo = mesmoNomeOuSinonimo;
  assert.equal(equipamentosSugeridosParaSetor(sugestao, "Depósito de Embalagens e Descartáveis", [], mesmo).length, 0);
  assert.equal(setorCasaComOficial("Depósito de Embalagens e Descartáveis", ESTOQUE), false);
  assert.equal(oficialExatoDoSetor("Depósito de Embalagens e Descartáveis"), null);
  const doEstoque = nomes(equipamentosSugeridosParaSetor(sugestao, "Estoque", [], mesmo));
  assert.ok(doEstoque.includes("Câmara fria") && doEstoque.includes("Freezer"), "nome curto");
  assert.ok(nomes(equipamentosSugeridosParaSetor(sugestao, ESTOQUE, [], mesmo)).includes("Freezer"), "nome oficial");
  assert.ok(nomes(equipamentosSugeridosParaSetor(sugestao, "Cozinha / Produção", [], mesmo)).includes("Fogão"));
  assert.ok(nomes(equipamentosSugeridosParaSetor(sugestao, "cozinha / producao", [], mesmo)).includes("Fogão"), "sem acento e sem diferença de caixa");
  assert.ok(nomes(equipamentosSugeridosParaSetor(sugestao, "Cozinha", [], mesmo)).includes("Fogão"), "renomeação equivalente do catálogo");
  assert.ok(nomes(equipamentosSugeridosParaSetor(sugestao, "Estoque Seco", [], mesmo)).includes("Freezer"));
  assert.ok(nomes(equipamentosSugeridosParaSetor(sugestao, "Salão", [], mesmo, { Salão: COZINHA })).includes("Fogão"), "vínculo explícito");
});

test("A4: parecido, prefixo e apelido que junta coisas diferentes não casam (sem vínculo)", () => {
  const sugestao = restaurante();
  for (const setor of ["Câmara Fria", "Armazenamento Congelado (Freezers)", "Copa", "Churrasqueira", "Higienização de Hortifrutigranjeiros", "Estoque de bebidas", "Cozinha da frente", "Estoq", "Sanitários de Clientes"]) {
    assert.equal(equipamentosSugeridosParaSetor(sugestao, setor, [], mesmoNomeOuSinonimo).length, 0, setor);
    assert.equal(oficialExatoDoSetor(setor), null, setor);
  }
  assert.equal(avisoQuandoNaoHaSugestao(sugestao, equipamentosSugeridosParaSetor(sugestao, "Depósito de Embalagens e Descartáveis", [], mesmoNomeOuSinonimo)), "sem-sugestao-do-setor");
  assert.equal(oficialExatoDoSetor("DML"), DML);
  assert.equal(oficialExatoDoSetor("Recebimento de Mercadorias"), RECEBIMENTO);
});

test("A4: a tela de Equipamentos só trata como 'próprio sem vínculo' quem não casa exatamente e não usa mais normalizarSetorManual", () => {
  const tela = lerFonte("components/pc/CadastroEquipamentos.tsx");
  assert.ok(tela.includes("!oficialExatoDoSetor(selecionado, vinculos)"));
  assert.equal(tela.includes("normalizarSetorManual"), false);
  assert.equal(lerFonte("lib/sugestaoPorCnae.ts").includes("normalizarSetorManual"), false, "a causa do casamento errado (migração que junta nomes diferentes) saiu");
});

// ===== A5: o que ainda não foi cadastrado, por nome e sinônimo =====
test("A5: 'Ver sugestões' mostra só o que falta (por nome e por sinônimo); nada sobrando = todas cadastradas", () => {
  const sugestao = restaurante();
  const todas = nomes(equipamentosSugeridosParaSetor(sugestao, COZINHA, [], mesmoNomeOuSinonimo));
  assert.ok(todas.length >= 5 && todas.includes("Refrigerador"));
  const faltam = nomes(equipamentosSugeridosParaSetor(sugestao, COZINHA, ["Geladeira", "fogão"], mesmoNomeOuSinonimo));
  assert.equal(faltam.includes("Refrigerador"), false, "Geladeira é sinônimo de Refrigerador");
  assert.equal(faltam.includes("Fogão"), false, "mesmo nome sem acento/caixa");
  assert.ok(faltam.includes("Chapa") && faltam.includes("Fritadeira"));
  assert.deepEqual(equipamentosSugeridosParaSetor(sugestao, COZINHA, todas, mesmoNomeOuSinonimo), [], "tudo cadastrado: lista vazia (a tela diz 'Todas as sugestões já foram cadastradas')");
  // setor que não casa exatamente nunca oferece o link (a lista completa do setor é vazia)
  assert.equal(equipamentosSugeridosParaSetor(sugestao, "Depósito de Embalagens e Descartáveis", [], mesmoNomeOuSinonimo).length, 0);
  const tela = lerFonte("components/pc/CadastroEquipamentos.tsx");
  for (const texto of ["Ver sugestões do tipo de estabelecimento", "Todas as sugestões já foram cadastradas"]) assert.ok(tela.includes(texto), texto);
});

// ===== A6: faixa de ambientes e vínculo em lote =====
test("A6(a): a faixa de sugestão só aparece quando a empresa não tem NENHUM ambiente", () => {
  assert.equal(faixaDeAmbientesVisivel(true, []), true);
  assert.equal(faixaDeAmbientesVisivel(true, ["Cozinha"]), false, "um ambiente próprio basta para esconder");
  assert.equal(faixaDeAmbientesVisivel(true, [COZINHA]), false);
  assert.equal(faixaDeAmbientesVisivel(true, Array.from({ length: 19 }, (_, i) => `Ambiente ${i + 1}`)), false, "caso do Chico: 0 oficiais e 19 próprios");
  assert.equal(faixaDeAmbientesVisivel(false, []), false, "sem permissão de editar");
});

test("A6(b): vínculos sugeridos: marcados por padrão só quando o casamento é exato; aplicar e desfazer em delta", () => {
  const setores = ["Recebimento de Mercadorias", "Cozinha", "Estoque Seco", "Copa", "Depósito de Embalagens e Descartáveis", "Mesa 9"];
  const linhas = vinculosSugeridos(setores, {});
  const por = Object.fromEntries(linhas.map((linha) => [linha.ambiente, linha]));
  assert.deepEqual(por["Recebimento de Mercadorias"], { ambiente: "Recebimento de Mercadorias", oficial: RECEBIMENTO, exato: true });
  assert.equal(por["Cozinha"].exato, true);
  assert.equal(por["Estoque Seco"].oficial, ESTOQUE);
  assert.equal(por["Copa"].oficial, COZINHA);
  assert.equal(por["Copa"].exato, false, "Copa só parece");
  assert.equal(por["Depósito de Embalagens e Descartáveis"].exato, false);
  assert.equal(por["Mesa 9"], undefined, "sem sugestão, sem linha");
  assert.equal(quantosExatos(linhas), 3);
  // já vinculado e setor oficial não entram
  assert.equal(vinculosSugeridos(["Cozinha", COZINHA], { Cozinha: COZINHA }).length, 0);

  const equipamentos = [eq("1", "Copa", "Fogão")];
  const escolhas = linhas.filter((linha) => linha.exato).map(({ ambiente, oficial }) => ({ ambiente, oficial }));
  const feito = aplicarVinculosEmLote(setores, {}, escolhas);
  assert.equal(feito.vinculados.length, 3);
  assert.deepEqual(feito.adicionados, [RECEBIMENTO, COZINHA, ESTOQUE], "o setor oficial entra na lista como no 'Vincular' de um só");
  assert.equal(feito.vinculos["Cozinha"], COZINHA);
  assert.equal(feito.setores.length, setores.length + 3);
  assert.equal(textoDosVinculados(3), "3 ambientes vinculados");
  assert.equal(textoDosVinculados(1), "1 ambiente vinculado");
  // ignora ambiente que já tem vínculo, que não existe ou setor que não é oficial
  assert.equal(aplicarVinculosEmLote(setores, { Cozinha: COZINHA }, [{ ambiente: "Cozinha", oficial: ESTOQUE }]).vinculados.length, 0);
  assert.equal(aplicarVinculosEmLote(setores, {}, [{ ambiente: "Nada", oficial: ESTOQUE }, { ambiente: "Copa", oficial: "Qualquer" }]).vinculados.length, 0);
  // Desfazer em delta: o que mudou depois fica; setor oficial com equipamento fica
  const depois = { ...feito.vinculos, Copa: COZINHA };
  const desfeito = desfazerVinculosEmLote([...feito.setores, "Novo ambiente"], depois, [eq("2", ESTOQUE, "Freezer")], feito);
  assert.equal(desfeito.vinculos["Cozinha"], undefined);
  assert.equal(desfeito.vinculos["Copa"], COZINHA, "vínculo feito depois não é tocado");
  assert.ok(desfeito.setores.includes("Novo ambiente"));
  assert.ok(desfeito.setores.includes(ESTOQUE), "setor oficial com equipamento fica");
  assert.equal(desfeito.setores.includes(RECEBIMENTO), false, "setor oficial marcado só pelo lote sai");
  assert.equal(desfeito.setores.includes(COZINHA), true, "Copa ainda aponta para a Cozinha / Produção");
  assert.equal(equipamentos.length, 1);
  const tela = lerFonte("components/pc/CadastroAmbientes.tsx");
  assert.ok(tela.includes("Vincular os sugeridos (") && tela.includes("textoDosVinculados"));
});

test("A6(c)(d): 'Parece o setor oficial <nome curto> · Vincular' em uma linha; a frase da faixa não termina em dois pontos", () => {
  const tela = lerFonte("components/pc/CadastroAmbientes.tsx");
  assert.ok(tela.includes("Parece o setor oficial {nomeCurtoDoSetor(parecido)} ·"));
  assert.ok(lerFonte("app/cadastro-estrutura.css").includes(".cadest-parece{display:flex") && lerFonte("app/cadastro-estrutura.css").includes("white-space:nowrap"));
  assert.equal(listaComPontoFinal(["Recebimento", "Banheiro clientes masc."]), "Recebimento, Banheiro clientes masc.");
  assert.equal(listaComPontoFinal(["Recebimento", "Cozinha"]), "Recebimento, Cozinha.");
  const todos = pacoteDoTipo("restaurante").ambientes.map(nomeCurtoDoSetor);
  assert.equal(listaComPontoFinal(todos).endsWith(".."), false);
});

// ===== A7: CNAE e tipo =====
test("A7(a): o CNAE precisa ter exatamente 7 dígitos (a pontuação não conta); não existe tabela oficial completa no app", () => {
  assert.equal(validarCnae("5611-2/01").situacao, "ok");
  assert.equal(validarCnae("56.11-2-01").situacao, "ok");
  assert.equal(validarCnae("5611201").situacao, "ok");
  assert.equal(validarCnae("").situacao, "vazio");
  assert.equal(validarCnae(undefined).situacao, "vazio");
  assert.deepEqual([validarCnae("5611-2/0").situacao, validarCnae("5611-2/0").digitos], ["formato", 6]);
  assert.equal(validarCnae("5611-2/0").mensagem, "O CNAE tem 7 dígitos (você digitou 6).");
  assert.equal(validarCnae("56112011").situacao, "formato");
  // 7 dígitos fora da tabela do app (que tem só os códigos de alimentação): formato vale, existência não é verificada
  assert.equal(validarCnae("8650-0/04").situacao, "fora-da-tabela");
  assert.equal(validarCnae("8650-0/04").mensagem, "CNAE sem sugestões neste app");
  assert.equal(validarCnae("abcdefg").situacao, "formato", "só letras é inválido, não vazio");
  assert.equal(validarCnae("   ").situacao, "vazio");
  assert.equal(cnaeReconhecido("8650004"), false);
  assert.equal(cnaeReconhecido("5611-2/01"), true);
  assert.equal(MENSAGEM_CNAE_NAO_RECONHECIDO, "CNAE não reconhecido · sem sugestões");
  assert.equal(mensagemSemSugestaoDoCnae("8650004"), "CNAE sem sugestões neste app", "7 dígitos fora da tabela");
  assert.equal(mensagemSemSugestaoDoCnae("123"), MENSAGEM_CNAE_NAO_RECONHECIDO, "formato inválido");
});

test("A7(b): ao mudar o código a descrição é guardada e limpa, volta se o código voltar, com o aviso para consultar de novo", () => {
  const pagina = lerFonte("app/page.tsx");
  assert.ok(pagina.includes('campo === "cnae" && normalizarCnae(valor) !== normalizarCnae(form.cnae)'));
  assert.ok(pagina.includes("setDescricaoGuardada({ digitos: normalizarCnae(form.cnae), texto: form.cnaeDescricao })"), "a original fica guardada");
  assert.ok(pagina.includes("cnaeDescricao: descricaoGuardada.texto"), "e volta se o código voltar");
  assert.ok(pagina.includes("Descrição não corresponde ao código; use"));
});

test("A7(a) revisão: CNAE fora do formato só bloqueia o salvar em empresa nova ou com o código mudado", () => {
  assert.equal(cnaeBloqueiaSalvar("123", undefined, true), true, "empresa nova");
  assert.equal(cnaeBloqueiaSalvar("123", "123", false), false, "antiga e intacta: só o aviso");
  assert.equal(cnaeBloqueiaSalvar("1234", "123", false), true, "antiga com o código mudado");
  assert.equal(cnaeBloqueiaSalvar("5611201", "123", false), false, "agora válido");
  assert.equal(cnaeBloqueiaSalvar("", undefined, true), false, "vazio não bloqueia");
  assert.equal(cnaeBloqueiaSalvar("abc", undefined, true), true, "só letras");
  assert.ok(lerFonte("app/page.tsx").includes("cnaeBloqueiaSalvar(form.cnae, cnaeSalvo, !editingEmpresaId)"));
});

test("revisão 2 e 4: o Manual recebe o tipo efetivo; a consulta de CNPJ não apaga o ajuste do usuário", () => {
  assert.ok(lerFonte("app/page.tsx").includes("<ManualBaseFields tipoDoEstabelecimento={tipoDoForm.rotulo}"));
  assert.equal(consultaPodeTrocarOTipo("Outro"), true);
  assert.equal(consultaPodeTrocarOTipo(""), true);
  assert.equal(consultaPodeTrocarOTipo("Lanchonete"), false);
  assert.equal(consultaPodeTrocarOTipo(TIPO_OUTRO_ESCOLHIDO), false);
  assert.equal(lerFonte("app/page.tsx").includes('{ tipo: "Outro" }'), false, "a consulta não grava tipo");
});

test("A7(c): o tipo nasce do CNAE, o ajuste do usuário vale e só ele é guardado", () => {
  const base = { cnae: "5611-2/01", cnaesSecundarios: [] };
  const semAjuste = tipoEfetivoDaEmpresa({ ...base, tipo: "Outro" });
  assert.deepEqual([semAjuste.id, semAjuste.ajustado], ["restaurante", false]);
  assert.equal(tipoEfetivoDaEmpresa({ ...base, tipo: "" }).id, "restaurante", "vazio = mapeamento do CNAE");
  assert.equal(tipoEfetivoDaEmpresa({ ...base }).id, "restaurante");
  const ajustado = tipoEfetivoDaEmpresa({ ...base, tipo: "Lanchonete" });
  assert.deepEqual([ajustado.id, ajustado.ajustado], ["lanchonete", true]);
  assert.equal(tipoEfetivoDaEmpresa({ ...base, tipo: "Restaurante" }).ajustado, false, "igual ao do CNAE não é ajuste");
  assert.equal(valorDoTipoParaGuardar("Restaurante", "restaurante"), "Outro", "igual ao CNAE: nada é guardado como ajuste");
  assert.equal(valorDoTipoParaGuardar("Bar", "restaurante"), "Bar");
  // saída explícita para "Outro": distinta de "Seguir o CNAE"
  assert.equal(valorDoTipoParaGuardar(OPCAO_SEGUIR_O_CNAE, "restaurante"), "Outro");
  assert.equal(valorDoTipoParaGuardar(TIPO_OUTRO_ESCOLHIDO, "restaurante"), TIPO_OUTRO_ESCOLHIDO);
  const forcado = tipoEfetivoDaEmpresa({ ...base, tipo: TIPO_OUTRO_ESCOLHIDO });
  assert.deepEqual([forcado.id, forcado.ajustado], ["outro", true]);
  assert.deepEqual(sugestaoPorCnae({ ...base, tipo: TIPO_OUTRO_ESCOLHIDO }).ambientes, pacoteDoTipo("outro").ambientes);
  assert.equal(valorDoTipoParaGuardar("Texto antigo livre", "restaurante"), "Texto antigo livre", "valor antigo passa como está");
  assert.equal(tipoEfetivoDaEmpresa({ ...base, tipo: "Texto antigo livre" }).id, "restaurante", "texto antigo segue o CNAE");
  // as sugestões usam o tipo efetivo
  assert.deepEqual(sugestaoPorCnae({ ...base, tipo: "Lanchonete" }).ambientes, pacoteDoTipo("lanchonete").ambientes);
  assert.deepEqual(sugestaoPorCnae({ ...base, tipo: "Outro" }).ambientes, pacoteDoTipo("restaurante").ambientes);
  assert.deepEqual(sugestaoPorCnae({ ...base }).equipamentos, pacoteDoTipo("restaurante").equipamentos);
});

test("A7(d): o título usa o nome do tipo, nunca a descrição digitada no cadastro", () => {
  const comDescricaoErrada = sugestaoPorCnae({ cnae: "5611201", cnaeDescricao: "Atividades de profissionais da nutrição" });
  assert.equal(tituloDaSugestao(comDescricaoErrada), "Sugestões para Restaurantes e similares · CNAE 5611-2/01");
  assert.equal(tituloDaSugestao(sugestaoPorCnae({ cnae: "5611201", cnaeDescricao: "Atividades de profissionais da nutrição", tipo: "Lanchonete" })), "Sugestões para Lanchonete · CNAE 5611-2/01", "tipo ajustado: o nome do tipo");
  assert.equal(tituloDaSugestao(sugestaoPorCnae({ cnae: "9999999", cnaeDescricao: "x", cnaesSecundarios: [{ codigo: "4722901", descricao: "descrição digitada" }] })), "Sugestões para Comércio varejista de carnes - açougues · CNAE 4722-9/01 (CNAE secundário)");
});

test("A7(e): CNAE desconhecido ou inválido não gera sugestão e é recalculado a cada leitura do cadastro", () => {
  for (const cnae of ["9999999", "8650004", "5611-2/0", "123"]) {
    const sugestao = sugestaoPorCnae({ cnae, cnaeDescricao: "Restaurantes e similares" });
    assert.equal(sugestao.situacao, "sem-sugestao", cnae);
    assert.deepEqual(equipamentosSugeridosParaSetor(sugestao, COZINHA, [], mesmoNomeOuSinonimo), [], cnae);
    assert.equal(avisoQuandoNaoHaSugestao(sugestao, []), "sem-sugestao-do-setor");
  }
  // mudar o CNAE muda a sugestão na hora (nada do resultado anterior fica guardado)
  assert.equal(sugestaoPorCnae({ cnae: "5611201" }).situacao, "ok");
  assert.equal(sugestaoPorCnae({ cnae: "5611202" }).situacao, "sem-sugestao");
  assert.equal(sugestaoPorCnae({ cnae: "5611203" }).tipoRotulo, "Lanchonete");
  assert.equal(sugestaoPorCnae({ cnae: "" }).situacao, "sem-cnae");
  const ambientes = lerFonte("components/pc/CadastroAmbientes.tsx");
  const equipamentos = lerFonte("components/pc/CadastroEquipamentos.tsx");
  assert.ok(ambientes.includes("mensagemSemSugestaoDoCnae(sugestao.codigo)") && equipamentos.includes("mensagemSemSugestaoDoCnae(sugestao.codigo)"));
  // tipo ajustado vale sozinho com CNAE fora da tabela; sem código CNAE no título
  const sozinho = sugestaoPorCnae({ cnae: "8650004", tipo: "Lanchonete" });
  assert.equal(sozinho.situacao, "ok");
  assert.deepEqual(sozinho.ambientes, pacoteDoTipo("lanchonete").ambientes);
  assert.equal(tituloDaSugestao(sozinho), "Sugestões para Lanchonete");
  assert.equal(sugestaoPorCnae({ cnae: "8650004", tipo: "Outro" }).situacao, "sem-sugestao", "sem ajuste e sem CNAE reconhecido: nada");
  assert.equal(sugestaoPorCnae({ cnae: "8650004", tipo: TIPO_OUTRO_ESCOLHIDO }).situacao, "sem-sugestao", "Outro escolhido não força pacote sem CNAE conhecido");
});

// ===== A8: uma linha só no setor vazio sem sugestão =====
test("A8: setor vazio sem sugestão mostra UMA linha e não repete 'Copiar de outra empresa'", () => {
  const tela = lerFonte("components/pc/CadastroEquipamentos.tsx");
  assert.ok(tela.includes("Nenhum equipamento neste setor <span") && tela.includes("sem sugestões para este tipo de empresa"));
  assert.equal(tela.includes("Sem sugestões para este setor"), false);
  assert.equal((tela.match(/Copiar de outra empresa/g) || []).length, 1, "só o botão do cabeçalho");
});

// ===== A9: avisos de um toque em sequência =====
test("A9: toques em sequência na janela de 8 s viram um aviso só, que desfaz todos", () => {
  let grupo = acumularAdicao(null, { id: "a", nome: "Coifa", setor: COZINHA }, 1000);
  assert.equal(textoDoAvisoDeAdicoes(grupo, () => "Cozinha"), "Coifa adicionada em Cozinha", "um item: como hoje");
  grupo = acumularAdicao(grupo, { id: "b", nome: "Fogão", setor: COZINHA }, 4000);
  grupo = acumularAdicao(grupo, { id: "c", nome: "Chapa", setor: COZINHA }, 4000 + JANELA_DE_AGRUPAMENTO_MS - 1);
  assert.deepEqual(grupo.ids, ["a", "b", "c"]);
  assert.equal(textoDoAvisoDeAdicoes(grupo, () => "Cozinha"), "3 itens adicionados em Cozinha");
  const lista = [eq("a", COZINHA, "Coifa"), eq("b", COZINHA, "Fogão"), eq("c", COZINHA, "Chapa"), eq("z", COZINHA, "Mesa de inox")];
  assert.deepEqual(desfazerCopia(lista, grupo.ids).map((i) => i.id), ["z"], "Desfazer tira todos do grupo e nada além");
  // passou a janela, ou outro aviso cobriu o anterior: grupo novo
  const depois = acumularAdicao(grupo, { id: "d", nome: "Forno", setor: COZINHA }, grupo.ultimaEm + JANELA_DE_AGRUPAMENTO_MS);
  assert.deepEqual(depois.ids, ["d"]);
  const coberto = acumularAdicao(grupo, { id: "e", nome: "Forno", setor: COZINHA }, grupo.ultimaEm + 100, false);
  assert.deepEqual(coberto.ids, ["e"]);
  // setores diferentes: o aviso não afirma um setor só
  const misto = acumularAdicao(acumularAdicao(null, { id: "1", nome: "Freezer", setor: ESTOQUE }, 0), { id: "2", nome: "Fogão", setor: COZINHA }, 10);
  assert.equal(textoDoAvisoDeAdicoes(misto, () => "X"), "2 itens adicionados");
  assert.ok(lerFonte("components/pc/CadastroEquipamentos.tsx").includes("acumularAdicao(grupoRapido.current"));
});
