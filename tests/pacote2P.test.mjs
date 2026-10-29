import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { criarPopDeModelo, listarModelos, modeloPorId } from "../lib/popModelos.ts";
import { MODELOS_COM_BLOQUEIO, ROTULO_CURTO_NAO_CONFERIDO, ROTULO_NAO_CONFERIDO, bloqueioDeAprovacao } from "../lib/popConferencia.ts";
import { SECOES_DO_MODELO, limparConteudoDoModelo, secaoDoModeloTemConteudo, secoesDoModeloComConteudo, sugestaoDeFrequencia } from "../lib/popConteudoModelo.ts";
import { inicioDeGrupo, numerosDosPassos, semSubtitulosVazios, subtitulosEmVigor } from "../lib/popPassos.ts";
import { AVISO_CONFERIR_ITENS_DE_SEGURANCA, avisoDeConferenciaObrigatoria, secoesQueFaltamParaEnviar, textoDaFalta } from "../lib/popEnvio.ts";
import { folhaDoPop } from "../lib/popDocumento.ts";
import { ordenarPorCodigo } from "../lib/popGestao.ts";
import { mostrarVoltar, nivelAcima, registrarLocal, voltarUma } from "../lib/historicoDeTelas.ts";
import { LIMITE_DE_TELAS_RECENTES, chaveDoContinuar, esquecerTela, lerContinuar, limparContinuar, registrarTela } from "../lib/continuarDeOndeParei.ts";
import { confirmarConexao, conexaoAtual } from "../lib/conexao.ts";
import { divergenciaDeResponsavel, mesmoNome } from "../lib/responsavelEstabelecimento.ts";
import { cssDoDocumentoImpresso } from "../lib/printFooter.ts";
import { TERMOS_PROIBIDOS, enxugar, varrerTermosProibidos } from "../scripts/gerar-catalogo-pops.mjs";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");
let contador = 0;
const gerarId = () => `p-${(contador += 1)}`;
const responsavel = { nome: "Maria da Silva", cargo: "Nutricionista RT" };
const criar = (modeloId, extra = {}) => {
  const resultado = criarPopDeModelo({ modelo: modeloPorId(modeloId), pops: [], empresa: "Beyond Nutri", responsavel, id: `pop-${modeloId}`, gerarId, ...extra });
  assert.equal(resultado.ok, true, JSON.stringify(resultado));
  return resultado.pop;
};
const armazemFalso = () => {
  const dados = new Map();
  return {
    dados,
    getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
    setItem: (chave, valor) => void dados.set(chave, String(valor)),
    removeItem: (chave) => void dados.delete(chave),
    key: (indice) => [...dados.keys()][indice] ?? null,
    get length() {
      return dados.size;
    },
  };
};
const textosDoCatalogo = () => {
  const saida = [];
  const andar = (valor) => {
    if (typeof valor === "string") saida.push(valor);
    else if (Array.isArray(valor)) valor.forEach(andar);
    else if (valor && typeof valor === "object") Object.values(valor).forEach(andar);
  };
  andar(listarModelos());
  return saida;
};

