import type { AcaoPermissao, AppDB, UsuarioSistema } from "@/types";
import { permissoesEfetivas } from "./screenAccess.ts";
import { acessoVigente } from "./validadeDeAcesso.ts";

function possuiPermissao(usuario: UsuarioSistema, acao: AcaoPermissao): boolean {
  return usuario.status === "Ativo" && acessoVigente(usuario) && permissoesEfetivas(usuario).includes(acao);
}

function podeAcessarEmpresa(usuario: UsuarioSistema, empresaId: string): boolean {
  return (
    usuario.status === "Ativo" &&
    acessoVigente(usuario) &&
    (usuario.perfil === "Administrador" || usuario.empresaIds.includes(empresaId))
  );
}

function normalizarEmail(email: string): string {
  return email.trim().toLocaleLowerCase("pt-BR");
}

export function localizarUsuarioAutenticado(
  data: AppDB,
  authId: string,
  email: string
): UsuarioSistema | null {
  const emailNormalizado = normalizarEmail(email);
  return (
    data.usuarios.find((usuario) => usuario.authId === authId) ||
    data.usuarios.find(
      (usuario) => normalizarEmail(usuario.email) === emailNormalizado
    ) ||
    null
  );
}

function usuarioEfetivo(usuario: UsuarioSistema): UsuarioSistema {
  return usuario.status === "Convidado"
    ? { ...usuario, status: "Ativo" }
    : usuario;
}

export function filtrarEstadoPorUsuario(
  data: AppDB,
  usuario: UsuarioSistema
): AppDB {
  if (usuario.perfil === "Administrador") return data;

  const efetivo = usuarioEfetivo(usuario);
  const empresas = Object.fromEntries(
    Object.entries(data.empresas).filter(([empresaId]) =>
      podeAcessarEmpresa(efetivo, empresaId)
    )
  );
  const empresaIds = new Set(Object.keys(empresas));
  const visitas = data.visitas.filter((visita) => empresaIds.has(visita.empresaId));
  const visitaIds = new Set(visitas.map((visita) => visita.id));
  const ncs = data.ncs.filter(
    (nc) => empresaIds.has(nc.empresaId) && visitaIds.has(nc.visitaId)
  );
  const evidencias = data.evidencias.filter(
    (evidencia) =>
      empresaIds.has(evidencia.empresaId) && visitaIds.has(evidencia.visitaId)
  );
  // Fiscal: só empresas e POPs aprovados; nada de visitas, correções, evidências ou rascunhos.
  if (usuario.perfil === "Fiscal") {
    const somenteAprovados = Object.fromEntries(
      Object.entries(empresas).map(([id, empresa]) => [
        id,
        { ...empresa, pops: (empresa.pops || []).filter((pop) => pop.status === "Aprovado" && !pop.arquivado) },
      ])
    );
    return {
      ...data,
      empresas: somenteAprovados,
      empresaAtualId: data.empresaAtualId && empresaIds.has(data.empresaAtualId) ? data.empresaAtualId : Object.keys(empresas)[0] || null,
      visitas: [],
      ncs: [],
      evidencias: [],
      usuarios: [usuario],
      registrosAuditoria: [],
    };
  }
  // Executor de campo: não recebe correções; dos POPs recebe só os aprovados, para ler no checklist ("Ver POP").
  const semPops = usuario.perfil === "Executor de campo";
  const registrosAuditoria = possuiPermissao(efetivo, "auditoria.ver")
    ? data.registrosAuditoria.filter(
        (registro) =>
          registro.usuarioId === usuario.id ||
          (!!registro.empresaId && empresaIds.has(registro.empresaId))
      )
    : [];

  return {
    ...data,
    empresas: semPops
      ? Object.fromEntries(Object.entries(empresas).map(([id, empresa]) => [id, { ...empresa, pops: (empresa.pops || []).filter((pop) => pop.status === "Aprovado" && !pop.arquivado) }]))
      : empresas,
    empresaAtualId:
      data.empresaAtualId && empresaIds.has(data.empresaAtualId)
        ? data.empresaAtualId
        : Object.keys(empresas)[0] || null,
    visitas,
    ncs: semPops ? [] : ncs,
    evidencias,
    usuarios: [usuario],
    registrosAuditoria,
  };
}

const CAMPOS_DA_NC_QUE_VEM_DO_CHECKLIST = [
  "ambiente",
  "titulo",
  "categoria",
  "criticidade",
  "referencia",
  "orientacao",
  "observacao",
  "prioridade",
  "inativaNoChecklist",
  "canceladaPeloUsuarioEm",
] as const;

/**
 * Executor de campo: a NC nasce da resposta "Não conforme" no checklist, então ele pode criar a NC e
 * atualizar o que vem do checklist. Plano, status, prazo e acompanhamento ficam como estão.
 */
