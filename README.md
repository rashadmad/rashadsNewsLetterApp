# Rashad's Newsletter App

Create, schedule and send newsletter emails. The subscriber list is **not** stored here – recipients are fetched read-only from the store's Medusa backend at send time. See [docs/DESIGN.md](docs/DESIGN.md).

## Run
```bash
npm install
cp .env.example .env   # then export the variables (ADMIN_KEY is required)
npm start              # listens on PORT (default 3000); dry-run unless RESEND_API_KEY is set
npm test
```

## API (header `x-admin-key` required, except `/health`)
- `POST /emails` `{subject, bodyHtml}` – create draft; `GET /emails`, `GET /emails/:id`, `PUT /emails/:id`
- `POST /emails/:id/schedule` `{scheduledAt}` – future ISO date; a scheduler sends due emails every minute
- `POST /emails/:id/send` – send now
- `GET /emails/:id/log` – per-recipient results

## Config
See `.env.example`: `ADMIN_KEY`, `MEDUSA_URL`, `MEDUSA_ADMIN_API_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, `DB_PATH`, `PORT`.
