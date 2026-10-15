export type PassoVisita = "central" | "checklist" | "evidencias" | "correcoes" | "pops" | "relatorio";

export type DadosTrilha = {
  respondidos: number;
  total: number;
  evidencias: number;
  correcoesAbertas: number;
  popsPendentes: number;
};

export type PassoTrilha = {
  chave: PassoVisita;
  numero: number;
  rotulo: string;
  /** Texto da pílula laranja; null quando não há nada a mostrar. */
  contador: string | null;
};

/** Tela (`view` de app/page.tsx) de cada passo da trilha. */
export const VIEW_DO_PASSO: Record<PassoVisita, string> = {
  central: "visita",
  checklist: "checklist",
  evidencias: "evidencias",
  correcoes: "correcoes",
  pops: "popsvisita",
  relatorio: "relatorio",
};

/** Qual passo da trilha está ativo em cada tela; null quando a tela não pertence à trilha. */
export function passoDaView(view: string): PassoVisita | null {
  switch (view) {
    case "visita":
      return "central";
    case "checklist":
      return "checklist";
    case "evidencias":
      return "evidencias";
    case "correcoes":
    case "ncs":
    case "plano":
    case "acompanhamento":
      return "correcoes";
    case "popsvisita":
      return "pops";
    case "relatorio":
      return "relatorio";
    default:
      return null;
  }
}

export function percentualDaVisita(respondidos: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((respondidos / total) * 100)));
}

const contarOuNada = (valor: number) => (valor > 0 ? String(valor) : null);

export function passosDaTrilha(dados: DadosTrilha): PassoTrilha[] {
  return [
    { chave: "central", numero: 1, rotulo: "Central da visita", contador: null },
    { chave: "checklist", numero: 2, rotulo: "Checklist", contador: `${dados.respondidos}/${dados.total}` },
    { chave: "evidencias", numero: 3, rotulo: "Evidências", contador: contarOuNada(dados.evidencias) },
    { chave: "correcoes", numero: 4, rotulo: "Correções", contador: contarOuNada(dados.correcoesAbertas) },
    { chave: "pops", numero: 5, rotulo: "POPs da visita", contador: contarOuNada(dados.popsPendentes) },
    { chave: "relatorio", numero: 6, rotulo: "Relatório", contador: null },
  ];
}
