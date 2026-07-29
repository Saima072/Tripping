---
name: deploy-vercel
description: Deploy and debug TripSwipe on Vercel. Use this for anything touching deployment — Vercel build failures, editing vercel.json or api/index.ts, environment variables, "Request failed" errors in the deployed app, choosing between the embedded demo database and real Postgres, or reading Vercel build/function logs. Consult it BEFORE changing deploy config; its failure-signature table maps log lines to root causes already diagnosed once.
---

# TripSwipe on Vercel

## Architecture

One Vercel project at the **repo root**: `web/dist` served static, the whole
Express API bundled into a single serverless function from `api/index.ts`
(which just re-exports `createApp()` from `server/src/app.js`). `vercel.json`
rewrites `/api/(.*)` to the function (Express receives the original URL, so
its routing works unchanged) and everything else to `index.html` for the SPA.

## Rules learned the hard way — don't regress these

- `installCommand` must stay `npm install --include=dev`: Vercel sets
  `NODE_ENV=production` during install, which silently drops devDependencies
  (vite, typescript, prisma CLI) and the build dies later with confusing errors.
- `buildCommand` must stay **cd-based** (`cd server && npm run prisma:generate
  && cd ../web && npm run build`), never `npm run x --workspace y`: Vercel's
  npm has rejected the workspace flag form. Hoisted bins resolve fine from
  subdirectories via ancestor `node_modules/.bin`.
- The Vercel project's **Root Directory setting must be empty** (repo root).
- `server/prisma/schema.prisma` needs `previewFeatures = ["driverAdapters"]`
  for the embedded-DB adapter; don't remove it.

## Database modes

`server/src/config.ts` decides at boot:

| Env state | Mode |
|---|---|
| `EMBEDDED_DB` truthy (1/true/yes/on) | embedded PGlite (in-process WASM Postgres, ephemeral, auto-seeds on cold start) |
| No flag, no `DATABASE_URL` | embedded, with a loud warning — the zero-config default |
| `DATABASE_URL` set | real Postgres; `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (≥32 chars) become mandatory |

Verify which mode a deployment is running from outside:
`GET /api/health` → `{"ok":true,"db":"embedded"}` or `"db":"postgres"`.
Embedded data resets on every cold start/redeploy and is per-instance — demo
only. Persistent setup: hosted Postgres (pooled connection string), both JWT
secrets, then run `prisma migrate deploy` + `npm run seed` against it once.

## Failure-signature table (from real incidents)

| Log/App symptom | Root cause | Fix |
|---|---|---|
| `added ~150 packages` (full monorepo is ~240) | build ran inside a subdirectory — Root Directory setting points at `web` or `server` | clear Root Directory in Project → Settings → Build & Deployment, redeploy |
| `No workspaces found: --workspace=server` | same root-directory issue, or workspace flags crept back into vercel.json | root directory + cd-based commands |
| `cd: server: No such file or directory` | same root-directory issue | same |
| App shows generic "Request failed" on every API call | the function is crashing at startup (config validation `process.exit`) — check the deployment's Functions log for "Invalid environment configuration" | fix/remove the offending env var; since the embedded fallback landed, zero env vars is a working config |
| Build green but `/api/*` all 404 | function not built — `api/` missing from the deployed root | root-directory setting again, or `api/index.ts` moved |

Env vars only apply to deployments created **after** saving them — always
redeploy after changing one.

## Reproduce Vercel's environment locally (do this before pushing config fixes)

```bash
# clean tree of the deployed branch, install exactly like Vercel:
git archive origin/main | tar -x -C /tmp/mainclone && cd /tmp/mainclone
NODE_ENV=production npm install --include=dev   # package count ≈240 = healthy
NODE_ENV=production sh -c 'cd server && npm run prisma:generate && cd ../web && npm run build'
```

Validate packaging with `npx vercel@latest build` (offline: create
`.vercel/project.json` with `{"projectId":"local","orgId":"local","settings":{}}`
first). Then run the **actual bundle** — this catches runtime issues `vercel
build` can't:

```bash
cd .vercel/output/functions/api/index.func
NODE_ENV=production node -e "require('./api/index.js').default.listen(4003)"
curl localhost:4003/api/health   # then run the verify-app smoke sequence
```

Also confirm the PGlite WASM survived bundling:
`ls .vercel/output/functions/api/index.func/node_modules/@electric-sql/pglite/dist/pglite.wasm`.
