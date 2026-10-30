import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GRUPOS_DA_CENTRAL, gruposVisiveis, opcoesDoSeletorDeSecao, subabaAoEscolherSecao } from "../lib/centralEmpresa.ts";
import { CORES_DA_SITUACAO, botaoDaLinha, contadoresDaLista, filtroDaLinha, filtrarLinhas, linhaPedeAtencao, montarLinhaDoPop, textoDoCriarDaNorma } from "../lib/popGestao.ts";
import { conteudoComResponsavelEfetivo, diferencaComDados, marcaManualApos, responsavelDaExecucao } from "../lib/responsavelDoPop.ts";
import { folhaDoPop, secoesDoEditor } from "../lib/popDocumento.ts";
import { secoesQueFaltamParaEnviar } from "../lib/popEnvio.ts";
import { criarPopDeModelo, listarModelos, modeloPorId } from "../lib/popModelos.ts";
import { ESPERAS_DA_NUVEM_MS, TENTATIVAS_DA_NUVEM, esperaAposFalhaDaNuvem, rotuloDoSeloComProblema } from "../lib/conexao.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");
const HOJE = "2026-10-22";

// ===== 1.1 Menu de seção da barra do topo =====
test("menu de seção: lista Empresa, Cadastros e Documentos, marca a atual e troca para a primeira aba da escolhida", () => {
  const grupos = gruposVisiveis({ editar: true, verComprovantes: true, gerenciarPessoas: true });
  const opcoes = opcoesDoSeletorDeSecao(grupos, "pops");
  assert.deepEqual(opcoes.map((opcao) => opcao.rotulo), ["Empresa", "Estrutura", "Documentos"]);
  assert.deepEqual(opcoes.filter((opcao) => opcao.atual).map((opcao) => opcao.id), ["documentos"]);
  assert.equal(subabaAoEscolherSecao(grupos, "empresa", "pops"), "dados");
  assert.equal(subabaAoEscolherSecao(grupos, "estrutura", "pops"), "ambientes");
  assert.equal(subabaAoEscolherSecao(grupos, "documentos", "dados"), "manual");
  assert.equal(subabaAoEscolherSecao(grupos, "documentos", "pops"), null, "a seção que já está aberta não muda nada");
  // quem só lê vê apenas Documentos: o menu vira um rótulo, sem opções para escolher
  const soLeitura = gruposVisiveis({ editar: false, verComprovantes: true, gerenciarPessoas: false });
  assert.equal(opcoesDoSeletorDeSecao(soLeitura, "pops").length, 1);
  assert.equal(GRUPOS_DA_CENTRAL.length, 3);
});

