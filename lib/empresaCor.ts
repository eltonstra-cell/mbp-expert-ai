// Cor de cada empresa: paleta fixa de tons calmos, todos com contraste suficiente para texto branco.
// A cor escolhida fica no cadastro da empresa (campo "cor", dentro do documento do estado);
// sem cor guardada, ela é derivada do id, sempre a mesma em qualquer aparelho.

export const PALETA_EMPRESA = [
  { nome: "Turquesa", hex: "#168080" },
  { nome: "Azul", hex: "#264A80" },
  { nome: "Ferrugem", hex: "#B4491C" },
  { nome: "Grafite", hex: "#526477" },
  { nome: "Verde", hex: "#21805B" },
] as const;

type ComCor = { id: string; cor?: string };

export function corValida(cor: unknown): cor is string {
  return typeof cor === "string" && PALETA_EMPRESA.some((opcao) => opcao.hex === cor.toUpperCase());
}

function indiceDoId(id: string): number {
  let soma = 0;
  for (const letra of id) soma = (soma * 31 + letra.charCodeAt(0)) % 9973;
  return soma % PALETA_EMPRESA.length;
}

/** Cor da empresa: a guardada no cadastro, ou uma da paleta derivada do id. */
export function corDaEmpresa(empresa: ComCor): string {
  if (corValida(empresa.cor)) return empresa.cor.toUpperCase();
  return PALETA_EMPRESA[indiceDoId(empresa.id)].hex;
}

/** Sugestão para empresa nova: primeira cor da paleta ainda não usada; se todas estão em uso, repete na ordem. */
export function proximaCorLivre(empresas: ComCor[]): string {
  const emUso = new Set(empresas.map(corDaEmpresa));
  const livre = PALETA_EMPRESA.find((opcao) => !emUso.has(opcao.hex));
  return (livre || PALETA_EMPRESA[empresas.length % PALETA_EMPRESA.length]).hex;
}

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste do texto branco sobre a cor (mínimo recomendado: 4,5). */
export function contrasteComBranco(hex: string): number {
  return 1.05 / (luminancia(hex) + 0.05);
}
