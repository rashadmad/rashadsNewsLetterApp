import { test } from "node:test";
import assert from "node:assert/strict";
import { handle } from "../src/core.js";
import { createMemoryStore } from "../src/store/memory.js";
import { runDue, sendEmail } from "../src/sender.js";
import { createMailer } from "../src/mailer.js";
import { makeToken, verifyToken } from "../src/unsubscribe.js";
import type { Deps, Message } from "../src/types.js";
import { medusaRecipients } from "../src/recipients.js";

const unsubscribe = { baseUrl: "https://store.test/unsubscribe", secret: "s3cret", postalAddress: "1 Art St" };
const getRecipients = async () => ["a@x.com", "bad@x.com"];

function setup() {
  const store = createMemoryStore();
  const sent: Message[] = [];
  const mailer = async (m: Message) => {
    if (m.to === "bad@x.com") throw new Error("boom");
    sent.push(m);
  };
  const deps: Deps = { store, adminKey: "k", getRecipients, mailer, unsubscribe };
  const call = async (path: string, method = "GET", body?: unknown, key: string | null = "k") => {
    const res = await handle(
      { method, path, headers: key ? { "x-admin-key": key } : {}, bodyText: body ? JSON.stringify(body) : undefined },
      deps
    );
    return { status: res.status, body: res.body as any };
  };
  return { store, sent, deps, call };
}

test("API requires admin key and validates input", async () => {
  const { call } = setup();
  assert.equal((await call("/emails", "GET", null, null)).status, 401);
  assert.equal((await call("/emails", "POST", { subject: "" })).status, 400);
  assert.equal((await call("/health", "GET", null, null)).status, 200);
});

test("create, schedule validation, send queues and scheduler sends once with unsubscribe link", async () => {
  const { call, deps, sent } = setup();
  const { id } = (await call("/emails", "POST", { subject: "Hi", bodyHtml: "<p>x</p>" })).body;
  assert.equal((await call(`/emails/${id}/schedule`, "POST", { scheduledAt: "2000-01-01" })).status, 400);
  assert.equal((await call(`/emails/${id}/schedule`, "POST", { scheduledAt: "2999-01-01" })).status, 200);
  assert.deepEqual(await runDue(deps), []); // not due yet

  assert.equal((await call(`/emails/${id}/send`, "POST")).status, 202);
  const [r] = (await runDue(deps)) as { sent: number; failed: number }[];
  assert.ok(r);
  assert.equal(r.sent, 1);
  assert.equal(r.failed, 1);

  const m = sent[0];
  assert.ok(m?.headers && m.html);
  assert.match(m.html, /Unsubscribe/);
  const url = new URL(m.headers["List-Unsubscribe"]!.slice(1, -1));
  assert.equal(verifyToken(unsubscribe.secret, url.searchParams.get("token")), "a@x.com");
  assert.equal(m.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");

  assert.equal((await call(`/emails/${id}/send`, "POST")).status, 409);
  assert.deepEqual(await runDue(deps), []);
  assert.equal((await call(`/emails/${id}/log`)).body.filter((l: { ok: boolean }) => !l.ok).length, 1);
});

test("refuses to send without unsubscribe config", async () => {
  const { store, deps } = setup();
  const e = await store.createEmail({ subject: "s", bodyHtml: "b" });
  await assert.rejects(sendEmail({ ...deps, id: e.id, unsubscribe: {} }));
});

test("unsubscribe tokens reject tampering", () => {
  const t = makeToken("s", "A@x.com");
  assert.equal(verifyToken("s", t), "a@x.com");
  assert.equal(verifyToken("other", t), null);
  assert.equal(verifyToken("s", "garbage"), null);
});

test("SES mailer sends headers; dry-run without MAIL_FROM", async () => {
  const calls: any[] = [];
  const mailer = createMailer({ from: "n@x.com", client: { send: (async (c: { input: unknown }) => calls.push(c.input)) as any } });
  await mailer({ to: "a@x.com", subject: "S", html: "<p>h</p>", headers: { "List-Unsubscribe": "<u>" } });
  assert.equal(calls[0].Content.Simple.Headers[0].Name, "List-Unsubscribe");
  await createMailer()({ to: "a@x.com", subject: "S" });
});

test("medusa recipients: only opted-in, deduped", async () => {
  const fetchImpl = (async () => ({
    ok: true,
    json: async () => ({
      count: 3,
      customers: [
        { email: "A@x.com", metadata: { newsletter: true } },
        { email: "a@x.com", metadata: { newsletter: true } },
        { email: "no@x.com", metadata: {} },
      ],
    }),
  })) as unknown as typeof fetch;
  assert.deepEqual(await medusaRecipients({ baseUrl: "http://m", apiKey: "k", fetchImpl })(), ["a@x.com"]);
});
