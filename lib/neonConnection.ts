type Env = Record<string, string | undefined>;

function naVercel(env: Env) {
  return env.VERCEL_ENV === "production" || env.VERCEL_ENV === "preview";
}

export const LEGACY_DATABASE_FLAG = "ALLOW_LEGACY_DATABASE_URL";

// Na Vercel (production/preview), sem nenhuma NOVO_NEON_* não se usa
// DATABASE_URL em silêncio: falha, a menos que ALLOW_LEGACY_DATABASE_URL=true.
// Fora da Vercel (desenvolvimento local), o comportamento anterior é mantido.
// A mensagem cita apenas nomes de variáveis, nunca valores.
export function resolveNeonDatabaseUrl(env: Env) {
  const novo =
    env.NOVO_NEON_DATABASE_URL ||
    env.NOVO_NEON_POSTGRES_URL ||
    env.NOVO_NEON_URL;
  if (novo) return novo;

  if (naVercel(env) && env[LEGACY_DATABASE_FLAG] !== "true") {
    throw new Error(
      "Conexão do banco não configurada: nenhuma variável NOVO_NEON_* encontrada neste ambiente da Vercel. " +
        `DATABASE_URL (banco legado) só é usada com ${LEGACY_DATABASE_FLAG}=true.`
    );
  }

  return env.DATABASE_URL || null;
}
