// Ordem das fontes da consulta de CNPJ: a PRIMEIRA que responder vale, as outras são reserva. Se a UF da fonte usada vier inválida ("EX", vazia),
// tenta a UF da outra fonte (sem trocar a fonte exibida). Lógica pura: as fontes entram por parâmetro, para testar sem rede.
import { ufValida } from "./ufBrasil.ts";

export type FonteDeCnpj<T extends { uf?: string }> = { nome: string; consultar: () => Promise<T> };
export type Tentativa = { fonte: string; ok: boolean; motivo?: string };
export type ResultadoDaConsulta<T> = { dados: T; fonte: string; tentativas: Tentativa[]; ufDaOutraFonte?: string };

export async function consultarComReserva<T extends { uf?: string }>(fontes: FonteDeCnpj<T>[]): Promise<ResultadoDaConsulta<T> | { dados: null; tentativas: Tentativa[] }> {
  const tentativas: Tentativa[] = [];
  let escolhida: { dados: T; indice: number } | null = null;
  for (let i = 0; i < fontes.length && !escolhida; i += 1) {
    try {
      const dados = await fontes[i].consultar();
      tentativas.push({ fonte: fontes[i].nome, ok: true });
      escolhida = { dados, indice: i };
    } catch (erro) {
      tentativas.push({ fonte: fontes[i].nome, ok: false, motivo: erro instanceof Error ? erro.message : "falhou" });
    }
  }
  if (!escolhida) return { dados: null, tentativas };
  let ufDaOutraFonte: string | undefined;
  if (!ufValida(escolhida.dados.uf)) {
    for (let i = 0; i < fontes.length && !ufDaOutraFonte; i += 1) {
      if (i === escolhida.indice) continue;
      try {
        const outra = await fontes[i].consultar();
        if (ufValida(outra.uf)) ufDaOutraFonte = outra.uf;
      } catch {
        // A outra fonte também falhou: a UF será deduzida pelo CEP ou ficará vazia.
      }
    }
  }
  return { dados: escolhida.dados, fonte: fontes[escolhida.indice].nome, tentativas, ...(ufDaOutraFonte ? { ufDaOutraFonte } : {}) };
}
