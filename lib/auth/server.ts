import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";
import { isAccessControlActive } from "@/lib/accessMode";

let authInstance: NeonAuth | null | undefined;

export function authEnvironmentStatus() {
  const baseUrl =
    process.env.NOVO_NEON_NEON_AUTH_BASE_URL?.trim() ||
    process.env.NEON_AUTH_BASE_URL?.trim() ||
    "";
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET?.trim() || "";
  return {
    configured: Boolean(baseUrl) && cookieSecret.length >= 32,
    enforcementActive: isAccessControlActive(process.env),
  };
}

export function getNeonAuth(): NeonAuth | null {
  if (authInstance !== undefined) return authInstance;
  if (!authEnvironmentStatus().configured) {
    authInstance = null;
    return authInstance;
  }
  authInstance = createNeonAuth({
    baseUrl:
      process.env.NOVO_NEON_NEON_AUTH_BASE_URL?.trim() ||
      process.env.NEON_AUTH_BASE_URL!,
    cookies: {
      secret: process.env.NEON_AUTH_COOKIE_SECRET!,
      sessionDataTtl: 300,
    },
  });
  return authInstance;
}
