import type { PerfilUsuario, StatusUsuario, UsuarioSistema } from "@/types";

export type DadosUsuarioPreparacao = {
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  empresaIds: string[];
};

export type IdentidadeSessao = {
  authId: string;
  email: string;
  nome?: string;
};

export type ResultadoVinculoSessao =
  | { status: "Vinculado"; usuario: UsuarioSistema; alterado: boolean }
  | { status: "Não preparado" }
  | { status: "Suspenso"; usuario: UsuarioSistema }
  | { status: "Conflito"; usuario: UsuarioSistema };

export function normalizarEmail(email: string): string {
  return email.trim().toLocaleLowerCase("pt-BR");
}

function validarDados(
  dados: DadosUsuarioPreparacao,
  existentes: UsuarioSistema[],
  ignorarId?: string
) {
  const nome = dados.nome.trim();
  const email = normalizarEmail(dados.email);
  if (nome.length < 2) {
    throw new Error("Informe o nome completo ou a identificação profissional.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Informe um e-mail válido.");
  }
  if (
    existentes.some(
      (usuario) =>
        usuario.id !== ignorarId && normalizarEmail(usuario.email) === email
    )
  ) {
    throw new Error("Já existe um usuário preparado com este e-mail.");
  }
  if (dados.perfil !== "Administrador" && dados.empresaIds.length === 0) {
    throw new Error("Atribua pelo menos uma empresa para este perfil.");
  }
}

export function criarUsuarioPreparacao(
  dados: DadosUsuarioPreparacao,
  existentes: UsuarioSistema[],
  criadoEm = new Date().toISOString(),
  id = crypto.randomUUID()
): UsuarioSistema {
  validarDados(dados, existentes);
  return {
    id,
    nome: dados.nome.trim(),
    email: normalizarEmail(dados.email),
    perfil: dados.perfil,
    status: "Convidado",
    empresaIds:
      dados.perfil === "Administrador"
        ? []
        : Array.from(new Set(dados.empresaIds)),
    criadoEm,
    atualizadoEm: criadoEm,
  };
}

export function atualizarUsuarioPreparacao(
  usuario: UsuarioSistema,
  dados: DadosUsuarioPreparacao,
  existentes: UsuarioSistema[],
  atualizadoEm = new Date().toISOString()
): UsuarioSistema {
  validarDados(dados, existentes, usuario.id);
  return {
    ...usuario,
    nome: dados.nome.trim(),
    email: normalizarEmail(dados.email),
    perfil: dados.perfil,
    empresaIds:
      dados.perfil === "Administrador"
        ? []
        : Array.from(new Set(dados.empresaIds)),
    atualizadoEm,
  };
}

export function alterarStatusUsuario(
  usuario: UsuarioSistema,
  status: StatusUsuario,
  existentes: UsuarioSistema[],
  atualizadoEm = new Date().toISOString()
): UsuarioSistema {
  if (usuario.status === status) return usuario;
  if (
    usuario.perfil === "Administrador" &&
    usuario.status === "Ativo" &&
    status === "Suspenso" &&
    !existentes.some(
      (item) =>
        item.id !== usuario.id &&
        item.perfil === "Administrador" &&
        item.status === "Ativo"
    )
  ) {
    throw new Error("Não é possível suspender o último administrador ativo.");
  }
  return {
    ...usuario,
    status,
    atualizadoEm,
    convidadoEm:
      status === "Convidado"
        ? usuario.convidadoEm || atualizadoEm
        : usuario.convidadoEm,
  };
}

export function vincularSessaoUsuario(
  identidade: IdentidadeSessao,
  existentes: UsuarioSistema[],
  atualizadoEm = new Date().toISOString()
): ResultadoVinculoSessao {
  const authId = identidade.authId.trim();
  const email = normalizarEmail(identidade.email);
  if (!authId || !email) return { status: "Não preparado" };

  const usuario = existentes.find(
    (item) => normalizarEmail(item.email) === email
  );
  if (!usuario) return { status: "Não preparado" };
  if (usuario.status === "Suspenso") return { status: "Suspenso", usuario };
  if (usuario.authId && usuario.authId !== authId) {
    return { status: "Conflito", usuario };
  }

  const alterado = usuario.authId !== authId || usuario.status !== "Ativo";
  if (!alterado) return { status: "Vinculado", usuario, alterado: false };

  return {
    status: "Vinculado",
    alterado: true,
    usuario: {
      ...usuario,
      authId,
      status: "Ativo",
      atualizadoEm,
      ultimoAcessoEm: atualizadoEm,
    },
  };
}

// ===== Filtro de pessoas e exclusão segura de usuário =====

export type FiltroPessoas = "ativos" | "suspensos" | "todos";

/** "Ativos" inclui quem foi convidado e ainda não entrou; "Suspensos" é só quem foi desativado. */
export function filtrarPessoas(usuarios: UsuarioSistema[], filtro: FiltroPessoas): UsuarioSistema[] {
  if (filtro === "todos") return usuarios;
  return usuarios.filter((usuario) => (filtro === "suspensos" ? usuario.status === "Suspenso" : usuario.status !== "Suspenso"));
}

export function contarPessoas(usuarios: UsuarioSistema[]): Record<FiltroPessoas, number> {
  return {
    ativos: filtrarPessoas(usuarios, "ativos").length,
    suspensos: filtrarPessoas(usuarios, "suspensos").length,
    todos: usuarios.length,
  };
}

export type ContextoExclusao = {
  solicitanteId?: string;
  solicitanteEmail?: string;
  registrosAuditoria: { usuarioId: string }[];
};

/**
 * Regra de exclusão: só quem NUNCA entrou no sistema nem registrou nada.
 * Devolve o motivo do bloqueio ou null quando pode excluir.
 */
export function motivoParaNaoExcluir(usuario: UsuarioSistema, contexto: ContextoExclusao): string | null {
  if (usuario.perfil === "Administrador") return "Administrador não pode ser excluído.";
  if (
    (contexto.solicitanteId && usuario.id === contexto.solicitanteId) ||
    (contexto.solicitanteEmail && normalizarEmail(usuario.email) === normalizarEmail(contexto.solicitanteEmail))
  ) {
    return "Você não pode excluir o seu próprio usuário.";
  }
  if (usuario.authId || usuario.ultimoAcessoEm) return "Esta pessoa já entrou no sistema. Use Desativar acesso.";
  if (contexto.registrosAuditoria.some((registro) => registro.usuarioId === usuario.id)) {
    return "Esta pessoa já registrou atividades. Use Desativar acesso.";
  }
  return null;
}

/** Validação do SERVIDOR: todo usuário que sumiu entre o estado atual e o recebido precisa poder ser excluído. */
export function validarRemocaoDeUsuarios(
  atual: UsuarioSistema[],
  recebido: UsuarioSistema[],
  contexto: ContextoExclusao
): { ok: true } | { ok: false; motivo: string } {
  const ids = new Set(recebido.map((usuario) => usuario.id));
  for (const usuario of atual) {
    if (ids.has(usuario.id)) continue;
    const motivo = motivoParaNaoExcluir(usuario, contexto);
    if (motivo) return { ok: false, motivo };
  }
  return { ok: true };
}
