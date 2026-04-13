# VN Politician

`VN Politician` is a `Next.js` app backed by `Supabase`. It is currently used as
an intake and validation workspace for Vietnam National Assembly member data.

The app reads from `public.assembly_members` and provides:

- a public homepage
- a table view at `/members`
- a JSON inspection view at `/members/json`
- Supabase auth pages from the starter template

## Local setup

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example` and set:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase data setup

Project-specific setup docs:

- [Assembly member import guide](docs/assembly-members-import.md)
- [Vercel deployment guide](docs/deploy-vercel.md)

The table creation SQL lives in:

- [supabase/001_create_assembly_members.sql](supabase/001_create_assembly_members.sql)

## Deploy

This project is intended to deploy through `GitHub` + `Vercel`.

Production deployment steps are documented here:

- [docs/deploy-vercel.md](docs/deploy-vercel.md)

Short version:

1. Push `main` to GitHub
2. Import the repo into Vercel
3. Add the 2 Supabase environment variables
4. Deploy
5. Update Supabase `Site URL` and `Redirect URLs`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
