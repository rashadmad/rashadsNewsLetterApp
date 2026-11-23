import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp, openDb } from "./app.js";

const dbPath = process.env.DB_PATH || "./data/newsletter.db";
mkdirSync(dirname(dbPath), { recursive: true });

const app = createApp({
  db: openDb(dbPath),
  signupKey: process.env.NEWSLETTER_SIGNUP_KEY?.trim(),
});
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Newsletter app listening on :${port}`));
