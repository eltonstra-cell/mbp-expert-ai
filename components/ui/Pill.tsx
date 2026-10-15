import type { ReactNode } from "react";

export type Tom = "ok" | "nc" | "pend" | "info" | "na" | "brand" | "amber" | "lilas";

// Pílula pastel com texto sempre preto.
export function Pill({ tom = "na", children, title }: { tom?: Tom; children: ReactNode; title?: string }) {
  return (
    <span className={`ui-pill ui-pill--${tom}`} title={title}>
      {children}
    </span>
  );
}
