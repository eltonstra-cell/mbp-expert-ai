// Central da Empresa: 3 grupos com sub-abas. Só o modelo (quem aparece, para onde vão as rotas antigas, o que lembrar).

export type SubAbaCentral = "dados" | "norma" | "privacidade" | "ambientes" | "equipamentos" | "fluxos" | "manual" | "pops" | "programas" | "comprovantes" | "pessoas";
export type GrupoCentral = "empresa" | "estrutura" | "documentos";

export const ROTULO_DA_SUBABA: Record<SubAbaCentral, string> = {
  dados: "Dados",
  norma: "Norma aplicável",
  privacidade: "Privacidade",
  ambientes: "Ambientes e equipamentos",
  equipamentos: "Equipamentos",
  fluxos: "Fluxos",
  manual: "Manual",
  pops: "POPs",
  programas: "Programas",
  comprovantes: "Comprovantes",
  pessoas: "Pessoas",
};

export const GRUPOS_DA_CENTRAL: { id: GrupoCentral; rotulo: string; subabas: SubAbaCentral[] }[] = [
  { id: "empresa", rotulo: "Empresa", subabas: ["dados", "norma", "privacidade"] },
  // O id interno continua "estrutura". Ambientes e equipamentos são uma página só (a sub-aba "equipamentos" ainda existe como alias).
  { id: "estrutura", rotulo: "Estrutura", subabas: ["ambientes", "equipamentos", "fluxos"] },
  { id: "documentos", rotulo: "Documentos", subabas: ["manual", "pops", "programas", "comprovantes", "pessoas"] },
];

export const SUBABA_PADRAO: SubAbaCentral = "dados";

export function grupoDaSubaba(subaba: SubAbaCentral): GrupoCentral {
  return GRUPOS_DA_CENTRAL.find((grupo) => grupo.subabas.includes(subaba))!.id;
}

type GrupoVisivel = { id: GrupoCentral; rotulo: string; subabas: SubAbaCentral[] };

/** Opções do menu "Documentos ▾" da barra do topo: uma por grupo que o perfil enxerga; a atual vem marcada (fundo creme e ✓). */
export function opcoesDoSeletorDeSecao(grupos: GrupoVisivel[], subabaAtual: SubAbaCentral): { id: GrupoCentral; rotulo: string; atual: boolean }[] {
  const atual = grupoDaSubaba(subabaAtual);
  return grupos.map((grupo) => ({ id: grupo.id, rotulo: grupo.rotulo, atual: grupo.id === atual }));
}

/** Escolher uma seção no menu leva à primeira aba dela; escolher a que já está aberta não muda nada (null). */
export function subabaAoEscolherSecao(grupos: GrupoVisivel[], escolhida: GrupoCentral, subabaAtual: SubAbaCentral): SubAbaCentral | null {
  if (escolhida === grupoDaSubaba(subabaAtual)) return null;
  return grupos.find((grupo) => grupo.id === escolhida)?.subabas[0] ?? null;
}

export type QuemVe = {
  /** Cria e edita empresas (Administrador e RT). */
  editar: boolean;
  verComprovantes: boolean;
  gerenciarPessoas: boolean;
};

/** Sub-abas que o perfil enxerga. Quem não edita só tem POPs, Comprovantes e Pessoas, dentro de Documentos. */
export function subabasVisiveis(quem: QuemVe): SubAbaCentral[] {
  const todas = GRUPOS_DA_CENTRAL.flatMap((grupo) => grupo.subabas);
  return todas.filter((subaba) => {
    if (subaba === "comprovantes") return quem.verComprovantes;
    if (subaba === "pessoas") return quem.gerenciarPessoas;
    if (subaba === "pops") return true;
    return quem.editar;
  });
}

export function gruposVisiveis(quem: QuemVe): { id: GrupoCentral; rotulo: string; subabas: SubAbaCentral[] }[] {
  const visiveis = new Set(subabasVisiveis(quem));
  return GRUPOS_DA_CENTRAL.map((grupo) => ({ ...grupo, subabas: grupo.subabas.filter((subaba) => visiveis.has(subaba)) })).filter((grupo) => grupo.subabas.length > 0);
}

/** Rotas e chaves antigas (oito seções e telas soltas) levam para o grupo e a sub-aba novos. */
export function destinoDaRotaAntiga(chave: string | null | undefined): SubAbaCentral | null {
  switch (chave) {
    case "dados":
    case "norma":
    case "privacidade":
    case "ambientes":
    case "equipamentos":
    case "fluxos":
    case "manual":
    case "pops":
    case "programas":
    case "comprovantes":
    case "pessoas":
      return chave;
    case "registros":
    case "treinamento":
    case "popsdocumentos":
      return "pops";
    default:
      return null;
  }
}

/** A sub-aba pedida, senão a lembrada, senão a primeira permitida; sempre uma que o perfil enxerga. */
export function resolverSubaba(pedida: SubAbaCentral | null | undefined, lembrada: SubAbaCentral | null | undefined, visiveis: SubAbaCentral[]): SubAbaCentral {
  if (pedida && visiveis.includes(pedida)) return pedida;
  if (lembrada && visiveis.includes(lembrada)) return lembrada;
  return visiveis.includes(SUBABA_PADRAO) ? SUBABA_PADRAO : visiveis[0] || SUBABA_PADRAO;
}

const CHAVE_DO_ARMAZEM = "mbp-central-ultima-aba";

type Armazem = Pick<Storage, "getItem" | "setItem">;

function armazemPadrao(): Armazem | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Último grupo e sub-aba abertos, por empresa (estado local; falha de armazenamento nunca quebra a tela). */
export function lerSubabaLembrada(empresaId: string, armazem: Armazem | null = armazemPadrao()): SubAbaCentral | null {
  try {
    const mapa = JSON.parse(armazem?.getItem(CHAVE_DO_ARMAZEM) || "{}") as Record<string, string>;
    return destinoDaRotaAntiga(mapa?.[empresaId]);
  } catch {
    return null;
  }
}

export function lembrarSubaba(empresaId: string, subaba: SubAbaCentral, armazem: Armazem | null = armazemPadrao()): void {
  try {
    if (!armazem) return;
    let mapa: Record<string, string> = {};
    try {
      mapa = JSON.parse(armazem.getItem(CHAVE_DO_ARMAZEM) || "{}") || {};
    } catch {
      mapa = {};
    }
    mapa[empresaId] = subaba;
    armazem.setItem(CHAVE_DO_ARMAZEM, JSON.stringify(mapa));
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

/** Sub-abas que viram blocos da segunda barra: "equipamentos" não tem bloco próprio (é a mesma página de "ambientes"). */
export function subabasDaBarra(subabas: SubAbaCentral[]): SubAbaCentral[] {
  return subabas.filter((subaba) => subaba !== "equipamentos");
}

/** O bloco que aparece selecionado na segunda barra. */
export function blocoAtivoDaBarra(subaba: SubAbaCentral): SubAbaCentral {
  return subaba === "equipamentos" ? "ambientes" : subaba;
}
