// Identidade única do produto. Para trocar o nome, o subtítulo ou as cores,
// edite apenas este arquivo (o CSS global recebe as variáveis em app/layout.tsx).
export const BRAND = {
  name: "Ponto Certo",
  subtitle: "Boas práticas e segurança dos alimentos",
  legacyName: "MBP Expert AI",
  description: "Boas práticas e segurança dos alimentos",
} as const;

export const BRAND_COLORS = {
  brand: "#2A4D7C",
  brandSoft: "#FFF6E5",
  amber: "#E0A800",
  ink: "#263445",
  ink2: "#526477",
  bg: "#FBFAF8",
  card: "#FFFFFF",
  border: "#D8DDE8",
  ok: "#21805B",
  okBg: "#E3F6EA",
  nc: "#C83F45",
  ncBg: "#FDE7E7",
  pend: "#E0A800",
  pendBg: "#FFE8A3",
  info: "#1F78B4",
  infoBg: "#CFEBF8",
  na: "#526477",
  naBg: "#EEF1F7",
} as const;


// Tiles de navegação (estilo ícone de app): gradiente do claro para a base.
export const TILE_GRADIENTS = {
  azul: ["#6B8CFF", "#2456D6"],
  verde: ["#4ADE80", "#16A34A"],
  laranja: ["#FDBA74", "#F97316"],
  vermelho: ["#FCA5A5", "#E5252A"],
  roxo: ["#94A3B8", "#475569"],
  turquesa: ["#5EEAD4", "#0D9488"],
  ceu: ["#7DD3FC", "#0EA5E9"],
  ambar: ["#FCD34D", "#F59E0B"],
  violeta: ["#94A3B8", "#475569"],
  rosa: ["#F9A8D4", "#EC4899"],
  indigo: ["#EEF1F5", "#EEF1F5"],
  ardosia: ["#94A3B8", "#475569"],
} as const;

export type TileTone = keyof typeof TILE_GRADIENTS;

const NAV_VARIABLES: Record<string, string> = {
  "--nav-capsule-bg": "rgba(255,255,255,.92)",
  "--nav-shadow": "0 10px 30px rgba(18,32,43,.16), 0 2px 6px rgba(18,32,43,.08)",
  "--sheet-bg":
    "linear-gradient(170deg, #FBFAF8, #FBFAF8)",
  "--nav-ring-inner": "#FBFAF8",
  "--visit-card-bg": "#FFFFFF",
  "--side-from": "#1D3557",
  "--side-to": "#1D3557",
  "--side-border": "#1D3557",
  "--side-sep": "rgba(255,255,255,.3)",
  "--side-active-bg": "rgba(255,255,255,.18)",
  "--side-card": "rgba(255,255,255,.16)",
  "--side-rail": "rgba(255,255,255,.35)",
  "--orange": "#21A3A3",
  "--count": "#E0A800",
  "--thumb": "#C3CDD8",
  "--lilas-bg": "#FFF6E5",
  "--lilas": "#526477",
  "--tabs-bg": "#EEF1F7",
  "--dash-bg": "#FFFBF0",
  "--dash-border": "#E0A800",
  "--menu-bg-from": "#EEF1F7",
  "--menu-bg-to": "#FFFFFF",
  "--menu-border": "#D8DDE8",
  "--menu-active-shadow": "0 2px 8px rgba(42,77,124,.12), 0 1px 2px rgba(18,32,43,.06)",
  "--register-gradient": "#21A3A3",
  "--register-shadow": "none",
  "--seg-pend": "#EEF1F7",
  "--pill-border": "#D8DDE8",
  "--card-warm-border": "#D8DDE8",
  "--strip-pend": "#D8DDE8",
  "--outline": "#D8DDE8",
  "--nav-ease": "160ms ease-out",
};

const CSS_VARIABLES: Record<string, string> = {
  "--brand": BRAND_COLORS.brand,
  "--brand-soft": BRAND_COLORS.brandSoft,
  "--amber": BRAND_COLORS.amber,
  "--ink": BRAND_COLORS.ink,
  "--ink-2": BRAND_COLORS.ink2,
  "--bg": BRAND_COLORS.bg,
  "--card": BRAND_COLORS.card,
  "--border": BRAND_COLORS.border,
  "--ok": BRAND_COLORS.ok,
  "--ok-bg": BRAND_COLORS.okBg,
  "--nc": BRAND_COLORS.nc,
  "--nc-bg": BRAND_COLORS.ncBg,
  "--pend": BRAND_COLORS.pend,
  "--pend-bg": BRAND_COLORS.pendBg,
  "--info": BRAND_COLORS.info,
  "--info-bg": BRAND_COLORS.infoBg,
  "--na": BRAND_COLORS.na,
  "--na-bg": BRAND_COLORS.naBg,
};

export function brandCssVariables(): string {
  const tiles = Object.entries(TILE_GRADIENTS).flatMap(([tom, [claro, base]]) => [
    [`--tile-${tom}-from`, claro],
    [`--tile-${tom}-to`, base],
  ]);
  const linhas = [...Object.entries(CSS_VARIABLES), ...tiles, ...Object.entries(NAV_VARIABLES)].map(
    ([nome, valor]) => `${nome}:${valor}`
  );
  return `:root{${linhas.join(";")}}`;
}
