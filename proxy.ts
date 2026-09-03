import { NextResponse, type NextRequest } from "next/server";
import { getNeonAuth } from "@/lib/auth/server";

export async function proxy(request: NextRequest) {
  if (process.env.ACCESS_CONTROL_MODE !== "active") return NextResponse.next();
  const auth = getNeonAuth();
  if (!auth) return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  return auth.middleware({ loginUrl: "/auth/sign-in" })(request);
}

export const config = {
  matcher: ["/((?!api/auth|api/access/readiness|auth|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest).*)"],
};
