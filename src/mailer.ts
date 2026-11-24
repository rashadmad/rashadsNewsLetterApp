import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { Mailer } from "./types.js";

export function createMailer({
  from,
  replyTo,
  client,
}: {
  from?: string;
  replyTo?: string;
  client?: Pick<SESv2Client, "send">;
} = {}): Mailer {
  if (!from) {
    return async ({ to, subject }) => console.log(`[dry-run] to=${to} subject=${subject}`);
  }
  const ses = client ?? new SESv2Client({});
  return async ({ to, subject, html, headers = {} }) => {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        ReplyToAddresses: replyTo ? [replyTo] : undefined,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Html: { Data: html ?? "", Charset: "UTF-8" } },
            Headers: Object.entries(headers).map(([Name, Value]) => ({ Name, Value })),
          },
        },
      })
    );
  };
}
