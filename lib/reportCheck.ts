export type DestinoConferencia = "checklist" | "correcoes" | "evidencias" | "pops" | "empresa" | "assinatura";

export type LinhaConferencia = {
  chave: DestinoConferencia;
  rotulo: string;
  ok: boolean;
  resumo: string;
  /** Texto do botão que leva à tela do problema; null quando a pessoa não tem acesso à tela (veja "semAcao"). */
  acao: string | null;
  /** Texto no lugar do botão quando a pessoa não pode resolver sozinha. */
  semAcao?: string;
};

export type DadosConferencia = {
  respondidos: number;
  totalChecklist: number;
  ncsAbertas: number;
  ncsSemResponsavelOuPrazo: number;
  evidencias: number;
  evidenciasTexto?: string;
  popsPendentes: number;
  popsSugeridos: number;
  cadastroPreenchidos: number;
  cadastroTotal: number;
  /** Quem assina o relatório (nome, cargo e CRN) e se a pessoa que olha pode abrir o cadastro (Acessos). Sem isso, a linha não aparece. */
  assinatura?: { nome?: string; cargo?: string; crn?: string; podeAbrirCadastro: boolean };
};

/** Falta alguma coisa na assinatura? Devolve o que falta ("cargo e CRN"), ou vazio quando está completa. */
export function faltasDaAssinatura(assinatura: { nome?: string; cargo?: string; crn?: string }): string {
  const faltas = [!(assinatura.nome || "").trim() && "nome", !(assinatura.cargo || "").trim() && "cargo", !(assinatura.crn || "").trim() && "CRN"].filter((item): item is string => Boolean(item));
  if (faltas.length <= 1) return faltas.join("");
  return `${faltas.slice(0, -1).join(", ")} e ${faltas[faltas.length - 1]}`;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function conferenciaDoRelatorio(dados: DadosConferencia): LinhaConferencia[] {
  const checklistOk = dados.totalChecklist > 0 && dados.respondidos >= dados.totalChecklist;
  const planoOk = dados.ncsSemResponsavelOuPrazo === 0;
  const faltaNaAssinatura = dados.assinatura ? faltasDaAssinatura(dados.assinatura) : "";
  const linhaDaAssinatura: LinhaConferencia[] = dados.assinatura
    ? [
        {
          chave: "assinatura",
          rotulo: "Responsável pela assinatura: nome, cargo e CRN",
          ok: !faltaNaAssinatura,
          resumo: faltaNaAssinatura ? `Falta ${faltaNaAssinatura}` : [dados.assinatura.nome, dados.assinatura.cargo, dados.assinatura.crn].map((texto) => (texto || "").trim()).join(" · "),
          acao: dados.assinatura.podeAbrirCadastro ? "Abrir cadastro" : null,
          ...(dados.assinatura.podeAbrirCadastro ? {} : { semAcao: "Peça ao Administrador" }),
        },
      ]
    : [];
  return [
    {
      chave: "checklist",
      rotulo: "Checklist respondido",
      ok: checklistOk,
      resumo: `${dados.respondidos} de ${dados.totalChecklist} ${dados.totalChecklist === 1 ? "item respondido" : "itens respondidos"}`,
      acao: "Abrir checklist",
    },
    {
      chave: "correcoes",
      rotulo: "Correções com plano",
      ok: planoOk,
      resumo: planoOk
        ? dados.ncsAbertas > 0
          ? `${plural(dados.ncsAbertas, "não conformidade aberta", "não conformidades abertas")}, todas com responsável e prazo`
          : "Nenhuma não conformidade aberta"
        : `${plural(dados.ncsSemResponsavelOuPrazo, "não conformidade", "não conformidades")} sem responsável ou prazo`,
      acao: "Abrir correções",
    },
    {
      chave: "evidencias",
      rotulo: "Evidências",
      ok: dados.evidencias > 0,
      resumo: dados.evidencias > 0 ? dados.evidenciasTexto || plural(dados.evidencias, "evidência registrada", "evidências registradas") : "Nenhuma evidência registrada",
      acao: "Abrir evidências",
    },
    {
      chave: "pops",
      rotulo: "POPs da visita",
      ok: dados.popsPendentes === 0,
      resumo:
        dados.popsPendentes === 0
          ? dados.popsSugeridos > 0
            ? "Todos os POPs sugeridos estão criados"
            : "Nenhum POP sugerido para esta visita"
          : `${plural(dados.popsPendentes, "POP pendente", "POPs pendentes")} (sem POP criado ou em rascunho)`,
      acao: "Abrir POPs da visita",
    },
    {
      chave: "empresa",
      rotulo: "Cadastro da empresa",
      ok: dados.cadastroTotal > 0 && dados.cadastroPreenchidos >= dados.cadastroTotal,
      resumo: `${dados.cadastroPreenchidos} de ${dados.cadastroTotal} itens do cadastro preenchidos`,
      acao: "Abrir cadastro",
    },
    ...linhaDaAssinatura,
  ];
}

export function pendenciasDoRelatorio(linhas: LinhaConferencia[]): number {
  return linhas.filter((linha) => !linha.ok).length;
}

export function mensagemDoRelatorio(pendencias: number): { pronto: boolean; texto: string } {
  if (pendencias === 0) return { pronto: true, texto: "Tudo conferido: o relatório está pronto para emitir." };
  return {
    pronto: false,
    texto: `Ainda não está pronto para emitir: ${plural(pendencias, "pendência", "pendências")}. Você pode emitir como relatório parcial.`,
  };
}
