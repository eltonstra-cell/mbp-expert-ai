import type { Metadata, Viewport } from "next";
import "@neondatabase/auth/ui/css";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "MBP Expert AI",
  description: "Sistema Operacional para Consultoria em Segurança dos Alimentos",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#17365D",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
