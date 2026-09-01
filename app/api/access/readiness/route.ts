import { authEnvironmentStatus } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = authEnvironmentStatus();
  return Response.json({
    authConfigured: status.configured,
    enforcementActive: status.enforcementActive,
    directoryReady: true,
  });
}
