# Deploying the newsletter app (step by step)

Everything runs in AWS region **us-east-1**. Sending domain: **the-quintessential-shop.com** (DNS on Cloudflare). Cost is roughly $1–3/month. Lines starting with `$` are typed into Terminal.

## 1. One-time setup on your Mac
1. Install tools (needs [Homebrew](https://brew.sh)):
   ```
   $ brew install awscli aws-sam-cli
   $ aws --version && sam --version
   ```
2. In the AWS console, enable **IAM Identity Center** (search "IAM Identity Center" → Enable), create yourself a user, and give it an **AdministratorAccess** permission set on your account. (Using SSO avoids long-lived passwords.)
3. Log in from Terminal:
   ```
   $ aws configure sso
   ```
   Answer the prompts (start URL from Identity Center, region `us-east-1`, profile name `newsletter`). Then, each time you work:
   ```
   $ aws sso login --profile newsletter
   $ export AWS_PROFILE=newsletter AWS_REGION=us-east-1
   ```

## 2. Confirm your sending domain in SES
1. AWS console → **Amazon SES** (region us-east-1) → **Identities** → `the-quintessential-shop.com` should say **Verified** (DKIM "Successful"). You already added the DKIM and `mail.` records at Cloudflare; verification can take up to 72 hours (usually minutes). The Cloudflare records must be **DNS only** (grey cloud).
2. Also add a DMARC record in Cloudflare if you haven't: TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:you@the-quintessential-shop.com`.

## 3. Request production access (important)
New SES accounts are in the **sandbox**: they can only send to addresses you've verified, with low limits. Until this is approved, only test emails to verified addresses work.
1. SES → **Account dashboard** → **Request production access**.
2. Mail type: **Marketing**. Website: your store URL.
3. Use case description (adapt): *"We run an online art-on-demand store. Customers opt in to our newsletter through a form on our website. We send about X emails per month to opted-in customers. Every email contains an unsubscribe link and List-Unsubscribe header, and unsubscribes are honored immediately on our store (a flag is cleared on the customer record). We monitor bounces and complaints and remove problem addresses."*
4. Answer honestly that the list is opt-in only and you don't buy lists. Approval usually takes about a day. If asked for more detail, reply with how people sign up and how unsubscribe works.

## 4. Gather the settings you need
| Setting | Value |
|---|---|
| `AdminKey` | A long random password for this app's API. Make one: `$ openssl rand -hex 32` |
| `MedusaUrl` | `https://rashadmadisonstore-production.up.railway.app` |
| `MedusaAdminApiKey` | A **read-only** admin API key from Medusa Admin (Settings → API Key Management). Use a secret key only able to read customers if possible. |
| `UnsubscribeBaseUrl` | The store's unsubscribe page, e.g. `https://<your-store-domain>/unsubscribe` (must match what the store project builds) |
| `UnsubscribeSecret` | Another long random value (`openssl rand -hex 32`). **The exact same value must be set in the store.** |
| `MailFrom` | `The Quintessential <newsletter@the-quintessential-shop.com>` |
| `MailReplyTo` | Optional, e.g. your professional mailbox address |
| `PostalAddress` | Your business mailing address (legally required in the footer) |

Save these somewhere safe (a password manager).

## 5. Build and deploy
From this repository's folder:
```
$ npm install
$ sam build
$ sam deploy --guided
```
Answers: stack name `newsletter-app`, region `us-east-1`, enter the parameters above, say **Y** to "allow SAM to create roles", and **Y** to saving the configuration (`samconfig.toml` is not committed; it contains secrets, so keep it private). When it finishes, copy the **ApiUrl** output.

Later updates: `sam build && sam deploy`.

Note: the sending permission is granted to the scheduler function automatically. If SES is still in the sandbox, sends to unverified addresses will show up as failures in the send log.

## 6. Send a test email
First verify the address you'll send to (needed while in sandbox): SES → **Identities** → **Create identity** → Email address → click the link AWS emails you.

Then, from this repository's folder (uses your AWS login):
```
$ export MAIL_FROM="The Quintessential <newsletter@the-quintessential-shop.com>"
$ export UNSUBSCRIBE_BASE_URL="https://<your-store-domain>/unsubscribe"
$ export UNSUBSCRIBE_SECRET="<same secret as above>"
$ npm run send-test -- you@example.com
```
Check your inbox (and spam). Without `MAIL_FROM` it only prints "Dry run" and sends nothing.

## 7. Create, schedule and send an email with the API
Set shortcuts (use your ApiUrl and AdminKey):
```
$ API=https://xxxx.execute-api.us-east-1.amazonaws.com
$ KEY=<your AdminKey>
```
Create a draft (the unsubscribe link and address footer are added automatically):
```
$ curl -X POST $API/emails -H "x-admin-key: $KEY" -H "Content-Type: application/json" \
    -d '{"subject":"New prints this week","bodyHtml":"<h1>Hello!</h1><p>See what is new.</p>"}'
```
It returns `{"id":"..."}`. Then:
```
$ ID=<that id>
$ curl $API/emails -H "x-admin-key: $KEY"                       # list all
$ curl -X PUT $API/emails/$ID -H "x-admin-key: $KEY" -H "Content-Type: application/json" \
    -d '{"subject":"Updated subject"}'                           # edit (before it sends)
$ curl -X POST $API/emails/$ID/schedule -H "x-admin-key: $KEY" -H "Content-Type: application/json" \
    -d '{"scheduledAt":"2026-12-01T15:00:00Z"}'                  # schedule (UTC time, must be in the future)
$ curl -X POST $API/emails/$ID/send -H "x-admin-key: $KEY"       # or send now (goes out within 5 minutes)
$ curl $API/emails/$ID/log -H "x-admin-key: $KEY"                # who received it / errors
```
**Safety tip:** before your first real send, make sure only you are opted in (or test with `send-test`), since a send goes to everyone with `metadata.newsletter = true` in Medusa.

## Troubleshooting
- `401 Unauthorized` → wrong `x-admin-key`.
- Log shows errors like "not verified" / "sandbox" → SES production access isn't approved yet.
- Nobody gets the email but status is `sent` → Medusa returned no opted-in customers (check the flag and the read-only key).
- Email stuck in `sending` → the function was interrupted; check the log, then create a new draft for anyone missed.
