import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MENSAGEM_DE_NOME_CURTO,
  acusarNomeCurtoAoSair,
  avisoDeNomeCurto,
  linhaDeSugestoesRapidasVisivel,
  nomeDeEquipamentoValido,
  MINIMO_DE_LETRAS_DO_NOME,
} from "../lib/equipamentosCadastro.ts";
import {
  cnaeBloqueiaSalvar,
  cnaeInvalido,
  descricaoDoSetor,
  nomeExibidoDoSetor,
  tipoEfetivoDaEmpresa,
  validarCnae,
} from "../lib/tiposDeEstabelecimento.ts";
import { SETORES_OFICIAIS_MANUAL } from "../lib/manualBase.ts";
import { capitalizarDenominacao, cnaeExisteNaTabelaOficial, denominacaoOficialDoCnae, descricaoOficialLegivelDoCnae } from "../lib/cnaeOficial.ts";
import { CNAE_SUBCLASSES_OFICIAIS } from "../lib/cnaeSubclassesOficiais.ts";
import { camposAparadosAoSalvar, compactarEspacos } from "../lib/textoDeEndereco.ts";
import { MENSAGEM_CONSULTA_APLICADA, MENSAGEM_CONSULTA_IGNORADA, mensagensDaConsulta } from "../lib/cnpjConsulta.ts";
import { CATALOGO_DE_NOMES_DE_EQUIPAMENTOS } from "../lib/catalogoNomesEquipamentos.ts";
import { sugerirNomesDeEquipamento } from "../lib/autocompletarEquipamento.ts";
import { sugestaoPorCnae } from "../lib/sugestaoPorCnae.ts";

const lerFonte = (caminho) => readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");

// ===== A1(a): linha de sugestões "+ Nome" some com o quadro em lote aberto =====
test("A1(a): com o quadro de sugestões em lote aberto a linha '+ Nome' fica escondida; fechado, volta", () => {
  assert.equal(linhaDeSugestoesRapidasVisivel(true, 4), false);
  assert.equal(linhaDeSugestoesRapidasVisivel(false, 4), true);
  assert.equal(linhaDeSugestoesRapidasVisivel(false, 0), false, "sem sugestões não há linha");
  assert.ok(lerFonte("components/pc/CadastroEquipamentos.tsx").includes("linhaDeSugestoesRapidasVisivel(verAberto, sugeridosDoSetor.length)"));
});

test("A1(d): textos de cadastro dizem 'a RT confirma'", () => {
  for (const arquivo of ["components/pc/CadastroEquipamentos.tsx", "components/pc/CadastroAmbientes.tsx"]) assert.equal(lerFonte(arquivo).includes("o RT confirma"), false, arquivo);
});

// ===== A5: nome do equipamento =====
test("A5: nome curto só é acusado depois de Enter ou ao sair do campo, nunca enquanto digita", () => {
  assert.equal(MINIMO_DE_LETRAS_DO_NOME, 3, "regra: 3 letras (só letras contam; espaços, números e pontuação não)");
  assert.equal(nomeDeEquipamentoValido("Re"), false);
  assert.equal(nomeDeEquipamentoValido("R2 1"), false, "número não é letra");
  assert.equal(nomeDeEquipamentoValido("Rei"), true);
  assert.equal(MENSAGEM_DE_NOME_CURTO, "Digite ao menos 3 letras");
  assert.equal(avisoDeNomeCurto("Re", false), "", "digitando: sem borda nem mensagem");
  assert.equal(avisoDeNomeCurto("Re", true), "Digite ao menos 3 letras", "depois de Enter ou de sair do campo");
  assert.equal(avisoDeNomeCurto("Coifa", true), "");
  assert.equal(acusarNomeCurtoAoSair("Re"), true);
  assert.equal(acusarNomeCurtoAoSair(""), false, "sair do campo vazio não acusa");
  assert.equal(acusarNomeCurtoAoSair("  "), false);
  assert.equal(acusarNomeCurtoAoSair("Coifa"), false);
});

test("A5: com o erro à vista a lista do autocompletar fecha e digitar de novo tira o erro", () => {
  const tela = lerFonte("components/pc/CadastroEquipamentos.tsx");
  assert.ok(tela.includes("opcoesDeNome.length > 0 && !avisoCurto"), "a lista não cobre a mensagem");
  assert.ok(tela.includes("setTentou(false); setListaAberta(true)"), "digitar limpa o erro");
  assert.ok(tela.includes("if (acusarNomeCurtoAoSair(nome)) setTentou(true)"), "sair do campo acusa");
});

