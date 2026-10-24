"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  descartarItem,
  enfileirar,
  reabrirFalhasDeConexao,
  itensDoUsuario,
  processarFila,
  recuperarInterrompidos,
  resumirFila,
  semArquivo,
  tentarDeNovo,
  type DadosParaEnfileirar,
  type ItemSemArquivo,
} from "@/lib/filaEvidencias";
import { armazemDoAparelho, enviarItemPeloNavegador, indexedDbDisponivel } from "@/lib/filaEvidenciasIdb";
import { adotarOrfaos, contarDeOutraConta } from "@/lib/filaReconciliacao";

type Opcoes = {
  /** Identidade de quem está logado neste aparelho (e-mail, minúsculo). Vazio: a fila fica parada. */
  usuarioId: string;
  pronto: boolean;
  podeAcessarEmpresa: (empresaId: string) => boolean;
  /** Atualiza a evidência na tela com o arquivo já enviado. Devolve true se aplicou. */
  aplicarResultado: (item: ItemSemArquivo, resultado: { pathname: string; url: string }) => boolean;
};

// Fila de envio de evidências: envia sozinha ao abrir o app, quando a conexão volta e depois da espera de cada nova tentativa.
// Background Sync só acorda o app onde o navegador oferece; no iPhone/Safari o envio acontece com o app aberto.
export function useFilaDeEvidencias({ usuarioId, pronto, podeAcessarEmpresa, aplicarResultado }: Opcoes) {
  const [itens, setItens] = useState<ItemSemArquivo[]>([]);
  /** Fotos e áudios guardados neste aparelho por OUTRA conta (esta conta não os envia). */
  const [deOutraConta, setDeOutraConta] = useState(0);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);
  const [semConexao, setSemConexao] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Pedido de envio que chegou enquanto outro envio rodava: roda de novo assim que o atual terminar (antes ele se perdia e o item ficava esperando).
  const rodando = useRef(false);
  const repetirDepois = useRef<{ forcar: boolean } | null>(null);
  const opcoes = useRef({ usuarioId, podeAcessarEmpresa, aplicarResultado });
  opcoes.current = { usuarioId, podeAcessarEmpresa, aplicarResultado };

  const recarregar = useCallback(async () => {
    if (!indexedDbDisponivel()) return;
    try {
      const todos = await armazemDoAparelho.listar();
      setItens(itensDoUsuario(todos, opcoes.current.usuarioId).map(semArquivo).sort((a, b) => a.capturadoEm.localeCompare(b.capturadoEm)));
      setDeOutraConta(contarDeOutraConta(todos, opcoes.current.usuarioId));
    } catch {
      setItens([]);
    }
  }, []);

  const processar = useCallback(
    async (forcar = false) => {
      const atual = opcoes.current;
      if (!atual.usuarioId || !indexedDbDisponivel()) return;
      if (rodando.current) {
        repetirDepois.current = { forcar: forcar || Boolean(repetirDepois.current?.forcar) };
        return;
      }
      rodando.current = true;
      setEnviando(true);
      try {
        const resultado = await processarFila(
          {
            armazem: armazemDoAparelho,
            usuarioId: atual.usuarioId,
            podeAcessarEmpresa: (empresaId) => opcoes.current.podeAcessarEmpresa(empresaId),
            online: () => navigator.onLine,
            agora: () => Date.now(),
            enviar: enviarItemPeloNavegador,
            aoMudar: () => void recarregar(),
            aplicarResultado: (item, enviado) => opcoes.current.aplicarResultado(item, enviado),
          },
          { forcar }
        );
        setSessaoExpirada(resultado.sessaoExpirada);
        setSemConexao(resultado.semConexao);
        if (relogio.current) clearTimeout(relogio.current);
        if (resultado.proximaEm !== undefined) {
          relogio.current = setTimeout(() => void processar(false), Math.max(1000, resultado.proximaEm - Date.now()));
        }
      } finally {
        rodando.current = false;
        setEnviando(false);
        void recarregar();
        const outro = repetirDepois.current;
        repetirDepois.current = null;
        if (outro) void processar(outro.forcar);
      }
    },
    [recarregar]
  );

  // Ao abrir o app (e quando a pessoa logada muda): retoma o que ficou pela metade e tenta enviar.
  useEffect(() => {
    if (!pronto || !usuarioId || !indexedDbDisponivel()) return;
    let cancelado = false;
    void (async () => {
      try {
        await recuperarInterrompidos(armazemDoAparelho, usuarioId);
        // Itens guardados antes de a conta ser conhecida passam para esta conta (senão ficariam invisíveis e nunca seriam enviados).
        await adotarOrfaos(armazemDoAparelho, usuarioId);
        await reabrirFalhasDeConexao(armazemDoAparelho, usuarioId);
        // Pede ao navegador para não apagar a fila por falta de espaço (nem sempre ele concede).
        void navigator.storage?.persist?.();
      } catch {
        // Sem IndexedDB utilizável, a evidência segue o caminho de antes (só com internet).
      }
      if (cancelado) return;
      await recarregar();
      await processar(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [pronto, usuarioId, recarregar, processar]);

  // Conexão voltou, app voltou para a frente, ou o Service Worker avisou (Background Sync).
  useEffect(() => {
    if (!pronto || !usuarioId) return;
    const aoVoltarOnline = () => void processar(false);
    const aoVoltarParaFrente = () => {
      if (document.visibilityState === "visible") void processar(false);
    };
    const aoReceber = (evento: MessageEvent) => {
      if (evento.data?.type === "FILA_EVIDENCIAS") void processar(false);
    };
    window.addEventListener("online", aoVoltarOnline);
    document.addEventListener("visibilitychange", aoVoltarParaFrente);
    navigator.serviceWorker?.addEventListener("message", aoReceber);
    return () => {
      window.removeEventListener("online", aoVoltarOnline);
      document.removeEventListener("visibilitychange", aoVoltarParaFrente);
      navigator.serviceWorker?.removeEventListener("message", aoReceber);
      if (relogio.current) clearTimeout(relogio.current);
    };
  }, [pronto, usuarioId, processar]);

  const guardar = useCallback(
    async (dados: DadosParaEnfileirar, arquivo: Blob) => {
      const item = await enfileirar(armazemDoAparelho, dados, arquivo);
      await recarregar();
      // Pede o envio em segundo plano onde o navegador permite; onde não, vale o envio com o app aberto.
      // NUNCA espera por isso: `serviceWorker.ready` pode não resolver (service worker ainda instalando, aba privada), e quem chamou
      // precisa criar o registro da evidência assim que o arquivo está guardado no aparelho.
      void (async () => {
        try {
          const registro = await navigator.serviceWorker?.ready;
          const sync = (registro as unknown as { sync?: { register: (tag: string) => Promise<void> } } | undefined)?.sync;
          await sync?.register("mbp-fila-evidencias");
        } catch {
          // Sem Background Sync (Safari/iPhone): o envio acontece com o app aberto.
        }
      })();
      return item;
    },
    [recarregar]
  );

  const descartar = useCallback(
    async (id: string) => {
      const ok = await descartarItem(armazemDoAparelho, opcoes.current.usuarioId, id);
      await recarregar();
      return ok;
    },
    [recarregar]
  );

  const repetir = useCallback(
    async (id: string) => {
      await tentarDeNovo(armazemDoAparelho, opcoes.current.usuarioId, id);
      await processar(true);
    },
    [processar]
  );

  const resumo = useMemo(() => resumirFila(itens), [itens]);

  return { itens, deOutraConta, resumo, sessaoExpirada, semConexao, enviando, guardar, descartar, repetir, enviarAgora: () => processar(true), recarregar };
}
