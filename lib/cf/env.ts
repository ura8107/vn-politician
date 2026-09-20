import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Returns the Workers bindings (D1, KV, vars, secrets) for the current request.
 *
 * `next dev` gets the same bindings because next.config.ts calls
 * initOpenNextCloudflareForDev().
 */
export function getEnv(): CloudflareEnv {
  return getCloudflareContext().env;
}

/** The D1 database holding assembly members and the auth tables. */
export function getDb(): D1Database {
  const { DB } = getEnv();

  if (!DB) {
    throw new Error(
      "D1 binding `DB` is missing. Check the d1_databases section of wrangler.jsonc.",
    );
  }

  return DB;
}

/** HMAC key for session cookies. Fails loudly instead of signing with a default. */
export function getSessionSecret(): string {
  const { SESSION_SECRET } = getEnv();

  if (!SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET is not set. Add it to .dev.vars locally, or run `wrangler secret put SESSION_SECRET`.",
    );
  }

  return SESSION_SECRET;
}

/** Whether self-service sign-up is accepted. Controlled by the AUTH_SIGNUP_MODE var. */
export function isSignUpOpen(): boolean {
  // Widened to string: wrangler types narrows vars to the literal in wrangler.jsonc.
  const mode: string = getEnv().AUTH_SIGNUP_MODE;

  return mode !== "closed";
}
