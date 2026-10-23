import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GRUPOS_DA_CENTRAL, ROTULO_DA_SUBABA, destinoDaRotaAntiga, gruposVisiveis, grupoDaSubaba, opcoesDoSeletorDeSecao, subabaAoEscolherSecao, subabasVisiveis } from "../lib/centralEmpresa.ts";
import { itemDoMenu, itensVisiveis, menuLateralPC } from "../lib/navigation.ts";
import { agruparEquipamentosPorAmbiente } from "../lib/manualBase.ts";
import { etiquetasDaLinha, montarLinhaDoPop } from "../lib/popGestao.ts";
import { diferencaComDados } from "../lib/responsavelDoPop.ts";
import { destinoDaPendencia } from "../lib/companyReadiness.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");
const TODOS = { editar: true, verComprovantes: true, gerenciarPessoas: true };

// ===== 2 Estrutura → Cadastros (só o rótulo visível) =====
test("rótulo 'Cadastros' em todos os pontos de exibição; ids internos continuam 'estrutura'", () => {
  const grupos = gruposVisiveis(TODOS);
  assert.deepEqual(grupos.map((grupo) => grupo.rotulo), ["Empresa", "Cadastros", "Documentos"]);
  assert.deepEqual(grupos.map((grupo) => grupo.id), ["empresa", "estrutura", "documentos"], "o id interno não muda");
  // menu de seção do topo e botão "Cadastros ▾" (o rótulo do botão vem do grupo)
  assert.deepEqual(opcoesDoSeletorDeSecao(grupos, "ambientes").map((opcao) => opcao.rotulo), ["Empresa", "Cadastros", "Documentos"]);
  assert.equal(opcoesDoSeletorDeSecao(grupos, "equipamentos").find((opcao) => opcao.atual).rotulo, "Cadastros");
  assert.ok(ler("../app/page.tsx").includes('grupo.id === grupoDaSubaba(subabaDoMenu))?.rotulo'));
  // nenhum texto visível diz "Estrutura" como seção (a palavra só sobrevive em ids e em "estrutura física" dos checklists)
  for (const arquivo of ["../lib/centralEmpresa.ts", "../components/pc/CentralEmpresaNav.tsx", "../components/SeletorDeSecao.tsx", "../components/AppTopbar.tsx", "../components/pc/PcRegistrosDoPop.tsx", "../components/ManualBaseFields.tsx"]) {
    assert.equal(/["'>`] ?Estrutura ?[<"'`›]|Estrutura ›|Estrutura,|Estrutura e /.test(ler(arquivo)), false, `${arquivo} ainda mostra "Estrutura"`);
  }
  const guia = ler("../conteudo-privado/guias/fonte/guia-rapido.html");
  assert.ok(guia.includes("<b>Cadastros</b>"));
  assert.equal(/<b>Estrutura<\/b>|Estrutura:/.test(guia), false);
  assert.ok(ler("../CLAUDE.md").includes("Cadastros ("));
  // aba de dados antiga continua abrindo no lugar certo
  assert.equal(grupoDaSubaba("ambientes"), "estrutura");
  assert.equal(destinoDaRotaAntiga("ambientes"), "ambientes");
  assert.equal(destinoDaRotaAntiga("equipamentos"), "equipamentos");
});

test("item 'Cadastros' na barra lateral: logo depois de Visitas, só para quem edita a empresa, ativo na seção Cadastros", () => {
  const ctx = (editar) => ({ dentroDeVisita: false, pode: (acao) => (acao === "empresas.editar" ? editar : true) });
  const topo = menuLateralPC(ctx(true)).topo.map((item) => item.key);
  assert.ok(topo.indexOf("cadastros") === topo.indexOf("visitas") + 1, `ordem: ${topo.join(",")}`);
  assert.equal(itemDoMenu("cadastros").rotulo, "Cadastros");
  assert.equal(itensVisiveis(ctx(false)).some((item) => item.key === "cadastros"), false);
  // também some quando a tela "Empresas" está oculta para a pessoa
  assert.equal(itensVisiveis({ ...ctx(true), nivelTela: () => "oculta" }).some((item) => item.key === "cadastros"), false);
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('case "cadastros":') && pagina.includes('abrirSecaoEmpresaPeloMenu("ambientes")'), "clicar abre Cadastros › Ambientes");
  assert.ok(pagina.includes('grupoDaSubaba(secaoEmpresa as SubAbaCentral) === "estrutura"') && pagina.includes('? "cadastros"'), "selecionado quando a seção está aberta");
  const icones = ler("../components/NavIcons.tsx");
  assert.ok(icones.includes("cadastros: ("), "ícone de lista");
});

// ===== 3 Abas =====
test("abas de Cadastros: Ambientes | Equipamentos | Fluxos; contagem no título quando maior que zero", () => {
  const cadastros = GRUPOS_DA_CENTRAL.find((grupo) => grupo.id === "estrutura");
  assert.deepEqual(cadastros.subabas, ["ambientes", "equipamentos", "fluxos"]);
  assert.equal(ROTULO_DA_SUBABA.ambientes, "Ambientes");
  assert.equal(ROTULO_DA_SUBABA.equipamentos, "Equipamentos");
  assert.equal(ROTULO_DA_SUBABA.fluxos, "Fluxos");
  assert.ok(subabasVisiveis(TODOS).includes("equipamentos"));
  assert.equal(subabasVisiveis({ editar: false, verComprovantes: true, gerenciarPessoas: true }).includes("equipamentos"), false);
  const nav = ler("../components/pc/CentralEmpresaNav.tsx");
  assert.ok(nav.includes('contagens?.[id] ? ` · ${contagens[id]}` : ""'), "'Equipamentos · 12' só quando > 0");
  assert.ok(ler("../app/page.tsx").includes("contagens={{ ambientes: setoresEmpresa.length, equipamentos: equipamentosEmpresa.length }}"));
  assert.ok(ler("../app/page.tsx").includes('["dados", "manual", "ambientes", "equipamentos", "fluxos", "programas"].includes(secaoEmpresa'), "a barra de salvar continua em todas as abas");
  // pendência de equipamentos abre a aba Equipamentos; setores, Ambientes
  assert.equal(destinoDaPendencia("equipamentos"), "equipamentos");
  assert.equal(destinoDaPendencia("setores"), "ambientes");
});

test("formato dos dados de ambientes e equipamentos inalterado (só reorganizou os cartões)", () => {
  const tipos = ler("../types/index.ts");
  assert.match(tipos, /export type EquipamentoSetor = \{\s*id: string;\s*setor: string;\s*nome: string;\s*quantidade: number;\s*estado: EstadoEquipamento;\s*observacao: string;\s*\};/);
  const campos = ler("../components/ManualBaseFields.tsx");
  assert.match(campos, /id: crypto\.randomUUID\(\),\s*setor: setorEquipamento,\s*nome,\s*quantidade: Math\.max\(1, Number\(quantidadeEquipamento\) \|\| 1\),\s*estado: "Não avaliado",\s*observacao: "",/);
  assert.ok(campos.includes("onSetoresChange([...setores, nome])"), "ambiente próprio continua indo para a mesma lista de setores");
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("setoresManual: setoresEmpresa") && pagina.includes("equipamentosSetores: normalizarEquipamentos(equipamentosEmpresa)"));
});

