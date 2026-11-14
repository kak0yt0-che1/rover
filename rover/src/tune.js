// "AI co-pilot": a simple black-box optimiser (hill climbing) that tunes the player's rule THRESHOLDS
// by replaying the sol many times with different random seeds. It is search, not a trained model.
(function () {
  const MR = (globalThis.MR = globalThis.MR || {});

  function meanScore(design, rules, mission, seeds, elseAction) {
    let sum = 0, alive = 0;
    for (let s = 0; s < seeds; s++) {
      const r = MR.simulate(design, rules, mission, { seed: s, elseAction });
      if (r.error) return { score: -1, survive: 0 };
      sum += r.summary.score + 15 * r.summary.progress; alive += r.summary.alive ? 1 : 0;
    }
    return { score: sum / seeds, survive: alive / seeds };
  }

  MR.meanScore = meanScore;
  MR.autoTune = function (design, rules, mission, opts) {
    opts = opts || {};
    const iters = opts.iterations || 120, seeds = opts.seeds || 8;
    const rng = MR.rng(opts.seed || 7);
    const copy = (r) => ({ ...r, more: (r.more || []).map((x) => ({ ...x })) });
    let best = rules.map(copy);
    const before = meanScore(design, best, mission, seeds, opts.elseAction);
    let cur = before;
    if (!best.length) return { rules: best, before, after: before };
    for (let k = 0; k < iters; k++) {
      const cand = best.map(copy);
      const i = Math.floor(rng() * cand.length);
      const terms = MR.termsOf(cand[i]), term = terms[Math.floor(rng() * terms.length)];   // tune any term of the condition
      const sd = MR.SENSORS[term.sensor];
      if (!sd || sd.enum) continue;                       // categorical rules keep their value
      const range = sd.max - sd.min;
      let v = term.value + (rng() - 0.5) * range * 0.4;
      v = Math.round(v / sd.step) * sd.step;
      term.value = Math.min(sd.max, Math.max(sd.min, v));
      const sc = meanScore(design, cand, mission, seeds, opts.elseAction);
      if (sc.score > cur.score) { best = cand; cur = sc; }
    }
    return { rules: best, before, after: cur };
  };
})();
