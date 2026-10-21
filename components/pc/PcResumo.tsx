"use client";

import { Pill } from "@/components/ui/Pill";
import { textoDoResumo, type OrigemDoItem, type ResumoDeUmaPagina } from "@/lib/painelHoje";
import { quantidade } from "@/lib/plural";
import type { CabecalhoDeImpressao } from "@/lib/printFooter";

type Props = {
  resumo: ResumoDeUmaPagina;
  onImprimir: (titulo: string, cabecalho: CabecalhoDeImpressao) => void;
  onCompartilhar: (texto: string) => void;
  onVoltar: () => void;
};

function dataBr(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

const TIPO_DO_ITEM: Record<OrigemDoItem, string> = { correcao: "Correção", comprovante: "Comprovante", capacitacao: "Capacitação", pop: "POP" };

// Resumo de uma página para imprimir (Salvar como PDF) ou mandar por WhatsApp. Os números são os dos dados do app,
// separados em "da visita" e "da empresa" para ninguém confundir um percentual parcial com a empresa inteira.
export default function PcResumo({ resumo, onImprimir, onCompartilhar, onVoltar }: Props) {
  const c = resumo.conformidade;
  return (
    <section className="ui-screen resumo-tela" aria-label="Resumo de uma página">
      <div className="ui-head no-print">
        <h1 className="sr-only">Resumo de uma página</h1>
        <div className="ui-head-actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={() => onCompartilhar(textoDoResumo(resumo))}>
            Mandar por WhatsApp
          </button>
          <button
            type="button"
            className="ui-btn ui-btn--criar"
            onClick={() =>
              onImprimir(`Resumo - ${resumo.empresaNome}`, {
                esquerda: [resumo.empresaNome, resumo.empresaCnpj ? `CNPJ ${resumo.empresaCnpj}` : ""],
                direita: ["Resumo de uma página", `Gerado em ${dataBr(resumo.geradoEm)}`],
                rodape: "Não substitui o relatório completo",
              })
            }
          >
            Imprimir ou salvar PDF
          </button>
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            ← Voltar
          </button>
        </div>
      </div>

      <article id="resumo-pagina" className="resumo-pagina doc-impresso" data-empresa={resumo.empresaNome} data-geradoem={dataBr(resumo.geradoEm)}>
        <header className="resumo-topo">
          <h2 className="resumo-titulo">{resumo.empresaNome}</h2>
          <span className="doc-linha">{resumo.empresaCnpj ? `CNPJ ${resumo.empresaCnpj} · ` : ""}Resumo em {dataBr(resumo.geradoEm)}</span>
        </header>

        <h3 className="resumo-sub">{c ? `Da visita de ${dataBr(c.dataDaVisita)}` : "Da visita"}</h3>
        {c && (
          <p className="doc-linha">
            Estado atual da visita. {resumo.relatorioDaVisita ? `O relatório emitido é ${resumo.relatorioDaVisita.numero} v${resumo.relatorioDaVisita.versao}; ele guarda o estado do dia da emissão e este resumo não o substitui.` : "Ainda não há relatório emitido desta visita."}
          </p>
        )}
        <div className="resumo-numeros">
          <div className="resumo-numero">
            <span className="resumo-valor">{c ? `${c.percentual}%` : "—"}</span>
            <span className="ui-row-sub">
              {c ? `conforme entre os itens avaliados (${c.conformes} de ${c.respondidos})` : "Ainda não há visita com itens respondidos"}
            </span>
          </div>
          <div className="resumo-numero">
            <span className="resumo-valor">{c ? `${c.respondidosNoChecklist} de ${c.totalDeItens}` : "—"}</span>
            <span className="ui-row-sub">{c ? `${c.totalDeItens === 1 ? "item respondido" : "itens respondidos"}${c.parcial ? ": visita parcial, o percentual vale só para o que foi respondido" : ""}` : "itens respondidos"}</span>
          </div>
          <div className="resumo-numero">
            <span className="resumo-valor">{c ? c.abertasDaVisita : "—"}</span>
            <span className="ui-row-sub">não conformidades abertas desta visita</span>
          </div>
        </div>

        <h3 className="resumo-sub">Da empresa</h3>
        <div className="resumo-numeros">
          <div className="resumo-numero">
            <span className="resumo-valor">{resumo.abertas}</span>
            <span className="ui-row-sub">{resumo.abertas === 1 ? "não conformidade aberta (todas as visitas)" : "não conformidades abertas (todas as visitas)"}</span>
          </div>
          <div className="resumo-numero">
            <span className="resumo-valor">{resumo.documentosVencendo}</span>
            <span className="ui-row-sub">{resumo.documentosVencendo === 1 ? "comprovante vencido ou vencendo" : "comprovantes vencidos ou vencendo"}</span>
          </div>
          <div className="resumo-numero">
            <span className="resumo-valor">{resumo.treinamentosVencendo}</span>
            <span className="ui-row-sub">{resumo.treinamentosVencendo === 1 ? "treinamento vencido ou vencendo" : "treinamentos vencidos ou vencendo"}</span>
          </div>
        </div>

        <h3 className="resumo-sub">O que melhorou</h3>
        {resumo.melhoria ? (
          <p className="resumo-texto">
            {resumo.melhoria.texto}
            {resumo.melhoria.resolvidasNoPeriodo > 0 ? ` ${quantidade(resumo.melhoria.resolvidasNoPeriodo, "correção resolvida", "correções resolvidas")} desde a visita anterior.` : ""}
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
                <span className="resumo-tipo">{TIPO_DO_ITEM[item.origem]}</span>
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
