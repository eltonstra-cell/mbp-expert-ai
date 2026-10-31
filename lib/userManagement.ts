import { limparTextoDePessoa } from "./nomeCargo.ts";
import type { PerfilUsuario, StatusUsuario, UsuarioSistema } from "@/types";
import type { TelasDoUsuario } from "./screenAccess.ts";
import { calcularValidade, prazoPermitido } from "./validadeDeAcesso.ts";

export type DadosUsuarioPreparacao = {
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  empresaIds: string[];
  /** Telas liberadas definidas já no preparo (opcional); sem isso vale o padrão do perfil. */
  telas?: TelasDoUsuario;
  /** Fiscal: por quantos dias o acesso vale (3, 7, 15 ou 30). Não existe "sem prazo". */
  validadeDias?: number;
  /** Edição de quem já era Fiscal: a validade só muda em "Renovar". */
  jaEraFiscal?: boolean;
  /** CRN de quem assina relatórios (RT e Administrador); opcional. */
  crn?: string;
  /** Cargo que sai na assinatura (ex.: "Nutricionista RT"); opcional. */
  cargo?: string;
  /** Telefone do RT (opcional); aparece no relatório só quando preenchido. */
  telefone?: string;
};

/** Telefone só com dígitos e os sinais comuns, até 20 caracteres; vazio vira undefined. */
export function limparTelefone(texto: string | undefined | null): string | undefined {
  const limpo = (texto || "").replace(/[^0-9()+\- ]/g, "").replace(/\s+/g, " ").trim().slice(0, 20);
  return limpo || undefined;
}

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
  if (dados.perfil === "Fiscal" && !(dados.validadeDias !== undefined && prazoPermitido(dados.validadeDias))) {
    throw new Error("Escolha por quantos dias o acesso vale: 3, 7, 15 ou 30.");
  }
}

/** Fiscal: renova o acesso por mais 3, 7, 15 ou 30 dias a partir de agora (reabre um acesso encerrado ou vencido). */
export function renovarAcessoFiscal(usuario: UsuarioSistema, dias: number, agora = new Date()): UsuarioSistema {
  if (usuario.perfil !== "Fiscal") throw new Error("Só o acesso do Fiscal tem validade.");
  if (!prazoPermitido(dias)) throw new Error("Escolha 3, 7, 15 ou 30 dias.");
  const { acessoEncerradoEm: _encerrado, ...resto } = usuario;
  return { ...resto, validoAte: calcularValidade(dias, agora), atualizadoEm: agora.toISOString() };
}

