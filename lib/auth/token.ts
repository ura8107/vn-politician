import { fromBase64Url, timingSafeEqual, toBase64Url } from "./encoding";

/**
 * Signed session cookie.
 *
 * The cookie carries only a session id and an expiry, authenticated with
 * HMAC-SHA256. That lets the proxy (proxy.ts) reject forged or expired cookies
 * without a D1 round trip on every request; the authoritative session lookup
 * happens in lib/auth/session.ts when a page actually needs the user.
 *
 * This module is imported by the proxy, so it must stay free of `next/headers`
 * and of any Node-only API.
 */

export const SESSION_COOKIE_NAME = "vnp_session";

export type SessionTokenPayload = {
  sessionId: string;
  expiresAt: number;
};

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(message: string, secret: string): Promise<Uint8Array> {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importKey(secret),
    new TextEncoder().encode(message),
  );

  return new Uint8Array(signature);
}

export async function createSessionToken(
  payload: SessionTokenPayload,
  secret: string,
): Promise<string> {
  const message = `${payload.sessionId}.${payload.expiresAt}`;

  return `${message}.${toBase64Url(await sign(message, secret))}`;
}

/**
 * Returns the payload when the signature is valid and the expiry is in the
 * future, otherwise null. Never throws on malformed input.
 */
export async function verifySessionToken(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<SessionTokenPayload | null> {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [sessionId, expiresAtRaw, signature] = parts;
  const expiresAt = Number.parseInt(expiresAtRaw, 10);

  if (!sessionId || !Number.isInteger(expiresAt)) {
    return null;
  }

  let provided: Uint8Array;

  try {
    provided = fromBase64Url(signature);
  } catch {
    return null;
  }

  const expected = await sign(`${sessionId}.${expiresAt}`, secret);

  // Verify the signature before the expiry so both outcomes cost the same.
  if (!timingSafeEqual(provided, expected)) {
    return null;
  }

  if (expiresAt <= now) {
    return null;
  }

  return { sessionId, expiresAt };
}
