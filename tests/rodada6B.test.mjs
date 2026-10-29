import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GRUPOS_DA_CENTRAL, ROTULO_DA_SUBABA, blocoAtivoDaBarra, subabasDaBarra } from "../lib/centralEmpresa.ts";
import {
  adicionarEquipamentoNoSetor,
  adicionarSugestoesEmLote,
  avisoDeNomeRepetido,
  concordar,
  contagemPorSetor,
  desfazerMover,
  equipamentoRepetidoNoSetor,
  mesmoNomeDeEquipamento,
  moverSomandoSeRepetir,
  podeAdicionarEquipamento,
  removerEquipamento,
  somarAoExistente,
} from "../lib/equipamentosCadastro.ts";
import { copiarDeOutraEmpresa, destinoEditavel, equipamentosDaOrigem, origemElegivel, origensElegiveis } from "../lib/copiaEquipamentos.ts";
import { formatarCnae, sugestaoPorCnae, tituloDaSugestao } from "../lib/sugestaoPorCnae.ts";
import { assinaturaComEstrutura, assinaturaEdicaoEmpresa } from "../lib/estadoNaoSalvo.ts";
import { marcarComoRevisado } from "../lib/revisaoDeCadastros.ts";
import { pacoteDoTipo } from "../lib/tiposDeEstabelecimento.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");
const COZINHA = "Cozinha / Produção";
const ESTOQUE = "Estoque / Armazenamento";

const eq = (id, setor, nome, quantidade = 1) => ({ id, setor, nome, quantidade, estado: "Não avaliado", observacao: "" });

// ===== B1: sub-abas separadas =====
test("Ambientes, Equipamentos e Fluxos são abas separadas (sem alias) na barra da Central", () => {
  const estrutura = GRUPOS_DA_CENTRAL.find((g) => g.id === "estrutura");
  assert.deepEqual(estrutura.subabas, ["ambientes", "equipamentos", "fluxos"]);
  assert.deepEqual(subabasDaBarra(estrutura.subabas), ["ambientes", "equipamentos", "fluxos"]);
  assert.equal(blocoAtivoDaBarra("equipamentos"), "equipamentos");
  assert.equal(ROTULO_DA_SUBABA.ambientes, "Ambientes");
  assert.equal(ROTULO_DA_SUBABA.equipamentos, "Equipamentos");
});

// ===== B5: nome repetido na hora =====
test("nome repetido: compara sem acento, sem diferença de caixa e sem espaço sobrando, só dentro do setor", () => {
  const lista = [eq("a", COZINHA, "Refrigerador", 2), eq("b", ESTOQUE, "Câmara fria")];
  assert.equal(equipamentoRepetidoNoSetor(lista, COZINHA, "  refrigerador ")?.id, "a");
  assert.equal(equipamentoRepetidoNoSetor(lista, COZINHA, "REFRIGERADOR")?.id, "a");
  assert.equal(equipamentoRepetidoNoSetor(lista, ESTOQUE, "camara   FRIA")?.id, "b", "sem acento");
  assert.equal(equipamentoRepetidoNoSetor(lista, COZINHA, "Câmara fria"), undefined, "outro setor não conta");
  assert.equal(equipamentoRepetidoNoSetor(lista, COZINHA, ""), undefined);
  assert.equal(equipamentoRepetidoNoSetor(lista, COZINHA, "Refrigerador", "a"), undefined, "ignora o próprio item");
  assert.equal(mesmoNomeDeEquipamento("Forno", "forno"), true);
  assert.equal(mesmoNomeDeEquipamento("", ""), false);
});

test("aviso 'Já existe X (Qtd N) neste setor' e Adicionar só liga depois de escolher Somar ou Outro item", () => {
  const existente = eq("a", COZINHA, "Refrigerador", 2);
  assert.equal(avisoDeNomeRepetido(existente), "Já existe Refrigerador (Qtd 2) neste setor");
  assert.equal(avisoDeNomeRepetido(undefined), "");
  assert.equal(podeAdicionarEquipamento("Coifa", undefined, null), true);
  assert.equal(podeAdicionarEquipamento("   ", undefined, null), false);
  assert.equal(podeAdicionarEquipamento("refrigerador", existente, null), false, "repetido sem escolha: desabilitado");
  assert.equal(podeAdicionarEquipamento("refrigerador", existente, "somar"), true);
  assert.equal(podeAdicionarEquipamento("refrigerador", existente, "outro"), true);
});

