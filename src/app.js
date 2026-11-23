import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import Database from "better-sqlite3";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const clean = (v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");

export function openDb(path) {
  const db = new Database(path);
  db.exec(`CREATE TABLE IF NOT EXISTS subscribers (
    email TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'subscribed',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  return db;
}

function keyMatches(given, expected) {
  const a = Buffer.from(given ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 10_000) {
        reject(new Error("too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export function createApp({ db, signupKey }) {
  if (!signupKey) throw new Error("NEWSLETTER_SIGNUP_KEY is required");
  const upsert = db.prepare(`INSERT INTO subscribers (email, first_name, last_name, source)
    VALUES (@email, @firstName, @lastName, @source)
    ON CONFLICT(email) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name`);

  return http.createServer(async (req, res) => {
    const path = (req.url ?? "").split("?")[0];
    if (req.method === "GET" && path === "/health") return send(res, 200, { ok: true });
    if (req.method !== "POST" || path !== "/newsletter-signups") {
      return send(res, 404, { error: "Not found" });
    }
    if (!keyMatches(req.headers["x-newsletter-key"], signupKey)) {
      return send(res, 401, { error: "Unauthorized" });
    }
    let body;
    try {
      body = await readJson(req);
    } catch {
      return send(res, 400, { error: "Invalid JSON" });
    }
    const email = clean(body?.email).toLowerCase();
    const firstName = clean(body?.firstName);
    const lastName = clean(body?.lastName);
    if (!firstName || !lastName) return send(res, 400, { error: "First and last name are required." });
    if (!EMAIL_REGEX.test(email) || email.length > 254) return send(res, 400, { error: "A valid email is required." });
    if (firstName.length > 80 || lastName.length > 80) return send(res, 400, { error: "Name is too long." });

    upsert.run({ email, firstName, lastName, source: clean(body?.source).slice(0, 80) || null });
    return send(res, 200, { ok: true });
  });
}
