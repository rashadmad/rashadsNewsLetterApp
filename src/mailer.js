// Resend is the recommended provider; without an API key we only log (dry run).
export function createMailer({ apiKey, from, fetchImpl = fetch }) {
  return async function send({ to, subject, html }) {
    if (!apiKey) {
      console.log(`[dry-run] to=${to} subject=${subject}`);
      return;
    }
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) throw new Error(`Provider responded ${res.status}`);
  };
}
