import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { sendEmail } from "./sender.js";

export { openDb } from "./db.js";

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
      if (data.length > 500_000) {
        reject(new Error("too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export function createApp({ db, adminKey, getRecipients, mailer }) {
  if (!adminKey) throw new Error("ADMIN_KEY is required");

  return http.createServer(async (req, res) => {
    const path = (req.url ?? "").split("?")[0];
    if (req.method === "GET" && path === "/health") return send(res, 200, { ok: true });
    if (!keyMatches(req.headers["x-admin-key"], adminKey)) return send(res, 401, { error: "Unauthorized" });

    try {
      const m = path.match(/^\/emails(?:\/(\d+))?(?:\/(schedule|send|log))?$/);
      if (!m) return send(res, 404, { error: "Not found" });
      const [, id, action] = m;

      if (!id) {
        if (req.method === "GET") return send(res, 200, db.prepare("SELECT * FROM emails ORDER BY id DESC").all());
        if (req.method === "POST") {
          const { subject, bodyHtml } = await readJson(req);
          if (!subject?.trim() || !bodyHtml?.trim()) return send(res, 400, { error: "subject and bodyHtml are required" });
          const r = db.prepare("INSERT INTO emails (subject, body_html) VALUES (?, ?)").run(subject.trim(), bodyHtml);
          return send(res, 201, { id: Number(r.lastInsertRowid) });
        }
        return send(res, 405, { error: "Method not allowed" });
      }

      const email = db.prepare("SELECT * FROM emails WHERE id=?").get(id);
      if (!email) return send(res, 404, { error: "Not found" });

      if (!action && req.method === "GET") return send(res, 200, email);
      if (!action && req.method === "PUT") {
        if (email.status !== "draft" && email.status !== "scheduled") return send(res, 409, { error: "Email already sent" });
        const { subject, bodyHtml } = await readJson(req);
        db.prepare("UPDATE emails SET subject=?, body_html=? WHERE id=?").run(
          subject?.trim() || email.subject,
          bodyHtml || email.body_html,
          id
        );
        return send(res, 200, { ok: true });
      }
      if (action === "log" && req.method === "GET") {
        return send(res, 200, db.prepare("SELECT recipient, ok, error, created_at FROM send_log WHERE email_id=?").all(id));
      }
      if (action === "schedule" && req.method === "POST") {
        const { scheduledAt } = await readJson(req);
        const t = new Date(scheduledAt);
        if (Number.isNaN(t.getTime()) || t <= new Date()) return send(res, 400, { error: "scheduledAt must be a future date" });
        const r = db
          .prepare("UPDATE emails SET status='scheduled', scheduled_at=? WHERE id=? AND status IN ('draft','scheduled')")
          .run(t.toISOString(), id);
        return r.changes ? send(res, 200, { ok: true }) : send(res, 409, { error: "Email already sent" });
      }
      if (action === "send" && req.method === "POST") {
        const result = await sendEmail({ db, id: Number(id), getRecipients, mailer });
        return result.skipped ? send(res, 409, { error: "Email already sent" }) : send(res, 200, result);
      }
      return send(res, 405, { error: "Method not allowed" });
    } catch (e) {
      return send(res, e instanceof SyntaxError ? 400 : 500, { error: e instanceof SyntaxError ? "Invalid JSON" : "Server error" });
    }
  });
}