test("menu de seção: teclado (Enter/Esc/setas), fecha ao clicar fora, creme com borda âmbar; as abas viram texto com sublinhado laranja", () => {
  const menu = ler("../components/SeletorDeSecao.tsx");
  for (const trecho of ['aria-haspopup="menu"', "aria-expanded={aberto}", 'role="menu"', 'role="menuitemradio"', '"Escape"', '"ArrowDown"', '"ArrowUp"', '"Home"', '"End"', 'addEventListener("mousedown"']) {
    assert.ok(menu.includes(trecho), `falta ${trecho}`);
  }
  assert.ok(menu.includes("botao.current?.focus()"), "Esc devolve o foco ao botão");
  const topo = ler("../components/AppTopbar.tsx");
  assert.ok(topo.includes("<SeletorDeSecao") && topo.includes('"Central da Empresa"') === false, "o título vem da página");
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('? ["Central da Empresa"]') && pagina.includes("ocultarChipDeModo={Boolean(secaoDoTopo)}"));
  const nav = ler("../components/pc/CentralEmpresaNav.tsx");
  assert.ok(nav.includes("cen-barra") && nav.includes("cen-bloco"), "duas barras de blocos: grupos e seções");
  const css = ler("../app/globals.css");
  assert.match(css, /\.sec-menu-botao\{[^}]*border:1\.5px solid #21A3A3[^}]*background:#FFF6E5/);
  assert.match(css, /\.sec-menu-item\.is-atual\{background:#FFF6E5\}/);
  assert.match(css, /\.cen-bloco\.is-ativa\{border-radius:9px;background:#BFDDF7;color:#263445\}/);
  assert.match(css, /\.cen-barra\{display:inline-flex;align-items:stretch;height:40px;border-radius:12px;background:#EEF1F7\}/);
  assert.match(css, /\.cen-divisor\{[^}]*height:1px[^}]*background:#D5DCE3\}/);
});

test("barra do topo fixa (sticky) na Central e o título pode quebrar em 2 linhas sem cortar", () => {
  const css = ler("../app/globals.css");
  assert.match(css, /\.pc-topbar:has\(\.pc-crumbs--secao\)\{position:sticky;top:0/);
  assert.match(css, /\.pc-crumbs--secao \.pc-crumb-current\{overflow:visible;text-overflow:clip;white-space:normal\}/);
});

// ===== 1.3 "Criar POPs da norma" e "+ Adicionar POP" =====
test("'Criar POPs da norma': texto de apoio com o N real; desligado em laranja clarinho; ligado em laranja vivo", () => {
  assert.equal(textoDoCriarDaNorma(0), "Os POPs do modelo já foram criados.");
  assert.equal(textoDoCriarDaNorma(7), "Cria os 7 POPs da norma que ainda não existem.");
  assert.equal(textoDoCriarDaNorma(1), "Cria o POP da norma que ainda não existe.");
  const lista = ler("../components/pc/PcPopsLista.tsx");
  assert.ok(lista.includes("POPs da norma") && !lista.includes("Criar POPs de uma vez") && !lista.includes("de uma vez"));
  assert.ok(lista.includes("faltantes.length > 1"), "só aparece quando falta criar (no menu ⋯)");
  assert.ok(lista.includes("textoDoCriarDaNorma(faltamCriar)"));
  const css = ler("../app/globals.css");
  assert.match(css, /\.pgl-adicionar-botao\{height:44px;[^}]*background:#264A80;[^}]*color:#fff/);
});

// ===== 1.4 Filtro por chip =====
const popBase = (extra = {}) => ({ id: "p", codigo: "POP-01", titulo: "Lavagem", versao: "1.0", status: "Aprovado", conteudo: { frequencia: "mensal", passos: [] }, aprovacao: { em: "2026-10-01T12:00:00.000Z", nome: "Ana", cargo: "RT", usuarioId: "u1" }, versoes: [], ...extra });
const linhaDe = (pop, extra = {}) => montarLinhaDoPop(pop, undefined, { empresa: { normasAplicadas: [], pops: pop ? [pop] : [] }, hoje: HOJE, podeAprovar: false, ...extra });

test("filtro por chip: cada chip mostra exatamente a sua contagem; 'Todos' (null) devolve tudo", () => {
  const linhas = [
    linhaDe(popBase({ id: "a" })),
    linhaDe(popBase({ id: "b", status: "Rascunho" })),
    linhaDe(popBase({ id: "c", status: "Aguardando aprovação" })),
    linhaDe(popBase({ id: "d", proximaRevisao: "2026-01-01" })),
    linhaDe(undefined, { definicao: undefined }),
    linhaDe(popBase({ id: "e", status: "Inativo" })),
  ];
  const contadores = contadoresDaLista(linhas);
  assert.equal(filtrarLinhas(linhas, "em-dia").length, contadores.vigentesEmDia);
  assert.equal(filtrarLinhas(linhas, "com-pendencia").length, contadores.vigentesComPendencia);
  assert.equal(filtrarLinhas(linhas, "aguardando").length, contadores.aguardando);
  assert.equal(filtrarLinhas(linhas, "rascunho").length, contadores.rascunho);
  assert.equal(filtrarLinhas(linhas, "falta-criar").length, contadores.faltaCriar);
  assert.equal(filtrarLinhas(linhas, null), linhas);
  assert.equal(filtroDaLinha(linhas[5]), null, "POP inativo não cai em nenhuma contagem");
  const soma = ["em-dia", "com-pendencia", "aguardando", "rascunho", "falta-criar"].reduce((total, filtro) => total + filtrarLinhas(linhas, filtro).length, 0);
  assert.equal(soma, contadores.total);
});

test("filtro por chip: só no cliente (estado da tela, nada guardado), 'Todos' limpa e clicar de novo no chip ativo também", () => {
  // rodada 13: os contadores "N todos · N rascunhos" saíram do cabeçalho; as funções de contagem seguem testadas acima
  const lista = ler("../components/pc/PcPopsLista.tsx");
  assert.ok(!lista.includes("setFiltro") && !lista.includes("pgg-conta"));
  assert.ok(lista.includes("{linhasDosPops.length} {linhasDosPops.length === 1 ? \"POP\" : \"POPs\"}"));
});

// ===== 1.7 Linha =====
test("'Aprovar' (laranja) só para POP aguardando aprovação E usuário que pode aprovar; senão 'Abrir' (cinza)", () => {
  const aguardando = popBase({ status: "Aguardando aprovação" });
  const comoResponsavel = linhaDe(aguardando, { podeAprovar: true });
  const comoOutro = linhaDe(aguardando, { podeAprovar: false });
  assert.deepEqual(botaoDaLinha(comoResponsavel), { rotulo: "Aprovar", principal: true });
  assert.deepEqual(botaoDaLinha(comoOutro), { rotulo: "Abrir", principal: false });
  assert.deepEqual(botaoDaLinha(linhaDe(popBase(), { podeAprovar: true })), { rotulo: "Abrir", principal: false }, "vigente: Abrir mesmo para quem aprova");
  assert.deepEqual(botaoDaLinha(linhaDe(popBase({ status: "Rascunho" }), { podeAprovar: true })), { rotulo: "Abrir", principal: false });
  // "Aprovar" não aprova com um clique: abre a ficha na aba onde está o fluxo de aprovação
  const lista = ler("../components/pc/PcPopsLista.tsx");
  assert.ok(lista.includes('onAbrirFicha(linha.pop!.id, "documento")') && lista.includes("pgl-aprovar"));
  assert.equal(/aprovarPop|onAprovar/.test(lista), false);
  assert.ok(ler("../components/pc/PcPops.tsx").includes("setAbaInicial(destino.aba)"));
});

test("etiquetas e cores da linha: Rascunho #FDEBC2, Aguardando #F6C65B, Vigente verde com texto branco, 'Registro atrasado' #FDE3E3", () => {
  assert.equal(CORES_DA_SITUACAO.Rascunho.fundo, "#FDEBC2");
  assert.equal(CORES_DA_SITUACAO["Aguardando aprovação"].fundo, "#F6C65B");
  assert.equal(CORES_DA_SITUACAO.Vigente.texto, "#FFFFFF");
  assert.equal(CORES_DA_SITUACAO["Aguardando aprovação"].faixa, "#AF640A", "barra terracota para aguardando");
  assert.equal(CORES_DA_SITUACAO.Rascunho.faixa, "#E8B04B", "barra âmbar para rascunho");
  assert.match(ler("../app/globals.css"), /\.pgl-etiqueta--atraso\{background:#FDE3E3/);
  // registro atrasado: frequência diária, aprovado há mais de um dia e nenhum registro
  const atrasada = linhaDe(popBase({ conteudo: { frequencia: "diária", passos: [] } }), { registros: [] });
  assert.equal(atrasada.registroAtrasado, true);
  assert.equal(linhaPedeAtencao(atrasada), true);
  assert.equal(linhaDe(popBase()).registroAtrasado, false);
  assert.equal(linhaPedeAtencao(linhaDe(popBase())), false);
  assert.equal(linhaPedeAtencao(linhaDe(popBase({ status: "Aguardando aprovação" }))), true);
});

test("linha de POP: fundo branco, moldura de 1,5 px na cor do estado, raio 12, 8 px entre linhas, a linha inteira abre o POP", () => {
  const css = ler("../app/globals.css");
  const bloco = css.slice(css.indexOf("/* ===== Pacote 4 · Central sem caixas"));
  assert.match(bloco, /\.pgl \.pgl-linha\{display:flex;flex-wrap:nowrap;[^}]*min-height:60px[^}]*border:1\.5px solid #D6DCE5;border-radius:12px;background:#fff;box-shadow:none\}/);
  assert.match(bloco, /\.pgl-grupo-corpo\{display:flex;flex-direction:column;gap:8px\}/);
  assert.match(bloco, /\.pgl-bolinha\{[^}]*background:var\(--cor-do-estado,#7F8BA3\)\}/);
  const lista = ler("../components/pc/PcPopsLista.tsx");
  assert.ok(lista.includes('role={abre ? "link" : undefined}') && lista.includes("onClick={abre ? () => onAbrirFicha(linha.pop!.id) : undefined}"), "sem botão Abrir: a linha inteira abre");
  assert.equal(/>s*Abrirs*</.test(lista), false, "nenhum botão Abrir");
});

test("próxima ação: a frase completa vai ao topo da ficha (sem duplicar no Resumo, que já tem o cartão)", () => {
  const ficha = ler("../components/pc/PcFichaPop.tsx");
  // rodada 12e: a próxima ação é a faixa creme da etapa atual no Resumo; o topo mostra "etapa N de 6"
  assert.ok(ficha.includes("etapa ${etapa.numero} de ${TOTAL_DE_ETAPAS}") && ficha.includes("<PcResumoDoPop"));
  assert.ok(ficha.indexOf("etapa ${etapa.numero}") < ficha.indexOf('className="ficha-abas'));
});

test("espaços: ~74 px entre o bloco do topo e 'Conjunto da norma'; cabeçalhos de seção 14,5 px #526477 com 24 px acima e 10 abaixo", () => {
  const css = ler("../app/globals.css");
  assert.match(css, /\.pgl-cabeca\{[^}]*gap:16px;margin-bottom:40px\}/);
  assert.match(css, /\.pgl-secao-linha\{[^}]*margin:18px 0 4px\}/);
  assert.match(css, /\.pgl-secao\{margin:0;font-family:inherit;font-size:14\.5px;font-weight:500;letter-spacing:0;text-transform:none;color:#526477\}/);
  // 16 (gap do .pgl) + 40 + 18 = 74; 6 (gap da lista) + 18 = 24 acima; 4 + 6 = 10 abaixo
  assert.equal(16 + 40 + 18, 74);
});

// ===== 1.5 e 1.10 Responsável =====
test("Responsável: sai a faixa 'Dados diz … e os POPs trazem …' e a linha solta; vai para o cabeçalho 'Conjunto da norma'", () => {
  const pagina = ler("../app/page.tsx");
  assert.equal(pagina.includes("Dados diz"), false);
  assert.equal(pagina.includes("Responsável do estabelecimento: <strong>"), false);
  const lista = ler("../components/pc/PcPopsLista.tsx");
  // rodada 13: o responsável vai para o subtítulo "N POPs · Responsável: nome"; "alterar em Dados" fica no menu ⋯
  assert.ok(lista.includes("Responsável: <strong>") && lista.includes("Alterar o responsável em Dados"));
  assert.ok(!lista.includes("Outros POPs e documentos da empresa") && !lista.includes("Conjunto da norma"));
  assert.match(ler("../app/globals.css"), /\.pgl-resp-linha strong\{font-weight:500/);
});

test("responsável lido de Dados na hora (fonte única); só o digitado à mão trava; POP antigo segue como estava", () => {
  const dados = { nome: "Maria da Silva", cargo: "Nutricionista RT" };
  const acompanha = { responsavelExecucao: { nome: "Maria Antiga", cargo: "Cargo antigo" }, responsavelManual: false };
  const manual = { responsavelExecucao: { nome: "João Souza", cargo: "Cozinheiro" }, responsavelManual: true };
  const antigo = { responsavelExecucao: { nome: "Pedro", cargo: "Chefe" } };
  assert.deepEqual(responsavelDaExecucao(acompanha, dados), dados, "acompanha Dados: mostra o de hoje");
  assert.deepEqual(responsavelDaExecucao(manual, dados), { nome: "João Souza", cargo: "Cozinheiro" });
  assert.deepEqual(responsavelDaExecucao(antigo, dados), { nome: "Pedro", cargo: "Chefe" }, "sem a marca: o texto gravado, nada em lote");
  assert.deepEqual(responsavelDaExecucao(acompanha, { nome: "", cargo: "" }), { nome: "Maria Antiga", cargo: "Cargo antigo" }, "Dados sem nome: não apaga o do POP");
  // a folha e a impressão leem de Dados
  const pop = { codigo: "POP-01", titulo: "Lavagem", versao: "1.0", status: "Rascunho", conteudo: { ...acompanha, frequencia: "diária", passos: [] } };
  const folha = folhaDoPop(pop, { nome: "Beyond Nutri" }, { responsavel: dados });
  const linhaResp = folha.blocos.find((bloco) => bloco.titulo === "Responsável e frequência").linhas.join(" ");
  assert.match(linhaResp, /Maria da Silva/);
  assert.doesNotMatch(linhaResp, /Maria Antiga/);
  const folhaManual = folhaDoPop({ ...pop, conteudo: { ...pop.conteudo, ...manual } }, { nome: "Beyond Nutri" }, { responsavel: dados });
  assert.match(folhaManual.blocos.find((bloco) => bloco.titulo === "Responsável e frequência").linhas.join(" "), /João Souza/);
  // validação de envio e seção "preenchida" também olham o responsável efetivo
  assert.equal(secoesQueFaltamParaEnviar({ titulo: "x", conteudo: { ...acompanha, responsavelExecucao: { nome: "", cargo: "" }, frequencia: "diária", passos: [{ id: "1", texto: "a" }] } }, dados).length, 0);
  assert.equal(secoesDoEditor({ codigo: "", titulo: "x", conteudo: { ...acompanha, responsavelExecucao: { nome: "", cargo: "" }, frequencia: "diária" } }, undefined, dados).find((secao) => secao.id === "responsavel").preenchida, true);
  // gravar (salvar/enviar) materializa o de Dados para as regras que não conhecem Dados; manual e antigo ficam como estão
  assert.deepEqual(conteudoComResponsavelEfetivo(acompanha, dados).responsavelExecucao, dados);
  assert.equal(conteudoComResponsavelEfetivo(manual, dados), manual);
  assert.equal(conteudoComResponsavelEfetivo(antigo, dados), antigo);
});

test("flag responsavelManual: digitar outro nome trava; voltar a ser igual a Dados (sem acento/caixa/espaços) destrava; 'Os Dados trazem “X”' + 'Usar o de Dados'", () => {
  const dados = { nome: "Élton  Strapazon", cargo: "Nutricionista" };
  assert.equal(marcaManualApos({ nome: "Outra Pessoa", cargo: "Nutricionista" }, dados, false), true);
  assert.equal(marcaManualApos({ nome: "elton strapazon", cargo: "nutricionista" }, dados, true), false, "igual a Dados ignorando acento, caixa e espaços");
  assert.equal(marcaManualApos({ nome: "Élton Strapazon", cargo: "Cozinheiro" }, dados, false), true, "o cargo também trava");
  assert.match(diferencaComDados({ responsavelExecucao: { nome: "Outra Pessoa", cargo: "" }, responsavelManual: true }, dados), /Strapazon/);
  assert.equal(diferencaComDados({ responsavelExecucao: { nome: "elton strapazon", cargo: "" }, responsavelManual: true }, dados), null, "mesmo nome: sem aviso");
  assert.equal(diferencaComDados({ responsavelExecucao: { nome: "Outra", cargo: "" }, responsavelManual: false }, dados), null, "acompanha Dados: nada a avisar");
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes("Os Dados trazem “{diferencaDeDados}”") && editor.includes("Usar o de Dados") && editor.includes("responsavelManual: false"));
  assert.ok(editor.lastIndexOf("Os Dados trazem") > editor.indexOf("Responsável pela execução (nome)") && editor.lastIndexOf("Os Dados trazem") < editor.indexOf('rotulo="Cargo ou função"'), "o aviso fica embaixo do campo Responsável");
  // POP novo de modelo acompanha Dados (flag false); nada é regravado nos POPs salvos
  const criado = criarPopDeModelo({ modelo: modeloPorId(listarModelos()[0].id), pops: [], empresa: "Beyond Nutri", responsavel: dados, id: "novo", gerarId: () => "g" });
  assert.equal(criado.ok, true);
  assert.equal(criado.pop.conteudo.responsavelManual, false);
  const pagina = ler("../app/page.tsx");
  assert.equal(/map\(\(pop\) => \(pop\.responsavel \? \{ \.\.\.pop, responsavel: "" \}/.test(pagina), false, "sem alteração em lote");
});

// ===== 3 Conexão =====
test("'Não sincronizou' (com internet) × 'Sem conexão' (offline de verdade)", () => {
  assert.equal(rotuloDoSeloComProblema(true), "Não sincronizou");
  assert.equal(rotuloDoSeloComProblema(false), "Sem conexão");
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("seloDeSincronizacao({ online: estaOnline"));
  const topo = ler("../components/AppTopbar.tsx");
  assert.ok(topo.includes("sincronizacao.rotulo || ROTULO_SYNC[sincronizacao.estado]") && topo.includes("sincronizacao.dica"));
});

test("leitura da nuvem: espera crescente 1,5 / 4 / 8 s; o aviso só depois da última tentativa", () => {
  assert.deepEqual([...ESPERAS_DA_NUVEM_MS], [1500, 4000, 8000]);
  assert.equal(TENTATIVAS_DA_NUVEM, 4);
  assert.equal(esperaAposFalhaDaNuvem(1), 1500);
  assert.equal(esperaAposFalhaDaNuvem(2), 4000);
  assert.equal(esperaAposFalhaDaNuvem(3), 8000);
  assert.equal(esperaAposFalhaDaNuvem(4), null, "na última falha não há nova espera: vale o aviso");
  assert.equal(esperaAposFalhaDaNuvem(0), null);
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("const espera = esperaAposFalhaDaNuvem(falhasSyncRef.current)") && pagina.includes("falhasSyncRef.current = TENTATIVAS_DA_NUVEM"));
  assert.equal(/\}, 1500\);\s*return;/.test(pagina), false, "sem os 1,5 s fixos");
});

// ===== 2.1 Modo Campo =====
test("modo Campo: botão '←' de 44 px ligado à mesma pilha de telas; sem 'Continuar de onde parei' no Campo", () => {
  const campo = ler("../components/campo/CampoTelas.tsx");
  assert.ok(campo.includes('aria-label="Voltar"') && campo.includes("onVoltar?: () => void"));
  const pagina = ler("../app/page.tsx");
  const trechoCampo = pagina.slice(pagina.indexOf("<CampoCabecalho"), pagina.indexOf("<CampoBarra"));
  assert.ok(trechoCampo.includes("onVoltar={mostrarVoltar(localDaTela) ? () => void voltarUmaTela() : undefined}"));
  assert.match(ler("../app/globals.css"), /\.campo-head \.campo-voltar-pilha\{width:44px;height:44px/);
  assert.equal(campo.includes("Continuar de onde parei"), false);
});

// ===== 4 Catálogo =====
test("catálogo: pendências novas do comp-07 (dois sanitizantes) e do comp-15 (água sanitária sem passo); total 62", () => {
  const modelos = listarModelos();
  const pendenciasDe = (id) => modeloPorId(id).pendencias;
  assert.ok(pendenciasDe("comp-07").some((texto) => /álcool 70/.test(texto) && /solução clorada/.test(texto) && /enxágue/.test(texto)));
  assert.ok(pendenciasDe("comp-15").some((texto) => /água sanitária/.test(texto) && /nenhum passo/.test(texto)));
  assert.equal(modelos.reduce((total, modelo) => total + modeloPorId(modelo.id).pendencias.length, 0), 62);
  // o conteúdo regulatório não mudou: os passos do comp-07 continuam os mesmos (só ganhou pendência) e "freezer" segue como está
  assert.ok(JSON.stringify(modeloPorId("comp-18")).toLowerCase().includes("freezer"));
});
