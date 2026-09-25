# Rashad's Newsletter App

This repository is a **newsletter app** starter built around [listmonk](https://github.com/knadh/listmonk).

## Prerequisites

- Docker
- Docker Compose v2 plugin (`docker compose`)

## Getting started

1. Clone this repository:
   ```bash
   git clone https://github.com/rashadmad/rashadsNewsLetterApp.git
   cd rashadsNewsLetterApp
   ```
2. Create local environment values:
   ```bash
   cp .env.example .env
   ```
   `LISTMONK_DB_USER` and `LISTMONK_DB_NAME` are configuration values; adjust them as needed for your setup.
   **You must replace `LISTMONK_DB_PASSWORD=change-this-db-password` before first run.**
3. Start only the database service:
   ```bash
   docker compose up -d db
   ```
4. Wait for Postgres to become ready:
   ```bash
   until docker compose exec -T db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; do sleep 2; done
   ```
5. Run one-time setup commands:
   ```bash
   docker compose run --rm listmonk ./listmonk --install --idempotent --yes
   docker compose run --rm listmonk ./listmonk --upgrade --yes
   ```
6. Start the app service:
   ```bash
   docker compose up -d listmonk
   ```
7. Open listmonk at [http://localhost:9000](http://localhost:9000).
   Sign in with the default bootstrap account created by `--install --yes` (`admin` / `listmonk`) and change it immediately.

## Optional: clone upstream listmonk source

If you want to inspect or customize upstream code directly:

```bash
git clone https://github.com/knadh/listmonk.git
```

## Docker services

- `db`: PostgreSQL database for listmonk.
- `listmonk`: listmonk app server (image version is pinned in `docker-compose.yml`).

Settings are defined in:
- `docker-compose.yml`
- `.env` (local, untracked secrets)
