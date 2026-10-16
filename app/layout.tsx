import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import { BRAND, BRAND_COLORS, brandCssVariables } from "@/lib/brand";
import { fontClassNames } from "@/lib/fonts";

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.description,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: BRAND_COLORS.brand,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={fontClassNames} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandCssVariables() }} />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var w=window.innerWidth;var m=w<768?\"campo\":w<1024?\"equilibrado\":\"completo\";try{var p=JSON.parse(localStorage.getItem(\"mbp-expert-ai:modo-tela:v1\")||\"null\");if(p&&p.automatico===false&&[\"campo\",\"equilibrado\",\"completo\"].indexOf(p.modo)>-1)m=p.modo;}catch(e){}document.documentElement.setAttribute(\"data-modo\",m);})();",
          }}
        />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
