import type { AcaoPermissao } from "@/types";
import type { NivelTela, TelaKey } from "./screenAccess.ts";

// Modelo puro do menu: o que cada contexto/perfil enxerga e em que ordem.
// Não cria regra de acesso: apenas reaproveita `pode`, que vem das permissões
// existentes. A autorização continua no servidor.

export type NavKey =
  | "registrar"
  | "inicio"
  | "visitas"
  | "central"
  | "cadastros"
  | "ambientes"
  | "checklist"
  | "evidencias"
  | "ncs"
  | "plano"
  | "acompanhamento"
  | "relatorio"
  | "relatorios"
  | "empresas"
  | "pops"
  | "acessos"
  | "ajuda";

export type NavGrupo = "agora" | "acompanhamento" | "administracao";

export type NavTom =
  | "azul"
  | "verde"
  | "laranja"
  | "vermelho"
  | "roxo"
  | "turquesa"
  | "ceu"
  | "ambar"
  | "violeta"
  | "rosa"
  | "indigo"
  | "ardosia";

export type NavItem = {
  key: NavKey;
  rotulo: string;
  curto: string;
  tom: NavTom;
  grupo: NavGrupo;
  /** Só aparece dentro de uma visita. */
  somenteNaVisita?: boolean;
  /** Itens básicos aparecem sempre; os demais dependem de permissão. */
  requer?: (pode: (acao: AcaoPermissao) => boolean) => boolean;
};

export type NavContexto = {
  dentroDeVisita: boolean;
  pode: (acao: AcaoPermissao) => boolean;
  /** Telas liberadas da pessoa identificada; sem isso (modo local) valem só as regras antigas. */
  nivelTela?: (tela: TelaKey) => NivelTela;
};

// Tela liberada que controla cada item do menu (qualquer uma delas ligada mostra o item).
const TELAS_DO_ITEM: Partial<Record<NavKey, TelaKey[]>> = {
  inicio: ["inicio"],
  visitas: ["visitas"],
  central: ["central"],
  // Abre a Central da Empresa › Cadastros (quem edita a empresa); o filtro de permissão está em itensVisiveis.
  cadastros: ["empresas"],
  ambientes: ["ambientes"],
  checklist: ["checklist"],
  evidencias: ["evidencias"],
  ncs: ["correcoes"],
  plano: ["correcoes"],
  acompanhamento: ["correcoes"],
  relatorio: ["relatorio"],
  empresas: ["empresas"],
  pops: ["pops"],
  acessos: ["acessos"],
  ajuda: ["guiaRapido", "manualCompleto"],
};

const CATALOGO: NavItem[] = [
  {
    key: "registrar",
    rotulo: "Registrar",
    curto: "Registrar",
    tom: "laranja",
    grupo: "agora",
    requer: (pode) => pode("visitas.executar") && pode("evidencias.adicionar"),
  },
  { key: "inicio", rotulo: "Início", curto: "Início", tom: "indigo", grupo: "agora" },
  { key: "visitas", rotulo: "Visitas", curto: "Visitas", tom: "indigo", grupo: "agora" },
  { key: "cadastros", rotulo: "Cadastros", curto: "Cadastros", tom: "turquesa", grupo: "agora", requer: (pode) => pode("empresas.editar") },
  { key: "central", rotulo: "Central da visita", curto: "Central", tom: "azul", grupo: "agora", somenteNaVisita: true },
  {
    key: "ambientes",
    rotulo: "Ambientes",
    curto: "Ambientes",
    tom: "turquesa",
    grupo: "agora",
    somenteNaVisita: true,
    requer: (pode) => pode("visitas.executar"),
  },
  {
    key: "checklist",
    rotulo: "Checklist",
    curto: "Checklist",
    tom: "verde",
    grupo: "agora",
    requer: (pode) => pode("visitas.executar"),
  },
  {
    key: "evidencias",
    rotulo: "Evidências",
    curto: "Evidências",
    tom: "ceu",
    grupo: "agora",
    requer: (pode) => pode("evidencias.adicionar"),
  },
  {
    key: "ncs",
    rotulo: "Correções",
    curto: "Correções",
    tom: "vermelho",
    grupo: "acompanhamento",
    requer: (pode) => pode("ncs.acompanhar"),
  },
  {
    key: "plano",
    rotulo: "Plano de ação",
    curto: "Plano",
    tom: "ambar",
    grupo: "acompanhamento",
    requer: (pode) => pode("ncs.acompanhar"),
  },
  {
    key: "acompanhamento",
    rotulo: "Acompanhamento",
    curto: "Acompanhar",
    tom: "violeta",
    grupo: "acompanhamento",
    somenteNaVisita: true,
    requer: (pode) => pode("ncs.acompanhar"),
  },
  {
    key: "relatorio",
    rotulo: "Relatório",
    curto: "Relatório",
    tom: "ardosia",
    grupo: "acompanhamento",
    requer: (pode) => pode("relatorios.exportar") || pode("relatorios.aprovar"),
  },
  {
    key: "relatorios",
    rotulo: "Relatórios",
    curto: "Relatórios",
    tom: "ardosia",
    grupo: "acompanhamento",
    requer: (pode) => pode("relatorios.exportar") || pode("relatorios.aprovar"),
  },
  { key: "empresas", rotulo: "Empresas", curto: "Empresas", tom: "turquesa", grupo: "administracao" },
  {
    key: "pops",
    rotulo: "POPs e documentos",
    curto: "POPs",
    tom: "ceu",
    grupo: "administracao",
    requer: (pode) => pode("empresas.editar"),
  },
  {
    key: "acessos",
    rotulo: "Acessos",
    curto: "Acessos",
    tom: "ardosia",
    grupo: "administracao",
    requer: (pode) => pode("usuarios.gerenciar"),
  },
  { key: "ajuda", rotulo: "Ajuda e guias", curto: "Ajuda", tom: "ardosia", grupo: "administracao" },
];

