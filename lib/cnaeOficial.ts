// Consulta à tabela oficial de subclasses CNAE (IBGE/CONCLA; dados em cnaeSubclassesOficiais.ts, que não se edita à mão).
// Serve só para (1) saber se o código de 7 dígitos existe e (2) preencher a descrição a partir do código.
import { CNAE_SUBCLASSES_OFICIAIS } from "./cnaeSubclassesOficiais.ts";

const somenteDigitos = (valor: unknown): string => String(valor ?? "").replace(/\D/g, "");

let mapa: Map<string, string> | null = null;
function tabela(): Map<string, string> {
  if (!mapa) mapa = new Map(CNAE_SUBCLASSES_OFICIAIS.map(([codigo, denominacao]) => [codigo, denominacao]));
  return mapa;
}

/** O código (com ou sem pontuação, 7 dígitos) existe na tabela oficial? */
export const cnaeExisteNaTabelaOficial = (codigo: unknown): boolean => {
  const digitos = somenteDigitos(codigo);
  return digitos.length === 7 && tabela().has(digitos);
};

/** Denominação oficial como publicada (maiúsculas); vazio se o código não existe. */
export const denominacaoOficialDoCnae = (codigo: unknown): string => tabela().get(somenteDigitos(codigo)) || "";

// Siglas que ficam em maiúsculas na denominação oficial (única lista de exceções; "DVDS"/"CDS" viram "DVDs"/"CDs").
const SIGLAS = new Set(["OSCIP", "WEB", "GLP", "UTI", "ECG", "EEG", "AIDS", "OTM", "STFC", "SRTT", "SCM", "SME", "VOIP", "TV", "CD", "DVD"]);

/** "FABRICAÇÃO DE PÃO" -> "Fabricação de pão": minúsculas, primeira letra maiúscula, siglas mantidas. O dado oficial não é alterado. */
export function capitalizarDenominacao(texto: string): string {
  const palavras = String(texto ?? "").replace(/[\p{L}\p{N}.]+/gu, (palavra) => {
    if (SIGLAS.has(palavra)) return palavra;
    if (/^[A-Z]{2,3}S$/.test(palavra) && SIGLAS.has(palavra.slice(0, -1))) return `${palavra.slice(0, -1)}s`;
    if (/^(\p{Lu}\.){2,}$/u.test(palavra)) return palavra;
    return palavra.toLocaleLowerCase("pt-BR");
  });
  return palavras.charAt(0).toLocaleUpperCase("pt-BR") + palavras.slice(1);
}

/** Descrição para exibir e gravar quando o código existe na tabela oficial; "" se não existe. */
export const descricaoOficialLegivelDoCnae = (codigo: unknown): string => capitalizarDenominacao(denominacaoOficialDoCnae(codigo));

export type DescricaoGuardada = { digitos: string; texto: string } | null;

/** Ao abrir uma empresa: código que existe na tabela oficial mostra a descrição oficial (vazia ou diferente da salva); senão fica a salva. Nada é gravado até salvar. */
export const descricaoAoAbrirEmpresa = (cnae: unknown, cnaeDescricao: unknown): string => descricaoOficialLegivelDoCnae(cnae) || String(cnaeDescricao ?? "");

/**
 * Decide a descrição quando o código do CNAE muda (campo da descrição é somente leitura):
 * - código que existe na tabela oficial: a descrição oficial;
 * - código parcial ou inexistente: a descrição ORIGINAL desse mesmo código (a guardada, ou a salva na empresa, ou a da consulta que ficou guardada) ou vazio;
 * - a descrição que estava na tela fica guardada em memória (com o código dela) e volta se aquele código voltar. Nada disso grava sozinho.
 */
export function descricaoAoMudarCodigo(entrada: {
  codigoNovo: string;
  codigoAtual: string;
  descricaoAtual: string;
  salva?: { cnae?: string; cnaeDescricao?: string };
  guardada: DescricaoGuardada;
}): { descricao: string; guardada: DescricaoGuardada; mudou: boolean } {
  const novos = somenteDigitos(entrada.codigoNovo);
  const atuais = somenteDigitos(entrada.codigoAtual);
  if (novos === atuais) return { descricao: entrada.descricaoAtual, guardada: entrada.guardada, mudou: false };
  const original =
    entrada.guardada && entrada.guardada.digitos === novos
      ? entrada.guardada.texto
      : entrada.salva && somenteDigitos(entrada.salva.cnae) === novos
        ? entrada.salva.cnaeDescricao || ""
        : "";
  const guardada = entrada.descricaoAtual.trim() && atuais ? { digitos: atuais, texto: entrada.descricaoAtual } : entrada.guardada;
  return { descricao: descricaoOficialLegivelDoCnae(entrada.codigoNovo) || original, guardada, mudou: true };
}
