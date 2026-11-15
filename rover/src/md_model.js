// Mission Design model: a SIMPLIFIED CubeSat-class mission model. All numbers are game values chosen for
// teaching trade-offs; they are not data for any real spacecraft or launch vehicle (see REFERENCES.md).
// Pure functions only: no DOM. Same design + same seed always gives the same result.
(function () {
  const MR = (globalThis.MR = globalThis.MR || {});
  const MD = (MR.MD = {});

  // ---------- catalogues ----------
  MD.ORBITS = {
    leo: { name: "Low Earth orbit, 450 km", sun: 0.62, eclipseMin: 35, contactMin: 40, lunar: false, note: "Easy to reach, but short passes over a ground station and long eclipses." },
    sso: { name: "Sun-synchronous orbit, 600 km", sun: 0.75, eclipseMin: 24, contactMin: 50, lunar: false, note: "Keeps the sunlight angle on the ground steady, so pictures can be compared over time. Real example: NASA's Aqua flies one at about 705 km. Needs a bigger launcher." },
    polar: { name: "Polar orbit, 550 km", sun: 0.68, eclipseMin: 30, contactMin: 80, lunar: false, note: "Goes from pole to pole, so a polar ground station sees you many times a day." },
    lunar: { name: "Lunar orbit (trans-lunar injection)", sun: 0.95, eclipseMin: 5, contactMin: 70, lunar: true, note: "The Moon is about 384,000 km away: a long link and almost no eclipse. Needs delta-v to enter orbit around the Moon." },
  };

  // launchers are generic classes, not real vehicles. capacity = kg to that orbit (0 = cannot reach it)
  MD.LAUNCHERS = {
    rideshare: { name: "Rideshare slot", cap: { leo: 45, sso: 30, polar: 0, lunar: 0 }, cost: 0.8, reliability: 0.93, wait: 22, note: "Cheap, but you fly where the main customer flies." },
    small: { name: "Dedicated small rocket", cap: { leo: 150, sso: 110, polar: 90, lunar: 0 }, cost: 4.5, reliability: 0.95, wait: 14, note: "Your own orbit, a bit pricey." },
    medium: { name: "Medium rocket", cap: { leo: 600, sso: 450, polar: 380, lunar: 60 }, cost: 11, reliability: 0.97, wait: 20, note: "The only class here that can send a small probe to the Moon." },
  };

  MD.BUSES = {
    u3: { name: "3U bus", mass: 3, cost: 0.4, area: 0.06, slots: 1, storage: 8, weeks: 10, note: "Tiny. One payload." },
    u6: { name: "6U bus", mass: 8, cost: 0.9, area: 0.12, slots: 2, storage: 32, weeks: 14, note: "Room for two payloads." },
    u12: { name: "12U bus", mass: 16, cost: 1.8, area: 0.25, slots: 3, storage: 64, weeks: 20, note: "Room for three payloads, heavy." },
  };
  MD.SOLAR = {
    body: { name: "Body-mounted cells", mult: 1, mass: 0, cost: 0, weeks: 0, note: "Simple and light, little power." },
    wings: { name: "Deployable wings", mult: 2.4, mass: 1.2, cost: 0.3, weeks: 3, note: "More power; a deployment that can fail." },
  };
  MD.BATTERY = {
    s: { name: "Small battery, 20 Wh", wh: 20, mass: 0.4, cost: 0.1 },
    m: { name: "Medium battery, 60 Wh", wh: 60, mass: 1, cost: 0.25 },
    l: { name: "Large battery, 120 Wh", wh: 120, mass: 2, cost: 0.5 },
  };
  // rateMbps is the downlink rate; txW is radio power while talking to the ground
  MD.COMMS = {
    uhf: { name: "UHF radio", rateMbps: 0.5, txW: 5, mass: 0.2, cost: 0.1, note: "Slow but robust." },
    sband: { name: "S-band radio", rateMbps: 5, txW: 10, mass: 0.5, cost: 0.3, note: "A good middle path." },
    xband: { name: "X-band radio", rateMbps: 50, txW: 25, mass: 1, cost: 0.8, note: "Fast, hungry for power." },
  };
  // sci = science points per day while operating; data = GB/day; duty = fraction of the day it runs
  MD.PAYLOADS = {
    camera: { name: "Optical camera", tags: ["imaging"], mass: 1.2, powerW: 6, data: 1.0, sci: 3, duty: 0.5, cost: 0.6, weeks: 4 },
    multi: { name: "Multispectral imager", tags: ["imaging"], mass: 2.5, powerW: 12, data: 3.0, sci: 7, duty: 0.5, cost: 1.6, weeks: 8 },
    mag: { name: "Magnetometer + particle sensor", tags: ["field"], mass: 0.8, powerW: 3, data: 0.05, sci: 4, duty: 1, cost: 0.5, weeks: 5 },
    plasma: { name: "Plasma wave receiver", tags: ["field"], mass: 1.6, powerW: 5, data: 0.4, sci: 7, duty: 1, cost: 1.2, weeks: 7 },
    spectro: { name: "Neutron spectrometer", tags: ["lunar"], mass: 2.0, powerW: 8, data: 0.5, sci: 7, duty: 0.7, cost: 1.4, weeks: 8 },
    lcam: { name: "Lunar surface camera", tags: ["lunar", "imaging"], mass: 3.0, powerW: 10, data: 2.5, sci: 6, duty: 0.5, cost: 1.5, weeks: 8 },
  };
  MD.PROP = {
    none: { name: "No propulsion", dv: 0, mass: 0, powerW: 0, cost: 0, weeks: 0 },
    cold: { name: "Cold-gas thrusters", dv: 30, mass: 1.5, powerW: 4, cost: 0.3, weeks: 3 },
    electric: { name: "Electric thruster", dv: 160, mass: 3.2, powerW: 18, cost: 1.0, weeks: 6 },
  };

  MD.STORAGE_GB_NOTE = "Onboard storage depends on the bus. Data that does not fit is lost.";

  // difficulty scales budget, deadline and how often things go wrong
  MD.DIFFICULTY = {
    easy: { name: "Easy", budget: 1.25, weeks: 1.2, events: 0.5 },
    normal: { name: "Normal", budget: 1, weeks: 1, events: 1 },
    hard: { name: "Hard", budget: 0.87, weeks: 0.93, events: 1.6 },
  };

  // ---------- scenarios ----------
  // fit[orbit] = how useful that orbit is for this objective. tag = payload tag the science team wants.
  MD.SCENARIOS = {
    coast: {
      title: "Coastal Watch", blurb: "Photograph coastlines and river mouths to track erosion and flooding.",
      objective: "Return 110 science points of imagery in a 30-day mission.", tag: "imaging", target: 110, days: 30, budget: 12, weeks: 52,
      fit: { leo: 0.75, sso: 1, polar: 0.8, lunar: 0 }, critical: ["data", "comms"],
      hint: "Pictures are big. A fast radio and a long ground-station window matter more than a big battery.",
      real: "Earth-observing small satellites are used to track coasts, floods and land change. This scenario is a simplified teaching version, not a real mission.",
    },
    aurora: {
      title: "Aurora Watch", blurb: "Measure the magnetic field and charged particles that drive the aurora.",
      objective: "Return 180 science points of field measurements in a 30-day mission.", tag: "field", target: 180, days: 30, budget: 9, weeks: 40,
      fit: { leo: 0.55, sso: 0.6, polar: 1, lunar: 0 }, critical: ["power", "time"],
      hint: "The instruments run all the time and the deadline is tight, so keep the build simple and the power steady.",
      real: "Magnetic-field and particle sensors on small satellites help study space weather near Earth. This scenario is a simplified teaching version.",
    },
    moon: {
      title: "Moon Scout", blurb: "Send a small probe to map hydrogen near the lunar poles.",
      objective: "Return 200 science points from lunar orbit in a 30-day mission.", tag: "lunar", target: 200, days: 30, budget: 24, weeks: 60,
      fit: { leo: 0, sso: 0, polar: 0, lunar: 1 }, critical: ["mass", "budget"], needsDv: 120,
      hint: "Only one launcher can reach the Moon, and it has a tight mass limit. You also need delta-v to enter lunar orbit.",
      real: "Small lunar orbiters have flown spectrometers to search for water-related signals. This scenario is a simplified teaching version.",
    },
  };

  // ---------- default design ----------
  MD.defaultDesign = function (scenarioId) {
    const base = { scenario: scenarioId || "coast", difficulty: "normal", seed: 7, launcher: "rideshare", orbit: "sso", bus: "u6", solar: "wings", battery: "m", comms: "sband", payloads: ["camera"], prop: "none", ground: "single" };
    // every scenario starts from a valid but modest design, so a first launch always works and can be improved
    const START = { aurora: { launcher: "small", orbit: "polar", payloads: ["plasma"], comms: "sband" }, moon: { launcher: "medium", orbit: "lunar", payloads: ["spectro"], prop: "electric", comms: "sband" } };
    return Object.assign(base, START[base.scenario] || {});
  };
  // ground network: more stations = more contact time, more cost
  MD.GROUND = { single: { name: "One ground station", contact: 1, cost: 0.2 }, network: { name: "Station network", contact: 2.2, cost: 1.2 } };

  // ---------- budgets for the six resources ----------
  // Returns a full breakdown. Nothing here is random.
  MD.analyse = function (d) {
    const sc = MD.SCENARIOS[d.scenario], df = MD.DIFFICULTY[d.difficulty] || MD.DIFFICULTY.normal;
    const or = MD.ORBITS[d.orbit], la = MD.LAUNCHERS[d.launcher], bus = MD.BUSES[d.bus], sol = MD.SOLAR[d.solar];
    const bat = MD.BATTERY[d.battery], com = MD.COMMS[d.comms], pr = MD.PROP[d.prop], gr = MD.GROUND[d.ground];
    const pls = d.payloads.map((id) => MD.PAYLOADS[id]);
    const problems = [], warnings = [];

    // 1. mass
    const mass = bus.mass + sol.mass + bat.mass + com.mass + pr.mass + pls.reduce((s, p) => s + p.mass, 0);
    const cap = la.cap[d.orbit] || 0;
    const massMargin = cap > 0 ? (cap - mass) / cap : -1;
    if (cap === 0) problems.push(`${la.name} cannot reach ${or.name}.`);
    else if (mass > cap) problems.push(`Spacecraft is ${mass.toFixed(1)} kg but ${la.name} carries only ${cap} kg to this orbit.`);
    if (pls.length > bus.slots) problems.push(`${bus.name} has ${bus.slots} payload slot(s); you chose ${pls.length}.`);
    if (pls.length === 0) problems.push("Choose at least one payload: without one there is no science.");
    if (new Set(d.payloads).size !== d.payloads.length) problems.push("The same instrument is listed twice.");

    // delta-v for the Moon
    if (sc.needsDv && pr.dv < sc.needsDv) problems.push(`Entering lunar orbit needs about ${sc.needsDv} m/s of delta-v; ${pr.name} gives ${pr.dv}.`);
    if (or.lunar && !sc.needsDv) warnings.push("Lunar orbit is not needed for this objective.");

    // 2. power (orbit-average)
    const peakW = bus.area * sol.mult * 190;
    const genW = peakW * or.sun;
    const contactMin = or.contactMin * gr.contact;
    const contactFrac = Math.min(1, contactMin / 1440 * (or.lunar ? 1 : 12)); // several passes a day: fraction of the day the radio is on
    const payW = pls.reduce((s, p) => s + p.powerW * p.duty, 0);
    const loadW = 3 + payW + com.txW * contactFrac + pr.powerW * 0.05;
    const eclWh = loadW * or.eclipseMin / 60;
    const batUse = eclWh / bat.wh;
    if (genW < loadW) problems.push(`Power: the panels make ${genW.toFixed(1)} W on average but the spacecraft uses ${loadW.toFixed(1)} W.`);
    else if (genW < loadW * 1.15) warnings.push("Power margin is under 15%. A solar flare or a dusty panel could hurt.");
    if (batUse > 0.8) problems.push(`The battery (${bat.wh} Wh) cannot carry the ${eclWh.toFixed(0)} Wh needed through eclipse.`);
    else if (batUse > 0.6) warnings.push("The battery is deeply discharged every orbit, which shortens its life.");

    // 3. budget
    const dev = bus.cost + sol.cost + bat.cost + com.cost + pr.cost + pls.reduce((s, p) => s + p.cost, 0);
    const cost = dev + la.cost + gr.cost;
    const budget = sc.budget * df.budget;
    if (cost > budget) problems.push(`Budget: ${cost.toFixed(1)} M against a limit of ${budget.toFixed(1)} M.`);

    // 4. data volume (GB per day)
    const dataGen = pls.reduce((s, p) => s + p.data * p.duty, 0);
    const downGB = com.rateMbps * contactMin * 60 / 8 / 1000;
    if (dataGen > bus.storage) warnings.push("One day of data does not fit in onboard storage.");

    // 5. communications: contact time and rate give the downlink
    const linkRatio = dataGen > 0 ? Math.min(1, downGB / dataGen) : 1;
    if (linkRatio < 0.5) warnings.push(`The radio can send only ${(linkRatio * 100).toFixed(0)}% of the data you collect. The rest will pile up and be lost.`);

    // 6. time (weeks)
    const devWeeks = bus.weeks + sol.weeks + pr.weeks + pls.reduce((s, p) => s + p.weeks * 0.5, 0) + (gr.contact > 1 ? 4 : 0);
    const totalWeeks = devWeeks + la.wait;
    const deadline = sc.weeks * df.weeks;
    if (totalWeeks > deadline) problems.push(`Time: ${totalWeeks.toFixed(0)} weeks to launch, but the launch window closes at ${deadline.toFixed(0)}.`);

    // science potential per day, before events
    const sciDay = pls.reduce((s, p) => s + p.sci * p.duty * (p.tags.includes(sc.tag) ? 1 : 0.3), 0) * (sc.fit[d.orbit] || 0);
    const potential = sciDay * sc.days;
    const sciGB = dataGen;

    return {
      valid: problems.length === 0, problems, warnings,
      mass: { used: mass, cap, margin: massMargin },
      power: { gen: genW, load: loadW, margin: loadW > 0 ? (genW - loadW) / loadW : 0, batteryUse: batUse, eclipseWh: eclWh },
      budget: { used: cost, cap: budget, dev, launch: la.cost },
      data: { perDay: dataGen, storage: bus.storage },
      comms: { contactMin, rate: com.rateMbps, downGB, ratio: linkRatio },
      time: { weeks: totalWeeks, deadline },
      science: { perDay: sciDay, potential, target: sc.target },
      sciGB,
    };
  };

  // ---------- events ----------
  const EVENTS = [
    { id: "flare", title: "Solar flare", p: 0.03, text: "A solar flare cut solar-cell output for three days.", lesson: "Power margin and a bigger battery absorb space weather." },
    { id: "outage", title: "Ground station outage", p: 0.035, text: "A ground station went offline for two days.", lesson: "A station network and onboard storage cover gaps in contact." },
    { id: "glitch", title: "Instrument glitch", p: 0.03, text: "One instrument restarted and lost two days of measurements.", lesson: "Two different instruments make a mission less fragile." },
    { id: "wing", title: "Wing deployment", p: 0, text: "", lesson: "" },
  ];
  MD.EVENTS = EVENTS;

  // ---------- simulation ----------
  // Runs the mission day by day. Returns { outcome, days: [...], events, score, reasons }.
  // opts.sandbox: run even if the design breaks a limit (nothing is scored); the breakage is reported instead.
  MD.simulate = function (d, seed, opts) {
    opts = opts || {};
    const A = MD.analyse(d), sc = MD.SCENARIOS[d.scenario], df = MD.DIFFICULTY[d.difficulty] || MD.DIFFICULTY.normal;
    const la = MD.LAUNCHERS[d.launcher], sol = MD.SOLAR[d.solar], bus = MD.BUSES[d.bus], bat = MD.BATTERY[d.battery];
    const rng = MR.rng(seed != null ? seed : d.seed);
    const out = { analysis: A, days: [], events: [], outcome: "", cause: "", science: 0, lessons: [] };
    if (!A.valid && !opts.sandbox) { out.outcome = "rejected"; out.cause = "design"; out.reasons = A.problems.slice(); out.score = MD.score(d, A, out); return out; }

    // launch
    if (rng() > la.reliability) {
      out.outcome = "lost"; out.cause = "launch"; out.reasons = [`The ${la.name.toLowerCase()} failed. Every launch carries risk; a more reliable rocket costs more.`];
      out.events.push({ day: 0, title: "Launch failure", text: out.reasons[0] });
      out.score = MD.score(d, A, out); return out;
    }
    // wing deployment
    let solarMult = 1;
    if (d.solar === "wings" && rng() < 0.06 * df.events) { solarMult = 0.5; out.events.push({ day: 1, title: "Wing deployment", text: "One solar wing deployed only halfway.", lesson: "Moving parts can fail; keep power margin." }); }

    const genNom = A.power.gen * solarMult;
    let batWh = bat.wh, storage = 0, sciDelivered = 0, sciStored = 0, lostData = 0, dead = false;
    const hold = { flare: 0, outage: 0, glitch: 0 };
    for (let day = 1; day <= sc.days; day++) {
      for (const ev of EVENTS) {
        if (ev.p > 0 && hold[ev.id] === 0 && rng() < ev.p * df.events) {
          hold[ev.id] = ev.id === "flare" ? 3 : 2;
          out.events.push({ day, title: ev.title, text: ev.text, lesson: ev.lesson });
        }
      }
      const flare = hold.flare > 0, outage = hold.outage > 0, glitch = hold.glitch > 0;
      Object.keys(hold).forEach((k) => { if (hold[k] > 0) hold[k]--; });

      const gen = genNom * (flare ? 0.55 : 1);
      // daily energy balance in Wh (24 h)
      // below 10% battery the spacecraft drops into safe mode: instruments and radio off, only the 3 W core runs
      const powered = batWh > bat.wh * 0.1;
      const dayWh = (gen - (powered ? A.power.load : 3)) * 24;
      batWh = Math.max(0, Math.min(bat.wh, batWh + dayWh));
      if (batWh <= 0 && gen <= 3) { dead = true; }
      // collect
      const dayGen = powered && !glitch ? A.science.perDay : 0;
      const dataToday = powered && !glitch ? A.data.perDay : 0;
      storage += dataToday; sciStored += dayGen;
      // downlink
      const down = outage || !powered ? 0 : A.comms.downGB;
      const sent = Math.min(storage, down);
      const frac = storage > 0 ? sent / storage : 0;
      sciDelivered += sciStored * frac; sciStored -= sciStored * frac; storage -= sent;
      if (storage > bus.storage) { const over = storage - bus.storage; const lf = over / storage; sciStored *= 1 - lf; storage = bus.storage; lostData += over; }
      out.days.push({ day, batPct: Math.round(batWh / bat.wh * 100), storage: +storage.toFixed(2), science: +sciDelivered.toFixed(1), powered, flare, outage, glitch });
      if (dead) break;
    }
    out.science = sciDelivered; out.lostData = lostData;
    const ratio = sciDelivered / sc.target;
    out.ratio = ratio;
    out.outcome = dead ? "lost" : ratio >= 1 ? "success" : ratio >= 0.5 ? "partial" : "failed";
    out.cause = dead ? "power" : ratio >= 1 ? "ok" : lostData > 0 && ratio < 1 ? "data" : A.science.potential < sc.target ? "science" : "ops";
    out.reasons = MD.explain(d, A, out, sc);
    if (opts.sandbox) { out.sandbox = true; out.reasons.unshift("Sandbox run: nothing is scored." + (A.valid ? "" : " The design breaks limits that a scored mission would enforce: " + A.problems.join(" "))); }
    out.score = MD.score(d, A, out);
    return out;
  };

  MD.explain = function (d, A, out, sc) {
    const r = [];
    if (out.outcome === "lost" && out.cause === "power") r.push("The battery ran flat and the spacecraft went silent. Orbit-average power must beat the load, and the battery must carry the eclipse.");
    if (out.outcome === "success") r.push(`You returned ${out.science.toFixed(0)} science points against a target of ${sc.target}.`);
    if (out.outcome === "partial" || out.outcome === "failed") {
      if (!A.valid) r.push("The design breaks limits: " + A.problems.join(" ") + " Fix those first.");
      else if (out.cause === "science") r.push(`Even with no failures this design could return only about ${A.science.potential.toFixed(0)} points against a target of ${sc.target}. Add or upgrade an instrument, or choose a better orbit for this objective.`);
      if (out.cause === "data") r.push(`Data was lost: ${out.lostData.toFixed(1)} GB did not fit in storage because the radio could not send it fast enough. Add a faster radio, more ground contact, or a bigger bus.`);
      if (out.cause === "ops") r.push("The design could have met the target, but events cost you days of science.");
    }
    for (const e of out.events) if (e.lesson) r.push(`${e.title} on day ${e.day}: ${e.lesson}`);
    if (A.comms.ratio < 0.5 && out.outcome !== "success") r.push(`Your radio could return only ${(A.comms.ratio * 100).toFixed(0)}% of the data you produced each day.`);
    return r;
  };

  // ---------- roles & score ----------
  MD.ROLES = {
    planner: { name: "Mission planner", owns: ["launcher", "orbit", "ground"], goal: "Cost within budget, launch before the window closes, mass within the launcher limit.",
      check: (A) => A.budget.used <= A.budget.cap && A.time.weeks <= A.time.deadline && A.mass.margin >= 0 },
    craft: { name: "Spacecraft engineer", owns: ["bus", "solar", "battery", "prop"], goal: "Power makes the load and the battery carries the eclipse; mass margin over 5%.",
      check: (A) => A.power.gen >= A.power.load && A.power.batteryUse <= 0.8 && A.mass.margin >= 0.05 },
    science: { name: "Science lead", owns: ["payloads"], goal: "The design could reach the science target if nothing goes wrong.",
      check: (A) => A.science.potential >= A.science.target },
    comms: { name: "Communications and data lead", owns: ["comms"], goal: "The radio can send at least 80% of the data collected each day.",
      check: (A) => A.comms.ratio >= 0.8 },
  };

  // ---------- teamwork ----------
  // Which player holds which roles. With 1 player that player holds all four; with 2 they hold two each;
  // with 3 the science lead also takes communications; with 4 each player holds one.
  MD.assignRoles = function (n) {
    const all = Object.keys(MD.ROLES);
    n = Math.max(1, Math.min(4, n | 0));
    if (n === 1) return [all.slice()];
    if (n === 2) return [["planner", "craft"], ["science", "comms"]];
    if (n === 3) return [["planner"], ["craft"], ["science", "comms"]];
    return all.map((r) => [r]);
  };
  // For each role: is its goal met, what is wrong in plain words, and which other roles can help fix it.
  MD.roleReport = function (A) {
    const f = (x, d) => x.toFixed(d == null ? 1 : d);
    const rep = {};
    const plan = [];
    if (A.mass.cap === 0) plan.push("The rocket cannot reach this orbit.");
    else if (A.mass.margin < 0) plan.push("The spacecraft is heavier than the rocket can carry to this orbit.");
    if (A.budget.used > A.budget.cap) plan.push("Cost is " + f(A.budget.used - A.budget.cap) + " M over the budget.");
    if (A.time.weeks > A.time.deadline) plan.push("The launch window is missed by " + f(A.time.weeks - A.time.deadline, 0) + " weeks.");
    rep.planner = { ok: plan.length === 0, note: plan.join(" "), needs: ["craft", "science"] };
    const eng = [];
    if (A.power.gen < A.power.load) eng.push("The panels make " + f(A.power.gen) + " W but the spacecraft uses " + f(A.power.load) + " W.");
    if (A.power.batteryUse > 0.8) eng.push("The battery is too small to carry the eclipse.");
    if (A.mass.margin < 0.05 && A.mass.cap > 0) eng.push("Mass margin is under 5%.");
    rep.craft = { ok: eng.length === 0, note: eng.join(" "), needs: ["science", "comms", "planner"] };
    rep.science = { ok: A.science.potential >= A.science.target, note: A.science.potential >= A.science.target ? "" : "Science possible is " + f(A.science.potential, 0) + " of " + A.science.target + " needed. Add or swap an instrument.", needs: ["craft", "planner"] };
    rep.comms = { ok: A.comms.ratio >= 0.8, note: A.comms.ratio >= 0.8 ? "" : "The radio can send only " + f(A.comms.ratio * 100, 0) + "% of the daily data.", needs: ["planner", "science"] };
    return rep;
  };
  // Quick forecast: fly the design with seeds 1..n and report how often it succeeds. Deterministic.
  MD.odds = function (d, n) {
    n = n || 60;
    if (!MD.analyse(d).valid) return null;
    let win = 0, part = 0, tot = 0;
    for (let s = 1; s <= n; s++) { const o = MD.simulate(d, s); if (o.outcome === "success") win++; else if (o.outcome === "partial") part++; tot += o.score.total; }
    return { win: win / n, partial: part / n, avg: tot / n, n };
  };

  // 100 points: mission performance 30, science value 20, resource efficiency 20, decision quality 15, collaboration 15
  MD.score = function (d, A, out) {
    const sc = MD.SCENARIOS[d.scenario];
    const ratio = out.ratio != null ? Math.min(1, out.ratio) : 0;
    const performance = out.outcome === "success" ? 30 : out.outcome === "partial" ? 15 + 10 * ratio : out.outcome === "failed" ? 8 * ratio : 0;
    const science = Math.round(Math.min(1, (out.science || 0) / sc.target) * 20);
    // efficiency: used part of each limit; best when near but under 90%
    // using 60-100% of a limit is efficient; wasting most of it, or going over, is not
    const use = (a, b) => { const u = a / b; return u > 1 ? 0 : u >= 0.6 ? 1 : 0.4 + (u / 0.6) * 0.6; };
    const effs = A.valid || out.outcome !== "rejected" ? [use(A.budget.used, A.budget.cap), use(A.mass.used, Math.max(A.mass.cap, 0.01)), use(A.time.weeks, A.time.deadline)] : [0, 0, 0];
    const efficiency = out.outcome === "rejected" ? 0 : Math.round(effs.reduce((s, x) => s + x, 0) / 3 * 20);
    const critical = sc.critical.map((k) => ({ mass: A.mass.margin >= 0.05, power: A.power.margin >= 0.1 && A.power.batteryUse <= 0.6, budget: A.budget.used <= A.budget.cap * 0.95, data: A.comms.ratio >= 0.8, comms: A.comms.ratio >= 0.8, time: A.time.weeks <= A.time.deadline * 0.95 }[k]));
    const roleOk = Object.values(MD.ROLES).map((r) => (out.outcome !== "rejected" && r.check(A) ? 1 : 0));
    const decisions = Math.round((critical.filter(Boolean).length / critical.length) * 9 + (A.warnings.length === 0 ? 6 : Math.max(0, 6 - A.warnings.length * 2)));
    const collab = Math.round(roleOk.reduce((s, x) => s + x, 0) / roleOk.length * 15);
    const parts = { performance: Math.round(performance), science, efficiency, decisions: out.outcome === "rejected" ? 0 : decisions, collab };
    const total = Object.values(parts).reduce((s, x) => s + x, 0);
    return { parts, total, roles: Object.keys(MD.ROLES).map((k, i) => ({ id: k, name: MD.ROLES[k].name, ok: !!roleOk[i] })) };
  };

  // ---------- share links ----------
  // A design is written as dot-separated names so it fits in a URL hash: coast.normal.small.sso.u6.wings.m.sband.camera+multi.none.single
  MD.encode = function (d) {
    return [d.scenario, d.difficulty, d.launcher, d.orbit, d.bus, d.solar, d.battery, d.comms, d.payloads.join("+") || "-", d.prop, d.ground].join(".");
  };
  // Never trust a link: every token must exist in the catalogues, otherwise null.
  MD.decode = function (str) {
    const t = String(str || "").split(".");
    if (t.length !== 11) return null;
    const [scenario, difficulty, launcher, orbit, bus, solar, battery, comms, pl, prop, ground] = t;
    const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    const payloads = pl === "-" ? [] : pl.split("+");
    if (!(has(MD.SCENARIOS, scenario) && has(MD.DIFFICULTY, difficulty) && has(MD.LAUNCHERS, launcher) && has(MD.ORBITS, orbit) && has(MD.BUSES, bus) && has(MD.SOLAR, solar) &&
      has(MD.BATTERY, battery) && has(MD.COMMS, comms) && has(MD.PROP, prop) && has(MD.GROUND, ground) && payloads.length <= 3 && payloads.every((p) => has(MD.PAYLOADS, p)))) return null;
    return Object.assign(MD.defaultDesign(scenario), { scenario, difficulty, launcher, orbit, bus, solar, battery, comms, payloads, prop, ground });
  };

  // ---------- what changed since the previous run ----------
  const LABEL = { launcher: "rocket", orbit: "orbit", bus: "bus", solar: "solar panels", battery: "battery", comms: "radio", prop: "propulsion", ground: "ground stations", payloads: "instruments" };
  const NAMEOF = { launcher: MD.LAUNCHERS, orbit: MD.ORBITS, bus: MD.BUSES, solar: MD.SOLAR, battery: MD.BATTERY, comms: MD.COMMS, prop: MD.PROP, ground: MD.GROUND };
  const nm = (k, v) => (k === "payloads" ? (v.length ? v.map((p) => MD.PAYLOADS[p].name).join(" + ") : "none") : NAMEOF[k][v].name);
  // prev and cur are { design, score:{parts,total}, outcome }. Returns plain facts, no guessing about causes beyond the score parts.
  MD.delta = function (prev, cur) {
    if (!prev || !cur) return null;
    const changes = [];
    for (const k of Object.keys(LABEL)) {
      const a = k === "payloads" ? prev.design[k].slice().sort().join() : prev.design[k], b = k === "payloads" ? cur.design[k].slice().sort().join() : cur.design[k];
      if (a !== b) changes.push({ key: k, label: LABEL[k], from: nm(k, prev.design[k]), to: nm(k, cur.design[k]) });
    }
    const parts = {};
    for (const k of Object.keys(cur.score.parts)) parts[k] = cur.score.parts[k] - prev.score.parts[k];
    const biggest = Object.entries(parts).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))[0];
    return { total: cur.score.total - prev.score.total, parts, changes, outcomeFrom: prev.outcome, outcomeTo: cur.outcome, biggest: biggest && biggest[1] !== 0 ? biggest : null,
      sameDesign: changes.length === 0 && prev.design.difficulty === cur.design.difficulty };
  };

  // ---------- progression: stars and badges ----------
  // 0 stars: lost or fell short, 1: partial, 2: success, 3: success with 92 or more points
  MD.stars = function (outcome, total) { return outcome === "success" ? (total >= 92 ? 3 : 2) : outcome === "partial" ? 1 : 0; };
  MD.BADGES = [
    { id: "first", name: "First flight", desc: "Complete a mission successfully." },
    { id: "thrifty", name: "Thrifty", desc: "Succeed using 70% or less of the budget." },
    { id: "storm", name: "Storm rider", desc: "Succeed after two or more random events." },
    { id: "light", name: "Lightweight", desc: "Succeed with a spacecraft at 40% or less of the rocket's capacity." },
    { id: "allhands", name: "All hands", desc: "Get 3 stars with every role's goal met." },
    { id: "hardliner", name: "Hardliner", desc: "Succeed on Hard difficulty." },
    { id: "moon", name: "Lunar arrival", desc: "Succeed in the Moon Scout mission." },
  ];
  // Which badges a finished mission earns. out is the result of MD.simulate.
  MD.badgesFor = function (d, out) {
    if (!out || out.outcome !== "success") return [];
    const A = out.analysis, got = ["first"], stars = MD.stars(out.outcome, out.score.total);
    if (A.budget.used <= 0.7 * A.budget.cap) got.push("thrifty");
    if (out.events.length >= 2) got.push("storm");
    if (A.mass.cap > 0 && A.mass.used <= 0.4 * A.mass.cap) got.push("light");
    if (stars === 3 && out.score.roles.every((r) => r.ok)) got.push("allhands");
    if (d.difficulty === "hard") got.push("hardliner");
    if (d.scenario === "moon") got.push("moon");
    return got;
  };

  // ---------- go / no-go: one light per resource for the pre-launch check ----------
  // GO = fine, HOLD = allowed but risky, NO-GO = a scored mission will not launch.
  MD.goNoGo = function (A) {
    const light = (bad, warn) => (bad ? "NO-GO" : warn ? "HOLD" : "GO");
    return {
      mass: light(A.mass.cap === 0 || A.mass.used > A.mass.cap, A.mass.margin < 0.05),
      power: light(A.power.gen < A.power.load || A.power.batteryUse > 0.8, A.power.margin < 0.15 || A.power.batteryUse > 0.6),
      budget: light(A.budget.used > A.budget.cap, A.budget.used > 0.95 * A.budget.cap),
      data: light(false, A.comms.ratio < 0.8),
      comms: light(false, A.comms.ratio < 0.5),
      time: light(A.time.weeks > A.time.deadline, A.time.weeks > 0.95 * A.time.deadline),
    };
  };

  // ---------- competition ----------
  // Teams fly the same scenario with the same seed. Returns teams sorted by score, ties broken by lower cost.
  MD.rank = function (teams) {
    return teams.slice().sort((a, b) => b.score.total - a.score.total || a.cost - b.cost);
  };
})();
