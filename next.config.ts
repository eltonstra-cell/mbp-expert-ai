import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // Os guias ficam fora de public e são lidos pela rota /api/guias/[nome].
  outputFileTracingIncludes: {
    "/api/guias/[nome]": ["./conteudo-privado/guias/**/*"],
  },
};

export default nextConfig;
