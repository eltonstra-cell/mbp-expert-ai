// Nomes de ambiente na tela: conflito ao criar um ambiente próprio e rótulo "(próprio)" quando dois ambientes mostram o mesmo nome.
// O vínculo de um equipamento com o ambiente é o nome COMPLETO gravado em setoresManual (único na lista), então "Cozinha" (próprio) e
// "Cozinha / Produção" (oficial) são dois setores distintos mesmo mostrando o mesmo nome curto; este módulo só cuida do texto.
import { SETORES_OFICIAIS_MANUAL, normalizarSetorManual } from "./manualBase.ts";
import { nomeCurtoDoSetor, nomeExibidoDoSetor } from "./tiposDeEstabelecimento.ts";

/** Sem acento, sem diferença de maiúscula e com espaços normalizados. */
export const chaveDeNomeDeAmbiente = (nome: string): string =>
  String(nome ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();

export const ehSetorOficial = (setor: string): boolean => (SETORES_OFICIAIS_MANUAL as readonly string[]).includes(setor);

/** Setor oficial que o nome já designa pelos apelidos do catálogo ("Copa", "Churrasqueira", "Pré-preparo"... viram o oficial ao recarregar). */
export function oficialPorApelido(nome: string): string | undefined {
  const texto = String(nome ?? "").trim();
  if (!texto) return undefined;
  const apelido = normalizarSetorManual(texto);
  return apelido !== texto && ehSetorOficial(apelido) ? apelido : undefined;
}

export type ConflitoDeNome = { tipo: "oficial"; setor: string; marcado: boolean } | { tipo: "proprio"; setor: string };

/**
 * UMA função para criar, renomear e criar por voz: nome que repete um setor oficial (nome completo, curto ou apelido do catálogo, ex.: "Cozinha" ou "Churrasqueira" = "Cozinha / Produção")
 * ou outro ambiente próprio da empresa. Vazio ou nome novo: null.
 */
export function conflitoDeNomeNovo(nome: string, setores: string[]): ConflitoDeNome | null {
  const chave = chaveDeNomeDeAmbiente(nome);
  if (!chave) return null;
  const oficial = SETORES_OFICIAIS_MANUAL.find((setor) => chaveDeNomeDeAmbiente(setor) === chave || chaveDeNomeDeAmbiente(nomeCurtoDoSetor(setor)) === chave || chaveDeNomeDeAmbiente(nomeExibidoDoSetor(setor)) === chave) || oficialPorApelido(nome);
  if (oficial && setores.includes(oficial)) return { tipo: "oficial", setor: oficial, marcado: true };
  const proprio = setores.find((setor) => !ehSetorOficial(setor) && chaveDeNomeDeAmbiente(setor) === chave);
  if (proprio) return { tipo: "proprio", setor: proprio };
  return oficial ? { tipo: "oficial", setor: oficial, marcado: false } : null;
}

/** Mensagem na hora, abaixo do campo. Vazio quando o nome está livre. */
export function mensagemDoConflito(conflito: ConflitoDeNome | null): string {
  if (!conflito) return "";
  if (conflito.tipo === "proprio") return "Já existe um ambiente com este nome";
  return conflito.marcado ? `Já existe o setor oficial ${conflito.setor}` : `Esse nome é o setor oficial ${conflito.setor}`;
}

/**
 * Nome curto para listas. Quando um ambiente PRÓPRIO mostra o mesmo nome de outro da lista (ex.: "Cozinha" próprio e o oficial "Cozinha / Produção",
 * cujo nome curto é "Cozinha"), o próprio ganha "(próprio)". O oficial nunca muda.
 */
export function rotuloDoSetor(setor: string, setores: string[]): string {
  const curto = nomeExibidoDoSetor(setor);
  if (ehSetorOficial(setor)) return curto;
  const repete = setores.some((outro) => outro !== setor && chaveDeNomeDeAmbiente(nomeExibidoDoSetor(outro)) === chaveDeNomeDeAmbiente(curto));
  return repete ? `${curto} (próprio)` : curto;
}
