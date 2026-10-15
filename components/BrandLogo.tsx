import { BRAND, BRAND_COLORS } from "@/lib/brand";

// Símbolo: círculo azul com visto e o ponto âmbar de assinatura no canto.
export function LogoSymbol({ size = 40, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className="shrink-0"
    >
      <circle cx="22" cy="26" r="20" fill={BRAND_COLORS.brand} />
      <path
        d="M13 27l6.5 6.5L31 20"
        fill="none"
        stroke="#fff"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="38.5" cy="9.5" r="6.5" fill={BRAND_COLORS.amber} />
    </svg>
  );
}

// "Ponto" em tinta e "Certo" na cor da marca, fonte de títulos.
export function LogoWordmark({ className = "" }: { className?: string }) {
  const [primeira, ...resto] = BRAND.name.split(" ");
  return (
    <span
      className={`font-[family-name:var(--font-display)] font-semibold leading-none tracking-tight ${className}`}
    >
      <span style={{ color: "var(--ink)" }}>{primeira}</span>{" "}
      <span style={{ color: "var(--brand)" }}>{resto.join(" ")}</span>
    </span>
  );
}

export function LogoHorizontal({
  size = 40,
  showSubtitle = false,
  textClassName = "text-xl",
}: {
  size?: number;
  showSubtitle?: boolean;
  textClassName?: string;
}) {
  return (
    <span className="flex items-center gap-3">
      <LogoSymbol size={size} />
      <span className="min-w-0">
        <LogoWordmark className={`block ${textClassName}`} />
        {showSubtitle && (
          <span className="brand-subtitle mt-1 block text-[11px] leading-tight" style={{ color: "var(--ink-2)" }}>
            {BRAND.subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
