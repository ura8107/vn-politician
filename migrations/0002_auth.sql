-- Replaces Supabase Auth (GoTrue). See docs/requirements-cloudflare.md R6.

create table if not exists app_users (
  id text primary key,
  -- Stored lowercased so the unique index is effectively case-insensitive.
  email text not null unique,
  -- Format: pbkdf2$sha256$<iterations>$<salt b64url>$<hash b64url>
  password_hash text not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists app_sessions (
  id text primary key,
  user_id text not null references app_users (id) on delete cascade,
  created_at text not null default (datetime('now')),
  -- Unix epoch milliseconds. Also embedded in the signed cookie so the proxy
  -- can reject expired sessions without touching D1.
  expires_at integer not null
);

create index if not exists app_sessions_user_id_idx
  on app_sessions (user_id);

create index if not exists app_sessions_expires_at_idx
  on app_sessions (expires_at);

-- Password reset links issued by an administrator (`npm run auth:reset-link`),
-- because Cloudflare has no outbound email service.
create table if not exists app_password_resets (
  -- SHA-256 of the token. The plaintext token only ever exists in the link.
  token_hash text primary key,
  user_id text not null references app_users (id) on delete cascade,
  created_at text not null default (datetime('now')),
  expires_at integer not null,
  used_at text
);

create index if not exists app_password_resets_user_id_idx
  on app_password_resets (user_id);