// ===== A3: nomes exibidos =====
test("A3: nomes exibidos por extenso, sem 'fem.', 'masc.' nem 'colab.'; o nome gravado não muda", () => {
  const exibidos = SETORES_OFICIAIS_MANUAL.map(nomeExibidoDoSetor);
  for (const nome of exibidos) assert.equal(/\bfem\.|\bmasc\.|\bcolab\./.test(nome), false, nome);
  assert.equal(nomeExibidoDoSetor(SETORES_OFICIAIS_MANUAL[7]), "Vestiário feminino");
  assert.equal(nomeExibidoDoSetor(SETORES_OFICIAIS_MANUAL[8]), "Banheiro feminino · colaboradores");
  assert.equal(nomeExibidoDoSetor(SETORES_OFICIAIS_MANUAL[11]), "Banheiro feminino · clientes");
  assert.equal(nomeExibidoDoSetor("Cozinha própria"), "Cozinha própria", "nome próprio passa como está");
  // o identificador oficial segue sendo o nome completo
  assert.equal(SETORES_OFICIAIS_MANUAL[7], "Vestiário feminino de colaborador");
});

test("A3: a descrição só aparece quando acrescenta algo; Central de gás fica sem descrição", () => {
  assert.equal(descricaoDoSetor(SETORES_OFICIAIS_MANUAL[7]), "", "repete o nome");
  assert.equal(descricaoDoSetor(SETORES_OFICIAIS_MANUAL[8]), "");
  assert.equal(descricaoDoSetor(SETORES_OFICIAIS_MANUAL[11]), "");
  assert.equal(descricaoDoSetor(SETORES_OFICIAIS_MANUAL[3]), "", "Central de gás: o catálogo não traz descrição");
  assert.equal(descricaoDoSetor(SETORES_OFICIAIS_MANUAL[0]), SETORES_OFICIAIS_MANUAL[0], "Recebimento: o nome oficial completo acrescenta");
  assert.equal(descricaoDoSetor(SETORES_OFICIAIS_MANUAL[6]), SETORES_OFICIAIS_MANUAL[6]);
});

// ===== A7(b): mensagens da consulta de CNPJ =====
test("A7(b): só a mensagem que corresponde ao estado real da consulta", () => {
  const nenhuma = { propostaPendente: false, camposPendentes: false };
  // consulta ignorada com campos da consulta anterior ainda sem confirmar: só o aviso "Preenchido"
  const ignoradaComCampos = mensagensDaConsulta({ ...nenhuma, mensagem: MENSAGEM_CONSULTA_IGNORADA, camposPendentes: true });
  assert.deepEqual(ignoradaComCampos, { mensagem: "", avisoPreenchido: true });
  // ignorada e nada preenchido pela consulta: só a mensagem
  assert.deepEqual(mensagensDaConsulta({ ...nenhuma, mensagem: MENSAGEM_CONSULTA_IGNORADA }), { mensagem: MENSAGEM_CONSULTA_IGNORADA, avisoPreenchido: false });
  // dados aplicados: o aviso "Preenchido" já diz isso
  assert.deepEqual(mensagensDaConsulta({ ...nenhuma, mensagem: MENSAGEM_CONSULTA_APLICADA, camposPendentes: true }), { mensagem: "", avisoPreenchido: true });
  // proposta à espera ou consultando: só a mensagem da ação em andamento
  assert.deepEqual(mensagensDaConsulta({ mensagem: "Encontrei dados para este CNPJ.", propostaPendente: true, camposPendentes: true }), { mensagem: "Encontrei dados para este CNPJ.", avisoPreenchido: false });
  assert.equal(mensagensDaConsulta({ mensagem: "Consultando…", propostaPendente: false, camposPendentes: true }).avisoPreenchido, false);
  // titular pessoa física: o recado novo continua aparecendo
  const titular = "Dados aplicados. Informe o nome do estabelecimento: o nome do titular não é guardado.";
  assert.equal(mensagensDaConsulta({ mensagem: titular, propostaPendente: false, camposPendentes: true }).mensagem, titular);
});

