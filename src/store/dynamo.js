import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Single table: pk=EMAIL#<id>; sk=META for the email, sk=LOG#... for send results.
// Sparse index gsi1 (gsi1pk=SCHEDULED, gsi1sk=scheduledAt) finds due emails without scanning.
const key = (id, sk = "META") => ({ pk: `EMAIL#${id}`, sk });
const toEmail = (i) => i && { id: i.id, subject: i.subject, bodyHtml: i.bodyHtml, status: i.status, scheduledAt: i.scheduledAt ?? null, sentAt: i.sentAt ?? null, createdAt: i.createdAt };

export function createDynamoStore({ tableName, client = DynamoDBDocumentClient.from(new DynamoDBClient({})) }) {
  const T = tableName;
  return {
    async createEmail({ subject, bodyHtml }) {
      const id = randomUUID();
      const item = { ...key(id), id, subject, bodyHtml, status: "draft", scheduledAt: null, sentAt: null, createdAt: new Date().toISOString() };
      await client.send(new PutCommand({ TableName: T, Item: item }));
      return toEmail(item);
    },
    async getEmail(id) {
      const r = await client.send(new GetCommand({ TableName: T, Key: key(id) }));
      return toEmail(r.Item);
    },
    async listEmails() {
      const r = await client.send(new ScanCommand({ TableName: T, FilterExpression: "sk = :m", ExpressionAttributeValues: { ":m": "META" } }));
      return r.Items.map(toEmail).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async updateEmail(id, patch, { onlyIfStatus } = {}) {
      const names = {};
      const values = {};
      const sets = [];
      const removes = [];
      for (const [k, v] of Object.entries(patch)) {
        names[`#${k}`] = k;
        values[`:${k}`] = v;
        sets.push(`#${k} = :${k}`);
      }
      if (patch.status === "scheduled") {
        sets.push("gsi1pk = :scheduledPk", "gsi1sk = :scheduledAt");
        values[":scheduledPk"] = "SCHEDULED";
        values[":scheduledAt"] = patch.scheduledAt;
      } else if (patch.status) {
        removes.push("gsi1pk", "gsi1sk");
      }
      let condition = "attribute_exists(pk)";
      if (onlyIfStatus) {
        names["#status"] = "status";
        onlyIfStatus.forEach((s, i) => (values[`:s${i}`] = s));
        condition += ` AND #status IN (${onlyIfStatus.map((_, i) => `:s${i}`).join(", ")})`;
      }
      try {
        await client.send(
          new UpdateCommand({
            TableName: T,
            Key: key(id),
            UpdateExpression: `SET ${sets.join(", ")}${removes.length ? ` REMOVE ${removes.join(", ")}` : ""}`,
            ConditionExpression: condition,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
          })
        );
        return true;
      } catch (e) {
        if (e.name === "ConditionalCheckFailedException") return false;
        throw e;
      }
    },
    async listDue(nowIso) {
      const r = await client.send(
        new QueryCommand({
          TableName: T,
          IndexName: "gsi1",
          KeyConditionExpression: "gsi1pk = :p AND gsi1sk <= :now",
          ExpressionAttributeValues: { ":p": "SCHEDULED", ":now": nowIso },
        })
      );
      // The index only projects keys, so read ids from pk
      return r.Items.map((i) => i.pk.slice("EMAIL#".length));
    },
    async addLog(id, entry) {
      const createdAt = new Date().toISOString();
      await client.send(new PutCommand({ TableName: T, Item: { ...key(id, `LOG#${createdAt}#${entry.recipient}`), ...entry, createdAt } }));
    },
    async getLog(id) {
      const out = [];
      let startKey;
      do {
        const r = await client.send(
          new QueryCommand({
            TableName: T,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :l)",
            ExpressionAttributeValues: { ":pk": `EMAIL#${id}`, ":l": "LOG#" },
            ExclusiveStartKey: startKey,
          })
        );
        out.push(...r.Items.map(({ recipient, ok, error, createdAt }) => ({ recipient, ok, error, createdAt })));
        startKey = r.LastEvaluatedKey;
      } while (startKey);
      return out;
    },
  };
}
