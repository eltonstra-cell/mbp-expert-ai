"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import RelatorioMontadoVista from "@/components/RelatorioMontadoVista";
import { TEXTO_DO_RASCUNHO, type EstadoDoRelatorio, type RelatorioMontado } from "@/lib/relatorioDaVisita";

type Props = {
  dados: RelatorioMontado;
  estado: EstadoDoRelatorio;
  empresa: string;
  dataDaVisita: string;
  /** O campo do parecer do RT (vazio até o RT escrever; o app não escreve parecer). */
  parecer: ReactNode;
  podeEmitir: boolean;
  /** Texto do botão: "Confirmar e emitir" ou "Confirmar e emitir versão 2". */
  rotuloDeEmitir: string;
  avisoParaEmitir?: string;
  onEmitir: () => void;
  onFechar: () => void;
};

// Janela "Revisar": o relatório já montado como rascunho; o RT confere, escreve o parecer e confirma. Mesma base visual da janela de escolha (esc-*).
export default function PcRevisaoDoRelatorio({ dados, estado, empresa, dataDaVisita, parecer, podeEmitir, rotuloDeEmitir, avisoParaEmitir = "", onEmitir, onFechar }: Props) {
  const janelaRef = useRef<HTMLElement | null>(null);
  const fecharRef = useRef(onFechar);
  fecharRef.current = onFechar;

  useEffect(() => {
    const html = document.documentElement;
    const antesBody = document.body.style.overflow;
    const antesHtml = html.style.overflow;
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    const anterior = document.activeElement as HTMLElement | null;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") fecharRef.current();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = antesBody;
      html.style.overflow = antesHtml;
      anterior?.focus?.();
    };
  }, []);

  const emitido = estado.estado === "Emitido";
  const janela = (
    <div className="esc-camada" role="presentation">
      <div className="esc-fundo" onClick={onFechar} />
      <section ref={janelaRef} className="esc-janela rev-janela" role="dialog" aria-modal="true" aria-labelledby="rev-titulo">
        <header className="esc-cabeca">
          <div className="pacote-titulo-linha">
            <h2 id="rev-titulo" className="esc-titulo">Revisar relatório · {empresa} · visita de {dataDaVisita}</h2>
            <span className={`rev-estado rev-estado--${emitido ? "emitido" : "rascunho"}`}>{emitido ? `Emitido · ${estado.numero} versão ${estado.versao}` : "Rascunho"}</span>
          </div>
          <p className="esc-apoio">{emitido ? "Este relatório já foi emitido. Alterar o parecer gera uma NOVA versão; a anterior fica guardada." : TEXTO_DO_RASCUNHO}</p>
        </header>
        <div className="esc-corpo rev-corpo">
          <RelatorioMontadoVista dados={dados} parecer={parecer} />
        </div>
        <footer className="esc-rodape">
          <span className="esc-contador" role="status">{avisoParaEmitir || "Contas e cores são critério do app, não exigência de norma. O parecer é do RT."}</span>
          <div className="esc-rodape-botoes">
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onFechar}>Fechar</button>
            {podeEmitir && (
              <button type="button" className={`ui-btn ui-btn--primary${avisoParaEmitir ? " is-apagado" : ""}`} aria-disabled={Boolean(avisoParaEmitir)} onClick={avisoParaEmitir ? undefined : onEmitir}>
                {rotuloDeEmitir}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
  return typeof document === "undefined" ? null : createPortal(janela, document.body);
}