function mesclarNcsDoChecklist(
  atual: AppDB["ncs"],
  recebidas: AppDB["ncs"],
  empresaIds: Set<string>,
  agora: string
): AppDB["ncs"] {
  const porId = new Map(atual.map((nc) => [nc.id, nc]));
  recebidas
    .filter((nc) => empresaIds.has(nc.empresaId))
    .forEach((nova) => {
      const existente = porId.get(nova.id);
      if (!existente) {
        porId.set(nova.id, { ...nova, status: "Aberta", acaoCorretiva: undefined, responsavelAcao: undefined, prazo: undefined, acompanhamento: undefined, historicoAcompanhamento: undefined, resolvidaEm: undefined, marcadaFeita: undefined });
        return;
      }
      if (!empresaIds.has(existente.empresaId)) return;
      const atualizada = { ...existente } as Record<string, unknown>;
      CAMPOS_DA_NC_QUE_VEM_DO_CHECKLIST.forEach((campo) => {
        atualizada[campo] = (nova as Record<string, unknown>)[campo];
      });
      if (existente.inativaNoChecklist && !nova.inativaNoChecklist) {
        atualizada.status = "Aberta";
        atualizada.resolvidaEm = undefined;
        atualizada.historicoAcompanhamento = [
          ...(existente.historicoAcompanhamento || []),
          { id: `${existente.id}:reaberta:${agora}`, criadoEm: agora, observacao: "Reaberta: item voltou a Não conforme", status: "Aberta" },
        ];
      }
      porId.set(existente.id, atualizada as unknown as AppDB["ncs"][number]);
    });
  return [...porId.values()];
}

/** Executor de campo: só o checklist e o progresso das visitas que já existem nas empresas dele. */
function mesclarVisitasDoExecutor(atuais: AppDB["visitas"], recebidas: AppDB["visitas"], empresaIds: Set<string>): AppDB["visitas"] {
  const porId = new Map(recebidas.map((visita) => [visita.id, visita]));
  return atuais.map((visita) => {
    const nova = porId.get(visita.id);
    if (!nova || !empresaIds.has(visita.empresaId) || visita.status === "Concluída") return visita;
    return { ...visita, checklist: nova.checklist, progresso: nova.progresso };
  });
}

// Responsável do estabelecimento sem permissão de editar empresas: leva do que chegou só a aprovação de POPs
// que já estavam aguardando aprovação na versão gravada.
function aplicarSomenteAprovacoes(
  atuais: AppDB["empresas"],
  recebidas: AppDB["empresas"],
  usuario: UsuarioSistema,
  empresaIds: Set<string>
): AppDB["empresas"] | null {
  let resultado: AppDB["empresas"] | null = null;
  empresaIds.forEach((empresaId) => {
    const gravada = atuais[empresaId];
    const nova = recebidas[empresaId];
    if (!gravada || !nova || gravada.responsavelEstabelecimento?.usuarioId !== usuario.id) return;
    let mudou = false;
    const pops = (gravada.pops || []).map((pop) => {
      const recebido = (nova.pops || []).find((item) => item.id === pop.id);
      const aguardava = pop.status === "Aguardando aprovação" || pop.status === "Em revisão";
      if (!recebido || !aguardava || recebido.status !== "Aprovado" || recebido.versao !== pop.versao) return pop;
      mudou = true;
      return { ...pop, status: recebido.status, aprovacao: recebido.aprovacao, versoes: recebido.versoes, versaoCatalogoAprovada: recebido.versaoCatalogoAprovada };
    });
    if (mudou) resultado = { ...(resultado || atuais), [empresaId]: { ...gravada, pops } };
  });
  return resultado;
}

function mesclarPorEscopo<T extends { id: string; empresaId: string }>(
  colecao: string,
  atuais: T[],
  recebidos: T[],
  empresaIds: Set<string>,
  permitirExclusao: boolean
): T[] {
  const foraDoEscopo = atuais.filter((item) => !empresaIds.has(item.empresaId));
  const dentroAtual = permitirExclusao
    ? []
    : atuais.filter((item) => empresaIds.has(item.empresaId));
  const mapa = new Map(
    [...foraDoEscopo, ...dentroAtual].map((item) => [item.id, item])
  );

  // Um registro recebido não pode tomar o lugar (mesmo id) de um registro
  // existente de outra empresa fora do escopo: o existente é mantido.
  const empresaPorIdForaDoEscopo = new Map(
    foraDoEscopo.map((item) => [item.id, item.empresaId])
  );
  recebidos
    .filter((item) => empresaIds.has(item.empresaId))
    .filter((item) => {
      if (!empresaPorIdForaDoEscopo.has(item.id)) return true;
      console.warn(
        `Colisão de id ignorada em ${colecao}: id=${item.id} empresaExistente=${empresaPorIdForaDoEscopo.get(item.id)} empresaRecebida=${item.empresaId}`
      );
      return false;
    })
    .forEach((item) => mapa.set(item.id, item));

  return [...mapa.values()];
}