test("somar ao existente soma a Qtd digitada e não cria item; 'outro item' cria o 2º com o mesmo nome", () => {
  const lista = [eq("a", COZINHA, "Refrigerador", 2)];
  const somada = somarAoExistente(lista, "a", 3);
  assert.equal(somada.length, 1);
  assert.equal(somada[0].quantidade, 5);
  assert.equal(somarAoExistente(lista, "inexistente", 3), lista);
  assert.equal(lista[0].quantidade, 2, "o original não muda");
  const { equipamentos, criado } = adicionarEquipamentoNoSetor(lista, { id: "n", setor: COZINHA, nome: " Refrigerador ", quantidade: 1 });
  assert.equal(equipamentos.length, 2);
  assert.equal(criado.setor, COZINHA, "nasce vinculado ao setor escolhido");
  assert.equal(criado.nome, "Refrigerador");
  assert.equal(criado.estado, "Não avaliado");
  assert.equal(adicionarEquipamentoNoSetor([], { id: "x", setor: COZINHA, nome: "Coifa", quantidade: 0 }).criado.quantidade, 1, "quantidade mínima 1");
});

test("remover tira só o item e a lista volta com o desfazer (reinserir pelo toast)", () => {
  const lista = [eq("a", COZINHA, "Fogão"), eq("b", COZINHA, "Forno")];
  const sem = removerEquipamento(lista, "a");
  assert.deepEqual(sem.map((i) => i.id), ["b"]);
  assert.equal(removerEquipamento(lista, "zzz"), lista);
});

// ===== B6: mover de setor =====
test("mover mantém a quantidade e leva o item para o setor escolhido", () => {
  const lista = [eq("a", COZINHA, "Freezer", 3), eq("b", ESTOQUE, "Câmara fria")];
  const r = moverSomandoSeRepetir(lista, "a", ESTOQUE);
  assert.equal(r.movido, true);
  assert.equal(r.somouEm, undefined);
  const movido = r.equipamentos.find((i) => i.id === "a");
  assert.equal(movido.setor, ESTOQUE);
  assert.equal(movido.quantidade, 3);
  assert.equal(r.equipamentos.length, 2);
  const mesmo = moverSomandoSeRepetir(lista, "a", COZINHA);
  assert.equal(mesmo.movido, false);
  assert.equal(mesmo.equipamentos, lista);
});

test("mover para setor que já tem o mesmo nome soma a quantidade (sem duplicar) e o desfazer devolve tudo", () => {
  const lista = [eq("a", COZINHA, "Freezer", 3), eq("b", ESTOQUE, "freezer", 2)];
  const r = moverSomandoSeRepetir(lista, "a", ESTOQUE);
  assert.equal(r.movido, true);
  assert.equal(r.equipamentos.length, 1, "sem duplicar");
  assert.equal(r.equipamentos[0].id, "b");
  assert.equal(r.equipamentos[0].quantidade, 5);
  assert.equal(r.somouEm.id, "b");
  const volta = desfazerMover(r.equipamentos, lista[0], r.somouEm.id);
  assert.equal(volta.length, 2);
  assert.equal(volta.find((i) => i.id === "b").quantidade, 2);
  assert.equal(volta.find((i) => i.id === "a").setor, COZINHA);
  // desfazer de um mover simples
  const simples = moverSomandoSeRepetir([eq("a", COZINHA, "Forno", 1)], "a", ESTOQUE);
  assert.equal(desfazerMover(simples.equipamentos, eq("a", COZINHA, "Forno", 1))[0].setor, COZINHA);
});

test("contagem por setor e sugestões em lote (as que o setor já tem não entram)", () => {
  const lista = [eq("a", COZINHA, "Fogão"), eq("b", COZINHA, "Forno"), eq("c", ESTOQUE, "Freezer")];
  assert.deepEqual(contagemPorSetor(lista, [COZINHA, ESTOQUE, "Recebimento"]), { [COZINHA]: 2, [ESTOQUE]: 1, Recebimento: 0 });
  let n = 0;
  const r = adicionarSugestoesEmLote(lista, COZINHA, [{ nome: "forno", quantidade: 1 }, { nome: "Chapa", quantidade: 2 }], () => `novo${++n}`);
  assert.deepEqual(r.criados, ["novo1"]);
  const chapa = r.equipamentos.find((i) => i.id === "novo1");
  assert.equal(chapa.setor, COZINHA);
  assert.equal(chapa.quantidade, 2);
});

test("avisos do toast concordam com o nome: 'Coifa adicionada', 'Refrigerador adicionado'", () => {
  assert.equal(concordar("Coifa", "adicionad"), "adicionada");
  assert.equal(concordar("Refrigerador", "adicionad"), "adicionado");
  assert.equal(concordar("Câmara fria", "removid"), "removida");
  assert.equal(concordar("Fogão", "movid"), "movido");
});

// ===== B7: elegibilidade da cópia (mesma função da rota do servidor) =====
const RT = { id: "u1", nome: "RT", email: "rt@example.com", perfil: "Consultor/RT", status: "Ativo", empresaIds: ["dest", "orig", "outra", "semRevisao", "soAmbientes", "arquivada"], criadoEm: "", atualizadoEm: "" };
const GESTOR = { ...RT, id: "u2", perfil: "Cliente Gestor", empresaIds: ["dest", "orig"] };
const SO_DESTINO = { ...RT, id: "u3", empresaIds: ["dest"] };
const SUSPENSO = { ...RT, id: "u4", status: "Suspenso" };

