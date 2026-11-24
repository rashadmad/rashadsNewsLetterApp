// Regenerates docs/images/*.png. Run with: npm run docs:images (needs Google Chrome installed).
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { unsubscribeUrl, withFooter } from "../src/unsubscribe.js";

const out = new URL("../docs/images/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const url = unsubscribeUrl({ baseUrl: "https://the-quintessential-shop.com/unsubscribe", secret: "example-secret" }, "customer@example.com");
const body = withFooter(
  `<h1 style="font-size:24px;margin:0 0 12px">New prints this week</h1>
   <p>Hello! Three new art-on-demand pieces just landed in the store.</p>
   <p><a href="#" style="background:#222;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px">Shop the new prints</a></p>`,
  url,
  "The Quintessential · 123 Example St · City, ST 00000"
);
const email = `<body style="margin:0;background:#eef0f3;font-family:Helvetica,Arial,sans-serif">
<div style="width:640px;margin:24px auto;background:#fff;border:1px solid #d8dbe0;border-radius:6px">
 <div style="padding:14px 20px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#555">
  <b>From:</b> The Quintessential &lt;newsletter@the-quintessential-shop.com&gt;<br>
  <b>To:</b> customer@example.com<br><b>Subject:</b> New prints this week</div>
 <div style="padding:24px 20px;color:#222;line-height:1.5">${body}</div></div></body>`;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 720, height: 520 }, deviceScaleFactor: 2 });
await page.setContent(email);
await page.screenshot({ path: `${out}sample-email.png`, fullPage: true });

const svg = readFileSync(`${out}architecture.svg`, "utf8");
const arch = await browser.newPage({ viewport: { width: 960, height: 420 }, deviceScaleFactor: 2 });
await arch.setContent(`<body style="margin:0">${svg}</body>`);
await arch.screenshot({ path: `${out}architecture.png` });
await browser.close();
console.log("Wrote sample-email.png and architecture.png");
