// Foto presa: o que a fila do aparelho guarda e o que o registro da visita mostra precisam bater.
// Lógica pura (sem navegador). Nada aqui apaga arquivo: a foto na fila é, muitas vezes, a única cópia.
import { MOTIVO_CURTO_DA_CAUSA, type ArmazemDaFila, type EstadoDoItem, type ItemSemArquivo } from "./filaEvidencias.ts";

/** Estado que a pessoa vê em cada foto/áudio: "Na fila", "Enviando", "Enviada" ou "Erro" (com o motivo curto). */
export type EstadoVisivel = { rotulo: "Na fila" | "Enviando" | "Enviada" | "Erro" | "Arquivo não enviado"; motivo?: string; podeEnviarAgora: boolean; /** O RT escolhe o arquivo de novo e ele é ligado ao MESMO registro. */ podeAnexarDeNovo?: boolean };

/**
 * `item` é o da fila (se existir); `envio` é o que o registro da evidência diz; `temArquivoEnviado` = a evidência já aponta para o arquivo no servidor.
 * Registro marcado "aguardando" sem item na fila e sem arquivo enviado é ERRO: o arquivo não está mais neste aparelho.
 * Foto enviada direto (sem passar pela fila) não tem etiqueta: devolve null.
 */
export function estadoVisivelDaEvidencia(item: ItemSemArquivo | undefined, envio: "aguardando" | "enviada" | undefined, temArquivoEnviado: boolean, arquivoIndisponivel = false): EstadoVisivel | null {
  if (item) {
    if (item.estado === "enviando") return { rotulo: "Enviando", podeEnviarAgora: false };
    if (item.estado === "aguardando") return { rotulo: "Na fila", ...(item.causaDaFalha ? { motivo: MOTIVO_CURTO_DA_CAUSA[item.causaDaFalha] } : {}), podeEnviarAgora: true };
    if (item.estado === "falhou") return { rotulo: "Erro", motivo: item.causaDaFalha ? MOTIVO_CURTO_DA_CAUSA[item.causaDaFalha] : "Não foi possível enviar", podeEnviarAgora: true };
    if (item.estado === "enviado" && !temArquivoEnviado) return { rotulo: "Enviando", podeEnviarAgora: false };
  }
  // Sem item na fila: todo registro sem arquivo enviado mostra "Arquivo não enviado" (qualquer que seja o campo `envio`), e o RT pode anexar de novo.
  if (!temArquivoEnviado) return { rotulo: "Arquivo não enviado", motivo: "O arquivo não está neste aparelho nem no servidor", podeEnviarAgora: false, podeAnexarDeNovo: true };
  // O registro aponta para um arquivo que o servidor não entrega (a imagem não carregou).
  if (arquivoIndisponivel) return { rotulo: "Arquivo não enviado", motivo: "O servidor não encontrou o arquivo", podeEnviarAgora: false, podeAnexarDeNovo: true };
  if (envio === "enviada") return { rotulo: "Enviada", podeEnviarAgora: false };
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
