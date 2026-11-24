export type EmailStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";

export interface Email {
  id: string;
  subject: string;
  bodyHtml: string;
  status: EmailStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface LogEntry {
  recipient: string;
  ok: boolean;
  error: string | null;
  createdAt?: string;
}

export interface UpdateOptions {
  onlyIfStatus?: EmailStatus[];
}

export type EmailPatch = Partial<Omit<Email, "id" | "createdAt">>;

export interface Store {
  createEmail(input: { subject: string; bodyHtml: string }): Promise<Email>;
  getEmail(id: string): Promise<Email | null>;
  listEmails(): Promise<Email[]>;
  // Applies patch only if the current status is in onlyIfStatus (when given). Returns true if applied.
  updateEmail(id: string, patch: EmailPatch, opts?: UpdateOptions): Promise<boolean>;
  listDue(nowIso: string): Promise<string[]>;
  addLog(id: string, entry: LogEntry): Promise<void>;
  getLog(id: string): Promise<LogEntry[]>;
}

export interface Message {
  to: string;
  subject: string;
  html?: string;
  headers?: Record<string, string>;
}

// Swap providers by returning another function with this shape.
export type Mailer = (message: Message) => Promise<void>;

export type GetRecipients = () => Promise<string[]>;

export interface UnsubscribeConfig {
  baseUrl?: string;
  secret?: string;
  postalAddress?: string;
}

export interface Deps {
  adminKey?: string;
  store: Store;
  getRecipients: GetRecipients;
  mailer: Mailer;
  unsubscribe: UnsubscribeConfig;
  delayMs?: number;
}

export interface HttpRequest {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  bodyText?: string;
}

export interface HttpResponse {
  status: number;
  body: unknown;
}
