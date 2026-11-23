# Newsletter app – design proposal (v2)

## Scope
This app does **three things only**: create emails, schedule them, and send them.
It does **not** handle signups and does **not** own the subscriber list. People subscribe through the form on the store, and the list lives in the store's Medusa backend. (The old `POST /newsletter-signups` endpoint and subscriber table were removed.)

The store's `/api/newsletter` route currently forwards signups to `NEWSLETTER_SIGNUP_URL`. Once Medusa holds the list, that forwarding should be pointed at Medusa (or removed) – see decisions below.

## Stack
- Node.js 20+, plain `node:http`, SQLite (`better-sqlite3`). Storage holds only drafts, schedules and send history – no personal data except recipient emails in the send log.
- Email provider: **Resend** (recommended). With no API key the app runs in dry-run mode (logs instead of sending).
- Hosting: anything with a persistent disk (Railway, Fly.io, small VPS).

## Data
- `emails`: subject, HTML body, status (`draft`/`scheduled`/`sending`/`sent`/`failed`), `scheduled_at`, `sent_at`.
- `send_log`: per-recipient result of each send (success/error).

## API (all require header `x-admin-key`)
- `POST /emails` `{subject, bodyHtml}` – create a draft; `GET /emails`, `GET /emails/:id`, `PUT /emails/:id` – list/read/edit (until sent)
- `POST /emails/:id/schedule` `{scheduledAt}` – ISO date in the future
- `POST /emails/:id/send` – send now
- `GET /emails/:id/log` – who got it / failures
- `GET /health` (no key)

A scheduler checks every minute and sends due emails. Each email is "claimed" before sending so it can't go out twice.

## Getting recipients from Medusa
At send time the app asks Medusa for the list (read-only), so there's nothing to keep in sync. Simplest option, implemented in `src/recipients.js`: call Medusa's **Admin API** `GET /admin/customers` with a read-only API key and keep customers whose `metadata.newsletter === true`.
**Caveat:** the store code I can see does not yet save signups into Medusa – the form only forwards to the companion app. Someone needs to add that (e.g. store the opt-in on the customer or in a small custom Medusa "subscriber" module). The recipient code is one small function, so it's easy to adapt to whatever shape Medusa ends up using (or a CSV export as a fallback).

## Creating emails
First version: write HTML via the API (or a Markdown/HTML file + small script). A simple admin page/editor with templates is a later step.

## Decisions needed
1. **How Medusa exposes the list** – metadata flag on customers (assumed), a custom subscriber module, or manual CSV export. Also: who builds the store-side change that saves signups into Medusa.
2. **Unsubscribe** – recommended: each email has an unsubscribe link pointing at the store/Medusa, which flips the opt-in flag, so this app never owns consent state. Required by law (CAN-SPAM/GDPR) before real sends; also needs a postal address in the footer.
3. **Email provider** (Resend recommended) and a verified sending domain.
4. **Hosting** (persistent disk for SQLite, or switch to Postgres).
5. **Editor**: API/scripts first, or build a small admin page now?
