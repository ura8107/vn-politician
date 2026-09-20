# VN Politician

`VN Politician` is a `Next.js` app that runs entirely on `Cloudflare`. It is an
intake and validation workspace for Vietnam National Assembly member data.

| Concern | Stack |
|---|---|
| Hosting | Cloudflare Workers (Next.js bundled with [OpenNext](https://opennext.js.org/cloudflare)) |
| Database | Cloudflare D1 |
| Auth | Sessions in D1, PBKDF2 via WebCrypto, HMAC-signed cookies |
| Cache | Workers KV |
| Static assets | Workers Static Assets |

The app reads from the D1 table `assembly_members` and provides:

- a public homepage
- a table view at `/members` with accent-insensitive search
- a JSON inspection view at `/members/json`
- sign-in / sign-up / password pages under `/auth`
- a signed-in area at `/protected`

## Local setup

```bash
npm install
npx wrangler login
```

Fill in the ids in `wrangler.jsonc`, then:

```bash
cp .dev.vars.example .dev.vars   # set SESSION_SECRET
npm run cf:typegen
npm run db:migrate:local
npm run db:generate-seed
npm run db:seed:local
npm run auth:create-user -- --email you@example.com --password 'your-password'
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To run against the real Workers runtime instead of `next dev`:

```bash
npm run preview
```

## Documentation

- [Cloudflare migration requirements](docs/requirements-cloudflare.md) — what was replaced with what, and why
- [Cloudflare deployment guide](docs/deploy-cloudflare.md) — step-by-step setup and deploy
- [Assembly member import guide](docs/assembly-members-import.md) — PDF to D1 pipeline

Schema lives in [migrations/](migrations/) and is applied with
`wrangler d1 migrations apply`.

## Deploy

```bash
npm run deploy
```

Full instructions, including secrets, continuous deployment, and the first
production checklist, are in [docs/deploy-cloudflare.md](docs/deploy-cloudflare.md).

## Scripts

App:

- `npm run dev` — Next.js dev server with Cloudflare bindings
- `npm run preview` — build and serve on the local Workers runtime
- `npm run deploy` — build and deploy to Cloudflare Workers
- `npm run build` / `npm run lint`
- `npm run cf:typegen` — regenerate `cloudflare-env.d.ts` after editing `wrangler.jsonc`

Database:

- `npm run db:migrate:local` / `npm run db:migrate:remote`
- `npm run db:generate-seed` — CSV to SQL
- `npm run db:seed:local` / `npm run db:seed:remote`

Accounts (append `-- --remote` to target production):

- `npm run auth:create-user -- --email <addr> --password <pw>`
- `npm run auth:reset-link -- --email <addr>`
- `npm run auth:list-users`
