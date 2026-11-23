import http from "node:http";
import { handle } from "./core.js";
import { buildDeps } from "./deps.js";
import { runDue } from "./sender.js";

// Local development server (in-memory storage unless TABLE_NAME is set).
const deps = buildDeps();
const port = Number(process.env.PORT) || 3000;

http
  .createServer(async (req, res) => {
    let bodyText = "";
    for await (const chunk of req) {
      bodyText += chunk;
      if (bodyText.length > 500_000) return res.writeHead(413).end();
    }
    const out = await handle(
      { method: req.method, path: (req.url ?? "").split("?")[0], headers: req.headers, bodyText },
      deps
    ).catch((e) => {
      console.error(e);
      return { status: 500, body: { error: "Server error" } };
    });
    res.writeHead(out.status, { "Content-Type": "application/json" }).end(JSON.stringify(out.body));
  })
  .listen(port, () => console.log(`Newsletter app (local) on :${port}`));

setInterval(() => runDue(deps).catch(console.error), 60_000).unref();
