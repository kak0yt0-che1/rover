// Mission Design UI. Reads the model in md_model.js; draws no game logic of its own.
(function () {
  const MR = globalThis.MR, MD = MR.MD, app = document.getElementById("app");
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

  const G = { playerNames: ["Player 1", "Player 2", "Player 3", "Player 4"], mode: "mission", compN: 2, compNames: ["Team 1", "Team 2", "Team 3", "Team 4"], comp: null, delta: null, shareUrl: "", note: "", cmpSel: new Set(), phase: "setup", players: 1, role: "all", approved: new Set(), result: null, design: MD.defaultDesign("coast"), team: "Team Pathfinder" };
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

  function setPhase(p) { clearFlight(); G.phase = p; render(); window.scrollTo(0, 0); const t = app.querySelector("h1"); if (t) { t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); } if (p === "flight") runFlight(); }
  function startDesigning() {
    G.approved.clear(); G.delta = null; G.note = ""; G.log = [];
    if (G.mode === "comp") {
      const df = G.design.difficulty; G.design = MD.defaultDesign(G.design.scenario); G.design.difficulty = df;
      G.players = 1; G.role = "all"; G.comp = { idx: 0, seed: 1000 + Math.floor(Math.random() * 9000), entries: [] };
    } else if (G.mode === "sandbox") { G.players = 1; G.role = "all"; }
    else G.role = G.players === 1 ? "all" : Object.keys(MD.ROLES)[0];
    setPhase("build");
  }
  const CATS = { launcher: MD.LAUNCHERS, orbit: MD.ORBITS, bus: MD.BUSES, solar: MD.SOLAR, battery: MD.BATTERY, comms: MD.COMMS, prop: MD.PROP, ground: MD.GROUND };
  const sg = (n, u) => (Math.abs(n) < 0.05 ? "" : (n > 0 ? "+" : "") + n.toFixed(1) + " " + u);
  function logChange(name, A0, A1) {
    const bits = [sg(A1.mass.used - A0.mass.used, "kg"), sg(A1.budget.used - A0.budget.used, "M"), sg(A1.power.load - A0.power.load, "W use"), sg(A1.power.gen - A0.power.gen, "W made"), A1.mass.cap !== A0.mass.cap ? "rocket limit " + A0.mass.cap + " to " + A1.mass.cap + " kg" : ""].filter(Boolean);
    G.log = [name + (bits.length ? ": " + bits.join(", ") : ": no change to the numbers")].concat(G.log || []).slice(0, 4);
  }
  function setD(k, v) { const A0 = MD.analyse(G.design); G.design[k] = v; logChange(CATS[k] && CATS[k][v] ? CATS[k][v].name : k, A0, MD.analyse(G.design)); G.approved.clear(); persist(); render(true); }

  // ------------ setup ------------
  const artEl = (html) => { const w = document.createElement("span"); w.className = "mcard-frame"; w.innerHTML = html; return w; };
  const totalStars = () => Object.values(store.get("md.progress", {})).reduce((n, p) => n + (p.stars || 0), 0);
  function badgeShelf() {
    const have = store.get("md.badges", []);
    return h("div", { class: "grp card" }, h("h3", {}, "Badges"),
      h("ul", { class: "badges" }, MD.BADGES.map((b) => h("li", { class: have.includes(b.id) ? "on" : "" }, h("span", { class: "bmark", "aria-hidden": "true" }, have.includes(b.id) ? "★" : "·"), h("b", {}, b.name), h("span", {}, b.desc), h("em", {}, have.includes(b.id) ? "Earned" : "Locked")))));
  }
  function setup() {
    const sc = G.design.scenario;
    return h("div", {},
      h("section", { class: "hero" }, h("p", { class: "kicker" }, "MISSION CONTROL"), h("h1", {}, "Design a space mission"),
        h("p", { class: "sub" }, "Build a spacecraft. Pick a rocket and an orbit. Survive 30 days of surprises. Earn stars and badges. All numbers are a simplified teaching model."),
        h("ul", { class: "hudrow" }, h("li", {}, h("span", {}, "Stars"), h("b", {}, totalStars() + " / 9")), h("li", {}, h("span", {}, "Badges"), h("b", {}, store.get("md.badges", []).length + " / " + MD.BADGES.length)), h("li", {}, h("span", {}, "Rank"), h("b", {}, totalStars() >= 9 ? "Legend" : totalStars() >= 6 ? "Director" : totalStars() >= 3 ? "Engineer" : "Cadet")), h("li", {}, h("span", {}, "Mode"), h("b", {}, { mission: "Scored", sandbox: "Sandbox", comp: "Competition" }[G.mode])))),
      h("div", { class: "grp" }, h("h3", {}, "1. Choose a mission"),
        h("div", { class: "mcards" }, Object.entries(MD.SCENARIOS).map(([id, s]) => {
          const pr = store.get("md.progress", {})[id] || { stars: 0, best: 0 };
          return h("button", { class: "pick mcard", "aria-pressed": sc === id, onclick: () => { G.design = MD.defaultDesign(id); G.design.difficulty = G.design.difficulty; persist(); render(true); } },
            artEl(MR.mdArt.mission(id)),
            h("span", { class: "pick-body" }, h("b", {}, s.title), h("span", { class: "pick-note" }, s.blurb), h("span", { class: "nums" }, s.objective), h("span", { class: "nums" }, "Critical: " + s.critical.join(" and ")),
              h("span", { class: "best" }, "Best: ", h("span", { class: "starsmini", "aria-hidden": "true" }, "★".repeat(pr.stars) + "☆".repeat(3 - pr.stars)), pr.best ? ` ${pr.stars} of 3 stars, ${pr.best} points` : " not flown yet")));
        }))),
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
        G.players > 1 ? h("p", {}, h("label", {}, "Team name ", h("input", { class: "txt", value: G.team, maxlength: 24, oninput: (e) => { G.team = e.target.value; } }))) : null,
        G.players > 1 ? h("ul", { class: "assign" }, MD.assignRoles(G.players).map((rs, i) => h("li", {}, h("label", {}, `Player ${i + 1} name `, h("input", { class: "txt", value: G.playerNames[i], maxlength: 16, oninput: (e) => { G.playerNames[i] = e.target.value || "Player " + (i + 1); } })), h("span", { class: "dim small" }, " holds: " + rs.map((r) => MD.ROLES[r].name).join(" + "))))) : null),
      h("div", { class: "scenario-brief hint" }, h("b", {}, MD.SCENARIOS[sc].title + ": "), MD.SCENARIOS[sc].hint, h("br"), h("span", { class: "dim small" }, MD.SCENARIOS[sc].real)),
      G.note ? h("div", { class: "msg", role: "status" }, G.note) : null,
      h("button", { class: "btn primary big", onclick: startDesigning }, "Start designing"),
      badgeShelf(), leaderboard(), savedDesigns());
  }

  // ------------ build ------------
  const num = (x, d = 1) => (typeof x === "number" ? x.toFixed(d) : x);
  // how much of the rocket's capacity to the chosen orbit the current spacecraft uses
  function capBar(l) {
    const cap = l.cap[G.design.orbit] || 0, used = MD.analyse(G.design).mass.used, over = !cap || used > cap;
    return h("span", { class: "capbar" + (over ? " over" : ""), "aria-hidden": "true" }, h("i", { style: "width:" + (cap ? clampPct(used / cap * 100) : 100) + "%" }));
  }
  function pickGroup(title, why, key, cat, show, multi) {
    const d = G.design;
    return h("div", { class: "grp" }, h("h3", {}, title), h("p", { class: "why" }, why),
      h("div", { class: "sgrid" }, Object.entries(cat).map(([id, it]) => {
        const on = multi ? d.payloads.includes(id) : d[key] === id;
        return h("button", { class: "pick", "aria-pressed": on, onclick: () => {
          if (multi) { const A0 = MD.analyse(d), had = d.payloads.includes(id), s = new Set(d.payloads); s.has(id) ? s.delete(id) : s.add(id); d.payloads = [...s]; logChange((had ? "Removed " : "Installed ") + it.name, A0, MD.analyse(d)); G.approved.clear(); persist(); render(true); } else setD(key, id);
        } }, MR.mdArt.icon(key, id), h("span", { class: "pick-body" }, h("b", {}, it.name), it.note ? h("span", { class: "pick-note" }, it.note) : null, h("span", { class: "nums" }, show(it)), key === "launcher" ? capBar(it) : null));
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
  function craftSVG(d, A) {
    const wrap = document.createElement("figure"); wrap.className = "stage";
    wrap.innerHTML = MR.mdArt.craft(d);
    const cap = document.createElement("figcaption"); cap.className = "small dim";
    cap.textContent = MD.LAUNCHERS[d.launcher].name + " to " + MD.ORBITS[d.orbit].name + (A ? ", " + A.mass.used.toFixed(1) + " kg" : "");
    wrap.append(cap);
    const lg = document.createElement("ul"); lg.className = "legend";
    [MD.BUSES[d.bus].name, MD.SOLAR[d.solar].name, MD.BATTERY[d.battery].name, MD.COMMS[d.comms].name, MD.PROP[d.prop].name].concat(d.payloads.map((p) => MD.PAYLOADS[p].name)).forEach((t) => { const li = document.createElement("li"); li.textContent = t; lg.append(li); });
    wrap.append(lg);
    return wrap;
  }

  function forecast(A) {
    const od = A.valid ? MD.odds(G.design, 60) : null;
    if (!od) return h("p", { class: "small dim forecast" }, "Mission odds appear when the design can launch.");
    const pct = Math.round(od.win * 100);
    return h("div", { class: "forecast" }, h("p", { class: "small" }, h("b", {}, "Mission odds: "), pct + "% success", h("span", { class: "dim" }, " (" + od.n + " simulated flights)")), h("div", { class: "bar " + (pct < 50 ? "warn" : "") }, h("i", { style: "width:" + pct + "%" })));
  }
  function dashboard(A, sc) {
    const crit = (k) => sc.critical.includes(k) ? h("span", { class: "crit" }, "critical") : null;
    const res = (key, label, used, cap, text, over) => h("div", { class: "res" },
      h("div", { class: "row" }, h("span", {}, h("b", {}, label), crit(key), h("span", { class: "stat" + (over ? " bad" : "") }, over ? "over the limit" : used / (cap || 1) > 0.9 ? "tight" : "ok")), h("span", {}, text)),
      h("div", { class: "bar " + (over ? "bad" : used / (cap || 1) > 0.9 ? "warn" : "") }, h("i", { style: `width:${clampPct((used / (cap || 1)) * 100)}%` })),
      h("p", { class: "why" }, WHY[key]));
    return h("aside", { class: "dash side", tabindex: "0", "aria-label": "Your spacecraft and the six limits" }, craftSVG(G.design, A),
      (G.log || []).length ? h("ul", { class: "shiplog", "aria-label": "Ship log", "aria-live": "polite" }, G.log.map((t) => h("li", {}, t))) : null, h("div", { class: "hudcol card" }, h("h3", {}, "Mission dashboard"), h("div", { class: "hudgrid" },
      res("mass", "Mass", A.mass.used, A.mass.cap || 1, A.mass.cap ? `${num(A.mass.used)} / ${A.mass.cap} kg` : `${num(A.mass.used)} kg, this rocket cannot reach this orbit`, A.mass.used > A.mass.cap),
      res("power", "Power", A.power.load, Math.max(A.power.gen, 0.1), `use ${num(A.power.load)} W / make ${num(A.power.gen)} W`, A.power.gen < A.power.load),
      res("budget", "Budget", A.budget.used, A.budget.cap, `${num(A.budget.used)} / ${num(A.budget.cap)} M`, A.budget.used > A.budget.cap),
      res("data", "Data per day", A.data.perDay, Math.max(A.comms.downGB, 0.01), `make ${num(A.data.perDay, 2)} / send ${num(A.comms.downGB, 2)} GB`, A.comms.ratio < 0.5),
      res("comms", "Comms", A.comms.contactMin, 160, `${num(A.comms.contactMin, 0)} min/day at ${A.comms.rate} Mbps`, false),
      res("time", "Time to launch", A.time.weeks, A.time.deadline, `${num(A.time.weeks, 0)} / ${num(A.time.deadline, 0)} weeks`, A.time.weeks > A.time.deadline)),
      h("p", { class: "small" }, h("b", {}, "Science possible: "), `${num(A.science.potential, 0)} points (target ${sc.target})`),
      h("div", { class: "bar " + (A.science.potential >= sc.target ? "" : "warn") }, h("i", { style: `width:${clampPct(A.science.potential / sc.target * 100)}%` })),
      forecast(A),
      A.problems.map((p) => h("div", { class: "msg" }, p)),
      A.warnings.map((p) => h("div", { class: "msg warn" }, p))));
  }
  const GNG = { mass: "Mass", power: "Power", budget: "Budget", data: "Data", comms: "Comms", time: "Time" };
  function launchBar(A, canGo, note) {
    const gng = MD.goNoGo(A);
    return h("div", { class: "launchbar", role: "region", "aria-label": "Pre-launch check" },
      h("ul", { class: "gng" }, Object.keys(GNG).map((k) => h("li", { class: "gng-" + gng[k].toLowerCase().replace("-", "") }, h("i", { "aria-hidden": "true" }), h("span", {}, GNG[k]), h("b", {}, gng[k])))),
      h("div", { class: "lb-actions" }, note, h("button", { class: "btn primary big go-btn", disabled: !canGo, onclick: launch }, "Launch mission")));
  }

  const holder = (roleId) => { const i = MD.assignRoles(G.players).findIndex((rs) => rs.includes(roleId)); return G.playerNames[i] || "Player " + (i + 1); };
  const meter = (label, frac, text) => h("li", {}, h("span", {}, label), h("div", { class: "bar" }, h("i", { style: "width:" + Math.round(frac * 100) + "%" })), h("b", {}, text));
  function teamBoard(A, roles) {
    const rr = MD.roleReport(A), met = roles.filter((r) => rr[r].ok).length, cur = rr[G.role], role = MD.ROLES[G.role];
    return h("section", { class: "team card", "aria-label": "Team board" },
      h("h3", {}, "Team board: " + G.team),
      h("ul", { class: "meters" }, meter("Harmony", met / roles.length, met + " of " + roles.length + " goals met"), meter("Ready", G.approved.size / roles.length, G.approved.size + " of " + roles.length + " ready")),
      h("div", { class: "roles rolecards", role: "tablist" }, roles.map((r) => {
        const icon = MR.mdArt.icon("role", r);
        return h("button", { role: "tab", "aria-selected": G.role === r, class: "rolecard" + (G.approved.has(r) ? " ok" : "") + (rr[r].ok ? "" : " warn"), onclick: () => { G.role = r; render(true); } },
          icon, h("span", { class: "rc-body" }, h("b", {}, MD.ROLES[r].name), h("span", { class: "rc-who" }, holder(r)), h("span", { class: "rc-state" }, (rr[r].ok ? "Goal met" : "Needs work") + (G.approved.has(r) ? " · Ready" : ""))));
      })),
      h("div", { class: "msg role-detail" }, h("b", {}, `Now playing: ${holder(G.role)} (${role.name})`), h("p", {}, "Goal: " + role.goal),
        cur.ok ? h("p", {}, "This goal is met right now. Tell the others when you are ready.") : h("p", {}, cur.note + " Ask for help: " + cur.needs.map((id) => MD.ROLES[id].name + " (" + holder(id) + ")").join(", ") + ".")));
  }
  function build() {
    const d = G.design, sc = MD.SCENARIOS[d.scenario], A = MD.analyse(d), roles = Object.keys(MD.ROLES);
    const owned = G.role === "all" ? ["launcher", "orbit", "ground", "bus", "solar", "battery", "prop", "payloads", "comms"] : roleKeys(G.role);
    const banner = G.mode === "sandbox" ? "Sandbox: limits only warn here and nothing is scored." : G.mode === "comp" && G.comp ? `${G.compNames[G.comp.idx]} is designing (team ${G.comp.idx + 1} of ${G.compN}). Same mission and same random events for every team. One launch per team.` : "";
    const panel = [banner ? h("div", { class: "msg", role: "status" }, banner) : null, G.note ? h("div", { class: "msg", role: "status" }, G.note) : null, tourCard(), h("div", { class: "hint briefing" }, h("span", { class: "kicker" }, "MISSION BRIEFING"), h("b", {}, sc.title + ": "), sc.objective, " ", sc.hint)];
    if (G.players > 1) panel.push(teamBoard(A, roles));
    owned.forEach((k) => panel.push(GROUPS[k]()));
    if (G.players > 1) panel.push(h("div", { class: "row-actions" },
      h("button", { class: "btn", onclick: () => { G.approved.has(G.role) ? G.approved.delete(G.role) : G.approved.add(G.role); render(true); } }, G.approved.has(G.role) ? "Take back approval" : `Approve as ${MD.ROLES[G.role].name}`),
      h("span", { class: "dim small" }, `Approved: ${G.approved.size} of ${roles.length}. Changing any choice clears approvals, so the team talks again.`)));
    const canGoNote = A.valid ? "" : "Launch is blocked: " + A.problems.length + " problem(s) to fix.";
    const canGo = G.mode === "sandbox" ? d.payloads.length > 0 : A.valid && (G.players === 1 || G.approved.size === roles.length);
    return h("div", {},
      h("div", { class: "steps" }, h("span", {}, "1 Mission"), h("span", { class: "on", "aria-current": "step" }, "2 Design"), h("span", {}, "3 Launch and results")),
      h("h1", {}, "Design your spacecraft"),
      h("div", { class: "build-grid" }, dashboard(A, sc), h("div", { class: "panel-col" }, panel)),
      h("div", { class: "row-actions" },
        h("button", { class: "btn", onclick: () => setPhase("setup") }, "Back to missions"),
        h("button", { class: "btn", onclick: () => saveDesign(A) }, "Save this design"),
        G.mode === "comp" ? null : h("button", { class: "btn", onclick: shareLink }, "Copy share link"),
        G.shareUrl ? h("input", { class: "txt", readonly: true, value: G.shareUrl, "aria-label": "Share link", style: "min-width:260px", onfocus: (e) => e.target.select() }) : null),
      launchBar(A, canGo, G.mode === "sandbox" && !A.valid ? h("span", { class: "dim small", role: "status" }, "Sandbox: this design breaks " + A.problems.length + " limit(s). You can still launch it.") : !A.valid ? h("span", { class: "dim small", role: "status" }, canGoNote + " Fix the items marked in the dashboard first.") : G.players > 1 && !canGo ? h("span", { class: "dim small" }, "Every role must approve.") : G.players > 1 ? h("span", { class: "ready-all", role: "status" }, "ALL HANDS READY") : null));
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
    G.newBadges = [];
    if (G.mode === "mission" && r.outcome !== "rejected") {
      const prog = store.get("md.progress", {}), st = MD.stars(r.outcome, r.score.total), p0 = prog[sc] || { stars: 0, best: 0 };
      prog[sc] = { stars: Math.max(p0.stars, st), best: Math.max(p0.best, r.score.total) }; store.set("md.progress", prog);
      const have = store.get("md.badges", []); G.newBadges = MD.badgesFor(G.design, r).filter((b) => !have.includes(b)); store.set("md.badges", have.concat(G.newBadges));
    }
    if (reduced() || !r.days.length && r.cause !== "launch") { setPhase("result"); soundFor(r); } else setPhase("flight");
  }
  const reduced = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const soundFor = (r) => MR.sfx(r.outcome === "success" ? "win" : r.outcome === "partial" ? "star" : "lose");
  function clearFlight() { (G.ft || []).forEach((f) => { if (typeof f === "function") f(); else clearTimeout(f); }); if (G.fi) clearInterval(G.fi); G.ft = []; G.fi = null; }
  function finishFlight() { clearFlight(); setPhase("result"); soundFor(G.result); }
  function flight() {
    const gauge = (id, label) => h("div", { class: "fl-g" }, h("span", {}, label), h("div", { class: "bar" }, h("i", { id: id + "Bar", style: "width:0%" })), h("b", { id }, "0"));
    const scene = h("div", { id: "liftoff", class: "fl-scene" });
    return h("div", { class: "flight" },
      h("div", { class: "steps" }, h("span", {}, "1 Mission"), h("span", {}, "2 Design"), h("span", { class: "on", "aria-current": "step" }, "3 Launch and results")),
      h("h1", {}, "Launch"),
      h("div", { class: "fl-grid" }, scene,
        h("div", { class: "fl-hud" }, h("div", { id: "flCount", class: "fl-count", "aria-live": "polite" }, "T-3"),
          h("div", { id: "flCraft", class: "fl-craft", "aria-hidden": "true" }),
          gauge("flDay", "Mission day"), gauge("flBat", "Battery"), gauge("flSci", "Science vs target"), gauge("flSto", "Onboard storage"),
          h("ul", { id: "flLog", class: "fl-log", "aria-live": "polite" }),
          h("button", { class: "btn", onclick: finishFlight }, "Skip to report"))));
  }
  function runFlight() {
    const Rz = G.result, sc = MD.SCENARIOS[G.design.scenario], bus = MD.BUSES[G.design.bus], $ = (id) => document.getElementById(id);
    const setG = (id, text, pct) => { const e = $(id), b = $(id + "Bar"); if (e) e.textContent = text; if (b) b.style.width = Math.max(0, Math.min(100, pct)) + "%"; };
    const host = $("liftoff"); if (!host) return;
    const anim = MR.mdFlight.play(host, G.design, Rz, {
      say: (t) => { const e = $("flCount"); if (e) e.textContent = t; },
      log: (t) => { const ul = $("flLog"); if (ul) ul.prepend(h("li", {}, t)); },
      sfx: (n) => MR.sfx(n),
      stage: (n) => { if (n === "orbit") { const c = $("flCraft"); if (c) { c.innerHTML = MR.mdArt.craft(G.design); c.classList.add("on"); } } },
      day: (x, evs) => {
        setG("flDay", x.day + " / " + sc.days, (x.day / sc.days) * 100); setG("flBat", x.batPct + "%", x.batPct);
        setG("flSci", Math.round(x.science) + " / " + sc.target, (x.science / sc.target) * 100); setG("flSto", x.storage.toFixed(1) + " GB", (x.storage / bus.storage) * 100);
        const c = $("flCraft"); if (c) { c.classList.toggle("flare", !!x.flare); c.classList.toggle("outage", !!x.outage || !!x.glitch); }
        const e = $("flCount"); if (e) e.textContent = "DAY " + x.day;
        (evs || []).forEach((ev) => { const ul = $("flLog"); if (ul) ul.prepend(h("li", {}, "Day " + ev.day + ": " + ev.title + ". " + ev.text)); MR.sfx("event"); });
      },
      done: () => finishFlight(),
    });
    G.ft = [() => anim.stop()];
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

  function starsPanel(R) {
    const n = MD.stars(R.outcome, R.score.total), nb = (G.newBadges || []).map((id) => MD.BADGES.find((b) => b.id === id)).filter(Boolean);
    return h("div", { class: "starpanel" },
      h("ul", { class: "starrow", "aria-hidden": "true" }, [1, 2, 3].map((i) => h("li", { class: i <= n ? "on" : "", style: "animation-delay:" + i * 220 + "ms" }, "★"))),
      h("p", { class: "stars-text" }, n + " of 3 stars" + (n === 3 ? ": flawless" : n === 2 ? ". Score 92 or more for the third star." : n === 1 ? ": partial success" : "")),
      nb.length ? h("div", { class: "badgebox" }, nb.map((b) => h("div", { class: "badge-new", role: "status" }, h("b", {}, "New badge: " + b.name), h("span", {}, b.desc)))) : null);
  }
  function countUp(el) {
    const node = el.firstChild; if (!node) return; const end = parseInt(node.nodeValue, 10); if (!(end > 0)) return;
    const t0 = performance.now(); el.setAttribute("aria-label", "Score " + end + " of 100");
    const step = (t) => { const k = Math.min(1, (t - t0) / 700); node.nodeValue = String(Math.round(end * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
    node.nodeValue = "0"; requestAnimationFrame(step);
  }
  function result() {
    const R = G.result, sc = MD.SCENARIOS[G.design.scenario], S = R.score, p = S.parts, sandbox = G.mode === "sandbox", comp = G.mode === "comp";
    return h("div", {},
      h("div", { class: "steps" }, h("span", {}, "1 Mission"), h("span", {}, "2 Design"), h("span", { class: "on", "aria-current": "step" }, "3 Launch and results")),
      h("h1", {}, (comp ? G.compNames[G.comp.idx] + ": " : "") + OUT[R.outcome]),
      sandbox ? h("p", { class: "msg", role: "status" }, "Sandbox run. Science returned: " + R.science.toFixed(0) + " of " + sc.target + ". Nothing is scored.") : h("div", { class: "big-total" }, S.total, h("span", { class: "dim small" }, " / 100")),
      sandbox ? null : h("div", { class: "score" }, [["Mission performance", p.performance, 30], ["Science value", p.science, 20], ["Resource efficiency", p.efficiency, 20], ["Decision quality", p.decisions, 15], ["Teamwork", p.collab, 15]]
        .map(([n, v, m]) => h("div", {}, h("b", {}, `${v}/${m}`), h("span", {}, n)))),
      sandbox ? null : starsPanel(R),
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
      h("h3", {}, "How teamwork works"),
      h("ul", { class: "tight" },
        h("li", {}, "Pick 2 to 4 players. The game hands out four roles: Mission planner (rocket, orbit, ground stations), Spacecraft engineer (bus, panels, battery, propulsion), Science lead (instruments) and Communications lead (radio). With 2 players each holds two roles; with 3 the Science lead also holds Communications."),
        h("li", {}, "Pass the screen. Only the chosen role's parts are shown, so you must ask the others to change theirs."),
        h("li", {}, "Every role has a goal with a live status (Goal met or Needs work) and a note saying who can help. The Harmony bar counts goals met; it becomes the teamwork score (15 points)."),
        h("li", {}, "Launch needs every role to press Ready. Any change clears all Ready lights, so the team talks again before launching.")),
      h("p", {}, h("a", { href: "model.html" }, "Model notes: formulas, simplifications and NASA sources")),
      h("p", { class: "small dim" }, "All numbers are simplified for teaching. They are not data for any real rocket or spacecraft. Terrain data in the Mars game is from USGS."),
      h("button", { class: "btn", onclick: () => dlg.close() }, "Close"));
    dlg.showModal();
  });

  function render(keepScroll) {
    const y = window.scrollY;
    app.replaceChildren(G.phase === "setup" ? setup() : G.phase === "build" ? build() : G.phase === "flight" ? flight() : G.phase === "rank" ? rank() : G.phase === "compare" ? compare() : result());
    if (G.phase === "result" && !keepScroll && !reduced()) { const bt = app.querySelector(".big-total"); if (bt) countUp(bt); }
    if (keepScroll) window.scrollTo(0, y);
  }
  app.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("button"); if (b && !b.disabled) MR.sfx(b.classList.contains("pick") ? "pick" : "click"); });
  const snd = document.getElementById("sndBtn");
  if (snd) { const paint = () => { snd.textContent = "Sound: " + (MR.sfxOn() ? "on" : "off"); snd.setAttribute("aria-pressed", String(MR.sfxOn())); }; snd.addEventListener("click", () => { MR.sfxToggle(); paint(); }); paint(); }
  globalThis.MR.mdDebug = { G, render, launch };
  render();
})();
