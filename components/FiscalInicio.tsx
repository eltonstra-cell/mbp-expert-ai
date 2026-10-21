"use client";

import { Pill } from "@/components/ui/Pill";
import { formatarData } from "@/lib/dataLocal";

export type PopAprovadoLinha = { id: string; codigo: string; titulo: string; versao: string; aprovadoEm?: string };
export type RelatorioEmitidoLinha = { id: string; numero: string; versao: number; emitidoEm: string; motivo?: string };

// Início do Fiscal: só leitura (relatórios emitidos, comprovantes e POPs aprovados). O dossiê ainda aparece como "em breve".
export default function FiscalInicio({
  nome,
  empresa,
  popsAprovados,
  relatorios = [],
  onAbrirRelatorios,
  onAbrirPops,
  onAbrirComprovantes,
}: {
  nome: string;
  empresa: string;
  popsAprovados: PopAprovadoLinha[];
  /** Relatórios emitidos da empresa (só leitura), do mais novo para o mais antigo. */
  relatorios?: RelatorioEmitidoLinha[];
  onAbrirRelatorios?: () => void;
  /** Abre os POPs vigentes em Documentos (só leitura). */
  onAbrirPops?: () => void;
  /** Comprovantes de terceiros com validade (só leitura). */
  onAbrirComprovantes?: () => void;
}) {
  return (
    <section className="ui-screen fiscal-inicio" aria-label="Início do Fiscal">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Olá, {nome}</h1>
          <p className="ui-subtitle">{empresa ? `Leitura · ${empresa}` : "Leitura"}</p>
        </div>
      </div>
      <div className="ui-scroll">
        <div className="ui-list">
          <article className="ui-card fiscal-cartao">
            <div className="pc-card-head">
              <h2 className="ui-card-title">Relatórios emitidos</h2>
              <Pill tom={relatorios.length ? "ok" : "na"}>{relatorios.length}</Pill>
              {onAbrirRelatorios && relatorios.length > 0 && (
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onAbrirRelatorios}>
                  Abrir
                </button>
              )}
            </div>
            {relatorios.length === 0 ? (
              <p className="doc-linha">Nenhum relatório emitido ainda.</p>
            ) : (
              <ul className="fiscal-pops">
                {relatorios.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <span className="fiscal-pop-titulo">{item.numero} · versão {item.versao}</span>
                    <span className="doc-linha">emitido em {formatarData(item.emitidoEm)}{item.motivo ? ` · motivo: ${item.motivo}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="ui-card fiscal-cartao">
            <div className="pc-card-head">
              <h2 className="ui-card-title">Dossiê da empresa</h2>
              <span className="em-breve">em breve</span>
            </div>
            <p className="ui-row-sub">O dossiê reunido da empresa vai aparecer aqui.</p>
          </article>
          {onAbrirComprovantes && (
            <article className="ui-card fiscal-cartao">
              <div className="pc-card-head">
                <h2 className="ui-card-title">Comprovantes e documentos</h2>
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onAbrirComprovantes}>
                  Abrir
                </button>
              </div>
              <p className="ui-row-sub">Certificados de terceiros com validade (somente leitura).</p>
            </article>
          )}
          <article className="ui-card fiscal-cartao">
            <div className="pc-card-head">
              <h2 className="ui-card-title">POPs aprovados</h2>
              <Pill tom="ok">{popsAprovados.length}</Pill>
              {onAbrirPops && (
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onAbrirPops}>
                  Abrir
                </button>
              )}
            </div>
            {popsAprovados.length === 0 ? (
              <p className="ui-row-sub">Nenhum POP aprovado ainda.</p>
            ) : (
              <ul className="fiscal-pops">
                {popsAprovados.map((pop) => (
                  <li key={pop.id}>
                    <span className="fiscal-pop-titulo">{pop.codigo ? `${pop.codigo} · ` : ""}{pop.titulo}</span>
                    <span className="ui-row-sub">versão {pop.versao}{pop.aprovadoEm ? ` · aprovado em ${pop.aprovadoEm}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
