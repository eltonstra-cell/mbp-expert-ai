import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { LIMITE_DA_GRAVACAO_MS, NIVEL_DE_FALA, SILENCIO_PARA_PARAR_MS, criarDetectorDeFimDeFala } from "../lib/fimDeFala.ts";
import { destinoParaAbrirSozinho, ehDestinoDeNavegacao } from "../lib/commandSearch.ts";
import {
  LARGURA_DA_BUSCA_LARGA,
  LARGURA_DO_PAINEL_DA_BUSCA,
  LARGURA_DO_STATUS_POR_EXTENSO,
  LARGURA_MINIMA_DA_EMPRESA_ATIVA,
  LARGURA_MINIMA_SEM_CORTE_DO_NOME,
  larguraDoPainelDaBusca,
  modoDaBusca,
  modoDoStatus,
  nomeDaPaginaPodeCortar,
} from "../lib/topoCompacto.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("topo: busca compacta abaixo de 1400 px, status em ícone abaixo de 1500 px, nome da página sem corte de 1100 px para cima", () => {
  assert.equal(modoDaBusca(1399), "compacta");
  assert.equal(modoDaBusca(1200), "compacta");
  assert.equal(modoDaBusca(1400), "larga");
  assert.equal(modoDaBusca(1920), "larga");
  assert.equal(modoDoStatus(1499), "por-extenso", "o chip de sincronização sempre traz o texto");
  assert.equal(modoDoStatus(1500), "por-extenso");
  assert.equal(nomeDaPaginaPodeCortar(1099), true);
  assert.equal(nomeDaPaginaPodeCortar(1100), false);
  assert.equal(nomeDaPaginaPodeCortar(1300), false);
  assert.equal(LARGURA_MINIMA_DA_EMPRESA_ATIVA, 180);
  assert.equal(larguraDoPainelDaBusca(1920), LARGURA_DO_PAINEL_DA_BUSCA);
  assert.equal(larguraDoPainelDaBusca(1200), 520);
  assert.equal(larguraDoPainelDaBusca(500), 468, "limitado à janela");
  // as larguras do CSS são as mesmas da função
  const css = ler("../app/globals.css");
  assert.ok(css.includes(`@media (max-width:${LARGURA_DO_STATUS_POR_EXTENSO - 1}px){`));
  assert.ok(css.includes(`@media (min-width:${LARGURA_MINIMA_SEM_CORTE_DO_NOME}px){.pc-crumb-current,.pc-crumb{overflow:visible`));
  assert.ok(css.includes(`@media (min-width:${LARGURA_DA_BUSCA_LARGA}px){.pc-topbar .pc-busca:not(.pc-busca--compacta)`));
  assert.ok(css.includes(".emp-ativa{flex:1 1 180px;min-width:180px") && css.includes(".emp-ativa-caixa{min-width:180px}"));
  assert.ok(css.includes(".pc-sync-chip,.pc-mode-chip{flex:none;white-space:nowrap}"), "nunca quebra em duas linhas");
  const topo = ler("../components/AppTopbar.tsx");
  assert.ok(topo.includes('aria-label={sincronizacao.dica || `${sincronizacao.rotulo || ROTULO_SYNC[sincronizacao.estado]}. Toque para atualizar agora`}') && topo.includes("Configurar o modo de tela`}"));
  const busca = ler("../components/BuscaNaBarra.tsx");
  assert.ok(busca.includes("modoDaBusca(window.innerWidth)") && busca.includes("pc-busca-gatilho") && busca.includes("pc-smartbar--no-painel"));
});

test("busca: ao abrir um destino o texto digitado é limpo e o painel fecha; só o 'Ir →' fica laranja", () => {
  const busca = ler("../components/BuscaNaBarra.tsx");
  const escolher = busca.slice(busca.indexOf("function escolher("), busca.indexOf("function aoTeclar"));
  assert.ok(escolher.includes('setConsulta("")') && escolher.includes("fechar()") && escolher.includes("onEscolher(resultado.destino)") && escolher.includes("setTextoDaVoz(null)"));
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".pc-bolt{background:#FFF6E5;border:1.5px solid #21A3A3;color:#263445}"));
  assert.ok(css.includes(".pc-busca-painel .pc-cmd-foot{font-size:.875rem;color:#263445}"));
});

