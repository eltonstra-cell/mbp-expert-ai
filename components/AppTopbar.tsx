"use client";

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
};

export default function AppTopbar({
  caminho,
  onPrimeiro,
  empresaAtiva,
  iniciais,
  mostrarTodasVisitas,
  onTodasVisitas,
}: Props) {
  return (
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
      </div>
    </div>
  );
}
