import type { AcaoPermissao, PerfilUsuario } from "../types/index.ts";

// Telas liberadas: cada pessoa tem o PADRÃO do perfil e, opcionalmente, ajustes por tela
// (campo `telas` do usuário, JSON opcional). O servidor aplica o mesmo merge, então esconder
// um botão nunca é a única proteção: as ações permitidas (e as rotas de API) saem daqui.

export type TelaKey =
  | "central"
  | "checklist"
  | "evidencias"
  | "correcoes"
  | "popsVisita"
  | "relatorio"
  | "empresas"
  | "ambientes"
  | "pops"
  | "inicio"
  | "visitas"
  | "guiaRapido"
  | "manualCompleto"
  | "acessos"
  | "administracao";

/** "oculta" = tela desligada. */
export type NivelTela = "oculta" | "ver" | "editar" | "marcar" | "concluir" | "simples" | "completo";

export type GrupoTela = "visita" | "cadastros" | "geral";

export type DefinicaoTela = {
  key: TelaKey;
  rotulo: string;
  grupo: GrupoTela;
  /** Níveis possíveis, quando a tela está ligada (o primeiro é o menos permissivo). */
  niveis: Exclude<NivelTela, "oculta">[];
  /** Só o Administrador usa; aparece com cadeado e não pode ser liberada. */
  somenteAdmin?: boolean;
  /** Frase curta explicando um nível. */
  nota?: string;
};

export const TELAS: DefinicaoTela[] = [
  { key: "central", rotulo: "Central da visita", grupo: "visita", niveis: ["ver"] },
  { key: "checklist", rotulo: "Checklist", grupo: "visita", niveis: ["ver", "editar"] },
  { key: "evidencias", rotulo: "Evidências", grupo: "visita", niveis: ["ver", "editar"] },
  { key: "correcoes", rotulo: "Correções", grupo: "visita", niveis: ["ver", "marcar", "concluir"], nota: "O Consultor/RT confirma antes de resolver" },
  { key: "popsVisita", rotulo: "POPs da visita", grupo: "visita", niveis: ["ver", "editar"] },
  { key: "relatorio", rotulo: "Relatório", grupo: "visita", niveis: ["ver", "editar"] },
  { key: "empresas", rotulo: "Empresas", grupo: "cadastros", niveis: ["ver", "editar"] },
  { key: "ambientes", rotulo: "Ambientes", grupo: "cadastros", niveis: ["ver", "editar"] },
  { key: "pops", rotulo: "POPs e documentos", grupo: "cadastros", niveis: ["ver", "editar"] },
  { key: "acessos", rotulo: "Acessos", grupo: "cadastros", niveis: ["ver"], somenteAdmin: true },
  { key: "administracao", rotulo: "Administração", grupo: "cadastros", niveis: ["ver"], somenteAdmin: true },
  { key: "inicio", rotulo: "Início", grupo: "geral", niveis: ["simples", "completo"] },
  { key: "visitas", rotulo: "Visitas", grupo: "geral", niveis: ["ver", "editar"] },
  { key: "guiaRapido", rotulo: "Guia rápido", grupo: "geral", niveis: ["ver"] },
  { key: "manualCompleto", rotulo: "Manual completo", grupo: "geral", niveis: ["ver"] },
];

export const POR_TELA = new Map(TELAS.map((tela) => [tela.key, tela]));

export type TelasDoUsuario = Partial<Record<TelaKey, NivelTela>>;

const TODAS_AS_TELAS = TELAS.map((tela) => tela.key);

function montar(base: Partial<Record<TelaKey, NivelTela>>): Record<TelaKey, NivelTela> {
  const resultado = {} as Record<TelaKey, NivelTela>;
  TODAS_AS_TELAS.forEach((tela) => {
    resultado[tela] = base[tela] ?? "oculta";
  });
  return resultado;
}

