"use client";

import { formatarDataCurtaHora } from "@/lib/dataLocal";
import { Pill, type Tom } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TEXTO_DA_CAUSA, textoDeEspaco, type ItemSemArquivo, type ResumoDaFila } from "@/lib/filaEvidencias";

type Props = {
  itens: ItemSemArquivo[];
  resumo: ResumoDaFila;
  online: boolean;
  sessaoExpirada: boolean;
  enviando: boolean;
  /** Passa do limite de espaço: avisa para enviar antes de tirar mais fotos. */
  limiteTexto: string;
  nomeDaEmpresa: (empresaId: string) => string;
  onEnviarAgora: () => void;
  onRepetir: (id: string) => void;
  onDescartar: (id: string) => void;
  onEntrar: () => void;
  onVoltar: () => void;
};

const ROTULO = { aguardando: "Aguardando", enviando: "Enviando", falhou: "Falhou", enviado: "Enviada" } as const;
const TOM: Record<ItemSemArquivo["estado"], Tom> = { aguardando: "pend", enviando: "info", falhou: "nc", enviado: "ok" };

function quando(iso: string) {
  return formatarDataCurtaHora(iso).replace(" · ", " ");
}

// Mais › Sincronizar › Fila de envio: evidências feitas sem sinal, que ainda estão só neste aparelho.
export default function PcFilaDeEnvio({ itens, resumo, online, sessaoExpirada, enviando, limiteTexto, nomeDaEmpresa, onEnviarAgora, onRepetir, onDescartar, onEntrar, onVoltar }: Props) {
  const visiveis = itens;
  const pendentes = visiveis.filter((item) => item.estado !== "enviado");
  const enviadas = visiveis.filter((item) => item.estado === "enviado").slice(-5).reverse();

  return (
    <section className="ui-screen fila-envio" aria-label="Fila de envio">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Fila de envio</h1>
          <p className="ui-subtitle">Fotos e áudios feitos sem sinal. Ficam salvos neste aparelho até o envio dar certo.</p>
        </div>
        <div className="ui-head-actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            ← Voltar
          </button>
        </div>
      </div>

      <div className="fila-resumo" role="status">
        <Pill tom={resumo.pendentes ? "pend" : "ok"}>{resumo.pendentes ? `${resumo.pendentes} ${resumo.pendentes === 1 ? "pendente" : "pendentes"}` : "Nada pendente"}</Pill>
        {resumo.falhou > 0 && <Pill tom="nc">{resumo.falhou} {resumo.falhou === 1 ? "falhou" : "falharam"}</Pill>}
        <span className="ui-row-sub">{online ? (enviando ? "Enviando agora…" : "Com conexão") : "Sem conexão: o envio recomeça quando o sinal voltar."}</span>
        {resumo.pendentes > 0 && (
          <button type="button" className="ui-btn ui-btn--primary ui-btn--small fila-enviar-agora" onClick={onEnviarAgora} disabled={!online || enviando}>
            Enviar agora
          </button>
        )}
      </div>

      {sessaoExpirada && (
        <div className="priv-faixa" role="alert">
          <span>Sessão expirada. Os itens continuam guardados; entre de novo para enviar.</span>
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onEntrar}>
            Entrar de novo
          </button>
        </div>
      )}

      <div className="fila-lista">
        {pendentes.length === 0 && enviadas.length === 0 ? (
          <div className="ui-empty">Nenhuma evidência na fila. Quando você registrar uma foto ou áudio sem sinal, ela aparece aqui.</div>
        ) : (
          <div className="ui-list">
            {[...pendentes, ...enviadas].map((item) => (
              <article key={item.id} className={`ui-card fila-item fila-item--${item.estado}`}>
                <div className="fila-item-topo">
                  <div className="fila-item-textos">
                    <span className="fila-item-titulo">
                      {item.tipo === "Foto" ? "Foto" : "Áudio"} · {item.ambiente || "Sem ambiente"}
                    </span>
                    <span className="ui-row-sub">
                      {nomeDaEmpresa(item.empresaId)} · capturada {quando(item.capturadoEm)} · {textoDeEspaco(item.bytes)}
                    </span>
                  </div>
                  <Pill tom={TOM[item.estado]}>{ROTULO[item.estado]}</Pill>
                </div>
                {item.estado === "enviando" && <ProgressBar percentual={item.progresso ?? 0} rotulo="Progresso do envio" />}
                {item.causaDaFalha && item.estado !== "enviado" && <span className="ui-row-sub fila-item-causa">{TEXTO_DA_CAUSA[item.causaDaFalha]}</span>}
                {item.estado !== "enviado" && (
                  <div className="fila-item-acoes">
                    {item.estado === "falhou" && (
                      <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onRepetir(item.id)} disabled={!online || enviando}>
                        Tentar de novo
                      </button>
                    )}
                    <button type="button" className="ui-btn ui-btn--soft ui-btn--small" onClick={() => onDescartar(item.id)} disabled={item.estado === "enviando"}>
                      Descartar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="fila-rodape">
        <span className="ui-row-sub">
          Espaço ocupado neste aparelho: {textoDeEspaco(resumo.bytes)}. {resumo.acimaDoLimite ? `Passou de ${limiteTexto}: envie antes de registrar mais. ` : ""}
          Não limpe os dados do navegador nem desinstale o app antes de enviar: o que está na fila se perderia. O conteúdo da fila não é criptografado neste aparelho.
        </span>
      </div>
    </section>
  );
}
