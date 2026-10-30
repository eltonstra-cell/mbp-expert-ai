import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { LIMITE_DE_RECENTES, chaveDosRecentes, lerRecentes, podeVirarRecente, registrarRecente } from "../lib/buscaRecentes.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

function armazemEmMemoria() {
  const dados = {};
  return { dados, getItem: (k) => dados[k] ?? null, setItem: (k, v) => { dados[k] = v; } };
}
const destino = (n, extra = {}) => ({ id: `ir:central:${n}`, grupo: "ir", titulo: `Destino ${n}`, detalhe: `Central › Documentos › ${n}`, ...extra });

test("recentes da busca: no máximo 5, mais novo primeiro, sem repetir a rota", () => {
  const armazem = armazemEmMemoria();
  for (let n = 1; n <= 7; n += 1) registrarRecente(destino(n), "u1", armazem);
  const lista = lerRecentes("u1", armazem);
  assert.equal(lista.length, LIMITE_DE_RECENTES);
  assert.deepEqual(lista.map((item) => item.rotulo), ["Destino 7", "Destino 6", "Destino 5", "Destino 4", "Destino 3"]);
  registrarRecente(destino(5), "u1", armazem);
  assert.deepEqual(lerRecentes("u1", armazem).map((item) => item.rotulo), ["Destino 5", "Destino 7", "Destino 6", "Destino 4", "Destino 3"]);
});

test("recentes da busca: guardam só rótulo, rota e caminho, e só destinos de navegação e ação", () => {
  const armazem = armazemEmMemoria();
  registrarRecente({ ...destino(1), acao: { tipo: "empresa", id: "e1" }, empresaId: "e1", cnpj: "11222333000181" }, "u1", armazem);
  const guardado = JSON.parse(armazem.dados[chaveDosRecentes("u1")]);
  assert.deepEqual(Object.keys(guardado[0]).sort(), ["caminho", "rota", "rotulo"]);
  assert.ok(!JSON.stringify(guardado).includes("11222333000181") && !JSON.stringify(guardado).includes("e1"));
  // empresas, visitas e itens do checklist (dados do cliente) nunca viram recente
  for (const grupo of ["empresas", "itens"]) {
    assert.equal(podeVirarRecente({ grupo }), false);
    registrarRecente({ id: `x:${grupo}`, grupo, titulo: "Churrascaria do Chico" }, "u1", armazem);
  }
  assert.equal(lerRecentes("u1", armazem).length, 1);
  assert.equal(podeVirarRecente({ grupo: "agir" }), true);
});

test("recentes da busca: por usuário e a tela funciona sem localStorage", () => {
  const armazem = armazemEmMemoria();
  registrarRecente(destino(1), "u1", armazem);
  assert.equal(lerRecentes("u2", armazem).length, 0);
  assert.equal(lerRecentes(undefined, armazem).length, 0);
  assert.notEqual(chaveDosRecentes("u1"), chaveDosRecentes("u2"));
  const quebrado = { getItem: () => { throw new Error("sem acesso"); }, setItem: () => { throw new Error("cheio"); } };
  assert.deepEqual(lerRecentes("u1", quebrado), []);
  assert.equal(registrarRecente(destino(2), "u1", quebrado).length, 1, "devolve a lista mesmo sem armazenamento");
  assert.deepEqual(lerRecentes("u1", null), []);
  assert.equal(registrarRecente(destino(3), "u1", null).length, 1);
  const ruim = { getItem: () => "{não é json", setItem: () => {} };
  assert.deepEqual(lerRecentes("u1", ruim), []);
  const lixo = { getItem: () => JSON.stringify([{ rotulo: 1 }, null, "x", { rotulo: "A", rota: "r" }]), setItem: () => {} };
  assert.deepEqual(lerRecentes("u1", lixo), [{ rotulo: "A", rota: "r" }]);
});

test("busca no topo: na linha do nome da página, atalhos e recentes dentro do painel, sem a faixa fixa de atalhos", () => {
  const topo = ler("../components/AppTopbar.tsx");
  assert.ok(!topo.includes("pc-smartwrap") && !topo.includes('aria-label="Atalhos"'));
  assert.ok(topo.indexOf("<BuscaNaBarra") > topo.indexOf('aria-label="Caminho"') && topo.indexOf("<BuscaNaBarra") < topo.indexOf("pc-topbar-end"));
  const busca = ler("../components/BuscaNaBarra.tsx");
  assert.ok(busca.includes("Recentes") && busca.includes("Atalhos") && busca.includes("registrarRecente(") && busca.includes("lerRecentes("));
  assert.ok(busca.includes("Digite para buscar · ↑↓ navegam · Enter abre · Esc fecha"));
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".pc-topbar .pc-busca{flex:0 1 520px") && css.includes(".pc-busca-painel{top:100%;margin-top:8px"));
});

