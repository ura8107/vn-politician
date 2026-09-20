import { cookies } from "next/headers";

import { getDb, getSessionSecret } from "@/lib/cf/env";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
} from "./token";

/**
 * Session storage, replacing Supabase Auth's cookie refresh flow.
 *
 * Sessions live in D1 so that signing out (or resetting a password) revokes
 * them immediately; the cookie only proves which session is being claimed.
 */

/** Matches the 30-day window Supabase used for its refresh tokens. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  email: string;
};

function isSecureContext(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function createSession(userId: string): Promise<void> {
  const db = getDb();
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_TTL_MS;

  await db
    .prepare(
      "INSERT INTO app_sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    )
    .bind(sessionId, userId, expiresAt)
    .run();

  const token = await createSessionToken(
    { sessionId, expiresAt },
    getSessionSecret(),
  );

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureContext(),
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  cookieStore.delete(SESSION_COOKIE_NAME);

  if (!token) {
    return;
  }

  const payload = await verifySessionToken(token, getSessionSecret());

  if (!payload) {
    return;
  }

  await getDb()
    .prepare("DELETE FROM app_sessions WHERE id = ?")
    .bind(payload.sessionId)
    .run();
}

/** Revokes every session for a user. Used after a password change. */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await getDb()
    .prepare("DELETE FROM app_sessions WHERE user_id = ?")
    .bind(userId)
    .run();
}

/**
 * Resolves the signed cookie to a real user. Returns null for a missing,
 * forged, expired, or already-revoked session.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token, getSessionSecret());

  if (!payload) {
    return null;
  }

  const row = await getDb()
    .prepare(
      `SELECT users.id AS id, users.email AS email, sessions.expires_at AS expires_at
       FROM app_sessions AS sessions
       JOIN app_users AS users ON users.id = sessions.user_id
       WHERE sessions.id = ?`,
    )
    .bind(payload.sessionId)
    .first<{ id: string; email: string; expires_at: number }>();

  if (!row || row.expires_at <= Date.now()) {
    return null;
  }

  return { id: row.id, email: row.email };
}

/** Best-effort cleanup of expired rows, called on sign-in. */
export async function deleteExpiredSessions(): Promise<void> {
  await getDb()
    .prepare("DELETE FROM app_sessions WHERE expires_at <= ?")
    .bind(Date.now())
    .run();
}
