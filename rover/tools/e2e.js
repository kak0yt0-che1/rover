// End-to-end tests that drive the real UI with clicks and keys. Needs Edge or Chrome installed.
// Usage: node tools/e2e.js [--prefix=/some/sub/path] [--only=name]
const path = require("path"), fs = require("fs");
const { chromium } = require("playwright-core");
const { start } = require("./serve.js");
const ROOT = path.resolve(__dirname, "..");
const arg = (k, d) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").split("=")[1] || d;
const PREFIX = arg("prefix", "") ? "/" + arg("prefix", "").replace(/^[/]+/, "") : "", ONLY = arg("only", "");
const EXE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find((p) => fs.existsSync(p));

const SOL = {
  coast: [{ rocket: "Dedicated small rocket", orbit: "Sun-synchronous orbit, 600 km", ground: "One ground station", bus: "6U bus", solar: "Deployable wings", battery: "Medium battery, 60 Wh", radio: "S-band radio", prop: "No propulsion", payloads: ["Optical camera", "Multispectral imager"] }],
  aurora: [{ rocket: "Dedicated small rocket", orbit: "Polar orbit, 550 km", ground: "One ground station", bus: "6U bus", solar: "Deployable wings", battery: "Medium battery, 60 Wh", radio: "S-band radio", prop: "No propulsion", payloads: ["Magnetometer + particle sensor", "Plasma wave receiver"] },
    { rocket: "Dedicated small rocket", orbit: "Polar orbit, 550 km", ground: "One ground station", bus: "3U bus", solar: "Deployable wings", battery: "Small battery, 20 Wh", radio: "S-band radio", prop: "No propulsion", payloads: ["Plasma wave receiver"] }],
  moon: [{ rocket: "Medium rocket", orbit: "Lunar orbit (trans-lunar injection)", ground: "One ground station", bus: "6U bus", solar: "Deployable wings", battery: "Medium battery, 60 Wh", radio: "S-band radio", prop: "Electric thruster", payloads: ["Neutron spectrometer", "Lunar surface camera"] },
    { rocket: "Medium rocket", orbit: "Lunar orbit (trans-lunar injection)", ground: "One ground station", bus: "6U bus", solar: "Body-mounted cells", battery: "Small battery, 20 Wh", radio: "S-band radio", prop: "Electric thruster", payloads: ["Neutron spectrometer", "Lunar surface camera"] }],
};
const TITLE = { coast: "Coastal Watch", aurora: "Aurora Watch", moon: "Moon Scout" };

const results = []; let browser, base;
async function newPage(viewport = { width: 1366, height: 768 }, problems) {
  const ctx = await browser.newContext({ viewport }); const page = await ctx.newPage();
  const errs = problems || [];
  page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  page.on("requestfailed", (r) => errs.push("requestfailed: " + r.url()));
  page.on("response", (r) => { if (r.status() >= 400) errs.push(`http ${r.status()}: ${r.url()}`); });
  page.setDefaultTimeout(5000); page.errs = errs; page.ctx = ctx; return page;
}
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const btn = (page, text, exact = true) => page.locator("button", { hasText: exact ? new RegExp("^\\s*" + esc(text) + "\\s*$") : text }).first();
const pick = (page, name) => page.locator("button.pick", { has: page.locator("b", { hasText: new RegExp("^" + esc(name) + "$") }) }).first();
async function setDesign(page, s) {
  for (const k of ["rocket", "orbit", "ground", "bus", "solar", "battery", "radio", "prop"]) { const p = pick(page, s[k]); if (await p.count()) await p.click(); }
  // payloads: make the pressed set equal to s.payloads (turn off first so the slot count is never exceeded)
  const all = ["Optical camera", "Multispectral imager", "Magnetometer + particle sensor", "Plasma wave receiver", "Neutron spectrometer", "Lunar surface camera"];
  for (const n of all) if (!s.payloads.includes(n)) { const p = pick(page, n); if (await p.count() && (await p.getAttribute("aria-pressed")) === "true") await p.click(); }
  for (const n of s.payloads) { const p = pick(page, n); if (await p.count() && (await p.getAttribute("aria-pressed")) !== "true") await p.click(); }
}
const launchEnabled = (page) => btn(page, "Launch mission").isEnabled();
async function startScenario(page, sc, diff, players = 1) {
  await page.goto(base + "mission.html"); await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} }); await page.reload();
  await btn(page, TITLE[sc], false).click();
  await pick(page, diff).click();
  if (players > 1) await btn(page, players + " players").click();
  await btn(page, "Start designing").click();
}

async function test(name, fn) {
  if (ONLY && !name.includes(ONLY)) return;
  const t0 = Date.now(), problems = [];
  try { await fn(problems); if (problems.length) throw new Error("page problems: " + [...new Set(problems)].slice(0, 5).join(" | ")); results.push([name, "ok", Date.now() - t0]); }
  catch (e) { results.push([name, "FAIL " + String(e.message).split("\n").slice(0, 6).join(" ").replace(/\s+/g, " ").slice(0, 600), Date.now() - t0]); }
  console.log(results[results.length - 1].join(" | "));
}
const expect = (c, m) => { if (!c) throw new Error(m); };

(async () => {
  if (!EXE) { console.log("No Edge or Chrome found"); process.exit(2); }
  const srv = await start(ROOT, PREFIX); base = srv.url;
  browser = await chromium.launch({ executablePath: EXE, headless: true });
  await require("./e2e_tests.js")({ test, newPage, btn, pick, setDesign, launchEnabled, startScenario, expect, SOL, TITLE, getBase: () => base, getBrowser: () => browser, ROOT });
  await browser.close(); srv.close();
  const bad = results.filter((r) => r[1] !== "ok");
  console.log(`\n${results.length - bad.length}/${results.length} e2e tests passed` + (PREFIX ? ` (under prefix ${PREFIX})` : ""));
  process.exit(bad.length ? 1 : 0);
})();
