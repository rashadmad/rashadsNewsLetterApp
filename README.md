# Rashad's Newsletter App

This repository is a **newsletter app** starter built around [listmonk](https://github.com/knadh/listmonk).

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
   Then set a strong `LISTMONK_DB_PASSWORD` in `.env`.
3. Start the Docker services:
   ```bash
   docker compose up -d
   ```
4. Open listmonk at [http://localhost:9000](http://localhost:9000).

The app service uses an idempotent startup command (`--install --idempotent`, `--upgrade`, then server start), so first-time setup and normal restarts use the same flow.

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
