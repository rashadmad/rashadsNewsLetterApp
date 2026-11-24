import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import type { Deps } from "./types.js";
import { handle } from "./core.js";
import { buildDeps } from "./deps.js";
import { runDue } from "./sender.js";

let deps: Deps | undefined;
const get = () => (deps ??= buildDeps());

// API Gateway HTTP API (payload v2)
export async function api(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const bodyText = event.isBase64Encoded ? Buffer.from(event.body ?? "", "base64").toString() : event.body;
  const { status, body } = await handle(
    { method: event.requestContext.http.method, path: event.rawPath, headers: event.headers ?? {}, bodyText },
    get()
  ).catch((e) => {
    console.error(e);
    return { status: 500, body: { error: "Server error" } };
  });
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

// EventBridge schedule: sends anything that is due
export async function scheduler() {
  const results = await runDue(get());
  console.log(JSON.stringify(results));
  return results;
}
