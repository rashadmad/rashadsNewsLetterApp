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
3. Start the Docker services:
   ```bash
   docker compose up -d
   ```
4. Run one-time listmonk installation (interactive; set admin credentials when prompted):
   ```bash
   docker compose run --rm listmonk sh -c 'DB_PASS_ESCAPED=$(printf "%s" "$LISTMONK_DB_PASSWORD" | sed "s/[\\/&]/\\\\&/g"); cp /listmonk/config.toml /tmp/config.toml; sed -i "s|password = \"\"|password = \"${DB_PASS_ESCAPED}\"|" /tmp/config.toml; ./listmonk --install --config /tmp/config.toml'
   ```
5. Open listmonk at [http://localhost:9000](http://localhost:9000).

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
- `config.toml`
- `.env` (local, untracked secrets)

`LISTMONK_DB_PASSWORD` is injected into a temporary runtime config for both `docker compose up` and the one-time install command.
