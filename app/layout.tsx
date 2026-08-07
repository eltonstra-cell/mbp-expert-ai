import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MBP Expert AI",
  description: "Sistema Operacional para Consultoria em Segurança dos Alimentos",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#17365D",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
