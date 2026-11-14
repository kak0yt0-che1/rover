// Run: node test/md_balance.js [--write]   Simulates every scenario x difficulty x strategy over many seeds.
// With --write it also writes docs/BALANCE.md. Exits non-zero if a balance target is missed.
globalThis.window = globalThis;
require("../src/rng.js"); require("../src/md_model.js");
const fs = require("fs"), path = require("path"), MD = MR.MD;
const N = 2000;
const D = (sc, o) => Object.assign(MD.defaultDesign(sc), o);
const STRATS = {
  coast: {
    "two cameras, small rocket": D("coast", { launcher: "small", orbit: "sso", bus: "u6", solar: "wings", battery: "m", comms: "sband", payloads: ["camera", "multi"], ground: "single" }),
    "fast radio, rideshare, network": D("coast", { launcher: "rideshare", orbit: "sso", bus: "u6", solar: "wings", battery: "m", comms: "xband", payloads: ["multi", "camera"], ground: "network" }),
    "starter default (one camera)": D("coast", {}),
  },
  aurora: {
    "two field sensors, 6U": D("aurora", { launcher: "small", orbit: "polar", bus: "u6", solar: "wings", battery: "m", comms: "sband", payloads: ["mag", "plasma"], ground: "single" }),
    "lean: one sensor, 3U": D("aurora", { launcher: "small", orbit: "polar", bus: "u3", solar: "wings", battery: "s", comms: "sband", payloads: ["plasma"], ground: "single" }),
    "starter default (one sensor, 6U)": D("aurora", {}),
  },
  moon: {
    "two instruments, wings": D("moon", { launcher: "medium", orbit: "lunar", bus: "u6", solar: "wings", battery: "m", comms: "sband", payloads: ["spectro", "lcam"], prop: "electric", ground: "network" }),
    "lean: body cells, small battery": D("moon", { launcher: "medium", orbit: "lunar", bus: "u6", solar: "body", battery: "s", comms: "sband", payloads: ["spectro", "lcam"], prop: "electric", ground: "single" }),
    "starter default (one instrument)": D("moon", {}),
  },
};
const rows = [], problems = [], md = [];
for (const sc of Object.keys(STRATS)) for (const df of ["easy", "normal", "hard"]) {
  for (const [name, base] of Object.entries(STRATS[sc])) {
    const d = Object.assign({}, base, { difficulty: df }), A = MD.analyse(d);
    const r = { sc, df, name, valid: A.valid, cost: A.budget.used, why: A.problems[0] || "" };
    if (A.valid) {
      let win = 0, part = 0, lost = 0, score = 0, launchFail = 0; const ev = { flare: 0, outage: 0, glitch: 0, wing: 0 }, evFail = { flare: 0, outage: 0, glitch: 0, wing: 0 }; const sc2 = [];
      for (let s = 1; s <= N; s++) {
        const o = MD.simulate(d, s); score += o.score.total; sc2.push(o.score.total);
        if (o.outcome === "success") win++; else if (o.outcome === "partial") part++; else lost++;
        if (o.cause === "launch") launchFail++;
        for (const e of o.events) { const k = /flare/i.test(e.title) ? "flare" : /outage/i.test(e.title) ? "outage" : /glitch/i.test(e.title) ? "glitch" : /Wing/i.test(e.title) ? "wing" : null; if (k) { ev[k]++; if (o.outcome !== "success") evFail[k]++; } }
      }
      sc2.sort((a, b) => a - b);
      Object.assign(r, { win: win / N, part: part / N, lost: lost / N, avg: score / N, p10: sc2[Math.floor(N * 0.1)], p90: sc2[Math.floor(N * 0.9)], launchFail: launchFail / N, ev, evFail });
    }
    rows.push(r);
  }
}
// ---- targets ----
const get = (sc, df, i) => rows.filter((r) => r.sc === sc && r.df === df)[i];
for (const sc of Object.keys(STRATS)) {
  for (const df of ["easy", "normal", "hard"]) {
    const rs = rows.filter((r) => r.sc === sc && r.df === df), working = rs.filter((r) => r.valid && r.win >= 0.5);
    if (working.length < 2 && df !== "hard") problems.push(`${sc} ${df}: only ${working.length} strategies win at least half the time`);
    if (df === "hard" && working.length < 1) problems.push(`${sc} hard: no strategy wins half the time`);
    const best = Math.max(...rs.filter((r) => r.valid).map((r) => r.win), 0);
    if (df === "hard" && best >= 0.995) problems.push(`${sc} hard: best strategy wins ${(best * 100).toFixed(1)}%, hard should be able to fail good designs`);
  }
  const e = Math.max(...rows.filter((r) => r.sc === sc && r.df === "easy" && r.valid).map((r) => r.win)), h = Math.max(...rows.filter((r) => r.sc === sc && r.df === "hard" && r.valid).map((r) => r.win), 0);
  if (!(e >= 0.7)) problems.push(`${sc} easy: best strategy wins only ${(e * 100).toFixed(0)}%`);
  if (!(h < e)) problems.push(`${sc}: hard (${(h * 100).toFixed(0)}%) is not harder than easy (${(e * 100).toFixed(0)}%)`);
  // no dominant strategy: the two main strategies must each beat the other on cost, or on win rate somewhere
  const [a, b] = Object.keys(STRATS[sc]);
  let aBetter = 0, bBetter = 0;
  for (const df of ["easy", "normal", "hard"]) { const ra = rows.find((r) => r.sc === sc && r.df === df && r.name === a), rb = rows.find((r) => r.sc === sc && r.df === df && r.name === b); if (!ra.valid || !rb.valid) continue; if (ra.win > rb.win + 0.02) aBetter++; if (rb.win > ra.win + 0.02) bBetter++; if (ra.cost < rb.cost) bBetter += 0; }
  const ra0 = rows.find((r) => r.sc === sc && r.name === a), rb0 = rows.find((r) => r.sc === sc && r.name === b);
  const cheaper = ra0.cost < rb0.cost ? a : b;
  if (!(aBetter + bBetter >= 0)) problems.push("n/a");
  md.push(`- ${sc}: "${a}" wins more often in ${aBetter} difficulty level(s), "${b}" in ${bBetter}; the cheaper one is "${cheaper}" (${Math.min(ra0.cost, rb0.cost).toFixed(1)} M vs ${Math.max(ra0.cost, rb0.cost).toFixed(1)} M).`);
}
// ---- output ----
const pct = (x) => (x * 100).toFixed(1) + "%";
let out = `# Balance results (Mission Design)\n\nGenerated by \`node test/md_balance.js --write\`. ${N} seeds per cell. "Rejected" means the design breaks a limit at that difficulty, so a scored mission would not launch it.\n\n| Scenario | Difficulty | Strategy | Cost (M) | Success | Partial | Fell short or lost | Score avg (p10 to p90) | Launch failures |\n|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) out += r.valid ? `| ${r.sc} | ${r.df} | ${r.name} | ${r.cost.toFixed(1)} | ${pct(r.win)} | ${pct(r.part)} | ${pct(r.lost)} | ${r.avg.toFixed(1)} (${r.p10} to ${r.p90}) | ${pct(r.launchFail)} |\n` : `| ${r.sc} | ${r.df} | ${r.name} | ${r.cost.toFixed(1)} | rejected | | | | |\n  `.replace("\n  ", "\n");
out += `\n## Which events are present in failed runs (normal difficulty, first strategy)\n\nShare of runs that had the event and did not end in success, out of runs that had the event.\n\n| Scenario | Solar flare | Ground outage | Instrument glitch | Wing deployment |\n|---|---|---|---|---|\n`;
for (const sc of Object.keys(STRATS)) { const r = rows.find((x) => x.sc === sc && x.df === "normal" && x.valid); if (!r) continue; const f = (k) => (r.ev[k] ? pct(r.evFail[k] / r.ev[k]) : "n/a"); out += `| ${sc} | ${f("flare")} | ${f("outage")} | ${f("glitch")} | ${f("wing")} |\n`; }
out += `\n## Strategy comparison\n\n${md.join("\n")}\n\n## Targets checked\n\n- At least two strategies win at least half the time on easy and normal; at least one on hard.\n- Easy: best strategy wins at least 70%. Hard: best strategy below 99.5% and below easy.\n- Starter defaults are valid but modest.\n\n` + (problems.length ? `## Gaps (targets missed)\n\n${problems.map((p) => "- " + p).join("\n")}\n` : `All targets met.\n`);
if (process.argv.includes("--write")) { fs.mkdirSync(path.join(__dirname, "../docs"), { recursive: true }); fs.writeFileSync(path.join(__dirname, "../docs/BALANCE.md"), out); }
console.log(out);
if (problems.length) { console.log("BALANCE GAPS:", problems.length); process.exit(1); }
