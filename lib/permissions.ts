import type {
  AcaoPermissao,
  PerfilUsuario,
  RegistroAuditoria,
  UsuarioSistema,
} from "@/types";

export const PERMISSION_LABELS: Record<AcaoPermissao, string> = {
  "usuarios.gerenciar": "Gerenciar usuários e acessos",
  "empresas.ver": "Visualizar empresas autorizadas",
  "empresas.editar": "Criar e editar empresas",
  "visitas.criar": "Criar visitas técnicas",
  "visitas.executar": "Executar checklist e registros de campo",
  "visitas.concluir": "Concluir e reabrir visitas",
  "relatorios.aprovar": "Aprovar a versão oficial do relatório",
  "relatorios.exportar": "Visualizar e exportar relatórios liberados",
  "ncs.acompanhar": "Acompanhar não conformidades e planos de ação",
  "evidencias.adicionar": "Adicionar evidências",
  "ia.analisar": "Solicitar e confirmar análise por IA",
  "auditoria.ver": "Consultar registros de auditoria",
};

export const PROFILE_DESCRIPTIONS: Record<PerfilUsuario, string> = {
  Administrador:
    "Controla usuários, clientes, configurações, registros e políticas da consultoria.",
  "Consultor/RT":
    "Executa visitas, registra evidências, acompanha correções e aprova documentos técnicos.",
  "Cliente Gestor":
    "Acessa somente empresas e documentos liberados, acompanhando pendências e planos de ação.",
};

const todasAcoes = Object.keys(PERMISSION_LABELS) as AcaoPermissao[];

export const PERMISSIONS_BY_PROFILE: Record<
  PerfilUsuario,
  readonly AcaoPermissao[]
> = {
  Administrador: todasAcoes,
  "Consultor/RT": [
    "empresas.ver",
    "empresas.editar",
    "visitas.criar",
    "visitas.executar",
    "visitas.concluir",
    "relatorios.aprovar",
    "relatorios.exportar",
    "ncs.acompanhar",
    "evidencias.adicionar",
    "ia.analisar",
    "auditoria.ver",
  ],
  "Cliente Gestor": [
    "empresas.ver",
    "relatorios.exportar",
    "ncs.acompanhar",
  ],
};

export function possuiPermissao(
  usuario: UsuarioSistema | null | undefined,
  acao: AcaoPermissao
): boolean {
  if (!usuario || usuario.status !== "Ativo") return false;
  return PERMISSIONS_BY_PROFILE[usuario.perfil].includes(acao);
}

export function podeAcessarEmpresa(
  usuario: UsuarioSistema | null | undefined,
  empresaId: string
): boolean {
  if (!usuario || usuario.status !== "Ativo") return false;
  return usuario.perfil === "Administrador" || usuario.empresaIds.includes(empresaId);
}

export function podeExecutar(
  usuario: UsuarioSistema | null | undefined,
  acao: AcaoPermissao,
  empresaId?: string
): boolean {
  if (!possuiPermissao(usuario, acao)) return false;
  return empresaId ? podeAcessarEmpresa(usuario, empresaId) : true;
}

export function criarRegistroAuditoria(
  entrada: Omit<RegistroAuditoria, "id" | "criadoEm">,
  criadoEm = new Date().toISOString(),
  id = crypto.randomUUID()
): RegistroAuditoria {
  return { id, criadoEm, ...entrada, detalhes: entrada.detalhes.trim() };
}