// ===== A7(d): espaços nos campos de texto =====
test("A7(d): só o campo editado é aparado e compactado; o que não mudou não é tocado", () => {
  assert.equal(compactarEspacos("  SALA   23C "), "SALA 23C");
  const salvo = { complemento: "SALA  23C", logradouro: "Rua A", bairro: "Centro", email: "a@b.com", cnpj: "00  1", telefone: "(11)  1" };
  // nada editado: nada muda (dados existentes não são alterados em lote)
  assert.deepEqual(camposAparadosAoSalvar({ ...salvo }, salvo), {});
  // complemento editado nesta sessão
  assert.deepEqual(camposAparadosAoSalvar({ ...salvo, complemento: "SALA  23C  " }, salvo), { complemento: "SALA 23C" });
  // logradouro editado com espaços; bairro intacto com espaço duplo continua como está
  const comEspacoAntigo = { ...salvo, bairro: "Bairro  Velho" };
  assert.deepEqual(camposAparadosAoSalvar({ ...comEspacoAntigo, logradouro: "Rua   B " }, comEspacoAntigo), { logradouro: "Rua B" });
  // CNPJ, e-mail e telefone nunca entram, mesmo editados
  assert.deepEqual(camposAparadosAoSalvar({ ...salvo, email: " x@y.com ", cnpj: "1  2", telefone: "1  2" }, salvo), {});
  // empresa nova: todos os campos de texto
  assert.deepEqual(camposAparadosAoSalvar({ complemento: "A  B", bairro: "Centro" }, undefined), { complemento: "A B" });
  assert.ok(lerFonte("app/page.tsx").includes("camposAparadosAoSalvar(form"));
});

// ===== A8: tabela oficial de CNAE =====
test("A8: a tabela oficial valida a existência do código e dá a descrição", () => {
  assert.equal(CNAE_SUBCLASSES_OFICIAIS.length, 1332);
  assert.equal(cnaeExisteNaTabelaOficial("5611-2/01"), true);
  assert.equal(cnaeExisteNaTabelaOficial("5611201"), true);
  assert.equal(cnaeExisteNaTabelaOficial("9999999"), false);
  assert.equal(cnaeExisteNaTabelaOficial("561120"), false, "6 dígitos");
  assert.equal(denominacaoOficialDoCnae("5611201"), "RESTAURANTES E SIMILARES", "como publicada, em maiúsculas");
  assert.equal(descricaoOficialLegivelDoCnae("5611-2/01"), "Restaurantes e similares");
  assert.equal(descricaoOficialLegivelDoCnae("9999999"), "");
  // todos os códigos do app para sugerir tipo existem na tabela oficial
  assert.equal(validarCnae("5611201").situacao, "ok");
});

test("A8: capitalização legível mantém siglas", () => {
  assert.equal(capitalizarDenominacao("FABRICAÇÃO DE PRODUTOS DE PANIFICAÇÃO"), "Fabricação de produtos de panificação");
  assert.equal(capitalizarDenominacao("COMÉRCIO DE GÁS LIQUEFEITO DE PETRÓLEO (GLP)"), "Comércio de gás liquefeito de petróleo (GLP)");
  assert.equal(capitalizarDenominacao("LOCAÇÃO DE DVDS E CDS"), "Locação de DVDs e CDs");
});

test("A8: validação na hora (existe / não existe / reconhecido sem sugestões)", () => {
  assert.deepEqual([validarCnae("9999999").situacao, validarCnae("9999999").mensagem], ["inexistente", "CNAE não encontrado na tabela oficial"]);
  assert.deepEqual([validarCnae("8650004").situacao, validarCnae("8650004").mensagem], ["sem-sugestao", "CNAE reconhecido · sem sugestões neste app"]);
  assert.equal(validarCnae("123").situacao, "formato");
  assert.equal(validarCnae("").situacao, "vazio");
  assert.equal(cnaeInvalido("9999999"), true);
  assert.equal(cnaeInvalido("8650004"), false, "existe: não bloqueia");
});

test("A8: empresa antiga com CNAE inválido salva os outros campos; só bloqueia se o CNAE for alterado para valor inválido", () => {
  assert.equal(cnaeBloqueiaSalvar("9999999", "9999999", false), false, "antiga e intacta (inexistente)");
  assert.equal(cnaeBloqueiaSalvar("123", "123", false), false, "antiga e intacta (formato)");
  assert.equal(cnaeBloqueiaSalvar("9999998", "9999999", false), true, "alterado para outro inexistente");
  assert.equal(cnaeBloqueiaSalvar("12", "5611201", false), true, "alterado para formato inválido");
  assert.equal(cnaeBloqueiaSalvar("8650004", "9999999", false), false, "alterado para válido");
  assert.equal(cnaeBloqueiaSalvar("9999999", undefined, true), true, "empresa nova com código inexistente");
  assert.equal(cnaeBloqueiaSalvar("8650004", undefined, true), false, "existe na tabela oficial, sem tipo no app: salva");
});

