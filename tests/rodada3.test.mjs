import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ESPERA_DO_AVANCO_MS, deveAvancarSozinho, textoDoAvanco } from "../lib/avancoAutomatico.ts";
import { FONTE_NAO_REGISTRADA, obterModeloChecklistManual } from "../lib/manualChecklist.ts";
import { SETORES_OFICIAIS_MANUAL, criarModelosQuestionarioAmbientes } from "../lib/manualBase.ts";
import { acharMunicipio } from "../lib/municipiosIbge.ts";
import { DEFINICOES_FLUXOS_OPERACIONAIS, PERGUNTAS_POR_FLUXO, adequarFluxosAosSetores, criarFluxosOperacionaisPadrao, obterCriteriosOperacionaisParaSetor } from "../lib/operationalFlows.ts";
import { PERGUNTAS_DO_QUESTIONARIO_BASICO_VISITA, perguntasDoSetor } from "../lib/perguntasDoAmbiente.ts";
import { agruparAmbientesPorPublico, linhaDoResumoDeFluxos, resumoDeFluxosPorSetor } from "../lib/escolhaDoPacote.ts";
import { textoDeEndereco } from "../lib/textoDeEndereco.ts";
import { nomeCurtoDoSetor, publicoDoSetor } from "../lib/tiposDeEstabelecimento.ts";
import { propostaDaConsulta } from "../lib/cnpjConsulta.ts";
import { mostrarToast, limparToast, toastAtual } from "../lib/toast.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");

const referenciaValida = (referencia) => /^Derivada do Manual, cap\. \d/.test(referencia) || /^Parcial: tema do Manual, cap\. \d/.test(referencia) || referencia === FONTE_NAO_REGISTRADA;
const classe = (referencia) => (referencia.startsWith("Derivada") ? "derivada" : referencia.startsWith("Parcial") ? "parcial" : "sem");

// ===== Avanço automático =====
test("avanço automático: Conforme e Não se aplica avançam; Não conforme nunca; observação já digitada ou preferência desligada não", () => {
  const base = { avancarLigado: true, observacaoDigitada: false, podeEditar: true };
  assert.equal(deveAvancarSozinho({ ...base, status: "Conforme" }), true);
  assert.equal(deveAvancarSozinho({ ...base, status: "Não se aplica" }), true);
  assert.equal(deveAvancarSozinho({ ...base, status: "Não Conforme" }), false, "Não conforme abre gravidade, foto e observação");
  assert.equal(deveAvancarSozinho({ ...base, status: "Conforme", observacaoDigitada: true }), false, "RT já escreveu: ainda está no item");
  assert.equal(deveAvancarSozinho({ ...base, status: "Conforme", avancarLigado: false }), false);
  assert.equal(deveAvancarSozinho({ ...base, status: "Conforme", podeEditar: false }), false);
  assert.ok(ESPERA_DO_AVANCO_MS >= 300 && ESPERA_DO_AVANCO_MS <= 800);
});

test("avanço automático: textos do aviso (item, ambiente concluído com o próximo, fim)", () => {
  assert.equal(textoDoAvanco({ posNoAmbiente: 4, status: "Conforme", proximoAmbiente: "", fimDaLista: false }), "Item 4 · Conforme");
  assert.equal(textoDoAvanco({ posNoAmbiente: 2, status: "Não se aplica", proximoAmbiente: "", fimDaLista: false }), "Item 2 · Não se aplica");
  assert.equal(textoDoAvanco({ posNoAmbiente: 11, status: "Conforme", proximoAmbiente: "Cozinha", fimDaLista: false }), "Ambiente concluído · Próximo: Cozinha");
  assert.equal(textoDoAvanco({ posNoAmbiente: 11, status: "Conforme", proximoAmbiente: "", fimDaLista: true }), "Ambiente concluído · Fim do checklist");
});