function empresa(id, nome, extra = {}) {
  return { id, nomeFantasia: nome, razaoSocial: nome, setoresManual: [COZINHA, ESTOQUE], equipamentosSetores: [eq(`${id}-1`, COZINHA, "Fogão", 2), eq(`${id}-2`, ESTOQUE, "Freezer")], fluxosOperacionais: [], ...extra };
}
const revisada = (e) => marcarComoRevisado(marcarComoRevisado(e, "ambientes", { nome: "RT" }, "2026-10-01T10:00:00.000Z"), "equipamentos", { nome: "RT" }, "2026-10-01T10:00:00.000Z");

function cenario() {
  return {
    dest: empresa("dest", "Destino"),
    orig: revisada(empresa("orig", "Origem Beta")),
    outra: revisada(empresa("outra", "Origem Alfa")),
    semRevisao: empresa("semRevisao", "Sem revisão"),
    soAmbientes: marcarComoRevisado(empresa("soAmbientes", "Só ambientes"), "ambientes", { nome: "RT" }, "2026-10-01T10:00:00.000Z"),
    arquivada: revisada(empresa("arquivada", "Arquivada", { arquivada: true })),
  };
}

test("elegibilidade: exige editar o destino, acesso à origem, origem diferente e Ambientes E Equipamentos revisados", () => {
  const e = cenario();
  assert.deepEqual(origemElegivel(RT, e, "dest", "orig"), { ok: true });
  assert.deepEqual(origemElegivel(RT, e, "dest", "dest"), { ok: false, motivo: "mesma-empresa" });
  assert.deepEqual(origemElegivel(RT, e, "dest", "naoExiste"), { ok: false, motivo: "origem-inexistente" });
  assert.deepEqual(origemElegivel(RT, e, "naoExiste", "orig"), { ok: false, motivo: "destino-inexistente" });
  assert.deepEqual(origemElegivel(RT, e, "dest", "semRevisao"), { ok: false, motivo: "origem-sem-revisao" });
  assert.deepEqual(origemElegivel(RT, e, "dest", "soAmbientes"), { ok: false, motivo: "origem-sem-revisao" }, "uma só página revisada não basta");
  assert.deepEqual(origemElegivel(RT, e, "dest", "arquivada"), { ok: false, motivo: "origem-arquivada" });
  assert.deepEqual(origemElegivel(GESTOR, e, "dest", "orig"), { ok: false, motivo: "sem-permissao-no-destino" }, "sem empresas.editar");
  assert.deepEqual(origemElegivel(SUSPENSO, e, "dest", "orig"), { ok: false, motivo: "sem-permissao-no-destino" });
  assert.deepEqual(origemElegivel(SO_DESTINO, e, "dest", "orig"), { ok: false, motivo: "sem-acesso-a-origem" }, "origem fora do escopo da pessoa");
  assert.equal(destinoEditavel(GESTOR, e, "dest").ok, false);
  assert.equal(destinoEditavel(RT, e, "dest").ok, true);
});

test("elegibilidade: revisão desatualizada (conteúdo mudou depois) recusa; a lista só traz empresas elegíveis, ordenadas por nome", () => {
  const e = cenario();
  assert.deepEqual(origensElegiveis(RT, e, "dest"), [{ id: "outra", nome: "Origem Alfa" }, { id: "orig", nome: "Origem Beta" }]);
  e.orig = { ...e.orig, equipamentosSetores: [...e.orig.equipamentosSetores, eq("orig-9", COZINHA, "Chapa")] };
  assert.deepEqual(origemElegivel(RT, e, "dest", "orig"), { ok: false, motivo: "origem-sem-revisao" }, "alterou depois da revisão");
  assert.deepEqual(origensElegiveis(RT, e, "dest"), [{ id: "outra", nome: "Origem Alfa" }]);
  assert.deepEqual(origensElegiveis(GESTOR, e, "dest"), [], "quem não edita o destino não recebe nem nomes");
  assert.deepEqual(origensElegiveis(SO_DESTINO, e, "dest"), [], "empresas fora do escopo não aparecem");
});

test("sem controle de acesso aplicado (usuário nulo) as regras da empresa continuam valendo", () => {
  const e = cenario();
  assert.equal(origemElegivel(null, e, "dest", "orig").ok, true);
  assert.equal(origemElegivel(null, e, "dest", "semRevisao").ok, false);
  assert.equal(origemElegivel(null, e, "dest", "dest").ok, false);
});