test("lista de POPs: avisos juntos antes do topo, '+ Adicionar POP' abre o formulário, 'Criar POPs da norma' na coluna da direita", () => {
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".pgl-secao{margin:0;font-family:inherit;font-size:14.5px;font-weight:500"));
  const lista = ler("../components/pc/PcPopsLista.tsx");
  assert.ok(lista.includes('className="pgl-avisos"') && lista.indexOf("pgl-avisos") < lista.indexOf("pgl-cab"));
  assert.ok(lista.includes("podeEditar && adicionando") && lista.includes("onEmBranco") && lista.includes("cancelarAdicao"));
  assert.ok(lista.indexOf('className="pgl-acoes"') > lista.indexOf("pgl-cab-sub") && lista.indexOf("MenuMais rotulo") > lista.indexOf('className="pgl-acoes"'), "o + Adicionar POP e o ⋯ ficam à direita do cabeçalho");
  assert.ok(ler("../app/page.tsx").includes("Vincular em Dados"));
});

import { tarjaDoComprovante } from "../lib/comprovantePop.ts";
import { leituraDaVersao, pendentesDeLeitura } from "../lib/registrosEmpresa.ts";

const popsDaEmpresa = (comReservatorio) => [
  { id: "p1", catalogoId: "higienizacao-instalacoes" },
  ...(comReservatorio ? [{ id: "p2", catalogoId: "higienizacao-reservatorio" }] : []),
  { id: "p3", catalogoId: "controle-de-pragas" },
];