const POR_CHAVE = new Map(CATALOGO.map((item) => [item.key, item]));

export function itensVisiveis(ctx: NavContexto): NavItem[] {
  return CATALOGO.filter((item) => {
    if (item.somenteNaVisita && !ctx.dentroDeVisita) return false;
    if (item.key === "cadastros" && !ctx.pode("empresas.editar")) return false;
    if (ctx.nivelTela) {
      // Registrar agora aparece quando Evidências está em Editar.
      if (item.key === "registrar") return ctx.nivelTela("evidencias") === "editar";
      const telas = TELAS_DO_ITEM[item.key];
      if (telas) return telas.some((tela) => ctx.nivelTela!(tela) !== "oculta");
    }
    return item.requer ? item.requer(ctx.pode) : true;
  });
}

/** Ordem das etapas de uma visita (cartão do menu lateral do PC). */
export const ETAPAS_ORDEM: NavKey[] = [
  "central",
  "ambientes",
  "checklist",
  "evidencias",
  "ncs",
  "plano",
  "acompanhamento",
  "relatorio",
];

/** Etapas da visita que o perfil pode usar. Fora de uma visita, lista vazia. */
export function etapasDaVisita(ctx: NavContexto): NavItem[] {
  if (!ctx.dentroDeVisita) return [];
  const visiveis = itensVisiveis(ctx);
  return ETAPAS_ORDEM.map((key) => visiveis.find((item) => item.key === key)).filter(
    (item): item is NavItem => Boolean(item)
  );
}

/** Etapas da visita no menu lateral do PC (Ambientes é o passo 1 da visita, não uma etapa do menu). */
export const ETAPAS_PC: NavKey[] = [
  "central",
  "checklist",
  "evidencias",
  "ncs",
  "plano",
  "acompanhamento",
  "relatorio",
];

/**
 * Menu lateral do PC: itens do topo, etapas da visita (só dentro dela), apoio e administração.
 * Reaproveita as mesmas regras de visibilidade por perfil.
 */
export function menuLateralPC(ctx: NavContexto): {
  topo: NavItem[];
  etapas: NavItem[];
  apoio: NavItem[];
  admin: NavItem[];
} {
  const visiveis = itensVisiveis(ctx);
  const pegar = (keys: NavKey[]) =>
    keys
      .map((key) => visiveis.find((item) => item.key === key))
      .filter((item): item is NavItem => Boolean(item));
  return {
    topo: pegar(["inicio", "visitas", "cadastros", "empresas", "pops", "relatorios"]),
    etapas: ctx.dentroDeVisita ? pegar(ETAPAS_PC) : [],
    apoio: pegar(["ajuda"]),
    admin: pegar(["acessos"]),
  };
}

export function registrarDisponivel(ctx: NavContexto): boolean {
  return itensVisiveis(ctx).some((item) => item.key === "registrar");
}

export type NavSlot = { tipo: "item"; item: NavItem } | { tipo: "mais" };

/**
 * Barra inferior do celular: 5 posições, com o Registrar no centro quando o
 * perfil pode usá-lo e o "Mais" por último. Sem Registrar, o centro é um item comum.
 */
