# FauxVault Development and Production Workflows

This doc covers the runtime topologies the repo supports today, when to use
each one, and what the intended production request flow looks like.

## Recommended Local Frontend Development Workflow

This is the default workflow for day-to-day work on the React frontend and the
Express API.

### Topology

- PostgreSQL runs in Docker on `localhost:5432`
- Express runs on the host at `http://localhost:3001`
- Vite runs on the host at `http://localhost:5173`
- The frontend calls relative `/api/...` paths, and Vite proxies them to
  `http://localhost:3001`

### Why this is the recommended workflow

- Frontend changes get fast Vite HMR
- Backend changes get fast `node --watch` reloads
- The database still runs in a consistent containerized environment
- Frontend and backend logs stay separate and easier to debug

### Setup

Copy both env templates:

```bash
cp .env.example .env
cp server/.env.example server/.env
```

Start only the database:

```bash
docker compose up -d db
```

Seed the database using the npm scripts (recommended):

```bash
# First-time bootstrap: applies schema, then seed
npm run db:init

# Later, to reset data after drift (toggles flipped, tests mutated rows,
# or the seed file changed on main):
npm run db:reseed
```

`db:init` runs both `FauxVault_Schema.sql` and `FauxVault_Seed.sql`. `db:reseed` runs only the seed file, which TRUNCATEs the data tables and reinserts, leaving the schema untouched. Use `db:init` once per fresh `pgdata` volume; use `db:reseed` to fix drift without touching schema.

Both scripts read `POSTGRES_USER` and `POSTGRES_DB` from the `db` container's environment (which Compose populates from `.env`), so they work unchanged in dev and on the prod EC2 box as long as `.env` is present.

**When to run `db:reseed`:**

- A vulnerability behaves as vulnerable when the admin toggle shows hardened, or vice versa. On 2026-05-13 a stale `brute_force=TRUE` row survived a seed-default flip from TRUE to FALSE.
- Login with the documented seed credentials fails (`admin` / `AdminPass123`, or `test_user` / `Password123`). Your local users table has been mutated by prior tests or manual logins.
- Account `FV-USER-002` balance is not `$500.50`, or more than one transaction exists. Transfer tests didn't clean up after themselves.
- A vulnerability module is missing from the admin page that you can see in `FauxVault_Seed.sql`. Someone added a new toggle row and your DB never picked it up.
- A test passes locally but fails in CI (or vice versa) and the failure looks like "wrong row count" or "unexpected boolean" rather than "wrong code path."
- You just pulled from `main` and behavior feels off without a clear code reason. The pull may include a seed-file change that has not been re-applied locally.
- The `admin` user is missing, has a different role, or has extra rows. Manual experimentation has drifted the identity pool.

> If you see *schema*-shaped drift instead (missing tables, missing columns, `relation does not exist` errors), run `db:init` rather than `db:reseed`. `db:reseed` only fixes data drift; schema drift needs the schema file re-applied.

#### Manual fallback

The npm scripts wrap the `psql` calls below. Use these directly when debugging connection issues, applying only one file, or doing a one-off operation against the DB. The literals `fauxvault_user` and `fauxvault` match the stock `.env.example`; substitute if you've changed `POSTGRES_USER` or `POSTGRES_DB` locally.

```bash
docker compose exec -T db psql -U fauxvault_user -d fauxvault \
  -f - < database/FauxVault_Schema.sql

docker compose exec -T db psql -U fauxvault_user -d fauxvault \
  -f - < database/FauxVault_Seed.sql
```

Start the backend on the host:

```bash
cd server
npm install
npm run dev
```

Start the frontend on the host from the repo root:

```bash
npm install
npm run dev
```

Use these values in this mode:

- Root `.env`: `VITE_API_BASE_URL=/api`
- Root `.env`: `DB_HOST=db`
- `server/.env`: `DB_HOST=localhost`

### Request flow

