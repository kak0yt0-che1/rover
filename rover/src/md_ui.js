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

  const G = { phase: "setup", players: 1, role: "all", approved: new Set(), result: null, design: MD.defaultDesign("coast"), team: "Team Pathfinder" };
  const saved = store.get("md.design", null);
  if (saved && MD.SCENARIOS[saved.scenario]) G.design = Object.assign(MD.defaultDesign(saved.scenario), saved);
  const persist = () => store.set("md.design", G.design);

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

  function setPhase(p) { G.phase = p; render(); window.scrollTo(0, 0); }
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
      h("div", { class: "grp" }, h("h3", {}, "3. Players"),
        h("div", { class: "chips" }, [1, 2, 3, 4].map((n) => h("button", { class: "pick", "aria-pressed": G.players === n, onclick: () => { G.players = n; G.role = n === 1 ? "all" : Object.keys(MD.ROLES)[0]; render(); } }, n === 1 ? "Solo" : n + " players"))),
        h("p", { class: "why" }, G.players === 1 ? "You hold every role." : "Pass the screen around. Each person owns some choices (a role) and the launch needs every role to approve. Talk it out: your choices change each other's numbers."),
        G.players > 1 ? h("p", {}, h("label", {}, "Team name ", h("input", { class: "txt", value: G.team, maxlength: 24, oninput: (e) => { G.team = e.target.value; } }))) : null),
      h("div", { class: "scenario-brief hint" }, h("b", {}, MD.SCENARIOS[sc].title + ": "), MD.SCENARIOS[sc].hint, h("br"), h("span", { class: "dim small" }, MD.SCENARIOS[sc].real)),
      h("button", { class: "btn primary big", onclick: () => { G.approved.clear(); G.role = G.players === 1 ? "all" : Object.keys(MD.ROLES)[0]; setPhase("build"); } }, "Start designing"),
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
    launcher: () => pickGroup("Rocket", "Pick a launcher. The mass limit depends on the orbit you choose.", "launcher", MD.LAUNCHERS, (l) => `${l.cost} M · ${(l.reliability * 100).toFixed(0)}% reliable · ${l.wait} wk wait · carries ${MD.ORBITS[G.design.orbit] ? l.cap[G.design.orbit] : 0} kg here`),
    orbit: () => pickGroup("Orbit", "Where you fly decides sunlight, ground contact and how useful the science is.", "orbit", MD.ORBITS, (o) => `${Math.round(o.sun * 100)}% sunlit · ${o.eclipseMin} min eclipse · ${o.contactMin} min contact/day`),
    ground: () => pickGroup("Ground stations", "More stations mean more time to talk to your spacecraft.", "ground", MD.GROUND, (g) => `${g.cost} M · contact x${g.contact}`),
    bus: () => pickGroup("Spacecraft bus", "The frame. Bigger means more payload slots and storage, and more mass and cost.", "bus", MD.BUSES, (b) => `${b.mass} kg · ${b.cost} M · ${b.slots} payload slot(s) · ${b.storage} GB storage`),
    solar: () => pickGroup("Solar panels", "Power comes from here.", "solar", MD.SOLAR, (s) => `x${s.mult} power · ${s.mass} kg · ${s.cost} M`),
    battery: () => pickGroup("Battery", "Carries the spacecraft through eclipse.", "battery", MD.BATTERY, (b) => `${b.wh} Wh · ${b.mass} kg · ${b.cost} M`),
    prop: () => pickGroup("Propulsion", "Needed for orbit changes, such as entering lunar orbit.", "prop", MD.PROP, (p) => `${p.dv} m/s · ${p.mass} kg · ${p.cost} M`),
    payloads: () => pickGroup("Science payloads (choose up to the bus slots)", `Instruments that match the mission "${MD.SCENARIOS[G.design.scenario].tag}" score full value; others only a third.`, "payloads", MD.PAYLOADS, (p) => `${p.mass} kg · ${p.powerW} W · ${p.data} GB/day · ${p.cost} M · tags ${p.tags.join("/")}`, true),
    comms: () => pickGroup("Radio", "Sends the data home. Faster radios use more power.", "comms", MD.COMMS, (c) => `${c.rateMbps} Mbps · ${c.txW} W · ${c.mass} kg · ${c.cost} M`),
  };

  function dashboard(A, sc) {
    const crit = (k) => sc.critical.includes(k) ? h("span", { class: "crit" }, "critical") : null;
    const res = (key, label, used, cap, text, over) => h("div", { class: "res" },
      h("div", { class: "row" }, h("span", {}, h("b", {}, label), crit(key)), h("span", {}, text)),
      h("div", { class: "bar " + (over ? "bad" : used / (cap || 1) > 0.9 ? "warn" : "") }, h("i", { style: `width:${clampPct((used / (cap || 1)) * 100)}%` })),
      h("p", { class: "why" }, WHY[key]));
    return h("aside", { class: "dash card" }, h("h3", {}, "Mission dashboard"),
      res("mass", "Mass", A.mass.used, A.mass.cap || 1, `${num(A.mass.used)} / ${A.mass.cap} kg`, A.mass.used > A.mass.cap),
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
    const panel = [h("div", { class: "hint" }, h("b", {}, sc.title + ": "), sc.objective, " ", sc.hint)];
    if (G.players > 1) {
      panel.push(h("div", { class: "roles", role: "tablist" }, roles.map((r) => h("button", { role: "tab", "aria-selected": G.role === r, class: G.approved.has(r) ? "ok" : "", onclick: () => { G.role = r; render(); } }, `${MD.ROLES[r].name}`))));
      const r = MD.ROLES[G.role];
      panel.push(h("div", { class: "msg" }, h("b", {}, r.name + " goal: "), r.goal, " ", r.check(A) ? "Right now: met." : "Right now: not met yet."));
    }
    owned.forEach((k) => panel.push(GROUPS[k]()));
    if (G.players > 1) panel.push(h("div", { class: "row-actions" },
      h("button", { class: "btn", onclick: () => { G.approved.has(G.role) ? G.approved.delete(G.role) : G.approved.add(G.role); render(true); } }, G.approved.has(G.role) ? "Take back approval" : `Approve as ${MD.ROLES[G.role].name}`),
      h("span", { class: "dim small" }, `Approved: ${G.approved.size} of ${roles.length}. Changing any choice clears approvals, so the team talks again.`)));
    const canGo = A.valid && (G.players === 1 || G.approved.size === roles.length);
    return h("div", {},
      h("div", { class: "steps" }, h("span", {}, "1 Mission"), h("span", { class: "on" }, "2 Design"), h("span", {}, "3 Launch and results")),
      h("div", { class: "md-grid" }, h("div", {}, panel), dashboard(A, sc)),
      h("div", { class: "row-actions" },
        h("button", { class: "btn", onclick: () => setPhase("setup") }, "Back to missions"),
        h("button", { class: "btn", onclick: () => saveDesign(A) }, "Save this design"),
        h("button", { class: "btn primary big", disabled: !canGo, onclick: launch }, "Launch mission"),
        !A.valid ? h("span", { class: "dim small" }, "Fix the red items in the dashboard first.") : G.players > 1 && !canGo ? h("span", { class: "dim small" }, "Every role must approve.") : null));
  }
  function roleKeys(r) { return { planner: ["launcher", "orbit", "ground"], craft: ["bus", "solar", "battery", "prop"], science: ["payloads"], comms: ["comms"] }[r]; }

  // ------------ launch + results ------------
  function launch() {
    G.design.seed = (G.design.seed || 7) + 1; persist();
    G.result = MD.simulate(G.design, G.design.seed);
    setPhase("result");
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
    const R = G.result, sc = MD.SCENARIOS[G.design.scenario], S = R.score, p = S.parts;
    return h("div", {},
      h("div", { class: "steps" }, h("span", {}, "1 Mission"), h("span", {}, "2 Design"), h("span", { class: "on" }, "3 Launch and results")),
      h("h1", {}, OUT[R.outcome]), h("div", { class: "big-total" }, S.total, h("span", { class: "dim small" }, " / 100")),
      h("div", { class: "score" }, [["Mission performance", p.performance, 30], ["Science value", p.science, 20], ["Resource efficiency", p.efficiency, 20], ["Decision quality", p.decisions, 15], ["Teamwork", p.collab, 15]]
        .map(([n, v, m]) => h("div", {}, h("b", {}, `${v}/${m}`), h("span", {}, n)))),
      R.days.length ? chart(R, sc) : null,
      h("div", { class: "grp" }, h("h3", {}, "Why it went this way"),
        h("ul", { class: "tight" }, R.reasons.map((r) => h("li", {}, r))),
        R.events.length ? h("p", { class: "small dim" }, "Events this run: " + R.events.map((e) => `day ${e.day} ${e.title}`).join(", ")) : h("p", { class: "small dim" }, "No events this run. Try another launch: the surprises change each time.")),
      h("div", { class: "grp" }, h("h3", {}, "Role check"),
        h("ul", { class: "tight" }, S.roles.map((r) => h("li", {}, `${r.name}: ${r.ok ? "goal met" : "goal not met"}`)))),
      R.analysis.warnings.length ? h("div", { class: "grp" }, h("h3", {}, "Things to improve"), R.analysis.warnings.map((w) => h("div", { class: "msg warn" }, w))) : null,
      h("p", { class: "small dim" }, "Score = performance 30 + science 20 + efficiency 20 + decisions 15 + teamwork 15. Several different designs can score well. Model is simplified; see README."),
      h("div", { class: "row-actions" },
        h("button", { class: "btn primary", onclick: () => setPhase("build") }, "Redesign"),
        h("button", { class: "btn", onclick: launch }, "Fly again (new surprises)"),
        h("button", { class: "btn", onclick: () => saveDesign(R.analysis, S.total) }, "Save design"),
        h("button", { class: "btn", onclick: () => submitBoard(S.total) }, "Add to leaderboard"),
        h("button", { class: "btn ghost", onclick: () => setPhase("setup") }, "New mission")),
      savedDesigns());
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
      h("table", { class: "cmp" }, h("thead", {}, h("tr", {}, ["Mission", "Rocket", "Orbit", "Cost M", "Mass kg", "Score", ""].map((t) => h("th", {}, t)))),
        h("tbody", {}, list.map((s, i) => h("tr", {}, h("td", {}, MD.SCENARIOS[s.d.scenario].title), h("td", {}, MD.LAUNCHERS[s.d.launcher].name), h("td", {}, s.d.orbit), h("td", {}, s.cost), h("td", {}, s.mass), h("td", {}, s.total == null ? "not flown" : s.total),
          h("td", {}, h("button", { class: "btn small", onclick: () => { G.design = Object.assign(MD.defaultDesign(s.d.scenario), s.d); persist(); setPhase("build"); } }, "Load"), " ",
            h("button", { class: "btn small ghost", "aria-label": "Delete saved design", onclick: () => { list.splice(i, 1); store.set("md.saved", list); render(true); } }, "Delete")))))));
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
      h("ol", {}, h("li", {}, "Choose a mission, a difficulty and how many people play."), h("li", {}, "Build: bus, solar panels, battery, radio, instruments, rocket, orbit. Watch the six resources: mass, power, budget, data, communications, time."), h("li", {}, "Launch. The mission runs for 30 days, with random events. A report explains why it worked or not."), h("li", {}, "Redesign and fly again. Try a cheap design and a bold one: both can work.")),
      h("p", { class: "small dim" }, "All numbers are simplified for teaching. They are not data for any real rocket or spacecraft. Terrain data in the Mars game is from USGS."),
      h("button", { class: "btn", onclick: () => dlg.close() }, "Close"));
    dlg.showModal();
  });

  function render(keepScroll) {
    const y = window.scrollY;
    app.replaceChildren(G.phase === "setup" ? setup() : G.phase === "build" ? build() : result());
    if (keepScroll) window.scrollTo(0, y);
  }
  globalThis.MR.mdDebug = { G, render, launch };
  render();
})();
