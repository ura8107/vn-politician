#!/usr/bin/env node
/**
 * Administrator commands for the D1-backed auth tables.
 *
 * Supabase provided these through its dashboard and its email templates.
 * Cloudflare has no outbound email service, so account creation and password
 * resets are driven from here and the reset link is delivered out of band.
 *
 *   npm run auth:create-user -- --email you@example.com --password 'secret123'
 *   npm run auth:reset-link  -- --email you@example.com
 *   npm run auth:list-users
 *
 * All commands run against the local D1 database by default. Add --remote to
 * target production.
 */

import { randomBytes, randomUUID, createHash, pbkdf2Sync } from "node:crypto";
import { spawnSync } from "node:child_process";

/** Must match lib/auth/password.ts. Workers caps PBKDF2 at 100,000 iterations. */
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 32;
const DERIVED_BYTES = 32;
const MIN_PASSWORD_LENGTH = 8;

const DATABASE = "vn-politician";
const RESET_TTL_MS = 60 * 60 * 1000;

function usage(message) {
  if (message) {
    console.error(`Error: ${message}\n`);
  }

  console.error(
    [
      "Usage:",
      "  node scripts/auth-admin.mjs create-user --email <addr> --password <pw> [--remote]",
      "  node scripts/auth-admin.mjs reset-link  --email <addr> [--remote] [--base-url <url>]",
      "  node scripts/auth-admin.mjs list-users  [--remote]",
    ].join("\n"),
  );

  process.exit(message ? 1 : 0);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command, remote: false };

  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];

    if (flag === "--remote") {
      args.remote = true;
      continue;
    }

    if (flag.startsWith("--")) {
      const value = rest[i + 1];

      if (value === undefined || value.startsWith("--")) {
        usage(`${flag} needs a value`);
      }

      args[flag.slice(2).replaceAll("-", "_")] = value;
      i += 1;
      continue;
    }

    usage(`Unexpected argument: ${flag}`);
  }

  return args;
}

function toBase64Url(buffer) {
  return buffer.toString("base64url");
}

/** Produces the same string format that lib/auth/password.ts verifies. */
function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES);
  const hash = pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    DERIVED_BYTES,
    "sha256",
  );

  return `pbkdf2$sha256$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

/** Runs a statement through wrangler and returns the parsed rows. */
function d1(sql, { remote }) {
  const args = [
    "wrangler",
    "d1",
    "execute",
    DATABASE,
    remote ? "--remote" : "--local",
    "--json",
    "--command",
    sql,
  ];

  const result = spawnSync("npx", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error("wrangler d1 execute failed");
  }

  try {
    const parsed = JSON.parse(result.stdout);

    return parsed[0]?.results ?? [];
  } catch {
    console.error(result.stdout);
    throw new Error("Could not parse the wrangler output as JSON");
  }
}

function requireEmail(args) {
  if (!args.email || !args.email.includes("@")) {
    usage("--email must be a valid address");
  }

  return args.email.trim().toLowerCase();
}

function findUser(email, args) {
  const [user] = d1(
    `SELECT id, email FROM app_users WHERE email = ${sqlString(email)}`,
    args,
  );

  return user ?? null;
}

function createUserCommand(args) {
  const email = requireEmail(args);
  const password = args.password;

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    usage(`--password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (findUser(email, args)) {
    console.error(`A user with the email ${email} already exists.`);
    process.exit(1);
  }

  const id = randomUUID();

  d1(
    `INSERT INTO app_users (id, email, password_hash) VALUES (${sqlString(id)}, ${sqlString(email)}, ${sqlString(hashPassword(password))})`,
    args,
  );

  console.log(`Created ${email} (${id}) in the ${args.remote ? "remote" : "local"} database.`);
}

function resetLinkCommand(args) {
  const email = requireEmail(args);
  const user = findUser(email, args);

  if (!user) {
    console.error(`No user with the email ${email}.`);
    process.exit(1);
  }

  // Only the hash is stored, so the table cannot be replayed as working links.
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = Date.now() + RESET_TTL_MS;

  d1(
    `INSERT OR REPLACE INTO app_password_resets (token_hash, user_id, expires_at, used_at)
     VALUES (${sqlString(tokenHash)}, ${sqlString(user.id)}, ${expiresAt}, NULL)`,
    args,
  );

  const baseUrl = args.base_url ?? "http://localhost:3000";

  console.log("");
  console.log(`Password reset link for ${email} (valid for 1 hour, single use):`);
  console.log("");
  console.log(`  ${baseUrl.replace(/\/$/, "")}/auth/update-password?token=${token}`);
  console.log("");
  console.log("Send it over a channel you already trust. It is not stored anywhere in plaintext.");
}

function listUsersCommand(args) {
  const users = d1(
    "SELECT id, email, created_at FROM app_users ORDER BY created_at ASC",
    args,
  );

  if (users.length === 0) {
    console.log("No users yet. Create one with: npm run auth:create-user -- --email ... --password ...");
    return;
  }

  console.table(users);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case "create-user":
      return createUserCommand(args);
    case "reset-link":
      return resetLinkCommand(args);
    case "list-users":
      return listUsersCommand(args);
    case "--help":
    case "-h":
    case undefined:
      return usage();
    default:
      return usage(`Unknown command: ${args.command}`);
  }
}

main();
