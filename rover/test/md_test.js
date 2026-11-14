// Run: node test/md_test.js   (no graphics, no dependencies)
globalThis.window = globalThis;
require("../src/rng.js"); require("../src/md_model.js");
const MD = MR.MD, assert = require("assert");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const D = (sc, o) => Object.assign(MD.defaultDesign(sc), o);

// 0. every scenario starts valid
for (const sc of Object.keys(MD.SCENARIOS)) { const st = MD.analyse(MD.defaultDesign(sc)); ok(st.valid, sc + " default design is valid: " + st.problems.join(";")); }
// 1. incompatible launcher/orbit is rejected with a reason
let A = MD.analyse(D("coast", { launcher: "rideshare", orbit: "polar" }));
ok(!A.valid && A.problems.some((p) => /cannot reach/.test(p)), "rideshare cannot reach polar");
// 2. over-mass is rejected
A = MD.analyse(D("coast", { launcher: "rideshare", orbit: "sso", bus: "u12", payloads: ["multi", "camera", "multi"] }));
ok(!A.valid, "heavy design on rideshare is invalid");
// 3. over-budget
A = MD.analyse(D("aurora", { launcher: "medium", orbit: "polar" }));
ok(!A.valid && A.problems.some((p) => /Budget/.test(p)), "medium rocket busts the aurora budget");
// 4. the Moon needs delta-v and the medium rocket
A = MD.analyse(D("moon", { launcher: "medium", orbit: "lunar", bus: "u6", payloads: ["spectro"], prop: "none" }));
ok(!A.valid && A.problems.some((p) => /delta-v/.test(p)), "moon needs delta-v");
// 5. determinism
const d = D("coast", { launcher: "small", orbit: "sso", bus: "u6", payloads: ["camera", "multi"], comms: "xband" });
const a = MD.simulate(d, 3), b = MD.simulate(d, 3);
ok(JSON.stringify(a) === JSON.stringify(b), "same seed, same result");
// 6. a rejected design gets zero performance
ok(MD.simulate(D("coast", { orbit: "polar" }), 1).score.parts.performance === 0, "rejected scores 0 performance");
// 7. score is bounded
for (const sc of Object.keys(MD.SCENARIOS)) for (let s = 1; s <= 20; s++) { const r = MD.simulate(D(sc, {}), s); ok(r.score.total >= 0 && r.score.total <= 100, "score range " + r.score.total); }

// 8. at least two valid, different designs per scenario that can succeed, with different scores
const SOL = {
  coast: [D("coast", { launcher: "small", orbit: "sso", bus: "u6", solar: "wings", battery: "m", comms: "sband", payloads: ["camera", "multi"], ground: "single" }),
          D("coast", { launcher: "rideshare", orbit: "sso", bus: "u6", solar: "wings", battery: "m", comms: "xband", payloads: ["multi", "camera"], ground: "network" })],
  aurora: [D("aurora", { launcher: "small", orbit: "polar", bus: "u6", solar: "wings", battery: "m", comms: "uhf", payloads: ["mag", "plasma"], ground: "single" }),
           D("aurora", { launcher: "small", orbit: "polar", bus: "u3", solar: "wings", battery: "s", comms: "sband", payloads: ["plasma"], ground: "single" })],
  moon: [D("moon", { launcher: "medium", orbit: "lunar", bus: "u6", solar: "wings", battery: "m", comms: "sband", payloads: ["spectro", "lcam"], prop: "electric", ground: "network" }),
         D("moon", { launcher: "medium", orbit: "lunar", bus: "u6", solar: "body", battery: "s", comms: "sband", payloads: ["spectro", "lcam"], prop: "electric", ground: "single" })],
};
const report = [];
for (const [sc, list] of Object.entries(SOL)) {
  const scores = [];
  for (const dd of list) {
    const an = MD.analyse(dd);
    report.push(`${sc}: valid=${an.valid} ${an.problems.join(" | ")} potential=${an.science.potential.toFixed(0)}/${an.science.target} cost=${an.budget.used.toFixed(1)}/${an.budget.cap.toFixed(1)} mass=${an.mass.used.toFixed(1)}/${an.mass.cap} weeks=${an.time.weeks}/${an.time.deadline.toFixed(0)} pow=${an.power.gen.toFixed(1)}/${an.power.load.toFixed(1)} link=${(an.comms.ratio * 100).toFixed(0)}%`);
    ok(an.valid, sc + " reference solution is valid: " + an.problems.join(";"));
    let w = 0, tot = 0; for (let s = 1; s <= 40; s++) { const r = MD.simulate(dd, s); tot += r.score.total; if (r.outcome === "success") w++; }
    scores.push([w / 40, tot / 40]);
  }
  report.push(`${sc}: success rates ${scores.map((x) => (x[0] * 100).toFixed(0) + "% (avg " + x[1].toFixed(0) + ")").join(" vs ")}`);
  ok(scores.every((x) => x[0] > 0), sc + ": both solutions can succeed");
  if (process.env.MD_VERBOSE) console.log(report.join("\n"));
  const [p, q] = list.map((x) => MD.analyse(x)); const rel = (u, v) => Math.abs(u - v) / Math.max(u, v);
  ok(rel(p.budget.used, q.budget.used) > 0.05 || rel(p.time.weeks, q.time.weeks) > 0.05 || rel(p.mass.used, q.mass.used) > 0.05, sc + ": the two solutions are really different designs");
}

