import { Nunito_Sans, Outfit } from "next/font/google";

// Único ponto de definição das fontes. Para trocar (por exemplo, por Manrope),
// altere apenas este arquivo: as variáveis CSS usadas no app continuam as mesmas.
export const fontDisplay = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const fontBody = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const fontClassNames = `${fontDisplay.variable} ${fontBody.variable}`;
