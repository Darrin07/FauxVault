# FauxVault

A purposefully vulnerable web banking application built to demonstrate
and document OWASP Top 10 attack vectors and their mitigations.

## Team

- Darrin Miller
- Nicholas Noochla-or
- Felicia Barrett
- Ethan David Lee

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | ^19.2.4 |
| Frontend | Vite | ^8.0.4 |
| Frontend | MUI (Material UI) | ^9.0.0 |
| Backend | Node.js | 22.x |
| Backend | Express.js | ^5.2.1 |
| Backend | bcryptjs | ^3.0.3 |
| Backend | jsonwebtoken | ^9.0.3 |
| Database | PostgreSQL | 15 |
| Infra | Docker | 25.0.14 |
| Infra | Docker Compose | v5.1.2 |
| Deployment | AWS EC2 | — |

## Prerequisites

- [Node.js](https://nodejs.org/) v22.x and npm v11.x
- [Docker](https://www.docker.com/) and Docker Compose (for full-stack setup)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Darrin07/FauxVault.git
cd FauxVault
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Add the following to your `.env` for the database connection:

```env
# Database
DB_USER=fauxvault_user
DB_PASSWORD=fauxvault_pass
DB_NAME=fauxvault
DB_HOST=db
DB_PORT=5432

# Auth
JWT_SECRET=your_jwt_secret_here
```

### 3a. Run with Docker Compose (recommended)

```bash
docker-compose up
```

**Note:** If you encounter `exec format error` when building or starting the
Docker stack, disable BuildKit:
```bash
DOCKER_BUILDKIT=0 docker-compose up --build
```

This starts the Express API on `http://localhost:80` and PostgreSQL on port `5432`.

### 3b. Run manually (without Docker)

**Backend:**

```bash
cd server
npm install
npm run dev
```

The API runs on `http://localhost:3001` by default.

**Frontend:**

```bash
# from the repo root
npm install
npm run dev
```

Vite serves the frontend on `http://localhost:5173`.

> The frontend uses mock data by default (`VITE_USE_MOCK=true`). Set to `false` in `.env` to connect to the Express backend.

### 4. Seed the database

With PostgreSQL running, apply the schema and seed data:

```bash
psql -U fauxvault_user -d fauxvault -f database/FauxVault_Schema.sql
psql -U fauxvault_user -d fauxvault -f database/FauxVault_Seed.sql
```

## Testing

```bash
cd server
npm test
```

## Disclaimer

This application is intentionally vulnerable and is for educational
cybersecurity research only. Do not deploy on a public network.