test("fim de fala: 1 s de silêncio depois de começar a falar; silêncio antes da fala não conta; limite de 8 s", () => {
  assert.equal(SILENCIO_PARA_PARAR_MS, 1000);
  assert.equal(LIMITE_DA_GRAVACAO_MS, 8000);
  // silêncio antes da primeira palavra: nunca para por silêncio (só pelo limite)
  const mudo = criarDetectorDeFimDeFala({ inicioMs: 0 });
  for (let t = 100; t < 8000; t += 100) assert.equal(mudo.processar(0, t), "continuar", `t=${t}`);
  assert.equal(mudo.falou(), false);
  assert.equal(mudo.processar(0, 8000), "limite");
  // fala começa em 2 s; silêncio de 1 s depois da última fala encerra
  const d = criarDetectorDeFimDeFala({ inicioMs: 0 });
  for (let t = 100; t < 2000; t += 100) assert.equal(d.processar(0, t), "continuar");
  assert.equal(d.processar(NIVEL_DE_FALA + 0.1, 2000), "continuar");
  assert.equal(d.falou(), true);
  for (let t = 2100; t < 3000; t += 100) assert.equal(d.processar(0.001, t), "continuar", `t=${t}`);
  assert.equal(d.processar(0.001, 3000), "fim-de-fala");
  // pausa curta (menos de 1 s) no meio da fala não encerra
  const e = criarDetectorDeFimDeFala({ inicioMs: 0 });
  e.processar(0.2, 500);
  assert.equal(e.processar(0, 1200), "continuar");
  assert.equal(e.processar(0.2, 1400), "continuar");
  assert.equal(e.processar(0, 2300), "continuar");
  assert.equal(e.processar(0, 2400), "fim-de-fala");
  // falando sem parar até o limite: o limite vence
  const f = criarDetectorDeFimDeFala({ inicioMs: 0 });
  for (let t = 100; t < 8000; t += 100) assert.equal(f.processar(0.3, t), "continuar");
  assert.equal(f.processar(0.3, 8000), "limite");
});

test("voz: o mecanismo segue sendo gravação + rota de transcrição; o áudio não é guardado em lugar nenhum", () => {
  const voz = ler("../components/useVoiceCapture.ts");
  assert.ok(voz.includes("criarDetectorDeFimDeFala") && voz.includes('const ENDPOINT = "/api/audio/transcrever"') && voz.includes("LIMITE_DA_GRAVACAO_MS"));
  for (const proibido of ["localStorage", "sessionStorage", "indexedDB", "@vercel/blob", "console.log"]) assert.ok(!voz.includes(proibido), proibido);
  assert.ok(voz.includes("partes.length = 0") && voz.includes("nenhum áudio vai para o estado, para o Blob ou para log"));
  const caixa = ler("../components/CommandPalette.tsx");
  assert.ok(!caixa.includes("limiteMs: 10000"), "o celular usa o mesmo fim de fala por silêncio");
  assert.ok(!caixa.includes("destinoParaAbrirSozinho"), "no celular a voz só preenche e mostra os resultados");
});

const destino = (id, titulo, acao, grupo = "ir") => ({ id, grupo, titulo, acao });
const resultado = (d) => ({ destino: d, pontos: 10 });

test("voz: abre sozinho só destino de navegação, único e claro; nunca ação que grava ou altera", () => {
  const relatorios = destino("ir:relatorios", "Relatórios", { tipo: "nav", key: "relatorios" });
  const pops = destino("ir:central:pops", "POPs da empresa", { tipo: "central", subaba: "pops" });
  const dados = destino("ir:central:dados", "Dados da empresa", { tipo: "central", subaba: "dados" });
  const emitidos = destino("ir:relatorios:emitidos", "Relatórios emitidos", { tipo: "relatorios", aba: "emitidos" });
  assert.equal(destinoParaAbrirSozinho([resultado(relatorios)], "relatorios")?.id, "ir:relatorios", "um único resultado de navegação");
  assert.equal(destinoParaAbrirSozinho([resultado(pops), resultado(dados)], "empresa"), null, "mais de um parecido: o usuário escolhe");
  assert.equal(destinoParaAbrirSozinho([resultado(relatorios), resultado(emitidos)], "relatórios")?.id, "ir:relatorios", "só um tem o título exatamente como foi dito");
  assert.equal(destinoParaAbrirSozinho([resultado(relatorios), resultado(emitidos)], "relatorio"), null, "sem título exato e com dois parecidos");
  assert.equal(destinoParaAbrirSozinho([], "nada"), null);
  // ações: nunca abrem sozinhas, mesmo sendo o único resultado
  const acoes = [
    destino("agir:registrar", "Registrar", { tipo: "registrar" }, "agir"),
    destino("agir:continuar", "Continuar inspeção", { tipo: "continuar" }, "agir"),
    destino("emp:1", "Beyond Nutri", { tipo: "empresa", id: "e1" }, "empresas"),
    destino("vis:1", "Visita 2", { tipo: "visita", id: "v1" }, "empresas"),
    destino("item:1", "Piso limpo", { tipo: "item", id: "i1", ambiente: "Cozinha" }, "itens"),
    destino("amb:1", "Cozinha", { tipo: "ambiente", nome: "Cozinha" }, "itens"),
  ];
  for (const a of acoes) {
    assert.equal(ehDestinoDeNavegacao(a), false, a.id);
    assert.equal(destinoParaAbrirSozinho([resultado(a)], a.titulo), null, a.id);
  }
  assert.equal(ehDestinoDeNavegacao(relatorios) && ehDestinoDeNavegacao(pops) && ehDestinoDeNavegacao(emitidos), true);
  const busca = ler("../components/BuscaNaBarra.tsx");
  assert.ok(busca.includes("CONTAGEM_DA_ABERTURA_MS = 2000") && busca.includes("Abrindo {abrindo.titulo}…") && busca.includes("setAbrindo(null)"));
  assert.ok(busca.includes("Cancelar"));
});

