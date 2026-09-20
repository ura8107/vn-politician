import { NextResponse, type NextRequest } from "next/server";

import { getSessionSecret } from "@/lib/cf/env";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/token";

/**
 * Route protection for the Workers runtime.
 *
 * Supabase's version refreshed an access token against GoTrue on every
 * request. This one only checks the cookie's HMAC signature and expiry, which
 * needs no network or database call. Pages that need the actual user call
 * getCurrentUser() from lib/auth/session.ts, which does hit D1.
 */

const PUBLIC_PATH_PREFIXES = ["/", "/members", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) =>
    prefix === "/" ? pathname === "/" : pathname.startsWith(prefix),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths short-circuit before touching the environment, so a missing
  // SESSION_SECRET cannot take the public pages down with it.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = token
    ? await verifySessionToken(token, getSessionSecret())
    : null;

  if (payload) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  url.pathname = "/auth/login";
  url.search = "";

  const response = NextResponse.redirect(url);

  // Clear a cookie that is expired or no longer verifies, so the browser stops
  // sending it on every subsequent request.
  if (token) {
    response.cookies.delete(SESSION_COOKIE_NAME);
  }

  return response;
}

export const config = {
  // Next 16 runs the proxy on the Node.js runtime and rejects `runtime: "edge"`
  // here, so OpenNext bundles it as Node.js middleware and prints an
  // "experimental" warning at build time. Nothing in this file needs Node
  // APIs, so the warning is expected rather than a sign of trouble.
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
