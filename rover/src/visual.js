// Visuals for the rover: a side-view SVG used in the assembly bay and a top-down canvas sprite used on the map.
// Pure drawing, no game logic. Every drawn piece carries data-part="<id>" so the UI can highlight it.
(function () {
  const MR = (globalThis.MR = globalThis.MR || {});

  // order in which parts are bolted on during the assembly animation
  const ORDER = ["wheels", "chassis", "battery", "computer", "solar", "antenna", "heater", "navcam", "sciencecam", "sunsensor", "dustsensor", "wheelsensor", "drill"];
  MR.ASSEMBLY_ORDER = ORDER;

  // where each part falls in from, so the build looks like a workshop, not a slideshow
  const FROM = { wheels: [0, 140], chassis: [0, -140], battery: [-120, 0], computer: [120, 0], solar: [0, -170], antenna: [-140, -60], heater: [0, 120], navcam: [90, -120], sciencecam: [90, -150], sunsensor: [0, -110], dustsensor: [-90, -90], wheelsensor: [0, 120], drill: [150, 40] };

  const WH = { std: { r: 40, cleats: 26, ch: 4, col: "#2e2420", rim: "#8b8f99" }, rugged: { r: 46, cleats: 14, ch: 10, col: "#c9822b", rim: "#d8a24a" } };

  function wheel(cx, cy, k, sensor, spin) {
    const w = WH[k] || WH.std; let s = "";
    for (let i = 0; i < w.cleats; i++) s += `<rect x="${cx - 2.5}" y="${cy - w.r - w.ch + 2}" width="5" height="${w.ch}" rx="1.5" fill="${w.col}" transform="rotate(${(360 / w.cleats) * i} ${cx} ${cy})"/>`;
    let spokes = ""; for (let i = 0; i < 6; i++) spokes += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - w.r * 0.62}" stroke="#555a63" stroke-width="3" transform="rotate(${i * 60} ${cx} ${cy})"/>`;
    return `<g class="wheel">${s}<circle cx="${cx}" cy="${cy}" r="${w.r}" fill="#15100e" stroke="#050303" stroke-width="3"/>` +
      `<g class="${spin ? "spin" : ""}" style="transform-box:fill-box;transform-origin:center"><circle cx="${cx}" cy="${cy}" r="${w.r * 0.7}" fill="${w.rim}" stroke="#333" stroke-width="2"/>${spokes}<circle cx="${cx}" cy="${cy}" r="${w.r * 0.2}" fill="#2a2d33" stroke="#999" stroke-width="2"/></g>` +
      (sensor ? `<circle cx="${cx}" cy="${cy}" r="${w.r * 0.82}" fill="none" stroke="#56e8d6" stroke-width="3" stroke-dasharray="6 5" class="pulse"/>` : "") + `</g>`;
  }

  // opts: { fresh: Set of part ids that should drop in, stagger: bool (play the full build sequence), drive: bool (spin wheels) }
  MR.roverSVG = function (d, opts) {
    opts = opts || {}; const P = MR.PARTS; const has = (o) => (d.options || []).includes(o);
    const fresh = opts.fresh || new Set();
    let n = 0;
    const part = (id, inner, extra) => {
      const f = FROM[id] || [0, -100];
      const play = opts.stagger || fresh.has(id);
      const delay = opts.stagger ? (ORDER.indexOf(id) * 0.28).toFixed(2) : "0";
      return `<g class="part${play ? " drop" : ""}" data-part="${id}" style="--dx:${f[0]}px;--dy:${f[1]}px;--d:${delay}s"${extra || ""}>${inner}</g>`;
    };
    let o = `<svg class="rover-svg" viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Your rover">` +
      `<defs>
        <linearGradient id="gBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4ece3"/><stop offset=".55" stop-color="#cfc3b6"/><stop offset="1" stop-color="#8c7f73"/></linearGradient>
        <linearGradient id="gSolar" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b4f9e"/><stop offset=".5" stop-color="#1a2f66"/><stop offset="1" stop-color="#3a63c4"/></linearGradient>
        <linearGradient id="gBatt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9dffbe"/><stop offset="1" stop-color="#2fae62"/></linearGradient>
        <linearGradient id="gGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a4a2b"/><stop offset="1" stop-color="#3a1d12"/></linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>`;
    // ground + shadow
    if (!opts.drive) o += `<rect x="0" y="328" width="640" height="52" fill="url(#gGround)"/>`;
    o += `<ellipse cx="320" cy="330" rx="260" ry="9" fill="rgba(0,0,0,.45)"/>`;

    // wheels + suspension
    const wk = d.wheels, wr = (WH[wk] || WH.std).r, wy = 328 - wr;
    let w = `<g stroke="#6c6258" stroke-width="9" stroke-linecap="round" fill="none"><path d="M170 ${wy}L250 232L320 ${wy}"/><path d="M250 232L400 232"/><path d="M400 232L470 ${wy}"/></g>`;
    w += wheel(170, wy, wk, has("wheelsensor"), opts.drive) + wheel(320, wy, wk, false, opts.drive) + wheel(470, wy, wk, false, opts.drive);
    o += part("wheels", w);

    // chassis (warm electronics box)
    o += part("chassis", `<rect x="140" y="168" width="360" height="82" rx="14" fill="url(#gBody)" stroke="#5a4e44" stroke-width="3"/>` +
      `<path d="M150 214H490M300 172V246" stroke="#6b5f54" stroke-width="1.5" opacity=".5"/>` +
      `<rect x="148" y="176" width="22" height="8" rx="2" fill="#e8743b"/><text x="176" y="184" font-size="9" fill="#5a4e44" font-family="monospace" letter-spacing="2">MARS-R1</text>`);

    // battery cells (count = size)
    const bc = { S: 1, M: 2, L: 3 }[d.battery] || 1; let bt = `<rect x="154" y="190" width="${bc * 40 + 10}" height="48" rx="6" fill="#16231a" stroke="#2fae62" stroke-width="2"/>`;
    for (let i = 0; i < bc; i++) bt += `<rect x="${160 + i * 40}" y="196" width="34" height="36" rx="4" fill="url(#gBatt)" filter="url(#glow)"/><path d="M${181 + i * 40} 200l-7 16h6l-3 12 9-18h-6z" fill="#0d2a17"/>`;
    o += part("battery", bt);

    // computer board with one LED per rule slot
    const slots = (P.computer[d.computer] || P.computer.std).slots; let cp = `<rect x="388" y="186" width="96" height="52" rx="6" fill="#102a1c" stroke="#3fd07d" stroke-width="2"/><rect x="408" y="198" width="26" height="26" rx="3" fill="#1b1f24" stroke="#3fd07d"/>`;
    for (let i = 0; i < slots; i++) cp += `<rect x="${442 + (i % 4) * 9}" y="${200 + Math.floor(i / 4) * 12}" width="6" height="6" rx="1" fill="#6dffa2" class="led" style="animation-delay:${(i * 0.17).toFixed(2)}s"/>`;
    cp += `<path d="M396 192v-5M408 192v-5M420 192v-5M396 238v5M408 238v5M420 238v5" stroke="#3fd07d" stroke-width="2"/>`;
    o += part("computer", cp);

    // solar wing (width = size)
    const hw = { S: 72, M: 118, L: 160 }[d.solar] || 100, cx = 308, y0 = 120, y1 = 160;
    let sp = `<path d="M${cx - 30} 168L${cx - 18} 160M${cx + 30} 168L${cx + 18} 160" stroke="#6c6258" stroke-width="5"/>` +
      `<polygon points="${cx - hw},${y1} ${cx + hw},${y1} ${cx + hw + 12},${y0} ${cx - hw + 12},${y0}" fill="url(#gSolar)" stroke="#9fb7ff" stroke-width="2.5"/>`;
    for (let i = 1; i < Math.round(hw / 20); i++) { const x = cx - hw + i * 40; sp += `<line x1="${x}" y1="${y1}" x2="${x + 12}" y2="${y0}" stroke="#9fb7ff" stroke-width="1" opacity=".55"/>`; }
    sp += `<line x1="${cx - hw + 6}" y1="140" x2="${cx + hw + 6}" y2="140" stroke="#9fb7ff" stroke-width="1" opacity=".55"/><polygon points="${cx - hw + 20},${y1 - 3} ${cx - hw + 60},${y1 - 3} ${cx - hw + 70},${y0 + 3} ${cx - hw + 30},${y0 + 3}" fill="rgba(255,255,255,.12)" class="glint"/>`;
    o += part("solar", sp);

    // optional hardware
    if (has("antenna")) o += part("antenna", `<path d="M156 170V108" stroke="#6c6258" stroke-width="5"/><path d="M122 92Q130 124 168 112Z" fill="#e8e1d8" stroke="#6b5f54" stroke-width="2.5" transform="rotate(-22 145 102)"/><circle cx="158" cy="98" r="4" fill="#f2c94c" class="led"/>`);
    if (has("heater")) o += part("heater", `<path d="M200 244h14l6-9 12 14 12-14 12 14 12-14 12 14 12-14 6 9h14" fill="none" stroke="#ff7a2f" stroke-width="3.5" stroke-linecap="round" filter="url(#glow)" class="heat"/>`);
    const mast = has("sciencecam") ? 44 : has("navcam") ? 78 : 0;
    if (mast) o += `<g class="static"><path d="M490 172V${mast + 14}" stroke="#6c6258" stroke-width="6" stroke-linecap="round"/></g>`;
    if (has("navcam")) o += part("navcam", `<rect x="466" y="78" width="46" height="26" rx="5" fill="#2b2f36" stroke="#8b9bb0" stroke-width="2"/><circle cx="480" cy="91" r="7" fill="#0a0d12" stroke="#56b6e8" stroke-width="2"/><circle cx="498" cy="91" r="7" fill="#0a0d12" stroke="#56b6e8" stroke-width="2"/><circle cx="480" cy="91" r="2.5" fill="#56b6e8" class="led"/><circle cx="498" cy="91" r="2.5" fill="#56b6e8" class="led"/>`);
    if (has("sciencecam")) o += part("sciencecam", `<rect x="474" y="42" width="34" height="30" rx="4" fill="#3a2e55" stroke="#b79cff" stroke-width="2"/><circle cx="491" cy="57" r="9" fill="#0a0d12" stroke="#b79cff" stroke-width="2.5"/><circle cx="491" cy="57" r="4" fill="#b79cff" class="led"/>`);
    if (has("sunsensor")) o += part("sunsensor", `<circle cx="452" cy="166" r="7" fill="#f2c94c" stroke="#7a5d10" stroke-width="2" filter="url(#glow)"/>`);
    if (has("dustsensor")) o += part("dustsensor", `<rect x="204" y="156" width="16" height="12" rx="3" fill="#8b8f99" stroke="#444" stroke-width="2"/><circle cx="212" cy="150" r="2" fill="#d9b48a"/><circle cx="219" cy="146" r="1.5" fill="#d9b48a"/><circle cx="206" cy="145" r="1.5" fill="#d9b48a"/>`);
    if (has("wheelsensor")) o += part("wheelsensor", `<rect x="160" y="${wy - 8}" width="20" height="16" rx="3" fill="#1c3a3a" stroke="#56e8d6" stroke-width="2" opacity="0"/>`); // the ring itself is drawn on the wheel
    if (has("drill")) o += part("drill", `<path d="M500 216L552 232L560 262" fill="none" stroke="#6c6258" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><rect x="552" y="256" width="16" height="22" rx="3" fill="#8b8f99" stroke="#444" stroke-width="2"/><path d="M560 278v38" stroke="#d8a24a" stroke-width="5" stroke-linecap="round" stroke-dasharray="3 4"/>`);
    return o + `</svg>`;
  };

  // ---- top-down sprite for the map (canvas). angle in radians, 0 = facing right. -------------------
  MR.drawRoverSprite = function (g, d, x, y, scale, angle, st) {
    st = st || {}; const has = (o) => (d.options || []).includes(o); const rugged = d.wheels === "rugged";
    const sw = { S: 7, M: 10, L: 13 }[d.solar] || 10;
    g.save(); g.translate(x, y); g.rotate(angle); g.scale(scale, scale);
    g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 6; g.shadowOffsetY = 2;
    // wheels
    g.fillStyle = rugged ? "#c9822b" : "#2a2320"; g.strokeStyle = "#000"; g.lineWidth = 0.6;
    for (const wx of [-6, 0, 6]) for (const wy of [-6.5, 6.5]) { g.fillRect(wx - 2, wy - 1.6, 4, 3.2); g.strokeRect(wx - 2, wy - 1.6, 4, 3.2); }
    g.shadowBlur = 0; g.shadowOffsetY = 0;
    // solar wings
    g.fillStyle = "#2b4f9e"; g.strokeStyle = "#9fb7ff"; g.lineWidth = 0.6;
    g.fillRect(-sw * 0.5 - 1, -9.5, sw, 5); g.strokeRect(-sw * 0.5 - 1, -9.5, sw, 5); g.fillRect(-sw * 0.5 - 1, 4.5, sw, 5); g.strokeRect(-sw * 0.5 - 1, 4.5, sw, 5);
    // body
    g.fillStyle = st.dead ? "#eb5757" : st.dormant ? "#777" : "#eadfd2"; g.strokeStyle = "#3a2f28"; g.lineWidth = 0.8;
    g.beginPath(); g.roundRect(-7, -4.5, 14, 9, 2); g.fill(); g.stroke();
    // heater glow
    if (st.heating) { g.fillStyle = "rgba(255,120,40,.55)"; g.beginPath(); g.arc(0, 0, 10, 0, 7); g.fill(); }
    // mast / camera at the front
    if (has("navcam") || has("sciencecam")) { g.fillStyle = "#56b6e8"; g.fillRect(5, -2, 3.5, 4); }
    if (has("antenna")) { g.fillStyle = "#f4efe8"; g.beginPath(); g.arc(-4, 0, 2.6, 0, 7); g.fill(); g.stroke(); }
    if (has("drill")) { g.fillStyle = "#d8a24a"; g.fillRect(8, -0.7, 4, 1.4); }
    g.restore();
  };
})();
