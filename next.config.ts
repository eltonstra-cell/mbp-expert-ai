import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // O manual completo fica fora de public e é lido pela rota /api/guias/[nome].
  outputFileTracingIncludes: {
    "/api/guias/[nome]": ["./conteudo-privado/guias/**/*", "./public/guias/**/*"],
  },
};

export default nextConfig;
