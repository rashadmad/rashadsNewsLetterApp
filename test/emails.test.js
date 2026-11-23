import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp, openDb } from "../src/app.js";
import { sendEmail } from "../src/sender.js";
import { medusaRecipients } from "../src/recipients.js";

let server, db, url;
const sentTo = [];
const getRecipients = async () => ["a@x.com", "bad@x.com"];
const mailer = async ({ to }) => {
  if (to === "bad@x.com") throw new Error("boom");
  sentTo.push(to);
};
const call = (path, method = "GET", body, key = "k") =>
  fetch(url + path, {
    method,
    headers: { "Content-Type": "application/json", ...(key && { "x-admin-key": key }) },
    body: body && JSON.stringify(body),
  });

before(async () => {
  db = openDb(":memory:");
  server = createApp({ db, adminKey: "k", getRecipients, mailer }).listen(0);
  await new Promise((r) => server.once("listening", r));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test("requires admin key", async () => {
  assert.equal((await call("/emails", "GET", null, null)).status, 401);
});

test("create, schedule validation, send once, log failures", async () => {
  const { id } = await (await call("/emails", "POST", { subject: "Hi", bodyHtml: "<p>x</p>" })).json();
  assert.equal((await call("/emails", "POST", { subject: "" })).status, 400);
  assert.equal((await call(`/emails/${id}/schedule`, "POST", { scheduledAt: "2000-01-01" })).status, 400);
  assert.equal((await call(`/emails/${id}/schedule`, "POST", { scheduledAt: "2999-01-01" })).status, 200);

  const r = await (await call(`/emails/${id}/send`, "POST")).json();
  assert.deepEqual(r, { sent: 1, failed: 1 });
  assert.deepEqual(sentTo, ["a@x.com"]);
  assert.equal((await call(`/emails/${id}/send`, "POST")).status, 409);
  const log = await (await call(`/emails/${id}/log`)).json();
  assert.equal(log.filter((l) => !l.ok).length, 1);
});

test("already-sent emails are not re-sent", async () => {
  const r = db.prepare("INSERT INTO emails (subject, body_html, status) VALUES ('s','b','sent')").run();
  const out = await sendEmail({ db, id: Number(r.lastInsertRowid), getRecipients, mailer });
  assert.equal(out.skipped, true);
});

test("medusa recipients: only opted-in, deduped", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      count: 3,
      customers: [
        { email: "A@x.com", metadata: { newsletter: true } },
        { email: "a@x.com", metadata: { newsletter: true } },
        { email: "no@x.com", metadata: {} },
      ],
    }),
  });
  assert.deepEqual(await medusaRecipients({ baseUrl: "http://m", apiKey: "k", fetchImpl })(), ["a@x.com"]);
});
