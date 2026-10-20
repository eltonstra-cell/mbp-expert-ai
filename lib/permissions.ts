import { permissoesEfetivas } from "./screenAccess.ts";
import { acessoVigente } from "./validadeDeAcesso.ts";
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
  "ncs.marcar_feita": "Marcar uma correção como feita (o Consultor/RT confirma)",
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
  Gerente:
    "Acompanha a visita, registra evidências e marca correções como feitas; o Consultor/RT confirma.",
  "Executor de campo":
    "Responde o checklist e registra fotos e áudios nas visitas das empresas atribuídas. Não vê correções, relatório nem cadastros.",
  Fiscal:
    "Leitura, com validade: vê só relatórios emitidos, dossiê da empresa e POPs aprovados. Não edita nada.",
};

// Ações de cada perfil: padrão das telas liberadas do perfil (sem ajustes por pessoa).
export const PERMISSIONS_BY_PROFILE: Record<PerfilUsuario, readonly AcaoPermissao[]> = {
  Administrador: permissoesEfetivas({ perfil: "Administrador" }),
  "Consultor/RT": permissoesEfetivas({ perfil: "Consultor/RT" }),
  "Cliente Gestor": permissoesEfetivas({ perfil: "Cliente Gestor" }),
  Gerente: permissoesEfetivas({ perfil: "Gerente" }),
  "Executor de campo": permissoesEfetivas({ perfil: "Executor de campo" }),
  Fiscal: permissoesEfetivas({ perfil: "Fiscal" }),
};

export function possuiPermissao(
  usuario: UsuarioSistema | null | undefined,
  acao: AcaoPermissao
): boolean {
  if (!usuario || usuario.status !== "Ativo" || !acessoVigente(usuario)) return false;
  // Padrão do perfil + telas liberadas da pessoa (a mesma conta é feita no servidor).
  return permissoesEfetivas(usuario).includes(acao);
}

export function podeAcessarEmpresa(
  usuario: UsuarioSistema | null | undefined,
  empresaId: string
): boolean {
  if (!usuario || usuario.status !== "Ativo" || !acessoVigente(usuario)) return false;
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

// Ditado por voz e "melhorar texto" só aparecem para quem pode usar IA. Sem
// usuário identificado no diretório (modo local/preparação), os botões ficam
// visíveis e a decisão fica com o servidor, que exige `ia.analisar` quando o
// controle de acesso está ativo.
export function deveExibirRecursosDeIa(
  usuario: UsuarioSistema | null | undefined
): boolean {
  return !usuario || possuiPermissao(usuario, "ia.analisar");
}
