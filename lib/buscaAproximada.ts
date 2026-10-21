// Correspondência aproximada para a busca por voz: a transcrição erra nomes próprios ("autonvolmir estrapazon" por "Elton Volmir Strapazon").
// Compara por PALAVRAS, sem acento nem caixa: uma palavra forte do candidato casa com uma dita se for igual, se uma contiver a outra
// ("volmir" em "autonvolmir") ou se a distância de edição for pequena ("strapazon" e "estrapazon"). Basta casar a maior parte das palavras fortes.
import { distanciaEdicao, normalizar } from "./commandSearch.ts";

const PALAVRAS_FRACAS = new Set(["a", "o", "as", "os", "da", "de", "do", "das", "dos", "e", "em", "na", "no", "ao", "ltda", "me", "epp", "sa", "s"]);

export function palavrasDe(texto: string): string[] {
  return normalizar(texto).split(" ").filter(Boolean);
}

/** Palavras que carregam o nome (sem conectores e siglas de empresa). */
export function palavrasFortes(texto: string): string[] {
  return palavrasDe(texto).filter((palavra) => palavra.length >= 3 && !PALAVRAS_FRACAS.has(palavra));
}

export type TipoDeCasamento = "exato" | "aproximado" | null;

/** Uma palavra dita contra uma palavra do candidato. */
export function casarPalavra(dita: string, alvo: string): TipoDeCasamento {
  if (dita === alvo) return "exato";
  if (alvo.length >= 5 && dita.length >= 5 && (dita.includes(alvo) || alvo.includes(dita))) return "aproximado";
  const limite = alvo.length >= 8 ? 2 : alvo.length >= 5 ? 1 : 0;
  return limite > 0 && distanciaEdicao(dita, alvo) <= limite ? "aproximado" : null;
}

export type Correspondencia = { pontos: number; casadas: number; total: number; exata: boolean };

/** Quanto o texto dito se parece com o rótulo; null quando não passa do mínimo (a maior parte das palavras fortes, pelo menos uma). */
export function compararComRotulo(texto: string, rotulo: string): Correspondencia | null {
  const alvos = palavrasFortes(rotulo);
  const ditas = palavrasDe(texto);
  if (alvos.length === 0 || ditas.length === 0) return null;
  let casadas = 0;
  let exatas = 0;
  for (const alvo of alvos) {
    let melhor: TipoDeCasamento = null;
    for (const dita of ditas) {
      const tipo = casarPalavra(dita, alvo);
      if (tipo === "exato") {
        melhor = "exato";
        break;
      }
      if (tipo === "aproximado") melhor = "aproximado";
    }
    if (melhor) casadas += 1;
    if (melhor === "exato") exatas += 1;
  }
  const minimo = Math.max(1, Math.ceil(alvos.length * 0.6));
  if (casadas < minimo) return null;
  return { pontos: casadas / alvos.length, casadas, total: alvos.length, exata: exatas === alvos.length };
}

export type Candidato<T> = { item: T; rotulo: string };

/** O melhor candidato, só quando é claramente melhor que o segundo (empate não escolhe nenhum). `exata` diz se todas as palavras fortes bateram sem erro. */
export function melhorCandidato<T>(texto: string, candidatos: Candidato<T>[]): { item: T; rotulo: string; exata: boolean } | null {
  const comparados = candidatos
    .map((candidato) => ({ candidato, correspondencia: compararComRotulo(texto, candidato.rotulo) }))
    .filter((par): par is { candidato: Candidato<T>; correspondencia: Correspondencia } => par.correspondencia !== null)
    .sort((a, b) => b.correspondencia.pontos - a.correspondencia.pontos);
  if (comparados.length === 0) return null;
  const [primeiro, segundo] = comparados;
  if (segundo && segundo.correspondencia.pontos >= primeiro.correspondencia.pontos) return null;
  return { item: primeiro.candidato.item, rotulo: primeiro.candidato.rotulo, exata: primeiro.correspondencia.exata };
}
