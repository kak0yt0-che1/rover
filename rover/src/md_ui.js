// Mission Design UI. Reads the model in md_model.js; draws no game logic of its own.
(function () {
  const MD = globalThis.MR.MD, app = document.getElementById("app");
  const store = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: the game still works */ }
    },
  };
  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") el.className = v; else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else if (k.startsWith("aria-") && typeof v === "boolean") el.setAttribute(k, String(v)); else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  };

  const G = { mode: "mission", compN: 2, compNames: ["Team 1", "Team 2", "Team 3", "Team 4"], comp: null, delta: null, shareUrl: "", note: "", cmpSel: new Set(), phase: "setup", players: 1, role: "all", approved: new Set(), result: null, design: MD.defaultDesign("coast"), team: "Team Pathfinder" };
  const saved = store.get("md.design", null);
  if (saved && MD.SCENARIOS[saved.scenario]) G.design = Object.assign(MD.defaultDesign(saved.scenario), saved);
  const persist = () => store.set("md.design", G.design);
  // a share link (#d=...) opens the design it carries, after checking every part exists
  if (/^#d=/.test(location.hash)) {
    const dd = MD.decode(decodeURIComponent(location.hash.slice(3)));
    if (dd) { G.design = dd; G.phase = "build"; G.note = "Opened from a share link. You can change anything."; } else G.note = "That share link is not valid, so it was ignored.";
  }

  // short "why does this matter" lines, one per resource
  const WHY = {
    mass: "Every kilogram has to be lifted. The rocket can only carry so much to this orbit.",
    power: "Solar cells make power only in sunlight. The battery covers the dark part of each orbit.",
    budget: "Hardware and launch share one budget. A cheaper rocket may fly later or less reliably.",
    data: "Instruments produce data every day. Storage on board is limited.",
    comms: "Data only counts when it reaches the ground: contact time times radio speed.",
    time: "The launch window closes. Complex builds and busy rockets take longer.",
  };
  const clampPct = (x) => Math.max(0, Math.min(100, x));

  // ------------ short guided tour (5 steps, skippable, remembered) ------------
  const TOUR = [
    ["Six limits", "Every mission is a balance of six limits: mass, power, budget, data, communications and time. The dashboard on the right shows all six. A small orange tag marks the ones that matter most in this mission."],
    ["Why the orbit changes the mass limit", "A rocket can lift less mass to a higher or farther orbit. Choose the rocket and the orbit first, then read the Mass bar: that is the kilograms your spacecraft may weigh."],
    ["What a data rate is", "Data only counts when it reaches the ground. How much you can send per day is the radio speed times the minutes you can see a ground station. A camera makes a lot of data, so a slow radio will fall behind."],
    ["Power and the battery", "Solar cells only work in sunlight. In the dark part of each orbit (eclipse) the battery runs the spacecraft. Bigger panels and batteries cost mass, money and build time."],
    ["Teams, scores and trying again", "Up to four players can each own some choices. The score rewards finishing the mission, science, using your limits well, good decisions and teamwork. After launch, read why it went that way, then redesign."],
  ];
  G.tour = store.get("md.tourDone", false) ? null : 0;
  function tourCard() {
    if (G.tour == null) return null;
    const [t, body] = TOUR[G.tour], last = G.tour === TOUR.length - 1;
    const end = () => { G.tour = null; store.set("md.tourDone", true); render(true); };
    return h("section", { class: "card tour", "aria-label": "Quick tour" },
      h("p", { class: "dim small" }, `Quick tour, step ${G.tour + 1} of ${TOUR.length}`), h("h3", {}, t), h("p", {}, body),
      h("div", { class: "row-actions" }, h("button", { class: "btn primary", onclick: () => { last ? end() : (G.tour++, render(true)); } }, last ? "Done" : "Next"), h("button", { class: "btn ghost", onclick: end }, "Skip the tour")));
  }

  function setPhase(p) { G.phase = p; render(); window.scrollTo(0, 0); const t = app.querySelector("h1"); if (t) { t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); } }
  function startDesigning() {
    G.approved.clear(); G.delta = null; G.note = "";
    if (G.mode === "comp") {
      const df = G.design.difficulty; G.design = MD.defaultDesign(G.design.scenario); G.design.difficulty = df;
      G.players = 1; G.role = "all"; G.comp = { idx: 0, seed: 1000 + Math.floor(Math.random() * 9000), entries: [] };
    } else if (G.mode === "sandbox") { G.players = 1; G.role = "all"; }
    else G.role = G.players === 1 ? "all" : Object.keys(MD.ROLES)[0];
    setPhase("build");
  }
  function setD(k, v) { G.design[k] = v; G.approved.clear(); persist(); render(true); }

  // ------------ setup ------------
  function setup() {
    const sc = G.design.scenario;
    return h("div", {},
      h("h1", {}, "Design a space mission"),
      h("p", { class: "dim" }, "You will pick a mission, build a small spacecraft, choose a rocket and an orbit, and watch a 30-day mission with surprises. Then you redesign and try again. All numbers are a simplified teaching model."),
      h("div", { class: "grp" }, h("h3", {}, "1. Choose a mission"),
        h("div", { class: "sgrid" }, Object.entries(MD.SCENARIOS).map(([id, s]) =>
          h("button", { class: "pick", "aria-pressed": sc === id, onclick: () => { G.design = MD.defaultDesign(id); G.design.difficulty = G.design.difficulty; persist(); render(); } },
            h("b", {}, s.title), s.blurb, h("span", { class: "nums" }, "Critical: " + s.critical.join(" and ")), h("span", { class: "nums" }, s.objective))))),
      h("div", { class: "grp" }, h("h3", {}, "2. Difficulty"),
        h("div", { class: "chips" }, Object.entries(MD.DIFFICULTY).map(([id, d]) =>
          h("button", { class: "pick", "aria-pressed": G.design.difficulty === id, onclick: () => { G.design.difficulty = id; persist(); render(); } }, h("b", {}, d.name),
            h("span", { class: "nums" }, `budget x${d.budget}, deadline x${d.weeks}, events x${d.events}`)))),
        h("p", { class: "why" }, "Harder games have less money, less time and more surprises. There is no single perfect design at any level.")),
      h("div", { class: "grp" }, h("h3", {}, "3. Mode"),
        h("div", { class: "chips" }, [["mission", "Scored mission"], ["sandbox", "Sandbox (unscored)"], ["comp", "Team competition"]].map(([id, name]) =>
          h("button", { class: "pick", "aria-pressed": G.mode === id, onclick: () => { G.mode = id; if (id !== "mission") { G.players = 1; G.role = "all"; } render(); } }, h("b", {}, name)))),
        h("p", { class: "why" }, { mission: "Limits are enforced and the mission is scored. Play solo or in a team with roles.", sandbox: "Free experiments: every part is open and limits only warn. Nothing is scored, so try wild ideas and see what breaks.", comp: "Two to four teams each design their own spacecraft for the same mission, one after another. Everyone gets the same random events. The best score wins." }[G.mode]),
        G.mode === "comp" ? h("div", {}, h("div", { class: "chips" }, [2, 3, 4].map((n) => h("button", { class: "pick", "aria-pressed": G.compN === n, onclick: () => { G.compN = n; render(); } }, n + " teams"))),
          h("p", {}, G.compNames.slice(0, G.compN).map((nm, i) => h("label", { style: "margin-right:16px" }, `Team ${i + 1} name `, h("input", { class: "txt", value: nm, maxlength: 20, oninput: (e) => { G.compNames[i] = e.target.value || "Team " + (i + 1); } }))))) : null),
      G.mode !== "mission" ? null : h("div", { class: "grp" }, h("h3", {}, "4. Players"),
        h("div", { class: "chips" }, [1, 2, 3, 4].map((n) => h("button", { class: "pick", "aria-pressed": G.players === n, onclick: () => { G.players = n; G.role = n === 1 ? "all" : Object.keys(MD.ROLES)[0]; render(); } }, n === 1 ? "Solo" : n + " players"))),
        h("p", { class: "why" }, G.players === 1 ? "You hold every role." : "Pass the screen around. Each person owns some choices (a role) and the launch needs every role to approve. Talk it out: your choices change each other's numbers."),
        G.players > 1 ? h("p", {}, h("label", {}, "Team name ", h("input", { class: "txt", value: G.team, maxlength: 24, oninput: (e) => { G.team = e.target.value; } }))) : null),
      h("div", { class: "scenario-brief hint" }, h("b", {}, MD.SCENARIOS[sc].title + ": "), MD.SCENARIOS[sc].hint, h("br"), h("span", { class: "dim small" }, MD.SCENARIOS[sc].real)),
      G.note ? h("div", { class: "msg", role: "status" }, G.note) : null,
      h("button", { class: "btn primary big", onclick: startDesigning }, "Start designing"),
      leaderboard(), savedDesigns());
  }

  // ------------ build ------------
  const num = (x, d = 1) => (typeof x === "number" ? x.toFixed(d) : x);
  function pickGroup(title, why, key, cat, show, multi) {
    const d = G.design;
    return h("div", { class: "grp" }, h("h3", {}, title), h("p", { class: "why" }, why),
      h("div", { class: "sgrid" }, Object.entries(cat).map(([id, it]) => {
        const on = multi ? d.payloads.includes(id) : d[key] === id;
        return h("button", { class: "pick", "aria-pressed": on, onclick: () => {
          if (multi) { const s = new Set(d.payloads); s.has(id) ? s.delete(id) : s.add(id); d.payloads = [...s]; G.approved.clear(); persist(); render(true); } else setD(key, id);
        } }, h("b", {}, it.name), it.note || "", h("span", { class: "nums" }, show(it)));
      })));
  }
  const GROUPS = {
    launcher: () => pickGroup("Rocket", "Pick a launcher. The mass limit depends on the orbit you choose.", "launcher", MD.LAUNCHERS, (l) => `${l.cost} M · ${(l.reliability * 100).toFixed(0)}% reliable · ${l.wait} wk wait · ${l.cap[G.design.orbit] ? "carries " + l.cap[G.design.orbit] + " kg to this orbit" : "cannot reach this orbit"}`),
    orbit: () => pickGroup("Orbit", "Where you fly decides sunlight, ground contact and how useful the science is.", "orbit", MD.ORBITS, (o) => `${Math.round(o.sun * 100)}% sunlit · ${o.eclipseMin} min eclipse · ${o.contactMin} min contact/day`),
    ground: () => pickGroup("Ground stations", "More stations mean more time to talk to your spacecraft.", "ground", MD.GROUND, (g) => `${g.cost} M · contact x${g.contact}`),
    bus: () => pickGroup("Spacecraft bus", "The frame. Bigger means more payload slots and storage, and more mass and cost.", "bus", MD.BUSES, (b) => `${b.mass} kg · ${b.cost} M · ${b.slots} payload slot(s) · ${b.storage} GB storage`),
    solar: () => pickGroup("Solar panels", "Power comes from here.", "solar", MD.SOLAR, (s) => `x${s.mult} power · ${s.mass} kg · ${s.cost} M`),
    battery: () => pickGroup("Battery", "Carries the spacecraft through eclipse.", "battery", MD.BATTERY, (b) => `${b.wh} Wh · ${b.mass} kg · ${b.cost} M`),
    prop: () => pickGroup("Propulsion", "Needed for orbit changes, such as entering lunar orbit.", "prop", MD.PROP, (p) => `${p.dv} m/s · ${p.mass} kg · ${p.cost} M`),
    payloads: () => pickGroup("Science payloads (choose up to the bus slots)", `Instruments that match the mission "${MD.SCENARIOS[G.design.scenario].tag}" score full value; others only a third.`, "payloads", MD.PAYLOADS, (p) => `${p.mass} kg · ${p.powerW} W · ${p.data} GB/day · ${p.cost} M · tags ${p.tags.join("/")}`, true),
    comms: () => pickGroup("Radio", "Sends the data home. Faster radios use more power.", "comms", MD.COMMS, (c) => `${c.rateMbps} Mbps · ${c.txW} W · ${c.mass} kg · ${c.cost} M`),
  };

  // flat side view of the spacecraft that changes with the choices (drawn in code, no images)
  function craftSVG(d) {
    const size = { u3: [60, 60], u6: [100, 60], u12: [100, 100] }[d.bus], bw = size[0], bh = size[1], cx = 160, cy = 90;
    const x0 = cx - bw / 2, y0 = cy - bh / 2, g = [];
    if (d.solar === "wings") for (const sgn of [-1, 1]) g.push(`<rect x="${sgn < 0 ? x0 - 62 : x0 + bw + 6}" y="${cy - 24}" width="56" height="48" fill="#26323f" stroke="#a0a0a0"/>`);
    else g.push(`<rect x="${x0 + 4}" y="${y0 + 4}" width="${bw - 8}" height="6" fill="#26323f"/>`);
    g.push(`<rect x="${x0}" y="${y0}" width="${bw}" height="${bh}" rx="4" fill="#222" stroke="#e0703f" stroke-width="2"/>`);
    const batW = { s: 14, m: 28, l: 44 }[d.battery]; g.push(`<rect x="${x0 + 8}" y="${y0 + bh - 16}" width="${batW}" height="8" fill="#a0a0a0"/>`);
    d.payloads.forEach((p, i) => g.push(`<circle cx="${x0 + 16 + i * 24}" cy="${y0 + 20}" r="8" fill="${MD.PAYLOADS[p].tags.includes("imaging") ? "#e0703f" : "#ff9a6e"}"/>`));
    const ant = { uhf: 14, sband: 26, xband: 40 }[d.comms]; g.push(`<line x1="${cx}" y1="${y0}" x2="${cx}" y2="${y0 - ant}" stroke="#e8e8e8" stroke-width="2"/><circle cx="${cx}" cy="${y0 - ant}" r="4" fill="#e8e8e8"/>`);
    if (d.prop !== "none") g.push(`<polygon points="${cx - 8},${y0 + bh} ${cx + 8},${y0 + bh} ${cx},${y0 + bh + (d.prop === "electric" ? 22 : 12)}" fill="#a0a0a0"/>`);
    const wrap = document.createElement("div");
    wrap.innerHTML = `<svg viewBox="0 0 320 180" class="craft" role="img" aria-label="Your spacecraft: ${MD.BUSES[d.bus].name}, ${MD.SOLAR[d.solar].name}, ${d.payloads.length} instrument(s)">${g.join("")}</svg>`;
    return wrap;
  }

  function dashboard(A, sc) {
    const crit = (k) => sc.critical.includes(k) ? h("span", { class: "crit" }, "critical") : null;
    const res = (key, label, used, cap, text, over) => h("div", { class: "res" },
      h("div", { class: "row" }, h("span", {}, h("b", {}, label), crit(key), h("span", { class: "stat" + (over ? " bad" : "") }, over ? "over the limit" : used / (cap || 1) > 0.9 ? "tight" : "ok")), h("span", {}, text)),
      h("div", { class: "bar " + (over ? "bad" : used / (cap || 1) > 0.9 ? "warn" : "") }, h("i", { style: `width:${clampPct((used / (cap || 1)) * 100)}%` })),
      h("p", { class: "why" }, WHY[key]));
    return h("aside", { class: "dash card" }, craftSVG(G.design), h("h3", {}, "Mission dashboard"),
      res("mass", "Mass", A.mass.used, A.mass.cap || 1, A.mass.cap ? `${num(A.mass.used)} / ${A.mass.cap} kg` : `${num(A.mass.used)} kg, this rocket cannot reach this orbit`, A.mass.used > A.mass.cap),
      res("power", "Power", A.power.load, Math.max(A.power.gen, 0.1), `use ${num(A.power.load)} W / make ${num(A.power.gen)} W`, A.power.gen < A.power.load),
      res("budget", "Budget", A.budget.used, A.budget.cap, `${num(A.budget.used)} / ${num(A.budget.cap)} M`, A.budget.used > A.budget.cap),
      res("data", "Data per day", A.data.perDay, Math.max(A.comms.downGB, 0.01), `make ${num(A.data.perDay, 2)} / send ${num(A.comms.downGB, 2)} GB`, A.comms.ratio < 0.5),
      res("comms", "Comms", A.comms.contactMin, 160, `${num(A.comms.contactMin, 0)} min/day at ${A.comms.rate} Mbps`, false),
      res("time", "Time to launch", A.time.weeks, A.time.deadline, `${num(A.time.weeks, 0)} / ${num(A.time.deadline, 0)} weeks`, A.time.weeks > A.time.deadline),
      h("p", { class: "small" }, h("b", {}, "Science possible: "), `${num(A.science.potential, 0)} points (target ${sc.target})`),
      h("div", { class: "bar " + (A.science.potential >= sc.target ? "" : "warn") }, h("i", { style: `width:${clampPct(A.science.potential / sc.target * 100)}%` })),
      A.problems.map((p) => h("div", { class: "msg" }, p)),
      A.warnings.map((p) => h("div", { class: "msg warn" }, p)));
  }

  function build() {
    const d = G.design, sc = MD.SCENARIOS[d.scenario], A = MD.analyse(d), roles = Object.keys(MD.ROLES);
    const owned = G.role === "all" ? ["launcher", "orbit", "ground", "bus", "solar", "battery", "prop", "payloads", "comms"] : roleKeys(G.role);
    const banner = G.mode === "sandbox" ? "Sandbox: limits only warn here and nothing is scored." : G.mode === "comp" && G.comp ? `${G.compNames[G.comp.idx]} is designing (team ${G.comp.idx + 1} of ${G.compN}). Same mission and same random events for every team. One launch per team.` : "";
    const panel = [banner ? h("div", { class: "msg", role: "status" }, banner) : null, G.note ? h("div", { class: "msg", role: "status" }, G.note) : null, tourCard(), h("div", { class: "hint" }, h("b", {}, sc.title + ": "), sc.objective, " ", sc.hint)];
    if (G.players > 1) {
      panel.push(h("div", { class: "roles", role: "tablist" }, roles.map((r) => h("button", { role: "tab", "aria-selected": G.role === r, class: G.approved.has(r) ? "ok" : "", onclick: () => { G.role = r; render(); } }, `${MD.ROLES[r].name}`))));
      const r = MD.ROLES[G.role];
      panel.push(h("div", { class: "msg" }, h("b", {}, r.name + " goal: "), r.goal, " ", r.check(A) ? "Right now: met." : "Right now: not met yet."));
    }
    owned.forEach((k) => panel.push(GROUPS[k]()));
    if (G.players > 1) panel.push(h("div", { class: "row-actions" },
      h("button", { class: "btn", onclick: () => { G.approved.has(G.role) ? G.approved.delete(G.role) : G.approved.add(G.role); render(true); } }, G.approved.has(G.role) ? "Take back approval" : `Approve as ${MD.ROLES[G.role].name}`),
      h("span", { class: "dim small" }, `Approved: ${G.approved.size} of ${roles.length}. Changing any choice clears approvals, so the team talks again.`)));
    const canGoNote = A.valid ? "" : "Launch is blocked: " + A.problems.length + " problem(s) to fix.";
    const canGo = G.mode === "sandbox" ? d.payloads.length > 0 : A.valid && (G.players === 1 || G.approved.size === roles.length);
    return h("div", {},
      h("div", { class: "steps" }, h("span", {}, "1 Mission"), h("span", { class: "on", "aria-current": "step" }, "2 Design"), h("span", {}, "3 Launch and results")),
      h("h1", {}, "Design your spacecraft"),
      h("div", { class: "md-grid" }, h("div", {}, panel), dashboard(A, sc)),
      h("div", { class: "row-actions" },
        h("button", { class: "btn", onclick: () => setPhase("setup") }, "Back to missions"),
        h("button", { class: "btn", onclick: () => saveDesign(A) }, "Save this design"),
        G.mode === "comp" ? null : h("button", { class: "btn", onclick: shareLink }, "Copy share link"),
        h("button", { class: "btn primary big", disabled: !canGo, onclick: launch }, "Launch mission"),
        G.shareUrl ? h("input", { class: "txt", readonly: true, value: G.shareUrl, "aria-label": "Share link", style: "min-width:260px", onfocus: (e) => e.target.select() }) : null,
        G.mode === "sandbox" && !A.valid ? h("span", { class: "dim small", role: "status" }, "Sandbox: this design breaks " + A.problems.length + " limit(s). You can still launch it.") : !A.valid ? h("span", { class: "dim small", role: "status" }, canGoNote + " Fix the items marked in the dashboard first.") : G.players > 1 && !canGo ? h("span", { class: "dim small" }, "Every role must approve.") : null));
  }
  function roleKeys(r) { return { planner: ["launcher", "orbit", "ground"], craft: ["bus", "solar", "battery", "prop"], science: ["payloads"], comms: ["comms"] }[r]; }

  // ------------ launch + results ------------
  function shareLink() {
    G.shareUrl = location.href.split("#")[0] + "#d=" + MD.encode(G.design);
    try { navigator.clipboard.writeText(G.shareUrl).catch(() => {}); } catch (e) { /* the link is shown in a box anyway */ }
    render(true);
  }
  function launch() {
    const sc = G.design.scenario; let r;
    if (G.mode === "comp") r = MD.simulate(G.design, G.comp.seed);
    else { G.design.seed = (G.design.seed || 7) + 1; persist(); r = MD.simulate(G.design, G.design.seed, { sandbox: G.mode === "sandbox" }); }
    G.result = r; G.delta = null; G.shareUrl = "";
    const cur = { design: JSON.parse(JSON.stringify(G.design)), score: r.score, outcome: r.outcome };
    if (G.mode === "mission" && r.outcome !== "rejected") { const key = "md.last." + sc; G.delta = MD.delta(store.get(key, null), cur); store.set(key, cur); }
    if (G.mode === "comp") G.comp.entries[G.comp.idx] = { name: G.compNames[G.comp.idx], design: cur.design, score: r.score, outcome: r.outcome, science: r.science, cost: r.analysis.budget.used };
    setPhase("result");
  }
  function nextTeam() {
    const df = G.design.difficulty, sc = G.design.scenario;
    if (G.comp.idx + 1 >= G.compN) { setPhase("rank"); return; }
    G.comp.idx++; G.design = MD.defaultDesign(sc); G.design.difficulty = df; setPhase("build");
  }

  function chart(R, sc) {
    const W = 640, H = 220, P = 32, n = R.days.length || 1;
    const x = (i) => P + (i / Math.max(1, sc.days - 1)) * (W - 2 * P), y = (v) => H - P - clampPct(v) / 100 * (H - 2 * P);
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "chart"); svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Battery charge, science delivered and event days over the mission");
    const add = (tag, a, text) => { const e = document.createElementNS(ns, tag); for (const k in a) e.setAttribute(k, a[k]); if (text) e.textContent = text; svg.append(e); };
    add("line", { x1: P, y1: H - P, x2: W - P, y2: H - P, stroke: "#444" });
    R.events.forEach((e) => add("line", { x1: x(Math.max(0, e.day - 1)), y1: P / 2, x2: x(Math.max(0, e.day - 1)), y2: H - P, stroke: "#e0703f", "stroke-dasharray": "2 4" }));
    const poly = (vals, col, dash) => add("polyline", { fill: "none", stroke: col, "stroke-width": 2, "stroke-dasharray": dash || "", points: vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ") });
    poly(R.days.map((d) => d.batPct), "#a0a0a0", "4 3");
    poly(R.days.map((d) => d.science / sc.target * 100), "#e0703f");
    add("text", { x: P, y: 14, fill: "#a0a0a0", "font-size": 9 }, "Dashed grey: battery %.  Orange: science vs target.  Dotted: events.");
    add("text", { x: P, y: H - 8, fill: "#a0a0a0", "font-size": 9 }, "Day 1");
    add("text", { x: W - P - 28, y: H - 8, fill: "#a0a0a0", "font-size": 9 }, "Day " + sc.days);
    return svg;
  }

  const OUT = { success: "Mission success", partial: "Partial success", failed: "Mission fell short", lost: "Spacecraft lost", rejected: "Design rejected before launch" };

  function result() {
    const R = G.result, sc = MD.SCENARIOS[G.design.scenario], S = R.score, p = S.parts, sandbox = G.mode === "sandbox", comp = G.mode === "comp";
    return h("div", {},
      h("div", { class: "steps" }, h("span", {}, "1 Mission"), h("span", {}, "2 Design"), h("span", { class: "on", "aria-current": "step" }, "3 Launch and results")),
      h("h1", {}, (comp ? G.compNames[G.comp.idx] + ": " : "") + OUT[R.outcome]),
      sandbox ? h("p", { class: "msg", role: "status" }, "Sandbox run. Science returned: " + R.science.toFixed(0) + " of " + sc.target + ". Nothing is scored.") : h("div", { class: "big-total" }, S.total, h("span", { class: "dim small" }, " / 100")),
      sandbox ? null : h("div", { class: "score" }, [["Mission performance", p.performance, 30], ["Science value", p.science, 20], ["Resource efficiency", p.efficiency, 20], ["Decision quality", p.decisions, 15], ["Teamwork", p.collab, 15]]
        .map(([n, v, m]) => h("div", {}, h("b", {}, `${v}/${m}`), h("span", {}, n)))),
      R.days.length ? chart(R, sc) : null,
      G.delta ? deltaPanel(G.delta) : null,
      h("div", { class: "grp" }, h("h3", {}, "Why it went this way"),
        h("ul", { class: "tight" }, R.reasons.map((r) => h("li", {}, r))),
        R.events.length ? h("p", { class: "small dim" }, "Events this run: " + R.events.map((e) => `day ${e.day} ${e.title}`).join(", ")) : h("p", { class: "small dim" }, "No events this run. Try another launch: the surprises change each time.")),
      sandbox ? null : h("div", { class: "grp" }, h("h3", {}, "Role check"),
        h("ul", { class: "tight" }, S.roles.map((r) => h("li", {}, `${r.name}: ${r.ok ? "goal met" : "goal not met"}`)))),
      R.analysis.warnings.length ? h("div", { class: "grp" }, h("h3", {}, "Things to improve"), R.analysis.warnings.map((w) => h("div", { class: "msg warn" }, w))) : null,
      h("p", { class: "small dim" }, "Score = performance 30 + science 20 + efficiency 20 + decisions 15 + teamwork 15. Several different designs can score well. The model is simplified: see Model notes (model.html)."),
      comp ? h("div", { class: "row-actions" }, h("button", { class: "btn primary big", onclick: nextTeam }, G.comp.idx + 1 >= G.compN ? "See the ranking" : `Pass to ${G.compNames[G.comp.idx + 1]}`))
        : h("div", { class: "row-actions" },
          h("button", { class: "btn primary", onclick: () => setPhase("build") }, "Redesign"),
          h("button", { class: "btn", onclick: launch }, "Fly again (new surprises)"),
          h("button", { class: "btn", onclick: () => saveDesign(R.analysis, sandbox ? null : S.total) }, "Save design"),
          sandbox ? null : h("button", { class: "btn", onclick: () => submitBoard(S.total) }, "Add to leaderboard"),
          h("button", { class: "btn ghost", onclick: () => setPhase("setup") }, "New mission")),
      comp ? null : savedDesigns());
  }

  const PART = { performance: "mission performance", science: "science value", efficiency: "resource efficiency", decisions: "decision quality", collab: "teamwork" };
  const sgn = (n) => (n > 0 ? "+" + n : String(n));
  function deltaPanel(dl) {
    const items = [];
    if (dl.sameDesign) items.push(h("li", {}, `You flew the same design again. The score moved by ${sgn(dl.total)} only because the random events were different this time.`));
    else {
      items.push(h("li", {}, (dl.total === 0 ? "Score unchanged compared with your last run of this mission." : `Score ${sgn(dl.total)} compared with your last run of this mission.`) + (dl.outcomeFrom !== dl.outcomeTo ? ` Outcome: ${OUT[dl.outcomeFrom]} to ${OUT[dl.outcomeTo]}.` : "")));
      dl.changes.forEach((c) => items.push(h("li", {}, `You changed the ${c.label}: ${c.from} to ${c.to}.`)));
      if (dl.biggest) items.push(h("li", {}, `The biggest score change was ${PART[dl.biggest[0]]} (${sgn(dl.biggest[1])} points). Random events can also move the score, so check the report above.`));
    }
    return h("div", { class: "grp" }, h("h3", {}, "Compared with your last run"), h("ul", { class: "tight" }, items));
  }
  function rank() {
    const sc = MD.SCENARIOS[G.design.scenario], list = MD.rank(G.comp.entries);
    return h("div", {},
      h("h1", {}, "Team ranking"),
      h("p", { class: "dim" }, `${sc.title}, ${MD.DIFFICULTY[G.design.difficulty].name}. Every team flew with the same random events. Ties go to the cheaper design.`),
      h("table", { class: "cmp" }, h("thead", {}, h("tr", {}, ["Rank", "Team", "Score", "Outcome", "Science", "Cost (M)"].map((t) => h("th", {}, t)))),
        h("tbody", {}, list.map((e, i) => h("tr", {}, h("td", {}, i + 1), h("td", {}, e.name), h("td", {}, e.score.total), h("td", {}, OUT[e.outcome]), h("td", {}, e.science.toFixed(0)), h("td", {}, e.cost.toFixed(1)))))),
      h("p", { class: "small dim" }, "Look at how the top teams differ: different designs can both do well."),
      h("div", { class: "row-actions" }, h("button", { class: "btn primary", onclick: () => { G.mode = "comp"; startDesigning(); } }, "Play again with the same teams"), h("button", { class: "btn", onclick: () => setPhase("setup") }, "New mission")));
  }
  function compare() {
    const list = store.get("md.saved", []), picks = [...G.cmpSel].map((i) => list[i]).filter(Boolean);
    if (picks.length !== 2) { return h("div", {}, h("h1", {}, "Compare designs"), h("p", {}, "Select two saved designs first."), h("button", { class: "btn", onclick: () => setPhase("setup") }, "Back")); }
    const rows = picks.map((p) => { const d = Object.assign(MD.defaultDesign(p.d.scenario), p.d), A = MD.analyse(d), r = MD.simulate(d, 1); return { d, A, r }; });
    const line = (label, f) => h("tr", {}, h("th", { scope: "row" }, label), rows.map((x) => h("td", {}, f(x))));
    return h("div", {},
      h("h1", {}, "Compare designs"),
      h("p", { class: "dim" }, "Both designs were flown with the same random seed, so the comparison is fair."),
      h("table", { class: "cmp" }, h("thead", {}, h("tr", {}, h("th", {}, ""), h("th", {}, "Design A"), h("th", {}, "Design B"))),
        h("tbody", {},
          line("Mission", (x) => MD.SCENARIOS[x.d.scenario].title + ", " + MD.DIFFICULTY[x.d.difficulty].name), line("Rocket", (x) => MD.LAUNCHERS[x.d.launcher].name), line("Orbit", (x) => MD.ORBITS[x.d.orbit].name),
          line("Bus and panels", (x) => MD.BUSES[x.d.bus].name + ", " + MD.SOLAR[x.d.solar].name), line("Instruments", (x) => x.d.payloads.map((p) => MD.PAYLOADS[p].name).join(", ") || "none"), line("Radio", (x) => MD.COMMS[x.d.comms].name),
          line("Mass (kg)", (x) => num(x.A.mass.used) + " of " + x.A.mass.cap), line("Power (W)", (x) => "make " + num(x.A.power.gen) + ", use " + num(x.A.power.load)), line("Budget (M)", (x) => num(x.A.budget.used) + " of " + num(x.A.budget.cap)),
          line("Data per day (GB)", (x) => "make " + num(x.A.data.perDay, 2) + ", send " + num(x.A.comms.downGB, 2)), line("Weeks to launch", (x) => num(x.A.time.weeks, 0) + " of " + num(x.A.time.deadline, 0)),
          line("Result (seed 1)", (x) => OUT[x.r.outcome]), line("Score (seed 1)", (x) => x.r.score.total))),
      h("div", { class: "row-actions" }, h("button", { class: "btn", onclick: () => setPhase("setup") }, "Back")));
  }

  // ------------ saved designs & leaderboard (local to this browser) ------------
  function saveDesign(A, total) {
    const list = store.get("md.saved", []);
    list.unshift({ d: JSON.parse(JSON.stringify(G.design)), when: new Date().toISOString().slice(0, 16).replace("T", " "), total: total == null ? null : total, cost: +A.budget.used.toFixed(1), mass: +A.mass.used.toFixed(1), valid: A.valid });
    store.set("md.saved", list.slice(0, 12)); render(true);
  }
  function savedDesigns() {
    const list = store.get("md.saved", []);
    if (!list.length) return null;
    return h("div", { class: "grp card" }, h("h3", {}, "Saved designs (compare)"),
      h("p", { class: "small dim" }, "Tick two designs to compare them side by side."),
      h("button", { class: "btn small", disabled: G.cmpSel.size !== 2, onclick: () => setPhase("compare") }, "Compare selected"),
      h("table", { class: "cmp" }, h("thead", {}, h("tr", {}, ["Pick", "Mission", "Rocket", "Orbit", "Cost M", "Mass kg", "Score", ""].map((t) => h("th", {}, t)))),
        h("tbody", {}, list.map((s, i) => h("tr", {}, h("td", {}, h("input", { type: "checkbox", "aria-label": "Select saved design " + (i + 1) + " for comparison", checked: G.cmpSel.has(i) || null, onchange: (e) => { if (e.target.checked) { if (G.cmpSel.size >= 2) { e.target.checked = false; return; } G.cmpSel.add(i); } else G.cmpSel.delete(i); render(true); } })), h("td", {}, MD.SCENARIOS[s.d.scenario].title), h("td", {}, MD.LAUNCHERS[s.d.launcher].name), h("td", {}, s.d.orbit), h("td", {}, s.cost), h("td", {}, s.mass), h("td", {}, s.total == null ? "not flown" : s.total),
          h("td", {}, h("button", { class: "btn small", onclick: () => { G.design = Object.assign(MD.defaultDesign(s.d.scenario), s.d); persist(); setPhase("build"); } }, "Load"), " ",
            h("button", { class: "btn small ghost", "aria-label": "Delete saved design", onclick: () => { list.splice(i, 1); store.set("md.saved", list); G.cmpSel.clear(); render(true); } }, "Delete")))))));
  }
  function submitBoard(total) {
    const b = store.get("md.board", []);
    b.push({ name: G.players > 1 ? G.team : "Solo", scenario: G.design.scenario, difficulty: G.design.difficulty, total, players: G.players });
    b.sort((p, q) => q.total - p.total); store.set("md.board", b.slice(0, 20)); render(true);
  }
  function leaderboard() {
    const b = store.get("md.board", []).filter((x) => x.scenario === G.design.scenario);
    if (!b.length) return null;
    return h("div", { class: "grp card" }, h("h3", {}, "Leaderboard on this device: " + MD.SCENARIOS[G.design.scenario].title),
      h("table", { class: "cmp" }, h("tbody", {}, b.slice(0, 5).map((x, i) => h("tr", {}, h("td", {}, i + 1), h("td", {}, x.name), h("td", {}, x.difficulty), h("td", {}, x.total))))));
  }

  // ------------ help ------------
  document.getElementById("helpBtn").addEventListener("click", () => {
    const dlg = document.getElementById("help");
    dlg.replaceChildren(h("h2", {}, "How it works"),
      h("button", { class: "btn small", onclick: () => { G.tour = 0; dlg.close(); if (G.phase !== "build") setPhase("build"); else render(true); } }, "Replay the quick tour"),
      h("ol", {}, h("li", {}, "Choose a mission, a difficulty and how many people play."), h("li", {}, "Build: bus, solar panels, battery, radio, instruments, rocket, orbit. Watch the six resources: mass, power, budget, data, communications, time."), h("li", {}, "Launch. The mission runs for 30 days, with random events. A report explains why it worked or not."), h("li", {}, "Redesign and fly again. Try a cheap design and a bold one: both can work.")),
      h("p", {}, h("a", { href: "model.html" }, "Model notes: formulas, simplifications and NASA sources")),
      h("p", { class: "small dim" }, "All numbers are simplified for teaching. They are not data for any real rocket or spacecraft. Terrain data in the Mars game is from USGS."),
      h("button", { class: "btn", onclick: () => dlg.close() }, "Close"));
    dlg.showModal();
  });

  function render(keepScroll) {
    const y = window.scrollY;
    app.replaceChildren(G.phase === "setup" ? setup() : G.phase === "build" ? build() : G.phase === "rank" ? rank() : G.phase === "compare" ? compare() : result());
    if (keepScroll) window.scrollTo(0, y);
  }
  globalThis.MR.mdDebug = { G, render, launch };
  render();
})();
