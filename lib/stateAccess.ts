import type { AcaoPermissao, AppDB, UsuarioSistema } from "@/types";

const ACOES_POR_PERFIL: Record<UsuarioSistema["perfil"], readonly AcaoPermissao[]> = {
  Administrador: [
    "usuarios.gerenciar", "empresas.ver", "empresas.editar", "visitas.criar",
    "visitas.executar", "visitas.concluir", "relatorios.aprovar",
    "relatorios.exportar", "ncs.acompanhar", "evidencias.adicionar",
    "ia.analisar", "auditoria.ver",
  ],
  "Consultor/RT": [
    "empresas.ver", "empresas.editar", "visitas.criar", "visitas.executar",
    "visitas.concluir", "relatorios.aprovar", "relatorios.exportar",
    "ncs.acompanhar", "evidencias.adicionar", "ia.analisar", "auditoria.ver",
  ],
  "Cliente Gestor": ["empresas.ver", "relatorios.exportar", "ncs.acompanhar"],
};

function possuiPermissao(usuario: UsuarioSistema, acao: AcaoPermissao): boolean {
  return usuario.status === "Ativo" && ACOES_POR_PERFIL[usuario.perfil].includes(acao);
}

function podeAcessarEmpresa(usuario: UsuarioSistema, empresaId: string): boolean {
  return (
    usuario.status === "Ativo" &&
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
  const registrosAuditoria = possuiPermissao(efetivo, "auditoria.ver")
    ? data.registrosAuditoria.filter(
        (registro) =>
          registro.usuarioId === usuario.id ||
          (!!registro.empresaId && empresaIds.has(registro.empresaId))
      )
    : [];

  return {
    ...data,
    empresas,
    empresaAtualId:
      data.empresaAtualId && empresaIds.has(data.empresaAtualId)
        ? data.empresaAtualId
        : Object.keys(empresas)[0] || null,
    visitas,
    ncs,
    evidencias,
    usuarios: [usuario],
    registrosAuditoria,
  };
}

function mesclarPorEscopo<T extends { id: string; empresaId: string }>(
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

  recebidos
    .filter((item) => empresaIds.has(item.empresaId))
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
    empresaIds.forEach((empresaId) => {
      if (recebido.empresas[empresaId]) {
        empresas[empresaId] = recebido.empresas[empresaId];
      }
    });
  }

  if (possuiPermissao(efetivo, "visitas.executar")) {
    visitas = mesclarPorEscopo(atual.visitas, recebido.visitas, empresaIds, false);
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
      ncs = mesclarPorEscopo(atual.ncs, recebido.ncs, empresaIds, false);
    }
  }

  if (possuiPermissao(efetivo, "evidencias.adicionar")) {
    evidencias = mesclarPorEscopo(
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
