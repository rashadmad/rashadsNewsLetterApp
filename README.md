# Rashad's Newsletter App

This repository is a **newsletter app** starter built around [listmonk](https://github.com/knadh/listmonk).

## Getting started

1. Clone this repository:
   ```bash
   git clone https://github.com/rashadmad/rashadsNewsLetterApp.git
   cd rashadsNewsLetterApp
   ```
2. Clone listmonk source (optional, for customization/reference):
   ```bash
   git clone https://github.com/knadh/listmonk.git
   ```
   > Note: the Docker setup in this repo uses the published `listmonk/listmonk` image by default.
3. Update admin credentials in `config.toml` before first run.
4. Start the Docker services:
   ```bash
   docker compose up -d
   ```
5. Open listmonk at [http://localhost:9000](http://localhost:9000).

## Docker services

- `db`: PostgreSQL database for listmonk.
- `listmonk`: listmonk app server.

Default credentials and settings are defined in:
- `docker-compose.yml`
- `config.toml`
