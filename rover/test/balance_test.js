// Balance check: how often does each strategy survive across 40 random seeds?
const fs = require("fs"), path = require("path");
// data/terrain_data.js is "window.TERRAIN_DATA = {...};" so strip the wrapper and parse the JSON inside it
globalThis.TERRAIN_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/terrain_data.js"), "utf8")
  .replace(/^window\.TERRAIN_DATA = /, "").replace(/;\s*$/, ""));
for (const f of ["config", "rng", "terrain", "rover", "rules", "missions", "sim", "tune"]) require(`../src/${f}.js`);
MR.loadTerrain();
const d = MR.defaultDesign();
const strategies = {
  "no rules": [],
  "smart (generic)": [
    { sensor: "temp", op: "<", value: -45, action: "heat" },
    { sensor: "battery", op: "<", value: 25, action: "charge" },
    { sensor: "slope_ahead", op: ">", value: 17, action: "reroute" },
    { sensor: "storage", op: ">", value: 60, action: "send_data" },
  ],
};
const N = 40;
for (const m of MR.MISSION_LIST) {
  console.log("\n==", m.title);
  for (const [name, rules] of Object.entries(strategies)) {
    const r = MR.meanScore(d, rules, m, N);
    console.log(name.padEnd(18), "mean score", r.score.toFixed(1), "survival", (r.survive * 100).toFixed(0) + "%");
  }
  const t0 = Date.now();
  const tuned = MR.autoTune(d, strategies["smart (generic)"], m, { iterations: 100, seeds: 8 });
  const chk = MR.meanScore(d, tuned.rules, m, N);
  console.log("auto-tuned".padEnd(18), "mean score", chk.score.toFixed(1), "survival", (chk.survive * 100).toFixed(0) + "%", `(${Date.now() - t0} ms)`);
  console.log("  thresholds:", tuned.rules.map((r) => `${r.sensor}${r.op}${r.value}->${r.action}`).join("; "));
}
