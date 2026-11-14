// Takes 1920x1080 screenshots of the key screens into docs/shots/. Usage: node tools/shots.js
const path = require("path"), fs = require("fs");
const { chromium } = require("playwright-core");
const { start } = require("./serve.js");
const EXE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find((p) => fs.existsSync(p));
(async () => {
  const root = path.resolve(__dirname, ".."), out = path.join(root, "docs", "shots"); fs.mkdirSync(out, { recursive: true });
  const srv = await start(root), browser = await chromium.launch({ executablePath: EXE });
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); page.setDefaultTimeout(8000);
  const shot = async (name, full) => { await page.waitForTimeout(450); await page.screenshot({ path: path.join(out, name + ".png"), fullPage: !!full }); console.log("shot", name); };
  const b = (t) => page.locator("button", { hasText: t }).first();
  await page.goto(srv.url); await shot("01_landing");
  await page.goto(srv.url + "mission.html"); await page.evaluate(() => localStorage.clear()); await page.reload(); await shot("02_mission_setup", true);
  await b("Start designing").click(); await shot("03_build_with_tour");
  await page.locator("button", { hasText: "Skip the tour" }).click();
  await page.locator("button.pick", { hasText: "Polar orbit" }).click(); await shot("04_launch_blocked");
  await page.locator("button.pick", { hasText: "Sun-synchronous" }).click(); await page.locator("button.pick", { hasText: "Dedicated small rocket" }).click(); await page.locator("button.pick", { hasText: "Multispectral imager" }).click(); await shot("05_build_valid");
  await b("Launch mission").click(); await page.locator(".big-total").waitFor(); await shot("06_report", true);
  await b("Redesign").click(); await page.locator("button.pick", { hasText: "X-band radio" }).click(); await b("Launch mission").click(); await page.locator("h3", { hasText: "Compared with your last run" }).waitFor(); await shot("07_report_delta", true);
  await b("New mission").click(); await page.locator("button.pick", { hasText: "4 players" }).click(); await b("Start designing").click(); await shot("08_team_roles");
  await page.goto(srv.url + "mission.html"); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.locator("button.pick", { hasText: "Sandbox" }).click(); await b("Start designing").click(); await shot("09_sandbox");
  await page.goto(srv.url + "model.html"); await shot("10_model_notes", true);
  await page.goto(srv.url + "rover.html"); await page.evaluate(() => localStorage.clear()); await page.reload(); await shot("11_rover_mission");
  await b("Enter the assembly bay").click(); await shot("12_rover_assembly");
  await b("Program the rover").click(); await b("Load example").click(); await shot("13_rover_blocks");
  await b("Uplink and run the sol").click(); await b("Skip").click({ timeout: 8000 }).catch(() => {}); await page.locator("button", { hasText: "Fix my rules" }).waitFor({ timeout: 60000 }); await shot("14_rover_debrief", true);
  await browser.close(); srv.close();
})().catch((e) => { console.error(e.message.split("\n")[0]); process.exit(1); });
