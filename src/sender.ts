import type { Deps } from "./types.js";
import { unsubscribeHeaders, unsubscribeUrl, withFooter } from "./unsubscribe.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// unsubscribe: { baseUrl, secret, postalAddress } – required; every email gets a per-recipient unsubscribe link.
export interface SendResult {
  sent: number;
  failed: number;
  skipped?: boolean;
}

export async function sendEmail({
  store,
  id,
  getRecipients,
  mailer,
  unsubscribe,
  delayMs = 0,
}: Deps & { id: string }): Promise<SendResult> {
  const { baseUrl, secret, postalAddress } = unsubscribe ?? {};
  if (!baseUrl || !secret) throw new Error("Unsubscribe configuration is required");
  const claimed = await store.updateEmail(id, { status: "sending" }, { onlyIfStatus: ["draft", "scheduled"] });
  if (!claimed) return { sent: 0, failed: 0, skipped: true };
  const email = await store.getEmail(id);
  if (!email) throw new Error("Email not found");
  let sent = 0;
  let failed = 0;
  try {
    for (const to of await getRecipients()) {
      const url = unsubscribeUrl({ baseUrl, secret }, to);
      try {
        await mailer({
          to,
          subject: email.subject,
          html: withFooter(email.bodyHtml, url, postalAddress),
          headers: unsubscribeHeaders(url),
        });
        await store.addLog(id, { recipient: to, ok: true, error: null });
        sent++;
      } catch (e) {
        await store.addLog(id, { recipient: to, ok: false, error: e instanceof Error ? e.message : String(e) });
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

export async function runDue(deps: Deps): Promise<unknown[]> {
  const results: unknown[] = [];
  for (const id of await deps.store.listDue(new Date().toISOString())) {
    results.push({ id, ...(await sendEmail({ ...deps, id }).catch((e: Error) => ({ error: e.message }))) });
  }
  return results;
}
