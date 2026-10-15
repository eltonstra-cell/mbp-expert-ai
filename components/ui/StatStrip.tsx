import type { Tom } from "@/components/ui/Pill";

export type Estatistica = { rotulo: string; valor: number | string; tom: Tom };

// Faixas baixas de contadores pastel; número em Outfit.
export function StatStrip({ itens, rotulo }: { itens: Estatistica[]; rotulo?: string }) {
  return (
    <div
      className="ui-stats"
      role="group"
      aria-label={rotulo}
      style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}
    >
      {itens.map((item) => (
        <div key={item.rotulo} className={`ui-stat ui-stat--${item.tom}`}>
          <span className="ui-stat-num">{item.valor}</span>
          <span className="ui-stat-label">{item.rotulo}</span>
        </div>
      ))}
    </div>
  );
}
