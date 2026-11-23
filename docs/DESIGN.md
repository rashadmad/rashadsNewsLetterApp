# Newsletter app – design proposal

## Goal
Collect newsletter signups from the store (rashadmadisonstore) and, later, send newsletters to subscribers. This repo absorbs the empty `thequintessential-mail` repo.

## Recommended stack (kept deliberately small)
- **Node.js 20+ with plain `node:http`** – no web framework needed for one endpoint.
- **SQLite** (via `better-sqlite3`) – one file, no database server to pay for or manage.
- **Hosting:** any small host with a persistent disk (Railway, Fly.io, or a small VPS). Serverless hosts (Vercel) are *not* a fit for SQLite. If you prefer serverless, swap SQLite for Postgres (e.g. Neon) – the code touching the DB is ~15 lines.

## Subscriber storage
Table `subscribers`: `email` (primary key, lowercased – this is the dedupe key the store expects), `first_name`, `last_name`, `source`, `status` (`subscribed` / `unsubscribed`), `created_at`. Re-signups update the name instead of creating duplicates. Back up the `.db` file regularly.

## Signup endpoint (matches what the store sends)
`POST /newsletter-signups`, header `x-newsletter-key: <shared secret>`, JSON body:
```json
{ "email": "person@example.com", "firstName": "First", "lastName": "Last", "source": "the-quintessential-storefront" }
```
Returns `200 {ok:true}` on success, `401` bad key, `400` bad input. In the store set `NEWSLETTER_SIGNUP_URL=https://<this app>/newsletter-signups` and `NEWSLETTER_SIGNUP_KEY` to the same secret as this app. Also `GET /health` for uptime checks.

## Sending approach (not built yet)
Use a transactional/bulk email provider API (**Resend** recommended; Postmark or Amazon SES also fine) rather than running your own mail server. Plan:
1. Write newsletters as Markdown/HTML files or via a simple script.
2. A `npm run send` command loops over `subscribed` rows and sends in batches.
3. Every email carries an **unsubscribe link** (signed token → `GET /unsubscribe`), plus your postal address – legally required (CAN-SPAM/GDPR).
4. Consider double opt-in (confirmation email) before the first send.

## Decisions needed from you
1. Hosting choice (needs persistent disk for SQLite, or switch to Postgres).
2. Email provider (Resend recommended).
3. Double opt-in: yes/no.
4. How you want to write/send issues: script/Markdown files vs. a small admin page.
5. Whether to import store customers into the list (needs their consent).
