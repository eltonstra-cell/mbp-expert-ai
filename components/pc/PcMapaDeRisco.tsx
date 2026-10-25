"use client";

import { useMemo, useState } from "react";
import { CartaoDeRiscoVista, RegraDoMapa } from "@/components/RelatorioMontadoVista";
import { cartaoParaRelatorio, mapaDeRisco, ordenarPorUrgencia } from "@/lib/mapaDeRisco";
import { prazoVencido, ROTULO_CRITERIO_DO_APP } from "@/lib/relatorioDaVisita";
import { formatarData } from "@/lib/dataLocal";
import type { NaoConformidade, Visita } from "@/types";

type Props = {
  visitas: Visita[];
  ncs: NaoConformidade[];
  hoje: string;
  ambientesCadastrados?: string[];
  /** Abre as correções (da empresa) para o RT decidir o que fazer; o mapa nunca decide nada. */
  onAbrirCorrecoes: () => void;
};

// Mapa de risco por ambiente: um cartão por ambiente, cor por regra visível do app, tendência só entre visitas comparáveis.
// É informação. Não muda o checklist e não decide ação: quem decide é o RT.
export default function PcMapaDeRisco({ visitas, ncs, hoje, ambientesCadastrados, onAbrirCorrecoes }: Props) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [verRegra, setVerRegra] = useState(false);
  const empresaId = visitas[0]?.empresaId || ncs[0]?.empresaId || "";
  const cartoes = useMemo(() => ordenarPorUrgencia(mapaDeRisco({ empresaId, visitas, ncs, hoje, ambientesCadastrados })), [empresaId, visitas, ncs, hoje, ambientesCadastrados]);
  const escolhido = cartoes.find((cartao) => cartao.ambiente === aberto);

  return (
    <section className="ui-screen mr-tela" aria-label="Mapa de risco por ambiente">
      <h1 className="sr-only">Mapa de risco por ambiente</h1>
      <div className="mr-intro">
        <p className="resumo-texto">
          Uma cor por ambiente, calculada só de dados registrados ({ROTULO_CRITERIO_DO_APP}). A cor é informação: não muda o checklist nem decide ação; quem decide é o RT.
        </p>
        <button type="button" className="ui-btn ui-btn--secondary" aria-expanded={verRegra} onClick={() => setVerRegra((valor) => !valor)}>
          {verRegra ? "Esconder a regra" : "Ver a regra"}
        </button>
      </div>
      {verRegra && <RegraDoMapa />}

      {cartoes.length === 0 ? (
        <div className="ui-empty">Sem dados ainda: o mapa aparece depois da primeira visita.</div>
      ) : (
        <div className="mr-corpo">
          <div className="mr-lista ui-scroll" role="list" aria-label="Ambientes">
            <div className="mr-grade">
              {cartoes.map((cartao) => (
                <CartaoDeRiscoVista key={cartao.ambiente} cartao={cartaoParaRelatorio(cartao)} aberto={aberto === cartao.ambiente} aoTocar={() => setAberto((atual) => (atual === cartao.ambiente ? null : cartao.ambiente))} />
              ))}
            </div>
          </div>
          {escolhido && (
            <aside className="mr-detalhe ui-card" aria-label={`Correções de ${escolhido.ambiente}`}>
              <h2 className="ui-card-title">{escolhido.ambiente}</h2>
              <p className="ui-row-sub">{escolhido.motivo}</p>
              {escolhido.ncsAbertas.length === 0 ? (
                <p className="resumo-texto">Nenhuma não conformidade aberta neste ambiente.</p>
              ) : (
                <ul className="resumo-lista doc-lista">
                  {escolhido.ncsAbertas.map((nc) => (
                    <li key={nc.id}>
                      <span className="doc-nc-titulo">{nc.titulo}</span>
                      <span className="doc-linha">
                        {nc.criticidade} · {nc.status} · Prazo: {nc.prazo ? formatarData(nc.prazo) : "sem prazo"}
                        {prazoVencido(nc.prazo, hoje) ? " (vencido)" : ""} · Responsável: {nc.responsavelAcao || "não definido"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" className="ui-btn ui-btn--secondary" onClick={onAbrirCorrecoes}>
                Abrir correções
              </button>
            </aside>
          )}
        </div>
      )}
    </section>
  );
}
