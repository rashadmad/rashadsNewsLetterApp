import { timingSafeEqual } from "node:crypto";
import type { Deps, EmailStatus, HttpRequest, HttpResponse } from "./types.js";

const keyMatches = (given: string | string[] | undefined, expected: string): boolean => {
  const a = Buffer.from(String(given ?? ""));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

const json = (status: number, body: unknown): HttpResponse => ({ status, body });

// Transport-independent request handler used by both the local server and AWS Lambda.
export async function handle(
  { method, path, headers, bodyText }: HttpRequest,
  { store, adminKey }: Pick<Deps, "store" | "adminKey">
): Promise<HttpResponse> {
  if (!adminKey) throw new Error("ADMIN_KEY is required");
  if (method === "GET" && path === "/health") return json(200, { ok: true });
  if (!keyMatches(headers["x-admin-key"], adminKey)) return json(401, { error: "Unauthorized" });

  const m = path.match(/^\/emails(?:\/([\w-]+))?(?:\/(schedule|send|log))?$/);
  if (!m) return json(404, { error: "Not found" });
  const [, id, action] = m;

  let body: { subject?: string; bodyHtml?: string; scheduledAt?: string } = {};
  if (bodyText) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      return json(400, { error: "Invalid JSON" });
    }
  }

  if (!id) {
    if (method === "GET") return json(200, await store.listEmails());
    if (method === "POST") {
      if (!body.subject?.trim() || !body.bodyHtml?.trim()) return json(400, { error: "subject and bodyHtml are required" });
      const email = await store.createEmail({ subject: body.subject.trim(), bodyHtml: body.bodyHtml });
      return json(201, { id: email.id });
    }
    return json(405, { error: "Method not allowed" });
  }

  const email = await store.getEmail(id);
  if (!email) return json(404, { error: "Not found" });
  const editable: EmailStatus[] = ["draft", "scheduled"];

  if (!action && method === "GET") return json(200, email);
  if (!action && method === "PUT") {
    const ok = await store.updateEmail(
      id,
      { subject: body.subject?.trim() || email.subject, bodyHtml: body.bodyHtml || email.bodyHtml },
      { onlyIfStatus: editable }
    );
    return ok ? json(200, { ok: true }) : json(409, { error: "Email already sent" });
  }
  if (action === "log" && method === "GET") return json(200, await store.getLog(id));
  if (action === "schedule" && method === "POST") {
    const t = new Date(body.scheduledAt ?? NaN);
    if (Number.isNaN(t.getTime()) || t <= new Date()) return json(400, { error: "scheduledAt must be a future date" });
    const ok = await store.updateEmail(id, { status: "scheduled", scheduledAt: t.toISOString() }, { onlyIfStatus: editable });
    return ok ? json(200, { ok: true }) : json(409, { error: "Email already sent" });
  }
  if (action === "send" && method === "POST") {
    // "Send now" = schedule for now; the scheduler picks it up on its next run (within a few minutes).
    const ok = await store.updateEmail(id, { status: "scheduled", scheduledAt: new Date().toISOString() }, { onlyIfStatus: editable });
    return ok ? json(202, { ok: true, note: "Queued; goes out on the next scheduler run" }) : json(409, { error: "Email already sent" });
  }
  return json(405, { error: "Method not allowed" });
}
