import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp, openDb } from "./app.js";
import { createMailer } from "./mailer.js";
import { medusaRecipients } from "./recipients.js";
import { startScheduler } from "./sender.js";

const env = process.env;
const dbPath = env.DB_PATH || "./data/newsletter.db";
mkdirSync(dirname(dbPath), { recursive: true });

const db = openDb(dbPath);
const getRecipients = medusaRecipients({ baseUrl: env.MEDUSA_URL, apiKey: env.MEDUSA_ADMIN_API_KEY });
const mailer = createMailer({ apiKey: env.RESEND_API_KEY, from: env.MAIL_FROM || "news@example.com" });

startScheduler({ db, getRecipients, mailer });
const port = Number(env.PORT) || 3000;
createApp({ db, adminKey: env.ADMIN_KEY?.trim(), getRecipients, mailer }).listen(port, () =>
  console.log(`Newsletter app listening on :${port}`)
);