test("avanço automático: a resposta é gravada na hora, o aviso tem Desfazer que volta o item a Pendente, e a preferência está em Meu perfil (ligada por padrão)", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("function avancarAposResponder(") && pagina.includes('atualizarChecklistItem(item.id, { status: "Pendente" })') && pagina.includes('rotulo: "Desfazer"'));
  assert.equal((pagina.match(/onAvancar=\{\(status\) => avancarAposResponder\(foco, status\)\}/g) || []).length, 3, "celular, PC e tablet");
  const componente = ler("../components/ChecklistFocoItem.tsx");
  assert.ok(componente.includes("deveAvancarSozinho(") && componente.includes("observacaoDigitada: texto.trim().length > 0"));
  assert.ok(componente.indexOf("deveAvancarSozinho(") < componente.indexOf("onStatus(resposta)"), "decide antes de gravar");
  const preferencias = ler("../lib/preferenciasDeCampo.ts");
  assert.ok(preferencias.includes('getItem(CHAVE_AVANCAR_AO_RESPONDER) !== "0"'), "ligada por padrão");
  assert.ok(ler("../components/pc/MeuPerfilModal.tsx").includes("Avançar ao responder Conforme"));
});

test("aviso com ação (Desfazer) no toast", () => {
  let desfeito = false;
  mostrarToast("Item 1 · Conforme", { duracaoMs: 50, acao: { rotulo: "Desfazer", aoClicar: () => { desfeito = true; } } });
  const aviso = toastAtual();
  assert.equal(aviso.acao.rotulo, "Desfazer");
  aviso.acao.aoClicar();
  assert.equal(desfeito, true);
  limparToast();
});

// ===== Rastreabilidade =====
test("toda pergunta dos 13 setores traz 'Derivada do Manual', 'Parcial' ou 'Fonte não registrada' (nunca texto genérico) e os totais batem com a comparação", () => {
  const unicas = new Map();
  for (const setor of SETORES_OFICIAIS_MANUAL) {
    for (const pergunta of obterModeloChecklistManual(setor, setor)) {
      assert.ok(referenciaValida(pergunta.referencia), `${setor} · ${pergunta.titulo}: ${pergunta.referencia}`);
      if (pergunta.categoria === "Equipamentos e móveis") continue;
      unicas.set(pergunta.titulo, classe(pergunta.referencia));
    }
  }
  const contagem = { derivada: 0, parcial: 0, sem: 0 };
  for (const valor of unicas.values()) contagem[valor] += 1;
  assert.deepEqual(contagem, { derivada: 21, parcial: 10, sem: 3 }, "34 textos distintos: 21 / 10 / 3");
});

test("as três perguntas que o Manual traz no cap. 2 apontam para o cap. 2 (não para o cap. 1)", () => {
  const achar = (setor, titulo) => obterModeloChecklistManual(setor, setor).find((pergunta) => pergunta.titulo.startsWith(titulo)).referencia;
  assert.match(achar(SETORES_OFICIAIS_MANUAL[0], "Área de recebimento é coberta"), /cap\. 2, item 1$/);
  assert.match(achar(SETORES_OFICIAIS_MANUAL[1], "Prateleiras, estrados"), /cap\. 2, item 2$/);
  assert.match(achar(SETORES_OFICIAIS_MANUAL[2], "Produtos químicos estão identificados"), /cap\. 2, item 2\.4$/);
});

test("perguntas sem trecho no Manual dizem 'Fonte não registrada'", () => {
  const achar = (setor, titulo) => obterModeloChecklistManual(setor, setor).find((pergunta) => pergunta.titulo.startsWith(titulo)).referencia;
  assert.equal(achar(SETORES_OFICIAIS_MANUAL[3], "Cilindros, válvulas"), FONTE_NAO_REGISTRADA);
  assert.equal(achar(SETORES_OFICIAIS_MANUAL[5], "O fluxo de higienização evita"), FONTE_NAO_REGISTRADA);
  assert.equal(achar(SETORES_OFICIAIS_MANUAL[8], "O banheiro não se comunica"), FONTE_NAO_REGISTRADA);
  assert.equal(obterModeloChecklistManual("Meu ambiente", "Estrutura geral/personalizada").every((pergunta) => pergunta.referencia === FONTE_NAO_REGISTRADA), true);
});