// 9. share links round-trip and reject junk
for (const sc of Object.keys(SOL)) for (const dd of SOL[sc]) { const back = MD.decode(MD.encode(dd)); ok(back && MD.encode(back) === MD.encode(dd), "share link round-trip " + sc); }
ok(MD.decode("nonsense") === null && MD.decode("coast.normal.small.sso.u6.wings.m.sband.camera+hack.none.single") === null && MD.decode("__proto__.normal.small.sso.u6.wings.m.sband.camera.none.single") === null, "bad links rejected");
ok(MD.decode("coast.normal.small.sso.u6.wings.m.sband.camera+multi+mag+plasma.none.single") === null, "too many payloads rejected");
// 10. sandbox runs invalid designs; scored mode rejects them
const bad = D("coast", { launcher: "rideshare", orbit: "polar" });
ok(MD.simulate(bad, 1).outcome === "rejected" && MD.simulate(bad, 1, { sandbox: true }).outcome !== "rejected", "sandbox runs what a scored mission rejects");
ok(MD.simulate(bad, 1, { sandbox: true }).reasons[0].startsWith("Sandbox run"), "sandbox says it is unscored");
// 11. delta between runs
{ const a = SOL.coast[0], b2 = Object.assign({}, a, { comms: "xband" }); const ra = MD.simulate(a, 5), rb = MD.simulate(b2, 5);
  const dl = MD.delta({ design: a, score: ra.score, outcome: ra.outcome }, { design: b2, score: rb.score, outcome: rb.outcome });
  ok(dl.changes.length === 1 && dl.changes[0].key === "comms" && dl.total === rb.score.total - ra.score.total, "delta lists the one change and the score difference");
  ok(MD.delta({ design: a, score: ra.score, outcome: ra.outcome }, { design: a, score: ra.score, outcome: ra.outcome }).sameDesign, "same design is flagged"); }
// 12. ranking: higher score first, cheaper wins a tie
{ const r = MD.rank([{ n: "A", score: { total: 80 }, cost: 9 }, { n: "B", score: { total: 90 }, cost: 12 }, { n: "C", score: { total: 80 }, cost: 7 }]); ok(r.map((x) => x.n).join("") === "BCA", "ranking order"); }
// 14. stars, badges, go/no-go
ok(MD.stars("success", 95) === 3 && MD.stars("success", 80) === 2 && MD.stars("partial", 99) === 1 && MD.stars("lost", 10) === 0, "star thresholds");
{ const dd = D("coast", { launcher: "small", orbit: "sso", bus: "u6", solar: "wings", battery: "m", comms: "sband", payloads: ["multi", "camera"], ground: "single" }); const o = MD.simulate(dd, 8);
  const got = MD.badgesFor(dd, o); ok(got.includes("first") && got.includes("storm") && !got.includes("moon") && !got.includes("hardliner"), "badges for the demo run: " + got);
  ok(MD.badgesFor(dd, MD.simulate(D("coast", { launcher: "rideshare", orbit: "polar" }), 1)).length === 0, "no badges without a success");
  const gg = MD.goNoGo(MD.analyse(dd)); ok(Object.values(gg).every((v) => v === "GO"), "reference design is all GO: " + JSON.stringify(gg)); }
{ const gg = MD.goNoGo(MD.analyse(D("coast", { launcher: "rideshare", orbit: "polar" }))); ok(gg.mass === "NO-GO", "unreachable orbit is NO-GO on mass"); }
// 13. the demo mode seed (7, launch adds 1) shows events and a success on the real model
{ const dd = D("coast", { launcher: "small", orbit: "sso", bus: "u6", solar: "wings", battery: "m", comms: "sband", payloads: ["multi", "camera"], ground: "single" }); const o = MD.simulate(dd, 8); ok(o.outcome === "success" && o.events.length >= 2, "demo seed 8 gives a success with events: " + o.outcome + " " + o.events.length); }
console.log(report.join("\n"));
console.log(`md_test: ${n} checks passed`);