test("a origem só entrega setor, nome e quantidade (nenhum outro campo)", () => {
  const origem = empresa("o", "O", { equipamentosSetores: [{ ...eq("1", COZINHA, "Fogão", 2), observacao: "texto interno", limiteTemperaturaId: "x", sugerido: true }] });
  const saida = equipamentosDaOrigem(origem);
  assert.deepEqual(saida, [{ setor: COZINHA, nome: "Fogão", quantidade: 2 }]);
  assert.deepEqual(Object.keys(saida[0]).sort(), ["nome", "quantidade", "setor"]);
});

test("copiar entra só nos MESMOS setores marcados do destino, sem repetir nome, e o desfazer tira só o criado", () => {
  const destino = [eq("d1", COZINHA, "fogao", 1)];
  const itens = [
    { setor: COZINHA, nome: "Fogão", quantidade: 2 },
    { setor: COZINHA, nome: "Forno", quantidade: 1 },
    { setor: ESTOQUE, nome: "Freezer", quantidade: 4 },
    { setor: "Recebimento", nome: "Balança", quantidade: 1 },
  ];
  let n = 0;
  const r = copiarDeOutraEmpresa(destino, itens, [COZINHA, ESTOQUE, "Recebimento"], [COZINHA, ESTOQUE], () => `c${++n}`);
  assert.equal(r.criados.length, 2, "Forno e Freezer");
  assert.equal(r.jaExistiam, 1, "Fogão já existia (sem acento)");
  assert.deepEqual(r.setoresIgnorados, ["Recebimento"]);
  assert.equal(r.equipamentos.find((i) => i.nome === "Freezer").setor, ESTOQUE);
  assert.equal(r.equipamentos.find((i) => i.id === "d1").quantidade, 1, "o que já existia não muda");
  assert.equal(r.equipamentos.length, 3);
  const vazio = copiarDeOutraEmpresa(destino, itens, [], [COZINHA], () => "x");
  assert.equal(vazio.criados.length, 0);
});

test("a rota do servidor usa a regra pura, a sessão e não devolve dados fora do escopo", () => {
  const rota = ler("../app/api/empresas/equipamentos-origem/route.ts");
  assert.ok(rota.includes("obterAcessoServidor") && rota.includes("origemElegivel") && rota.includes("origensElegiveis") && rota.includes("destinoEditavel") && rota.includes("equipamentosDaOrigem"));
  assert.ok(rota.includes("export async function GET") && rota.includes("export async function POST"));
  assert.ok(!/process\.env\.[A-Z_]*(KEY|SECRET)/.test(rota), "nenhuma chave de serviço");
  assert.ok(rota.includes("Esta empresa não está disponível para cópia."), "origem inexistente e sem acesso respondem igual");
  const copiar = ler("../components/pc/CopiarDeOutraEmpresa.tsx");
  assert.ok(copiar.includes("/api/empresas/equipamentos-origem") && !copiar.includes("db.empresas"), "a lista de empresas vem da rota, não do estado local");
});

// ===== B3: sugestão pelo CNAE =====
test("CNAE formatado: 5611201 vira 5611-2/01; texto fora do padrão não é inventado", () => {
  assert.equal(formatarCnae("5611201"), "5611-2/01");
  assert.equal(formatarCnae("5611-2/01"), "5611-2/01");
  assert.equal(formatarCnae("56112"), "56112");
  assert.equal(formatarCnae(undefined), "");
});

test("sugestão pelo CNAE PRINCIPAL: mostra o CNAE e o nome do tipo (tabela) e os ambientes do pacote do tipo", () => {
  const s = sugestaoPorCnae({ cnae: "5611-2/01", cnaeDescricao: "Restaurantes e similares", cnaesSecundarios: [] });
  assert.equal(s.situacao, "ok");
  assert.equal(s.origem, "principal");
  assert.equal(s.codigo, "5611-2/01");
  assert.equal(s.descricao, "Restaurantes e similares");
  assert.deepEqual(s.ambientes, pacoteDoTipo("restaurante").ambientes);
  assert.equal(tituloDaSugestao(s), "Sugestões para Restaurantes e similares · CNAE 5611-2/01");
  assert.ok(s.equipamentos.length > 0 && s.equipamentos.every((i) => s.ambientes.includes(i.ambiente)), "equipamentos do pacote ficam para a aba Equipamentos");
});

test("sugestão pelo CNAE SECUNDÁRIO: usa o secundário e diz isso; principal sem correspondência não bloqueia", () => {
  const s = sugestaoPorCnae({ cnae: "9999-9/99", cnaeDescricao: "Atividade sem pacote", cnaesSecundarios: [{ codigo: "4722-9/01", descricao: "Comércio varejista de carnes - açougues" }] });
  assert.equal(s.situacao, "ok");
  assert.equal(s.origem, "secundario");
  assert.equal(s.codigo, "4722-9/01");
  assert.equal(s.descricao, "Comércio varejista de carnes - açougues", "descrição do secundário, não a do principal");
  assert.deepEqual(s.ambientes, pacoteDoTipo("acougue").ambientes);
  assert.equal(tituloDaSugestao(s), "Sugestões para Comércio varejista de carnes - açougues · CNAE 4722-9/01 (CNAE secundário)");
  // o principal vale primeiro quando tem correspondência, mesmo havendo secundário que também corresponde
  const p = sugestaoPorCnae({ cnae: "5611203", cnaeDescricao: "Lanchonetes", cnaesSecundarios: [{ codigo: "4722901", descricao: "Açougues" }] });
  assert.equal(p.origem, "principal");
  assert.deepEqual(p.ambientes, pacoteDoTipo("lanchonete").ambientes);
});

