# VN Politician

`VN Politician` is a `Next.js` app backed by `Cloudflare D1`. It is currently
used as an intake and validation workspace for Vietnam National Assembly member
data.

The app reads from the `assembly_members` table in D1 and provides:

- a public homepage with search entry point
- a searchable, paginated table view at `/members`
- a full profile page for each deputy at `/members/[id]`
- a raw JSON inspection view at `/members/json`

Everything runs on Cloudflare Workers, so there is no external database or auth
provider that can go idle and pause.

## Local setup

Install dependencies:

```bash
npm install
```

Prepare the local D1 database:

```bash
npx wrangler login
npx wrangler d1 execute vn-politician-db --file d1/schema.sql --local
npx wrangler d1 execute vn-politician-db --file d1/seed.sql --local
```

Then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data setup

Project-specific setup docs:

- [Assembly member import guide](docs/assembly-members-import.md)
- [Cloudflare deployment guide](docs/deploy-cloudflare.md)

The D1 schema and generated seed live in:

- [d1/schema.sql](d1/schema.sql)
- [d1/seed.sql](d1/seed.sql) (generated from `data/import/assembly_members.csv`
  by `scripts/build_d1_seed.py`)

Data is extracted from the archived official list of the 500 deputies elected
to the 16th National Assembly (`data/archive/Cong-Bo-Danh-Sach-Ch.pdf`, see
[data/archive/README.md](data/archive/README.md)) using
[scripts/extract_assembly_members.py](scripts/extract_assembly_members.py).

## Deploy

This project deploys through `GitHub` + `Cloudflare Workers` using the
`@opennextjs/cloudflare` adapter.

Production deployment steps are documented here:

- [docs/deploy-cloudflare.md](docs/deploy-cloudflare.md)

Short version:

1. Push `main` to GitHub
2. `npx wrangler login`
3. Create the D1 database and apply `d1/schema.sql` + `d1/seed.sql` with `--remote`
4. Run `npm run deploy`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run preview` (build and preview in the Workers runtime via Wrangler)
- `npm run deploy` (build and deploy to Cloudflare Workers)
- `npm run upload` (build and upload a new version without deploying it)
- `npm run cf-typegen` (regenerate `cloudflare-env.d.ts` from `wrangler.jsonc`)