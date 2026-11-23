# Rashad's Newsletter App

Receives newsletter signups from the store and saves them in SQLite. See [docs/DESIGN.md](docs/DESIGN.md) for the plan.

## Run
```bash
npm install
export NEWSLETTER_SIGNUP_KEY=some-long-random-secret   # see .env.example
npm start        # listens on PORT (default 3000)
npm test
```

## API
- `POST /newsletter-signups` – header `x-newsletter-key`, JSON `{email, firstName, lastName, source}`. Dedupes on lowercased email.
- `GET /health`

## Connect the store
Set in the store: `NEWSLETTER_SIGNUP_URL=https://<this-app>/newsletter-signups` and `NEWSLETTER_SIGNUP_KEY` (same value as here).

## Config
`PORT`, `NEWSLETTER_SIGNUP_KEY` (required), `DB_PATH` (default `./data/newsletter.db`).
