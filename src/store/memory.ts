import { randomUUID } from "node:crypto";
import type { Email, LogEntry, Store } from "../types.js";

// In-memory store for local dev and tests. Same interface as dynamo.js.
export function createMemoryStore(): Store {
  const emails = new Map<string, Email>();
  const logs = new Map<string, LogEntry[]>();
  return {
    async createEmail({ subject, bodyHtml }) {
      const email: Email = { id: randomUUID(), subject, bodyHtml, status: "draft", scheduledAt: null, sentAt: null, createdAt: new Date().toISOString() };
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
    async updateEmail(id, patch, { onlyIfStatus } = {}) {
      const e = emails.get(id);
      if (!e || (onlyIfStatus && !onlyIfStatus.includes(e.status))) return false;
      Object.assign(e, patch);
      return true;
    },
    async listDue(nowIso) {
      return [...emails.values()].filter((e) => e.status === "scheduled" && e.scheduledAt !== null && e.scheduledAt <= nowIso).map((e) => e.id);
    },
    async addLog(id, entry) {
      logs.get(id)?.push({ ...entry, createdAt: new Date().toISOString() });
    },
    async getLog(id) {
      return [...(logs.get(id) ?? [])];
    },
  };
}
