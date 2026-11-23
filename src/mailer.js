import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

// A mailer is `async ({ to, subject, html, headers }) => void`. Swap providers by returning another function.
export function createMailer({ from, replyTo, client } = {}) {
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
            Body: { Html: { Data: html, Charset: "UTF-8" } },
            Headers: Object.entries(headers).map(([Name, Value]) => ({ Name, Value })),
          },
        },
      })
    );
  };
}
