// Sends one test email through SES to a single address (no Medusa, no database).
// Usage: MAIL_FROM=... UNSUBSCRIBE_BASE_URL=... UNSUBSCRIBE_SECRET=... npm run send-test -- you@example.com
import { createMailer } from "../src/mailer.js";
import { unsubscribeHeaders, unsubscribeUrl, withFooter } from "../src/unsubscribe.js";

const to = process.argv[2];
const { MAIL_FROM, MAIL_REPLY_TO, UNSUBSCRIBE_BASE_URL, UNSUBSCRIBE_SECRET, POSTAL_ADDRESS } = process.env;

if (!to || !UNSUBSCRIBE_BASE_URL || !UNSUBSCRIBE_SECRET) {
  console.error("Usage: npm run send-test -- you@example.com  (needs UNSUBSCRIBE_BASE_URL and UNSUBSCRIBE_SECRET; MAIL_FROM to really send)");
  process.exit(1);
}

const url = unsubscribeUrl({ baseUrl: UNSUBSCRIBE_BASE_URL, secret: UNSUBSCRIBE_SECRET }, to);
await createMailer({ from: MAIL_FROM, replyTo: MAIL_REPLY_TO })({
  to,
  subject: "Test email from the newsletter app",
  html: withFooter("<p>This is a test. If you can read this, sending works.</p>", url, POSTAL_ADDRESS),
  headers: unsubscribeHeaders(url),
});
console.log(MAIL_FROM ? `Sent test email to ${to}` : "Dry run (MAIL_FROM not set): nothing was sent");
