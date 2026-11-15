// Mission Design: the animated mission. One SVG scene, drawn in code, driven by the real simulation result.
// Acts: countdown on the pad, ascent (Max-Q, stage separation, fairing jettison), satellite release, (Moon only: trans-lunar coast
// and an orbit-insertion burn), solar-wing deployment, then the 30 days in orbit: sunlight and eclipse, instrument sensing,
// ground-station contact, and the random events (solar flare, ground outage, glitch, wing deployment fault).
// Timings and the T+ clock are illustrative for teaching, not data about any real rocket. Reduced motion skips all of this.
(function () {
  const MR = (globalThis.MR = globalThis.MR || {}), MD = MR.MD;
  const NS = "http://www.w3.org/2000/svg";
  const ACC = "#e0703f", ACC2 = "#ff9a6e", INK = "#e8e8e8", DIM = "#a0a0a0", PANEL = "#26323f", CELL = "#3d5066";
  const W = 640, H = 420, CX = 320, CY = 212, R = 92;
  const clamp = (v, a, b) => Math.max(a == null ? 0 : a, Math.min(b == null ? 1 : b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const mix = (c1, c2, t) => "rgb(" + c1.map((v, i) => Math.round(lerp(v, c2[i], t))).join(",") + ")";
  const BODY = { u3: [12, 12], u6: [18, 12], u12: [24, 14] };
  const ORB = { leo: { rx: 175, ry: 42, rot: -14 }, sso: { rx: 165, ry: 40, rot: -62 }, polar: { rx: 165, ry: 38, rot: -90 }, lunar: { rx: 150, ry: 40, rot: -20 } };
  const clock = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

  // the player's own spacecraft, small. wL/wR are the wing groups, scaled from 0 to 1 while they deploy.
  function sat(d, p) {
    const [bw, bh] = BODY[d.bus] || BODY.u6, wings = d.solar === "wings";
    const wing = (s) => { let g = '<rect x="' + (s < 0 ? -30 : 0) + '" y="-6" width="30" height="12" fill="' + PANEL + '" stroke="' + DIM + '"/>'; for (let i = 1; i < 4; i++) { const x = (s < 0 ? -30 : 0) + i * 7.5; g += '<line x1="' + x + '" y1="-6" x2="' + x + '" y2="6" stroke="' + CELL + '"/>'; } return '<g id="' + p + (s < 0 ? "wL" : "wR") + '" transform="translate(' + (s * bw / 2) + ' 0)">' + g + "</g>"; };
    let s = wings ? wing(-1) + wing(1) : "";
    s += '<rect x="' + (-bw / 2) + '" y="' + (-bh / 2) + '" width="' + bw + '" height="' + bh + '" rx="1.5" fill="#2a2a2c" stroke="' + INK + '" stroke-width="1.2"/>';
    if (!wings) s += '<rect x="' + (-bw / 2 + 2) + '" y="' + (-bh / 2 + 2) + '" width="' + (bw - 4) + '" height="3" fill="' + PANEL + '"/>';
    s += '<circle cx="0" cy="2" r="2.4" fill="' + ACC + '"/><line x1="0" y1="' + (-bh / 2) + '" x2="0" y2="' + (-bh / 2 - 8) + '" stroke="' + INK + '"/><circle cx="0" cy="' + (-bh / 2 - 9) + '" r="1.8" fill="' + ACC2 + '"/>';
    if (d.comms !== "uhf") s += '<path d="M-5 ' + (-bh / 2 - 6) + ' Q0 ' + (-bh / 2 - 1) + ' 5 ' + (-bh / 2 - 6) + '" fill="none" stroke="' + INK + '"/>';
    if (d.prop && d.prop !== "none") s += '<rect x="-2.5" y="' + (bh / 2) + '" width="5" height="3.5" fill="#555"/>';
    return '<g id="' + p + 'sat">' + s + "</g>";
  }
  function deploy(root, p, d, left, right) {
    const bw = (BODY[d.bus] || BODY.u6)[0], l = root.querySelector("#" + p + "wL"), r = root.querySelector("#" + p + "wR");
    if (l) l.setAttribute("transform", "translate(" + (-bw / 2) + " 0) scale(" + Math.max(0.02, left) + " 1)");
    if (r) r.setAttribute("transform", "translate(" + (bw / 2) + " 0) scale(" + Math.max(0.02, right) + " 1)");
  }

  function rocket(launcher, d) {
    const ride = launcher === "rideshare", med = launcher === "medium", bw = ride ? 12 : 15, s1 = ride ? 96 : 112, s2 = ride ? 50 : 56, top = -(s1 + s2), fw = bw - 2;
    const stripe = '<rect x="' + -bw + '" y="' + (-s1 + 10) + '" width="' + bw * 2 + '" height="8" fill="' + ACC + '"/>';
    const flame = (id, w, l) => '<g id="' + id + '"><path d="M' + -w + ' 0 L' + w + ' 0 L0 ' + l + 'Z" fill="' + ACC + '"/><path d="M' + -w / 2 + ' 0 L' + w / 2 + ' 0 L0 ' + l * 0.68 + 'Z" fill="#ffd9a0"/></g>';
    let g = "";
    if (med) for (const s of [-1, 1]) g += '<g id="flSb' + (s < 0 ? "L" : "R") + '"><rect x="' + (s * (bw + 3) - 5) + '" y="-74" width="10" height="74" fill="#cfcfd2" stroke="' + INK + '"/><path d="M' + (s * (bw + 3) - 5) + ' -74 L' + (s * (bw + 3)) + ' -88 L' + (s * (bw + 3) + 5) + ' -74Z" fill="' + ACC + '"/><g transform="translate(' + s * (bw + 3) + ' 0)">' + flame("flSbF" + (s < 0 ? "L" : "R"), 4, 26) + "</g></g>";
    g += '<g id="flS1"><rect x="' + -bw + '" y="' + -s1 + '" width="' + bw * 2 + '" height="' + s1 + '" fill="#d8d8da" stroke="' + INK + '" stroke-width="1.5"/>' + stripe +
      (ride ? "" : '<path d="M' + -bw + ' -2 L' + (-bw - 12) + ' 10 L' + -bw + ' 6Z M' + bw + ' -2 L' + (bw + 12) + ' 10 L' + bw + ' 6Z" fill="' + ACC + '"/>') +
      '<path d="M-9 0 L9 0 L12 10 L-12 10Z" fill="#555"/></g>';
    g += '<g id="flS2"><rect x="' + -fw + '" y="' + top + '" width="' + fw * 2 + '" height="' + s2 + '" fill="#cfcfd2" stroke="' + INK + '" stroke-width="1.5"/><path d="M-6 ' + (-s1) + ' L6 ' + (-s1) + ' L8 ' + (-s1 + 6) + ' L-8 ' + (-s1 + 6) + 'Z" fill="#555"/></g>';
    g += '<g id="flSatA" transform="translate(0 ' + (top - 20) + ')"><g transform="scale(.7)">' + sat(d, "a") + "</g></g>";
    g += '<g id="flFL"><path d="M0 ' + top + ' H' + -fw + ' V' + (top - 26) + ' C' + -fw + ' ' + (top - 50) + ' -5 ' + (top - 66) + ' 0 ' + (top - 72) + 'Z" fill="#d8d8da" stroke="' + INK + '"/></g>';
    g += '<g id="flFR"><path d="M0 ' + top + ' H' + fw + ' V' + (top - 26) + ' C' + fw + ' ' + (top - 50) + ' 5 ' + (top - 66) + ' 0 ' + (top - 72) + 'Z" fill="#bdbdc0" stroke="' + INK + '"/></g>';
    g += '<g transform="translate(0 10)">' + flame("flF1", 9, 52) + '</g><g transform="translate(0 ' + (-s1 + 6) + ')" id="flF2w" opacity="0">' + flame("flF2", 6, 28) + "</g>";
    return { svg: g, k: { rideshare: 0.9, small: 1, medium: 1.05 }[launcher] || 1 };
  }

  function build(d, moon) {
    const rk = rocket(d.launcher, d), stars = [];
    for (let i = 0; i < 70; i++) stars.push('<circle cx="' + ((i * 97 + 13) % W) + '" cy="' + ((i * 53 + 7) % H) + '" r="' + (i % 5 ? 0.8 : 1.5) + '" fill="#cfd6e4" opacity="' + (0.35 + (i % 4) * 0.15) + '"/>');
    const star = stars.join("");
    const o = ORB[d.orbit] || ORB.leo;
    const earthFill = '<rect x="' + (CX - R) + '" y="' + (CY - R) + '" width="' + 2 * R + '" height="' + 2 * R + '" fill="#1d4e7a"/>' +
      '<g id="flLand" fill="#3f7a4e"><g id="flLandA"><path d="M10 150 q20 -34 58 -22 q34 10 26 44 q-12 34 -46 36 q-34 0 -38 -58z"/><path d="M120 120 q30 -22 62 4 q24 24 -4 50 q-30 14 -52 -6 q-16 -26 -6 -48z"/><path d="M198 186 q22 -10 40 6 q10 22 -12 34 q-22 4 -30 -16z"/><path d="M70 216 q16 -8 28 4 q4 16 -14 20 q-16 -2 -14 -24z"/></g><g id="flLandB"></g></g>' +
      '<g fill="#e8eef5" opacity=".5"><ellipse cx="' + (CX - 30) + '" cy="' + (CY - 40) + '" rx="40" ry="5"/><ellipse cx="' + (CX + 24) + '" cy="' + (CY + 34) + '" rx="46" ry="5"/></g>';
    const moonFill = '<rect x="' + (CX - R) + '" y="' + (CY - R) + '" width="' + 2 * R + '" height="' + 2 * R + '" fill="#8d8d90"/><path d="M' + (CX - 50) + ' ' + (CY - 30) + ' q28 -30 60 -8 q16 24 -8 44 q-34 6 -52 -36z" fill="#76767a"/><path d="M' + (CX + 10) + ' ' + (CY + 30) + ' q30 -16 54 6 q4 24 -22 30 q-28 -2 -32 -36z" fill="#76767a"/>' +
      [[-30, 40, 12], [40, -50, 9], [-62, -6, 7], [58, 8, 14], [0, -20, 6], [-10, 66, 8]].map(([x, y, r]) => '<circle cx="' + (CX + x) + '" cy="' + (CY + y) + '" r="' + r + '" fill="#6a6a6e" stroke="#9c9ca0"/>').join("");
    const aur = d.scenario === "aurora" ? '<g id="flAur" fill="none" stroke="#5dff9a" stroke-linecap="round"><path d="M' + (CX - 52) + ' ' + (CY - R + 6) + ' Q' + CX + ' ' + (CY - R - 30) + ' ' + (CX + 52) + ' ' + (CY - R + 6) + '" stroke-width="7" opacity=".25"/><path d="M' + (CX - 44) + ' ' + (CY - R + 4) + ' Q' + CX + ' ' + (CY - R - 22) + ' ' + (CX + 44) + ' ' + (CY - R + 4) + '" stroke-width="3" opacity=".7"/><path d="M' + (CX - 52) + ' ' + (CY + R - 6) + ' Q' + CX + ' ' + (CY + R + 30) + ' ' + (CX + 52) + ' ' + (CY + R - 6) + '" stroke-width="7" opacity=".25"/><path d="M' + (CX - 44) + ' ' + (CY + R - 4) + ' Q' + CX + ' ' + (CY + R + 22) + ' ' + (CX + 44) + ' ' + (CY + R - 4) + '" stroke-width="3" opacity=".7"/></g>' : "";
    const gsPos = d.ground === "network" ? [[-46, 46], [34, 58], [-18, -52]] : [[-40, 44]];
    const gs = moon ? "" : gsPos.map(([x, y]) => '<path d="M' + (CX + x) + ' ' + (CY + y - 6) + ' l5 10 h-10z" fill="#ffd9a0" stroke="#05060a"/>').join("");
    const farEarth = moon ? '<g><circle cx="588" cy="64" r="24" fill="#1d4e7a" stroke="#6fb4ff" stroke-opacity=".6" stroke-width="2"/><path d="M574 58 q10 -10 22 -2 q4 10 -8 16 q-12 0 -14 -14z" fill="#3f7a4e"/></g>' : "";
    const rays = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => '<line x1="36" y1="' + CY + '" x2="' + (36 + 30 * Math.cos(i * Math.PI / 4)) + '" y2="' + (CY + 30 * Math.sin(i * Math.PI / 4)) + '" stroke="#ffd9a0" stroke-width="2" opacity=".5"/>').join("");
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="flscene" role="img" aria-label="Animated view of your mission: launch, orbit and the days of operation">' +
      '<defs><linearGradient id="flTerm" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".48" stop-color="#000" stop-opacity="0"/><stop offset=".72" stop-color="#000014" stop-opacity=".72"/><stop offset="1" stop-color="#000014" stop-opacity=".85"/></linearGradient>' +
      '<linearGradient id="flLimb" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6fb4ff"/><stop offset=".02" stop-color="#2f7ab8"/><stop offset="1" stop-color="#0f2f55"/></linearGradient>' +
      '<linearGradient id="flShade" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000014" stop-opacity=".5"/><stop offset="1" stop-color="#000014" stop-opacity="0"/></linearGradient><clipPath id="flClip"><circle cx="' + CX + '" cy="' + CY + '" r="' + R + '"/></clipPath><clipPath id="flScreen"><rect width="' + W + '" height="' + H + '"/></clipPath></defs>' +
      '<g id="flAsc" clip-path="url(#flScreen)"><rect id="flSky" width="' + W + '" height="' + H + '" fill="#5b86b5"/><g id="flStars" opacity="0">' + star + "</g>" +
      '<circle id="flHorizon" cx="' + CX + '" cy="' + (H + 900) + '" r="900" fill="url(#flLimb)" opacity="0"/>' +
      '<g id="flClouds" fill="#fff" opacity=".22"><ellipse cx="90" cy="160" rx="70" ry="9"/><ellipse cx="520" cy="230" rx="90" ry="11"/><ellipse cx="380" cy="100" rx="60" ry="8"/><ellipse cx="120" cy="300" rx="80" ry="10"/></g>' +
      '<g id="flGround"><rect x="0" y="360" width="' + W + '" height="140" fill="#1a1a1d"/><path d="M0 360 H' + W + '" stroke="' + ACC + '" stroke-width="2"/><rect x="238" y="140" width="9" height="220" fill="#34373c" stroke="#555"/><path d="M238 170 L247 200 M247 170 L238 200 M238 220 L247 250 M247 220 L238 250 M238 270 L247 300 M247 270 L238 300" stroke="#555"/><path d="M247 200 H' + (CX - 26) + ' M247 270 H' + (CX - 26) + '" stroke="#777" stroke-width="3"/><g id="flSmoke" fill="#cfd2d8" opacity="0"><circle cx="' + (CX - 40) + '" cy="350" r="22"/><circle cx="' + (CX + 40) + '" cy="352" r="26"/><circle cx="' + CX + '" cy="356" r="30"/></g></g>' +
      '<g id="flRocket" transform="translate(' + CX + ' 360)"><g id="flRk" transform="scale(' + rk.k + ')">' + rk.svg + "</g></g>" +
      '<g id="flBoom" opacity="0"><circle cx="' + CX + '" cy="200" r="10" fill="#fff"/><circle cx="' + CX + '" cy="200" r="10" fill="' + ACC + '" opacity=".8"/></g><g id="flDebris" opacity="0" stroke="' + INK + '" stroke-width="2"><line x1="0" y1="0" x2="18" y2="-8"/><line x1="0" y1="0" x2="-16" y2="-12"/><line x1="0" y1="0" x2="10" y2="14"/><line x1="0" y1="0" x2="-12" y2="12"/><line x1="0" y1="0" x2="2" y2="-20"/></g></g>' +
      // Moon transfer
      '<g id="flXfer" opacity="0" clip-path="url(#flScreen)"><rect width="' + W + '" height="' + H + '" fill="#05060a"/>' + star + '<circle id="flXe" cx="110" cy="250" r="80" fill="#1d4e7a" stroke="#6fb4ff" stroke-width="3" stroke-opacity=".6"/><circle id="flXm" cx="540" cy="190" r="8" fill="#8d8d90"/><path d="M170 262 Q330 70 450 190" fill="none" stroke="' + ACC + '" stroke-dasharray="4 6"/><g id="flXc"><g transform="scale(1.1)">' + sat(d, "x") + '</g><g id="flXf" opacity="0" transform="translate(-24 0) rotate(90)"><path d="M-4 0 L4 0 L0 22Z" fill="' + ACC + '"/><path d="M-2 0 L2 0 L0 13Z" fill="#ffd9a0"/></g></g></g>' +
      // orbit
      '<g id="flOrb" opacity="0" clip-path="url(#flScreen)"><rect width="' + W + '" height="' + H + '" fill="#05060a"/>' + star + '<g id="flSun"><circle cx="36" cy="' + CY + '" r="20" fill="#ffd9a0"/>' + rays + '</g>' + farEarth +
      '<rect x="' + CX + '" y="' + (CY - R) + '" width="' + (W - CX) + '" height="' + 2 * R + '" fill="url(#flShade)"/>' +
      '<g transform="translate(' + CX + " " + CY + ") rotate(" + o.rot + ')"><path d="M' + o.rx + " 0 A" + o.rx + " " + o.ry + ' 0 0 0 ' + -o.rx + ' 0" fill="none" stroke="' + ACC + '" stroke-dasharray="3 6" opacity=".7"/></g>' +
      '<g clip-path="url(#flClip)">' + (moon ? moonFill : earthFill) + '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="url(#flTerm)"/></g>' +
      (moon ? "" : '<circle cx="' + CX + '" cy="' + CY + '" r="' + (R + 2) + '" fill="none" stroke="#6fb4ff" stroke-opacity=".55" stroke-width="3"/>') + aur + gs +
      '<g transform="translate(' + CX + " " + CY + ") rotate(" + o.rot + ')"><path d="M' + o.rx + " 0 A" + o.rx + " " + o.ry + ' 0 0 1 ' + -o.rx + ' 0" fill="none" stroke="' + ACC + '" stroke-dasharray="3 6"/></g>' +
      '<g id="flFlare" opacity="0" stroke="#ffd9a0" stroke-width="3" stroke-dasharray="10 12"><line x1="60" y1="' + (CY - 60) + '" x2="' + (CX - R - 10) + '" y2="' + (CY - 30) + '"/><line x1="60" y1="' + CY + '" x2="' + (CX - R - 10) + '" y2="' + CY + '"/><line x1="60" y1="' + (CY + 60) + '" x2="' + (CX - R - 10) + '" y2="' + (CY + 30) + '"/></g>' +
      '<g id="flBeam" opacity="0"><polygon id="flCone" points="0,0 0,0 0,0" fill="' + (d.scenario === "moon" ? "#9fd0ff" : ACC2) + '" opacity=".3"/><line id="flScan" x1="0" y1="0" x2="0" y2="0" stroke="' + INK + '" stroke-width="2"/></g>' +
      '<g id="flField" opacity="0" fill="none" stroke="#5dff9a"><circle r="22" stroke-dasharray="3 4"/><circle r="36" stroke-dasharray="2 6"/></g>' +
      '<line id="flLink" x1="0" y1="0" x2="0" y2="0" stroke="#ffd9a0" stroke-width="2" stroke-dasharray="5 5" opacity="0"/><g id="flPk" opacity="0" fill="#ffd9a0"><circle r="3"/><circle r="3"/><circle r="3"/><circle r="3"/></g>' +
      '<g id="flSatG"><g id="flSatS" transform="scale(1)">' + sat(d, "o") + "</g></g></g>" +
      // overlay text
      '<g font-family="Consolas, monospace" paint-order="stroke" stroke="#05060a" stroke-width="4" stroke-linejoin="round"><text id="flClockT" x="16" y="28" fill="' + INK + '" font-size="16" font-weight="700">T-3</text>' +
      '<text id="flBanner" x="16" y="56" fill="' + ACC2 + '" font-size="20" font-weight="700" text-anchor="start" opacity="0"></text>' +
      '<text id="flLabel" x="16" y="' + (H - 16) + '" fill="' + INK + '" font-size="15" font-weight="700"></text>' +
      '<text id="flOrbName" x="' + (W - 16) + '" y="28" fill="' + DIM + '" font-size="13" text-anchor="end">' + (MD.ORBITS[d.orbit] ? MD.ORBITS[d.orbit].name : "") + "</text></g></svg>";
  }

  MR.mdFlight = {
    // host: element to draw in. hud: { say(text), log(text), day(dayRecord, eventsOfThatDay), stage(name), done(), sfx(name) }
    play(host, d, Rz, hud) {
      const sc = MD.SCENARIOS[d.scenario], moon = d.orbit === "lunar", fail = Rz.cause === "launch", o = ORB[d.orbit] || ORB.leo;
      host.innerHTML = build(d, moon);
      const q = (id) => host.querySelector("#" + id), set = (id, a, v) => { const e = q(id); if (e) e.setAttribute(a, v); };
      const op = (id, v) => set(id, "opacity", v);
      const tr = (id, v) => set(id, "transform", v);
      const T = { count: 1500, asc: 7000, sep: 1800, xfer: moon ? 4000 : 0, loi: moon ? 1300 : 0, dep: 2200, day: 220 };
      const tAsc = T.count, tSep = tAsc + T.asc, tXf = tSep + T.sep, tLoi = tXf + T.xfer, tDep = tLoi + T.loi, tOps = tDep + T.dep, tEnd = tOps + sc.days * T.day;
      const med = d.launcher === "medium", ride = d.launcher === "rideshare", s1h = ride ? 96 : 112;
      const hasCone = d.payloads.some((p) => ["camera", "multi", "lcam", "spectro"].includes(p)), hasField = d.payloads.some((p) => ["mag", "plasma"].includes(p));
      const wingFault = Rz.events.some((e) => e.title === "Wing deployment");
      const stations = d.ground === "network" ? [[-46, 46], [34, 58], [-18, -52]] : [[-40, 44]];
      const marks = [
        [0.12, "TOWER CLEAR", "Tower clear. The rocket is climbing."], [0.26, "MAX-Q", "Max-Q: the strongest air pressure on the rocket. Engines throttle."],
        med ? [0.36, "BOOSTERS OFF", "Side boosters burn out and separate."] : null, [0.52, "STAGE SEP", "Main engine cutoff. The first stage drops away."],
        [0.58, "UPPER STAGE", "The upper stage ignites."], [0.68, "FAIRING OFF", "The nose cone splits and falls away. Your spacecraft is exposed."], [0.94, "ORBIT SPEED", "Upper stage engine cutoff. Orbital speed reached."],
      ].filter(Boolean);
      const fired = new Set(); let raf = 0, stopped = false, last = "", lastCount = "", banner = { text: "", until: 0 }, curDay = -1, state = { flare: false, outage: false, glitch: false, powered: true }, deployed = false, stageDone = {}, boom = 0;
      const stage = (n) => { if (!stageDone[n]) { stageDone[n] = 1; hud.stage && hud.stage(n); } };
      const say = (t) => hud.say && hud.say(t);
      const label = (t) => { if (t !== last) { last = t; const e = q("flLabel"); if (e) e.textContent = t; } };
      const showBanner = (text, ms, now) => { banner = { text, until: now + ms }; const e = q("flBanner"); if (e) e.textContent = text; };
      const sky = (t) => mix([91, 134, 181], [5, 6, 10], Math.pow(clamp(t), 0.7));

      function ascent(t, now) {
        op("flAsc", 1); op("flXfer", 0); op("flOrb", 0);
        const rise = 70 * ease(t / 0.15), g = rise + Math.max(0, t - 0.15) * 1100;
        const shake = fail && t > 0.38 ? 2.5 : (1 + 2.2 * Math.max(0, 1 - Math.abs(t - 0.26) / 0.12)) * (t < 0.52 ? 1 : 0.4);
        tr("flRocket", "translate(" + (CX + Math.sin(now / 23) * shake).toFixed(1) + " " + (360 - rise + Math.cos(now / 31) * shake * 0.6).toFixed(1) + ")");
        tr("flGround", "translate(0 " + g.toFixed(1) + ")"); set("flSky", "fill", sky(t));
        op("flStars", clamp((t - 0.3) / 0.4)); op("flClouds", t < 0.5 ? 0.22 * (1 - t / 0.5) : 0); tr("flClouds", "translate(0 " + (g * 1.6).toFixed(1) + ")");
        op("flSmoke", clamp(1 - t / 0.2)); tr("flSmoke", "translate(0 0) scale(" + (1 + t * 3).toFixed(2) + " " + (1 + t).toFixed(2) + ")"); set("flSmoke", "style", "transform-origin:" + CX + "px 356px");
        const horizon = clamp((t - 0.45) / 0.55); op("flHorizon", horizon > 0 ? 1 : 0); set("flHorizon", "cy", H + 900 - horizon * 160);
        const f = 0.8 + 0.35 * Math.sin(now / 40) + 0.15 * Math.sin(now / 13);
        tr("flF1", "scale(1 " + f.toFixed(2) + ")"); op("flF1", t < 0.52 ? 1 : 0);
        if (med) for (const s of ["L", "R"]) { tr("flSbF" + s, "scale(1 " + f.toFixed(2) + ")"); const u = Math.max(0, t - 0.36), sd = s === "L" ? -1 : 1; tr("flSb" + s, "translate(" + (sd * u * 420).toFixed(1) + " " + (u * 260).toFixed(1) + ") rotate(" + (sd * u * 90).toFixed(1) + " 0 -40)"); op("flSb" + s, clamp(1 - u * 3.4)); }
        const u1 = Math.max(0, t - 0.52); tr("flS1", "translate(" + (u1 * 40).toFixed(1) + " " + (u1 * 480).toFixed(1) + ") rotate(" + (u1 * 70).toFixed(1) + " 0 -50)"); op("flS1", clamp(1 - u1 * 3));
        op("flF2w", t > 0.58 ? 1 : 0); tr("flF2", "scale(1 " + (f * 0.9).toFixed(2) + ")");
        const uf = Math.max(0, t - 0.68); tr("flFL", "translate(" + (-uf * 700).toFixed(1) + " " + (uf * 120).toFixed(1) + ") rotate(" + (-uf * 300).toFixed(1) + ")"); tr("flFR", "translate(" + (uf * 700).toFixed(1) + " " + (uf * 120).toFixed(1) + ") rotate(" + (uf * 300).toFixed(1) + ")"); op("flFL", clamp(1 - uf * 2.2)); op("flFR", clamp(1 - uf * 2.2));
        const c = q("flClockT"); if (c) c.textContent = "T+" + clock(t * 540);
        marks.forEach(([m, s, l]) => { if (t >= m && !fired.has(m)) { fired.add(m); say(s); hud.log && hud.log("T+" + clock(m * 540) + " " + l); hud.sfx && hud.sfx("count"); showBanner(s, 1600, now); } });
        label(t < 0.52 ? "ASCENT: first stage burning" : t < 0.68 ? "ASCENT: upper stage burning" : "ASCENT: climbing to orbit speed");
      }
      function failure(t, now) {
        // the rocket is lost at t = 0.42 of the ascent: flash, expanding fireball, debris
        const u = clamp((now - boom) / 1400);
        op("flRocket", u > 0 ? 0 : 1); op("flBoom", u > 0 ? 1 - u : 0);
        set("flBoom", "transform", "translate(0 0)"); const b = q("flBoom"); if (b) { [...b.children].forEach((c, i) => c.setAttribute("r", (i ? 24 : 10) + u * (i ? 120 : 190))); }
        const deb = q("flDebris"); if (deb) { deb.setAttribute("opacity", u > 0 ? 1 - u : 0); deb.setAttribute("transform", "translate(" + CX + " 200) scale(" + (1 + u * 9).toFixed(2) + ")"); }
        label("LAUNCH FAILURE");
      }
      function separation(t) {
        const u = ease(t);
        op("flAsc", 1); tr("flSatA", "translate(0 " + (-(s1h + (ride ? 50 : 56)) - 20 - u * 90) + ") scale(" + (1 + u * 0.8).toFixed(2) + ")");
        op("flFL", 0); op("flFR", 0); tr("flS2", "translate(0 " + (u * 40).toFixed(1) + ")"); op("flF2w", 0);
        const c = q("flClockT"); if (c) c.textContent = "T+" + clock(540 + t * 60);
        label("SATELLITE SEPARATION");
      }
      function transfer(t, now) {
        op("flAsc", 1 - clamp(t * 8)); op("flXfer", clamp(t * 8)); op("flOrb", 0);
        const e = ease(t); set("flXe", "r", lerp(80, 36, e)); set("flXe", "cx", lerp(110, 70, e)); set("flXm", "r", lerp(8, 62, e * e)); set("flXm", "cx", lerp(540, 520, e)); set("flXm", "cy", lerp(190, 200, e));
        const p = (a, b, c, tt) => (1 - tt) * (1 - tt) * a + 2 * (1 - tt) * tt * b + tt * tt * c, px = p(170, 330, 450, t), py = p(262, 70, 190, t);
        tr("flXc", "translate(" + px.toFixed(1) + " " + py.toFixed(1) + ")"); op("flXf", 0);
        const c = q("flClockT"); if (c) c.textContent = "DAY 0 · TRANSIT"; label("TRANS-LUNAR COAST: leaving Earth for the Moon");
      }
      function burn(t, now) {
        op("flAsc", 0); op("flXfer", 1 - clamp((t - 0.7) * 3.3)); op("flOrb", 0);
        set("flXm", "r", 62); tr("flXc", "translate(" + (450 - t * 14).toFixed(1) + " " + (190 + t * 8).toFixed(1) + ")"); op("flXf", 0.6 + 0.4 * Math.sin(now / 40));
        const c = q("flClockT"); if (c) c.textContent = "DAY 0 · ORBIT BURN"; label("ENGINE BURN: lunar orbit insertion");
      }
      let theta = 0.4, spin = 0;
      function orbit(now, dt, opsDay) {
        theta += dt * 0.0026; spin += dt * 0.02;
        const lx = o.rx * Math.cos(theta), ly = o.ry * Math.sin(theta), r = o.rot * Math.PI / 180;
        const x = lx * Math.cos(r) - ly * Math.sin(r), y = lx * Math.sin(r) + ly * Math.cos(r), depth = Math.sin(theta), px = CX + x, py = CY + y, dist = Math.hypot(x, y);
        const hidden = depth < 0 && dist < R * 1.03, shadow = hidden && x > 0;
        const lost = Rz.outcome === "lost" && curDay >= Rz.days.length - 1 && curDay >= 0;
        tr("flSatG", "translate(" + px.toFixed(1) + " " + py.toFixed(1) + ")" + (lost ? " rotate(" + (spin * 3).toFixed(0) + ")" : ""));
        op("flSatG", hidden ? 0 : lost ? 0.5 : (state.powered ? 1 : 0.55) * (state.glitch ? 0.5 + 0.5 * Math.sin(now / 90) : 1));
        // spinning body texture
        if (!moon) { const wob = -(spin % 260); tr("flLandA", "translate(" + wob.toFixed(1) + " 0)"); const lb = q("flLandB"); if (lb && !lb.firstChild) lb.innerHTML = q("flLandA").innerHTML; tr("flLandB", "translate(" + (wob + 260).toFixed(1) + " 0)"); }
        // sun and flare
        op("flFlare", state.flare ? 0.55 + 0.4 * Math.sin(now / 90) : 0); set("flFlare", "stroke-dashoffset", String(-(now / 14) % 22));
        set("flSun", "transform", state.flare ? "scale(" + (1 + 0.08 * Math.sin(now / 80)).toFixed(3) + ")" : "scale(1)"); set("flSun", "style", "transform-origin:36px " + CY + "px");
        // sensing
        const ux = x / (dist || 1), uy = y / (dist || 1), sensing = opsDay && !hidden && depth > 0 && !shadow && state.powered && !state.glitch && dist > 4;
        const nx = -uy, ny = ux, sx = CX + ux * R * 0.97, sy = CY + uy * R * 0.97;
        if (hasCone && sensing) { op("flBeam", 1); set("flCone", "points", px.toFixed(1) + "," + (py + 6).toFixed(1) + " " + (sx + nx * 18).toFixed(1) + "," + (sy + ny * 18).toFixed(1) + " " + (sx - nx * 18).toFixed(1) + "," + (sy - ny * 18).toFixed(1)); const s = (Math.sin(now / 120) + 1) / 2; set("flScan", "x1", sx + nx * 18 * (s * 2 - 1)); set("flScan", "y1", sy + ny * 18 * (s * 2 - 1)); set("flScan", "x2", sx + nx * 18 * (s * 2 - 1) * 0.98); set("flScan", "y2", sy + ny * 18 * (s * 2 - 1) * 0.98); } else op("flBeam", 0);
        if (hasField && opsDay && !hidden && state.powered && !state.glitch) { op("flField", 0.4 + 0.4 * Math.sin(now / 160)); tr("flField", "translate(" + px.toFixed(1) + " " + py.toFixed(1) + ")"); } else op("flField", 0);
        const au = q("flAur"); if (au) au.setAttribute("opacity", (0.65 + 0.35 * Math.sin(now / 300)).toFixed(2));
        // ground contact
        let contact = null;
        if (opsDay && !hidden && state.powered) {
          if (moon) contact = { x: 588, y: 64, name: "Earth" };
          else if (depth > 0) { let best = 1e9; stations.forEach(([sx2, sy2], i) => { const dd = Math.hypot(px - (CX + sx2), py - (CY + sy2)); if (dd < best && dd < 190) { best = dd; contact = { x: CX + sx2, y: CY + sy2, name: "ground station " + (i + 1) }; } }); }
        }
        const link = q("flLink"), pk = q("flPk");
        if (contact) {
          link.setAttribute("x1", px); link.setAttribute("y1", py); link.setAttribute("x2", contact.x); link.setAttribute("y2", contact.y);
          link.setAttribute("opacity", 1); link.setAttribute("stroke", state.outage ? "#ff5d5d" : "#ffd9a0"); link.setAttribute("stroke-dashoffset", String(-(now / 40) % 10));
          if (!state.outage) { pk.setAttribute("opacity", 1); [...pk.children].forEach((c, i) => { const f = ((now / 900) + i / 4) % 1; c.setAttribute("cx", lerp(px, contact.x, f)); c.setAttribute("cy", lerp(py, contact.y, f)); }); } else pk.setAttribute("opacity", 0);
        } else { link.setAttribute("opacity", 0); pk.setAttribute("opacity", 0); }
        if (opsDay) {
          const purpose = { coast: "OBSERVING: imaging the coastline", aurora: "MEASURING: magnetic field and charged particles", moon: "MAPPING: the lunar surface" }[d.scenario] || "OBSERVING";
          if (lost) label("SIGNAL LOST"); else if (!state.powered) label("NO POWER: instruments off"); else if (state.flare) label("SOLAR FLARE: solar cells weakened"); else if (state.glitch) label("COMPUTER GLITCH: safe mode, instruments paused");
          else if (shadow) label("ECLIPSE: in Earth's shadow, running on battery".replace("Earth's", moon ? "the Moon's" : "Earth's")); else if (contact && state.outage) label("NO CONTACT: " + (moon ? "ground antenna" : contact.name) + " is offline. Data stays on board.");
          else if (contact) label("DOWNLINK: sending data to " + contact.name); else if (sensing) label(purpose); else label("SUNLIGHT: panels charging");
        }
      }

      let prev = 0; const t0 = performance.now(), lastEv = { n: -1 };
      function frame(now) {
        if (stopped) return;
        const et = now - t0, dt = Math.min(60, prev ? now - prev : 16); prev = now;
        if (et < tAsc) {
          op("flAsc", 1); const c = q("flClockT"), n = et < 500 ? "T-3" : et < 1000 ? "T-2" : "T-1";
          if (c) c.textContent = n; if (n !== lastCount) { lastCount = n; say(n); hud.sfx && hud.sfx("count"); }
          op("flSmoke", et > 1100 ? Math.min(1, (et - 1100) / 300) : 0); const f = et > 1100 ? 0.4 + 0.6 * Math.sin(now / 40) ** 2 : 0; op("flF1", et > 1100 ? 1 : 0); tr("flF1", "scale(1 " + (f * 0.6 + 0.2).toFixed(2) + ")");
          tr("flRocket", "translate(" + (CX + (et > 1100 ? Math.sin(now / 25) * 1.2 : 0)).toFixed(1) + " 360)"); label("COUNTDOWN: all systems GO");
        } else if (et < tSep) {
          if (!fired.has("go")) { fired.add("go"); say("LIFTOFF"); hud.log && hud.log("T+0:00 Liftoff. " + (MD.LAUNCHERS[d.launcher] ? MD.LAUNCHERS[d.launcher].name : "The rocket") + " leaves the pad."); hud.sfx && hud.sfx("launch"); showBanner("LIFTOFF", 1400, now); }
          const t = (et - tAsc) / T.asc;
          if (fail && t >= 0.42) { if (!boom) { boom = now; say("LAUNCH FAILURE"); hud.log && hud.log(Rz.reasons[0]); hud.sfx && hud.sfx("lose"); showBanner("LAUNCH FAILURE", 4000, now); } ascent(0.42, now); failure(t, now); if (now - boom > 2200) { stopped = true; hud.done(); return; } }
          else ascent(t, now);
        } else if (et < tXf) { separation((et - tSep) / T.sep); if (!fired.has("sep")) { fired.add("sep"); say("SEPARATION"); hud.log && hud.log("The upper stage releases your spacecraft."); showBanner("SPACECRAFT SEPARATED", 1500, now); } }
        else if (moon && et < tLoi) { if (!fired.has("tlc")) { fired.add("tlc"); say("TRANSIT"); hud.log && hud.log("Trans-lunar coast: the spacecraft leaves Earth orbit for the Moon (shown sped up)."); } transfer((et - tXf) / T.xfer, now); }
        else if (moon && et < tDep) { if (!fired.has("loi")) { fired.add("loi"); say("ORBIT BURN"); hud.log && hud.log("Engine burn: the Moon's gravity captures the spacecraft into lunar orbit."); hud.sfx && hud.sfx("event"); } burn((et - tLoi) / T.loi, now); }
        else if (et < tOps) {
          const u = (et - tDep) / T.dep; if (!deployed) { deployed = true; stage("orbit"); say(wingFault ? "WING FAULT?" : "DEPLOY"); hud.log && hud.log(d.solar === "wings" ? (wingFault ? "One solar wing opens only halfway. Power will be lower than planned." : "Solar wings unfold and lock.") : "Antenna out. Body-mounted cells are already facing the Sun."); if (wingFault) hud.sfx && hud.sfx("event"); }
          op("flAsc", 0); op("flXfer", 0); op("flOrb", clamp(u * 5));
          const w = ease((u - 0.2) / 0.5); deploy(host, "o", d, w, wingFault ? Math.min(w, 0.5) : w);
          const c = q("flClockT"); if (c) c.textContent = "DAY 0 · DEPLOY"; label(d.solar === "wings" ? "DEPLOYING: solar wings and antenna" : "DEPLOYING: antenna, systems check");
          orbit(now, dt, false);
        } else {
          op("flAsc", 0); op("flXfer", 0); op("flOrb", 1); if (!deployed) { deployed = true; stage("orbit"); }
          const i = Math.floor((et - tOps) / T.day);
          if (i !== curDay && i < sc.days) {
            curDay = i; const x = Rz.days[i];
            if (x) {
              state = { flare: !!x.flare, outage: !!x.outage, glitch: !!x.glitch, powered: x.powered !== false };
              const evs = Rz.events.filter((e) => e.day === x.day); hud.day && hud.day(x, evs);
              if (evs.length) showBanner(evs[0].title.toUpperCase(), 2400, now);
              const c = q("flClockT"); if (c) c.textContent = "DAY " + x.day + " / " + sc.days;
            }
          }
          if (curDay >= Rz.days.length && !fired.has("end")) { fired.add("end"); say(Rz.outcome === "lost" ? "SIGNAL LOST" : "MISSION END"); }
          orbit(now, dt, true);
          if (et > tEnd - T.day && Rz.days.length < sc.days && !fired.has("lost")) { fired.add("lost"); say("SIGNAL LOST"); showBanner("SIGNAL LOST", 3000, now); }
          if (et > tEnd + 700) { stopped = true; hud.say && hud.say(Rz.outcome === "lost" ? "SIGNAL LOST" : "MISSION END"); hud.done(); return; }
        }
        if (banner.text && now > banner.until) { banner.text = ""; const e = q("flBanner"); if (e) e.setAttribute("opacity", 0); } else if (banner.text) { const e = q("flBanner"); if (e) e.setAttribute("opacity", Math.min(1, (banner.until - now) / 300)); }
        raf = requestAnimationFrame(frame);
      }
      deploy(host, "a", d, 0.02, 0.02);
      raf = requestAnimationFrame(frame);
      return { stop() { stopped = true; cancelAnimationFrame(raf); } };
    },
  };
})();
