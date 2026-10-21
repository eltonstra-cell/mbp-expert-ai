import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { alterarPopVinculado, marcarSubstituidoNaRenovacao, tipoDeOutroPop } from "../lib/comprovantePop.ts";
import { comprovantesVigentes, contarPorValidade } from "../lib/registrosEmpresa.ts";
import { mesclarEstadoPorUsuario } from "../lib/stateAccess.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");
const agora = "2026-10-21T10:00:00.000Z";

test("tarja: tipo que pertence a outro POP (reservatório preso ao POP-01) avisa; tipo certo ou sem POP próprio não", () => {
  const aviso = tipoDeOutroPop("reservatorio", { catalogoId: "higienizacao-instalacoes" });
  assert.ok(aviso && aviso.texto.startsWith("Este tipo costuma pertencer ao POP de "));
  assert.equal(aviso.catalogoId, "higienizacao-reservatorio");
  assert.equal(tipoDeOutroPop("reservatorio", { catalogoId: "higienizacao-reservatorio" }), null);
  assert.equal(tipoDeOutroPop("pragas", { catalogoId: "higienizacao-instalacoes" })?.catalogoId, "controle-de-pragas");
  assert.equal(tipoDeOutroPop("contrato-rt", { catalogoId: "higienizacao-instalacoes" }), null);
  assert.equal(tipoDeOutroPop("outro", { catalogoId: "x" }), null);
  assert.equal(tipoDeOutroPop("reservatorio", undefined), null, "comprovante sem POP não tem tarja");
});

test("renovar pelo botão: o novo grava renovaDe, o anterior ganha substituidoPor (seja qual for o POP) e sai das contagens; nada é apagado", () => {
  const velho = { id: "c1", tipo: "pragas", popId: "p1", validade: "2026-10-01" };
  const outro = { id: "c9", tipo: "reservatorio", popId: "p2", validade: "2026-10-01" };
  const novo = { id: "c2", tipo: "pragas", popId: "p7", validade: "2027-10-01", renovaId: "c1", renovaDe: "c1" };
  const lista = [velho, outro, novo];
  const marcada = marcarSubstituidoNaRenovacao(lista, novo);
  assert.equal(marcada.length, 3, "nada some");
  assert.equal(marcada.find((item) => item.id === "c1").substituidoPor, "c2", "mesmo com POP diferente do novo");
  assert.equal(marcada.find((item) => item.id === "c9").substituidoPor, undefined);
  assert.equal(velho.substituidoPor, undefined, "o original não muda");
  // contagens: o substituído (vencido) não conta, nem pelo campo novo
  const vigentes = comprovantesVigentes(marcada);
  assert.deepEqual(vigentes.map((item) => item.id).sort(), ["c2", "c9"]);
  assert.equal(contarPorValidade(vigentes, "2026-10-21").vencidos, 1, "só o do reservatório, que segue vencido");
  const semRenovaId = comprovantesVigentes([{ ...velho, substituidoPor: "c2" }, { id: "c2", tipo: "pragas", validade: "2027-10-01" }]);
  assert.deepEqual(semRenovaId.map((item) => item.id), ["c2"], "vale o substituidoPor sozinho");
  // anexo criado fora do Renovar não marca nada; antigo sem os campos continua como estava
  assert.equal(marcarSubstituidoNaRenovacao(lista, { id: "c3", tipo: "pragas", popId: "p1" }), lista, "sem renovaDe nada acontece");
  assert.equal(marcarSubstituidoNaRenovacao(lista, { id: "c3", renovaDe: "nao-existe" }), lista);
  assert.equal(marcarSubstituidoNaRenovacao(marcada, novo), marcada, "já marcado: sem mudança");
  const tela = ler("../components/pc/PcComprovantes.tsx");
  assert.ok(tela.includes('"Substituído"') && tela.includes("substituidos") && tela.includes("comp-selo-pop") && tela.includes("Sem POP vinculado"));
  assert.ok(ler("../app/page.tsx").includes("comprovante.renovaDe ? marcarSubstituidoNaRenovacao"));
});

const usuario = (id, perfil, empresaIds = ["e1"]) => ({ id, nome: id, email: `${id}@example.com`, perfil, status: "Ativo", empresaIds, authId: `auth-${id}`, criadoEm: agora, atualizadoEm: agora });
function estadoComComprovante() {
  const comprovante = { id: "c1", empresaId: "e1", tipo: "reservatorio", popId: "p1", emissor: "X", dataServico: "2026-10-01", validade: "2027-04-01", observacao: "", criadoEm: agora };
  return {
    empresas: {
      e1: { id: "e1", nomeFantasia: "E1", pops: [{ id: "p1", codigo: "POP-01" }, { id: "p3", codigo: "POP-03" }] },
      e2: { id: "e2", nomeFantasia: "E2", pops: [{ id: "p9", codigo: "POP-09" }] },
    },
    empresaAtualId: "e1", usuarios: [], visitas: [], ncs: [], evidencias: [], registrosAuditoria: [], comprovantes: [comprovante],
  };
}

