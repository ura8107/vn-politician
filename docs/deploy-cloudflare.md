# Cloudflare Workers Deployment Guide

This guide assumes all Vietnam National Assembly member data is already loaded
into your Cloudflare D1 database (see `docs/assembly-members-import.md`).

Goal:

- Source of truth: GitHub
- Hosting: Cloudflare Workers (via the `@opennextjs/cloudflare` adapter)
- Database: Cloudflare D1
- First production URL: `https://vn-politician.<your-account>.workers.dev`

There is no external database or auth provider. Everything runs on Cloudflare,
so the site never pauses from inactivity.

## 0. What you need before starting

Prepare these 2 things first:

1. A GitHub account
2. A Cloudflare account (with Wrangler authenticated)

No environment variables are required for the database. The optional
`NEXT_PUBLIC_APP_URL` is only used for metadata such as OG images.

## 1. Confirm the local project is ready

Open the project root in Terminal and run:

```bash
git status
git branch --show-current
git remote -v
```

You want to confirm:

- you are inside this project
- your branch is `main`
- `origin` points to your GitHub repository

If you have local changes that should be included in production, commit them
first.

Example:

```bash
git add .
git commit -m "Prepare Cloudflare deployment"
git push origin main
```

## 2. Authenticate Wrangler with Cloudflare

`@opennextjs/cloudflare` uses the `wrangler` CLI, which must be logged in to your
Cloudflare account:

```bash
npx wrangler login
```

A browser window opens for the Cloudflare login flow. Verify the account:

```bash
npx wrangler whoami
```

For CI/CD use a token instead:

```bash
export CLOUDFLARE_API_TOKEN=YOUR_TOKEN
export CLOUDFLARE_ACCOUNT_ID=YOUR_ACCOUNT_ID
npx wrangler whoami
```

## 3. Create the D1 database (once)

Create the database and add the binding to `wrangler.jsonc`:

```bash
npx wrangler d1 create vn-politician-db
```

Wrangler prints a snippet like this:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "vn-politician-db",
    "database_id": "REPLACE_WITH_THE_PRINTED_ID"
  }
]
```

Add it to `wrangler.jsonc`. This file is already committed with the `DB`
binding, so the first deploys run out of the box.

After creating or changing bindings, regenerate the types:

```bash
npm run cf-typegen
```

## 4. Load the schema and data into D1

Apply the table schema and the 500-row seed:

```bash
npx wrangler d1 execute vn-politician-db --file d1/schema.sql --remote
npx wrangler d1 execute vn-politician-db --file d1/seed.sql --remote
```

Verify the row count:

```bash
npx wrangler d1 execute vn-politician-db \
  --command "SELECT COUNT(*) FROM assembly_members;" --remote
```

Expect `500`. To refresh data later, see `docs/assembly-members-import.md`.

## 5. Preview locally (optional but recommended)

Preview the app locally in the exact Workers runtime before deploying:

```bash
npm install
cp .dev.vars.example .dev.vars   # if not created yet
npm run preview
```

`npm run preview` performs the OpenNext build and serves the app on
`http://localhost:8787` via `wrangler dev`, using your local D1 data
(`--local` schema/seed from step 4).

Check `/`, `/members`, and `/members/json`.

## 6. Run the first deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

This runs:

```
opennextjs-cloudflare build    # runs `next build`, then adapts the output
opennextjs-cloudflare deploy   # uploads the Worker + static assets via Wrangler
```

Then open the generated URL:

```text
https://vn-politician.<your-account>.workers.dev
```

If the build fails, check:

- `npx wrangler whoami` shows the expected account
- your Worker name in `wrangler.jsonc` does not collide with another Worker on
  your account

## 7. Confirm the production site works

After the first deploy, open these pages:

- `/`
- `/members`
- `/members/json`

What to expect:

- `/` should render the homepage
- `/members` should load rows from `assembly_members` in D1
- `/members/json` should show JSON for the first records

If `/members` or `/members/json` shows an error, check these first:

1. the D1 database was created on the same account you deploy from
2. `d1/schema.sql` and `d1/seed.sql` were applied with `--remote`
3. the `d1_databases` binding in `wrangler.jsonc` matches the created database
4. you redeployed (`npm run deploy`) after applying the data

## 8. Use a custom domain (recommended)

`*.workers.dev` URLs sometimes require visitors to dismiss a browser warning for
subdomains open to abuse. Point a domain you control at the Worker instead:

1. Open Cloudflare Dashboard
2. Open `Workers & Pages`
3. Open your `vn-politician` Worker
4. `Settings` -> `Domains & Routes`
5. Add a custom domain, e.g. `vn-politician.example.com`

Then update `NEXT_PUBLIC_APP_URL` to the custom domain and redeploy so metadata
points at the real URL.

## 9. How updates work after today

After the initial setup, your workflow becomes:

1. edit locally
2. test locally if needed
3. apply schema/data changes to D1 if needed
4. commit changes
5. push to GitHub
6. run `npm run deploy` (or set up CI/CD in GitHub Actions)

Typical commands:

```bash
git add .
git commit -m "Update members page"
git push origin main
npm run deploy
```

### Data updates

The member data is static. To update it:

```bash
python3 scripts/build_d1_seed.py          # regenerate d1/seed.sql from CSV
npx wrangler d1 execute vn-politician-db --file d1/schema.sql --remote
npx wrangler d1 execute vn-politician-db --file d1/seed.sql --remote
```

### Optional: deploy from GitHub Actions

Add a workflow that runs `npm ci` and `npm run deploy`, and store
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets.

## 10. Beginner troubleshooting

### `npm run deploy` fails with authentication errors

Likely causes:

- `npx wrangler login` was not completed
- `CLOUDFLARE_API_TOKEN` is missing or expired
- `CLOUDFLARE_ACCOUNT_ID` does not match the token

Run `npx wrangler whoami` to verify.

### Deploy succeeds but `/members` is empty or errors

Likely causes:

- schema/seed were only applied to the local database (`--local` used)
- the wrong account's D1 database is bound in `wrangler.jsonc`
- the code was not rebuilt after applying data

Check the remote database directly:

```bash
npx wrangler d1 execute vn-politician-db \
  --command "SELECT COUNT(*) FROM assembly_members;" --remote
```

Remove build artifacts and redeploy:

```bash
rm -rf .open-next .next
npm run deploy
```

### Auth pages (login/sign-up) are gone

Login/sign-up were removed together with Supabase. The workspace is public by
design and uses no auth provider.

## 11. Recommended first-production checklist

Use this checklist once:

- `git push origin main` completed
- `npx wrangler login` completed
- D1 database created and bound in `wrangler.jsonc`
- `d1/schema.sql` and `d1/seed.sql` applied with `--remote`
- `SELECT COUNT(*)` returns 500
- first `npm run deploy` succeeded
- `/members` works
- `/members/json` works
- (optional) custom domain attached

After that, future deployments are much simpler.