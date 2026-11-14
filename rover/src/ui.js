// UI only. It never simulates anything: it asks MR.simulate for a trace and plays the trace back.
(function () {
  const MR = globalThis.MR;
  const T = MR.loadTerrain();
  const C = MR.CONFIG;
  const PX = 6; // canvas pixels per terrain cell

  const G = {
    screen: "mission", reached: 0,
    mission: MR.MISSIONS.storm,
    design: MR.defaultDesign(),
    rules: [], elseAction: "follow_plan",
    result: null, tab: "core", fresh: new Set(), stagger: false,
    cam: true, idx: 0, playing: false, speed: 1, lastTs: 0, acc: 0, logged: -1, ang: 0, fxDone: false,
  };
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage may be blocked; the game still works */ } },
  };
  const saved = store.get("roverRules.v1", null);
  if (saved && saved.design && saved.rules) { G.design = saved.design; G.rules = saved.rules; G.elseAction = saved.elseAction || "follow_plan"; if (MR.MISSIONS[saved.mission]) G.mission = MR.MISSIONS[saved.mission]; }
  const save = () => store.set("roverRules.v1", { design: G.design, rules: G.rules, elseAction: G.elseAction, mission: G.mission.id });
  const best = store.get("roverRules.best", {});
  const objDone = store.get("roverRules.obj", {});          // per mission: which bonus objectives were ever completed
  const badgesGot = store.get("roverRules.badges", []);      // ids of earned badges
  G.name = store.get("roverRules.name", "Pebble");
  const NAMES = ["Pebble", "Dusty", "Rusty", "Sol", "Ziggy", "Comet", "Biscuit", "Orbit", "Pixel", "Nova", "Tumble", "Echo"];
  const FACTS = [
    "A Martian day (a sol) lasts about 24 hours 39 minutes.",
    "Radio signals need roughly 3 to 22 minutes to cross the gap between Earth and Mars, so rovers drive themselves.",
    "The 2018 global dust storm blocked so much sunlight that it ended the Opportunity rover's mission.",
    "Curiosity's aluminium wheels were damaged by sharp rocks early in its mission, which changed how it is driven.",
    "Mars nights fall far below -70 °C. Real rovers keep their electronics warm with heaters.",
    "Opportunity once spent weeks freeing its wheels from a sand dune.",
  ];
  const noteCount = (tr, re) => tr.reduce((n, st) => n + st.notes.filter((x) => re.test(x)).length, 0);
  const last = (tr) => tr[tr.length - 1];
  // bonus objectives are checked against the replay only; they never change the simulation
  const OBJ = {
    storm: [["Finish with the battery above 30%", (R, tr) => R.summary.alive && last(tr).battPct > 30], ["Send at least one data package home", (R) => R.summary.science > 0], ["Never let the rover go dormant", (R, tr) => !tr.some((x) => x.dormant)]],
    climb: [["Reach the goal in under 60 steps", (R) => R.summary.goalStep != null && R.summary.goalStep < 60], ["Finish with the wheels above 85%", (R, tr) => R.summary.alive && last(tr).wheel > 85], ["Take at least 2 photos", (R, tr) => noteCount(tr, /^Photo taken/) >= 2]],
    sand: [["Never get stuck in sand", (R, tr) => !tr.some((x) => x.action === "stuck")], ["Reach the goal before sunset", (R) => R.summary.goalStep != null && R.summary.goalStep < 48], ["Send at least one data package home", (R) => R.summary.science > 0]],
    night: [["Reach the goal", (R) => R.summary.goal], ["Never let the temperature fall below -45 °C", (R, tr) => !tr.some((x) => x.temp < -45)], ["Finish with the battery above 20%", (R, tr) => R.summary.alive && last(tr).battPct > 20]],
  };
  const BADGES = [
    ["first", "First Light", "Complete any mission.", (c) => c.win],
    ["flawless", "Flawless", "Score 90 or more.", (c) => c.s.score >= 90],
    ["ironclad", "Ironclad", "Complete a mission with the wheels above 90%.", (c) => c.win && last(c.tr).wheel > 90],
    ["thrifty", "Thrifty Engineer", "Complete a mission with a rover that costs 90 or less.", (c) => c.win && c.R.rover.cost <= 90],
    ["hero", "Data Hero", "Send 20 or more science points home in one sol.", (c) => c.s.science >= 20],
    ["surfer", "Sand Surfer", "Complete the Sand Trap without getting stuck.", (c) => c.win && c.id === "sand" && !c.tr.some((x) => x.action === "stuck")],
    ["owl", "Night Owl", "Complete the Night Crossing.", (c) => c.win && c.id === "night"],
  ];

  // ---- tiny DOM helper ------------------------------------------------------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "html") el.innerHTML = v;
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
    return el;
  }
  const $ = (id) => document.getElementById(id);
  const rover = () => MR.buildRover(G.design);

  // ---- sound (tiny WebAudio beeps, off until the player turns it on) ---------
  let actx = null, soundOn = store.get("roverRules.sound", false);
  function sfx(kind) {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const tones = { click: [[660, .05]], snap: [[220, .06], [440, .08]], ok: [[523, .08], [784, .14]], bad: [[200, .15], [110, .3]], win: [[523, .1], [659, .1], [784, .1], [1047, .3]], lose: [[300, .2], [220, .2], [140, .4]], launch: [[300, .08], [400, .08], [600, .2]] }[kind] || [];
      let t = actx.currentTime;
      for (const [f, d] of tones) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = kind === "bad" || kind === "lose" ? "sawtooth" : "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.9;
      }
    } catch (e) { /* audio is optional */ }
  }
  function syncSnd() { $("sndBtn").textContent = soundOn ? "Sound on" : "Sound off"; }
  $("sndBtn").onclick = () => { soundOn = !soundOn; store.set("roverRules.sound", soundOn); syncSnd(); sfx("click"); };
  syncSnd();

  // ---- star field --------------------------------------------------------------
  (function stars() {
    const c = $("stars"), g = c.getContext("2d");
    const draw = () => {
      c.width = innerWidth; c.height = innerHeight; const r = MR.rng(7);
      for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,${230 + (r() * 25) | 0},${200 + (r() * 55) | 0},${0.2 + r() * 0.7})`; const s = r() < 0.1 ? 2 : 1; g.fillRect(r() * c.width, r() * c.height, s, s); }
    };
    draw(); addEventListener("resize", draw);
  })();

  // ---- navigation -----------------------------------------------------------
  const SCREENS = [["mission", "Mission"], ["design", "Build"], ["program", "Program"], ["run", "Launch"]];
  function go(name) {
    G.screen = name; G.playing = false; G.loopId = (G.loopId || 0) + 1;
    const at = SCREENS.findIndex(([id]) => id === name); G.reached = Math.max(G.reached, at);
    for (const [id] of SCREENS) $("s-" + id).classList.toggle("on", id === name);
    $("nav").replaceChildren(...SCREENS.map(([id, label], k) => h("button", { class: id === name ? "on" : k < G.reached ? "done" : "", onclick: () => { sfx("click"); go(id); } }, h("b", {}, k + 1), label)));
    if (name === "design") G.stagger = true;
    ({ mission: drawMission, design: drawDesign, program: drawProgram, run: drawRun })[name]();
    scrollTo(0, 0);
  }

  const stars = (s) => (s >= 90 ? 3 : s >= 70 ? 2 : s >= 40 ? 1 : 0);
  const starStr = (n) => "★".repeat(n) + "☆".repeat(3 - n);

  // ---- 1. mission -----------------------------------------------------------
  const MINFO = { storm: { icon: "🌪️", diff: 3, tip: "Power is everything. Dust eats your sunlight." }, climb: { icon: "⛰️", diff: 2, tip: "Steep ground flips rovers. Look before you drive." }, sand: { icon: "🏜️", diff: 2, tip: "" }, night: { icon: "🌙", diff: 3, tip: "" } };
  let typeTimer = 0;
  function typeText(el, text) {
    clearInterval(typeTimer); let i = 0; el.textContent = ""; el.classList.add("caret");
    typeTimer = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) { clearInterval(typeTimer); el.classList.remove("caret"); } }, 14);
  }
  function drawMission() {
    const el = $("s-mission");
    const brief = h("p", { class: "brief" });
    const hero = h("div", { class: "hero" },
      h("div", { class: "sun" }),
      h("div", { class: "mtn", html: '<svg viewBox="0 0 1000 80" preserveAspectRatio="none" width="100%" height="80"><path d="M0 80V50L90 22 170 48 270 10 380 52 480 28 600 56 720 18 830 50 920 30 1000 52V80Z" fill="#6e2c14"/><path d="M0 80V62L120 42 240 64 400 40 560 66 700 44 860 66 1000 48V80Z" fill="#8a3b1c" opacity=".8"/></svg>' }),
      h("div", { class: "title" }, h("h1", {}, "ROVER RULES"), h("p", {}, "Mars is 225 million km away. Nobody can steer. You write the rules, the rover lives or dies by them.")),
      h("div", { class: "driver", html: MR.roverSVG(MR.defaultDesign(), { drive: true }) }));
    el.replaceChildren(hero,
      h("div", { class: "grid2" }, MR.MISSION_LIST.map((m) => {
        const mi = MINFO[m.id] || { icon: "🚀", diff: 2, tip: "" }; const b = best[m.id];
        return h("div", { class: "card mcard" + (m === G.mission ? " on" : ""), onclick: () => { sfx("snap"); G.mission = m; G.result = null; save(); drawMission(); } },
          h("div", { class: "big" }, mi.icon), h("h2", {}, m.title),
          h("p", {}, h("span", { class: "pill" }, "Main threat: " + m.threat), "Difficulty ", h("span", { class: "pips" }, [0, 1, 2].map((k) => h("i", { class: k < mi.diff ? "f" : "" })))),
          h("p", { class: "small dim" }, m.real),
          h("p", { class: "best" }, b == null ? "NOT ATTEMPTED" : `BEST ${starStr(stars(b))}  ${b}/100  ·  objectives ${(objDone[m.id] || []).filter(Boolean).length}/3`));
      })),
      h("div", { style: "height:14px" }),
      h("div", { class: "card" }, h("h3", {}, "Mission briefing"), brief,
        h("h4", { class: "objh" }, "Bonus objectives"),
        h("ul", { class: "objs" }, (OBJ[G.mission.id] || []).map(([label], k) => h("li", { class: (objDone[G.mission.id] || [])[k] ? "done" : "" }, label))),
        h("p", { class: "small dim" }, `Badges collected: ${badgesGot.length} of ${BADGES.length}` + (badgesGot.length ? " · " + BADGES.filter((b) => badgesGot.includes(b[0])).map((b) => b[1]).join(", ") : "")),
        h("p", { class: "small dim" }, `Signals take ${C.SIGNAL_DELAY_MIN[0]}-${C.SIGNAL_DELAY_MIN[1]} minutes to reach Mars. Design the rover, write IF-THEN rules, uplink them as one package, watch a Martian day (a sol), then read the replay and fix what failed.`)),
      h("p", {}, h("button", { class: "btn primary big", onclick: () => { sfx("click"); go("design"); } }, "Enter the assembly bay  →")));
    typeText(brief, G.mission.brief);
  }

  // ---- 2. design: assembly bay -----------------------------------------------
  const ICON = { battery: "🔋", solar: "☀️", wheels: "⚙️", computer: "🧠", navcam: "📷", wheelsensor: "🛞", sunsensor: "🌞", dustsensor: "🌫️", heater: "🔥", sciencecam: "🔬", drill: "⛏️", antenna: "📡" };
  const SLOTLABEL = { battery: "Battery", solar: "Solar panels", wheels: "Wheels", computer: "Onboard computer" };
  const GIVES = { battery: (v) => `${v.wh} Wh`, solar: (v) => `${v.w} W`, wheels: (v) => (v.wear < 1 ? "tougher, slower" : "light, fast"), computer: (v) => `${v.slots} rules` };
  const TIPS = {
    sand: "Sand grips the wheels. A rule like 'terrain ahead is sand, then slow down' needs the navigation camera. Rugged wheels dig in less, and the shortest route crosses the worst of it.",
    night: "You land late in the day. Park before dark, but do not freeze: try 'time of day > 19 OR time of day < 6 then safe mode', and a heat rule for low temperatures. The or-joiner is made for exactly this.",
    storm: "Dust will choke your panels around midday. A bigger battery buys time, a heater keeps electronics alive at night, and an antenna lets you send the science home.",
    climb: "The ground team's route is steep. A navigation camera gives you 'slope ahead' for rules, and rugged wheels survive rocks longer.",
  };

  function setPart(key, val) { sfx("snap"); G.design[key] = val; G.fresh = new Set([key]); G.result = null; save(); drawDesign(); }
  function toggleOpt(k) {
    const d = G.design, on = !d.options.includes(k); sfx(on ? "snap" : "click");
    d.options = on ? [...d.options, k] : d.options.filter((o) => o !== k); G.fresh = on ? new Set([k]) : new Set(); G.result = null; save(); drawDesign();
  }
  function hl(id, on) { const n = document.querySelector(`#stage [data-part="${id}"]`); if (n) n.classList.toggle("hl", on); }

  function partCard(id, v, selected, onclick) {
    return h("div", { class: "part-card" + (selected ? " on" : ""), onclick, onmouseenter: () => hl(id, true), onmouseleave: () => hl(id, false) },
      h("div", { class: "ico" }, ICON[id] || "🔩"), h("div", { class: "nm" }, v.label.replace(/\s*\(.*\)/, "")),
      h("div", { class: "st" }, `mass ${v.mass} · cost ${v.cost}`),
      h("div", { class: "gv" }, v.gives || (GIVES[id] ? "" : "")));
  }

  function drawDesign() {
    const el = $("s-design"); const P = MR.PARTS; const d = G.design; const r = rover();
    const bar = (v, max, name, cls) => h("div", {}, h("div", { class: "small" }, `${name}: ${v} / ${max}`), h("div", { class: "bar " + (v > max ? "over" : v > max * 0.9 ? "warn" : "") + (cls || "") }, h("i", { style: `width:${Math.min(100, (v / max) * 100)}%` })));
    const stat = (name, txt, pct) => h("div", {}, h("div", { class: "small" }, `${name}: `, h("b", {}, txt)), h("div", { class: "bar acc" }, h("i", { style: `width:${Math.min(100, pct)}%` })));

    const coreSlots = Object.keys(SLOTLABEL).map((key) => h("div", { class: "slot" }, h("h4", {}, SLOTLABEL[key]),
      h("div", { class: "opts" }, Object.entries(P[key]).map(([k, v]) => {
        const vv = Object.assign({}, v, { gives: GIVES[key](v) });
        return partCard(key, vv, d[key] === k, () => setPart(key, k));
      }))));
    const instr = h("div", { class: "opts" }, Object.entries(P.options).map(([k, v]) => partCard(k, v, d.options.includes(k), () => toggleOpt(k))));

    const caps = [...Object.keys(MR.SENSORS).map((k) => [k, MR.SENSORS[k].label, r.sensors && r.sensors.has(k), "on"]), ...Object.keys(MR.ACTIONS).map((k) => [k, MR.ACTIONS[k].label, r.actions && r.actions.has(k), "act"])];
    const stage = h("div", { class: "stage", id: "stage" },
      h("div", { class: "label" }, "Name your rover ",
        h("input", { class: "nameinput", value: G.name, maxlength: 16, "aria-label": "Rover name", oninput: (e) => { G.name = e.target.value.trim() || "Pebble"; store.set("roverRules.name", G.name); } }),
        h("button", { class: "btn small", onclick: () => { G.name = NAMES[Math.floor(Math.random() * NAMES.length)]; store.set("roverRules.name", G.name); sfx("click"); drawDesign(); } }, "Random")), h("div", { class: "scan" }),
      h("div", { html: MR.roverSVG(d, { fresh: G.fresh, stagger: G.stagger }) }),
      h("div", { class: "chips" }, caps.map(([, label, ok, cls]) => h("span", { class: "chip " + (ok ? cls : "off") }, label))));
    G.fresh = new Set(); G.stagger = false;

    el.replaceChildren(
      h("div", { class: "bay" },
        h("div", {}, stage,
          h("div", { style: "height:10px" }),
          h("div", { class: "card" }, h("h3", {}, "Budget & performance"),
            h("div", { class: "stats", style: "padding:0" },
              bar(r.mass || 0, C.BUDGET_MASS, "Mass"), bar(r.cost || 0, C.BUDGET_COST, "Cost"),
              stat("Battery", r.capWh + " Wh", (r.capWh / 700) * 100), stat("Solar", r.solarW + " W", (r.solarW / 200) * 100),
              stat("Speed", ((r.speed || 0) * 100).toFixed(0) + "%", ((r.speed || 0) / 0.9) * 100), stat("Rule slots", r.slots + "", (r.slots / 8) * 100)),
            r.errors.length ? h("p", { style: "color:var(--bad);margin:8px 0 0" }, "⚠ " + r.errors.join(". ")) : h("p", { style: "color:var(--ok);margin:8px 0 0" }, "✔ Within budget. Idle draw " + r.idlePowerW + " W."))),
        h("div", {},
          h("div", { class: "tabs" },
            h("div", { class: "tab" + (G.tab === "core" ? " on" : ""), onclick: () => { G.tab = "core"; drawDesign(); } }, "Core systems"),
            h("div", { class: "tab" + (G.tab === "instr" ? " on" : ""), onclick: () => { G.tab = "instr"; drawDesign(); } }, `Instruments (${d.options.length})`)),
          h("div", { class: "card" }, G.tab === "core" ? coreSlots : [h("h4", { style: "margin:0 0 8px;color:var(--dim);font-size:12px;letter-spacing:.14em" }, "BOLT ON SENSORS AND TOOLS. SENSORS UNLOCK RULE CONDITIONS, TOOLS UNLOCK ACTIONS."), instr]),
          h("div", { style: "height:10px" }),
          h("div", { class: "tipbox" }, h("b", {}, "Engineer's tip: "), TIPS[G.mission.id] || ""),
          h("div", { style: "height:12px" }),
          h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" },
            h("button", { class: "btn primary big", disabled: !r.ok, onclick: () => { sfx("click"); go("program"); } }, "Program the rover  →"),
            h("button", { class: "btn", onclick: () => { G.stagger = true; drawDesign(); sfx("snap"); } }, "↻ Replay assembly")))));
  }

  // ---- 3. program: visual block editor (Scratch style) ------------------------
  // The program is ONE if / else if / else chain. The first branch whose condition is true runs, the rest are skipped.
  // Data: G.rules = branches [{sensor, op, value, not?, more?:[terms], join?:"and"|"or", action, off?}], G.elseAction = final else.
  const DEF = { battery: ["<", 25], temp: ["<", -45], storage: [">", 60], time_of_day: [">", 18], slope_ahead: [">", 17], terrain_ahead: ["==", 1], wheel_health: ["<", 40], sunlight: ["<", 10], dust: [">", 50] };
  const MAX_TERMS = 3;
  const needText = (map, k) => (map[k] ? "needs " + MR.PARTS.options[map[k]].label.toLowerCase() : "");
  function newTerm(s) { const [op, value] = DEF[s] || ["<", 25]; return { sensor: s, op, value }; }
  function newRule(sensor, action) { return Object.assign(newTerm(sensor), { action: action || "charge" }); }
  const termAt = (r, t) => (t === 0 ? r : r.more[t - 1]);
  function setTerm(r, t, s) { if (t === 0) { r.sensor = s; [r.op, r.value] = DEF[s] || ["<", 25]; } else r.more[t - 1] = newTerm(s); }
  function addTerm(r, s) { r.more = r.more || []; if (1 + r.more.length >= MAX_TERMS) return false; r.more.push(newTerm(s || "battery")); return true; }
  const commit = () => { const y = scrollY; G.result = null; save(); drawProgram(); scrollTo(0, y); };
  const say = (t) => { const n = $("tuneMsg"); if (n) n.textContent = t; };

  function applyDrop(p, res, idx) {
    if (!res) return; const rv = rover();
    if (res.type === "else") { G.elseAction = p.action; sfx("snap"); return commit(); }
    if (res.type === "slot") {
      const r = G.rules[res.i];
      if (p.kind === "cond") { if (res.t >= 0) setTerm(r, res.t, p.sensor); else if (!addTerm(r, p.sensor)) { sfx("bad"); return say(`A condition can have at most ${MAX_TERMS} parts.`); } }
      else r.action = p.action;
      G.sel = res.i; sfx("snap"); return commit();
    }
    if (res.type === "del") { G.rules.splice(p.i, 1); sfx("click"); return commit(); }
    if (p.kind === "move") { const [r] = G.rules.splice(p.i, 1); G.rules.splice(idx > p.i ? idx - 1 : idx, 0, r); G.sel = null; sfx("snap"); return commit(); }
    if (G.rules.length >= rv.slots) { sfx("bad"); return say(`All ${rv.slots} rule slots are used. Delete a branch or build a bigger computer.`); }
    G.rules.splice(idx, 0, p.kind === "rule" ? newRule("battery", "charge") : p.kind === "cond" ? newRule(p.sensor) : newRule("battery", p.action));
    sfx("snap"); commit();
  }
  // a tap on a palette block (no drag) fills the selected branch, or starts a new one
  function tapPalette(p) {
    const rv = rover(); const i = G.sel != null && G.rules[G.sel] ? G.sel : G.rules.length - 1;
    if (p.kind === "rule" || i < 0) {
      if (G.rules.length >= rv.slots) { sfx("bad"); return say(`All ${rv.slots} rule slots are used.`); }
      G.rules.push(p.kind === "cond" ? newRule(p.sensor) : p.kind === "act" ? newRule("battery", p.action) : newRule("battery", "charge")); G.sel = G.rules.length - 1; sfx("snap"); return commit();
    }
    if (p.kind === "cond") { const r = G.rules[i]; if (!addTerm(r, p.sensor)) setTerm(r, 0, p.sensor); } else G.rules[i].action = p.action;
    sfx("snap"); commit();
  }

  // pointer-based drag so it works with mouse and touch; a ghost copy follows the finger
  function startDrag(e, payload, srcEl, onTap) {
    if (e.button > 0) return; e.preventDefault();
    const rect = srcEl.getBoundingClientRect(), sx = e.clientX, sy = e.clientY; let moved = false;
    const ghost = srcEl.cloneNode(true); ghost.classList.add("dragghost"); ghost.style.cssText = `width:${rect.width}px;left:${rect.left}px;top:${rect.top}px`;
    const rulesEls = () => [...$("chain").querySelectorAll(":scope > .cblk[data-rule]")];
    const insIndex = (y) => rulesEls().filter((n) => { const b = n.getBoundingClientRect(); return b.top + b.height / 2 < y; }).length;
    const resolve = (x, y) => {
      const el = document.elementFromPoint(x, y); if (!el) return null;
      const slot = el.closest("[data-drop=cond],[data-drop=act],[data-drop=elseact]");
      if (slot) {
        const d = slot.dataset.drop;
        if (payload.kind === "cond" && d === "cond") { const tb = el.closest("[data-t]"), on = tb && slot.contains(tb); return { type: "slot", el: on ? tb : slot, i: +slot.dataset.i, t: on ? +tb.dataset.t : -1 }; }
        if (payload.kind === "act" && d === "act") return { type: "slot", el: slot, i: +slot.dataset.i };
        if (payload.kind === "act" && d === "elseact") return { type: "else", el: slot };
      }
      if (el.closest("[data-drop=pal]")) return payload.kind === "move" ? { type: "del", el: el.closest("[data-drop=pal]") } : null;
      const w = el.closest("[data-drop=ws]"); return w ? { type: "ws", el: w } : null;
    };
    const clear = () => { document.querySelectorAll(".over,.ins").forEach((n) => (n.classList.contains("ins") ? n.remove() : n.classList.remove("over"))); };
    const move = (ev) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
      if (!moved) { moved = true; document.body.append(ghost); srcEl.classList.add("dragging"); }
      ghost.style.transform = `translate(${ev.clientX - sx}px,${ev.clientY - sy}px)`;
      clear(); const res = resolve(ev.clientX, ev.clientY); if (!res) return;
      if (res.type === "ws") { const rs = rulesEls(), ins = h("div", { class: "ins" }); $("chain").insertBefore(ins, rs[insIndex(ev.clientY)] || $("elseblk")); } else res.el.classList.add("over");
    };
    const end = (ev) => {
      removeEventListener("pointermove", move); removeEventListener("pointerup", end); removeEventListener("pointercancel", end);
      ghost.remove(); srcEl.classList.remove("dragging");
      const res = moved && ev.type === "pointerup" ? resolve(ev.clientX, ev.clientY) : null, idx = res && res.type === "ws" ? insIndex(ev.clientY) : 0;
      clear(); if (!moved) { if (onTap) onTap(); return; } applyDrop(payload, res, idx);
    };
    addEventListener("pointermove", move); addEventListener("pointerup", end); addEventListener("pointercancel", end);
  }

  const hexph = () => h("span", { class: "hexph" }), actph = () => h("span", { class: "actph" });

  // one boolean "hexagon": [not] sensor op value
  function termBlock(r, t, rv) {
    const term = termAt(r, t), sd = MR.SENSORS[term.sensor], ok = rv.sensors.has(term.sensor);
    const upd = () => { sfx("click"); commit(); };
    const valueEl = sd.enum
      ? h("select", { "aria-label": "value", onchange: (e) => { term.value = +e.target.value; upd(); } }, sd.enum.map((n, k) => h("option", { value: k, selected: term.value === k }, n)))
      : h("input", { type: "number", "aria-label": "value", min: sd.min, max: sd.max, step: sd.step, value: term.value, onchange: (e) => { term.value = +e.target.value; upd(); } });
    return h("span", { class: "blk cond" + (ok ? "" : " bad"), "data-t": t, title: ok ? "" : "Sensor not installed: " + needText(MR.SENSOR_NEEDS, term.sensor) },
      h("button", { class: "tbtn" + (term.not ? " on" : ""), title: "not: flips this condition", onclick: () => { term.not = !term.not; upd(); } }, "not"),
      h("select", { "aria-label": "sensor", onchange: (e) => { setTerm(r, t, e.target.value); upd(); } },
        Object.entries(MR.SENSORS).map(([k, s]) => { const has = rv.sensors.has(k); return h("option", { value: k, selected: term.sensor === k, disabled: !has && term.sensor !== k }, s.label + (has ? "" : " (not installed)")); })),
      sd.enum ? h("span", {}, "is") : h("select", { "aria-label": "operator", onchange: (e) => { term.op = e.target.value; upd(); } }, MR.OPS.map((o) => h("option", { value: o, selected: term.op === o }, o))),
      valueEl, sd.unit,
      t > 0 ? h("button", { class: "tbtn", title: "Remove this part", onclick: () => { r.more.splice(t - 1, 1); upd(); } }, "×") : null);
  }
  // the condition of a branch: <a> and <b> or ... (one joiner for the whole condition, so there is no precedence to guess)
  function condBlock(r, i, rv) {
    const terms = MR.termsOf(r), parts = [];
    terms.forEach((_, t) => {
      if (t > 0) parts.push(h("select", { class: "join", "aria-label": "and / or", title: "and: all must be true. or: any one is enough.", onchange: (e) => { r.join = e.target.value; sfx("click"); commit(); } }, ["and", "or"].map((j) => h("option", { value: j, selected: (r.join || "and") === j }, j))));
      parts.push(termBlock(r, t, rv));
    });
    parts.push(h("button", { class: "iconbtn addterm", disabled: terms.length >= MAX_TERMS, title: "Add another condition (and / or). You can also drop a sensor here.", onclick: () => { addTerm(r, "battery"); sfx("snap"); commit(); } }, "+"));
    parts.push(h("span", { class: "kw" }, "then"));
    return h("span", { class: "condwrap" }, parts);
  }
  function actBlock(action, onset, rv) {
    const ok = rv.actions.has(action);
    return h("span", { class: "blk act" + (ok ? "" : " bad"), title: ok ? "" : "No hardware for this action: " + needText(MR.ACTION_NEEDS, action) },
      h("select", { "aria-label": "action", onchange: (e) => { onset(e.target.value); sfx("click"); commit(); } },
        Object.entries(MR.ACTIONS).map(([k, a]) => { const has = rv.actions.has(k); return h("option", { value: k, selected: action === k, disabled: !has && action !== k }, a.label + (has ? "" : " (no hardware)")); })));
  }
  // one arm of the chain: "if" for the first, "else if" for the rest
  function ruleBlock(i, rv) {
    const r = G.rules[i], ignored = i >= rv.slots;
    const blk = h("div", { class: "cblk" + (ignored ? " ignored" : "") + (r.off ? " off" : "") + (G.sel === i ? " sel" : ""), "data-rule": i, onclick: () => { G.sel = i; document.querySelectorAll(".cblk.sel").forEach((n) => n.classList.remove("sel")); blk.classList.add("sel"); } },
      h("div", { class: "cblk-top", onpointerdown: (e) => { if (e.target.closest("select,input,button,label")) return; startDrag(e, { kind: "move", i }, blk); } },
        h("span", { class: "n", title: "Drag to reorder" }, i + 1), h("span", { class: "kw" }, i === 0 ? "if" : "else if"),
        h("span", { class: "slot", "data-drop": "cond", "data-i": i }, condBlock(r, i, rv)),
        h("span", { class: "grow" }),
        h("label", { class: "tog", title: "Switch this branch on or off" }, h("input", { type: "checkbox", checked: !r.off, onchange: (e) => { r.off = !e.target.checked; commit(); } }), "on"),
        h("button", { class: "iconbtn", title: "Move up", disabled: i === 0, onclick: (e) => { e.stopPropagation(); [G.rules[i - 1], G.rules[i]] = [G.rules[i], G.rules[i - 1]]; commit(); } }, "↑"),
        h("button", { class: "iconbtn", title: "Move down", disabled: i === G.rules.length - 1, onclick: (e) => { e.stopPropagation(); [G.rules[i + 1], G.rules[i]] = [G.rules[i], G.rules[i + 1]]; commit(); } }, "↓"),
        h("button", { class: "iconbtn", title: "Delete branch", onclick: (e) => { e.stopPropagation(); G.rules.splice(i, 1); G.sel = null; sfx("click"); commit(); } }, "✕")),
      h("div", { class: "cblk-mouth" }, h("span", { class: "slot", "data-drop": "act", "data-i": i }, actBlock(r.action, (v) => { r.action = v; }, rv)), ignored ? h("span", { class: "small dim", style: "margin-left:8px" }, "no free slot: this branch is ignored") : null));
    return blk;
  }

  const EXAMPLE = () => [
    { sensor: "temp", op: "<", value: -45, action: "heat" },
    { sensor: "battery", op: "<", value: 25, action: "charge" },
    { sensor: "slope_ahead", op: ">", value: 17, action: "reroute" },
    { sensor: "storage", op: ">", value: 60, action: "send_data" },
  ];

  // quick "what are my chances" check: replays the sol on 12 different random seeds with the current program
  function updateOdds() {
    const box = $("odds"); if (!box) return; const rv = rover(); if (!rv.ok) { box.innerHTML = "<span class=\"small dim\">Fix the design (over budget) to see your odds.</span>"; return; }
    let goal = 0, alive = 0, sum = 0; const N = 12;
    for (let k = 0; k < N; k++) { const r = MR.simulate(G.design, G.rules, G.mission, { seed: k, elseAction: G.elseAction }); if (r.error) return; goal += r.summary.goal ? 1 : 0; alive += r.summary.alive ? 1 : 0; sum += r.summary.score; }
    const pct = (v) => Math.round((v / N) * 100);
    const row = (label, v) => '<div><div class="small"><span class="dim">' + label + '</span> <b class="mono">' + v + '%</b></div><div class="bar acc"><i style="width:' + v + '%"></i></div></div>';
    box.innerHTML = '<div class="small dim" style="margin-bottom:8px">Odds with this program, over ' + N + ' simulated sols with different luck</div><div class="oddsgrid">' + row("Rover survives", pct(alive)) + row("Reaches the goal", pct(goal)) + '<div><div class="small dim">Average score</div><div class="mono" style="font-size:20px;font-weight:600">' + Math.round(sum / N) + '/100</div></div></div>';
  }

  function drawProgram() {
    const el = $("s-program"); const rv = rover(); const full = G.rules.length >= rv.slots;
    const used = Math.min(G.rules.length, rv.slots);
    const pal = (kind, key, label, cls, locked, need) => {
      const b = h("div", { class: "blk pal " + cls + (locked ? " locked" : ""), title: locked ? need : "Drag into the workspace, or tap to add" }, label, locked ? h("span", { class: "need" }, need) : null);
      if (!locked) b.addEventListener("pointerdown", (e) => { const p = kind === "cond" ? { kind, sensor: key } : { kind, action: key }; startDrag(e, p, b, () => tapPalette(p)); });
      return b;
    };
    const tpl = h("div", { class: "cblk tpl" + (full ? " locked" : ""), title: full ? "All slots used" : "Drag into the workspace, or tap to add" },
      h("div", { class: "cblk-top" }, h("span", { class: "kw" }, "if"), h("span", { class: "slot" }, hexph()), h("span", { class: "kw" }, "then")),
      h("div", { class: "cblk-mouth" }, h("span", { class: "slot" }, actph())));
    if (!full) tpl.addEventListener("pointerdown", (e) => startDrag(e, { kind: "rule" }, tpl, () => tapPalette({ kind: "rule" })));

    const palette = h("div", { class: "palette", "data-drop": "pal" },
      h("div", { class: "pgroup" }, h("h4", {}, "Control"), tpl,
        h("p", { class: "small dim", style: "margin:8px 0 0" }, "Each new block becomes an else if branch. Drop a sensor on the + of a branch to add an and / or part.")),
      h("div", { class: "pgroup" }, h("h4", {}, "Sensors"), h("div", { class: "pblocks" },
        Object.entries(MR.SENSORS).map(([k, s]) => { const has = rv.sensors.has(k); return pal("cond", k, s.label, "cond", !has, needText(MR.SENSOR_NEEDS, k)); }))),
      h("div", { class: "pgroup" }, h("h4", {}, "Actions"), h("div", { class: "pblocks" },
        Object.entries(MR.ACTIONS).map(([k, a]) => { const has = rv.actions.has(k); return pal("act", k, a.label, "act", !has, needText(MR.ACTION_NEEDS, k)); }))));

    const elseArm = h("div", { class: "cblk else", id: "elseblk" },
      h("div", { class: "cblk-top" }, h("span", { class: "n" }, "·"), h("span", { class: "kw" }, "else"), h("span", { class: "small", style: "font-weight:500" }, "(none of the above is true)")),
      h("div", { class: "cblk-mouth" }, h("span", { class: "slot", "data-drop": "elseact" }, actBlock(G.elseAction, (v) => { G.elseAction = v; }, rv))));

    const ws = h("div", { class: "ws", id: "ws", "data-drop": "ws" },
      h("div", { class: "hat" }, "Every step, run the first branch that is true"),
      G.rules.length ? null : h("p", { class: "dim wsempty" }, "Drag an IF block here, then drop a sensor and an action into it. With no branches the rover always does the else action."),
      h("div", { class: "chain", id: "chain" }, G.rules.map((_, i) => ruleBlock(i, rv)), elseArm));

    el.replaceChildren(
      h("div", { class: "hint" }, h("b", {}, "This is one if / else if / else block, like in Scratch. "), "The rover checks the branches from the top, runs the first one whose condition is true and skips the rest. If none is true it does the else action. Join conditions with and / or, flip one with not. Drag a branch by its number to reorder it, or drag it left to delete it."),
      h("div", { class: "prog" }, palette,
        h("div", {},
          h("div", { class: "card" },
            h("div", { class: "wshead" }, h("h2", {}, "Your program"), h("span", { class: "small dim mono" }, `${used} of ${rv.slots} branches`)),
            h("div", { class: "odds", id: "odds" }),
            ws,
            h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin-top:16px" },
              h("button", { class: "btn", onclick: () => { sfx("snap"); G.rules = EXAMPLE().filter((r) => rv.sensors.has(r.sensor) && rv.actions.has(r.action)).slice(0, rv.slots); G.elseAction = "follow_plan"; G.sel = null; commit(); } }, "Load example"),
              h("button", { class: "btn", disabled: !G.rules.length || !rv.ok, title: "Replays the sol with 8 different random seeds and nudges your thresholds. It is search, not a trained model.", onclick: () => {
                say("Co-pilot is trying thousands of numbers…");
                setTimeout(() => {
                  const out = MR.autoTune(G.design, G.rules, G.mission, { iterations: 150, seeds: 8, elseAction: G.elseAction });
                  G.rules = out.rules; G.result = null; save(); drawProgram(); sfx("ok");
                  say(`Co-pilot result: average score ${out.before.score.toFixed(0)} → ${out.after.score.toFixed(0)} over 8 simulated sols. It only tuned the numbers, not your logic.`);
                }, 30);
              } }, "Auto-tune thresholds"),
              h("button", { class: "btn ghost", onclick: () => { G.rules = []; G.elseAction = "follow_plan"; G.sel = null; commit(); } }, "Clear")),
            h("p", { class: "small dim", id: "tuneMsg", style: "margin-top:8px" })),
          h("p", { style: "margin-top:16px" }, h("button", { class: "btn primary big", disabled: !rv.ok, onclick: () => { sfx("launch"); go("run"); } }, "Uplink and run the sol  →")))));
    setTimeout(updateOdds, 20);
  }

  // ---- 4. run / replay ------------------------------------------------------
  let terrainCanvas = null;
  function renderTerrain() {
    if (terrainCanvas) return terrainCanvas;
    const c = document.createElement("canvas"); c.width = T.w * PX; c.height = T.h * PX; const g = c.getContext("2d");
    let lo = Infinity, hi = -Infinity; for (const e of T.elev) { lo = Math.min(lo, e); hi = Math.max(hi, e); }
    const E = (x, y) => T.elevAt(Math.min(T.w - 1, Math.max(0, x)), Math.min(T.h - 1, Math.max(0, y)));
    for (let y = 0; y < T.h; y++) for (let x = 0; x < T.w; x++) {
      const t = (T.elevAt(x, y) - lo) / (hi - lo);
      const sh = Math.min(1.4, Math.max(0.5, 0.9 + (0.9 * ((E(x - 1, y) - E(x + 1, y)) + (E(x, y - 1) - E(x, y + 1)))) / (2 * T.cellM)));
      const r = (105 + 140 * t) * sh, gg = (66 + 100 * t) * sh, b = (48 + 66 * t) * sh;
      g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`; g.fillRect(x * PX, y * PX, PX, PX);
      const ty = T.typeAt(x, y), s = T.slopeAt(x, y);
      if (ty === MR.TYPE.SAND) { g.fillStyle = "rgba(240,210,120,.28)"; g.fillRect(x * PX, y * PX, PX, PX); }
      else if (ty === MR.TYPE.ROCK) { g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x * PX, y * PX, PX, PX); }
      if (s > 22) { g.fillStyle = "rgba(235,50,50,.55)"; g.fillRect(x * PX, y * PX, PX, PX); }
      else if (s > 17) { g.fillStyle = "rgba(255,150,40,.35)"; g.fillRect(x * PX, y * PX, PX, PX); }
    }
    return (terrainCanvas = c);
  }
  const cx = (x) => (x + 0.5) * PX, cy = (y) => (y + 0.5) * PX;

  function drawRun() {
    const el = $("s-run"); const rv = rover();
    if (!rv.ok) { el.replaceChildren(h("p", {}, "Fix the design first: " + rv.errors.join(". "))); return; }
    G.result = MR.simulate(G.design, G.rules, G.mission, { seed: 0, elseAction: G.elseAction });
    G.idx = 0; G.acc = 0; G.logged = -1; G.playing = false; G.lastTs = 0; G.fxDone = false;
    const m = G.mission;
    const canvas = h("canvas", { id: "map", width: T.w * PX, height: T.h * PX });
    const chart = h("canvas", { id: "chart", width: T.w * PX, height: 120 });
    const hud = h("div", { class: "hud", id: "hud" });
    const launch = h("div", { class: "launch", id: "launch" }, h("div", { class: "ln", id: "l1" }), h("div", { class: "ln", id: "l2" }), h("div", { class: "ln", id: "l3" }), h("div", { class: "ln", id: "l4" }), h("div", { class: "pg" }, h("i", { id: "lpg" })), h("div", { class: "ln dimline", id: "lfact" }),
      h("div", { style: "margin-top:14px" }, h("button", { class: "btn small", onclick: () => endLaunch() }, "Skip ▶")));
    el.replaceChildren(
      h("div", { class: "runwrap" },
        h("div", {}, h("div", { class: "mapwrap", id: "mapwrap" }, canvas, h("div", { class: "vig", id: "vig" }), h("div", { class: "callout", id: "callout" }), h("div", { class: "toasts", id: "toasts" }), launch), h("div", { style: "height:8px" }), chart,
          h("p", { class: "small dim" }, "Real USGS elevation of Jezero crater (each cell ≈ 320 m, distances compressed). Orange/red = steep, yellow = soft sand. White dashed line = the ground team's planned route.")),
        h("div", {},
          h("div", { class: "card" }, h("h3", {}, `${G.name} on ${m.title}`),
            h("div", { class: "clock", id: "clock" }),
            h("div", { style: "height:8px" }), hud,
            h("p", { id: "why", class: "small", style: "min-height:2.8em" }),
            h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" },
              h("button", { class: "btn", id: "pp", onclick: () => { if (G.idx >= G.result.trace.length - 1) { G.idx = 0; G.logged = -1; G.fxDone = false; } G.playing = !G.playing; G.lastTs = 0; } }, "Pause"),
              h("select", { id: "spd", onchange: (e) => { G.speed = +e.target.value; } }, [1, 2, 4].map((s) => h("option", { value: s, selected: s === G.speed }, s + "×"))),
              h("button", { class: "btn", id: "camBtn", title: "Switch between following the rover and the whole map", onclick: () => { G.cam = !G.cam; $("camBtn").textContent = G.cam ? "Overview" : "Follow"; paint(performance.now()); } }, G.cam ? "Overview" : "Follow"),
              h("input", { type: "range", id: "scrub", min: 0, max: G.result.trace.length - 1, value: 0, style: "flex:1;min-width:120px", oninput: (e) => { G.playing = false; G.idx = +e.target.value; paint(performance.now()); } }))),
          h("div", { style: "height:10px" }),
          h("div", { class: "card livep" }, h("h3", {}, "Your program, live"),
            G.rules.length ? G.rules.map((r, i) => h("div", { class: "lr" + (i >= rover().slots || r.off ? " idle" : ""), "data-i": i }, h("span", { class: "n" }, i + 1), (i === 0 ? "" : "else ") + MR.describeRule(r).toLowerCase())) : null,
            h("div", { class: "lr else", id: "lelse" }, h("span", { class: "n" }, "·"), "else " + (MR.ACTIONS[G.elseAction] ? MR.ACTIONS[G.elseAction].label.toLowerCase() : "follow the plan"))),
          h("div", { style: "height:10px" }),
          h("div", { class: "log", id: "log" }),
          h("div", { id: "debrief", style: "margin-top:10px" })),
      ));
    const id = (G.loopId = (G.loopId || 0) + 1);
    runLaunch(id);
    requestAnimationFrame((t) => loop(t, id));
  }

  // short "uplink" sequence so the player feels the send-up moment
  let launchTimers = [];
  function runLaunch(id) {
    launchTimers.forEach(clearTimeout); launchTimers = [];
    const nR = Math.min(G.rules.length, rover().slots);
    const fact = $("lfact"); if (fact) fact.textContent = "Did you know? " + FACTS[Math.floor(Math.random() * FACTS.length)];
    const lines = ["> PACKAGING ROVER PROGRAM…", `> ${nR} RULE${nR === 1 ? "" : "S"} COMPILED · HARDWARE CHECK OK`, `> UPLINK TO MARS (one-way delay ${C.SIGNAL_DELAY_MIN[0]}-${C.SIGNAL_DELAY_MIN[1]} min, skipped for the game)`, "> ROVER ONLINE. YOU CANNOT CHANGE ANYTHING NOW."];
    lines.forEach((t, k) => launchTimers.push(setTimeout(() => { if (G.loopId !== id) return; const n = $("l" + (k + 1)); if (n) n.textContent = t; const p = $("lpg"); if (p) p.style.width = ((k + 1) / lines.length) * 100 + "%"; sfx("click"); }, 350 + k * 650)));
    launchTimers.push(setTimeout(() => { if (G.loopId === id) endLaunch(); }, 350 + lines.length * 650 + 300));
  }
  function endLaunch() { launchTimers.forEach(clearTimeout); launchTimers = []; const l = $("launch"); if (!l || !l.isConnected) return; l.remove(); sfx("launch"); G.playing = true; G.lastTs = 0; }

  function ruleText(step) {
    if (step.action === "dormant") return "The rover is dormant: battery empty, rules cannot run.";
    if (step.action === "stuck") return "Stuck in sand: waiting to free the wheels.";
    if (step.rule >= 0) return `Rule ${step.rule + 1} fired: ${MR.describeRule(G.rules[step.rule])}`;
    return "No branch was true: else, " + (MR.ACTIONS[G.elseAction] ? MR.ACTIONS[G.elseAction].label.toLowerCase() : "follow the plan") + ".";
  }

  let calloutTimer = 0;
  function callout(text) {
    const c = $("callout"); if (!c) return;
    c.textContent = text; c.classList.remove("show"); void c.offsetWidth; c.classList.add("show");
    clearTimeout(calloutTimer); calloutTimer = setTimeout(() => c.classList.remove("show"), 3200); sfx("bad");
  }
  function toast(text, cls) {
    const box = $("toasts"); if (!box) return;
    const t = h("div", { class: "toast " + cls }, text); box.append(t); setTimeout(() => t.remove(), 4100);
    while (box.childElementCount > 4) box.firstChild.remove();
  }

  function paint(now) {
    const R = G.result; if (!R) return; const tr = R.trace;
    const i = Math.min(G.idx, tr.length - 1), fl = Math.floor(i), a = tr[fl], b = tr[Math.min(tr.length - 1, fl + 1)], f = i - fl;
    const m = G.mission;
    const canvas = $("map"); if (!canvas) return; const g = canvas.getContext("2d");
    // follow camera: zoom in on the rover so the little rover feels like a character, not a dot
    const px = cx(a.x + (b.x - a.x) * f), py = cy(a.y + (b.y - a.y) * f);
    const Z = G.cam ? 2.4 : 1;
    const tx = G.cam ? Math.min(0, Math.max(canvas.width * (1 - Z), canvas.width / 2 - px * Z)) : 0, ty = G.cam ? Math.min(0, Math.max(canvas.height * (1 - Z), canvas.height / 2 - py * Z)) : 0;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#000"; g.fillRect(0, 0, canvas.width, canvas.height);
    g.save(); g.translate(tx, ty); g.scale(Z, Z);
    g.drawImage(renderTerrain(), 0, 0);
    // planned route
    g.strokeStyle = "rgba(255,255,255,.7)"; g.setLineDash([4, 4]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx(m.start[0]), cy(m.start[1]));
    for (const [x, y] of R.plan) g.lineTo(cx(x), cy(y)); g.stroke(); g.setLineDash([]);
    // trail (fades toward the past)
    g.lineCap = "round";
    for (let k = 1; k <= fl; k++) { g.strokeStyle = `rgba(86,182,232,${0.25 + 0.75 * (k / (fl + 1))})`; g.lineWidth = 3; g.beginPath(); g.moveTo(cx(tr[k - 1].x), cy(tr[k - 1].y)); g.lineTo(cx(tr[k].x), cy(tr[k].y)); g.stroke(); }
    // start, sample and goal markers
    g.fillStyle = "#6fcf97"; g.beginPath(); g.arc(cx(m.start[0]), cy(m.start[1]), 5, 0, 7); g.fill();
    const pulse = 8 + 3 * Math.sin(now / 280);
    g.strokeStyle = "#f2c94c"; g.lineWidth = 2.5; g.beginPath(); g.arc(cx(m.goal[0]), cy(m.goal[1]), pulse, 0, 7); g.stroke();
    g.strokeStyle = "rgba(242,201,76,.4)"; g.beginPath(); g.arc(cx(m.goal[0]), cy(m.goal[1]), pulse + 7, 0, 7); g.stroke();
    g.fillStyle = "#f2c94c"; g.font = `bold ${11 / Z}px sans-serif`; g.fillText("GOAL / SAMPLE", cx(m.goal[0]) - 34 / Z, cy(m.goal[1]) - 20 / Z);
    // rover sprite, turned toward where it is heading
    const rx = px, ry = py;
    const dx = b.x - a.x, dy = b.y - a.y; if (dx || dy) G.ang = Math.atan2(dy, dx);
    if (a.sun <= 0) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "rgba(5,10,40,.4)"; g.fillRect(0, 0, canvas.width, canvas.height); g.restore(); }
    MR.drawRoverSprite(g, G.design, rx, ry, G.cam ? 1.1 : 1.9, G.ang, { dead: a.dead, dormant: a.dormant, heating: a.action === "heat" });
    if (a.action === "charge" || a.sun > 0.4 && !a.dormant) { g.strokeStyle = `rgba(255,230,120,${0.2 + 0.2 * Math.sin(now / 200)})`; g.lineWidth = 1; g.beginPath(); g.arc(rx, ry, 14 + 2 * Math.sin(now / 200), 0, 7); g.stroke(); }
    g.restore();
    // dust storm: drifting grit streaks plus a haze (screen space)
    if (a.dust > 0.15) {
      g.fillStyle = `rgba(190,120,60,${Math.min(0.55, a.dust * 0.55)})`; g.fillRect(0, 0, canvas.width, canvas.height);
      g.strokeStyle = `rgba(240,200,150,${Math.min(0.5, a.dust)})`; g.lineWidth = 1; const n = Math.floor(a.dust * 90);
      for (let k = 0; k < n; k++) { const sx = ((k * 97 + now * (0.12 + (k % 5) * 0.05)) % (canvas.width + 60)) - 30, sy = (k * 53) % canvas.height; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 14, sy + 3); g.stroke(); }
    }
    const sxr = rx * Z + tx, syr = ry * Z + ty;
    const says = a.dead || a.dormant ? "" : a.notes.some((n) => /rolled/.test(n)) ? "aaah!" : a.notes.some((n) => /struck/.test(n)) ? "ouch!" : a.notes.some((n) => /Goal reached/.test(n)) ? "got it!"
      : { stuck: "stuck!", heat: "brr...", charge: "charging", take_photo: "snap!", send_data: "beep boop", drill: "drilling", slow_down: "careful...", reroute: "hmm, a detour" }[a.action] || "";
    if (says) {
      g.font = "12px system-ui,sans-serif"; const w = g.measureText(says).width + 16, bx = Math.max(4, Math.min(canvas.width - w - 4, sxr - w / 2)), by = Math.max(4, syr - 46);
      g.fillStyle = "rgba(18,18,18,.92)"; g.strokeStyle = "#e0703f"; g.lineWidth = 1; g.beginPath(); g.roundRect(bx, by, w, 22, 6); g.fill(); g.stroke();
      g.fillStyle = "#e8e8e8"; g.fillText(says, bx + 8, by + 15);
    }
    if (a.dead) { g.fillStyle = "#ff8a5c"; g.font = "bold 16px sans-serif"; g.fillText("SIGNAL LOST", sxr + 22, syr - 6); }
    if (a.dormant && !a.dead) { g.fillStyle = "#ddd"; g.font = "bold 12px sans-serif"; g.fillText("DORMANT: battery empty", sxr + 22, syr - 6); }
    // live program: highlight the rule that is driving the rover right now
    document.querySelectorAll(".lr").forEach((n) => n.classList.toggle("live", +n.dataset.i === a.rule));
    const le = $("lelse"); if (le) le.classList.toggle("live", a.rule < 0);

    const col = (v, lo, hi) => (v < lo ? "var(--bad)" : v < hi ? "var(--warn)" : "var(--ok)");
    const cell = (label, v, c, pct, crit) => `<div class="m${crit ? " crit" : ""}"><div class="small dim">${label}</div><div class="v" style="color:${c || "inherit"}">${v}</div>${pct == null ? "" : `<div class="bar"><i style="width:${Math.max(0, Math.min(100, pct))}%;background:${c}"></i></div>`}</div>`;
    const hr = Math.floor(a.hour), mn = Math.floor((a.hour - hr) * 60);
    const phase = a.sun > 0.05 ? "DAY" : "☾ NIGHT";
    $("clock").textContent = `SOL 1 · ${String(hr).padStart(2, "0")}:${String(mn).padStart(2, "0")} · ${phase} · STEP ${a.t + 1}/${tr.length}`;
    $("hud").innerHTML =
      cell("Battery", a.battPct.toFixed(0) + "%", col(a.battPct, 15, 35), a.battPct, a.battPct < 10) +
      cell("Temperature", a.temp.toFixed(0) + " °C", a.temp < -45 ? "var(--bad)" : a.temp < -35 ? "var(--warn)" : "var(--ok)", ((a.temp + 80) / 80) * 100, a.temp < -45) +
      cell("Wheels", a.wheel.toFixed(0) + "%", col(a.wheel, 25, 60), a.wheel) +
      cell("Storage", a.storage.toFixed(0) + "%", "var(--blue)", a.storage) +
      cell("Sunlight", (a.sun * 100).toFixed(0) + "%", "var(--warn)", a.sun * 100) +
      cell("Dust", (a.dust * 100).toFixed(0) + "%", a.dust > 0.5 ? "var(--bad)" : a.dust > 0.2 ? "var(--warn)" : "var(--ok)", a.dust * 100);
    $("why").textContent = ruleText(a);
    $("scrub").value = fl;
    $("pp").textContent = G.playing ? "Pause" : G.idx >= tr.length - 1 ? "Replay" : "Play";
    drawChart(tr, fl);
    // log + toasts (scrubbing backwards rebuilds the log)
    const log = $("log");
    if (G.logged > fl) { log.replaceChildren(); G.logged = -1; }
    for (let k = G.logged + 1; k <= fl; k++) {
      const s = tr[k];
      for (const n of s.notes) {
        const bad = /rolled|froze|stuck|empty|worn|struck|gust|cold|lost/i.test(n), ok = /goal|sample|sent|taken|recovered/i.test(n);
        log.append(h("div", { class: bad ? "bad" : ok ? "ok" : "" }, `[${String(Math.floor(s.hour)).padStart(2, "0")}:${String(Math.floor((s.hour % 1) * 60)).padStart(2, "0")}] ${n}`));
        if (G.playing) { toast((bad ? "⚠ " : ok ? "✔ " : "ℹ ") + n, bad ? "bad" : ok ? "ok" : "info"); sfx(bad ? "bad" : ok ? "ok" : "click"); }
      }
      if (G.playing && k > 0) {
        const p = tr[k - 1];
        if (p.dust < 0.4 && s.dust >= 0.4) callout("Dust storm closing in. Solar power is collapsing.");
        else if (p.sun > 0.05 && s.sun <= 0.05) callout("Sunset. Temperature is falling toward -70 °C.");
        else if (p.sun <= 0.05 && s.sun > 0.05) callout("Sunrise. The panels are charging again.");
        else if (p.battPct >= 20 && s.battPct < 20) callout("Battery below 20%.");
        else if (p.temp > -45 && s.temp <= -45) callout("Electronics are getting dangerously cold.");
      }
      if (G.playing && k > 0 && s.rule >= 0 && s.rule !== tr[k - 1].rule) toast(`Rule ${s.rule + 1} took over: ${MR.describeRule(G.rules[s.rule])}`, "info");
      G.logged = k;
    }
    log.scrollTop = log.scrollHeight;
    if (fl >= tr.length - 1 || a.dead) showDebrief(); else { $("debrief").replaceChildren(); $("vig") && $("vig").classList.remove("on"); }
  }

  function drawChart(tr, upto) {
    const c = $("chart"); if (!c) return; const g = c.getContext("2d"); const W = c.width, H = c.height;
    g.fillStyle = "#0c0806"; g.fillRect(0, 0, W, H);
    const X = (k) => (k / (C.STEPS_PER_SOL - 1)) * (W - 8) + 4;
    for (let k = 0; k < tr.length; k++) { g.fillStyle = `rgba(242,201,76,${0.05 + 0.25 * tr[k].sun})`; g.fillRect(X(k), 0, W / C.STEPS_PER_SOL + 1, H); }
    const line = (fn, color, lo, hi) => { g.strokeStyle = color; g.lineWidth = 2; g.beginPath(); for (let k = 0; k <= upto; k++) { const y = H - 6 - ((fn(tr[k]) - lo) / (hi - lo)) * (H - 12); k ? g.lineTo(X(k), y) : g.moveTo(X(k), y); } g.stroke(); };
    line((s) => s.battPct, "#6fe39b", 0, 100); line((s) => s.temp, "#56b6e8", -80, 0);
    const yf = H - 6 - ((C.TEMP_FAIL_C + 80) / 80) * (H - 12); g.strokeStyle = "rgba(235,87,87,.6)"; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(0, yf); g.lineTo(W, yf); g.stroke(); g.setLineDash([]);
    g.fillStyle = "#b09a8a"; g.font = "11px sans-serif"; g.fillText("green: battery %   blue: temperature (red line = electronics fail)   yellow: daylight", 6, 12);
    g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(X(upto), 0); g.lineTo(X(upto), H); g.stroke();
  }

  function confetti() {
    const cols = ["#ff7a3d", "#ffb347", "#6fe39b", "#56b6e8", "#b79cff", "#f2c94c"];
    for (let k = 0; k < 70; k++) { const c = h("div", { class: "conf", style: `left:${Math.random() * 100}vw;background:${cols[k % cols.length]};animation-duration:${2 + Math.random() * 2.5}s;animation-delay:${Math.random() * 0.8}s` }); document.body.append(c); setTimeout(() => c.remove(), 5500); }
  }

  function showDebrief() {
    const R = G.result, s = R.summary; const box = $("debrief"); if (box.childElementCount) return;
    const cls = s.outcome === "success" ? "win" : s.outcome === "lost" ? "lose" : "mid";
    const title = { success: `Mission complete: ${G.name} made it`, lost: `${G.name} was lost`, incomplete: `${G.name} survived, but did not reach the goal` }[s.outcome];
    const objs = (OBJ[G.mission.id] || []).map(([label, test]) => [label, !!test(R, R.trace)]);
    const was = objDone[G.mission.id] || [];
    objDone[G.mission.id] = objs.map(([, ok], k) => ok || !!was[k]); store.set("roverRules.obj", objDone);
    const ctx = { R, s, tr: R.trace, id: G.mission.id, win: s.outcome === "success" };
    const fresh = BADGES.filter((b) => !badgesGot.includes(b[0]) && b[3](ctx));
    fresh.forEach((b) => badgesGot.push(b[0])); if (fresh.length) store.set("roverRules.badges", badgesGot);
    const n = stars(s.score);
    const fires = Object.entries(s.ruleFires);
    const prev = best[G.mission.id];
    if (prev == null || s.score > prev) { best[G.mission.id] = s.score; store.set("roverRules.best", best); }
    if (!G.fxDone) {
      G.fxDone = true;
      if (s.outcome === "success") { confetti(); sfx("win"); } else if (s.outcome === "lost") { $("mapwrap").classList.remove("shake"); void $("mapwrap").offsetWidth; $("mapwrap").classList.add("shake"); $("vig").classList.add("on"); sfx("lose"); } else sfx("bad");
    }
    const nextStar = [40, 70, 90].find((t) => s.score < t);
    box.replaceChildren(
      h("div", { class: "banner " + cls }, title),
      prev == null || s.score > prev ? h("p", { class: "small", style: "color:var(--accent-hi);margin:0 0 8px" }, prev == null ? "First result recorded." : `New personal best (was ${prev}).`) : null,
      nextStar ? h("p", { class: "small dim", style: "margin:0 0 8px" }, `${nextStar - s.score} more points for the next star.`) : null,
      h("div", { class: "stars" }, [0, 1, 2].map((k) => h("span", { style: `animation-delay:${0.3 + k * 0.25}s;${k < n ? "" : "opacity:.25"}` }, "★"))),
      h("div", { class: "score-row" },
        h("div", { class: "m" }, h("div", { class: "small dim" }, "Score"), h("div", { class: "v" }, s.score + "/100")),
        h("div", { class: "m" }, h("div", { class: "small dim" }, "Science sent home"), h("div", { class: "v" }, s.science)),
        h("div", { class: "m" }, h("div", { class: "small dim" }, "Best"), h("div", { class: "v" }, (best[G.mission.id] || 0) + "/100"))),
      h("h4", { class: "objh" }, `Bonus objectives: ${objs.filter(([, ok]) => ok).length} of ${objs.length}`),
      h("ul", { class: "objs" }, objs.map(([label, ok]) => h("li", { class: ok ? "done" : "" }, label))),
      fresh.length ? h("div", { class: "newbadges" }, fresh.map((b) => h("div", { class: "badge" }, h("b", {}, "New badge: " + b[1]), h("span", { class: "small dim" }, " " + b[2])))) : null,
      h("p", {}, h("b", {}, "The science behind it. "), s.explanation),
      h("p", { class: "small" }, "Only data you send home counts: photos and samples sitting in storage are lost if the rover dies."),
      h("p", { class: "small" }, h("b", {}, "Rules that fired: "), fires.length ? fires.map(([i, k]) => `rule ${+i + 1} (${k}×)`).join(", ") : "none. Everything was the default plan."),
      h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" },
        h("button", { class: "btn primary", onclick: () => go("program") }, "Fix my rules"),
        h("button", { class: "btn", onclick: () => go("design") }, "Change the design"),
        h("button", { class: "btn", onclick: () => go("mission") }, "Other mission")));
  }

  function loop(ts, id) {
    if (G.screen !== "run" || !G.result || id !== G.loopId) return;
    if (G.playing) {
      if (G.lastTs) G.acc += ((ts - G.lastTs) / (20000 / C.STEPS_PER_SOL)) * G.speed;
      G.lastTs = ts;
      const last = G.result.trace.length - 1;
      G.idx = Math.min(last, G.idx + G.acc); G.acc = 0;
      if (G.idx >= last) G.playing = false;
    }
    paint(ts);
    requestAnimationFrame((t) => loop(t, id));
  }

  // ---- science & sources ----------------------------------------------------
  $("aboutBtn").onclick = () => {
    const d = $("about");
    d.replaceChildren(
      h("h2", {}, "Science behind the game"),
      h("p", {}, "The terrain is real. Elevation comes from the ", h("a", { href: T.url, target: "_blank", rel: "noopener" }, "USGS Astrogeology Mars 2020 CTX DTM mosaic"), " of Jezero crater (20 m per pixel). We computed slopes from it ourselves. Terrain types (regolith, sand, rock) are a simple heuristic from slope and roughness, informed by NASA's AI4Mars rover-image labels but not trained on them."),
      h("p", {}, h("b", {}, "Autonomy: "), "the rover uses your rules plus A* path planning on a terrain-cost map. That is rule-based autonomous navigation, not a trained AI model. The co-pilot button is a hill-climbing search over your thresholds."),
      h("p", {}, h("b", {}, "Honest simplifications: "), "distances are compressed (one cell is about 320 m and a sol takes 96 steps), power and wear numbers are game-balance values, and rover physics is much simpler than reality."),
      h("table", {}, h("tr", {}, h("th", {}, "Number"), h("th", {}, "Value"), h("th", {}, "Source / status")),
        ...Object.entries(MR.SOURCES).map(([k, v]) => h("tr", {}, h("td", {}, k), h("td", {}, k in C ? JSON.stringify(C[k]) : ""), h("td", {}, (v.verified ? "verified: " : "NEEDS HUMAN CHECK: ") + v.note)))),
      h("p", { class: "small dim" }, "AI use: this project's code was written with an AI assistant (Claude) and tested by the team. See the submission's AI-use statement."),
      h("p", {}, h("button", { class: "btn", onclick: () => d.close() }, "Close")));
    d.showModal();
  };

  const hs = location.hash.slice(1);
  go(SCREENS.some(([id]) => id === hs) ? hs : G.screen);
})();