test("a tela não usa mais o texto genérico como se fosse fonte; mapa antigo e fluxos têm referência por pergunta", () => {
  const pagina = ler("../app/page.tsx");
  assert.equal(pagina.includes("Boas Práticas — critério operacional"), false);
  assert.ok(pagina.includes('referencia: item.referencia || "Fonte não registrada"'));
  const fluxos = DEFINICOES_FLUXOS_OPERACIONAIS.map((definicao) => definicao.tipo);
  const todos = criarFluxosOperacionaisPadrao().map((fluxo) => ({ ...fluxo, aplicavel: true, setorVinculado: "X" }));
  const contagem = { derivada: 0, parcial: 0, sem: 0 };
  for (const item of obterCriteriosOperacionaisParaSetor(todos, "X")) {
    assert.ok(referenciaValida(item.referencia), item.referencia);
    contagem[classe(item.referencia)] += 1;
  }
  assert.equal(fluxos.length, 11);
  assert.deepEqual(contagem, { derivada: 25, parcial: 8, sem: 0 }, "33 perguntas dos fluxos: 25 / 8 / 0");
  // mapa antigo: as 5 chaves que ainda valem têm referência em cada pergunta (14 / 8 / 3)
  let derivada = 0;
  let parcial = 0;
  let sem = 0;
  for (const chave of ["Câmara refrigerada", "Câmara de congelamento", "Sanitários / Vestiários", "Área de resíduos", "Área externa"]) {
    const antigos = ler("../lib/checklistModelosAntigos.ts");
    const inicio = antigos.indexOf(`  "${chave}": [`);
    const bloco = antigos.slice(inicio, antigos.indexOf("\n  ],", inicio));
    const referencias = [...bloco.matchAll(/referencia: "([^"]*)"/g)].map((m) => m[1]);
    assert.equal(referencias.length, 5, chave);
    for (const referencia of referencias) {
      assert.ok(referenciaValida(referencia), referencia);
      if (classe(referencia) === "derivada") derivada += 1;
      else if (classe(referencia) === "parcial") parcial += 1;
      else sem += 1;
    }
  }
  assert.deepEqual({ derivada, parcial, sem }, { derivada: 14, parcial: 8, sem: 3 });
});