test("sem CNAE: pede para preencher no cadastro; CNAE sem pacote: sem sugestão (não inventa)", () => {
  assert.deepEqual(sugestaoPorCnae({ cnae: "", cnaeDescricao: "", cnaesSecundarios: [] }), { situacao: "sem-cnae" });
  assert.deepEqual(sugestaoPorCnae({ cnae: undefined }), { situacao: "sem-cnae" });
  const semPacote = sugestaoPorCnae({ cnae: "9999-9/99", cnaeDescricao: "Outra atividade" });
  assert.equal(semPacote.situacao, "sem-sugestao");
  assert.equal(semPacote.codigo, "9999-9/99");
});

// ===== B2: gravar na hora não deixa a barra "não salva" =====
test("gravar ambientes/equipamentos atualiza a linha de base e deixa o resto do formulário como estava", () => {
  const base = { form: { nome: "A" }, responsabilidades: [], setores: [COZINHA], equipamentos: [], fluxos: [{ id: "f1", setorVinculado: ESTOQUE }], programas: [] };
  const salvo = assinaturaEdicaoEmpresa(base);
  const novosEquip = [eq("a", COZINHA, "Fogão")];
  const nova = assinaturaComEstrutura(salvo, { setores: [COZINHA, ESTOQUE], equipamentos: novosEquip, vinculos: {}, modelos: {} });
  assert.equal(nova, assinaturaEdicaoEmpresa({ ...base, setores: [COZINHA, ESTOQUE], equipamentos: novosEquip }));
  const comFluxos = assinaturaComEstrutura(salvo, { setores: [COZINHA], equipamentos: [], adequarFluxos: (f) => f.map((x) => ({ ...x, setorVinculado: COZINHA })) });
  assert.equal(JSON.parse(comFluxos).fluxos[0].setorVinculado, COZINHA);
  assert.equal(assinaturaComEstrutura("", { setores: [], equipamentos: [] }), "");
  assert.equal(assinaturaComEstrutura("não é json", { setores: [], equipamentos: [] }), "não é json");
});

