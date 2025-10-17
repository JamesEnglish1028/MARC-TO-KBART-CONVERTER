Deploying MARC-to-KBART to Render (Static Site)

This repo is a Vite + React (TypeScript) single-page app. These instructions add a `render.yaml` manifest to enable automatic deploys from Render's Git-based flow.

What I added

- `render.yaml` — Render manifest that builds the app and serves `dist/` as a static site.

Quick steps

1. Commit & push (already done by the helper script if you use the same branch).

2. Sign in to Render (https://render.com) and create a new "Static Site".
   - Connect your GitHub account and choose the `JamesEnglish1028/MARC-TO-KBART-CONVERTER` repository.
   - Render will detect `render.yaml` and use the specified settings.

3. Environment variables

If your app needs to call a backend, set `VITE_API_URL` and `VITE_API_TOKEN` in the Render static site's "Environment" tab.

Notes and tips

- The manifest uses `npm install && npm run build` as the build command and serves the `dist/` folder.
- If you prefer Yarn or pnpm, update `render.yaml` accordingly.
- If you'd rather keep builds out of Render and upload a pre-built `dist/`, you can use a different approach (deploy artifacts or object storage with a CDN).

Troubleshooting

- If the site returns a 404 on client-side routes, ensure the static site fallback is enabled in Render settings (it should by default for SPA apps).
- If the build fails due to environment variables, provide the required `VITE_API_URL` and `VITE_API_TOKEN`.

If you want, I can also:
- Add a GitHub Actions workflow that builds and deploys to Render via the Render API.
- Help you configure environment variables in Render.
