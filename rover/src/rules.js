// Rule engine: an ordered list of "IF sensor op value THEN action". The first true rule wins.
(function () {
  const MR = (globalThis.MR = globalThis.MR || {});

  const SENSORS = {
    battery:       { label: "Battery",        unit: "%",  min: 0,   max: 100, step: 5 },
    temp:          { label: "Temperature",    unit: "°C", min: -90, max: 20,  step: 5 },
    storage:       { label: "Data storage",   unit: "%",  min: 0,   max: 100, step: 5 },
    time_of_day:   { label: "Time of sol",    unit: "h",  min: 0,   max: 24,  step: 1 },
    slope_ahead:   { label: "Slope ahead",    unit: "°",  min: 0,   max: 40,  step: 1 },
    terrain_ahead: { label: "Terrain ahead",  unit: "",   min: 0,   max: 2,   step: 1, enum: ["regolith", "sand", "rock"] },
    wheel_health:  { label: "Wheel health",   unit: "%",  min: 0,   max: 100, step: 5 },
    sunlight:      { label: "Sunlight",       unit: "%",  min: 0,   max: 100, step: 5 },
    dust:          { label: "Dust level",     unit: "%",  min: 0,   max: 100, step: 5 },
  };
  const ACTIONS = {
    follow_plan: { label: "Follow the plan" },
    stop:        { label: "Stop" },
    charge:      { label: "Safe mode: stop and charge" },
    heat:        { label: "Heat the electronics" },
    reroute:     { label: "Reroute around hazards" },
    slow_down:   { label: "Slow down" },
    take_photo:  { label: "Take photo" },
    drill:       { label: "Drill a sample" },
    send_data:   { label: "Send data to Earth" },
    retreat:     { label: "Retreat to last safe spot" },
  };
  const OPS = ["<", "<=", ">", ">=", "=="];

  function compare(a, op, b) {
    switch (op) {
      case "<": return a < b; case "<=": return a <= b;
      case ">": return a > b; case ">=": return a >= b;
      case "==": return a === b; default: return false;
    }
  }

  // A rule is one branch of an if / else if / else chain. Its condition is the first term (r.sensor, r.op, r.value, r.not)
  // plus optional extra terms in r.more, all joined by r.join ("and" by default, or "or"). Any term may be negated with not.
  const termsOf = (r) => [r].concat(r.more || []);

  // Returns {index, action, skipped:[{index,reason}]}. index -1 means the final ELSE branch fired (elseAction, default: follow the plan).
  function evaluate(rules, readings, rover, elseAction) {
    const skipped = [];
    const n = Math.min(rules.length, rover.slots);
    for (let i = 0; i < n; i++) {
      const r = rules[i];
      if (!r || r.off) continue;
      const terms = termsOf(r);
      const missing = terms.find((t) => !rover.sensors.has(t.sensor));
      if (missing) { skipped.push({ index: i, reason: "sensor not installed: " + missing.sensor }); continue; }
      if (!rover.actions.has(r.action)) { skipped.push({ index: i, reason: "hardware missing for action: " + r.action }); continue; }
      if (terms.some((t) => readings[t.sensor] === undefined || readings[t.sensor] === null)) continue;
      const res = terms.map((t) => compare(readings[t.sensor], t.op, t.value) !== !!t.not);
      if (r.join === "or" ? res.some(Boolean) : res.every(Boolean)) return { index: i, action: r.action, skipped };
    }
    const ea = elseAction && rover.actions.has(elseAction) ? elseAction : "follow_plan";
    return { index: -1, action: ea, skipped };
  }

  MR.termsOf = termsOf;
  MR.SENSORS = SENSORS; MR.ACTIONS = ACTIONS; MR.OPS = OPS; MR.evaluateRules = evaluate;
  MR.describeTerm = function (t) {
    const s = SENSORS[t.sensor];
    const val = s && s.enum ? s.enum[t.value] : t.value + (s ? s.unit : "");
    return (t.not ? "not " : "") + `${s ? s.label.toLowerCase() : t.sensor} ${t.op} ${val}`;
  };
  MR.describeRule = function (r) {
    const cond = termsOf(r).map(MR.describeTerm).join(r.join === "or" ? " OR " : " AND ");
    return `IF ${cond} THEN ${ACTIONS[r.action] ? ACTIONS[r.action].label.toLowerCase() : r.action}`;
  };
})();