export function mesclarEstadoPorUsuario(
  atual: AppDB,
  recebido: AppDB,
  usuario: UsuarioSistema,
  authId: string,
  agora = new Date().toISOString()
): AppDB {
  if (usuario.perfil === "Administrador") return recebido;

  const efetivo = usuarioEfetivo(usuario);
  const empresaIds = new Set(usuario.empresaIds);
  const usuarioVinculado: UsuarioSistema = {
    ...usuario,
    authId: usuario.authId || authId,
    status: usuario.status === "Convidado" ? "Ativo" : usuario.status,
    ultimoAcessoEm: agora,
    atualizadoEm: agora,
  };

  let empresas = atual.empresas;
  let visitas = atual.visitas;
  let ncs = atual.ncs;
  let evidencias = atual.evidencias;

  if (possuiPermissao(efetivo, "empresas.editar")) {
    empresas = { ...atual.empresas };
    const podeMexerNaIa = possuiPermissao(efetivo, "ia.analisar");
    empresaIds.forEach((empresaId) => {
      if (recebido.empresas[empresaId]) {
        const nova = recebido.empresas[empresaId];
        const gravada = atual.empresas[empresaId];
        // Só quem pode usar a IA (Administrador e Consultor/RT) liberar ou desligar a IA da empresa.
        const comIa = podeMexerNaIa
          ? nova
          : { ...nova, privacidade: { ...nova.privacidade, iaFotos: gravada?.privacidade?.iaFotos } };
        // Só o Administrador escolhe a pessoa de Acessos que é o responsável do estabelecimento (quem aprova os POPs).
        empresas[empresaId] = {
          ...comIa,
          responsavelEstabelecimento: comIa.responsavelEstabelecimento
            ? { ...comIa.responsavelEstabelecimento, usuarioId: gravada?.responsavelEstabelecimento?.usuarioId }
            : gravada?.responsavelEstabelecimento,
        };
      }
    });
  } else {
    // Quem não edita empresas mas é o responsável do estabelecimento só pode aprovar POP que aguarda aprovação.
    const comAprovacao = aplicarSomenteAprovacoes(atual.empresas, recebido.empresas, usuario, empresaIds);
    if (comAprovacao) empresas = comAprovacao;
  }

  if (possuiPermissao(efetivo, "visitas.executar")) {
    visitas =
      usuario.perfil === "Executor de campo"
        ? mesclarVisitasDoExecutor(atual.visitas, recebido.visitas, empresaIds)
        : mesclarPorEscopo("visitas", atual.visitas, recebido.visitas, empresaIds, false);
    if (usuario.perfil === "Executor de campo") ncs = mesclarNcsDoChecklist(atual.ncs, recebido.ncs, empresaIds, agora);
  }

  if (possuiPermissao(efetivo, "ncs.acompanhar")) {
    if (usuario.perfil === "Cliente Gestor") {
      const recebidas = new Map(recebido.ncs.map((nc) => [nc.id, nc]));
      ncs = atual.ncs.map((nc) => {
        const nova = recebidas.get(nc.id);
        if (!nova || !empresaIds.has(nc.empresaId)) return nc;
        return {
          ...nc,
          acaoCorretiva: nova.acaoCorretiva,
          responsavelAcao: nova.responsavelAcao,
          prazo: nova.prazo,
          acompanhamento: nova.acompanhamento,
          status: nova.status,
          historicoAcompanhamento: nova.historicoAcompanhamento,
          resolvidaEm: nova.resolvidaEm,
        };
      });
    } else {
      ncs = mesclarPorEscopo("ncs", atual.ncs, recebido.ncs, empresaIds, false);
    }
  } else if (possuiPermissao(efetivo, "ncs.marcar_feita")) {
    // Marcar como feita: só o campo marcadaFeita muda; o Consultor/RT confirma e resolve.
    const recebidas = new Map(recebido.ncs.map((nc) => [nc.id, nc]));
    ncs = atual.ncs.map((nc) => {
      const nova = recebidas.get(nc.id);
      if (!nova || !empresaIds.has(nc.empresaId) || nc.status === "Resolvida") return nc;
      return { ...nc, marcadaFeita: nova.marcadaFeita };
    });
  }

  if (possuiPermissao(efetivo, "evidencias.adicionar")) {
    evidencias = mesclarPorEscopo(
      "evidencias",
      atual.evidencias,
      recebido.evidencias,
      empresaIds,
      true
    );
  }

  return {
    ...atual,
    empresas,
    empresaAtualId:
      recebido.empresaAtualId && empresaIds.has(recebido.empresaAtualId)
        ? recebido.empresaAtualId
        : atual.empresaAtualId,
    visitas,
    ncs,
    evidencias,
    usuarios: atual.usuarios.map((item) =>
      item.id === usuario.id ? usuarioVinculado : item
    ),
  };
}
