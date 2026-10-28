import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { aplicarEscolhaDeFluxos, aplicarEscolhaDeSetores, contadorDaJanela, escolhaMudou, linhaDeContagem, marcadosNaOrdem } from "../lib/escolhaEmJanela.ts";
import { assinaturaEdicaoEmpresa, temAlteracoesNaoSalvas } from "../lib/estadoNaoSalvo.ts";
import { SETORES_OFICIAIS_MANUAL, resumoDosSetoresMarcados } from "../lib/manualBase.ts";
import { DEFINICOES_FLUXOS_OPERACIONAIS, adequarFluxosAosSetores, criarFluxosOperacionaisPadrao, normalizarFluxosOperacionais } from "../lib/operationalFlows.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");
const oficiais = SETORES_OFICIAIS_MANUAL;

// ===== 1.1 Cartão-resumo de setores =====
test("cartão-resumo: chips dos marcados (0, 2 e mais de 6 com '+N') e a linha 'N de T setores marcados'", () => {
  // (a regra dos "6 primeiros + +N" foi substituída pelos chips recolhíveis: ver tests/ajustesE2.test.mjs)
  assert.equal(linhaDeContagem(2, oficiais.length, "setores marcados"), `2 de ${oficiais.length} setores marcados`);
  assert.equal(linhaDeContagem(1, 13, "setores marcados"), "1 de 13 setores marcados");
  assert.equal(contadorDaJanela(3, 13), "3 de 13 marcados");
  assert.ok(oficiais.length >= 13, "T é o total de setores oficiais");
  // os chips seguem a ordem das opções, não a ordem do clique
  assert.deepEqual(marcadosNaOrdem(["a", "b", "c"], ["c", "a"]), ["a", "c"]);
  const campos = ler("../components/ManualBaseFields.tsx");
  assert.ok(campos.includes('rotuloDoBotao="Escolher setores"') && campos.includes('vazio="Nenhum setor marcado"') && campos.includes('palavra="setores marcados"'));
  assert.equal(campos.includes("cad-setor"), false, "as caixas de marcar não ficam mais na tela");
  const janela = ler("../components/EscolhaEmJanela.tsx");
  assert.ok(janela.includes("quantosChipsCabem") && janela.includes("+{escondidos} ▾") && janela.includes('<span aria-hidden="true">✓</span>'));
  assert.ok(janela.includes('<p className="esc-vazio">{vazio}</p>'));
  const css = ler("../app/globals.css");
  assert.match(css, /\.esc-chip\{[^}]*min-height:36px[^}]*border:1\.5px solid #E8B04B[^}]*background:#FEF6E6/);
  assert.match(css, /\.esc-chips\{display:flex;flex-wrap:wrap/);
  assert.match(css, /\.esc-botao\{flex:none;height:38px/);
  assert.match(css, /\.esc-vazio\{[^}]*color:#51606c/);
});

// ===== 1.2 / 1.3 Janela =====
test("janela de escolha: Concluir aplica (e só suja se mudou); Cancelar/Esc descartam; sem mudança devolve o mesmo array", () => {
  const setores = [oficiais[0], oficiais[2], "Churrasqueira"];
  // marcar mais um oficial: entra no fim, o ambiente próprio fica onde estava
  const comMais = aplicarEscolhaDeSetores(setores, oficiais, [oficiais[0], oficiais[1], oficiais[2]]);
  assert.deepEqual(comMais, [oficiais[0], oficiais[2], "Churrasqueira", oficiais[1]]);
  // desmarcar: sai; o ambiente próprio nunca é tocado pela janela
  assert.deepEqual(aplicarEscolhaDeSetores(setores, oficiais, [oficiais[0]]), [oficiais[0], "Churrasqueira"]);
  assert.deepEqual(aplicarEscolhaDeSetores(setores, oficiais, []), ["Churrasqueira"]);
  // Concluir sem mudança (mesmos itens, mesmo em outra ordem de clique): NÃO suja
  assert.equal(aplicarEscolhaDeSetores(setores, oficiais, [oficiais[2], oficiais[0]]), setores);
  assert.equal(escolhaMudou([oficiais[0], oficiais[2]], [oficiais[2], oficiais[0]]), false);
  assert.equal(escolhaMudou([oficiais[0]], [oficiais[0], oficiais[1]]), true);
  // a assinatura que decide o "não salvo" só difere quando o conteúdo difere
  const base = { form: { a: 1 }, responsabilidades: [], setores, equipamentos: [], fluxos: [], programas: [] };
  const salva = assinaturaEdicaoEmpresa(base);
  assert.equal(temAlteracoesNaoSalvas(true, salva, assinaturaEdicaoEmpresa({ ...base, setores: aplicarEscolhaDeSetores(setores, oficiais, [oficiais[2], oficiais[0]]) })), false);
  assert.equal(temAlteracoesNaoSalvas(true, salva, assinaturaEdicaoEmpresa({ ...base, setores: comMais })), true);
  // formato do dado: continua uma lista de textos (setoresManual)
  assert.ok(comMais.every((setor) => typeof setor === "string"));

  const janela = ler("../components/EscolhaEmJanela.tsx");
  assert.ok(janela.includes("if (escolhaMudou(marcadosAgora, escolhidos)) onAplicar(escolhidos);"), "Concluir sem mudança não chama onAplicar");
  assert.ok(janela.includes("useState<string[]>(marcadasAoAbrir)"), "a janela trabalha numa cópia do estado atual");
  assert.ok(janela.includes('evento.key === "Escape"') && janela.includes("cancelarRef.current()"), "Esc = Cancelar");
  assert.ok(janela.includes("onClick={onCancelar}") && janela.includes('className="ui-btn ui-btn--save" onClick={() => onConcluir('));
  assert.equal(/onAplicar\(/.test(janela.slice(janela.indexOf("function JanelaDeEscolha"))), false, "Cancelar não aplica nada: só Concluir chama o pai");
  // sem segundo ponto de salvamento: a janela nunca grava, só avisa o pai
  assert.equal(/salvar|persistir|setDb|localStorage/i.test(janela), false);
  const campos = ler("../components/ManualBaseFields.tsx");
  assert.ok(campos.includes("if (proximos === setores) return;") && campos.includes("onSetoresChange(proximos)"));
});

test("janela: estrutura (modal por cima, fundo rgba(18,32,43,.28), página travada, foco preso, duas colunas, rodapé fixo)", () => {
  const janela = ler("../components/EscolhaEmJanela.tsx");
  for (const trecho of ['role="dialog"', 'aria-modal="true"', "createPortal(", 'document.body.style.overflow = "hidden"', 'html.style.overflow = "hidden"', 'evento.key !== "Tab"', "ultimo.focus()", "primeiro.focus()", "contadorDaJanela(escolha.length, opcoes.length)", "Cancelar", "Concluir"]) {
    assert.ok(janela.includes(trecho), `falta ${trecho}`);
  }
  assert.ok(janela.includes("anterior?.focus?.()"), "devolve o foco ao botão que abriu");
  const css = ler("../app/globals.css");
  const inicioDoBloco = css.indexOf("/* ===== Cadastros: cartão-resumo + janela de escolha");
  const bloco = css.slice(inicioDoBloco, css.indexOf("/* ===== Pacote de ajustes", inicioDoBloco));
  assert.match(bloco, /\.esc-fundo\{position:absolute;inset:0;background:rgba\(18,32,43,\.28\)\}/);
  assert.equal(/rgba\(0,\s*0,\s*0|#000\b/.test(bloco), false, "nunca preto");
  assert.match(bloco, /\.esc-janela\{[^}]*width:min\(1040px,94%\)[^}]*overflow:hidden[^}]*border-radius:16px/);
  assert.match(bloco, /\.esc-corpo\{flex:1 1 auto;min-height:0;overflow-y:auto/, "só o corpo rola");
  assert.match(bloco, /\.esc-cabeca\{flex:none/);
  assert.match(bloco, /\.esc-rodape\{flex:none/);
  assert.match(bloco, /\.esc-opcoes\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(bloco, /@media \(max-width:759px\)\{\.esc-opcoes\{grid-template-columns:minmax\(0,1fr\)\}\}/);
  assert.match(bloco, /\.esc-opcao\{[^}]*min-height:46px[^}]*border:1\.5px solid #B4C2CE/);
  assert.match(bloco, /\.esc-opcao\.is-on\{border-color:#E8B04B;background:#FEF6E6\}/);
  assert.match(bloco, /\.esc-caixa:checked\{border-color:#AF640A;background:#AF640A\}/);
  assert.match(bloco, /\.esc-titulo\{[^}]*font-size:20px;font-weight:500/);
  assert.equal(/text-overflow|white-space:nowrap/.test(bloco.slice(bloco.indexOf(".esc-opcao{"))), false, "o nome do setor nunca é cortado");
  assert.ok(janela.includes("Marque somente") === false, "o apoio vem de quem usa a janela");
  assert.ok(ler("../components/ManualBaseFields.tsx").includes("Marque somente os setores que realmente existem nesta empresa."));
});

// ===== 2 Fluxos =====
const fluxos = () => adequarFluxosAosSetores(criarFluxosOperacionaisPadrao(), [...oficiais]);

test("fluxos: mesma janela; descrição de cada fluxo na opção; título sem 'Capítulo 2'; formato do dado inalterado", () => {
  const lista = fluxos();
  assert.equal(lista.length, 11);
  const marcados = aplicarEscolhaDeFluxos(lista, [...oficiais], [lista[0].id, lista[3].id]);
  assert.deepEqual(marcados.filter((fluxo) => fluxo.aplicavel).map((fluxo) => fluxo.tipo), [lista[0].tipo, lista[3].tipo]);
  assert.deepEqual(Object.keys(marcados[0]).sort(), Object.keys(lista[0]).sort(), "o formato de cada fluxo não muda");
  assert.deepEqual(Object.keys(marcados[0]).sort(), ["aplicavel", "controlesRegistros", "descricao", "id", "responsavel", "setorVinculado", "tipo"]);
  assert.equal(marcados[1], lista[1], "quem não mudou continua sendo o mesmo objeto");
  // desmarcar mantém os detalhes digitados (não apaga descrição nem responsável)
  const comTexto = marcados.map((fluxo) => (fluxo.id === lista[0].id ? { ...fluxo, descricao: "Conferimos tudo", responsavel: "Ana" } : fluxo));
  const desmarcado = aplicarEscolhaDeFluxos(comTexto, [...oficiais], [lista[3].id]);
  assert.equal(desmarcado[0].aplicavel, false);
  assert.equal(desmarcado[0].descricao, "Conferimos tudo");
  // sem mudança: o mesmo array (não suja)
  assert.equal(aplicarEscolhaDeFluxos(marcados, [...oficiais], [lista[3].id, lista[0].id]), marcados);
  // ao marcar um fluxo cujo setor padrão não existe na empresa, ele fica SEM setor (o RT escolhe; nada é adivinhado)
  const semSetor = aplicarEscolhaDeFluxos(lista, ["Cozinha / Produção"], [lista[0].id]);
  assert.equal(semSetor[0].setorVinculado, "");
  const campos = ler("../components/OperationalFlowsFields.tsx");
  assert.ok(campos.includes('titulo="Fluxos operacionais"') && campos.includes('apoio="Marque os fluxos que existem na sua empresa."'));
  assert.equal(campos.includes("Capítulo 2"), false);
  assert.ok(campos.includes('rotuloDoBotao="Escolher fluxos"') && campos.includes('palavra="fluxos marcados"'));
  assert.ok(campos.includes("descricao: DEFINICOES_FLUXOS_OPERACIONAIS.find((item) => item.tipo === fluxo.tipo)?.orientacao"), "a descrição atual do fluxo aparece na janela");
  assert.ok(DEFINICOES_FLUXOS_OPERACIONAIS.every((definicao) => definicao.orientacao.length > 0));
  assert.equal(/Manual de Boas Pr/.test(campos), false, "nada afirmado sobre o Manual: a seleção alimenta o checklist, não o texto do Manual");
  assert.ok(campos.includes("if (proximos !== fluxos) onChange(proximos);"));
  // os detalhes dos marcados (setor, responsável, descrição, controles) continuam editáveis
  for (const rotulo of ["Setor onde ocorre", "Responsável", "Como acontece nesta empresa?", "Controles e registros usados"]) assert.ok(campos.includes(rotulo));
  const css = ler("../app/globals.css");
  assert.match(css, /\.esc-opcao-descricao\{font-size:13\.5px;[^}]*color:#51606c\}/);
  assert.match(css, /\.esc-opcao-titulo\{[^}]*font-weight:500/);
});

// ===== 3 Estado "não salvo" =====
test("bug do 'não salvo' na aba Fluxos: ações de POP gravam na hora e não podem sujar o formulário", () => {
  const edicao = { form: { cnpj: "1" }, responsabilidades: [{ id: "r" }], setores: [oficiais[0]], equipamentos: [], fluxos: fluxos(), programas: [] };
  const salva = assinaturaEdicaoEmpresa({ ...edicao, pops: [] });
  // CAUSA: a lista de POPs entrava na assinatura, mas cada ação de POP grava na hora e muda só a lista do formulário (a linha de base ficava velha).
  const depoisDeCriarPop = assinaturaEdicaoEmpresa({ ...edicao, pops: [{ id: "novo", titulo: "x" }] });
  assert.equal(depoisDeCriarPop, salva);
  assert.equal(temAlteracoesNaoSalvas(true, salva, depoisDeCriarPop), false);
  // mudança de verdade continua sujando; voltar ao que era limpa de novo
  const alterada = assinaturaEdicaoEmpresa({ ...edicao, setores: [oficiais[0], oficiais[1]] });
  assert.equal(temAlteracoesNaoSalvas(true, salva, alterada), true);
  assert.equal(temAlteracoesNaoSalvas(true, salva, assinaturaEdicaoEmpresa({ ...edicao, setores: [oficiais[0]] })), false);
  // sem linha de base ou fora da edição: nunca "não salvo"
  assert.equal(temAlteracoesNaoSalvas(true, "", alterada), false);
  assert.equal(temAlteracoesNaoSalvas(false, salva, alterada), false);
  // depois do Salvar a nova linha de base é a atual
  assert.equal(temAlteracoesNaoSalvas(true, alterada, alterada), false);
  const pagina = ler("../app/page.tsx");
  assert.equal(pagina.includes("function assinaturaEdicaoEmpresa("), false, "uma só definição, em lib/estadoNaoSalvo.ts");
  assert.ok(pagina.includes("temAlteracoesNaoSalvas(showEmpresaForm, assinaturaEmpresaSalva, assinaturaEmpresaAtual)"));
  assert.ok(pagina.includes("if (editingEmpresaId === empresaId) setPopsEmpresa(normalizados);"), "persistir POP muda a lista do formulário (e agora isso não suja)");
  assert.ok(ler("../lib/estadoNaoSalvo.ts").includes("Os POPs ficam FORA da assinatura"));
});

test("abas sem alteração mantêm 'salvo': carregar a empresa e normalizar de novo não muda nada (idempotência)", () => {
  const setores = [oficiais[0], oficiais[3], "Churrasqueira"];
  const carregados = adequarFluxosAosSetores(undefined, setores);
  assert.deepEqual(adequarFluxosAosSetores(carregados, setores), carregados, "adequar duas vezes = adequar uma");
  assert.deepEqual(normalizarFluxosOperacionais(carregados), carregados);
  // fluxo marcado com setor válido não é "corrigido" ao montar a aba (o efeito da aba só age se o setor sumiu)
  const marcado = carregados.map((fluxo, indice) => (indice === 0 ? { ...fluxo, aplicavel: true, setorVinculado: setores[0] } : fluxo));
  assert.deepEqual(adequarFluxosAosSetores(marcado, setores), marcado);
  const assinatura = (lista) => assinaturaEdicaoEmpresa({ form: {}, responsabilidades: [], setores, equipamentos: [], fluxos: lista, programas: [] });
  assert.equal(temAlteracoesNaoSalvas(true, assinatura(carregados), assinatura(adequarFluxosAosSetores(carregados, setores))), false);
  // a aba Fluxos agora só chama onChange quando a escolha muda de verdade
  const campos = ler("../components/OperationalFlowsFields.tsx");
  assert.ok(campos.includes("if (alterou) onChange(corrigidos);"));
  // 3.2: trocar de aba mantém o que foi digitado (um só formulário); o aviso ao sair vale para sair da Central, não para trocar de aba
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("function irParaSubaba(sub: SubAbaCentral) {\n    setEmpresaSecao(sub);") || pagina.includes("function irParaSubaba(sub: SubAbaCentral) {\r\n    setEmpresaSecao(sub);"));
  assert.ok(pagina.includes('window.addEventListener("beforeunload", avisarSaida)'));
});

test("resumo da linha de ambientes: 'N setores marcados · M ambientes próprios da empresa'", () => {
  assert.equal(resumoDosSetoresMarcados([oficiais[0], oficiais[1], "Churrasqueira"]), "2 setores marcados · 1 ambiente próprio da empresa");
  assert.equal(resumoDosSetoresMarcados([oficiais[0]]), "1 setor marcado · 0 ambientes próprios da empresa");
  assert.equal(resumoDosSetoresMarcados([]), "0 setores marcados · 0 ambientes próprios da empresa");
});
