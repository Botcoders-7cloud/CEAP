---
description: How to deploy CEAP to production (Vercel frontend + Render backend)
---

# CEAP Deployment Workflow

> **CRITICAL**: Always deploy to the `ceap_api` Vercel project linked to Botcoders GitHub account. NEVER deploy to the `web` project.

## Frontend (Vercel)

1. Commit all changes:
```bash
cd /Users/nagababu/Desktop/college\ \&\ Event\ MS/ceap
git add -A && git commit -m "your commit message"
```

2. Push to GitHub:
```bash
git push origin main
```

3. Link to the correct Vercel project (from repo root, NOT from apps/web):
// turbo
```bash
cd /Users/nagababu/Desktop/college\ \&\ Event\ MS/ceap
rm -rf .vercel apps/web/.vercel
npx -y vercel link --project ceap_api --yes
```

4. Force deploy to production:
```bash
cd /Users/nagababu/Desktop/college\ \&\ Event\ MS/ceap
npx -y vercel --prod --yes
```

5. Verify the deployment URL is `ceapapi.vercel.app`

## Backend (Render)

- Backend auto-deploys from the same GitHub push to `Botcoders-7cloud/CEAP`
- Production URL: `https://ceap-api.onrender.com`
- If manual deploy needed, trigger from Render dashboard

## Important Notes

- **Vercel project**: `ceap_api` (URL: ceapapi.vercel.app)
- **GitHub repo**: `Botcoders-7cloud/CEAP`
- **Root directory in Vercel settings**: `apps/web` (so deploy from repo root, not apps/web)
- **DO NOT** create new Vercel projects or deploy to `web` project
