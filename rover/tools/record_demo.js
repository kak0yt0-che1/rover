// Records demo mode to demo/demo.webm using Playwright's built-in recorder. Usage: node tools/record_demo.js [--team=Name] [--url=PublicURL]
const path = require("path"), fs = require("fs");
const { chromium } = require("playwright-core");
const { start } = require("./serve.js");
const arg = (k, d) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").split("=").slice(1).join("=") || d;
const EXE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find((p) => fs.existsSync(p));
(async () => {
  const root = path.resolve(__dirname, ".."), out = path.join(root, "demo"); fs.mkdirSync(out, { recursive: true });
  const srv = await start(root);
  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: out, size: { width: 1920, height: 1080 } } });
  const page = await ctx.newPage(); const t0 = Date.now();
  await page.goto(srv.url + "mission.html?demo=1&team=" + encodeURIComponent(arg("team", "[TEAM NAME]")) + "&url=" + encodeURIComponent(arg("url", "[PUBLIC URL]")));
  await page.waitForSelector('body[data-demo="done"]', { timeout: 60000 });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  await page.waitForTimeout(300);
  const v = page.video(); await ctx.close(); const f = await v.path(); fs.renameSync(f, path.join(out, "demo.webm"));
  await browser.close(); srv.close(); console.log("recorded demo/demo.webm, about " + secs + " s of demo time");
})().catch((e) => { console.error(e.message.split("\n")[0]); process.exit(1); });
