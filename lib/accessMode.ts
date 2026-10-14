export type AccessControlMode = "active" | "preparation" | "off";

type Env = Record<string, string | undefined>;

export function isVercelDeployment(env: Env): boolean {
  return env.VERCEL_ENV === "production" || env.VERCEL_ENV === "preview";
}

// Na Vercel (production/preview) o padrão é fechado: variável ausente ou com
// valor desconhecido vira "active". Só `off` explícito desliga o controle.
// Fora da Vercel, mantém o comportamento anterior: sem `active`, não aplica.
export function resolveAccessControlMode(env: Env): AccessControlMode {
  const bruto = (env.ACCESS_CONTROL_MODE || "").trim().toLowerCase();
  if (bruto === "active" || bruto === "preparation" || bruto === "off") {
    return bruto;
  }
  return isVercelDeployment(env) ? "active" : "off";
}

export function isAccessControlActive(env: Env): boolean {
  return resolveAccessControlMode(env) === "active";
}
