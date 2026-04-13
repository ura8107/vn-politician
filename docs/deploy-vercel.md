# Vercel Deployment Guide

This guide assumes all Vietnam National Assembly member data is already loaded
into your Supabase project.

Goal:

- Source of truth: GitHub
- Hosting: Vercel
- Database: Supabase
- First production URL: `https://<your-project>.vercel.app`

This project is already a `Next.js` app and already has a GitHub remote
configured, so you do not need to create a new repository from scratch.

## 0. What you need before starting

Prepare these 3 things first:

1. A GitHub account
2. A Vercel account
3. Your Supabase project values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

You can find the Supabase values in:

- Supabase Dashboard
- `Project Settings` -> `API`

Important:

- Use the `Publishable Key` if Supabase shows that label
- If your dashboard still shows `anon key`, that value also works here
- Do not use the `service_role` key in Vercel

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

In this repository, `origin` is already expected to exist.

If you have local changes that should be included in production, commit them
first.

Example:

```bash
git add .
git commit -m "Prepare Vercel deployment"
git push origin main
```

If `git push` asks for authentication, finish the GitHub login flow and run the
same command again.

## 2. Verify local environment variables

This project uses these public environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

They should already exist in your local `.env.local` for development.

Before deploying, confirm the values are correct in your local setup. Then copy
the same values into Vercel in the next step.

## 3. Import the GitHub repository into Vercel

1. Sign in to Vercel.
2. Click `Add New...`.
3. Click `Project`.
4. If asked, connect your GitHub account to Vercel.
5. Find the repository for this project: `vn-politician`.
6. Click `Import`.

On the project configuration screen:

- Framework Preset: `Next.js`
- Root Directory: leave as-is
- Build Command: leave default
- Output Directory: leave default
- Install Command: leave default

You do not need to add a `vercel.json` file for this deployment.

## 4. Add environment variables in Vercel

Before clicking deploy, open the `Environment Variables` section in Vercel and
add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Use exactly the same values as your local `.env.local`.

Recommended:

- add them to `Production`
- also add them to `Preview`

If you are not sure, adding them to all environments is fine for this project.

## 5. Run the first deployment

1. Click `Deploy`.
2. Wait until Vercel finishes the build.
3. Open the generated URL:

```text
https://<your-project>.vercel.app
```

If the build fails, open the deployment logs in Vercel and check:

- environment variables were entered correctly
- GitHub repository import used the correct branch
- the project was detected as `Next.js`

## 6. Confirm the production site works

After the first deploy, open these pages:

- `/`
- `/members`
- `/members/json`

What to expect:

- `/` should render the homepage
- `/members` should load rows from `public.assembly_members`
- `/members/json` should show JSON for the first records

If `/members` or `/members/json` shows an error, check these first:

1. the Vercel environment variables match Supabase exactly
2. the Supabase table really exists in the same project
3. the table has data
4. the table can be read by the credentials used in the app

## 7. Update Supabase Auth settings for production

This project includes auth routes, so you should update Supabase after the first
successful deploy.

In Supabase Dashboard:

1. Open `Authentication`
2. Open `URL Configuration`
3. Set `Site URL` to your production Vercel URL
4. Add the same Vercel URL to `Redirect URLs`

Example:

```text
Site URL:
https://vn-politician.vercel.app

Redirect URL:
https://vn-politician.vercel.app
```

Why this matters:

- email confirmation links need the correct production domain
- login-related redirects should return to your live site, not localhost

## 8. Share the site safely

Once deployed, anyone with the URL can open the site.

This project already discourages search indexing through metadata and
`robots.txt`, but that is not access control. Treat the URL as public.

## 9. How updates work after today

After the initial setup, your workflow becomes:

1. edit locally
2. test locally if needed
3. commit changes
4. push to GitHub
5. Vercel redeploys automatically

Typical commands:

```bash
git add .
git commit -m "Update members page"
git push origin main
```

You can watch the redeploy in:

- Vercel Dashboard -> your project -> `Deployments`

## 10. Beginner troubleshooting

### `git push origin main` fails

Likely causes:

- GitHub login is not complete in Terminal
- your GitHub token is missing or expired
- the remote repository has changes you do not have locally

Start by running:

```bash
git status
git remote -v
```

### Vercel deploy succeeds but data does not appear

Likely causes:

- wrong Supabase URL
- wrong publishable key
- using a different Supabase project than the one where you imported the data

### Auth pages behave strangely in production

Likely causes:

- `Site URL` in Supabase is still `http://localhost:3000`
- the production URL was not added to `Redirect URLs`

## 11. Recommended first-production checklist

Use this checklist once:

- `git push origin main` completed
- repository imported into Vercel
- Vercel environment variables added
- first deployment succeeded
- `/members` works
- `/members/json` works
- Supabase `Site URL` updated
- Supabase `Redirect URLs` updated

After that, future deployments are much simpler.
