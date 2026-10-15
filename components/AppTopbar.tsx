"use client";

import { NavIcon } from "@/components/NavIcons";

type Props = {
  /** Caminho exibido no PC, por exemplo: Visitas › Empresa › Central. */
  caminho: string[];
  /** Chamado ao tocar no primeiro item do caminho (Visitas), quando houver. */
  onPrimeiro?: () => void;
  empresaAtiva: string | null;
  iniciais: string | null;
  /** Tablet, dentro de uma visita: link para voltar à lista. */
  mostrarTodasVisitas: boolean;
  onTodasVisitas: () => void;
  /** Abre a caixa inteligente (Ctrl K); com voz, já começa a ouvir. */
  onAbrirCaixa: (comVoz: boolean) => void;
  micDisponivel: boolean;
};

export default function AppTopbar({
  caminho,
  onPrimeiro,
  empresaAtiva,
  iniciais,
  mostrarTodasVisitas,
  onTodasVisitas,
  onAbrirCaixa,
  micDisponivel,
}: Props) {
  return (
    <>
    <div className="pc-topbar">
      <nav className="pc-crumbs" aria-label="Caminho">
        {caminho.map((parte, indice) => {
          const ultimo = indice === caminho.length - 1;
          return (
            <span key={`${parte}-${indice}`} className="pc-crumb-wrap">
              {indice === 0 && onPrimeiro && !ultimo ? (
                <button type="button" className="pc-crumb-link" onClick={onPrimeiro}>
                  {parte}
                </button>
              ) : (
                <span className={ultimo ? "pc-crumb-current" : "pc-crumb"} aria-current={ultimo ? "page" : undefined}>
                  {parte}
                </span>
              )}
              {!ultimo && <span className="pc-crumb-sep" aria-hidden="true">›</span>}
            </span>
          );
        })}
      </nav>

      {mostrarTodasVisitas && (
        <button type="button" className="pc-back-link" onClick={onTodasVisitas}>
          ← Todas as visitas
        </button>
      )}

      <div className="pc-topbar-end">
        {empresaAtiva && (
          <span className="pc-company-chip" title={empresaAtiva}>
            <span className="pc-company-chip-label">Empresa ativa</span>
            <span className="pc-company-chip-name">{empresaAtiva}</span>
          </span>
        )}
        {iniciais && (
          <span className="pc-avatar" aria-hidden="true">
            {iniciais}
          </span>
        )}
      </div>    </div>
    <div className="pc-smartbar">
      <span className="pc-bolt" aria-hidden="true">
        <NavIcon name="raio" size={16} />
      </span>
      <button type="button" className="pc-smartbar-field" onClick={() => onAbrirCaixa(false)} aria-label="Abrir a caixa inteligente (Ctrl K)">
        <span className="pc-smartbar-text">Diga o que quer fazer ou para onde quer ir</span>
        <span className="pc-smartbar-text-short">Diga o que quer fazer</span>
        <kbd className="pc-kbd">Ctrl K</kbd>
      </button>
      {micDisponivel && (
        <button type="button" className="pc-mic" aria-label="Falar em vez de digitar" onClick={() => onAbrirCaixa(true)}>
          <NavIcon name="microfone" size={18} />
        </button>
      )}
      <button type="button" className="pc-go" onClick={() => onAbrirCaixa(false)}>
        Ir →
      </button>
    </div>
    </>
  );
}
