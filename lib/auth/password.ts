import { fromBase64Url, timingSafeEqual, toBase64Url } from "./encoding";

/**
 * Password hashing for the Workers runtime, replacing Supabase Auth's bcrypt.
 *
 * Stored format: pbkdf2$sha256$<iterations>$<salt b64url>$<hash b64url>
 *
 * scripts/auth-admin.mjs produces the same format with node:crypto so an
 * administrator can create users and reset passwords from the CLI.
 */

/** Cloudflare Workers caps PBKDF2 at 100,000 iterations. */
export const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 32;
const DERIVED_BITS = 256;
const ALGORITHM = "pbkdf2$sha256";

export const MIN_PASSWORD_LENGTH = 8;

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as BufferSource,
      iterations,
    },
    key,
    DERIVED_BITS,
  );

  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, salt, PBKDF2_ITERATIONS);

  return [
    ALGORITHM,
    PBKDF2_ITERATIONS,
    toBase64Url(salt),
    toBase64Url(hash),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");

  // "pbkdf2", "sha256", iterations, salt, hash
  if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256") {
    return false;
  }

  const iterations = Number.parseInt(parts[2], 10);

  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  const salt = fromBase64Url(parts[3]);
  const expected = fromBase64Url(parts[4]);
  const actual = await deriveBits(password, salt, iterations);

  return timingSafeEqual(actual, expected);
}
