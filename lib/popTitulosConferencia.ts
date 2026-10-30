// Título curto de cada item de conferência dos modelos de POP (rodada 12f). O texto completo continua em `pendencias` do catálogo
// (lib/modelos/popsModelosDados.ts, gerado); aqui fica só o título, na MESMA ordem das pendências de cada modelo.
// POP já criado não é alterado: o título é achado pelo modelo de origem e pela posição do item, ou pelo trecho até os dois-pontos.
import type { ProcedimentoOperacionalPadronizado } from "../types/index.ts";

const ACOES = "Ações corretivas: decidir se mantém";
const ALCOOL = "Álcool 70: padronizar a escrita";
const RODO = "Rodo: decidir se entra na lista";

export const TITULOS_DAS_PENDENCIAS: Record<string, string[]> = {
  "comp-01": ["Objetivos: adaptar ao serviço de alimentação", ACOES],
  "comp-02": ["Retirar os itens: reescrever a frase", "Limpeza interna: reescrever a frase", "Religar: confirmar o tempo de espera", ACOES, ALCOOL],
  "comp-03": [ACOES, ALCOOL],
  "comp-04": ["Solução clorada: conferir concentração e tempo", ACOES, ALCOOL],
  "comp-05": [ACOES, ALCOOL],
  "comp-06": ["Solução clorada: conferir a concentração", RODO, ACOES],
  "comp-07": ["Solução clorada: informar a concentração", ACOES, ALCOOL, "Dois sanitizantes: decidir qual manter"],
  "comp-08": ["Água sanitária: informar a concentração", RODO, ACOES],
  "comp-09": ["Pano específico: incluir na lista ou ajustar", ACOES, ALCOOL],
  "comp-10": ["Pano específico: incluir na lista ou ajustar", ACOES, ALCOOL],
  "comp-11": [ACOES, ALCOOL],
  "comp-12": ["Pano e solução clorada: completar", ACOES],
  "comp-13": ["Segurança elétrica: confirmar com o RT", ACOES, ALCOOL],
  "comp-14": [ACOES, ALCOOL],
  "comp-15": ["Panos para secagem: conferir na norma", ACOES, "Água sanitária: informar a concentração", "Água sanitária: usar num passo ou retirar"],
  "comp-16": ["Temperaturas de recebimento: conferir a fonte", "Cargos: adaptar aos da empresa"],
  "comp-17": ["PVPS: explicar a sigla"],
  "comp-18": ["Temperaturas: conferir e informar", "Cuidados especiais: tirar a repetição", ACOES],
  "comp-19": ["Tempos e temperaturas: conferir a fonte", "Micro-ondas: conferir a frase", "Procedimentos: padronizar o tom", "Ações corretivas: conferir o sentido", "Responsabilidades: adaptar à empresa", "Definições: conferir a fonte"],
  "res-01": ["Cargos: adaptar a cada empresa", "Recibo e laudo: conferir a palavra", "Definições: conferir a fonte", "Coleta especializada: avaliar anexar o POP", "DML: explicar a sigla", "Frequências: ajustar à empresa", "Ações corretivas: conferir se basta"]
};

/** Título curto gravado em POP novo: o do modelo, na posição da pendência; vazio quando o modelo não tem título para ela. */
export function tituloDaPendencia(modeloId: string, indice: number): string {
  return TITULOS_DAS_PENDENCIAS[modeloId]?.[indice] || "";
}

/** Trecho até os dois-pontos (sem "Procedimento (…)" solto): serve de título quando o item não tem um. */
export function tituloPeloTrecho(texto: string): string {
  const frase = (texto || "").trim();
  const corte = frase.indexOf(":");
  const trecho = corte > 0 ? frase.slice(0, corte) : frase;
  return trecho.length > 60 ? `${trecho.slice(0, 57).trimEnd()}…` : trecho;
}

type PopComItens = Pick<ProcedimentoOperacionalPadronizado, "origemModelo" | "itensAConferir">;

/** Título que a ficha mostra: o gravado no item, o do modelo de origem na mesma posição, ou o trecho até os dois-pontos. */
export function tituloDoItemAConferir(pop: PopComItens, indice: number): string {
  const item = (pop.itensAConferir || [])[indice];
  if (!item) return "";
  const gravado = (item.titulo || "").trim();
  if (gravado) return gravado;
  const doModelo = pop.origemModelo ? tituloDaPendencia(pop.origemModelo.id, indice) : "";
  return doModelo || tituloPeloTrecho(item.texto);
}