test("mover comprovante para outro POP: com histórico, sem apagar; só quem gerencia comprovantes; POP de outra empresa é recusado", () => {
  const original = estadoComComprovante().comprovantes[0];
  const movido = alterarPopVinculado(original, "p3", [{ id: "p1" }, { id: "p3" }], { id: "rt", nome: "RT" }, agora);
  assert.equal(movido.popId, "p3");
  assert.equal(movido.historicoDePop.length, 1);
  assert.equal(movido.historicoDePop[0].de, "p1");
  assert.equal(movido.historicoDePop[0].para, "p3");
  assert.equal(alterarPopVinculado(original, "p9", [{ id: "p1" }, { id: "p3" }], {}, agora), original, "POP de outra empresa não existe aqui");

  // servidor: o RT consegue
  const rt = usuario("rt", "Consultor/RT");
  const atual = { ...estadoComComprovante(), usuarios: [rt] };
  const comoRt = mesclarEstadoPorUsuario(atual, { ...atual, comprovantes: [movido] }, rt, "auth-rt", agora);
  assert.equal(comoRt.comprovantes.find((item) => item.id === "c1").popId, "p3");
  assert.equal(comoRt.comprovantes.find((item) => item.id === "c1").historicoDePop.length, 1);
  // servidor: POP de outra empresa vira "sem POP", nunca vincula fora da empresa
  const fora = mesclarEstadoPorUsuario(atual, { ...atual, comprovantes: [{ ...original, popId: "p9" }] }, rt, "auth-rt", agora);
  assert.equal(fora.comprovantes.find((item) => item.id === "c1").popId, undefined);
  // servidor: quem não gerencia comprovantes não consegue mover
  for (const perfil of ["Executor de campo", "Fiscal"]) {
    const pessoa = usuario("x", perfil);
    const base = { ...estadoComComprovante(), usuarios: [pessoa] };
    const tentativa = mesclarEstadoPorUsuario(base, { ...base, comprovantes: [movido] }, pessoa, "auth-x", agora);
    assert.equal(tentativa.comprovantes.find((item) => item.id === "c1").popId, "p1", perfil);
  }
  // a ficha passa a lista de POPs e a função de mover, e o menu mostra a opção
  const ficha = ler("../components/pc/PcFichaPop.tsx");
  assert.ok(ficha.includes("onAlterarPop={contexto.podeGerenciarComprovantes ? contexto.alterarPopDoComprovante : undefined}") && ficha.includes("pops={popsDaEmpresa}"));
  const tela = ler("../components/pc/PcComprovantes.tsx");
  assert.ok(tela.includes('"Mover para outro POP"') && tela.includes("O comprovante sai desta ficha e vai para o") && tela.includes("O histórico fica registrado."));
});

test("Central e lista de POPs: sem 'Voltar às empresas', sem frase repetida e sem botão de criar quando falta norma", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(!pagina.includes("Voltar às empresas"));
  assert.ok(pagina.includes("{!editingEmpresaId && (\n            <div className=\"ui-head cen-cabeca\">") || pagina.includes("{!editingEmpresaId && (\r\n            <div className=\"ui-head cen-cabeca\">"));
  const lista = ler("../components/pc/PcPopsLista.tsx");
  assert.ok(lista.includes("podeEditar && conjunto.length > 0 &&") && lista.includes("Ir para Norma aplicável") && lista.includes("{avisoSemVinculo}"));
  assert.ok(!ler("../components/pc/PcPops.tsx").includes("motivoSemCriar={definicoes.length === 0"));
  assert.ok(pagina.includes("Vincular em Dados") && !pagina.includes('<span className="pgl-resp-aviso">'));
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".central-empresa,.cen-conteudo,.pgl,.comp,.pess{gap:16px}") && css.includes(".comp-form.is-aberto{max-height:none;overflow:visible}"));
});