test("o .gitignore cobre o Manual (.docx) e a proposta, sem desversionar os guias", () => {
  const ignore = ler("../.gitignore");
  assert.ok(ignore.includes("conteudo-privado/*.docx") && ignore.includes("conteudo-privado/rastreabilidade-proposta.md"));
  assert.equal(ignore.includes("\nconteudo-privado/\n"), false, "a pasta inteira NÃO é ignorada (os guias são versionados)");
  try {
    const saida = execFileSync("git", ["check-ignore", "-v", "conteudo-privado/MANUAL DE BOAS PRÁTICAS.docx", "conteudo-privado/rastreabilidade-proposta.md"], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
    assert.ok(saida.includes(".docx") && saida.includes("rastreabilidade-proposta.md"));
    const guias = execFileSync("git", ["ls-files", "conteudo-privado/guias"], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
    assert.ok(guias.includes("guia-rapido.html"));
  } catch (erro) {
    if (erro.code === "ENOENT") return; // sem git no ambiente: a leitura do arquivo acima já vale
    throw erro;
  }
});

// ===== Fluxos sem setor padrão =====
test("Congelamento, Descongelamento, Manejo de resíduos e Entrada e saída ficam SEM setor padrão e não somam perguntas até o RT escolher", () => {
  const padrao = criarFluxosOperacionaisPadrao();
  const semSetor = padrao.filter((fluxo) => !fluxo.setorVinculado).map((fluxo) => fluxo.tipo).sort();
  assert.deepEqual(semSetor, ["Congelamento", "Descongelamento", "Entrada e saída de colaboradores", "Manejo de resíduos"]);
  const cozinha = SETORES_OFICIAIS_MANUAL[4];
  const marcados = padrao.map((fluxo) => ({ ...fluxo, aplicavel: true }));
  // Cozinha por padrão: Manipulação, FLV, Pré-preparo e Porcionamento = 4 fluxos = 12 perguntas
  assert.equal(obterCriteriosOperacionaisParaSetor(marcados, cozinha).length, 4 * PERGUNTAS_POR_FLUXO);
  assert.equal(obterCriteriosOperacionaisParaSetor(marcados, "").length, 0, "sem setor nada soma");
  // ao adequar aos setores da empresa, o sem setor continua sem setor (não é adivinhado)
  const adequados = adequarFluxosAosSetores(marcados, [cozinha, SETORES_OFICIAIS_MANUAL[0], SETORES_OFICIAIS_MANUAL[1], SETORES_OFICIAIS_MANUAL[6]]);
  assert.equal(adequados.find((fluxo) => fluxo.tipo === "Manejo de resíduos").setorVinculado, "");
  // depois de o RT escolher, soma
  const escolhido = adequados.map((fluxo) => (fluxo.tipo === "Congelamento" ? { ...fluxo, setorVinculado: cozinha } : fluxo));
  assert.equal(obterCriteriosOperacionaisParaSetor(escolhido, cozinha).length, 5 * PERGUNTAS_POR_FLUXO);
  const campos = ler("../components/OperationalFlowsFields.tsx");
  assert.ok(campos.includes("Escolha o setor deste fluxo"));
});

test("janela do pacote: cada fluxo marcado adiciona 3 perguntas ao setor; '7 fluxos = 21 perguntas na Cozinha / Produção'", () => {
  const resumo = resumoDeFluxosPorSetor([...Array(7)].map(() => ({ setor: "Cozinha / Produção" })).concat([{ setor: "" }]), PERGUNTAS_POR_FLUXO);
  assert.deepEqual(resumo, [{ setor: "Cozinha / Produção", fluxos: 7, perguntas: 21 }]);
  assert.equal(linhaDoResumoDeFluxos(resumo[0]), "7 fluxos = 21 perguntas na Cozinha / Produção");
  const janela = ler("../components/PacoteDoTipo.tsx");
  assert.ok(janela.includes("Cada fluxo marcado adiciona {PERGUNTAS_POR_FLUXO} perguntas ao setor dele") && janela.includes("Setor do fluxo"));
  assert.ok(ler("../app/page.tsx").includes("setorVinculado: escolha.setorDosFluxos[fluxo.tipo] || \"\""));
});

// ===== Ambiente com nome próprio =====
test("quantas perguntas cada setor oficial tem na visita, e o questionário básico (3)", () => {
  assert.deepEqual(SETORES_OFICIAIS_MANUAL.map(perguntasDoSetor), [11, 11, 12, 8, 13, 12, 11, 12, 13, 12, 13, 13, 13]);
  assert.equal(PERGUNTAS_DO_QUESTIONARIO_BASICO_VISITA, 3);
  const campos = ler("../components/ManualBaseFields.tsx");
  assert.ok(campos.includes("Questionário básico · {textoDaConta(setor)}") && campos.includes("Vincular a um setor oficial"));
  assert.ok(campos.includes("perde as ") && campos.includes("mantém as "), "avisos ao desmarcar o setor e ao tirar o vínculo");
});

test("nome próprio vinculado mantém as perguntas do setor oficial mesmo com o setor desmarcado; sem vínculo cai nas 3", () => {
  const refeitorio = SETORES_OFICIAIS_MANUAL[6];
  const modelos = criarModelosQuestionarioAmbientes(["Salão", "Varanda"], {}, { Salão: refeitorio });
  assert.equal(modelos["Salão"], refeitorio);
  assert.equal(perguntasDoSetor(modelos["Salão"]), 11);
  assert.equal(perguntasDoSetor(modelos["Varanda"]), 3);
});

// ===== Janela do pacote: nomes e grupos =====
test("banheiros sem ambiguidade e agrupados por público", () => {
  assert.equal(nomeCurtoDoSetor(SETORES_OFICIAIS_MANUAL[8]), "Banheiro colab. fem.");
  assert.equal(nomeCurtoDoSetor(SETORES_OFICIAIS_MANUAL[10]), "Banheiro colab. masc.");
  assert.equal(nomeCurtoDoSetor(SETORES_OFICIAIS_MANUAL[11]), "Banheiro clientes fem.");
  assert.equal(nomeCurtoDoSetor(SETORES_OFICIAIS_MANUAL[12]), "Banheiro clientes masc.");
  const grupos = agruparAmbientesPorPublico([...SETORES_OFICIAIS_MANUAL], publicoDoSetor);
  assert.deepEqual(grupos.map((grupo) => [grupo.grupo, grupo.ambientes.length]), [["Produção e apoio", 7], ["Colaboradores", 4], ["Clientes", 2]]);
});

// ===== Nova empresa =====
test("endereço e município saem de CAIXA ALTA para escrita normal; texto já escrito e razão social não mudam", () => {
  assert.equal(textoDeEndereco("BRIG FARIA LIMA"), "Brig. Faria Lima");
  assert.equal(textoDeEndereco("AV DO ESTADO"), "Av. do Estado");
  assert.equal(textoDeEndereco("JARDIM PAULISTANO II"), "Jardim Paulistano II");
  assert.equal(textoDeEndereco("Rua Já Escrita"), "Rua Já Escrita");
  assert.equal(textoDeEndereco(""), "");
  const proposta = propostaDaConsulta({ cnpj: "01937526000165", razao_social: "EMPRESA SIMULADA LTDA", logradouro: "BRIG FARIA LIMA", bairro: "ITAIM BIBI", municipio: "SAO PAULO", cep: "01452921", uf: "SP" });
  assert.equal(proposta.logradouro, "Brig. Faria Lima");
  assert.equal(proposta.bairro, "Itaim Bibi");
  assert.equal(proposta.municipio, "Sao Paulo");
  assert.equal(proposta.razaoSocial, "EMPRESA SIMULADA LTDA");
  // o acento só volta pela lista oficial do IBGE
  assert.equal(acharMunicipio("SAO PAULO", ["São Paulo", "São Paulo do Potengi"]), "São Paulo");
  assert.equal(acharMunicipio("SAO PAULO", []), "");
});

test("Nova empresa: um aviso único da consulta, sem chips por campo, sem lista repetida de CNAEs, fantasia/e-mail vazios explicados", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("Preenchido pela consulta. Confira e edite o que precisar."));
  assert.equal(pagina.includes('{camposDaConsulta.includes(k) && <span className="chip-consulta">{k === "tipo"'), false);
  assert.equal(pagina.includes("CNAEs secundários da consulta:"), false);
  assert.ok(pagina.includes("Sem nome fantasia na Receita") && pagina.includes("Usar a razão social") && pagina.includes("A consulta não traz e-mail"));
  assert.ok(pagina.includes('className="ui-btn ui-btn--secondary pacote-confirmar-tipo"') && pagina.includes("<CaixaQueCresce"));
  assert.ok(pagina.includes("nova-resp") && pagina.includes("Informar responsável (opcional)"));
  const painel = ler("../components/PacoteDoTipo.tsx");
  assert.ok(painel.includes("adicionados") && painel.includes("depois de salvar a empresa, confira em Cadastros") === false && painel.includes("Depois de salvar a empresa, confira em Cadastros"));
  assert.ok(ler("../app/globals.css").includes(".pacote-tipo .pacote-tipo-ver{height:40px;padding:0 18px;font-size:1.0625rem;font-weight:700}"));
});

