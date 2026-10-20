"use client";

import { Pill } from "@/components/ui/Pill";

export type PopAprovadoLinha = { id: string; codigo: string; titulo: string; versao: string; aprovadoEm?: string };

// Início do Fiscal: só leitura, só o que está pronto. O que ainda não existe aparece como "em breve".
export default function FiscalInicio({
  nome,
  empresa,
  popsAprovados,
  onAbrirComprovantes,
}: {
  nome: string;
  empresa: string;
  popsAprovados: PopAprovadoLinha[];
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
              <span className="em-breve">em breve</span>
            </div>
            <p className="ui-row-sub">Os relatórios emitidos desta empresa vão aparecer aqui.</p>
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
