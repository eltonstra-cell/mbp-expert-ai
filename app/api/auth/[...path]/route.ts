import { getNeonAuth } from "@/lib/auth/server";

const auth = getNeonAuth();

function indisponivel() {
  return Response.json(
    { configured: false, error: "A autenticação ainda não foi configurada neste ambiente." },
    { status: 503 }
  );
}

const handlers = auth?.handler();

export const GET = handlers?.GET ?? indisponivel;
export const POST = handlers?.POST ?? indisponivel;
export const PUT = handlers?.PUT ?? indisponivel;
export const PATCH = handlers?.PATCH ?? indisponivel;
export const DELETE = handlers?.DELETE ?? indisponivel;
