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

Seed the database on first run, or after resetting `pgdata`:

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

- Root `.env`: `VITE_USE_MOCK=false`
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

## API-Only Docker Workflow

Use this when you want the backend and database in Docker and you do not need
the React dev server.

### Topology

- Express runs in Docker and is exposed on `http://localhost:80`
- PostgreSQL runs in Docker on `localhost:5432`
- There is no frontend container in the current Compose file

### When to use it

- Backend-only development
- API smoke testing with `curl`, Postman, or scripted checks
- Verifying the containerized API path
- Reproducing bugs that only show up when Express runs inside Compose

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

In this mode, the app container uses `DB_HOST=db` from the root `.env` and
reaches Postgres through Docker service discovery.

### Request flow

```text
HTTP client
  -> http://localhost:80/api/*
  -> Express container port 3001
  -> PostgreSQL service db:5432
```

## Why Vite Proxies to localhost:3001 Instead of localhost:80

The Vite proxy targets `http://localhost:3001` on purpose. That points
straight at the host-run Express dev server used in the recommended workflow.

This matters because:

- The recommended frontend workflow does not run the backend in Docker
- Host-run Express reloads quickly with `npm run dev`
- Port `80` is reserved for the Dockerized API path, which is a separate mode
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
| API-only Docker | None | Docker host port `:80` | Docker `:5432` | `http://localhost:80/api` | Backend verification and container-path testing |

## Related Files

- `README.md`
- `vite.config.js`
- `docker-compose.yml`
- `.env.example`
- `server/.env.example`
