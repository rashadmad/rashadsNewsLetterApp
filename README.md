# rashadsNewsLetterApp

This repository is a **newsletter app** starter built around [listmonk](https://github.com/knadh/listmonk).

## Getting started

1. Clone this repository:
   ```bash
   git clone https://github.com/rashadmad/rashadsNewsLetterApp.git
   cd rashadsNewsLetterApp
   ```
2. Clone listmonk source (optional, for customization):
   ```bash
   git clone https://github.com/knadh/listmonk.git
   ```
3. Start the Docker installation:
   ```bash
   docker compose up -d
   ```
4. Open listmonk at [http://localhost:9000](http://localhost:9000).

## Docker services

- `db`: PostgreSQL database for listmonk.
- `listmonk`: listmonk app server.

Default credentials and settings are defined in:
- `/home/runner/work/rashadsNewsLetterApp/rashadsNewsLetterApp/docker-compose.yml`
- `/home/runner/work/rashadsNewsLetterApp/rashadsNewsLetterApp/config.toml`