test("equipamentos agrupados por ambiente, na ordem dos setores, com a contagem no título do grupo; nada some", () => {
  const itens = [
    { id: "1", setor: "Cozinha", nome: "Fogão" },
    { id: "2", setor: "Depósito", nome: "Prateleira" },
    { id: "3", setor: "Cozinha", nome: "Coifa" },
    { id: "4", setor: "Setor removido", nome: "Balança" },
  ];
  const grupos = agruparEquipamentosPorAmbiente(itens, ["Depósito", "Cozinha"]);
  assert.deepEqual(grupos.map((grupo) => [grupo.setor, grupo.itens.length]), [["Depósito", 1], ["Cozinha", 2], ["Setor removido", 1]]);
  assert.equal(grupos.reduce((total, grupo) => total + grupo.itens.length, 0), itens.length);
  assert.deepEqual(agruparEquipamentosPorAmbiente([], ["Cozinha"]), []);
  const campos = ler("../components/ManualBaseFields.tsx");
  assert.ok(campos.includes("{grupo.itens.length}") && campos.includes("cad-conta") && campos.includes("Nenhum equipamento ou móvel cadastrado."));
  assert.ok(campos.includes("Cadastre os itens vinculados a cada setor do estabelecimento."));
  assert.ok(campos.includes('<label className="cad-rotulado cad-rotulado--qtd">') && campos.includes("<span>Qtd</span>"));
});

