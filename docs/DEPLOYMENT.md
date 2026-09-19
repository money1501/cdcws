# Deploying Drawgon

Drawgon is two deployables plus a managed database:

```
Browser  ──►  Netlify (static Vite bundle)
                 │  HTTPS + credentials
                 ▼
              Render (NestJS API, long-lived process)
                 │  Postgres over TLS
                 ▼
              Supabase (Postgres only — no PostgREST, no Supabase Auth)
```

Supabase supplies the **database**, not the API. The browser never talks to it
directly: Postgres speaks a raw TCP protocol a browser cannot open, and the
credentials would have to ship inside the JS bundle for it to try. Every
`DATABASE_URL` reference lives under `backend/`.

## 1. Backend → Render

The repo ships a blueprint at [`render.yaml`](../render.yaml).

1. Render dashboard → **New → Blueprint** → pick this repository.
2. Render reads `render.yaml` and creates the `drawgon-api` web service.
3. Fill in the three secrets marked `sync: false`:

   | Variable             | Value                                                       |
   | -------------------- | ----------------------------------------------------------- |
   | `DATABASE_URL`       | The Supabase **session pooler** URI, port `5432`            |
   | `BETTER_AUTH_SECRET` | Reuse the local value, or `openssl rand -hex 32`            |
   | `BETTER_AUTH_URL`    | `https://drawgon-api.onrender.com` (this service's own URL) |

   Use the session pooler (`:5432`), **not** the transaction pooler (`:6543`).
   TypeORM and better-auth both use prepared statements, which PgBouncer's
   transaction mode does not support.

4. Deploy. The health check at `/` runs `SELECT 1`, so a green service means
   the Supabase connection is live — not merely that Node started.

Pending migrations run automatically when the Render service starts. For a
fresh database outside Render, run `npm run migration:run` from `backend/`
with `DATABASE_URL` pointing at it before starting the API.

> On Render's free plan the service sleeps after ~15 minutes idle, so the first
> request after a quiet spell takes 30–60s. Later requests are normal speed.

## 2. Frontend → Netlify

`VITE_API_URL` is inlined by Vite at **build** time, not read at runtime.
Saving the variable changes nothing on its own — you must rebuild.

1. Site settings → Environment variables → `VITE_API_URL` =
   `https://drawgon-api.onrender.com`
2. Deploys → **Trigger deploy → Clear cache and deploy site**.
3. Verify at `/debug/health`: it should read _"Backend reachable"_.

If the value is missing, the bundle falls back to `http://localhost:3000`. An
HTTPS page blocks that as mixed content before the request leaves the browser,
which is why the symptom is a page that loads forever rather than an error.

## 3. Cross-site cookies

Netlify and Render are different sites, so the session cookie is cross-site.
`backend/src/common/auth/auth.instance.ts` switches better-auth to
`SameSite=None; Secure; Partitioned` whenever `NODE_ENV=production`.

Without it, login appears to succeed and the next request arrives anonymous,
bouncing straight back to `/login`. Locally `NODE_ENV=development` keeps the
default `Lax` cookie, since `Secure` would stop it being stored over plain
http.

`FRONTEND_URL` must exactly match the deployed origin — it is both the CORS
origin in `main.ts` and better-auth's `trustedOrigins` entry. No trailing slash.

## Checklist

- [ ] `DATABASE_URL` uses the session pooler on port 5432
- [ ] `BETTER_AUTH_URL` is the Render URL, `FRONTEND_URL` the Netlify one
- [ ] `NODE_ENV=production` on Render (drives the cookie attributes)
- [ ] `VITE_API_URL` set on Netlify **and** the site rebuilt afterwards
- [ ] `/debug/health` on the deployed site reports the backend reachable
