// Estado "online" do selo do topo. `navigator.onLine` só muda por eventos e erra com facilidade (aparelho que acordou do repouso,
// adaptador virtual, rede que trocou), então o app NUNCA marca "Sem conexão" por ele sozinho: confirma com um pedido pequeno ao próprio
// servidor e só considera offline depois de DUAS falhas seguidas. É reavaliado ao voltar o foco da janela e depois de uma atualização do service worker.

export const FALHAS_SEGUIDAS_PARA_OFFLINE = 2;
export const ESPERA_ENTRE_TENTATIVAS_MS = 1500;

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
