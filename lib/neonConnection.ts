export function resolveNeonDatabaseUrl(
  env: Record<string, string | undefined>
) {
  return env.NOVO_NEON_URL || env.DATABASE_URL || null;
}