// ===== 1.1 e 1.2: botão "+ Adicionar POP" e janela de modelos =====
test("'+ Adicionar POP' fica à direita dos contadores, laranja médio de 44 px; 'Criar POPs da norma' só aparece quando falta criar", () => {
  const lista = ler("../components/pc/PcPopsLista.tsx");
  assert.equal(lista.split("+ Adicionar POP").length - 1, 1, "só um botão '+ Adicionar POP'");
  assert.equal(lista.includes("pgl-add-menu"), false, "sem menu de duas opções");
  assert.equal(lista.includes("POP em branco"), false);
  assert.ok(lista.indexOf("pgg-contadores\"") < lista.indexOf("pgl-acoes"), "os botões vêm depois dos contadores");
  assert.match(lista, /temConjunto && faltamCriar > 0 && \(\s*<button type="button" className="ui-btn ui-btn--secondary"/);
  assert.equal(lista.includes("Os POPs do modelo já foram criados"), false, "sem o texto solto quando o conjunto já foi criado");
  const css = ler("../app/globals.css");
  assert.match(css, /\.pgl-adicionar-botao\{height:44px;[^}]*background:#264A80/);
  // abre DIRETO o painel de modelos
  assert.match(lista, /onClick=\{\(\) => \(onCriarDeModelo \? setDeModelo\(true\) : setAdicionando\(true\)\)\}/);
});

test("janela de modelos: título, busca e Cancelar fixos; lista com rolagem interna; ESC fecha; página de fundo travada; 'Começar em branco'", () => {
  const janela = ler("../components/pc/PcModelosPop.tsx");
  for (const trecho of ["Adicionar POP", "aria-label=\"Buscar modelo de POP\"", "Cancelar", "Modelo selecionado:", "Criar POP", "Começar em branco", "← Voltar à lista", 'role="dialog"', 'aria-modal="true"']) {
    assert.ok(janela.includes(trecho), trecho);
  }
  assert.ok(janela.includes('evento.key === "Escape"') && janela.includes("cancelarRef.current()"));
  assert.ok(janela.includes("createPortal") && janela.includes('document.body.style.overflow = "hidden"'), "trava a rolagem da página de fundo");
  assert.ok(janela.includes("data-etapa={etapa}"), "em tela estreita: lista e prévia em duas etapas");
  const css = ler("../app/globals.css");
  assert.match(css, /\.mdl-janela\{[^}]*overflow:hidden/);
  assert.match(css, /\.mdl-lista\{[^}]*overflow-y:auto/);
  assert.match(css, /@media \(max-width:899px\)\{\s*\.mdl-janela\{width:100vw/);
  assert.match(css, /\.mdl-janela\[data-etapa="previa"\] \.mdl-lista-area\{display:none\}/);
  // o "Criar POP" laranja fica no rodapé fixo da janela, e há a caixa de seleção com marca
  assert.match(css, /\.mdl-rodape\{display:flex;flex:none/);
  assert.ok(janela.includes("mdl-selecionado-marca"));
  assert.equal(janela.split("ui-btn--criar").length - 1, 1, "um só botão laranja");
});

// ===== 1.3: voltar e continuar de onde parei =====
test("voltar: volta uma tela pelo histórico; sem histórico vai ao nível acima; some no Início", () => {
  let pilha = [];
  pilha = registrarLocal(pilha, { view: "inicio" });
  pilha = registrarLocal(pilha, { view: "pops", sub: "pops" });
  pilha = registrarLocal(pilha, { view: "pops", sub: "pops" });
  assert.equal(pilha.length, 2, "não repete o que já está no topo");
  pilha = registrarLocal(pilha, { view: "pops", sub: "pops", popId: "abc" });
  const volta = voltarUma(pilha);
  assert.deepEqual(volta.destino, { view: "pops", sub: "pops" });
  assert.equal(volta.pilha.length, 2);
  assert.equal(voltarUma([{ view: "inicio" }]).destino, undefined);
  assert.deepEqual(nivelAcima({ view: "pops", sub: "pops", popId: "abc" }), { view: "pops", sub: "pops" });
  assert.deepEqual(nivelAcima({ view: "checklist" }), { view: "visitas" });
  assert.deepEqual(nivelAcima({ view: "acessos" }), { view: "inicio" });
  assert.equal(mostrarVoltar({ view: "inicio" }), false);
  assert.equal(mostrarVoltar({ view: "pops", popId: "abc" }), true);
});

test("botão '←': cinza #EEF1F7, 36 px, aria-label 'Voltar', antes do caminho, ligado na página", () => {
  const topo = ler("../components/AppTopbar.tsx");
  assert.match(topo, /aria-label="Voltar"/);
  assert.ok(topo.indexOf("pc-voltar") < topo.indexOf('aria-label="Caminho"'));
  const css = ler("../app/globals.css");
  assert.match(css, /\.pc-voltar\{[^}]*width:36px;height:36px[^}]*background:#EEF1F7/);
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("onVoltar={mostrarVoltar(localDaTela) ? () => void voltarUmaTela() : undefined}"));
  assert.ok(pagina.includes("voltarUma(pilhaDeTelasRef.current)") && pagina.includes("nivelAcima(localDaTela)"));
});

test("continuar de onde parei: até 3 telas, por usuário e empresa, só rota e rótulo; some no logout", () => {
  const armazem = armazemFalso();
  registrarTela({ tipo: "pop", id: "p1", rotulo: "POP-05 · Lavagem e higienização de mãos" }, "u1", "e1", armazem);
  registrarTela({ tipo: "comprovantes", id: "", rotulo: "Comprovantes" }, "u1", "e1", armazem);
  registrarTela({ tipo: "visita", id: "v1", rotulo: "Visita 3 · 21/10/2026" }, "u1", "e1", armazem);
  const quarta = registrarTela({ tipo: "pop", id: "p2", rotulo: "POP-06 · Higienização de bancadas" }, "u1", "e1", armazem);
  assert.equal(quarta.length, LIMITE_DE_TELAS_RECENTES);
  assert.equal(quarta[0].id, "p2", "a mais nova primeiro");
  assert.equal(quarta.some((tela) => tela.id === "p1"), false, "a mais antiga saiu");
  // repetir uma tela não duplica, só sobe
  const repetida = registrarTela({ tipo: "visita", id: "v1", rotulo: "Visita 3 · 21/10/2026" }, "u1", "e1", armazem);
  assert.equal(repetida.filter((tela) => tela.id === "v1").length, 1);
  assert.equal(repetida[0].id, "v1");
  // por usuário e por empresa
  assert.deepEqual(lerContinuar("u2", "e1", armazem), []);
  assert.deepEqual(lerContinuar("u1", "e2", armazem), []);
  assert.equal(lerContinuar("u1", "e1", armazem).length, 3);
  // só rota e rótulo: nenhum outro campo é guardado
  const bruto = JSON.parse(armazem.getItem(chaveDoContinuar("u1", "e1")));
  for (const item of bruto) assert.deepEqual(Object.keys(item).sort(), ["id", "rotulo", "tipo"]);
  assert.deepEqual(registrarTela({ tipo: "pop", id: "x", rotulo: "POP-01", nome: "Maria", cpf: "000" }, "u3", "e3", armazem), [{ tipo: "pop", id: "x", rotulo: "POP-01" }]);
  // esquecer uma tela
  assert.equal(esquecerTela("pop", "p2", "u1", "e1", armazem).some((tela) => tela.id === "p2"), false);
  // logout: apaga tudo deste aparelho
  limparContinuar(armazem);
  assert.equal(armazem.length, 0);
  // armazenamento quebrado não derruba nada
  const quebrado = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); }, key: () => null, length: 0 };
  assert.deepEqual(lerContinuar("u1", "e1", quebrado), []);
  assert.equal(registrarTela({ tipo: "pop", id: "z", rotulo: "POP-09" }, "u1", "e1", quebrado).length, 1);
});

test("continuar de onde parei: cartão no Início com botões cinza (sem laranja) e limpeza no logout", () => {
  const inicio = ler("../components/pc/PcInicio.tsx");
  assert.ok(inicio.includes("Continuar de onde parei"));
  const cartao = inicio.slice(inicio.indexOf('aria-label="Continuar de onde parei"'), inicio.indexOf("{painel}"));
  assert.ok(inicio.includes("ini3-botao") && !inicio.includes("ui-btn--criar"), "botão azul no cartão, sem botão laranja");
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("limparContinuar();") && pagina.indexOf("limparContinuar();") < pagina.indexOf("authClient.signOut()"));
  const pops = ler("../components/pc/PcPops.tsx");
  assert.match(pops, /rotuloCompleto = popEmFicha \? \[popEmFicha\.codigo, popEmFicha\.titulo\]/);
  // rótulo só com código e título: nenhum nome de pessoa entra na lista
  assert.ok(!/nome|responsavel/i.test(pops.slice(pops.indexOf("const rotuloCompleto"), pops.indexOf("useEffect(() => {\n    aoMudarFicha"))));
});