// ===== Texto e código das telas (leitura do código-fonte) =====
test("Ambientes: textos, botões e salvamento ao marcar, sem botão Salvar", () => {
  const amb = ler("../components/pc/CadastroAmbientes.tsx");
  for (const texto of ["Ambientes da empresa", "as perguntas de cada setor são as padrão do Manual", "+ Ambiente próprio", "Escolher setores", "Escolher outros", "Não marcados nesta empresa:", "✓ Alterações salvas", "Salvando…", "Preencha o CNAE no cadastro para receber sugestões", "Ir para a aba Empresa", "Você ajusta depois em Escolher setores.", "Para esse tipo de empresa, os setores mais comuns são:"]) {
    assert.ok(amb.includes(texto), texto);
  }
  assert.ok(amb.includes("Aceitar {sugestao.ambientes.length}"));
  assert.ok(amb.includes('modo="botao"') && amb.includes("aplicarEscolhaDeSetores"), "o modal existente e a mesma função de aplicar");
  assert.ok(amb.includes("podeEditar &&"), "só quem edita vê os botões");
  assert.ok(!amb.includes(">Salvar<"), "sem botão Salvar");
  assert.ok(amb.includes("perguntasDoAmbiente"), "a contagem de perguntas é a real, do modelo do setor");
  const css = ler("../app/cadastro-estrutura.css");
  assert.match(css, /\.cadest-faixa\{[^}]*background:#FFF6E5/);
  assert.match(css, /\.cadest-setor\.is-sel\{[^}]*border-color:#21A3A3;background:#FFF6E5/);
  assert.match(css, /\.cadest-btn--azul[^{]*\{[^}]*background:#2A4D7C[^}]*color:#fff/);
  assert.match(css, /\.cen-barras \.cen-barra--sub \.cen-bloco\.is-ativa\{[^}]*border-bottom-color:#21A3A3/);
  assert.ok(!/#[0-9A-Fa-f]{6}/.test(css.replace(/#(263445|526477|7F8BA3|D8DDE8|2A4D7C|C83F45|FFF6E5|21A3A3|21805B|fff|F6F7FA|E8EBF2|1D3557|1B6B4B|BFDDF7|FBE4E2|EEF1F7|E0A800)/gi, "")), "só as cores do desenho");
  assert.ok(!/purple|violet|#7c3aed|#8b5cf6/i.test(css), "nunca roxo");
});

test("Equipamentos: painel, nome repetido na hora, menu ⋯, mover e desfazer", () => {
  const equip = ler("../components/pc/CadastroEquipamentos.tsx");
  for (const texto of ["Adicionar em ", "Copiar de outra empresa", "Nenhum equipamento neste setor ainda.", "Cadastrar como outro item", "Editar nome e quantidade", "Mover para outro setor ›", "Remover", "+ Digitar outro equipamento", "Marcar todos", "Sugestão genérica — a RT confirma.", "Copiado: ", "Desfazer", "aria-live=\"polite\"", "aria-describedby=\"cadest-eq-repetido\""]) {
    assert.ok(equip.includes(texto), texto);
  }
  assert.ok(equip.includes("Somar {quantidadeValida(qtd)} ao existente"));
  assert.ok(equip.includes("disabled={!podeAdicionar}"), "Adicionar desabilitado enquanto o nome repete sem escolha");
  assert.ok(equip.includes('role="menu"') && equip.includes('role="menuitem"') && equip.includes("ArrowDown") && equip.includes("Escape") && equip.includes("botoesMenu.current"), "teclado e foco devolvido ao ⋯");
  assert.ok(equip.includes("Mover {item.nome} para"));
  assert.ok(!/vincular a qual setor/i.test(equip), "o setor vem do setor selecionado");
  assert.ok(!equip.includes("window.confirm") && !equip.includes("confirmar("), "remover não pede confirmação em janela");
  const toast = ler("../lib/toast.ts");
  assert.ok(toast.includes("acao?: { rotulo: string; aoClicar: () => void }"));
  const host = ler("../components/ToastHost.tsx");
  assert.ok(host.includes("toast.acao.rotulo"));
});

test("página: grava na hora, bloqueio de revisão com alteração não salva, Central da visita leva a Equipamentos", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("function gravarEstrutura(") && pagina.includes('permitido("empresas.editar", id)') && pagina.includes("assinaturaComEstrutura("));
  assert.ok(pagina.includes("<CadastroAmbientes") && pagina.includes("<CadastroEquipamentos") && pagina.includes("<RevisaoCompacta"));
  assert.ok(pagina.includes("naoSalvo={empresaTemAlteracoes}"), "mantém o bloqueio de marcar como revisado com alteração não salva");
  assert.ok(pagina.includes('abrirSecaoEmpresaPeloMenu("equipamentos")'));
  const revisao = ler("../components/pc/RevisaoCompacta.tsx");
  assert.ok(revisao.includes("ainda não revisados") && revisao.includes("Marcar como revisado") && revisao.includes("Revisado"));
  const nav = ler("../components/pc/CentralEmpresaNav.tsx");
  assert.ok(nav.includes("direita") && nav.includes("cadastro-estrutura.css"));
});

test("Ambientes: setor oficial sugerido (com fonte) e vínculo de questionário em lote continuam na aba nova, usando as mesmas regras", () => {
  const fonte = readFileSync(new URL("../components/pc/CadastroAmbientes.tsx", import.meta.url), "utf8");
  // Rodada 7A: a linha da Portaria saiu da lista; a sugestão vira "Parece o setor oficial X · Vincular" e a base legal vai para o menu ⋯.
  assert.ok(fonte.includes("sugerirSetorOficial") && fonte.includes("Parece o setor oficial {nomeExibidoDoSetor(parecido)}") && fonte.includes("baseDoSetorOficial") && fonte.includes("rodape={base?.texto}"));
  assert.ok(ler("../lib/setorOficialSugerido.ts").includes("conferido em"), "a data de conferência continua a mesma fonte");
  assert.ok(fonte.includes("vincularQuestionarioEmLote") && fonte.includes("ambientesSemQuestionario") && fonte.includes("Vincular a um setor oficial"));
  assert.ok(fonte.includes("oficialParecido(novoNome.trim())"), "a sugestão aparece já ao digitar o nome em + Ambiente próprio");
});

// ===== Revisão: Desfazer em delta, formulário aberto preservado, bloqueio de vários setores e rota =====
import {
  aplicarDeltaDeEquipamentos,
  aplicarDeltaDeFluxos,
  aplicarDeltaDeLista,
  aplicarDeltaDeMapa,
  bloqueiosDaRetirada,
  desfazerSoma,
  fluxosLigadosAoSetor,
  reinserirEquipamentoNaPosicao,
  reinserirSetor,
  restaurarFluxos,
} from "../lib/estruturaDelta.ts";
import { confirmarItensFalados } from "../lib/equipamentosCadastro.ts";

test("Desfazer de remover equipamento é um delta: devolve só o item (na posição) e não apaga o que mudou depois", () => {
  const a = eq("a", COZINHA, "Fogão", 2);
  const b = eq("b", COZINHA, "Coifa", 1);
  const c = eq("c", ESTOQUE, "Freezer", 1);
  const antes = [a, b, c];
  const depoisDeRemover = antes.filter((i) => i.id !== "b");
  // Depois do aviso, o RT adicionou outro item e mudou a quantidade do Fogão: o Desfazer não pode voltar ao retrato antigo.
  const agora = [...depoisDeRemover.map((i) => (i.id === "a" ? { ...i, quantidade: 5 } : i)), eq("d", ESTOQUE, "Balança", 1)];
  const resultado = reinserirEquipamentoNaPosicao(agora, b, 1, [COZINHA, ESTOQUE]);
  assert.deepEqual(resultado.map((i) => i.id), ["a", "b", "c", "d"]);
  assert.equal(resultado.find((i) => i.id === "a").quantidade, 5, "a quantidade mexida depois continua");
  assert.equal(resultado.find((i) => i.id === "d").nome, "Balança", "o item novo continua");
  assert.equal(reinserirEquipamentoNaPosicao(resultado, b, 1, [COZINHA, ESTOQUE]), resultado, "não repete o mesmo id");
  assert.equal(reinserirEquipamentoNaPosicao(agora, b, 1, [ESTOQUE]), null, "se o setor já não está marcado, não devolve (o aviso diz isso)");
});

test("Desfazer de somar tira só o que foi somado; item que sumiu não vira outro", () => {
  const lista = [eq("a", COZINHA, "Fogão", 5)];
  assert.equal(desfazerSoma(lista, "a", 2)[0].quantidade, 3);
  assert.equal(desfazerSoma(lista, "a", 99)[0].quantidade, 1, "nunca abaixo de 1");
  assert.equal(desfazerSoma([], "a", 2).length, 0);
});

test("Desfazer de remover ambiente próprio devolve setor, vínculo, questionário e fluxos ligados", () => {
  const fluxos = [{ id: "f1", setorVinculado: "Churrasqueira" }, { id: "f2", setorVinculado: COZINHA }];
  const ligados = fluxosLigadosAoSetor(fluxos, "Churrasqueira");
  assert.deepEqual(ligados, [{ id: "f1", setorVinculado: "Churrasqueira" }]);
  const semFluxo = fluxos.map((f) => (f.id === "f1" ? { ...f, setorVinculado: "" } : f));
  assert.equal(restaurarFluxos(semFluxo, ligados).find((f) => f.id === "f1").setorVinculado, "Churrasqueira");
  assert.equal(restaurarFluxos(semFluxo, ligados).find((f) => f.id === "f2").setorVinculado, COZINHA);
  assert.deepEqual(reinserirSetor([COZINHA, ESTOQUE], "Churrasqueira", 1), [COZINHA, "Churrasqueira", ESTOQUE]);
  assert.deepEqual(reinserirSetor([COZINHA, "Churrasqueira"], "Churrasqueira", 0), [COZINHA, "Churrasqueira"]);
});

test("Escolher setores com DOIS setores que têm equipamento: os dois ficam protegidos, cada um com o seu bloqueio", () => {
  const itens = [eq("1", COZINHA, "Fogão", 1), eq("2", ESTOQUE, "Freezer", 1), eq("3", ESTOQUE, "Balança", 1)];
  const bloqueios = bloqueiosDaRetirada([COZINHA, ESTOQUE], itens);
  assert.deepEqual(bloqueios.map((b) => b.ambiente), [COZINHA, ESTOQUE]);
  assert.ok(bloqueios[1].mensagem.includes("2 equipamentos"));
  assert.deepEqual(bloqueiosDaRetirada(["Sem equipamento"], itens), []);
});

test("a gravação entra POR CIMA do formulário aberto: alteração não salva de Dados (pacote do tipo) não se perde", () => {
  const salvoAntes = [COZINHA];
  const salvoDepois = [COZINHA, "Churrasqueira"];
  const formulario = [COZINHA, ESTOQUE]; // o RT aplicou o pacote em Dados e ainda não salvou
  assert.deepEqual(aplicarDeltaDeLista(formulario, salvoAntes, salvoDepois), [COZINHA, ESTOQUE, "Churrasqueira"]);
  assert.deepEqual(aplicarDeltaDeLista(formulario, [COZINHA, ESTOQUE], [COZINHA]), [COZINHA], "o que saiu na gravação sai do formulário também");
  const eqSalvo = [eq("a", COZINHA, "Fogão", 1)];
  const eqNovo = [eq("a", COZINHA, "Fogão", 3), eq("n", COZINHA, "Coifa", 1)];
  const eqForm = [eq("a", COZINHA, "Fogão", 1), eq("p", ESTOQUE, "Do pacote", 1)];
  const mesclado = aplicarDeltaDeEquipamentos(eqForm, eqSalvo, eqNovo);
  assert.deepEqual(mesclado.map((i) => i.id).sort(), ["a", "n", "p"]);
  assert.equal(mesclado.find((i) => i.id === "a").quantidade, 3);
  assert.deepEqual(aplicarDeltaDeMapa({ x: "1", y: "2" }, { x: "1" }, { x: "1", z: "3" }), { x: "1", y: "2", z: "3" });
  assert.deepEqual(aplicarDeltaDeMapa({ x: "1", y: "2" }, { x: "1" }, {}), { y: "2" });
  const fluxosForm = [{ id: "f1", setorVinculado: "A", descricao: "editado e não salvo" }];
  const f = aplicarDeltaDeFluxos(fluxosForm, [{ id: "f1", setorVinculado: "A" }], [{ id: "f1", setorVinculado: "" }]);
  assert.equal(f[0].setorVinculado, "");
  assert.equal(f[0].descricao, "editado e não salvo", "só o setor vinculado muda");
});

test("voz: itens confirmados passam pela checagem de nome repetido (somam) e levam o limite sugerido; o delta desfaz", () => {
  const existentes = [eq("a", COZINHA, "Refrigerador", 2)];
  const r = confirmarItensFalados(existentes, [
    { id: "v1", setor: COZINHA, nome: "refrigerador", quantidade: 1 },
    { id: "v2", setor: COZINHA, nome: "Fritadeira", quantidade: 1, limiteTemperaturaId: "quente" },
  ]);
  assert.equal(r.equipamentos.filter((i) => i.setor === COZINHA && i.nome.toLowerCase() === "refrigerador").length, 1, "sem duplicar");
  assert.equal(r.equipamentos.find((i) => i.id === "a").quantidade, 3);
  assert.deepEqual(r.criados, ["v2"]);
  assert.deepEqual(r.somados, [{ id: "a", quantidade: 1 }]);
  assert.equal(r.equipamentos.find((i) => i.id === "v2").limiteTemperaturaId, "quente");
});

test("elegibilidade: quem não pode (destino ou origem) recebe sempre o mesmo motivo de acesso, antes de 'mesma empresa'", () => {
  const e = cenario();
  // Mesmo id como destino e origem por quem NÃO edita o destino: não revela "mesma empresa", cai na permissão.
  assert.deepEqual(origemElegivel(GESTOR, e, "dest", "dest"), { ok: false, motivo: "sem-permissao-no-destino" });
  // Ids que existem no protótipo de objeto não contam como empresa.
  assert.deepEqual(origemElegivel(RT, e, "dest", "constructor"), { ok: false, motivo: "origem-inexistente" });
  assert.deepEqual(origemElegivel(RT, e, "__proto__", "orig"), { ok: false, motivo: "destino-inexistente" });
  assert.deepEqual(origemElegivel(RT, e, "dest", "dest"), { ok: false, motivo: "mesma-empresa" });
  // Origem sem acesso: o motivo vem antes de arquivada/sem revisão, então não vaza o estado dela.
  assert.deepEqual(origemElegivel(SO_DESTINO, e, "dest", "arquivada"), { ok: false, motivo: "sem-acesso-a-origem" });
});

test("rota de cópia: mesma resposta 403 para falhas de acesso, Object.hasOwn, corpo de 1 KB, 415 sem JSON e no-store", () => {
  const rota = ler("../app/api/empresas/equipamentos-origem/route.ts");
  assert.ok(rota.includes('motivo === "destino-inexistente" || motivo === "sem-permissao-no-destino" || motivo === "origem-inexistente" || motivo === "sem-acesso-a-origem"'));
  assert.ok(rota.includes("MENSAGEM_UNICA") && rota.includes("403"));
  assert.ok(rota.includes("corpoExcedeLimite") && rota.includes("TAMANHO_MAXIMO_DO_CORPO = 1024") && rota.includes("413") && rota.includes("415"));
  assert.ok(rota.includes('"Cache-Control": "no-store"') && !rota.includes("NextResponse.json({ error"));
  const lib = ler("../lib/copiaEquipamentos.ts");
  assert.ok(lib.includes("Object.hasOwn(empresas, destinoId)") && lib.includes("Object.hasOwn(empresas, origemId)"));
});

test("revisão de Equipamentos muda quando o limite de temperatura muda (e não muda para quem nunca teve limite)", async () => {
  const { assinaturaDaPagina } = await import("../lib/revisaoDeCadastros.ts");
  const base = { setoresManual: [COZINHA], equipamentosSetores: [eq("a", COZINHA, "Refrigerador", 1)] };
  const comLimite = { ...base, equipamentosSetores: [{ ...base.equipamentosSetores[0], limiteTemperaturaId: "refrigerado" }] };
  assert.notEqual(assinaturaDaPagina(base, "equipamentos"), assinaturaDaPagina(comLimite, "equipamentos"));
  assert.equal(assinaturaDaPagina(base, "equipamentos"), assinaturaDaPagina({ ...base }, "equipamentos"));
});
