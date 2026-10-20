export type DestinoConferencia = "checklist" | "correcoes" | "evidencias" | "pops" | "empresa";

export type LinhaConferencia = {
  chave: DestinoConferencia;
  rotulo: string;
  ok: boolean;
  resumo: string;
  /** Texto do botão que leva à tela do problema. */
  acao: string;
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
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function conferenciaDoRelatorio(dados: DadosConferencia): LinhaConferencia[] {
  const checklistOk = dados.totalChecklist > 0 && dados.respondidos >= dados.totalChecklist;
  const planoOk = dados.ncsSemResponsavelOuPrazo === 0;
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
