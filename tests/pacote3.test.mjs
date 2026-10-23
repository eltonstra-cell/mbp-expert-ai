import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AVISO_EMITIR_SEM_VISITA,
  AVISO_FINALIZAR_SEM_ITEM,
  ambientesSemQuestionario,
  avisoParaEmitir,
  avisoParaFinalizar,
  bloqueioDeExcluirAmbiente,
  cnpjValido,
  erroDoCnpj,
  erroDoNomeDaEmpresa,
  itensRespondidos,
  pendenciasParaSalvarEmpresa,
  vincularQuestionarioEmLote,
} from "../lib/regrasDoPacote3.ts";
import { erroDoNovoNome, renomearAmbiente, resumoDaRenomeacao, textoDoResumo } from "../lib/renomearAmbiente.ts";
import { assinaturaDaPagina, marcarComoRevisado, situacaoDaRevisao, textoDaRevisao } from "../lib/revisaoDeCadastros.ts";
import { preencherIdentificacao } from "../lib/manualIdentificacao.ts";
import { SETORES_OFICIAIS_MANUAL } from "../lib/manualBase.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("36. finalizar visita só com pelo menos 1 item respondido; aviso na hora, no botão", () => {
  assert.equal(itensRespondidos([{ status: "Pendente" }, { status: "Pendente" }]), 0);
  assert.equal(itensRespondidos([{ status: "Pendente" }, { status: "Conforme" }, { status: "Não se aplica" }]), 2);
  assert.equal(avisoParaFinalizar(0), AVISO_FINALIZAR_SEM_ITEM);
  assert.equal(avisoParaFinalizar(1), "");
  const relatorio = ler("../components/pc/PcRelatorio.tsx");
  assert.ok(relatorio.includes("avisoFinalizar") && relatorio.includes("aria-disabled={Boolean(avisoFinalizar)}") && relatorio.includes('id="aviso-finalizar"'));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("avisoParaFinalizar(itensRespondidos(checklistAtual))"), "a função de finalizar também confere");
});

test("37. emitir relatório só com visita concluída ou parcial", () => {
  assert.equal(avisoParaEmitir("Concluída", 0), "");
  assert.equal(avisoParaEmitir("Em andamento", 3), "", "parcial: em andamento com itens respondidos");
  assert.equal(avisoParaEmitir("Em andamento", 0), AVISO_EMITIR_SEM_VISITA);
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("if (avisoParaEmitir(visitaAtual.status, itensRespondidos(checklistAtual))) return;"), "a emissão confere antes de enviar");
});

test("38. empresa: nome obrigatório e CNPJ com dígitos verificadores, na hora", () => {
  assert.equal(cnpjValido("11.222.333/0001-81"), true);
  assert.equal(cnpjValido("11222333000181"), true);
  assert.equal(cnpjValido("11222333000182"), false);
  assert.equal(cnpjValido("00000000000000"), false);
  assert.equal(cnpjValido("123"), false);
  assert.equal(erroDoCnpj(""), "");
  assert.match(erroDoCnpj("1122"), /Faltam 10 dígitos/);
  assert.match(erroDoCnpj("11222333000182"), /CNPJ inválido/);
  assert.equal(erroDoCnpj("11.222.333/0001-81"), "");
  assert.equal(erroDoNomeDaEmpresa("", ""), "Informe o nome da empresa.");
  assert.equal(erroDoNomeDaEmpresa("  ", "Razão Ltda"), "");
  assert.deepEqual(pendenciasParaSalvarEmpresa({ nomeFantasia: "", razaoSocial: "", cnpj: "" }, false), ["Informe o nome da empresa.", "Informe o CNPJ."]);
  assert.deepEqual(pendenciasParaSalvarEmpresa({ nomeFantasia: "Beyond Nutri", cnpj: "11222333000182" }, false), ["CNPJ inválido: confira os números."]);
  assert.deepEqual(pendenciasParaSalvarEmpresa({ nomeFantasia: "Beyond Nutri", cnpj: "11222333000181" }, false), []);
  assert.deepEqual(pendenciasParaSalvarEmpresa({ nomeFantasia: "Beyond Nutri", cnpj: "" }, true), [], "empresa já cadastrada não é barrada pelo CNPJ");
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("erroDoCnpj(form.cnpj)") && pagina.includes("erroDoNomeDaEmpresa(form.nomeFantasia, form.razaoSocial)") && pagina.includes("pendenciasParaSalvarEmpresa(form, Boolean(editingEmpresaId))"));
});

