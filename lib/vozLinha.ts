// Linha única da Observação do checklist: Foto, Falar e IA, nesta ordem.

export type EstadoVoz = "ocioso" | "gravando" | "transcrevendo";

export const ORDEM_DA_LINHA = ["foto", "falar", "ia"] as const;

export type EstadoDaLinha = {
  foto: { desativado: boolean; apagado: boolean };
  falar: { modo: "botao" | "barra"; desativado: boolean };
  ia: { desativado: boolean; apagado: boolean };
};

/** Enquanto grava, Foto e IA ficam apagadas e desativadas; o Falar vira a barra com o botão Parar. */
export function estadoDaLinha(estado: EstadoVoz, opcoes: { podeFotografar: boolean; fotoOcupada?: boolean; melhorando?: boolean }): EstadoDaLinha {
  const gravando = estado === "gravando";
  const transcrevendo = estado === "transcrevendo";
  return {
    foto: { desativado: !opcoes.podeFotografar || gravando || Boolean(opcoes.fotoOcupada), apagado: gravando },
    falar: { modo: gravando ? "barra" : "botao", desativado: transcrevendo || Boolean(opcoes.melhorando) },
    ia: { desativado: gravando || transcrevendo || Boolean(opcoes.melhorando), apagado: gravando },
  };
}

/** Tempo decorrido da gravação: 7 → "0:07". */
export function formatarTempo(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