```text
Browser http://localhost:5173
  -> Vite dev server
  -> /api/* proxy
  -> Express http://localhost:3001
  -> PostgreSQL localhost:5432
```

## Full-Stack Docker Workflow

Use this when you want the entire stack — frontend, backend, and database — running in Docker with a single command. This is the production topology and the recommended path for demo and portability testing.

### Topology

- nginx serves the React frontend on `http://localhost:80`
- Express runs in Docker on port `3001`; nginx uses the Compose network, and the host can reach it only at `127.0.0.1:3001` for local API testing
- PostgreSQL runs in Docker on `localhost:5432`

### When to use it

- Full-stack demo and walkthroughs
- Portability testing on a clean machine
- EC2 deployment verification
- Reproducing bugs that only show up when the full stack runs in containers

### Setup

Copy both env templates if you have not already:

```bash
cp .env.example .env
cp server/.env.example server/.env
```

Bring up the API and database:

```bash
docker compose up
```

If the stack fails with an `exec format error`, retry with BuildKit disabled:

```bash
DOCKER_BUILDKIT=0 docker compose up --build
```

Seed the database on first stand-up (or after wiping `pgdata`):

```bash
npm run db:init
```

The script runs from the host and reaches the `db` container via `docker compose exec`, so the app being containerized makes no difference. See "Seed the database" in the recommended workflow above for `db:reseed` and drift symptoms.

In this mode, the app container uses `DB_HOST=db` from the root `.env` and
reaches Postgres through Docker service discovery.

Direct API requests for Postman, OpenAPI checks, and adversarial testing can use
`http://localhost:3001/api/*` from the host. That binding is loopback-only; the
public/demo entrypoint remains nginx at `http://localhost/api/*`.

### Request flow

```text
Browser
  -> http://localhost:80
  -> nginx container
  -> /api/* proxied to Express container port 3001
  -> PostgreSQL service db:5432
```

## Why Vite Proxies to localhost:3001 Instead of localhost:80

The Vite proxy targets `http://localhost:3001` on purpose. That points
straight at the host-run Express dev server used in the recommended workflow.

This matters because:

- The recommended frontend workflow does not run the backend in Docker
- Host-run Express reloads quickly with `npm run dev`
- Port `80` is now owned by nginx in the full-stack Docker topology
- Keeping the proxy on `3001` avoids coupling frontend development to the
  Compose API container

If the proxy pointed to `localhost:80`, frontend work would depend on the API
container being up, or developers would be bouncing between two backend
topologies without it being obvious. Keeping the proxy on `3001` makes the
default dev path explicit.

## Production Topology Note

In production, the frontend should keep using relative `/api` paths instead of
hard-coding a backend origin.

### Intended production shape

- The frontend is built as static assets
- A web server or reverse proxy serves the frontend
- Requests to `/api/*` are routed to the Express backend
- Express connects to the production Postgres instance through its deployment
  environment

### Why relative `/api` matters

- The same frontend build can work across environments
- Browser requests avoid cross-origin complexity when frontend and API share one
  public origin
- Deployment-specific routing stays in infrastructure config, not in the React
  bundle

### Conceptual request flow

```text
Browser
  -> https://<public-origin>/
  -> static frontend assets

Browser
  -> https://<public-origin>/api/*
  -> reverse proxy
  -> Express API
  -> PostgreSQL
```

## Workflow Summary

| Workflow | Frontend | Backend | Database | Primary URL | Best for |
|----------|----------|---------|----------|-------------|----------|
| Recommended local dev | Host Vite `:5173` | Host Express `:3001` | Docker `:5432` | `http://localhost:5173` | Daily frontend and full-stack development |
| Full-stack Docker | nginx `:80` | Docker `127.0.0.1:3001` | Docker `:5432` | `http://localhost` | Demo, EC2 deployment, portability testing |

## Related Files

- `README.md`
- `vite.config.js`
- `docker-compose.yml`
- `.env.example`
- `server/.env.example`
