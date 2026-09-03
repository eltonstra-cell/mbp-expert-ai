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
