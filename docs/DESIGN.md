# Newsletter app – design (v3)

## Scope
Create emails, schedule them, send them. **Not** in scope: signups or owning the subscriber list – the store's Medusa holds the list and handles unsubscribes.

## Architecture (AWS serverless, near-zero idle cost)
- **API**: API Gateway HTTP API → Lambda (`src/lambda.js: api`), protected by `x-admin-key`. API-first, no UI yet.
- **Storage**: one DynamoDB on-demand table – drafts, schedules, send log only. A sparse index finds due emails.
- **Scheduling**: an EventBridge schedule runs the `scheduler` Lambda every 5 minutes; it sends anything scheduled in the past. "Send now" just schedules for now.
- **Sending**: Amazon SES via a swappable mailer function (`src/mailer.js`). Dry-run (logs only) when `MAIL_FROM` is unset.
- **Deploy**: AWS SAM (`template.yaml`). Secrets are CloudFormation `NoEcho` parameters for simplicity (SSM Parameter Store is a later upgrade).
- Local dev: `npm start` uses in-memory storage.
- Known limit: if the scheduler Lambda dies mid-send, the email stays in `sending` (so it is never double-sent); check `GET /emails/:id/log` and re-queue manually. Fine for a small list; use SQS for large lists.
- The DynamoDB store is unit-untested against real AWS; do a test deploy with a dry-run first.

## Recipients (from Medusa)
At send time we call Medusa Admin API `GET /admin/customers` (read-only key) and keep customers with `metadata.newsletter === true`, deduped by lowercased email. The store session is adding that opt-in flag; if they choose a different shape only `src/recipients.js` changes.

## Unsubscribe (agreed contract with the store)
Every email gets a footer link, plus `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers (needed by Gmail/Yahoo), all pointing to the store's unsubscribe URL (`UNSUBSCRIBE_BASE_URL`) with `?token=<token>`.

**Token format** (shared secret `UNSUBSCRIBE_SECRET`, same value in the store):
```
token = base64url(lowercased email) + "." + base64url(HMAC-SHA256(secret, lowercased email))
```
The store endpoint must verify the HMAC (constant-time), then set `metadata.newsletter=false` on the customer with that email. It should accept **GET** (confirmation page) and **POST** (one-click from mail clients; token stays in the query string). Reference code: `src/unsubscribe.js` (`makeToken` / `verifyToken`). Tokens have no expiry, so old emails keep working. Sending refuses to run without these settings. `POSTAL_ADDRESS` is added to the footer.

## Email provider: Amazon SES
Cheapest realistic option (about $0.10 per 1,000 emails). A Cloudflare professional mailbox / Email Routing is for person-to-person mail, not bulk newsletters, so it isn't used for sending – but use the same domain so everything lines up (`From: news@yourdomain.com`, `Reply-To` = your professional address via `MAIL_REPLY_TO`).

DNS records to add in Cloudflare (set all to **DNS only**, grey cloud):
1. **DKIM**: three `CNAME` records `<token>._domainkey.yourdomain.com` → `<token>.dkim.amazonses.com` (SES shows the tokens when you verify the domain – Easy DKIM).
2. **Custom MAIL FROM** (recommended, e.g. `bounce.yourdomain.com`): `MX` → `10 feedback-smtp.<region>.amazonses.com`, and `TXT` `"v=spf1 include:amazonses.com ~all"` on that subdomain.
3. **DMARC**: `TXT` on `_dmarc.yourdomain.com` = `v=DMARC1; p=none; rua=mailto:you@yourdomain.com`.
4. If the root domain already has an SPF TXT (e.g. for Cloudflare Email Routing), don't add a second one – merge, e.g. `v=spf1 include:_spf.mx.cloudflare.net include:amazonses.com ~all`.
5. In SES, **request production access** (new accounts are sandboxed to verified addresses only).

## Rough monthly cost (verify on AWS pricing pages)
Lambda, API Gateway, EventBridge, DynamoDB at this scale: pennies, mostly inside free tiers (about $0–1). SES: about $0.10 per 1,000 emails, e.g. 2,000 subscribers × 4 issues/month ≈ $0.80. **Expect roughly $1–3/month** total.

## Decisions needed from the user
1. AWS account/region and a verified domain (and who adds the DNS records in Cloudflare).
2. Confirm using SES instead of Cloudflare for sending.
3. Postal address for the footer; which From / Reply-To addresses.
4. Medusa opt-in shape (assumed `customer.metadata.newsletter`) – coordinate with the store work.
5. Later: an editor/admin page (currently API only).
