export type AbaSegmentada<T extends string> = { id: T; rotulo: string; contagem?: number; /** Laranja só quando a contagem pede uma ação da pessoa. */ acao?: boolean };

// Abas pequenas em fundo bege; a ativa fica branca.
export function SegmentedTabs<T extends string>({
  abas,
  valor,
  onChange,
  rotulo,
}: {
  abas: AbaSegmentada<T>[];
  valor: T;
  onChange: (id: T) => void;
  rotulo: string;
}) {
  return (
    <div className="ui-tabs" role="tablist" aria-label={rotulo}>
      {abas.map((aba) => (
        <button
          key={aba.id}
          type="button"
          role="tab"
          aria-selected={valor === aba.id}
          className={`ui-tab${valor === aba.id ? " is-active" : ""}`}
          onClick={() => onChange(aba.id)}
        >
          {aba.rotulo}
          {aba.contagem !== undefined && <span className={`ui-tab-count${aba.acao && aba.contagem > 0 ? " is-acao" : ""}`}>{aba.contagem}</span>}
        </button>
      ))}
    </div>
  );
}