/** Padrão de cada perfil. Os três perfis antigos reproduzem exatamente o que já faziam. */
export const PADRAO_DO_PERFIL: Record<PerfilUsuario, Record<TelaKey, NivelTela>> = {
  Administrador: montar({
    central: "ver", checklist: "editar", evidencias: "editar", correcoes: "concluir", popsVisita: "editar", relatorio: "editar",
    empresas: "editar", ambientes: "editar", pops: "editar", acessos: "ver", administracao: "ver",
    inicio: "completo", visitas: "editar", guiaRapido: "ver", manualCompleto: "ver",
  }),
  "Consultor/RT": montar({
    central: "ver", checklist: "editar", evidencias: "editar", correcoes: "concluir", popsVisita: "editar", relatorio: "editar",
    empresas: "editar", ambientes: "editar", pops: "editar",
    inicio: "completo", visitas: "editar", guiaRapido: "ver", manualCompleto: "ver",
  }),
  "Cliente Gestor": montar({
    central: "ver", correcoes: "concluir", relatorio: "ver", empresas: "ver", pops: "ver",
    inicio: "completo", visitas: "ver", guiaRapido: "ver", manualCompleto: "ver",
  }),
  Gerente: montar({
    central: "ver", checklist: "ver", evidencias: "editar", correcoes: "marcar", popsVisita: "ver", relatorio: "ver",
    pops: "ver", inicio: "completo", visitas: "ver", guiaRapido: "ver",
  }),
  // Executor de campo: só Início, Checklist e Evidências (com Registrar agora), nas empresas atribuídas.
  "Executor de campo": montar({ inicio: "simples", checklist: "editar", evidencias: "editar" }),
  // Fiscal: leitura, só do que está pronto (POPs aprovados; relatórios emitidos e dossiê ainda não existem).
  Fiscal: montar({ inicio: "simples", guiaRapido: "ver", pops: "ver" }),
};

/** Telas que o Fiscal pode ter, sempre sem edição. Ajustes por pessoa nunca passam disto. */
const TELAS_DO_FISCAL: TelaKey[] = ["inicio", "guiaRapido", "manualCompleto", "pops"];
const NIVEIS_DO_FISCAL: NivelTela[] = ["oculta", "ver", "simples", "completo"];

/** Ações liberadas por cada (tela, nível). Telas só de leitura liberam só a visão. */
const ACOES_DA_TELA: Partial<Record<TelaKey, Partial<Record<NivelTela, AcaoPermissao[]>>>> = {
  inicio: { simples: ["empresas.ver"], completo: ["empresas.ver"] },
  visitas: { ver: ["empresas.ver"], editar: ["empresas.ver", "visitas.criar", "visitas.concluir"] },
  checklist: { editar: ["visitas.executar"] },
  evidencias: { editar: ["evidencias.adicionar"] },
  correcoes: { marcar: ["ncs.marcar_feita"], concluir: ["ncs.marcar_feita", "ncs.acompanhar"] },
  popsVisita: { editar: ["empresas.editar"] },
  relatorio: { ver: ["relatorios.exportar"], editar: ["relatorios.exportar", "relatorios.aprovar"] },
  empresas: { ver: ["empresas.ver"], editar: ["empresas.ver", "empresas.editar"] },
  ambientes: { editar: ["visitas.executar"] },
  pops: { editar: ["empresas.editar"] },
  acessos: { ver: ["usuarios.gerenciar"] },
};

/** Ações que não dependem de tela (continuam presas ao perfil). */
export const ACOES_FIXAS_DO_PERFIL: Record<PerfilUsuario, AcaoPermissao[]> = {
  Administrador: ["ia.analisar", "auditoria.ver"],
  "Consultor/RT": ["ia.analisar", "auditoria.ver"],
  "Cliente Gestor": [],
  Gerente: [],
  "Executor de campo": [],
  Fiscal: [],
};

export function nivelValido(tela: TelaKey, nivel: NivelTela): boolean {
  if (nivel === "oculta") return true;
  const definicao = POR_TELA.get(tela);
  return Boolean(definicao && definicao.niveis.includes(nivel as Exclude<NivelTela, "oculta">));
}

/**
 * Padrão do perfil + ajustes da pessoa. Ajuste inválido é ignorado; tela só do Administrador
 * nunca é liberada para outro perfil.
 */
export function telasEfetivas(
  usuario: { perfil: PerfilUsuario; telas?: TelasDoUsuario | null }
): Record<TelaKey, NivelTela> {
  const efetivas = { ...PADRAO_DO_PERFIL[usuario.perfil] };
  const ajustes = usuario.telas || {};
  (Object.keys(ajustes) as TelaKey[]).forEach((tela) => {
    const nivel = ajustes[tela];
    const definicao = POR_TELA.get(tela);
    if (!definicao || !nivel || !nivelValido(tela, nivel)) return;
    if (definicao.somenteAdmin && usuario.perfil !== "Administrador") return;
    if (usuario.perfil === "Fiscal" && (!TELAS_DO_FISCAL.includes(tela) || !NIVEIS_DO_FISCAL.includes(nivel))) return;
    efetivas[tela] = nivel;
  });
  return efetivas;
}

