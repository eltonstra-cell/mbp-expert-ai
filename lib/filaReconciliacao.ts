// Foto presa: o que a fila do aparelho guarda e o que o registro da visita mostra precisam bater.
// Lógica pura (sem navegador). Nada aqui apaga arquivo: a foto na fila é, muitas vezes, a única cópia.
import { MOTIVO_CURTO_DA_CAUSA, type ArmazemDaFila, type EstadoDoItem, type ItemSemArquivo } from "./filaEvidencias.ts";

/** Estado que a pessoa vê em cada foto/áudio: "Na fila", "Enviando", "Enviada" ou "Erro" (com o motivo curto). */
export type EstadoVisivel = { rotulo: "Na fila" | "Enviando" | "Enviada" | "Erro"; motivo?: string; podeEnviarAgora: boolean };

/**
 * `item` é o da fila (se existir); `envio` é o que o registro da evidência diz; `temArquivoEnviado` = a evidência já aponta para o arquivo no servidor.
 * Registro marcado "aguardando" sem item na fila e sem arquivo enviado é ERRO: o arquivo não está mais neste aparelho.
 * Foto enviada direto (sem passar pela fila) não tem etiqueta: devolve null.
 */
export function estadoVisivelDaEvidencia(item: ItemSemArquivo | undefined, envio: "aguardando" | "enviada" | undefined, temArquivoEnviado: boolean): EstadoVisivel | null {
  if (item) {
    if (item.estado === "enviando") return { rotulo: "Enviando", podeEnviarAgora: false };
    if (item.estado === "aguardando") return { rotulo: "Na fila", ...(item.causaDaFalha ? { motivo: MOTIVO_CURTO_DA_CAUSA[item.causaDaFalha] } : {}), podeEnviarAgora: true };
    if (item.estado === "falhou") return { rotulo: "Erro", motivo: item.causaDaFalha ? MOTIVO_CURTO_DA_CAUSA[item.causaDaFalha] : "Não foi possível enviar", podeEnviarAgora: true };
    if (item.estado === "enviado" && !temArquivoEnviado) return { rotulo: "Enviando", podeEnviarAgora: false };
  }
  if (temArquivoEnviado && envio === "enviada") return { rotulo: "Enviada", podeEnviarAgora: false };
  if (envio === "aguardando" && !temArquivoEnviado) return { rotulo: "Erro", motivo: "Arquivo não encontrado neste aparelho (pode estar no aparelho que tirou a foto)", podeEnviarAgora: false };
  return null;
}

export type EvidenciaDoRegistro = { id: string; envio?: "aguardando" | "enviada"; blobPathname?: string };

export type AcaoDeReconciliacao =
  | { tipo: "recriar"; item: ItemSemArquivo }
  | { tipo: "aplicar"; item: ItemSemArquivo; resultado: { pathname: string; url: string } };

/**
 * Confere a fila com o registro da visita (só os itens do usuário atual):
 * - item que ainda não terminou (na fila, enviando, erro) sem registro da evidência: o registro é RECRIADO (a foto nunca fica invisível);
 * - item enviado cujo resultado nunca chegou ao registro: o resultado é APLICADO (ou o registro é recriado, se sumiu).
 * Item enviado e já aplicado é só histórico e não volta a aparecer (a pessoa pode ter removido a evidência).
 */
export function reconciliarComEvidencias(itens: ItemSemArquivo[], evidencias: EvidenciaDoRegistro[]): AcaoDeReconciliacao[] {
  const porId = new Map(evidencias.map((ev) => [ev.id, ev]));
  const acoes: AcaoDeReconciliacao[] = [];
  for (const item of itens) {
    const ev = porId.get(item.id);
    if (item.estado !== "enviado") {
      if (!ev) acoes.push({ tipo: "recriar", item });
    } else if (item.resultado && !item.resultadoAplicado) {
      if (!ev) acoes.push({ tipo: "recriar", item });
      else if (ev.envio !== "enviada" || !ev.blobPathname) acoes.push({ tipo: "aplicar", item, resultado: item.resultado });
    }
  }
  return acoes;
}

/** Itens guardados antes de a conta ser conhecida ("local") passam para a conta que entrou neste aparelho. Devolve quantos passaram. */
export async function adotarOrfaos(armazem: ArmazemDaFila, usuarioId: string): Promise<number> {
  if (!usuarioId || usuarioId === "local") return 0;
  let n = 0;
  for (const item of await armazem.listar()) {
    if (item.usuarioId === "local") {
      await armazem.salvar({ ...item, usuarioId });
      n += 1;
    }
  }
  return n;
}

/** Quantos itens do aparelho ainda não enviados são de OUTRA conta (esta conta não os envia, mas a pessoa precisa saber que existem). */
export function contarDeOutraConta(itens: { usuarioId: string; estado: EstadoDoItem }[], usuarioId: string): number {
  return itens.filter((item) => item.usuarioId !== usuarioId && item.estado !== "enviado").length;
}