export function barraInferior(ctx: NavContexto): NavSlot[] {
  const visiveis = itensVisiveis(ctx);
  const existe = (key: NavKey) => visiveis.find((item) => item.key === key);
  const preferidos: NavKey[] = ctx.dentroDeVisita
    ? ["central", "checklist", "ncs"]
    : ["inicio", "visitas", "empresas"];
  const reserva: NavKey[] = ctx.dentroDeVisita
    ? ["plano", "relatorio", "acompanhamento", "evidencias", "ambientes", "inicio"]
    : ["ncs", "relatorio", "ajuda", "plano", "checklist"];
  const registrar = existe("registrar");

  const escolhidos: NavItem[] = [];
  for (const key of [...preferidos, ...reserva]) {
    const item = existe(key);
    if (item && !escolhidos.includes(item)) escolhidos.push(item);
  }

  const itens = (n: number) => escolhidos.slice(0, n).map((item): NavSlot => ({ tipo: "item", item }));
  if (registrar) {
    const [a, b, c] = itens(3);
    return [a, b, { tipo: "item", item: registrar }, c, { tipo: "mais" }].filter(Boolean) as NavSlot[];
  }
  return [...itens(4), { tipo: "mais" }];
}

/**
 * Trilho do tablet (sem o Registrar, que fica em destaque no topo).
 * Fora da visita: Início, Visitas, Empresas e Acessos (ou Ajuda, quando o perfil não tem Acessos).
 * Dentro: Central, Checklist, Evidências, Correções e Relatório (Plano de ação abre a mesma tela das Correções); o resto vai para o "Mais".
 */
export function trilhoDoTablet(ctx: NavContexto): NavItem[] {
  const visiveis = itensVisiveis(ctx);
  const existe = (key: NavKey) => visiveis.find((item) => item.key === key);
  const alvo = ctx.dentroDeVisita ? 5 : 4;
  const preferidos: NavKey[] = ctx.dentroDeVisita
    ? ["central", "checklist", "evidencias", "ncs", "relatorio"]
    : ["inicio", "visitas", "empresas", "acessos"];
  const reserva: NavKey[] = ctx.dentroDeVisita
    ? ["acompanhamento", "ambientes"]
    : ["ajuda", "ncs", "relatorio"];
  const escolhidos: NavItem[] = [];
  for (const key of preferidos) {
    const item = existe(key);
    if (item) escolhidos.push(item);
  }
  for (const key of reserva) {
    if (escolhidos.length >= alvo) break;
    const item = existe(key);
    if (item && !escolhidos.includes(item)) escolhidos.push(item);
  }
  return escolhidos.slice(0, alvo);
}

/** O que vai para a folha "Mais": tudo que o perfil pode usar e não está na barra/trilho. */
export function itensDaFolhaMais(ctx: NavContexto, jaVisiveis: NavItem[]): NavItem[] {
  return itensVisiveis(ctx).filter(
    (item) => item.key !== "registrar" && !jaVisiveis.some((visivel) => visivel.key === item.key)
  );
}

export function itensDaBarra(slots: NavSlot[]): NavItem[] {
  return slots.flatMap((slot) => (slot.tipo === "item" ? [slot.item] : []));
}

/** Tela atual -> item do menu que deve aparecer como ativo. */
export function chaveAtiva(view: string): NavKey | null {
  switch (view) {
    case "inicio":
      return "inicio";
    case "ajuda":
    case "modotela":
      return "ajuda";
    case "visitas":
      return "visitas";
    case "empresas":
      return "empresas";
    case "visita":
    case "historico":
      return "central";
    case "ambientes":
    case "checklist":
    case "evidencias":
    case "ncs":
    case "plano":
    case "acompanhamento":
    case "relatorio":
    case "acessos":
    case "pops":
      return view;
    case "relatoriosemitidos":
    case "dossie":
    case "resumo":
    case "evolucao":
    case "mapa":
      return "relatorios";
    default:
      return null;
  }
}

export function itemDoMenu(key: NavKey): NavItem | undefined {
  return POR_CHAVE.get(key);
}

/** Nome para exibir sem números/CNPJ no começo ("44.150.273 Elton Volmir" → "Elton Volmir"). Não altera o dado salvo. */
export function nomeSemNumerosNoInicio(nome: string): string {
  const original = (nome || "").trim();
  const limpo = original.replace(/^[\d.\-\/\s]+/, "").trim();
  return limpo || original;
}

/** Monograma só com letras: primeiras letras das duas primeiras palavras ("Elton Volmir" → "EV"). */
export function iniciaisDaEmpresa(nome: string, reserva = "?"): string {
  const palavras = nomeSemNumerosNoInicio(nome)
    .split(/\s+/)
    .map((palavra) => palavra.replace(/[^\p{L}]/gu, ""))
    .filter(Boolean);
  const principais = palavras.filter((palavra) => palavra.length > 2);
  const escolhidas = (principais.length >= 2 ? principais : palavras).slice(0, 2);
  const letras = escolhidas.map((palavra) => palavra[0]).join("").toUpperCase();
  return letras || (reserva || "?").slice(0, 1).toUpperCase() || "?";
}