test("A8: 'Outro' escolhido vale como ajuste também quando o CNAE tem tipo ou não", () => {
  const comTipo = tipoEfetivoDaEmpresa({ cnae: "5611201", tipo: "Outro (escolhido)" });
  assert.deepEqual([comTipo.id, comTipo.ajustado], ["outro", true]);
  const semTipo = sugestaoPorCnae({ cnae: "8650004", tipo: "Outro (escolhido)" });
  assert.equal(semTipo.situacao, "ok");
  assert.equal(sugestaoPorCnae({ cnae: "8650004", tipo: "Outro" }).situacao, "sem-sugestao");
});

test("A8: a descrição é somente leitura e o aviso antigo saiu", () => {
  const pagina = lerFonte("app/page.tsx");
  assert.ok(pagina.includes("descricaoAoMudarCodigo({"));
  assert.ok(/readOnly\s+aria-readonly="true"\s+placeholder="Preenchida a partir do código do CNAE"/.test(pagina));
  assert.equal(pagina.includes("Descrição não corresponde ao código"), false);
});

// ===== A9 =====
test("A9: catálogo do autocompletar ganhou quatro nomes (só nome, a validar pela RT)", () => {
  for (const nome of ["Geladeira", "Forno micro-ondas", "Balcão refrigerado", "Estufa"]) assert.ok(CATALOGO_DE_NOMES_DE_EQUIPAMENTOS.includes(nome), nome);
  assert.ok(sugerirNomesDeEquipamento("gel", []).includes("Geladeira"));
});

// ===== A1(c)/A2/A7(a)/(c): estilo =====
test("estilo: caixinha terracota, pacote em creme com borda terracota, chip Sincronizado sem caixa e botões", () => {
  const css = lerFonte("app/globals.css") + lerFonte("app/cadastro-estrutura.css");
  assert.ok(css.includes('.cadest input[type="checkbox"]:checked{border-color:#21A3A3;background:#21A3A3}'));
  assert.ok(css.includes(".pacote-janela .esc-opcao.is-on{border-color:#21A3A3;background:#FFF6E5}"));
  assert.ok(css.includes("html body .pc-sync-chip.pc-sync-chip.pc-sync-chip:is(.is-ok,.is-pendente,.is-sem-sinal,.is-erro)") && css.includes("background:transparent;border:0;border-radius:0;box-shadow:none;padding:0 4px;color:#263445;font-size:15px"));
  assert.ok(css.includes("html .pacote-tipo .ui-btn.pacote-tipo-ver{border:2px solid #264A80;background:#264A80;color:#fff;font-weight:400}"));
  assert.ok(css.includes("html .nova-consulta-aviso .ui-btn.ui-btn--secondary{border:2px solid #7F8BA3;background:#fff;color:#263445;font-weight:400}"));
  assert.ok(css.includes(".cadest-bloqueio p.cadest-rotulo{color:#526477}"));
  assert.ok(css.includes(".cadest-semsugestao--colada{margin-top:-12px;font-size:15px;line-height:22px;color:#263445}"));
});

test("A2: título do pacote sem contagens e sem '3 de 3 marcados' no bloco", () => {
  const fonte = lerFonte("components/PacoteDoTipo.tsx");
  assert.ok(fonte.includes("Pacote de {rotuloDoTipo(tipo)}\n"));
  assert.equal(fonte.includes("pacote-grupo-conta"), false);
  assert.ok(fonte.includes("Vai entrar:"));
  assert.ok(fonte.includes("Desmarcar todos"));
});

test("A6: menu do ambiente vinculado diz 'Trocar vínculo'; painel aberto esconde a linha do questionário básico", () => {
  const fonte = lerFonte("components/pc/CadastroAmbientes.tsx");
  assert.ok(fonte.includes('oficialVinculado ? "Trocar vínculo" : "Vincular a setor oficial"'));
  assert.ok(fonte.includes("podeEditar && !vincAberto && semQuestionario.length > 0"));
});

// ===== Revisão da 9A =====
import { descricaoAoAbrirEmpresa, descricaoAoMudarCodigo } from "../lib/cnaeOficial.ts";
import { descricaoDoCnaeDaTabela } from "../lib/tiposDeEstabelecimento.ts";

