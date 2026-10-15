// Identidade única do produto. Para trocar o nome, o subtítulo ou as cores,
// edite apenas este arquivo (o CSS global recebe as variáveis em app/layout.tsx).
export const BRAND = {
  name: "Ponto Certo",
  subtitle: "Boas práticas e segurança dos alimentos",
  legacyName: "MBP Expert AI",
  description: "Boas práticas e segurança dos alimentos",
} as const;

export const BRAND_COLORS = {
  brand: "#2456D6",
  brandSoft: "#E1E9FC",
  amber: "#F5A623",
  ink: "#12202B",
  ink2: "#3D5160",
  bg: "#F6F3EE",
  card: "#FFFFFF",
  border: "#DDE6EA",
  ok: "#15803D",
  okBg: "#E3F6EA",
  nc: "#D93A3A",
  ncBg: "#FDE7E7",
  pend: "#E89A0C",
  pendBg: "#FFF3D6",
  info: "#3AA6D9",
  infoBg: "#CFEBF8",
  na: "#6B7A90",
  naBg: "#EEF1F5",
} as const;

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
  const linhas = Object.entries(CSS_VARIABLES).map(([nome, valor]) => `${nome}:${valor}`);
  return `:root{${linhas.join(";")}}`;
}