test("tarja do comprovante: preso a outro POP → Mover; sem POP → Vincular; POP sugerido inexistente → Criar agora", () => {
  const preso = tarjaDoComprovante({ tipo: "reservatorio", popId: "p1" }, popsDaEmpresa(true));
  assert.equal(preso.acao, "mover");
  assert.equal(preso.popSugeridoId, "p2");
  assert.ok(preso.texto.startsWith("Este tipo costuma pertencer ao POP de "));
  const semPop = tarjaDoComprovante({ tipo: "reservatorio" }, popsDaEmpresa(true));
  assert.equal(semPop.acao, "vincular");
  assert.equal(semPop.popSugeridoId, "p2");
  const inexistente = tarjaDoComprovante({ tipo: "reservatorio", popId: "p1" }, popsDaEmpresa(false));
  assert.equal(inexistente.acao, "criar");
  assert.equal(inexistente.popSugeridoId, undefined);
  assert.match(inexistente.texto, /^O POP de .+ ainda não foi criado\.$/);
  assert.equal(tarjaDoComprovante({ tipo: "reservatorio" }, popsDaEmpresa(false)).acao, "criar", "sem POP e sem o sugerido: também Criar agora");
  // no POP certo, tipos sem POP próprio e POP sugerido arquivado
  assert.equal(tarjaDoComprovante({ tipo: "reservatorio", popId: "p2" }, popsDaEmpresa(true)), null);
  assert.equal(tarjaDoComprovante({ tipo: "contrato-rt", popId: "p1" }, popsDaEmpresa(true)), null);
  assert.equal(tarjaDoComprovante({ tipo: "outro" }, popsDaEmpresa(true)), null);
  const arquivado = [{ id: "p1", catalogoId: "higienizacao-instalacoes" }, { id: "p2", catalogoId: "higienizacao-reservatorio", arquivado: true }];
  assert.equal(tarjaDoComprovante({ tipo: "reservatorio", popId: "p1" }, arquivado).acao, "criar");
  const tela = ler("../components/pc/PcComprovantes.tsx");
  assert.ok(tela.includes("Criar agora") && tela.includes('tarja.acao === "vincular" ? "Vincular" : "Mover"') && tela.includes('className="comp-tarja"'));
  assert.ok(tela.includes("sugestaoDoPainel") && tela.includes("comp-pop-fixo"));
  assert.ok(ler("../components/pc/PcFichaPop.tsx").includes("onCriarPopDoModelo={contexto.criarPopDoModelo}"));
  assert.match(ler("../app/globals.css"), /\.comp-tarja\{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px;width:100%/);
});

test("Quem ainda não leu: só os pendentes da versão vigente; todos leram → mensagem; registrar só para quem pode", () => {
  const colaboradores = [
    { id: "c1", empresaId: "e1", nome: "Ana", cargo: "Cozinheira", ativo: true },
    { id: "c2", empresaId: "e1", nome: "Bia", cargo: "Auxiliar", ativo: true },
    { id: "c3", empresaId: "e1", nome: "Caio", cargo: "Inativo", ativo: false },
  ];
  const leituras = [{ id: "l1", empresaId: "e1", popId: "p1", popVersao: "1.1", colaboradorId: "c1", data: "2026-10-01" }];
  const leitura = leituraDaVersao("p1", "1.1", colaboradores, leituras);
  assert.deepEqual(pendentesDeLeitura(leitura.linhas).map((linha) => linha.colaborador.nome), ["Bia"]);
  // leitura de versão anterior não conta
  assert.equal(pendentesDeLeitura(leituraDaVersao("p1", "1.2", colaboradores, leituras).linhas).length, 2);
  const todos = leituraDaVersao("p1", "1.1", colaboradores, [...leituras, { ...leituras[0], id: "l2", colaboradorId: "c2" }]);
  assert.equal(pendentesDeLeitura(todos.linhas).length, 0);
  const bloco = ler("../components/pc/QuemAindaNaoLeu.tsx");
  assert.ok(bloco.includes("Quem ainda não leu") && bloco.includes("Todos leram a v{versao}") && bloco.includes("Registrar leitura") && bloco.includes("podeRegistrar && registrando"));
  // rodada 12e: a ficha colhe a ciência por PIN (ColherCiencia) só para quem gerencia pessoas
  assert.ok(ler("../components/pc/PcFichaPop.tsx").includes("verPessoas && vigente && contexto ? () => setColhendo(true)"));
});

import { cssDoDocumentoImpresso, FONTE_DA_MARGEM } from "../lib/printFooter.ts";

test("PDF da folha do POP: 'Seção vazia' fica fora do papel, 'Não preenchida' continua, cabeçalho corrido sem repetir o corpo e na fonte do app", () => {
  const folha = ler("../components/pc/PopFolha.tsx");
  assert.ok(folha.includes('className="pfolha-aviso no-print"'), "o aviso de tela não vai para o papel");
  assert.match(ler("../app/globals.css"), /@media print\{\.pfolha-aviso,#pop-folha \.pfolha-aviso,\.no-print\{display:none!important\}\}/);
  assert.ok(!ler("../app/globals.css").includes(".pfolha-vazia{display:none"), "'Não preenchida' continua saindo");
  // cabeçalho da margem: só empresa/CNPJ e "POP-01 · versão"; "Aprovada por" não entra
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes('ocultarNoCorpo: ["#pop-folha .pfolha-topo"]'));
  assert.ok(!editor.includes("folhaDeLeitura.situacao]"), "a situação não vai para o cabeçalho corrido");
  // com caixas de margem: fonte do app e corpo sem as linhas repetidas; sem caixas: nada é escondido
  const cabecalho = { esquerda: ["Empresa", "CNPJ 1"], direita: ["POP-01 · versão 1.1"], rodape: "Título", ocultarNoCorpo: ["#pop-folha .pfolha-topo"] };
  const css = cssDoDocumentoImpresso({ cabecalho, comCaixasDeMargem: true });
  assert.ok(css.includes(FONTE_DA_MARGEM) && !css.includes("Helvetica") && !css.includes("Arial"));
  assert.ok(css.includes("@media print{#pop-folha .pfolha-topo{display:none!important}}"));
  assert.ok(css.includes("POP-01 · versão 1.1") && !css.includes("Aprovada por"));
  assert.equal(cssDoDocumentoImpresso({ cabecalho, comCaixasDeMargem: false }), "");
  // cabeçalho da folha: razão social em formato de título, não o nome de exibição
  assert.ok(editor.includes("razaoSocialTitulo(nomeSemNumerosNoInicio(empresa.razaoSocial || empresa.nomeFantasia"));
});

import { destinoDaPendencia } from "../lib/companyReadiness.ts";

test("pendências da empresa: cada item abre onde se resolve", () => {
  assert.equal(destinoDaPendencia("horário de funcionamento"), "dados");
  assert.equal(destinoDaPendencia("responsável do estabelecimento (em Dados)"), "dados");
  assert.equal(destinoDaPendencia("nome"), "dados");
  assert.equal(destinoDaPendencia("CNPJ"), "dados");
  assert.equal(destinoDaPendencia("equipamentos"), "equipamentos");
  assert.equal(destinoDaPendencia("setores"), "ambientes");
  assert.equal(destinoDaPendencia("programas"), "programas");
  assert.equal(destinoDaPendencia("POPs"), "pops");
  const chip = ler("../components/pc/PendenciasChip.tsx");
  assert.ok(chip.includes('className="pend-link"') && chip.includes("onAbrir(falta)") && chip.includes('evento.key === "Escape"') && chip.includes('addEventListener("mousedown"'));
  assert.ok(ler("../components/pc/PcEmpresas.tsx").includes("onAbrirPendencia(empresa.id, falta)"));
  assert.ok(ler("../app/page.tsx").includes("const sub = destinoDaPendencia(falta);"));
});
