// Estado "online" do selo do topo. `navigator.onLine` só muda por eventos e erra com facilidade (aparelho que acordou do repouso,
// adaptador virtual, rede que trocou), então o app NUNCA marca "Sem conexão" por ele sozinho: confirma com um pedido pequeno ao próprio
// servidor e só considera offline depois de DUAS falhas seguidas. É reavaliado ao voltar o foco da janela e depois de uma atualização do service worker.

export const FALHAS_SEGUIDAS_PARA_OFFLINE = 2;
export const ESPERA_ENTRE_TENTATIVAS_MS = 1500;

/** Espera crescente entre as leituras da nuvem (tolera o "acordar" do banco): depois da 1ª, 2ª e 3ª falha. O aviso só vem depois da última. */
export const ESPERAS_DA_NUVEM_MS = [1500, 4000, 8000] as const;
export const TENTATIVAS_DA_NUVEM = ESPERAS_DA_NUVEM_MS.length + 1;

/** Quanto esperar antes de ler de novo, dado quantas falhas seguidas já houve; null quando era a última tentativa (aí vale o aviso). */
export function esperaAposFalhaDaNuvem(falhasSeguidas: number): number | null {
  if (falhasSeguidas < 1 || falhasSeguidas >= TENTATIVAS_DA_NUVEM) return null;
  return ESPERAS_DA_NUVEM_MS[falhasSeguidas - 1];
}

/**
 * Rótulo do selo do topo quando há problema: "Sem conexão" só quando realmente offline; com internet e a nuvem sem responder é
 * "Não sincronizou" (os dados continuam guardados neste aparelho).
 */
export function rotuloDoSeloComProblema(online: boolean): "Sem conexão" | "Não sincronizou" {
  return online ? "Não sincronizou" : "Sem conexão";
}

type Resposta = { ok: boolean };
type Buscar = (url: string, init: { method: string; cache: "no-store"; signal?: AbortSignal }) => Promise<Resposta>;

/** Um pedido pequeno, sem cache, ao próprio app. Qualquer resposta HTTP já prova que há rede; só erro de rede e tempo esgotado contam como falha. */
export async function umaTentativa(buscar: Buscar, url = "/icons/icon.svg", limiteMs = 4000): Promise<boolean> {
  const controle = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controle ? setTimeout(() => controle.abort(), limiteMs) : null;
  try {
    await buscar(url, { method: "HEAD", cache: "no-store", ...(controle ? { signal: controle.signal } : {}) });
    return true;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Confirma a conexão: verdadeiro na primeira tentativa que responde; falso só depois de `falhas` tentativas seguidas sem resposta.
 * `esperar` existe para os testes não esperarem de verdade.
 */
export async function confirmarConexao(
  tentar: () => Promise<boolean>,
  opcoes: { falhas?: number; esperaMs?: number; esperar?: (ms: number) => Promise<void> } = {}
): Promise<boolean> {
  const falhas = opcoes.falhas ?? FALHAS_SEGUIDAS_PARA_OFFLINE;
  const esperaMs = opcoes.esperaMs ?? ESPERA_ENTRE_TENTATIVAS_MS;
  const esperar = opcoes.esperar ?? ((ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms)));
  for (let indice = 0; indice < falhas; indice += 1) {
    if (await tentar()) return true;
    if (indice < falhas - 1) await esperar(esperaMs);
  }
  return false;
}

/** O navegador diz que há rede: vale (não há o que confirmar). Dizendo que não há, só a confirmação por tentativas decide. */
export async function conexaoAtual(navegadorOnline: boolean, tentar: () => Promise<boolean>, opcoes?: Parameters<typeof confirmarConexao>[1]): Promise<boolean> {
  if (navegadorOnline) return true;
  return confirmarConexao(tentar, opcoes);
}

/** "sem-sinal" é laranja (queda de sinal é normal em câmara fria); "erro" é vermelho e só vale para erro real de envio. */
export type SeloDeSincronizacao = { estado: "ok" | "pendente" | "sem-sinal" | "erro"; rotulo: string; dica: string };

/**
 * Chip do topo, sempre com texto: "Sincronizado", "Sincronizando…", "Sem sinal" (sem rede de verdade), "Erro ao enviar" (rede, mas a nuvem não
 * respondeu) e "N pendentes" (respostas, fotos e áudios guardados neste aparelho esperando o envio).
 */
export function seloDeSincronizacao(entrada: { online: boolean; syncStatus: "sincronizado" | "conectando" | "erro" | string; pendentes: number; /** Fotos e áudios que falharam de vez (precisam de "Enviar agora"). */ falhas?: number }): SeloDeSincronizacao {
  const { online, syncStatus, pendentes } = entrada;
  const falhas = entrada.falhas ?? 0;
  const fila = pendentes === 1 ? "1 pendente" : `${pendentes} pendentes`;
  if (!online) return { estado: "sem-sinal", rotulo: pendentes > 0 ? `Sem sinal · ${pendentes}` : "Sem sinal", dica: `Sem sinal: o que você fizer fica guardado neste aparelho e é enviado quando a conexão voltar.${pendentes > 0 ? ` ${fila}.` : ""} Toque para tentar de novo.` };
  if (falhas > 0) return { estado: "erro", rotulo: "Erro ao enviar", dica: `${falhas === 1 ? "1 foto ou áudio não foi enviado" : `${falhas} fotos ou áudios não foram enviados`}. Continuam guardados neste aparelho. Toque para ver e enviar agora.` };
  if (syncStatus === "erro") return { estado: "erro", rotulo: "Erro ao enviar", dica: "Há conexão, mas a nuvem não respondeu. Seus dados continuam guardados neste aparelho. Toque para tentar de novo." };
  if (pendentes > 0) return { estado: "pendente", rotulo: fila, dica: `${fila}: guardados neste aparelho até o envio. Toque para enviar agora.` };
  if (syncStatus === "conectando") return { estado: "pendente", rotulo: "Sincronizando…", dica: "Sincronizando com a nuvem." };
  return { estado: "ok", rotulo: "Sincronizado", dica: "Tudo sincronizado com a nuvem. Toque para atualizar agora." };
}