test("39. excluir ambiente com equipamentos: bloqueia e lista quais são, oferecendo mover ou excluir", () => {
  const equipamentos = [
    { id: "e1", nome: "Refrigerador", setor: "Cozinha" },
    { id: "e2", nome: "Fogão", setor: "cozinha" },
    { id: "e3", nome: "Mesa", setor: "Salão" },
  ];
  assert.deepEqual(bloqueioDeExcluirAmbiente("Depósito", equipamentos), { bloqueado: false });
  const bloqueio = bloqueioDeExcluirAmbiente("Cozinha", equipamentos);
  assert.equal(bloqueio.bloqueado, true);
  assert.deepEqual(bloqueio.equipamentos.map((item) => item.nome), ["Refrigerador", "Fogão"]);
  assert.match(bloqueio.mensagem, /2 equipamentos vinculados: Refrigerador, Fogão/);
  assert.match(bloqueioDeExcluirAmbiente("Salão", equipamentos).mensagem, /1 equipamento vinculado: Mesa/);
  const campos = ler("../components/ManualBaseFields.tsx");
  assert.ok(campos.includes("Mover e remover o ambiente") && campos.includes("Excluir equipamentos e o ambiente") && campos.includes("bloqueioDeExcluirAmbiente"));
});

const empresaDeTeste = () => ({
  id: "beyond",
  nomeFantasia: "Beyond Nutri",
  setoresManual: ["Cozinha", "Churrasqueira", "Salão"],
  equipamentosSetores: [{ id: "e1", setor: "Churrasqueira", nome: "Grelha", quantidade: 1, estado: "Não avaliado", observacao: "" }],
  fluxosOperacionais: [{ id: "f1", tipo: "Recebimento", aplicavel: true, setorVinculado: "Churrasqueira", descricao: "", responsavel: "", controlesRegistros: "" }],
  modelosQuestionarioAmbientes: { Churrasqueira: "Estrutura geral/personalizada" },
  setorOficialDoAmbiente: { Churrasqueira: "Cozinha" },
  questionarios: { Churrasqueira: { perguntas: [], atualizadoEm: "", ambiente: "Churrasqueira" } },
});
const bancoDeTeste = () => ({
  empresas: { beyond: empresaDeTeste() },
  empresaAtualId: "beyond",
  visitas: [
    { id: "v1", empresaId: "beyond", ambientes: ["Churrasqueira"], modelosQuestionarioAmbientes: { Churrasqueira: "x" }, checklist: [{ id: "c1", ambiente: "Churrasqueira" }, { id: "c2", ambiente: "Cozinha" }], avaliacoesEquipamentos: [{ id: "a1", ambiente: "Churrasqueira" }], ambientesOcultos: [] },
    { id: "v2", empresaId: "outra", ambientes: ["Churrasqueira"], checklist: [{ id: "c3", ambiente: "Churrasqueira" }] },
  ],
  ncs: [{ id: "n1", empresaId: "beyond", ambiente: "Churrasqueira" }, { id: "n2", empresaId: "outra", ambiente: "Churrasqueira" }],
  evidencias: [{ id: "ev1", visitaId: "v1", ambiente: "Churrasqueira" }, { id: "ev2", visitaId: "v2", ambiente: "Churrasqueira" }],
  usuarios: [],
  registrosAuditoria: [],
  registrosPop: [{ id: "r1", empresaId: "beyond", ambiente: "Churrasqueira" }],
  relatoriosEmitidos: [{ id: "rel", ambiente: "Churrasqueira" }],
});

