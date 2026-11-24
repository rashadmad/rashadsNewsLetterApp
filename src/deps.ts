import { createMailer } from "./mailer.js";
import { medusaRecipients } from "./recipients.js";
import { createDynamoStore } from "./store/dynamo.js";
import { createMemoryStore } from "./store/memory.js";

import type { Deps } from "./types.js";

export function buildDeps(env: NodeJS.ProcessEnv = process.env): Deps {
  return {
    adminKey: env.ADMIN_KEY?.trim(),
    store: env.TABLE_NAME ? createDynamoStore({ tableName: env.TABLE_NAME }) : createMemoryStore(),
    getRecipients: medusaRecipients({ baseUrl: env.MEDUSA_URL, apiKey: env.MEDUSA_ADMIN_API_KEY }),
    mailer: createMailer({ from: env.MAIL_FROM, replyTo: env.MAIL_REPLY_TO }),
    unsubscribe: { baseUrl: env.UNSUBSCRIBE_BASE_URL, secret: env.UNSUBSCRIBE_SECRET, postalAddress: env.POSTAL_ADDRESS },
    delayMs: Number(env.SEND_DELAY_MS) || 100,
  };
}