// ===== Navegação e Início =====
test("Mais do celular (menu enxuto): 'Desta visita' com 4 atalhos em grade 2x2, Cadastros e Empresas com '+ Nova' na linha, Conta e app, Sincronizar e Sair; sem subtítulos, sem 'Usar versão completa agora' e sem 'Trocar empresa'", () => {
  const campo = ler("../components/campo/CampoTelas.tsx");
  assert.ok(campo.includes("SecaoMais") && campo.includes("campo-mais-nova") && campo.includes("campo-mais-atalhos"));
  assert.equal(campo.includes("Usar versão completa agora") || campo.includes("onVersaoCompleta") || campo.includes("campo-mais-sub"), false, "sem botão de versão completa nem subtítulos");
  const pagina = ler("../app/page.tsx");
  for (const texto of ["Desta visita", "Cadastros e documentos", "Conta e app", "Meu perfil", "Administração", "Modo de tela", "Sincronizar", "Enviar agora", "Sair", '"+ Nova"', "ROTULO_DO_MODO[modo]", '"✓ Tudo enviado"']) assert.ok(pagina.includes(texto), texto);
  const bloco = pagina.slice(pagina.indexOf("<CampoMais"), pagina.indexOf("modo === \"campo\" && view === \"inicio\" && !ehFiscal"));
  assert.ok(bloco.length > 500, "bloco do Mais encontrado");
  for (const removido of ["Da visita atual", "Central da visita", "Escolher por onde a visita passa", "Trocar empresa", "Usar versão completa", "POPs desta visita", "Relatório da visita"]) assert.equal(bloco.includes(removido), false, removido);
  assert.equal(pagina.includes("onVersaoCompleta"), false);
  assert.equal(pagina.includes('etiqueta: "novo"'), false);
  assert.ok(pagina.includes("abrirNovaEmpresaPeloMenu") && pagina.includes("onNovaEmpresa={permitido(\"empresas.editar\")"));
  assert.ok(ler("../components/campo/TrocarEmpresaPainel.tsx").includes("+ Nova empresa"));
});

