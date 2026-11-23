import { randomUUID } from "node:crypto";

// In-memory store for local dev and tests. Same interface as dynamo.js.
export function createMemoryStore() {
  const emails = new Map();
  const logs = new Map();
  return {
    async createEmail({ subject, bodyHtml }) {
      const email = { id: randomUUID(), subject, bodyHtml, status: "draft", scheduledAt: null, sentAt: null, createdAt: new Date().toISOString() };
      emails.set(email.id, email);
      logs.set(email.id, []);
      return { ...email };
    },
    async getEmail(id) {
      const e = emails.get(id);
      return e ? { ...e } : null;
    },
    async listEmails() {
      return [...emails.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((e) => ({ ...e }));
    },
    // Applies patch only if current status is in onlyIfStatus (when given). Returns true if applied.
    async updateEmail(id, patch, { onlyIfStatus } = {}) {
      const e = emails.get(id);
      if (!e || (onlyIfStatus && !onlyIfStatus.includes(e.status))) return false;
      Object.assign(e, patch);
      return true;
    },
    async listDue(nowIso) {
      return [...emails.values()].filter((e) => e.status === "scheduled" && e.scheduledAt <= nowIso).map((e) => e.id);
    },
    async addLog(id, entry) {
      logs.get(id)?.push({ ...entry, createdAt: new Date().toISOString() });
    },
    async getLog(id) {
      return [...(logs.get(id) ?? [])];
    },
  };
}
