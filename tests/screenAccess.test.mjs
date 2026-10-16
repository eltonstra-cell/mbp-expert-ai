import assert from "node:assert/strict";
import test from "node:test";
import { PADRAO_DO_PERFIL, ajustesDiferentes, diferencasDeTelas, nivelDaTela, permissoesEfetivas, podeVerTela, telaDaVisao, telasDiferentesDoPadrao, telasEfetivas } from "../lib/screenAccess.ts";
import { podeExecutar, possuiPermissao } from "../lib/permissions.ts";
import { filtrarEstadoPorUsuario, mesclarEstadoPorUsuario } from "../lib/stateAccess.ts";
import { itensVisiveis } from "../lib/navigation.ts";

// Ações que cada perfil antigo tinha ANTES das telas liberadas (contrato que não pode mudar).
const LEGADO = {
  Administrador: ["usuarios.gerenciar", "empresas.ver", "empresas.editar", "visitas.criar", "visitas.executar", "visitas.concluir", "relatorios.aprovar", "relatorios.exportar", "ncs.acompanhar", "evidencias.adicionar", "ia.analisar", "auditoria.ver"],
  "Consultor/RT": ["empresas.ver", "empresas.editar", "visitas.criar", "visitas.executar", "visitas.concluir", "relatorios.aprovar", "relatorios.exportar", "ncs.acompanhar", "evidencias.adicionar", "ia.analisar", "auditoria.ver"],
  "Cliente Gestor": ["empresas.ver", "relatorios.exportar", "ncs.acompanhar"],
};
const ordenar = (lista) => [...lista].sort();
const semNova = (lista) => lista.filter((acao) => acao !== "ncs.marcar_feita");

test("perfis antigos: o padrão reproduz exatamente as ações de antes", () => {
  for (const perfil of Object.keys(LEGADO)) {
    assert.deepEqual(ordenar(semNova(permissoesEfetivas({ perfil }))), ordenar(LEGADO[perfil]), perfil);
  }
});

test("Gerente: padrão do desenho (ver, evidências em editar, correções em marcar, manual bloqueado)", () => {
  const padrao = PADRAO_DO_PERFIL.Gerente;
  assert.equal(padrao.inicio, "completo");
  assert.equal(padrao.checklist, "ver");
  assert.equal(padrao.evidencias, "editar");
  assert.equal(padrao.correcoes, "marcar");
  assert.equal(padrao.guiaRapido, "ver");
  assert.equal(padrao.manualCompleto, "oculta");
  assert.equal(padrao.empresas, "oculta");
  assert.equal(padrao.ambientes, "oculta");
  assert.deepEqual(ordenar(permissoesEfetivas({ perfil: "Gerente" })), ordenar(["empresas.ver", "evidencias.adicionar", "ncs.marcar_feita", "relatorios.exportar"]));
});

test("ajustes por pessoa: merge com o padrão, nível inválido ignorado, Acessos só do Administrador", () => {
  const gerente = { perfil: "Gerente", status: "Ativo", empresaIds: ["e1"], telas: { checklist: "editar", correcoes: "concluir", manualCompleto: "ver", acessos: "ver", relatorio: "marcar" } };
  const efetivas = telasEfetivas(gerente);
  assert.equal(efetivas.checklist, "editar");
  assert.equal(efetivas.manualCompleto, "ver");
  assert.equal(efetivas.acessos, "oculta", "Acessos nunca é liberado para outro perfil");
  assert.equal(efetivas.relatorio, "ver", "nível que a tela não tem é ignorado");
  const acoes = permissoesEfetivas(gerente);
  assert.equal(acoes.includes("visitas.executar"), true);
  assert.equal(acoes.includes("ncs.acompanhar"), true);
  assert.equal(acoes.includes("usuarios.gerenciar"), false);
  assert.equal(acoes.includes("empresas.editar"), false);
  assert.deepEqual(telasDiferentesDoPadrao(gerente).sort(), ["checklist", "correcoes", "manualCompleto"]);
});

test("recusa por perfil e nível (mesma regra do servidor)", () => {
  const gerente = { id: "g", perfil: "Gerente", status: "Ativo", empresaIds: ["e1"] };
  assert.equal(possuiPermissao(gerente, "evidencias.adicionar"), true);
  assert.equal(possuiPermissao(gerente, "visitas.executar"), false);
  assert.equal(possuiPermissao(gerente, "ncs.acompanhar"), false);
  assert.equal(possuiPermissao(gerente, "ncs.marcar_feita"), true);
  assert.equal(possuiPermissao({ ...gerente, telas: { checklist: "editar" } }, "visitas.executar"), true);
  assert.equal(possuiPermissao({ ...gerente, telas: { evidencias: "ver" } }, "evidencias.adicionar"), false);
  assert.equal(possuiPermissao({ ...gerente, status: "Suspenso" }, "evidencias.adicionar"), false);
  assert.equal(podeExecutar(gerente, "evidencias.adicionar", "e2"), false, "escopo por empresa preservado");
  assert.equal(podeVerTela(gerente, "manualCompleto"), false);
  assert.equal(nivelDaTela(gerente, "pops"), "ver");
});