// ===== 2.1: caixas que crescem =====
test("caixas de texto crescem com o conteúdo: Objetivo, Campo de aplicação, Passos, Ação corretiva e Conteúdo do modelo", () => {
  const caixa = ler("../components/CaixaQueCresce.tsx");
  assert.ok(caixa.includes("scrollHeight") && caixa.includes("ResizeObserver") && caixa.includes("caixa-cresce"));
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.match(editor, /<CaixaQueCresce className=\{`ui-input pop-area/, "Campo com linhas usa a caixa que cresce");
  assert.ok(editor.includes('rotulo="Objetivo" linhas={2}') && editor.includes('rotulo="Campo de aplicação" linhas={2}') && editor.includes('rotulo="Ação corretiva" linhas={3}'));
  assert.match(editor, /<CaixaQueCresce\s+className=\{`ui-input pop-passo-texto/, "cada passo");
  assert.equal(editor.includes("<textarea"), false, "nenhum textarea fixo sobrou no editor");
  assert.equal(editor.includes('type="text"\n                        className={`ui-input${avisar'), false, "passo não é mais uma linha só");
  const css = ler("../app/globals.css");
  assert.match(css, /\.caixa-cresce\{overflow:hidden!important;resize:none!important/);
  assert.match(css, /\.pdoc-passos\.pop-passos--rolagem\{max-height:none;overflow:visible\}/);
});

// ===== 2.2: enviar para aprovação nunca fica sem resposta =====
test("enviar incompleto: 'Falta: …' em âmbar, seção marcada na lista e a primeira incompleta abre", () => {
  const vazio = { titulo: "POP-05", conteudo: { passos: [{ id: "1", texto: "Lavar" }], responsavelExecucao: { nome: "Ana", cargo: "Cozinheira" }, frequencia: "" } };
  const faltas = secoesQueFaltamParaEnviar(vazio);
  assert.deepEqual(faltas, [{ id: "responsavel", titulo: "Responsável e frequência" }]);
  assert.equal(textoDaFalta(faltas), "Falta: Responsável e frequência");
  const varias = secoesQueFaltamParaEnviar({ titulo: "", conteudo: { passos: [{ id: "1", texto: "" }] } });
  assert.deepEqual(varias.map((falta) => falta.id), ["identificacao", "responsavel", "passos"]);
  assert.equal(textoDaFalta(varias), "Falta: Identificação; Responsável e frequência; Passos");
  assert.deepEqual(secoesQueFaltamParaEnviar({ titulo: "X", conteudo: { passos: [{ id: "1", texto: "a" }, { id: "2", texto: "" }], responsavelExecucao: { nome: "A", cargo: "B" }, frequencia: "Diária" } }).map((falta) => falta.id), ["passos"]);
  assert.equal(textoDaFalta([]), "");
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes("function enviarParaAprovar()") && editor.includes("setTentouEnviar(true)") && editor.includes("setSecao(primeira.id)"));
  assert.match(editor, /tentouEnviar && secoesQueFaltam\.some\(\(falta\) => falta\.id === item\.id\) \? " is-falta"/);
  assert.ok(editor.includes('className="pdoc-falta" role="alert"'));
  const css = ler("../app/globals.css");
  assert.match(css, /\.pdoc-falta\{[^}]*background:#FFE8A3/);
  assert.match(css, /\.pdoc-item\.is-falta\{border-color:#21A3A3/);
});

test("comp-13: chip informativo 'Será preciso conferir os itens de segurança antes de aprovar' e bloqueio mantido", () => {
  const pop = criar("comp-13");
  assert.equal(avisoDeConferenciaObrigatoria(pop), AVISO_CONFERIR_ITENS_DE_SEGURANCA);
  assert.equal(AVISO_CONFERIR_ITENS_DE_SEGURANCA, "Será preciso conferir os itens de segurança antes de aprovar");
  assert.equal(avisoDeConferenciaObrigatoria(criar("comp-02")), "");
  assert.equal(avisoDeConferenciaObrigatoria({ ...pop, conferencia: { conferido: true } }), "");
  assert.deepEqual([...MODELOS_COM_BLOQUEIO], ["comp-13"]);
  assert.equal(bloqueioDeAprovacao(pop), "Revise os itens de segurança antes de aprovar");
  assert.ok(ler("../components/pc/PcPopEditor.tsx").includes("pdoc-chip-conferir"));
});

test("botões que ficavam mudos agora dizem por quê: Salvar sem título, Marcar como conferido e Criar POP", () => {
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes('"Falta: Identificação"'));
  assert.ok(ler("../components/pc/PcFichaPop.tsx").includes("Marque todos os itens para liberar</span>"));
  const janela = ler("../components/pc/PcModelosPop.tsx");
  assert.ok(janela.includes("Escolha um modelo</span>") && janela.includes("Falta: título"));
});

// ===== 2.3: sugestão de frequência =====
test("sugestão de frequência: aparece nos 19 modelos que têm frequência (comp-01 não tem) e o campo nunca é preenchido", () => {
  const semFrequencia = [];
  for (const modelo of listarModelos()) {
    const pop = criar(modelo.id);
    const sugestao = sugestaoDeFrequencia(pop.conteudo.frequenciaDetalhe);
    if (!sugestao) semFrequencia.push(modelo.id);
    assert.equal(pop.conteudo.frequencia, "", modelo.id);
  }
  assert.deepEqual(semFrequencia, ["comp-01"]);
  assert.match(sugestaoDeFrequencia(criar("res-01").conteudo.frequenciaDetalhe), /Da retirada do resíduos dos setores de produção: /);
  assert.ok(sugestaoDeFrequencia(criar("res-01").conteudo.frequenciaDetalhe).includes(" · "), "frequência em grupos");
  // a sugestão é clicável no editor
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes("Sugestão do modelo:") && editor.includes("onClick={() => mudar({ frequencia: sugestaoDaFrequencia })}"));
});

// ===== 2.4 e 3: pendências reescritas =====
test("bloco conferido: cinza neutro, recolhido, 'Conferido por [nome], [cargo], em [data]' e itens ao expandir", () => {
  const ficha = ler("../components/pc/PcFichaPop.tsx");
  assert.ok(ficha.includes('className="ficha-conferir ficha-conferir--feito"'));
  assert.ok(ficha.includes("Conferido por {nomeECargo(") && ficha.includes('{pop.conferencia.em ? `, em ${dataBr(pop.conferencia.em)}` : ""}'));
  assert.equal(/<details[^>]*\bopen\b/.test(ficha), false, "recolhido por padrão");
  assert.ok(ficha.includes("ficha-conferir-marca"));
  const css = ler("../app/globals.css");
  assert.match(css, /\.ficha-conferir--feito\{[^}]*background:#EEF1F7/);
});

test("pendências: ação clara, sem números do material original nem verbos de auditoria", () => {
  const proibidas = [/\b\d+\.\d+\b/, /\bpasso \d/i, /\bMantida\b/i, /\bmantido como\b/i, /\boriginal\b/i, /\bmaterial de origem\b/i, /\bvinha com\b/i, /\bNão acrescentei\b/i, /\bnão alterei\b/i, /\bRetirados os itens\b/i];
  let total = 0;
  for (const modelo of listarModelos()) {
    for (const pendencia of modelo.pendencias) {
      total += 1;
      for (const regra of proibidas) assert.doesNotMatch(pendencia, regra, `${modelo.id}: ${pendencia}`);
    }
  }
  assert.ok(total >= 50);
  const exemplo = modeloPorId("comp-03").pendencias[0];
  assert.equal(exemplo, 'Ações corretivas: frase genérica "Aplicar medidas previstas em regulamento interno para descumprimento das atividades acordadas entre gerência e colaboradores": decidir se mantém, suaviza ou retira.');
});

// ===== 2.5: chip e ordem =====
test("chip 'Modelo não conferido': curto, título completo no atributo title; na lista vira texto cinza no estado, sem pílula", () => {
  assert.equal(ROTULO_CURTO_NAO_CONFERIDO, "Modelo não conferido");
  assert.equal(ROTULO_NAO_CONFERIDO, "Conteúdo de modelo não conferido");
  const ficha = ler("../components/pc/PcFichaPop.tsx");
  assert.ok(ficha.includes('className="pop-revisar pop-nao-conferido" title={ROTULO_NAO_CONFERIDO}>{ROTULO_CURTO_NAO_CONFERIDO}'));
  const lista = ler("../components/pc/PcPopsLista.tsx");
  assert.ok(lista.includes('className="pgl-estado-cinza" title={ROTULO_NAO_CONFERIDO}') && lista.includes("{ROTULO_CURTO_NAO_CONFERIDO}"));
  assert.equal(lista.includes("pop-nao-conferido"), false, "na lista não há pílula");
  const css = ler("../app/globals.css");
  assert.match(css, /\.pop-nao-conferido\{white-space:nowrap/);
  assert.match(css, /\.pgl-estado-cinza\{color:#526477\}/);
});

test("'Outros POPs' em ordem de código (POP-05, POP-06…), não de urgência", () => {
  const ordenados = ordenarPorCodigo([
    { codigo: "POP-10", titulo: "J" },
    { codigo: "", titulo: "Sem código B" },
    { codigo: "POP-05", titulo: "E" },
    { codigo: "POP-06", titulo: "F" },
    { codigo: "", titulo: "Sem código A" },
    { codigo: "POP-09", titulo: "I" },
  ]);
  assert.deepEqual(ordenados.map((linha) => linha.codigo || linha.titulo), ["POP-05", "POP-06", "POP-09", "POP-10", "Sem código A", "Sem código B"]);
  assert.ok(ler("../lib/popGestao.ts").includes("outros: ordenarPorCodigo(outros)"));
});

// ===== 2.6: imprimir no editor =====
test("'Imprimir / PDF' também no editor do rascunho, com a linha 'Conteúdo de modelo ainda não conferido' no diálogo", () => {
  const editor = ler("../components/pc/PcPopEditor.tsx");
  const previa = editor.slice(editor.indexOf('aria-label="Pré-visualização da folha"'), editor.indexOf("{onImprimir && (\n            // Cópia"));
  assert.ok(previa.includes("Imprimir / PDF") && previa.includes("setEscolhendoImpressao(true)") && previa.includes("ui-btn--secondary"));
  assert.ok(editor.includes('className="pdoc-so-papel"') && editor.includes('id="pop-folha"'));
  assert.ok(editor.includes("avisoNaoConferido={popNaoConferido(comConferenciaAtual(rascunho))}"));
  assert.ok(ler("../components/pc/ConfigCapaDoPop.tsx").includes("Conteúdo de modelo ainda não conferido"));
  // o papel sai marcado como rascunho
  const pop = criar("comp-02");
  assert.match(folhaDoPop(pop, { nome: "Beyond Nutri" }).situacao, /^Rascunho/);
});

// ===== 2.7: Conteúdo do modelo =====
test("'Conteúdo do modelo' mostra só as listas preenchidas; as vazias entram por '+ Adicionar seção'", () => {
  const pop = criar("comp-01");
  const comConteudo = secoesDoModeloComConteudo(pop.conteudo);
  assert.ok(comConteudo.length > 0 && comConteudo.length < SECOES_DO_MODELO.length, "o modelo não preenche todas as seções");
  for (const secao of SECOES_DO_MODELO) assert.equal(comConteudo.includes(secao.id), secaoDoModeloTemConteudo(pop.conteudo, secao.id), secao.id);
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes("secoesDoModeloAbertas.includes(item.id)") && editor.includes("+ Adicionar seção") && editor.includes("useState<IdDaSecaoDoModelo[]>(() => secoesDoModeloComConteudo(pop.conteudo || {}))"));
  assert.match(editor, /Para subitem, comece a linha com -/);
  const css = ler("../app/globals.css");
  assert.match(css, /\.pdoc-ajuda\{white-space:normal!important;overflow:visible!important;text-overflow:clip!important\}/);
});

test("editores guiados: Definições (Termo, Texto) e Responsabilidades (Título e itens); sem a sintaxe técnica '# Título'", () => {
  const editor = ler("../components/pc/PcPopEditor.tsx");
  for (const trecho of ["function EditorDeDefinicoes", "Termo", "Texto", "+ Adicionar definição", "function EditorDeResponsabilidades", "Título", "+ Adicionar grupo"]) assert.ok(editor.includes(trecho), trecho);
  assert.equal(editor.includes("“# Título”"), false);
  assert.equal(editor.includes("Termo: texto"), false);
  // limpeza ao gravar: linhas em branco somem
  const limpo = limparConteudoDoModelo({
    passos: [],
    definicoes: [{ termo: "", texto: "" }, { termo: " PVPS ", texto: " primeiro que vence " }],
    responsabilidades: [{ titulo: "", itens: [] }, { titulo: "Cozinha", itens: ["Lavar", ""] }],
    materiais: ["", "Detergente"],
    epis: [],
    alcance: "  ",
  });
  assert.deepEqual(limpo.definicoes, [{ termo: "PVPS", texto: "primeiro que vence" }]);
  assert.deepEqual(limpo.responsabilidades, [{ titulo: "Cozinha", itens: ["Lavar"] }]);
  assert.deepEqual(limpo.materiais, ["Detergente"]);
  assert.equal("epis" in limpo, false);
  assert.equal("alcance" in limpo, false);
});

// ===== 2.8: subtítulo nos passos =====
test("subtítulo nos passos: linha sem número, numeração reinicia a cada grupo", () => {
  const passos = [
    { id: "a", texto: "Introdução" },
    { id: "b", texto: "Um", subtitulo: "Opção 1" },
    { id: "c", texto: "Dois" },
    { id: "d", texto: "Três", subtitulo: "Opção 2" },
    { id: "e", texto: "Quatro", subtitulo: "Opção 2" },
    { id: "f", texto: "Cinco", subtitulo: "   " },
  ];
  assert.deepEqual(subtitulosEmVigor(passos), ["", "Opção 1", "Opção 1", "Opção 2", "Opção 2", "Opção 2"]);
  assert.deepEqual(inicioDeGrupo(passos), [false, true, false, true, false, false]);
  assert.deepEqual(numerosDosPassos(passos), [1, 1, 2, 1, 2, 3]);
  assert.deepEqual(semSubtitulosVazios(passos).map((passo) => passo.subtitulo), [undefined, "Opção 1", undefined, "Opção 2", "Opção 2", undefined]);
  const folha = folhaDoPop({ codigo: "POP-05", titulo: "T", versao: "1.0", status: "Rascunho", conteudo: { passos } }, { nome: "Beyond Nutri" });
  const bloco = folha.blocos.find((item) => item.titulo === "Passos");
  assert.deepEqual(bloco.subtitulos, [undefined, "Opção 1", undefined, "Opção 2", undefined, undefined]);
  const folhaPop = ler("../components/pc/PopFolha.tsx");
  assert.ok(folhaPop.includes("pfolha-subtitulo") && folhaPop.includes("gruposDePassos(bloco)"));
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes("+ Subtítulo") && editor.includes("numerosDosPassosNaTela[indice]"));
  assert.ok(ler("../types/index.ts").includes("subtitulo?: string"));
});

test("mapeamento do catálogo usa o subtítulo do passo (sem prefixar o título do grupo no texto)", () => {
  for (const modelo of listarModelos()) {
    const pop = criar(modelo.id);
    const grupos = modelo.secoes.passos;
    const comTitulo = grupos.filter((grupo) => grupo.titulo);
    assert.equal(pop.conteudo.passos.filter((passo) => passo.subtitulo).length, comTitulo.length, modelo.id);
    for (const passo of pop.conteudo.passos) if (passo.subtitulo) assert.equal(passo.texto.startsWith(passo.subtitulo), false, modelo.id);
    // grupo sem título só aparece no começo: depois de um subtítulo o grupo sempre tem título
    const titulos = grupos.map((grupo) => Boolean(grupo.titulo));
    const primeiroComTitulo = titulos.indexOf(true);
    if (primeiroComTitulo >= 0) assert.equal(titulos.slice(primeiroComTitulo).every(Boolean), true, modelo.id);
  }
});

// ===== 3.1 a 3.4: conteúdo do catálogo =====
test("comp-13: sem a receita de bicarbonato e sem vinagre; nota ao consultor; bloqueio mantido", () => {
  const modelo = modeloPorId("comp-13");
  const textos = JSON.stringify(modelo.secoes);
  assert.doesNotMatch(textos, /bicarbonato|vinagre|amarelado|água quente/i);
  assert.ok(modelo.secoes.cuidadosEspeciais.includes("Para tirar poeira ou ferrugem dos pinos das tomadas, você pode escová-los com escova de dente, utilizando um limpador específico para contato elétrico."));
  assert.ok(modelo.notasParaOConsultor.includes("Trecho de limpeza química das tomadas removido do modelo por risco elétrico e químico."));
  assert.doesNotMatch(modelo.pendencias.join(" "), /bicarbonato|contradição|alvejante/i);
  assert.deepEqual([...MODELOS_COM_BLOQUEIO], ["comp-13"]);
  assert.equal(bloqueioDeAprovacao(criar("comp-13")), "Revise os itens de segurança antes de aprovar");
});

test("comp-15: sem marca e sem a afirmação sobre legislação; pendência nova sobre a norma aplicada", () => {
  const modelo = modeloPorId("comp-15");
  assert.equal(modelo.secoes.cuidadosEspeciais[0], "Os panos de cozinha ou de mão representam grandes focos de contaminação. Para a secagem de equipamentos, utensílios e mãos, devem ser usados panos descartáveis.");
  assert.doesNotMatch(JSON.stringify(modelo), /perfex|legislações sanitárias|ficou proibido/i);
  assert.ok(modelo.pendencias.includes("Conferir na norma aplicada se há exigência sobre uso de panos para secagem."));
  assert.equal(modelo.pendencias.some((pendencia) => /legisla/i.test(pendencia)), false);
});

test("varredura de marcas comerciais e referências ao material de origem em todo o catálogo", () => {
  const marcas = /perfex|isopor|termobox|tupperware|bombril|scotch|\bveja\b|ypê|\bomo\b|\bvim\b|sapólio|lysoform/i;
  for (const texto of textosDoCatalogo()) assert.doesNotMatch(texto, marcas, texto.slice(0, 60));
  assert.deepEqual(varrerTermosProibidos({ pops: listarModelos() }), []);
  const arquivo = ler("../lib/modelos/popsModelosDados.ts");
  assert.doesNotMatch(arquivo, marcas);
  assert.match("Pano descartável - perfex", TERMOS_PROIBIDOS);
});

test("nenhum 'null' nem 'conforme o material' no catálogo e na folha/PDF; célula vazia vira '—'", () => {
  for (const texto of textosDoCatalogo()) {
    assert.doesNotMatch(texto, /\bnull\b|\bundefined\b/, texto.slice(0, 60));
    assert.doesNotMatch(texto, /conforme o material|do original|no original|do curso|do material de origem/i, texto.slice(0, 60));
  }
  assert.equal(JSON.stringify(listarModelos()).includes("null"), JSON.stringify(listarModelos()).includes('"titulo":null'), "só o título nulo de grupo (formato do catálogo) contém null");
  for (const modelo of listarModelos()) {
    for (const tabela of modelo.tabelas) {
      assert.doesNotMatch(tabela.titulo, /\(|material|original/i, tabela.titulo);
      assert.ok(tabela.linhas.flat().every((celula) => typeof celula === "string" && celula !== "" && celula !== "null"));
    }
  }
  assert.equal(modeloPorId("comp-16").tabelas[0].titulo, "Temperaturas de recebimento");
  assert.equal(modeloPorId("comp-16").tabelas[0].linhas[0][1], "—");
  // folha / PDF
  for (const id of ["comp-16", "comp-19"]) {
    const pop = criar(id);
    const folha = JSON.stringify(folhaDoPop(pop, { nome: "Beyond Nutri" }), (_chave, valor) => (valor === undefined ? "" : valor));
    assert.doesNotMatch(folha, /null|conforme o material|do original|do curso/i, id);
  }
  assert.ok(ler("../components/pc/PopFolha.tsx").includes('celula && celula !== "null" ? celula : "—"'));
  // o gerador converte null do arquivo original em "—"
  const gerado = enxugar({ versao: 1, pops: [{ id: "x-01", ordem: 1, titulo: "T", formato: "curto", secoes: { objetivos: ["o"], passos: ["p"] }, tabelas: [{ id: "t", titulo: "Tabela (conforme o material)", colunas: ["A", "B"], linhas: [{ a: "1", b: null }] }], notasParaOConsultor: [], pendencias: [], planilhasNoOriginal: [] }] });
  assert.deepEqual(gerado.pops[0].tabelas[0].linhas, [["1", "—"]]);
  assert.equal(gerado.pops[0].tabelas[0].titulo, "Tabela");
});

// ===== 4: capa =====
test("capa: sem cabeçalho corrido nem rodapé (página nomeada) e a folha começa na página seguinte", () => {
  const css = cssDoDocumentoImpresso({ cabecalho: { esquerda: ["Empresa"], direita: ["POP-05 · versão 1.0"], rodape: "Título" }, comCaixasDeMargem: true });
  assert.match(css, /@page capa\{size:A4;margin:0;@top-left\{content:none;border:0\}@top-right\{content:none;border:0\}@bottom-left\{content:none\}@bottom-right\{content:none\}\}/);
  assert.match(css, /@page\{size:A4/);
  const global = ler("../app/globals.css");
  assert.match(global, /@media print\{\.pfolha-capa\{page:capa\}\}/);
  assert.match(global, /\.pfolha-capa\{display:block;[^}]*page:capa\}/);
  assert.ok(ler("../components/pc/ConfigCapaDoPop.tsx").includes("sem cabeçalho nem número de página"));
});

// ===== 5.1: nomes sem acento =====
test("aviso 'Dados diz … e os POPs trazem …': nomes comparados sem acento, sem diferença de caixa e com espaços normalizados", () => {
  assert.equal(mesmoNome("Elton", "Élton"), true);
  assert.equal(mesmoNome("  elton   VOLMIR ", "Élton Volmir"), true);
  assert.equal(mesmoNome("Elton", "Eltom"), false);
  const empresa = (dados, pop) => ({ responsavel: dados, cargoResponsavel: "RT", pops: [{ id: "1", codigo: "POP-01", titulo: "T", versao: "1.0", status: "Rascunho", programaRelacionado: "", responsavel: pop, proximaRevisao: "" }] });
  assert.equal(divergenciaDeResponsavel(empresa("Elton", "Élton")), null);
  assert.deepEqual(divergenciaDeResponsavel(empresa("Elton", "Marcos")), { dados: "Elton", pops: ["Marcos"] });
});

// ===== 5.2 e 5.3 =====
test("respiro entre o cabeçalho, o caminho e o título; topo colapsa pela largura real da linha", () => {
  const css = ler("../app/globals.css");
  assert.match(css, /\.ficha-caminho\{margin:10px 0\}/);
  assert.match(css, /\.pc-topbar\{container:topo\/inline-size\}/);
  assert.match(css, /@container topo \(max-width:1180px\)\{[\s\S]*?\.pc-mode-texto\{display:none\}/);
  assert.match(css, /@container topo \(max-width:920px\)\{\s*\.pc-mode-chip\{display:none\}/);
});

// ===== 5.4: conexão =====
test("conexão: só fica offline depois de DUAS falhas seguidas; navegador 'online' vale sem pedir nada", async () => {
  const esperas = [];
  const esperar = async (ms) => void esperas.push(ms);
  let tentativas = 0;
  assert.equal(await confirmarConexao(async () => { tentativas += 1; return false; }, { esperar }), false);
  assert.equal(tentativas, 2, "duas falhas seguidas");
  assert.equal(esperas.length, 1);
  tentativas = 0;
  assert.equal(await confirmarConexao(async () => { tentativas += 1; return tentativas === 2; }, { esperar }), true, "uma falha isolada não derruba");
  let chamou = false;
  assert.equal(await conexaoAtual(true, async () => { chamou = true; return false; }), true);
  assert.equal(chamou, false);
  assert.equal(await conexaoAtual(false, async () => true, { esperar }), true, "navegador diz offline mas o servidor responde");
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('window.addEventListener("focus", reavaliar)') && pagina.includes('document.addEventListener("visibilitychange"') && pagina.includes('navigator.serviceWorker?.addEventListener("controllerchange", reavaliar)'));
});

// ===== Guia =====
test("guia rápido: adicionar POP a partir de modelo, voltar e continuar de onde parei", () => {
  const guia = ler("../conteudo-privado/guias/fonte/guia-rapido.html");
  assert.match(guia, /Adicionar POP/);
  assert.match(guia, /Começar em branco/);
  assert.match(guia, /botão ←|botão “←”|Voltar/);
  assert.match(guia, /Continuar de onde parei/);
});