/** Fiscal: "Encerrar agora" corta o acesso na hora; o servidor passa a recusar a pessoa. */
export function encerrarAcessoFiscal(usuario: UsuarioSistema, agora = new Date()): UsuarioSistema {
  if (usuario.perfil !== "Fiscal") throw new Error("Só o acesso do Fiscal tem validade.");
  return { ...usuario, acessoEncerradoEm: agora.toISOString(), atualizadoEm: agora.toISOString() };
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
    ...(dados.telas && Object.keys(dados.telas).length > 0 ? { telas: dados.telas } : {}),
    ...(dados.crn?.trim() && (dados.perfil === "Consultor/RT" || dados.perfil === "Administrador") ? { crn: dados.crn.trim() } : {}),
    ...(limparTextoDePessoa(dados.cargo) ? { cargo: limparTextoDePessoa(dados.cargo).slice(0, 80) } : {}),
    ...(limparTelefone(dados.telefone) && (dados.perfil === "Consultor/RT" || dados.perfil === "Administrador") ? { telefone: limparTelefone(dados.telefone) } : {}),
    ...(dados.perfil === "Fiscal" && dados.validadeDias !== undefined ? { validoAte: calcularValidade(dados.validadeDias, new Date(criadoEm)) } : {}),
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
  // Editar uma pessoa que já é Fiscal não pede validade de novo (renovar é um passo próprio).
  validarDados({ ...dados, validadeDias: dados.perfil === "Fiscal" && usuario.perfil === "Fiscal" ? dados.validadeDias ?? 7 : dados.validadeDias }, existentes, usuario.id);
  const virouFiscal = dados.perfil === "Fiscal" && usuario.perfil !== "Fiscal";
  const { validoAte: _validoAte, acessoEncerradoEm: _encerradoEm, ...semValidade } = usuario;
  return {
    ...(dados.perfil === "Fiscal" && !virouFiscal ? usuario : semValidade),
    ...(virouFiscal && dados.validadeDias !== undefined ? { validoAte: calcularValidade(dados.validadeDias, new Date(atualizadoEm)) } : {}),
    nome: dados.nome.trim(),
    email: normalizarEmail(dados.email),
    perfil: dados.perfil,
    empresaIds:
      dados.perfil === "Administrador"
        ? []
        : Array.from(new Set(dados.empresaIds)),
    crn: dados.crn?.trim() && (dados.perfil === "Consultor/RT" || dados.perfil === "Administrador") ? dados.crn.trim() : undefined,
    cargo: limparTextoDePessoa(dados.cargo) ? limparTextoDePessoa(dados.cargo).slice(0, 80) : undefined,
    telefone: dados.perfil === "Consultor/RT" || dados.perfil === "Administrador" ? limparTelefone(dados.telefone) : undefined,
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

export const PALAVRA_DE_CONFIRMACAO = "EXCLUIR";

/** A janela de exclusão só libera o botão vermelho quando a palavra é digitada exatamente. */
export function confirmacaoDeExclusaoValida(texto: string): boolean {
  return texto.trim() === PALAVRA_DE_CONFIRMACAO;
}

/** Os únicos campos que o Consultor/RT altera do próprio cadastro sem passar por Acessos. */
export const CAMPOS_DO_PERFIL_PROPRIO = ["crn", "cargo", "telefone"] as const;

export type DadosDoPerfilProprio = { crn?: string; cargo?: string; telefone?: string };

/** Só CRN, cargo na assinatura e telefone, limpos; vazio vira undefined (remove o campo). Perfil, e-mail, status e o resto nunca passam por aqui. */
export function camposDoPerfilProprio(dados: DadosDoPerfilProprio | undefined | null): DadosDoPerfilProprio {
  const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");
  const crn = texto(dados?.crn).replace(/\s+/g, " ").trim().slice(0, 40);
  const cargo = limparTextoDePessoa(texto(dados?.cargo)).slice(0, 80);
  return { crn: crn || undefined, cargo: cargo || undefined, telefone: limparTelefone(texto(dados?.telefone)) };
}

/** Dados pessoais do RT que o Manual guarda no cadastro dele (aditivo): CPF/CNPJ, endereço e profissão com registro. */
export const CAMPOS_PESSOAIS_DO_RT = ["cpfCnpj", "endereco", "registroProfissional"] as const;
export type CampoPessoalDoRt = (typeof CAMPOS_PESSOAIS_DO_RT)[number];
export type DadosPessoaisDoRt = Partial<Record<CampoPessoalDoRt, string>>;
export const LIMITE_DOS_DADOS_DO_RT: Record<CampoPessoalDoRt, number> = { cpfCnpj: 18, endereco: 120, registroProfissional: 80 };
/** Limites que o servidor confere no cadastro do RT (os três pessoais mais os do perfil próprio: nunca corta, recusa). */
export const LIMITE_DO_CADASTRO_DO_RT: Record<string, number> = { ...LIMITE_DOS_DADOS_DO_RT, telefone: 20, crn: 40, cargo: 80 };

/** Só os campos pessoais preenchidos e dentro do limite (nunca corta: o que passa do limite é ignorado, o servidor já o recusou). */
export function dadosPessoaisDoRtValidos(dados: DadosPessoaisDoRt | undefined | null): DadosPessoaisDoRt {
  const saida: DadosPessoaisDoRt = {};
  for (const campo of CAMPOS_PESSOAIS_DO_RT) {
    const valor = typeof dados?.[campo] === "string" ? dados[campo]!.replace(/\s+/g, " ").trim() : "";
    if (valor && valor.length <= LIMITE_DOS_DADOS_DO_RT[campo]) saida[campo] = valor;
  }
  return saida;
}

/** Só quem pode ter CPF/CNPJ e endereço no cadastro: Administrador e Consultor/RT. Os demais perfis nunca os recebem. */
export function podeTerDadosPessoaisDoRt(perfil: PerfilUsuario | undefined): boolean {
  return perfil === "Administrador" || perfil === "Consultor/RT";
}

export function semDadosPessoaisDoRt<T extends UsuarioSistema>(usuario: T): T {
  if (podeTerDadosPessoaisDoRt(usuario.perfil)) return usuario;
  const { cpfCnpj: _cpf, endereco: _endereco, registroProfissional: _registro, ...resto } = usuario;
  return resto as T;
}

/**
 * O usuário com CRN, cargo e telefone trocados (perfil próprio); o resto fica como estava.
 * Os dados pessoais do Manual só entram quando vêm preenchidos (nunca apagam o que já está no cadastro) e só para Consultor/RT.
 */
export function comPerfilProprio<T extends UsuarioSistema>(usuario: T, dados: (DadosDoPerfilProprio & DadosPessoaisDoRt) | undefined | null): T {
  const base = { ...usuario, ...camposDoPerfilProprio(dados) };
  return usuario.perfil === "Consultor/RT" ? { ...base, ...dadosPessoaisDoRtValidos(dados) } : base;
}
