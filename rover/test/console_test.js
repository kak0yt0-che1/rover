// Run: node test/console_test.js   (no graphics needed)
const fs = require("fs"), path = require("path");
globalThis.TERRAIN_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/terrain.json")));
for (const f of ["config", "rng", "terrain", "rover", "rules", "missions", "sim"]) require(`../src/${f}.js`);
MR.loadTerrain();

const design = MR.defaultDesign();
const bare = [];  // no rules: just follow the plan
const smart = [
  { sensor: "temp", op: "<", value: -45, action: "heat" },
  { sensor: "battery", op: "<", value: 25, action: "charge" },
  { sensor: "slope_ahead", op: ">", value: 17, action: "reroute" },
  { sensor: "storage", op: ">", value: 60, action: "send_data" },
  { sensor: "terrain_ahead", op: "==", value: 1, action: "slow_down" },
];
function show(label, d, rules, m) {
  const r = MR.simulate(d, rules, m);
  if (r.error) return console.log(label, "ERROR", r.error);
  const s = r.summary;
  console.log(label.padEnd(34), s.outcome.padEnd(10), String(s.cause).padEnd(9), "goalStep", s.goalStep, "science", s.science, "score", s.score,
    "| end batt%", r.trace[r.trace.length - 1].battPct.toFixed(0), "temp", r.trace[r.trace.length - 1].temp.toFixed(0), "wheel", s.finalWheel.toFixed(0));
}
for (const m of MR.MISSION_LIST) {
  console.log("\n==", m.title, "plan length", (MR.astar(MR.terrain, m.start, m.goal, MR.makePlanCost(m.planWeight)) || []).length);
  show("no rules", design, bare, m);
  show("smart rules", design, smart, m);
  const big = { ...design, battery: "L", options: ["navcam", "heater", "antenna"] };
  show("smart + battery L", big, smart, m);
  // determinism check
  const a = JSON.stringify(MR.simulate(design, smart, m).trace), b = JSON.stringify(MR.simulate(design, smart, m).trace);
  console.log("deterministic replay:", a === b);
}
// design validation
console.log("\nbudget check:", MR.buildRover({ battery: "L", solar: "L", wheels: "rugged", computer: "adv", options: Object.keys(MR.PARTS.options) }).errors);
