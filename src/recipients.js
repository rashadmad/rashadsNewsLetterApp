// Read-only: the newsletter list lives in Medusa; we never store subscribers here.
export function medusaRecipients({ baseUrl, apiKey, fetchImpl = fetch }) {
  return async function getRecipients() {
    const out = [];
    for (let offset = 0; ; offset += 100) {
      const res = await fetchImpl(
        `${baseUrl}/admin/customers?limit=100&offset=${offset}&fields=email,metadata`,
        { headers: { Authorization: `Basic ${apiKey}` } }
      );
      if (!res.ok) throw new Error(`Medusa responded ${res.status}`);
      const { customers = [], count = 0 } = await res.json();
      // Assumption: customers who opted in carry metadata.newsletter === true. Adjust once the store defines this.
      for (const c of customers) if (c.email && c.metadata?.newsletter === true) out.push(c.email);
      if (offset + 100 >= count) return [...new Set(out.map((e) => e.toLowerCase()))];
    }
  };
}
