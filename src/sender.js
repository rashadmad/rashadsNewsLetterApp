import { unsubscribeHeaders, unsubscribeUrl, withFooter } from "./unsubscribe.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// unsubscribe: { baseUrl, secret, postalAddress } – required; every email gets a per-recipient unsubscribe link.
export async function sendEmail({ store, id, getRecipients, mailer, unsubscribe, delayMs = 0 }) {
  if (!unsubscribe?.baseUrl || !unsubscribe?.secret) throw new Error("Unsubscribe configuration is required");
  const claimed = await store.updateEmail(id, { status: "sending" }, { onlyIfStatus: ["draft", "scheduled"] });
  if (!claimed) return { sent: 0, failed: 0, skipped: true };
  const email = await store.getEmail(id);
  let sent = 0;
  let failed = 0;
  try {
    for (const to of await getRecipients()) {
      const url = unsubscribeUrl(unsubscribe, to);
      try {
        await mailer({
          to,
          subject: email.subject,
          html: withFooter(email.bodyHtml, url, unsubscribe.postalAddress),
          headers: unsubscribeHeaders(url),
        });
        await store.addLog(id, { recipient: to, ok: true, error: null });
        sent++;
      } catch (e) {
        await store.addLog(id, { recipient: to, ok: false, error: String(e.message) });
        failed++;
      }
      if (delayMs) await sleep(delayMs);
    }
  } catch (e) {
    await store.updateEmail(id, { status: "failed" });
    throw e;
  }
  await store.updateEmail(id, { status: "sent", sentAt: new Date().toISOString() });
  return { sent, failed };
}

export async function runDue(deps) {
  const results = [];
  for (const id of await deps.store.listDue(new Date().toISOString())) {
    results.push({ id, ...(await sendEmail({ ...deps, id }).catch((e) => ({ error: e.message }))) });
  }
  return results;
}