export function acoesDasTelas(telas: Record<TelaKey, NivelTela>): AcaoPermissao[] {
  const acoes = new Set<AcaoPermissao>();
  (Object.keys(telas) as TelaKey[]).forEach((tela) => {
    ACOES_DA_TELA[tela]?.[telas[tela]]?.forEach((acao) => acoes.add(acao));
  });
  return [...acoes];
}

/** Todas as ações efetivas da pessoa (telas + ações fixas do perfil). */
export function permissoesEfetivas(
  usuario: { perfil: PerfilUsuario; telas?: TelasDoUsuario | null }
): AcaoPermissao[] {
  return [...new Set([...acoesDasTelas(telasEfetivas(usuario)), ...ACOES_FIXAS_DO_PERFIL[usuario.perfil]])];
}

export function nivelDaTela(
  usuario: { perfil: PerfilUsuario; telas?: TelasDoUsuario | null },
  tela: TelaKey
): NivelTela {
  return telasEfetivas(usuario)[tela];
}

export function podeVerTela(
  usuario: { perfil: PerfilUsuario; telas?: TelasDoUsuario | null },
  tela: TelaKey
): boolean {
  return nivelDaTela(usuario, tela) !== "oculta";
}

/** Só guarda o que difere do padrão do perfil. */
export function ajustesDiferentes(
  perfil: PerfilUsuario,
  desejadas: Record<TelaKey, NivelTela>
): TelasDoUsuario {
  const padrao = PADRAO_DO_PERFIL[perfil];
  const ajustes: TelasDoUsuario = {};
  TODAS_AS_TELAS.forEach((tela) => {
    const definicao = POR_TELA.get(tela);
    if (definicao?.somenteAdmin && perfil !== "Administrador") return;
    if (desejadas[tela] !== padrao[tela] && nivelValido(tela, desejadas[tela])) ajustes[tela] = desejadas[tela];
  });
  return ajustes;
}

export function telasDiferentesDoPadrao(usuario: { perfil: PerfilUsuario; telas?: TelasDoUsuario | null }): TelaKey[] {
  const padrao = PADRAO_DO_PERFIL[usuario.perfil];
  const efetivas = telasEfetivas(usuario);
  return TODAS_AS_TELAS.filter((tela) => efetivas[tela] !== padrao[tela]);
}

export function rotuloDoNivel(nivel: NivelTela): string {
  switch (nivel) {
    case "oculta":
      return "Bloqueada";
    case "ver":
      return "Só ver";
    case "editar":
      return "Editar";
    case "marcar":
      return "Marcar como feita";
    case "concluir":
      return "Concluir";
    case "simples":
      return "Simples";
    default:
      return "Completo";
  }
}

/** Resumo textual para o histórico de acessos (antes/depois). */
export function descreverTelas(telas: Record<TelaKey, NivelTela>): string {
  return TELAS.map((tela) => `${tela.rotulo}: ${rotuloDoNivel(telas[tela.key])}`).join("; ");
}

/** Telas do menu que a pessoa vê (usado pela janela "Telas liberadas" e pelos modos de tela). */
export function menuDaPessoa(usuario: { perfil: PerfilUsuario; telas?: TelasDoUsuario | null }): TelaKey[] {
  const telas = telasEfetivas(usuario);
  return TELAS.filter((tela) => telas[tela.key] !== "oculta" && !["administracao"].includes(tela.key)).map((tela) => tela.key);
}

/** Linhas "Tela: antes → depois" para o histórico de acessos. */
export function diferencasDeTelas(
  antes: Record<TelaKey, NivelTela>,
  depois: Record<TelaKey, NivelTela>
): string[] {
  return TELAS.filter((tela) => antes[tela.key] !== depois[tela.key]).map(
    (tela) => `${tela.rotulo}: ${rotuloDoNivel(antes[tela.key])} → ${rotuloDoNivel(depois[tela.key])}`
  );
}

/** Mapeia a tela do menu para a tela liberada que a controla. */
export function telaDaVisao(view: string): TelaKey | null {
  switch (view) {
    case "inicio":
      return "inicio";
    case "visitas":
    case "historico":
      return "visitas";
    case "empresas":
      return "empresas";
    case "acessos":
      return "acessos";
    case "visita":
      return "central";
    case "ambientes":
      return "ambientes";
    case "checklist":
      return "checklist";
    case "evidencias":
      return "evidencias";
    case "ncs":
    case "plano":
    case "acompanhamento":
    case "correcoes":
      return "correcoes";
    case "popsvisita":
      return "popsVisita";
    case "relatorio":
      return "relatorio";
    case "pops":
      return "pops";
    default:
      return null;
  }
}
