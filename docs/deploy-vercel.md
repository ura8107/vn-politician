# Deploy to Vercel

This project is prepared for a simple public deployment:

- Hosting: Vercel
- Visibility: anyone with the link can open it
- Initial URL: `https://<project>.vercel.app`
- Search indexing: discouraged with `robots.txt` and page metadata

## 1. Prepare GitHub

1. Create a new GitHub repository.
2. From the project root, connect this local repository to GitHub.
3. Push the current branch.

Typical commands:

```bash
git remote add origin <YOUR_GITHUB_REPO_URL>
git branch -M main
git add .
git commit -m "Prepare public deployment"
git push -u origin main
```

## 2. Create the Vercel project

1. Sign in to Vercel.
2. Click `Add New...` -> `Project`.
3. Import the GitHub repository.
4. Keep the framework as `Next.js`.
5. Before clicking deploy, add the environment variables from `.env.example`.

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## 3. First deploy

1. Click `Deploy`.
2. Wait for the build to complete.
3. Open the generated `*.vercel.app` URL.

Check these pages:

- `/`
- `/members`
- `/members/json`

## 4. Update Supabase settings

If you want the auth pages to work correctly in production:

1. Open Supabase Dashboard.
2. Go to `Authentication` -> `URL Configuration`.
3. Set `Site URL` to your Vercel URL.
4. Add the Vercel URL to `Redirect URLs`.

## 5. Share the link

At this stage, anyone who knows the Vercel URL can open the site.
The project is configured to discourage search indexing, but this is not a security boundary.

## 6. Future updates

After the first setup:

1. Make local changes.
2. Commit them.
3. Push to GitHub.
4. Vercel will redeploy automatically.
