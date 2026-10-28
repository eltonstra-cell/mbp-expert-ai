// "Revisado" por página de Cadastros (Ambientes, Equipamentos, Fluxos): quem revisou, quando e se algo mudou depois.
// Só quem edita a empresa (Administrador e RT, os mesmos que enxergam a página) marca; qualquer alteração depois da revisão pede nova revisão.
import type { Empresa } from "../types/index.ts";

export type PaginaDeCadastro = "ambientes" | "equipamentos" | "fluxos";
export const PAGINAS_DE_CADASTRO: PaginaDeCadastro[] = ["ambientes", "equipamentos", "fluxos"];
export const ROTULO_DA_PAGINA: Record<PaginaDeCadastro, string> = { ambientes: "Ambientes", equipamentos: "Equipamentos", fluxos: "Fluxos" };

export const ePaginaDeCadastro = (valor: string | null | undefined): valor is PaginaDeCadastro => PAGINAS_DE_CADASTRO.includes(valor as PaginaDeCadastro);

export type RevisaoDeCadastro = { nome: string; cargo?: string; usuarioId?: string; em: string; assinatura: string };

function resumo(texto: string): string {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Assinatura do que a página guarda HOJE na empresa (o que foi salvo, não o que está na tela). */
export function assinaturaDaPagina(empresa: Pick<Empresa, "setoresManual" | "setorOficialDoAmbiente" | "modelosQuestionarioAmbientes" | "equipamentosSetores" | "fluxosOperacionais">, pagina: PaginaDeCadastro): string {
  const ordenado = (mapa: Record<string, string> | undefined) => Object.entries(mapa || {}).sort(([a], [b]) => a.localeCompare(b));
  if (pagina === "ambientes") return resumo(JSON.stringify([[...(empresa.setoresManual || [])].sort(), ordenado(empresa.setorOficialDoAmbiente), ordenado(empresa.modelosQuestionarioAmbientes)]));
  if (pagina === "equipamentos") return resumo(JSON.stringify([...(empresa.equipamentosSetores || [])].sort((a, b) => a.id.localeCompare(b.id)).map((item) => [item.id, item.setor, item.nome, item.quantidade, item.observacao, ...(item.limiteTemperaturaId ? [item.limiteTemperaturaId] : [])])));
  // O limite de temperatura entra na assinatura só quando existe: revisão antiga de equipamento sem limite continua em dia.
  return resumo(JSON.stringify([...(empresa.fluxosOperacionais || [])].sort((a, b) => a.id.localeCompare(b.id)).map((item) => [item.id, item.aplicavel, item.setorVinculado, item.descricao, item.responsavel, item.controlesRegistros])));
}

export type SituacaoDaRevisao = "nunca" | "em-dia" | "desatualizada";

export function situacaoDaRevisao(revisao: RevisaoDeCadastro | undefined, assinaturaAtual: string): SituacaoDaRevisao {
  if (!revisao) return "nunca";
  return revisao.assinatura === assinaturaAtual ? "em-dia" : "desatualizada";
}

/** Marca a página como revisada (devolve uma empresa nova; as outras páginas ficam como estão). */
export function marcarComoRevisado(empresa: Empresa, pagina: PaginaDeCadastro, quem: { nome: string; cargo?: string; id?: string }, agora: string): Empresa {
  const revisao: RevisaoDeCadastro = { nome: quem.nome, ...(quem.cargo ? { cargo: quem.cargo } : {}), ...(quem.id ? { usuarioId: quem.id } : {}), em: agora, assinatura: assinaturaDaPagina(empresa, pagina) };
  return { ...empresa, cadastrosRevisados: { ...(empresa.cadastrosRevisados || {}), [pagina]: revisao } };
}

/** Texto curto do selo da página. */
export function textoDaRevisao(revisao: RevisaoDeCadastro | undefined, situacao: SituacaoDaRevisao, formatarData: (iso: string) => string): string {
  if (!revisao || situacao === "nunca") return "Ainda não revisado";
  const quem = [revisao.nome, revisao.cargo].filter(Boolean).join(", ");
  return situacao === "em-dia" ? `Revisado por ${quem} em ${formatarData(revisao.em)}` : `Alterado depois da revisão de ${formatarData(revisao.em)} (${quem}). Revise de novo.`;
}