test("microfone como ícone DENTRO do campo, na ponta direita; sem a linha 'Falar' separada; botão Adicionar de 40 px", () => {
  const campos = ler("../components/ManualBaseFields.tsx");
  const chamadas = campos.match(/<FieldVoiceTools[\s\S]*?\/>/g) || [];
  const dosCampos = chamadas.filter((chamada) => /fieldKey="novo-(ambiente|equipamento)"/.test(chamada));
  assert.equal(dosCampos.length, 2);
  for (const chamada of dosCampos) assert.ok(chamada.includes("somenteVoz") && chamada.includes("soIcone"), "só o ícone do microfone");
  // cada ferramenta de voz dos dois cadastros fica dentro de .ui-field-tools (que é posicionado dentro do campo)
  assert.equal((campos.match(/<span className="ui-field-tools cad-mic">/g) || []).length, 2);
  for (const chave of ["novo-ambiente", "novo-equipamento"]) {
    assert.match(campos, new RegExp(`<span className="ui-field-tools cad-mic">\\s*<FieldVoiceTools\\s+fieldKey="${chave}"`));
  }
  assert.equal(/Falar/.test(campos), false, "sem a linha 'Falar' embaixo do campo");
  const voz = ler("../components/FieldVoiceTools.tsx");
  assert.ok(voz.includes("soIcone?: boolean") && voz.includes("{!soIcone && <span>"), "o texto 'Falar' some, a funcionalidade fica");
  assert.ok(voz.includes('aria-label={gravando ? "Parar e transcrever"'));
  const css = ler("../app/globals.css");
  assert.match(css, /\.cad-adicionar\{flex:none;height:40px;min-height:40px/);
  assert.match(css, /\.cad-input--voz\{padding-right:46px\}/);
  assert.match(css, /\.cad-linha--equipamento \.cad-rotulado--ambiente\{flex:0 0 220px;width:220px\}/);
  assert.match(css, /\.cad-linha--equipamento \.cad-rotulado--qtd\{flex:0 0 80px;width:80px\}/);
  assert.match(css, /\.cad-remover\{[^}]*background:#FDE3E3/);
  assert.match(css, /input::placeholder,textarea::placeholder\{color:#6B7A86/);
  assert.ok(campos.includes("Nome real do ambiente, ex.: Churrasqueira") && campos.includes("Ambientes da empresa") && campos.includes("Setores do estabelecimento"));
  assert.ok(campos.includes("resumoDosSetoresMarcados(setores)"), "mantém a linha de setores marcados e ambientes próprios");
});

// ===== 1.3 Etiquetas =====
const popBase = (extra = {}) => ({ id: "p", codigo: "POP-01", titulo: "Lavagem", versao: "1.0", status: "Aprovado", conteudo: { frequencia: "diária", passos: [] }, aprovacao: { em: "2026-10-01T12:00:00.000Z", nome: "Ana", cargo: "RT", usuarioId: "u1" }, versoes: [], ...extra });
const linhaDe = (pop, extra = {}) => montarLinhaDoPop(pop, undefined, { empresa: { normasAplicadas: [], pops: [pop] }, hoje: "2026-10-22", podeAprovar: false, ...extra });

test("ordem das etiquetas na linha: o alerta primeiro, a situação por último", () => {
  const atrasada = linhaDe(popBase(), { registros: [] });
  assert.equal(atrasada.registroAtrasado, true);
  assert.deepEqual(etiquetasDaLinha(atrasada, {}), ["atraso", "situacao"]);
  assert.deepEqual(etiquetasDaLinha(linhaDe(popBase({ status: "Aguardando aprovação" })), { naoConferido: true }), ["nao-conferido", "situacao"]);
  assert.deepEqual(etiquetasDaLinha(atrasada, { revisar: true, naoConferido: true }), ["atraso", "revisar", "nao-conferido", "situacao"]);
  assert.deepEqual(etiquetasDaLinha(linhaDe(popBase({ conteudo: { frequencia: "mensal", passos: [] } })), {}), ["situacao"]);
  const lista = ler("../components/pc/PcPopsLista.tsx");
  assert.ok(lista.includes("etiquetasDaLinha(linha, {"));
  assert.equal(lista.includes("<Etiqueta situacao={linha.situacao} />\n        {linha.registroAtrasado"), false, "a situação não vem mais primeiro");
});

// ===== 1.4 Aviso de responsável =====
test("aviso 'Os Dados trazem “X”': aparece quando o nome do POP difere de Dados, com ou sem a flag; ignora acento, caixa e espaços", () => {
  const dados = { nome: "Élton  Strapazon", cargo: "Nutricionista" };
  const semFlag = { responsavelExecucao: { nome: "Maria Souza", cargo: "Cozinheira" } };
  const comFlag = { responsavelExecucao: { nome: "Maria Souza", cargo: "Cozinheira" }, responsavelManual: true };
  assert.match(diferencaComDados(semFlag, dados), /Strapazon/, "POP antigo, sem a flag");
  assert.match(diferencaComDados(comFlag, dados), /Strapazon/, "com a flag");
  assert.equal(diferencaComDados({ responsavelExecucao: { nome: "ELTON strapazon", cargo: "" } }, dados), null, "mesmo nome ignorando acento/caixa/espaços");
  assert.equal(diferencaComDados({ responsavelExecucao: { nome: "Outro", cargo: "" }, responsavelManual: false }, dados), null, "acompanha Dados: o campo já mostra o de Dados");
  assert.equal(diferencaComDados(semFlag, { nome: "", cargo: "" }), null, "Dados sem responsável: nada a comparar");
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes("Os Dados trazem “{diferencaDeDados}”") && editor.includes("Usar o de Dados"));
  assert.ok(editor.includes("Responsável neste POP: {executorNaTela.nome}. Os Dados trazem “{diferencaDeDados}”."), "na leitura (POP não editável) o aviso aparece sem o link");
  // POP antigo não é alterado em lote
  assert.deepEqual(semFlag, { responsavelExecucao: { nome: "Maria Souza", cargo: "Cozinheira" } });
});

// ===== 1.1 e 1.2 Topo =====
test("topo: título e menu de seção na mesma linha (quebram só abaixo de ~1100 px); busca encolhe primeiro; 12 px entre os elementos da direita", () => {
  const css = ler("../app/globals.css");
  const bloco = css.slice(css.indexOf("/* ===== Central da Empresa: correções do topo e seção Cadastros (pacote 2R) ===== */"));
  assert.match(bloco, /@media \(min-width:1100px\)\{\s*\.pc-crumbs--secao\{flex-wrap:nowrap;flex:0 0 auto\}\s*\.pc-crumbs--secao \.pc-crumb-current\{white-space:nowrap\}/);
  assert.match(bloco, /\.pc-crumbs--secao\{flex-wrap:wrap\}/);
  assert.match(bloco, /\.pc-crumb-menu\{display:inline-flex;align-items:center;flex:none;white-space:nowrap\}/, "o '›' anda junto com o menu");
  assert.match(bloco, /\.pc-topbar \.pc-busca:not\(\.pc-busca--compacta\)\{flex:1 1 520px;flex-shrink:8;max-width:520px;min-width:220px\}/);
  assert.match(bloco, /\.pc-busca-input\{text-overflow:ellipsis\}/);
  assert.match(bloco, /\.emp-ativa-caixa\{min-width:140px\}/);
  assert.match(bloco, /html\[data-modo\] \.pc-topbar-end\{gap:12px\}/);
  assert.match(bloco, /\.pc-topbar \.pc-voltar\{align-self:center\}/);
  // nesta ordem: rótulo de status (1300) → chip de modo (1180, já existente) → avatar (880)
  const ordem = [bloco.indexOf("@container topo (max-width:1300px)"), css.indexOf("@container topo (max-width:1180px)"), bloco.indexOf("@container topo (max-width:880px)")];
  assert.ok(ordem.every((posicao) => posicao >= 0));
  const topo = ler("../components/AppTopbar.tsx");
  assert.ok(topo.includes('className="pc-crumb-menu"') && topo.indexOf('className="pc-crumb-menu"') < topo.indexOf("<SeletorDeSecao"));
  assert.equal(/\(!ultimo \|\| secao\)/.test(topo), false, "o '›' não fica mais sozinho ao lado do título");
});

// ===== 4.1 Escolha de ambientes da visita =====
test("escolha de ambientes da visita: aviso 'Nenhum ambiente cadastrado' + 'Cadastrar ambientes'; com ambientes, 'Gerenciar ambientes' discreto", () => {
  const tela = ler("../components/pc/PcAmbientes.tsx");
  assert.ok(tela.includes("Nenhum ambiente cadastrado.") && tela.includes("Cadastrar ambientes") && tela.includes("Gerenciar ambientes"));
  assert.ok(tela.indexOf("Cadastrar ambientes") < tela.indexOf("Gerenciar ambientes"));
  assert.ok(tela.includes("cadastroVazio ? ("));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("cadastroVazio={!(empresaVisita?.setoresManual || []).length}"));
  assert.ok(pagina.includes('permitido("empresas.editar", atual.id) ? () => void abrirSecaoEmpresaPeloMenu("ambientes")'), "o link só existe para quem edita a empresa");
});