test("revisão 9A.1: empresa antiga com CNAE válido mostra a descrição oficial ao abrir (vazia ou diferente), sem gravar", () => {
  assert.equal(descricaoAoAbrirEmpresa("5611201", ""), "Restaurantes e similares");
  assert.equal(descricaoAoAbrirEmpresa("5611-2/01", "texto antigo diferente"), "Restaurantes e similares");
  assert.equal(descricaoAoAbrirEmpresa("9999999", "descrição que ficou"), "descrição que ficou", "inexistente: a salva continua");
  assert.equal(descricaoAoAbrirEmpresa("", ""), "");
  assert.equal(descricaoDoCnaeDaTabela("5611201"), "Restaurantes e similares", "as sugestões usam a descrição oficial");
  assert.ok(lerFonte("app/page.tsx").includes("cnaeDescricao: descricaoAoAbrirEmpresa(empresa.cnae, empresa.cnaeDescricao)"));
});

test("revisão 9A.2/3: CNAE da consulta que não existe na tabela não bloqueia; só o formato bloqueia; comparação normalizada", () => {
  assert.equal(cnaeBloqueiaSalvar("9999999", undefined, true, true), false, "veio da consulta: aviso");
  assert.equal(cnaeBloqueiaSalvar("999", undefined, true, true), true, "formato inválido bloqueia mesmo vindo da consulta");
  assert.equal(cnaeBloqueiaSalvar("9999999", undefined, true, false), true, "digitado: bloqueia");
  assert.equal(cnaeBloqueiaSalvar("9999-9/99", "9999999", false), false, "mesmo código com pontuação diferente não é mudança");
  assert.equal(cnaeBloqueiaSalvar("99999", "99999", false), false);
  assert.ok(lerFonte("app/page.tsx").includes("normalizarCnae(form.cnae) === cnaeDaConsulta"));
});

test("revisão 9A.4: OSCIP e WEB ficam em maiúsculas na descrição", () => {
  assert.equal(capitalizarDenominacao("ATIVIDADES DE OSCIP E SERVIÇOS WEB"), "Atividades de OSCIP e serviços WEB");
});

test("revisão 9A.7: falha da consulta aparece sozinha, sem 'Preenchido pela consulta'", () => {
  const falha = "Não consegui consultar o CNPJ agora. Preencha à mão; você pode consultar de novo depois.";
  assert.deepEqual(mensagensDaConsulta({ mensagem: falha, propostaPendente: false, camposPendentes: true }), { mensagem: falha, avisoPreenchido: false });
  assert.deepEqual(mensagensDaConsulta({ mensagem: "", propostaPendente: false, camposPendentes: true }), { mensagem: "", avisoPreenchido: true });
});

test("revisão 9A.9: descrição por código (voltar ao salvo, parcial, limpar)", () => {
  const salva = { cnae: "9999999", cnaeDescricao: "Descrição que veio da consulta" };
  // código inexistente salvo -> parcial: descrição some da tela, mas fica guardada com o código dela
  const parcial = descricaoAoMudarCodigo({ codigoNovo: "99999", codigoAtual: "9999999", descricaoAtual: salva.cnaeDescricao, salva, guardada: null });
  assert.equal(parcial.descricao, "");
  assert.deepEqual(parcial.guardada, { digitos: "9999999", texto: salva.cnaeDescricao });
  // voltar ao código salvo (inexistente): a original volta
  const volta = descricaoAoMudarCodigo({ codigoNovo: "9999999", codigoAtual: "99999", descricaoAtual: "", salva, guardada: parcial.guardada });
  assert.equal(volta.descricao, salva.cnaeDescricao);
  // outro código que existe: descrição oficial; a anterior fica guardada
  const outro = descricaoAoMudarCodigo({ codigoNovo: "5611-2/03", codigoAtual: "9999999", descricaoAtual: salva.cnaeDescricao, salva, guardada: null });
  assert.equal(outro.descricao, "Lanchonetes, casas de chá, de sucos e similares");
  assert.equal(outro.guardada?.digitos, "9999999");
  // apagar o código: descrição vazia
  assert.equal(descricaoAoMudarCodigo({ codigoNovo: "", codigoAtual: "5611201", descricaoAtual: "Restaurantes e similares", salva: undefined, guardada: null }).descricao, "");
  // mesmo código com outra pontuação: nada muda
  const igual = descricaoAoMudarCodigo({ codigoNovo: "5611-2/01", codigoAtual: "5611201", descricaoAtual: "X", salva: undefined, guardada: null });
  assert.deepEqual([igual.mudou, igual.descricao], [false, "X"]);
  // código salvo que existe na tabela: volta a oficial
  assert.equal(descricaoAoMudarCodigo({ codigoNovo: "5611201", codigoAtual: "56112", descricaoAtual: "", salva: { cnae: "5611201", cnaeDescricao: "velha" }, guardada: null }).descricao, "Restaurantes e similares");
});
