// Barra de progresso fina.
export function ProgressBar({
  percentual,
  largura,
  tom = "brand",
  rotulo,
}: {
  percentual: number;
  largura?: number | string;
  tom?: "brand" | "ok";
  rotulo?: string;
}) {
  const valor = Math.max(0, Math.min(100, Math.round(percentual)));
  return (
    <div
      className="ui-progress"
      style={largura ? { width: largura } : undefined}
      role="progressbar"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={rotulo}
    >
      <span className={`ui-progress-fill ui-progress-fill--${tom}`} style={{ width: `${valor}%` }} />
    </div>
  );
}

// Barra segmentada com as cores de status do checklist.
export function SegmentedProgress({
  conformes,
  naoConformes,
  naoSeAplica,
  pendentes,
}: {
  conformes: number;
  naoConformes: number;
  naoSeAplica: number;
  pendentes: number;
}) {
  const total = Math.max(1, conformes + naoConformes + naoSeAplica + pendentes);
  const trechos = [
    [conformes, "var(--ok)"],
    [naoConformes, "var(--nc)"],
    [naoSeAplica, "var(--na)"],
    [pendentes, "var(--seg-pend)"],
  ] as const;
  return (
    <div
      className="ui-segbar"
      role="img"
      aria-label={`${conformes} conformes, ${naoConformes} não conformes, ${naoSeAplica} não se aplica, ${pendentes} pendentes`}
    >
      {trechos.map(([qtd, cor], indice) =>
        qtd > 0 ? <span key={indice} style={{ flexGrow: qtd / total, background: cor }} /> : null
      )}
    </div>
  );
}