test("voz: microfone negado mostra mensagem curta no painel e a digitação segue funcionando", () => {
  const voz = ler("../components/useVoiceCapture.ts");
  assert.ok(voz.includes("Microfone bloqueado: libere a permissão no navegador ou digite.") && voz.includes("Microfone indisponível: digite no campo."));
  const busca = ler("../components/BuscaNaBarra.tsx");
  assert.ok(busca.includes("if (voz.erro) abrir();") && busca.includes('role="alert">{voz.erro}'));
});

import { proximaAcaoDoPop } from "../lib/popGestao.ts";
import { rotuloDoTipoNaFicha, ROTULO_OUTRO_NO_POP } from "../lib/comprovantePop.ts";

test("Próxima ação de leitura: sem os nomes e com 'Ver quem falta' que leva ao bloco do Resumo", () => {
  const pop = { id: "p1", codigo: "POP-01", titulo: "x", versao: "1.1", status: "Aprovado", proximaRevisao: "2099-01-01", conteudo: { frequencia: "diária" }, aprovacao: { nome: "A", cargo: "B", em: "2026-10-01T10:00:00.000Z", versao: "1.1" } };
  const ultimo = { id: "r1", popId: "p1", dataHora: new Date().toISOString() };
  const acao = proximaAcaoDoPop({ pop, definicao: undefined, hoje: new Date().toISOString().slice(0, 10), comprovantes: [], ncs: [], registros: [ultimo], leituraPendente: { lidos: 1, total: 4, faltam: ["maria", "Paulo", "Ana"] }, podeAprovar: false });
  assert.equal(acao.tipo, "leitura-pendente");
  assert.equal(acao.texto, "Faltam 3 pessoas lerem a v1.1");
  assert.ok(!/maria|Paulo|Ana/.test(acao.texto));
  assert.equal(acao.botao.rotulo, "Ver quem falta");
  const ficha = ler("../components/pc/PcFichaPop.tsx");
  assert.ok(ficha.includes('document.getElementById("ficha-quem-nao-leu")') && ficha.includes("scrollIntoView") && ficha.includes("onClick={() => irParaOBotao()}"));
  assert.ok(ler("../components/pc/QuemAindaNaoLeu.tsx").includes('id="ficha-quem-nao-leu"'));
  assert.match(ler("../app/globals.css"), /\.ficha-cartao-rotulo\{font-size:\.875rem;color:#263445\}/);
});

test("tarja do comprovante fica dentro do cartão (filhos do ListRow), com fio de 1 px e sem borda própria", () => {
  const tela = ler("../components/pc/PcComprovantes.tsx");
  const i = tela.indexOf("filhos={");
  assert.ok(i > 0 && tela.indexOf('className="comp-tarja"', i) > i, "a tarja é passada em filhos");
  assert.ok(!tela.includes('className="comp-item"'), "sem o invólucro que deixava a tarja fora do cartão");
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".ui-row-extra > .comp-tarja{margin:0;padding:6px 14px 6px 18px;border:0;border-top:1px solid #21A3A3;border-radius:0;background:#FFE8A3}"));
  assert.ok(ler("../components/ui/ListRow.tsx").includes('<div className="ui-row-extra">{filhos}</div>'));
});

test("Renovar na ficha: o Tipo travado mostra o tipo herdado do comprovante, não 'Outro documento deste POP'", () => {
  assert.equal(rotuloDoTipoNaFicha("reservatorio"), "Limpeza do reservatório");
  assert.equal(rotuloDoTipoNaFicha("pragas"), "Controle de pragas");
  assert.equal(rotuloDoTipoNaFicha("outro"), ROTULO_OUTRO_NO_POP);
  const tela = ler("../components/pc/PcComprovantes.tsx");
  assert.ok(tela.includes("Boolean(dados.renovaId)) ? (") && tela.includes("rotuloDoTipoNaFicha(dados.tipo)"));
  // a renovação grava o mesmo tipo do original (o estado do formulário nasce dele)
  assert.ok(tela.includes("{ tipo: item.tipo, emissor: item.emissor, dataServico: \"\", validade: \"\", observacao: \"\", renovaId: item.id"));
});