test("menu segue as telas liberadas (Registrar só com Evidências em Editar)", () => {
  const ctx = (usuario) => ({ dentroDeVisita: true, pode: (acao) => possuiPermissao(usuario, acao), nivelTela: (tela) => nivelDaTela(usuario, tela) });
  const gerente = { perfil: "Gerente", status: "Ativo", empresaIds: ["e1"] };
  const chaves = (usuario) => itensVisiveis(ctx(usuario)).map((item) => item.key);
  const doGerente = chaves(gerente);
  assert.equal(doGerente.includes("registrar"), true);
  assert.equal(doGerente.includes("checklist"), true, "checklist só para ver aparece");
  assert.equal(doGerente.includes("empresas"), false);
  assert.equal(doGerente.includes("ambientes"), false);
  assert.equal(doGerente.includes("acessos"), false);
  assert.equal(doGerente.includes("ajuda"), true);
  assert.equal(chaves({ ...gerente, telas: { evidencias: "ver" } }).includes("registrar"), false);
  assert.equal(chaves({ ...gerente, telas: { guiaRapido: "oculta", manualCompleto: "oculta" } }).includes("ajuda"), false);
  assert.equal(chaves({ perfil: "Administrador", status: "Ativo", empresaIds: [] }).includes("acessos"), true);
  assert.equal(chaves({ perfil: "Cliente Gestor", status: "Ativo", empresaIds: ["e1"] }).includes("checklist"), false);
});

function estadoDoServidor() {
  const agora = "2026-10-16T10:00:00.000Z";
  const u = (id, perfil, extra = {}) => ({ id, nome: id, email: `${id}@x.com`, perfil, status: "Ativo", empresaIds: ["e1"], criadoEm: agora, atualizadoEm: agora, ...extra });
  return {
    agora,
    estado: {
      empresas: { e1: { id: "e1", nomeFantasia: "Permitida" } },
      empresaAtualId: "e1",
      visitas: [{ id: "v1", empresaId: "e1", status: "Em andamento" }],
      ncs: [
        { id: "n1", empresaId: "e1", visitaId: "v1", status: "Aberta", titulo: "NC", acaoCorretiva: "Original" },
        { id: "n2", empresaId: "e1", visitaId: "v1", status: "Resolvida", titulo: "NC 2" },
      ],
      evidencias: [],
      usuarios: [u("adm", "Administrador", { empresaIds: [] }), u("ger", "Gerente")],
      registrosAuditoria: [],
      configuracaoAcesso: { versao: 1, modo: "Ativo", autenticacao: "Configurada", atualizadoEm: agora },
    },
  };
}

test("servidor: Gerente só marca como feita; não altera plano, status nem NC resolvida", () => {
  const { estado, agora } = estadoDoServidor();
  const gerente = estado.usuarios[1];
  const recebido = filtrarEstadoPorUsuario(estado, gerente);
  recebido.ncs = recebido.ncs.map((nc) => ({ ...nc, acaoCorretiva: "Trocada", status: "Resolvida", marcadaFeita: { em: agora, por: "Gerente" } }));
  const mesclado = mesclarEstadoPorUsuario(estado, recebido, gerente, "auth-g", agora);
  const n1 = mesclado.ncs.find((nc) => nc.id === "n1");
  assert.equal(n1.marcadaFeita.por, "Gerente");
  assert.equal(n1.acaoCorretiva, "Original");
  assert.equal(n1.status, "Aberta");
  assert.equal(mesclado.ncs.find((nc) => nc.id === "n2").marcadaFeita, undefined, "NC resolvida não muda");
});

test("servidor: telas liberadas só mudam pelo Administrador; o Gerente não se libera sozinho", () => {
  const { estado, agora } = estadoDoServidor();
  const gerente = estado.usuarios[1];
  const recebido = filtrarEstadoPorUsuario(estado, gerente);
  recebido.usuarios = recebido.usuarios.map((usuario) => ({ ...usuario, telas: { checklist: "editar", manualCompleto: "ver" }, perfil: "Administrador" }));
  const mesclado = mesclarEstadoPorUsuario(estado, recebido, gerente, "auth-g", agora);
  const salvo = mesclado.usuarios.find((usuario) => usuario.id === "ger");
  assert.equal(salvo.telas, undefined);
  assert.equal(salvo.perfil, "Gerente");
});

test("auditoria das telas: antes → depois e mapeamento de telas", () => {
  const antes = telasEfetivas({ perfil: "Gerente" });
  const depois = telasEfetivas({ perfil: "Gerente", telas: { manualCompleto: "ver", checklist: "editar" } });
  assert.deepEqual(diferencasDeTelas(antes, depois), ["Checklist: Só ver → Editar", "Manual completo: Bloqueada → Só ver"]);
  assert.deepEqual(ajustesDiferentes("Gerente", depois), { checklist: "editar", manualCompleto: "ver" });
  assert.deepEqual(ajustesDiferentes("Gerente", antes), {});
  assert.equal(telaDaVisao("plano"), "correcoes");
  assert.equal(telaDaVisao("popsvisita"), "popsVisita");
  assert.equal(telaDaVisao("desconhecida"), null);
});
