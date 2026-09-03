import { getNeonAuth } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = getNeonAuth();
  if (!auth) {
    return Response.json({ configured: false, authenticated: false });
  }

  try {
    const { data: session, error } = await auth.getSession();
    if (error || !session?.user) {
      return Response.json({ configured: true, authenticated: false });
    }

    const user = session.user as {
      id?: unknown;
      email?: unknown;
      name?: unknown;
    };
    const id = typeof user.id === "string" ? user.id.trim() : "";
    const email = typeof user.email === "string" ? user.email.trim() : "";

    if (!id || !email) {
      return Response.json({ configured: true, authenticated: false });
    }

    return Response.json({
      configured: true,
      authenticated: true,
      user: {
        id,
        email,
        name: typeof user.name === "string" ? user.name.trim() : "",
      },
    });
  } catch (error) {
    console.error("GET /api/access/session", error);
    return Response.json(
      { configured: true, authenticated: false, error: "Falha ao validar a sessão." },
      { status: 502 }
    );
  }
}
