// The sol simulation. Pure function: (design, rules, mission, options) -> trace + summary. No drawing in here.
(function () {
  const MR = (globalThis.MR = globalThis.MR || {});

  const EXPLAIN = {
    tipover:
      "The rover rolled over on a slope steeper than it could handle. Real rovers carry tilt limits, and mission planners route around steep ground. Fix: use a camera and a 'slope ahead' rule to reroute or slow down.",
    cold:
      "The electronics froze. Mars nights fall far below -70 °C, and real rovers keep their electronics warm with heaters and radioisotope heat. Fix: add a heater and a 'temperature' rule that starts it early.",
    power:
      "The battery ran flat. Dust and night remove solar power, and a rover with an empty battery cannot even run its heaters. Fix: charge earlier, drive less during the storm, or carry more battery.",
    stranded:
      "The wheels wore out. Rocks and steep ground wear wheels down; Curiosity's wheels were damaged by sharp rocks early in its mission. Fix: slow down on rough ground, or choose rugged wheels.",
    time: "The sol ended before the rover reached its goal. Sand and slow-downs cost time. Fix: spend fewer steps charging or recovering.",
    success: "Mission complete. The rover reached the goal and survived the sol.",
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function simulate(design, rules, mission, opts) {
    opts = opts || {};
    const C = MR.CONFIG;
    const T = MR.terrain || MR.loadTerrain();
    const rover = MR.buildRover(design);
    if (!rover.ok) return { error: rover.errors };

    const N = C.STEPS_PER_SOL;
    const stepH = C.SOL_HOURS / N;
    const rng = MR.rng((mission.seed + (opts.seed || 0)) >>> 0);

    // random events, fixed up front so a replay is identical
    const events = [];
    for (let i = 0; i < mission.eventCount; i++) {
      const type = mission.eventPool[Math.floor(rng() * mission.eventPool.length)];
      events.push({ type, step: 8 + Math.floor(rng() * 76), dur: type === "rock_strike" ? 1 : 6 + Math.floor(rng() * 6) });
    }
    const evAt = (t, type) => events.some((e) => e.type === type && t >= e.step && t < e.step + e.dur);

    const planCost = MR.makePlanCost(mission.planWeight);
    const plan = MR.astar(T, mission.start, mission.goal, planCost) || [];
    const S = {
      x: mission.start[0], y: mission.start[1], batt: rover.capWh * 0.8, temp: -25, wheel: 100, storage: 0,
      pending: 0, science: 0, photos: 0, drilled: false, dormant: false, stuck: 0, move: 0, coldSteps: 0,
      path: plan.slice(), pathKind: "plan", lastSafe: [mission.start[0], mission.start[1]],
      dead: false, cause: null, goalStep: null,
    };
    const goalReached = () => S.x === mission.goal[0] && S.y === mission.goal[1];
    const isSafe = (x, y) => T.slopeAt(x, y) < 12 && T.typeAt(x, y) !== MR.TYPE.SAND;
    const trace = [];
    const fires = {};

    for (let t = 0; t < N && !S.dead; t++) {
      const notes = [];
      const tod = ((mission.startTod != null ? mission.startTod : C.SOL_START_TOD) + t / N) % 1;
      const sun = tod >= 0.25 && tod <= 0.75 ? Math.sin((Math.PI * (tod - 0.25)) / 0.5) : 0;
      let amb = -40 + 33 * Math.sin(2 * Math.PI * (tod - 0.4));
      if (evAt(t, "cold_snap")) amb -= 12;
      const dust = clamp(mission.dust(t) + (evAt(t, "dust_gust") ? 0.35 : 0), 0, 1);
      for (const e of events) if (e.step === t) notes.push({ dust_gust: "A dust gust sweeps over the rover.", cold_snap: "A cold snap: the air drops sharply.", rock_strike: "A sharp rock strikes a wheel." }[e.type]);

      const next = S.path.length ? S.path[0] : [S.x, S.y];
      const readings = {
        battery: (S.batt / rover.capWh) * 100, temp: S.temp, storage: S.storage, time_of_day: tod * 24,
        slope_ahead: T.slopeAt(next[0], next[1]), terrain_ahead: T.typeAt(next[0], next[1]),
        wheel_health: S.wheel, sunlight: sun * 100, dust: dust * 100,
      };

      let ruleIdx = -1, action = "follow_plan", skipped = [];
      if (S.dormant) { action = "dormant"; }
      else if (S.stuck > 0) { action = "stuck"; S.stuck--; }
      else { const ev = MR.evaluateRules(rules, readings, rover, opts.elseAction); ruleIdx = ev.index; action = ev.action; skipped = ev.skipped; }
      if (ruleIdx >= 0) fires[ruleIdx] = (fires[ruleIdx] || 0) + 1;

      // --- execute the action -------------------------------------------------
      let extraW = 0, wantMove = 0, heating = false, bonusSolar = 1, idleFactor = 1;
      const immobile = S.wheel <= 0;
      switch (action) {
        case "dormant": case "stuck": case "stop": break;
        case "charge": bonusSolar = 1.1; idleFactor = 0.5; break;
        case "heat": heating = true; extraW = C.HEATER_POWER_W; break;
        case "take_photo":
          extraW = C.PHOTO_POWER_W;
          if (S.storage >= 100) notes.push("Storage full: photo lost.");
          else if (S.photos >= 12) notes.push("Enough photos of this place already.");
          else { S.storage = Math.min(100, S.storage + 8); S.photos++; S.pending += 1; notes.push("Photo taken."); }
          break;
        case "drill": {
          extraW = C.DRILL_POWER_W;
          const near = Math.hypot(S.x - mission.sample[0], S.y - mission.sample[1]) <= 1.5;
          if (!near) notes.push("Drilled bare ground: nothing of interest.");
          else if (S.drilled) notes.push("Sample site already drilled.");
          else if (S.storage > 80) notes.push("Not enough storage for the sample.");
          else { S.drilled = true; S.storage += 20; S.pending += 10; notes.push("Sample drilled."); }
          break;
        }
        case "send_data":
          extraW = C.SEND_POWER_W;
          if (S.storage <= 0) notes.push("Nothing to send.");
          else { S.science += S.pending; notes.push(`Data sent: +${S.pending} science.`); S.pending = 0; S.storage = 0; }
          break;
        case "slow_down": wantMove = 0.5; break;
        case "reroute":
          if (S.pathKind !== "safe") { S.path = MR.astar(T, [S.x, S.y], mission.goal, MR.safeCost) || []; S.pathKind = "safe"; notes.push("Rover re-planned a safer route."); }
          wantMove = 1; break;
        case "retreat":
          if (S.x !== S.lastSafe[0] || S.y !== S.lastSafe[1]) {
            if (S.pathKind !== "retreat") { S.path = MR.astar(T, [S.x, S.y], S.lastSafe, MR.safeCost) || []; S.pathKind = "retreat"; notes.push("Retreating to the last safe spot."); }
            wantMove = 1;
          }
          break;
        default: // follow_plan
          wantMove = 1;
      }
      if (action !== "retreat" && S.pathKind === "retreat") { S.path = []; S.pathKind = "plan"; }
      if (wantMove && !S.path.length && !goalReached()) {
        S.path = MR.astar(T, [S.x, S.y], mission.goal, planCost) || []; S.pathKind = "plan";
      }
      if (immobile && wantMove) { wantMove = 0; notes.push("Wheels worn out: cannot move."); }

      let moved = false;
      if (wantMove && S.path.length) {
        const fast = wantMove >= 1;
        const nx = S.path[0];
        const sl = T.slopeAt(nx[0], nx[1]);
        S.move += rover.speed * wantMove * clamp(1 - sl / 45, 0.35, 1);
        extraW += rover.drivePowerW * (fast ? 1 : 0.6);
        while (S.move >= 1 && S.path.length && !S.dead) {
          const c = S.path[0], s = T.slopeAt(c[0], c[1]), ty = T.typeAt(c[0], c[1]);
          if (s >= mission.tipSlope && rng() < (fast ? C.TIP_CHANCE_FAST : C.TIP_CHANCE_SLOW)) {
            S.dead = true; S.cause = "tipover"; notes.push(`Rolled over on a ${s.toFixed(0)}° slope!`); break;
          }
          if (ty === MR.TYPE.SAND && rng() < (fast ? C.SAND_STUCK_FAST : C.SAND_STUCK_SLOW) * rover.wheel.stuck) {
            S.stuck = C.STUCK_STEPS; S.move = 0; notes.push("Wheels dug into soft sand: stuck."); break;
          }
          S.wheel = Math.max(0, S.wheel - (0.15 + Math.max(0, s - 12) * 0.3 + (ty === MR.TYPE.ROCK ? 0.5 : 0)) * rover.wheel.wear * (fast ? 1 : 0.5));
          if (evAt(t, "rock_strike") && !S._struck) { S.wheel = Math.max(0, S.wheel - 6 * rover.wheel.wear); S._struck = true; }
          S.x = c[0]; S.y = c[1]; S.path.shift(); S.move -= 1; moved = true;
          if (isSafe(S.x, S.y)) S.lastSafe = [S.x, S.y];
          if (goalReached() && S.goalStep === null) { S.goalStep = t; notes.push("Goal reached!"); }
          if (S.wheel <= 0) { notes.push("Wheels worn out."); break; }
        }
        if (!S.path.length) S.move = 0;
      }
      S._struck = false;

      // --- power and temperature ---------------------------------------------
      const powerW = S.dormant ? 0 : rover.idlePowerW * idleFactor + extraW;
      const used = powerW * stepH;
      const gen = rover.solarW * sun * (1 - C.DUST_SOLAR_LOSS * dust) * stepH * bonusSolar;
      S.batt = S.batt - used + gen;
      if (S.batt <= 0) {
        S.batt = 0;
        if (!S.dormant) { S.dormant = true; notes.push("Battery empty: rover went dormant."); }
      } else if (S.batt > rover.capWh) S.batt = rover.capWh;
      if (S.dormant && S.batt >= rover.capWh * 0.1) { S.dormant = false; notes.push("Battery recovered: rover woke up."); }

      S.temp += C.THERMAL_K * (amb - S.temp) + (heating && !S.dormant ? C.HEATER_GAIN_C : 0) + 0.01 * powerW;
      if (S.temp <= C.TEMP_FAIL_C) S.coldSteps++; else S.coldSteps = Math.max(0, S.coldSteps - 1);
      if (S.coldSteps >= C.COLD_STEPS_TO_DIE) { S.dead = true; S.cause = "cold"; notes.push("Electronics froze."); }
      for (const sk of skipped) if (t === 0) notes.push("Rule " + (sk.index + 1) + " ignored: " + sk.reason);

      trace.push({
        t, hour: tod * 24, x: S.x, y: S.y, batt: S.batt, battPct: (S.batt / rover.capWh) * 100, temp: S.temp,
        wheel: S.wheel, storage: S.storage, sun, dust, amb, rule: ruleIdx, action, powerW, genW: gen / stepH, notes,
        dormant: S.dormant, stuck: S.stuck, dead: S.dead,
      });
    }

    const alive = !S.dead;
    const goal = S.goalStep !== null;
    let outcome = "success", cause = null;
    if (!alive) { outcome = "lost"; cause = S.cause; }
    else if (!goal) { outcome = "incomplete"; cause = S.dormant ? "power" : S.wheel <= 0 ? "stranded" : "time"; }
    const score = (alive ? 40 : 0) + (goal ? 30 : 0) + Math.round(30 * Math.min(1, S.science / 20));
    const d0 = Math.hypot(mission.start[0] - mission.goal[0], mission.start[1] - mission.goal[1]);
    const progress = goal ? 1 : clamp(1 - Math.hypot(S.x - mission.goal[0], S.y - mission.goal[1]) / d0, 0, 1);
    return {
      trace, plan, rover,
      summary: { outcome, cause, alive, goal, progress, goalStep: S.goalStep, science: S.science, score, ruleFires: fires,
        explanation: EXPLAIN[cause || "success"], events, finalWheel: S.wheel },
    };
  }

  MR.simulate = simulate; MR.EXPLAIN = EXPLAIN;
})();