test("21. renomear ambiente com cascata: equipamentos, visitas, fluxos, questionários, vínculos; conta antes e não toca em outra empresa nem em relatório emitido", () => {
  const db = bancoDeTeste();
  const resumo = resumoDaRenomeacao(db, "beyond", "Churrasqueira");
  assert.equal(resumo.total, 12);
  assert.match(textoDoResumo(resumo), /12 registros serão atualizados: .*1 equipamento,.*1 fluxo,.*2 questionários.*1 vínculo com setor oficial/);
  assert.equal(textoDoResumo(resumoDaRenomeacao(db, "beyond", "Salão")).includes("1 no cadastro"), true);
  assert.equal(textoDoResumo({ total: 0, partes: [] }), "Nenhum outro registro usa este nome.");

  const novo = renomearAmbiente(db, "beyond", "Churrasqueira", "Área do Churrasco");
  const empresa = novo.empresas.beyond;
  assert.deepEqual(empresa.setoresManual, ["Cozinha", "Área do Churrasco", "Salão"]);
  assert.equal(empresa.equipamentosSetores[0].setor, "Área do Churrasco");
  assert.equal(empresa.fluxosOperacionais[0].setorVinculado, "Área do Churrasco");
  assert.deepEqual(Object.keys(empresa.modelosQuestionarioAmbientes), ["Área do Churrasco"]);
  assert.deepEqual(empresa.setorOficialDoAmbiente, { "Área do Churrasco": "Cozinha" });
  assert.deepEqual(Object.keys(empresa.questionarios), ["Área do Churrasco"]);
  assert.equal(empresa.questionarios["Área do Churrasco"].ambiente, "Área do Churrasco");
  const visita = novo.visitas[0];
  assert.deepEqual(visita.ambientes, ["Área do Churrasco"]);
  assert.deepEqual(Object.keys(visita.modelosQuestionarioAmbientes), ["Área do Churrasco"]);
  assert.deepEqual(visita.checklist.map((item) => item.ambiente), ["Área do Churrasco", "Cozinha"]);
  assert.equal(visita.avaliacoesEquipamentos[0].ambiente, "Área do Churrasco");
  assert.equal(novo.ncs[0].ambiente, "Área do Churrasco");
  assert.equal(novo.evidencias[0].ambiente, "Área do Churrasco");
  assert.equal(novo.registrosPop[0].ambiente, "Área do Churrasco");
  // outra empresa e relatório emitido ficam como estavam
  assert.equal(novo.visitas[1].ambientes[0], "Churrasqueira");
  assert.equal(novo.ncs[1].ambiente, "Churrasqueira");
  assert.equal(novo.evidencias[1].ambiente, "Churrasqueira");
  assert.equal(novo.relatoriosEmitidos[0].ambiente, "Churrasqueira");
  // o original não foi alterado
  assert.equal(db.empresas.beyond.setoresManual[1], "Churrasqueira");
  // nome igual não faz nada
  assert.equal(renomearAmbiente(db, "beyond", "Churrasqueira", "  Churrasqueira "), db);
});

test("21. o novo nome não pode repetir um existente (sem acento e sem diferença de maiúsculas)", () => {
  const cadastro = ["Cozinha", "Churrasqueira", "Salão"];
  assert.equal(erroDoNovoNome("Churrasqueira", "", cadastro), "Escreva o novo nome do ambiente.");
  assert.equal(erroDoNovoNome("Churrasqueira", "Churrasqueira", cadastro), "O novo nome é igual ao atual.");
  assert.match(erroDoNovoNome("Churrasqueira", "salao", cadastro), /Já existe: Salão/);
  assert.equal(erroDoNovoNome("Churrasqueira", "Área do Churrasco", cadastro), "");
  assert.equal(erroDoNovoNome("Churrasqueira", "CHURRASQUEIRA nova", cadastro), "");
});

test("22. ambiente sem questionário: aviso no ambiente e vínculo em lote", () => {
  const oficial = SETORES_OFICIAIS_MANUAL[0];
  const setores = [oficial, "Churrasqueira", "Varanda", "Estufa"];
  const sem = ambientesSemQuestionario(setores, SETORES_OFICIAIS_MANUAL, { Estufa: oficial }, { Varanda: oficial });
  assert.ok(sem.includes("Churrasqueira") && !sem.includes("Varanda") && !sem.includes("Estufa"), "vínculo com setor oficial ou questionário escolhido tira o aviso");
  const lote = vincularQuestionarioEmLote({ Estufa: oficial }, ["Churrasqueira", "Varanda"], oficial);
  assert.deepEqual(lote, { Estufa: oficial, Churrasqueira: oficial, Varanda: oficial });
  assert.deepEqual(ambientesSemQuestionario(setores, SETORES_OFICIAIS_MANUAL, lote, {}), []);
  const campos = ler("../components/ManualBaseFields.tsx");
  assert.ok(campos.includes("Sem questionário") && campos.includes("Vincular questionário") && campos.includes("Vincular questionário a vários ambientes"));
});

