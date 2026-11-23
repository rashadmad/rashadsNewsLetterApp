import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp, openDb } from "../src/app.js";

let server, db, url;
const KEY = "test-key";
const post = (body, key = KEY) =>
  fetch(`${url}/newsletter-signups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key && { "x-newsletter-key": key }) },
    body: JSON.stringify(body),
  });
const valid = { email: "A@Example.com", firstName: "Ada", lastName: "L", source: "the-quintessential-storefront" };

before(async () => {
  db = openDb(":memory:");
  server = createApp({ db, signupKey: KEY }).listen(0);
  await new Promise((r) => server.once("listening", r));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test("rejects missing or wrong key", async () => {
  assert.equal((await post(valid, null)).status, 401);
  assert.equal((await post(valid, "nope")).status, 401);
});

test("stores signup and dedupes on lowercased email", async () => {
  assert.equal((await post(valid)).status, 200);
  assert.equal((await post({ ...valid, email: "a@example.com", firstName: "Ada2" })).status, 200);
  const rows = db.prepare("SELECT * FROM subscribers").all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, "a@example.com");
  assert.equal(rows[0].first_name, "Ada2");
});

test("validates input", async () => {
  assert.equal((await post({ ...valid, email: "bad" })).status, 400);
  assert.equal((await post({ ...valid, lastName: "" })).status, 400);
});
