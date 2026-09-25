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
   Then update `LISTMONK_DB_PASSWORD` in `.env` to a strong password.
3. Start only the database service and keep it running for installation:
   ```bash
   docker compose up -d db
   ```
4. Run one-time listmonk installation (interactive; set admin credentials when prompted):
   ```bash
   docker compose run --rm listmonk sh -c '/listmonk/render-listmonk-config.sh && ./listmonk --install --config /tmp/config.toml'
   ```
5. Start the app service:
   ```bash
   docker compose up -d listmonk
   ```
6. Open listmonk at [http://localhost:9000](http://localhost:9000).

Why this flow: `docker compose run --rm listmonk` is used once to initialize listmonk before the long-running app container starts, so installation and app runtime don't run concurrently.

## Optional: clone upstream listmonk source

If you want to inspect or customize upstream code directly:

```bash
git clone https://github.com/knadh/listmonk.git
```

## Docker services

- `db`: PostgreSQL database for listmonk.
- `listmonk`: listmonk app server (pinned to `listmonk/listmonk:v4.1.0`).

Settings are defined in:
- `docker-compose.yml`
- `scripts/render-listmonk-config.sh`
- `.env` (local, untracked secrets)

`LISTMONK_DB_PASSWORD` is read from `.env` and applied to a temporary runtime config for both `docker compose up` and the one-time install command.
