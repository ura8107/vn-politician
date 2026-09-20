import { getDb } from "@/lib/cf/env";

import { sha256Hex } from "./encoding";
import { hashPassword } from "./password";

/** User and password-reset records in D1, replacing Supabase's auth.users. */

export type AppUser = {
  id: string;
  email: string;
  password_hash: string;
};

/** Emails are stored lowercased so the unique index is case-insensitive. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  return getDb()
    .prepare("SELECT id, email, password_hash FROM app_users WHERE email = ?")
    .bind(normalizeEmail(email))
    .first<AppUser>();
}

export async function findUserById(id: string): Promise<AppUser | null> {
  return getDb()
    .prepare("SELECT id, email, password_hash FROM app_users WHERE id = ?")
    .bind(id)
    .first<AppUser>();
}

export async function createUser(
  email: string,
  password: string,
): Promise<AppUser> {
  const user: AppUser = {
    id: crypto.randomUUID(),
    email: normalizeEmail(email),
    password_hash: await hashPassword(password),
  };

  await getDb()
    .prepare(
      "INSERT INTO app_users (id, email, password_hash) VALUES (?, ?, ?)",
    )
    .bind(user.id, user.email, user.password_hash)
    .run();

  return user;
}

export async function updateUserPassword(
  userId: string,
  password: string,
): Promise<void> {
  await getDb()
    .prepare(
      "UPDATE app_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(await hashPassword(password), userId)
    .run();
}

export type PasswordReset = {
  user_id: string;
  expires_at: number;
  used_at: string | null;
};

/**
 * Looks up a reset token. Only the SHA-256 hash is stored, so a dump of the
 * table cannot be replayed as a set of working links.
 */
export async function findPasswordReset(
  token: string,
): Promise<PasswordReset | null> {
  return getDb()
    .prepare(
      "SELECT user_id, expires_at, used_at FROM app_password_resets WHERE token_hash = ?",
    )
    .bind(await sha256Hex(token))
    .first<PasswordReset>();
}

export async function markPasswordResetUsed(token: string): Promise<void> {
  await getDb()
    .prepare(
      "UPDATE app_password_resets SET used_at = datetime('now') WHERE token_hash = ?",
    )
    .bind(await sha256Hex(token))
    .run();
}