test("Resumo da ficha: botões na linha do título de cada bloco e textos escuros", () => {
  const ficha = ler("../components/pc/PcFichaPop.tsx");
  assert.ok(ficha.includes("ficha-sub-linha") && !ficha.includes("ficha-rodape-resumo"));
  assert.match(ler("../app/globals.css"), /\.ficha-lista,\.ficha-vazio\{font-size:1rem;color:#12202B\}/);
});

import { conferenciaDoRelatorio, destinoDoPreencherCrn } from "../lib/reportCheck.ts";

test("'Preencher CRN': Administrador vai a Acessos, o próprio RT a Meu perfil, os demais não têm botão", () => {
  assert.equal(destinoDoPreencherCrn({ perfil: "Administrador", podeGerenciarAcessos: true }), "acessos");
  assert.equal(destinoDoPreencherCrn({ perfil: "Consultor/RT", podeGerenciarAcessos: false }), "perfil");
  assert.equal(destinoDoPreencherCrn({ perfil: "Cliente Gestor", podeGerenciarAcessos: false }), null);
  assert.equal(destinoDoPreencherCrn({ perfil: "Gerente", podeGerenciarAcessos: false }), null);
  const base = { respondidos: 1, totalChecklist: 1, ncsAbertas: 0, ncsSemResponsavelOuPrazo: 0, evidencias: 1, popsPendentes: 0, popsSugeridos: 0, cadastroPreenchidos: 1, cadastroTotal: 0 };
  const linhas = (destinoDoCrn) => conferenciaDoRelatorio({ ...base, assinatura: { nome: "Ana", cargo: "RT", crn: "", destinoDoCrn } });
  assert.equal(linhas("perfil").find((linha) => linha.chave === "assinatura").acao, "Preencher CRN");
  assert.equal(linhas("acessos").find((linha) => linha.chave === "assinatura").acao, "Preencher CRN");
  assert.equal(linhas(null).find((linha) => linha.chave === "assinatura").acao, null);
  assert.equal(linhas(null).find((linha) => linha.chave === "assinatura").semAcao, "Peça ao Administrador");
  assert.equal(linhas("perfil").find((linha) => linha.chave === "empresa").acao, "Abrir cadastro", "Abrir cadastro fica só no item Cadastro da empresa");
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('if (destinoDoCrn === "perfil") setPerfilAberto(true)'));
});

import { nomeDeExibicaoDaEmpresa, nomeEmFormatoNatural } from "../lib/nomeEmpresa.ts";
import { razaoSocialDiferente } from "../lib/nomeCargo.ts";

test("nome de exibição da empresa: uma função só, sem alterar o dado salvo", () => {
  const salvas = [
    { nomeFantasia: "44.150.273 ELTON VOLMIR STRAPAZON", razaoSocial: "ELTON VOLMIR STRAPAZON" },
    { nomeFantasia: "BEYOND NUTRI", razaoSocial: "BEYOND NUTRI LTDA" },
    { nomeFantasia: "CHURRASCARIA DO CHICO", razaoSocial: "CHICO ALIMENTOS ME" },
  ];
  const copia = JSON.stringify(salvas);
  assert.deepEqual(salvas.map(nomeDeExibicaoDaEmpresa), ["Elton Volmir Strapazon", "Beyond Nutri", "Churrascaria do Chico"]);
  assert.equal(JSON.stringify(salvas), copia, "o dado salvo não muda");
  assert.equal(nomeDeExibicaoDaEmpresa({ nomeFantasia: "44.150.273", razaoSocial: "MELLO SERVICOS LTDA" }), "Mello Servicos Ltda", "fantasia que é só número cai para a razão social");
  assert.equal(nomeDeExibicaoDaEmpresa(null), "Empresa");
  assert.equal(nomeEmFormatoNatural("Padaria do Zé"), "Padaria do Zé", "nome que já está em formato natural não muda");
  // o seletor "Empresa ativa" e as listas usam a mesma função
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("empresaAtiva={atual ? nomeDeExibicaoDaEmpresa(atual) : null}") && pagina.includes("nomeDeExibicaoDaEmpresa(empresa)"));
  for (const arquivo of ["../components/pc/PcAcessos.tsx", "../components/AccessPreparationPanel.tsx", "../components/pc/TelasLiberadasModal.tsx"]) {
    assert.ok(ler(arquivo).includes("nomeDeExibicaoDaEmpresa"), arquivo);
  }
});

test("Empresas: razão social só quando difere do nome exibido", () => {
  assert.equal(razaoSocialDiferente("Elton Volmir Strapazon", "ELTON VOLMIR STRAPAZON"), "");
  assert.equal(razaoSocialDiferente("Elton Volmir Strapazon", "44.150.273 ELTON VOLMIR STRAPAZON"), "");
  assert.equal(razaoSocialDiferente("Beyond Nutri", "BEYOND NUTRI LTDA"), "Beyond Nutri Ltda");
  assert.equal(razaoSocialDiferente("Mello", ""), "");
});

import { rotuloDoChipDePendencias } from "../lib/companyReadiness.ts";

test("cartão de Empresas: chip âmbar 'N pendências ▸' com a lista completa numa janelinha; uma só mostra o nome", () => {
  assert.equal(rotuloDoChipDePendencias([]), "");
  assert.equal(rotuloDoChipDePendencias(["horário de funcionamento"]), "Falta: horário de funcionamento");
  assert.equal(rotuloDoChipDePendencias(["horário de funcionamento", "equipamentos", "programas"]), "3 pendências ▸");
  const chip = ler("../components/pc/PendenciasChip.tsx");
  assert.ok(chip.includes("faltas.map((falta)") && chip.includes("onMouseEnter") && chip.includes("onClick") && chip.includes('role="dialog"'));
  assert.ok(ler("../components/pc/PcEmpresas.tsx").includes("<PendenciasChip faltas={empresa.faltas} />"));
  assert.match(ler("../app/globals.css"), /\.pend-chip\{display:inline-flex;align-items:center;height:28px/);
});
