"use client";

import { Pill } from "@/components/ui/Pill";
import { textoDoResumo, type ResumoDeUmaPagina } from "@/lib/painelHoje";

type Props = {
  resumo: ResumoDeUmaPagina;
  onImprimir: () => void;
  onCompartilhar: (texto: string) => void;
  onVoltar: () => void;
};

function dataBr(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Resumo de uma página para imprimir (Salvar como PDF) ou mandar por WhatsApp. Os números são os dos dados do app.
export default function PcResumo({ resumo, onImprimir, onCompartilhar, onVoltar }: Props) {
  return (
    <section className="ui-screen resumo-tela" aria-label="Resumo de uma página">
      <div className="ui-head no-print">
        <div>
          <h1 className="ui-title">Resumo de uma página</h1>
          <p className="ui-subtitle">Para imprimir, salvar em PDF ou mandar por WhatsApp.</p>
        </div>
        <div className="ui-head-actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={() => onCompartilhar(textoDoResumo(resumo))}>
            Mandar por WhatsApp
          </button>
          <button type="button" className="ui-btn ui-btn--primary" onClick={onImprimir}>
            Imprimir ou salvar PDF
          </button>
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            ← Voltar
          </button>
        </div>
      </div>

      <article id="resumo-pagina" className="resumo-pagina" data-empresa={resumo.empresaNome}>
        <header className="resumo-topo">
          <h2 className="resumo-titulo">{resumo.empresaNome}</h2>
          <span className="ui-row-sub">Resumo em {dataBr(resumo.geradoEm)}</span>
        </header>
        <div className="resumo-numeros">
          <div className="resumo-numero">
            <span className="resumo-valor">{resumo.conformidade ? `${resumo.conformidade.percentual}%` : "—"}</span>
            <span className="ui-row-sub">
              {resumo.conformidade
                ? `de conformidade: ${resumo.conformidade.conformes} de ${resumo.conformidade.respondidos} itens respondidos na visita de ${dataBr(resumo.conformidade.dataDaVisita)}`
                : "Ainda não há visita com itens respondidos"}
            </span>
          </div>
          <div className="resumo-numero">
            <span className="resumo-valor">{resumo.abertas}</span>
            <span className="ui-row-sub">não conformidades abertas</span>
          </div>
          <div className="resumo-numero">
            <span className="resumo-valor">{resumo.documentosVencendo}</span>
            <span className="ui-row-sub">documentos vencidos ou vencendo</span>
          </div>
          <div className="resumo-numero">
            <span className="resumo-valor">{resumo.treinamentosVencendo}</span>
            <span className="ui-row-sub">treinamentos vencidos ou vencendo</span>
          </div>
        </div>

        <h3 className="resumo-sub">O que melhorou</h3>
        {resumo.melhoria ? (
          <p className="resumo-texto">
            {resumo.melhoria.texto}
            {resumo.melhoria.resolvidasNoPeriodo > 0 ? ` ${resumo.melhoria.resolvidasNoPeriodo} correção(ões) resolvida(s) desde a visita anterior.` : ""}
          </p>
        ) : (
          <p className="resumo-texto">Poucos dados para comparar: é preciso ao menos duas visitas com itens respondidos.</p>
        )}

        <h3 className="resumo-sub">O que precisa de ação</h3>
        {resumo.precisaDeAcao.length === 0 ? (
          <p className="resumo-texto">Nada vencido nem vencendo.</p>
        ) : (
          <ul className="resumo-lista">
            {resumo.precisaDeAcao.map((item) => (
              <li key={item.id}>
                <span>{item.origem === "capacitacao" ? "Capacitação da equipe" : item.titulo}</span>{" "}
                <Pill tom={item.situacao === "vencido" ? "nc" : item.situacao === "aguardando" ? "info" : "amber"}>{item.prazo}</Pill>
              </li>
            ))}
          </ul>
        )}

        <footer className="resumo-rodape">Não substitui o relatório completo.</footer>
      </article>
    </section>
  );
}