test("19/20. ambientes numa lista única; fluxos em janela de duas colunas (Escolher fluxos)", () => {
  const campos = ler("../components/ManualBaseFields.tsx");
  assert.ok(campos.includes("Ambientes da empresa") && !campos.includes("Ambientes com nomes próprios da empresa"));
  assert.ok(campos.includes('className="cadamb-lista"') && campos.includes('modo="botao"'));
  const fluxos = ler("../components/OperationalFlowsFields.tsx");
  assert.ok(fluxos.includes('rotuloDoBotao="Escolher fluxos"'));
  const css = ler("../app/globals.css");
  assert.match(css, /\.esc-opcoes\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("35. revisado por página de Cadastros: quem, quando, e volta a pedir revisão se algo mudou", () => {
  const empresa = empresaDeTeste();
  const antes = assinaturaDaPagina(empresa, "ambientes");
  assert.equal(situacaoDaRevisao(undefined, antes), "nunca");
  const revisada = marcarComoRevisado(empresa, "ambientes", { nome: "Elton Volmir Strapazon", cargo: "Nutricionista", id: "u1" }, "2026-10-23T15:00:00.000Z");
  assert.equal(revisada.cadastrosRevisados.ambientes.nome, "Elton Volmir Strapazon");
  assert.equal(revisada.cadastrosRevisados.equipamentos, undefined, "as outras páginas continuam sem revisão");
  assert.equal(situacaoDaRevisao(revisada.cadastrosRevisados.ambientes, assinaturaDaPagina(revisada, "ambientes")), "em-dia");
  const alterada = { ...revisada, setoresManual: [...revisada.setoresManual, "Varanda"] };
  assert.equal(situacaoDaRevisao(alterada.cadastrosRevisados.ambientes, assinaturaDaPagina(alterada, "ambientes")), "desatualizada");
  // mexer em equipamentos não desatualiza a página de ambientes
  const outra = { ...revisada, equipamentosSetores: [] };
  assert.equal(situacaoDaRevisao(outra.cadastrosRevisados.ambientes, assinaturaDaPagina(outra, "ambientes")), "em-dia");
  const formato = (iso) => iso.slice(0, 10).split("-").reverse().join("/");
  assert.equal(textoDaRevisao(revisada.cadastrosRevisados.ambientes, "em-dia", formato), "Revisado por Elton Volmir Strapazon, Nutricionista em 23/10/2026");
  assert.match(textoDaRevisao(revisada.cadastrosRevisados.ambientes, "desatualizada", formato), /Alterado depois da revisão de 23\/10\/2026/);
  assert.equal(textoDaRevisao(undefined, "nunca", formato), "Ainda não revisado");
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("cadastrosRevisados: anterior.cadastrosRevisados"), "salvar a empresa não apaga a revisão");
  assert.ok(pagina.includes('podeMarcar={permitido("empresas.editar", editingEmpresaId)}'), "só quem edita a empresa marca");
});

test("27/40. botão Preencher completa só os campos vazios com dados já existentes", () => {
  const juntar = (cargo, crn) => [cargo, crn].filter(Boolean).join(" ");
  const rt = { nome: "Elton Volmir Strapazon", cargo: "Nutricionista", crn: "CRN-2 12345", telefone: "(51) 99999-0000" };
  const r = preencherIdentificacao({ consultorNome: "Outra Pessoa" }, { rt, juntar, atividade: "Serviços de alimentação", responsavel: "Maria", cargoResponsavel: "Gerente" });
  assert.equal(r.valores.consultorNome, undefined, "o que já foi digitado nunca é trocado");
  assert.equal(r.valores.consultorTelefone, "(51) 99999-0000");
  assert.equal(r.valores.consultorRegistro, "Nutricionista CRN-2 12345");
  assert.equal(r.valores.atividadeDescricao, "Serviços de alimentação");
  assert.equal(r.valores.elaboradoPor, "Outra Pessoa");
  assert.equal(r.valores.revisadoPor, "Outra Pessoa");
  assert.equal(r.valores.aprovadoPor, "Maria, Gerente");
  assert.deepEqual(r.semFonte, ["consultorCpfCnpj", "consultorEndereco", "dataElaboracaoManual"]);
  const nada = preencherIdentificacao({}, { juntar });
  assert.deepEqual(nada.preenchidos, []);
  const componente = ler("../components/IdentificacaoComplementar.tsx");
  assert.ok(componente.includes("Preencher") && componente.includes("onPreencher"));
});

test("34/41. cartão Primeiros passos no Início, na ordem de uso, com o vídeo", () => {
  const cartao = ler("../components/pc/PrimeirosPassos.tsx");
  assert.ok(cartao.includes("Ver o vídeo") && cartao.includes("Feito") && cartao.includes("Pendente") && cartao.includes("O vídeo ainda não foi publicado"), "guia em Ajuda e guias");
  const cartaoDoInicio = ler("../components/pc/PrimeirosPassosCartao.tsx");
  assert.ok(cartaoDoInicio.includes("Ver o vídeo") && cartaoDoInicio.includes("Dispensar"), "o Início voltou a ter o cartão");
  const lib = ler("../lib/inicio.ts");
  const ordem = ["perfil", "empresa", "ambientes", "equipamentos", "fluxos", "visita", "relatorio"].map((chave) => lib.indexOf(`  ${chave}: "`));
  assert.ok(ordem.every((posicao) => posicao > 0) && ordem.every((posicao, i) => i === 0 || posicao > ordem[i - 1]), "Perfil, Empresa, Ambientes, Equipamentos, Fluxos, Visita, Relatório");
  assert.ok(ler("../components/pc/PcAjuda.tsx").includes("<PrimeirosPassos"), "o guia agora mora em Ajuda e guias");
  assert.ok(ler("../components/pc/PcInicio.tsx").includes("<PrimeirosPassos"), "e o Início voltou ao cartão do estado anterior");
});

test("24/25/26/28. IA com cor viva, menu de escolha no lugar do select, 40 px e fundos claros", () => {
  const css = ler("../app/globals.css");
  const pacote = css.slice(css.indexOf("/* ===== Pacote 3: menu de escolha"));
  assert.match(pacote, /\.voz-ia,\.field-assist-ai,\.pc-ai-btn,\.ev7-btn-ia,\.ui-btn--ai\{border:0;background:#1479B8;color:#fff;font-weight:400\}/);
  assert.match(pacote, /\.sel-opcao\.is-marcada\{background:#FEF6E6\}/);
  assert.match(pacote, /\.sel-botao\{[^}]*height:40px;min-height:40px/);
  assert.match(pacote, /\.ui-btn,\.ui-btn--small,[^{]*\{min-height:40px/);
  assert.match(pacote, /\.pc-modal-backdrop[^{]*\{background:rgba\(236,240,245,\.78\)/);
  for (const arquivo of ["../app/page.tsx", "../components/ManualBaseFields.tsx", "../components/pc/PcAcessos.tsx", "../components/pc/PcPopEditor.tsx", "../components/pc/PcComprovantes.tsx"]) {
    assert.equal(/<select\b/.test(ler(arquivo)), false, `${arquivo} ainda usa o select nativo`);
  }
  assert.ok(ler("../components/Select.tsx").includes('role="listbox"'));
});

test("44/45. passos do POP: um menu \"⋯\" e um \"↕\" por linha e uma só rolagem (a lista de passos)", () => {
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes("Mais ações do passo") && editor.includes("Reordenar o passo") && editor.includes("⋯") && editor.includes("↕"));
  assert.equal(editor.includes("Subir o passo"), false);
  const css = ler("../app/globals.css");
  assert.match(css, /\.pdoc-secoes,\.pdoc-previa\{max-height:none;overflow:visible/);
  assert.match(css, /\.pdoc-meio\{max-height:none;overflow:visible/);
  assert.match(css, /\.pdoc-meio--passos \.pdoc-passos\.pop-passos--rolagem\{[^}]*overflow-y:auto/);
});

test("51/52/54. cartaz: pesos de fonte carregados, prévia maior e título do PDF", () => {
  const fontes = ler("../lib/fonts.ts");
  assert.ok(fontes.includes('weight: ["500", "600", "700"]') && fontes.includes('weight: ["400", "500", "600", "700"]'));
  const css = ler("../app/globals.css");
  assert.match(css, /\.ccz \.ccp-corpo\{grid-template-columns:minmax\(0,1fr\) min\(calc\(\(100dvh - 200px\) \* 794 \/ 1123\),52%\)\}/);
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes("Cartaz – Como lavar as mãos – ${aprovadoDoCartaz.pop.codigo") && editor.includes("document.title = tituloAntes;"));
  assert.ok(editor.includes('`${rascunho.codigo || "POP"} – ${rascunho.titulo}`'));
});