test("Início do celular: 'Hoje precisa de você' sem os atalhos de relatório, que ganham bloco próprio; contagem e empresa não se repetem", () => {
  const painel = ler("../components/PainelHoje.tsx");
  assert.ok(painel.includes("export function AtalhosDeRelatorios"));
  const principal = painel.slice(painel.indexOf("export default function PainelHoje"), painel.indexOf("export function AtalhosDeRelatorios"));
  assert.equal(principal.includes("Resumo de uma página") || principal.includes("Dossiê") || principal.includes("Lembrete ao responsável"), false);
  const campo = ler("../components/campo/CampoTelas.tsx");
  assert.ok(campo.includes("visitaAtiva.empresa !== empresa"));
  assert.ok(ler("../app/globals.css").includes(".campo-btn--brand{background:#E8760A;color:#fff}"), "Continuar checklist é laranja com texto branco (nunca escuro)");
});

test("Evidências: UM aviso fino no topo; o rótulo do modo de tela é claro", () => {
  const ev = ler("../components/pc/PcEvidencias.tsx");
  assert.equal((ev.match(/className="ev7-aviso-fino"/g) || []).length, 1);
  assert.equal(ev.includes("Antes de usar a IA, evite enquadrar"), false);
  assert.equal(ev.includes("A IA só sugere. Nada vira NC sem a sua confirmação."), false);
  assert.ok(ler("../components/AppTopbar.tsx").includes("Modo de tela: {ROTULO_DO_MODO[modo]}"));
});

test("CLAUDE.md traz a REGRA DE CONTEÚDO TÉCNICO", () => {
  const claude = ler("../CLAUDE.md");
  assert.ok(claude.includes("## REGRA DE CONTEÚDO TÉCNICO") && claude.includes("Em dúvida entre inventar e deixar vazio: deixar vazio e sinalizar."));
});

test("fonte da pergunta na tela: derivada/parcial aparecem como estão; textos genéricos antigos viram 'Fonte não registrada'", async () => {
  const { fonteParaExibir, SEM_FONTE } = await import("../lib/fonteDaPergunta.ts");
  assert.equal(fonteParaExibir("Derivada do Manual, cap. 1, item 2.5"), "Derivada do Manual, cap. 1, item 2.5");
  assert.equal(fonteParaExibir("Parcial: tema do Manual, cap. 2, item 4; o texto da pergunta difere"), "Parcial: tema do Manual, cap. 2, item 4; o texto da pergunta difere");
  assert.equal(fonteParaExibir("Boas Práticas — critério operacional"), SEM_FONTE);
  assert.equal(fonteParaExibir("Manual de Boas Práticas — Capítulo 1"), SEM_FONTE);
  assert.equal(fonteParaExibir("Manual de Boas Práticas — Capítulo 2 — Recebimento"), SEM_FONTE);
  assert.equal(fonteParaExibir(""), SEM_FONTE);
  assert.equal(fonteParaExibir(undefined), SEM_FONTE);
  // o que já cita uma norma (bloco antigo de Recebimento) continua como está: não é validado nem reescrito aqui
  assert.equal(fonteParaExibir("RDC 216/2004 — item 4.7.2"), "RDC 216/2004 — item 4.7.2");
  assert.equal(SEM_FONTE, "Fonte não registrada");
  assert.ok(ler("../app/page.tsx").includes("fonte: fonteParaExibir(foco.referencia)"));
});

test("rotuloDaFonte: 'Fonte não registrada' aparece sem o prefixo 'Fonte: ' e o dado guardado não muda", async () => {
  const { rotuloDaFonte, SEM_FONTE } = await import("../lib/fonteDaPergunta.ts");
  assert.equal(rotuloDaFonte("Fonte não registrada"), SEM_FONTE);
  assert.equal(rotuloDaFonte(""), SEM_FONTE);
  assert.equal(rotuloDaFonte(undefined), SEM_FONTE);
  assert.equal(rotuloDaFonte("Boas Práticas — critério operacional"), SEM_FONTE);
  assert.equal(rotuloDaFonte("Derivada do Manual, cap. 1, item 2.5"), "Fonte: Derivada do Manual, cap. 1, item 2.5");
  assert.equal(rotuloDaFonte("RDC 216/2004 — item 4.7.2"), "Fonte: RDC 216/2004 — item 4.7.2");
  for (const arquivo of ["../components/ChecklistFocoItem.tsx", "../components/pc/PcChecklist.tsx", "../components/pc/PcRelatoriosEmitidos.tsx"]) {
    const codigo = ler(arquivo);
    assert.ok(codigo.includes("rotuloDaFonte("), arquivo);
    assert.ok(!/Fonte: \{/.test(codigo), arquivo + " não monta 'Fonte: ' à mão");
  }
});
