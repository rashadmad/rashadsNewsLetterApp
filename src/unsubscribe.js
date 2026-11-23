import { createHmac, timingSafeEqual } from "node:crypto";

const b64 = (s) => Buffer.from(s).toString("base64url");
const sign = (secret, email) => createHmac("sha256", secret).update(email).digest("base64url");

// Token format shared with the store: base64url(email) + "." + base64url(HMAC-SHA256(secret, email)), email lowercased.
export function makeToken(secret, email) {
  const e = email.trim().toLowerCase();
  return `${b64(e)}.${sign(secret, e)}`;
}

export function verifyToken(secret, token) {
  const [encoded, mac] = String(token ?? "").split(".");
  if (!encoded || !mac) return null;
  const email = Buffer.from(encoded, "base64url").toString();
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(secret, email));
  return a.length === b.length && timingSafeEqual(a, b) ? email : null;
}

export function unsubscribeUrl({ baseUrl, secret }, email) {
  const url = new URL(baseUrl);
  url.searchParams.set("token", makeToken(secret, email));
  return url.toString();
}

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function withFooter(html, url, postalAddress) {
  const address = postalAddress ? `<br>${escape(postalAddress)}` : "";
  return `${html}
<hr><p style="font-size:12px;color:#666">You receive this because you signed up on our store.
<a href="${escape(url)}">Unsubscribe</a>${address}</p>`;
}

export function unsubscribeHeaders(url) {
  return { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}
