// Subtítulos nos passos do POP: um passo pode abrir um grupo com subtítulo; a numeração reinicia em cada grupo.
import type { PassoPop } from "../types/index.ts";

type PassoComSubtitulo = Pick<PassoPop, "subtitulo">;

const limpo = (texto: string | undefined) => (texto || "").replace(/\s+/g, " ").trim();

/** Subtítulo em vigor em cada passo: o próprio, quando tem; senão o do passo anterior (vazio no começo). */
export function subtitulosEmVigor(passos: PassoComSubtitulo[]): string[] {
  let atual = "";
  return passos.map((passo) => {
    const proprio = limpo(passo.subtitulo);
    if (proprio) atual = proprio;
    return atual;
  });
}

/** Passo que começa um grupo: o subtítulo em vigor muda em relação ao passo anterior. */
export function inicioDeGrupo(passos: PassoComSubtitulo[]): boolean[] {
  const emVigor = subtitulosEmVigor(passos);
  return emVigor.map((subtitulo, indice) => Boolean(subtitulo) && subtitulo !== (indice === 0 ? "" : emVigor[indice - 1]));
}

/** Número de cada passo, reiniciando em 1 no começo de cada grupo com subtítulo. */
export function numerosDosPassos(passos: PassoComSubtitulo[]): number[] {
  const inicios = inicioDeGrupo(passos);
  let numero = 0;
  return passos.map((_, indice) => {
    numero = inicios[indice] ? 1 : numero + 1;
    return numero;
  });
}

/** Tira o campo de subtítulo dos passos em que ficou em branco (o JSON só guarda o que foi escrito). */
export function semSubtitulosVazios(passos: PassoPop[]): PassoPop[] {
  return passos.map((passo) => {
    if (passo.subtitulo === undefined) return passo;
    const { subtitulo, ...resto } = passo;
    return limpo(subtitulo) ? { ...resto, subtitulo: limpo(subtitulo) } : resto;
  });
}
