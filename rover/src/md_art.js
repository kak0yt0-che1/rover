// Mission Design art: the spacecraft scene and the small icons on option cards. Pure drawing, drawn in code (no images, no fonts).
// Flat colours only: greys, one rust accent. Every drawing is decorative (aria-hidden) or carries its own aria-label.
(function () {
  const MR = (globalThis.MR = globalThis.MR || {}), MD = MR.MD;
  const ACC = "#e0703f", ACC2 = "#ff9a6e", INK = "#e8e8e8", DIM = "#a0a0a0", LINE = "#444", PANEL = "#26323f", CELL = "#3d5066", HULL = "#2a2a2c";

  // ---------- spacecraft scene (360 x 230) ----------
  const STARS = [[20, 22], [62, 60], [98, 18], [140, 44], [214, 16], [262, 52], [318, 24], [336, 78], [24, 112], [300, 124], [52, 160], [338, 168], [118, 78], [248, 98]];
  function cells(x, y, w, h, cols, rows) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PANEL}" stroke="${DIM}" stroke-width="1.5"/>`;
    for (let i = 1; i < cols; i++) s += `<line x1="${x + (w * i) / cols}" y1="${y}" x2="${x + (w * i) / cols}" y2="${y + h}" stroke="${CELL}"/>`;
    for (let j = 1; j < rows; j++) s += `<line x1="${x}" y1="${y + (h * j) / rows}" x2="${x + w}" y2="${y + (h * j) / rows}" stroke="${CELL}"/>`;
    return s;
  }
  // an instrument drawn on the underside of the bus (so it can point at the planet) or on a boom
  function instrument(id, x, y) {
    const lens = (r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#111" stroke="${ACC2}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${r * 0.5}" fill="${ACC}"/>`;
    switch (id) {
      case "camera": return lens(8);
      case "multi": return lens(11) + `<rect x="${x - 11}" y="${y + 14}" width="22" height="4" fill="${ACC2}"/>`;
      case "mag": return `<line x1="${x}" y1="${y}" x2="${x + 34}" y2="${y + 22}" stroke="${INK}" stroke-width="2"/><rect x="${x + 30}" y="${y + 18}" width="9" height="9" fill="${ACC}"/>`;
      case "plasma": return `<line x1="${x - 14}" y1="${y}" x2="${x + 14}" y2="${y + 26}" stroke="${INK}" stroke-width="2"/><line x1="${x + 14}" y1="${y}" x2="${x - 14}" y2="${y + 26}" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="4" fill="${ACC2}"/>`;
      case "spectro": return `<rect x="${x - 7}" y="${y - 5}" width="14" height="16" rx="3" fill="#111" stroke="${ACC2}" stroke-width="2"/><rect x="${x - 4}" y="${y + 11}" width="8" height="5" fill="${ACC}"/>`;
      case "lcam": return lens(10) + `<path d="M${x - 14} ${y + 12} L${x - 10} ${y + 6} L${x + 10} ${y + 6} L${x + 14} ${y + 12}Z" fill="${HULL}" stroke="${DIM}"/>`;
      default: return "";
    }
  }
  MR.mdArt = {};
  MR.mdArt.craft = function (d) {
    const sz = { u3: [64, 64], u6: [112, 64], u12: [112, 112] }[d.bus], bw = sz[0], bh = sz[1], cx = 180, cy = 98;
    const x0 = cx - bw / 2, y0 = cy - bh / 2, g = [];
    // sky: stars, the planet's curve and the orbit line
    STARS.forEach(([x, y], i) => g.push(`<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 1.6 : 1}" fill="${i % 2 ? "#777" : "#bbb"}"/>`));
    g.push(`<circle cx="180" cy="470" r="285" fill="#161c24" stroke="#2e3a4d" stroke-width="2"/>`);
    g.push(`<ellipse cx="180" cy="205" rx="168" ry="18" fill="none" stroke="${DIM}" stroke-width="1" stroke-dasharray="5 6" opacity=".7"/>`);
    // solar panels
    if (d.solar === "wings") for (const sgn of [-1, 1]) { const w = 86, x = sgn < 0 ? x0 - 10 - w : x0 + bw + 10; g.push(`<line x1="${sgn < 0 ? x0 : x0 + bw}" y1="${cy}" x2="${sgn < 0 ? x0 - 10 : x0 + bw + 10}" y2="${cy}" stroke="${DIM}" stroke-width="3"/>`, cells(x, cy - 26, w, 52, 4, 3)); }
    else g.push(cells(x0 + 6, y0 - 7, bw - 12, 7, 5, 1));
    // hull
    g.push(`<rect x="${x0}" y="${y0}" width="${bw}" height="${bh}" rx="5" fill="${HULL}" stroke="${ACC}" stroke-width="2.5"/>`);
    [[x0 + 7, y0 + 7], [x0 + bw - 7, y0 + 7], [x0 + 7, y0 + bh - 7], [x0 + bw - 7, y0 + bh - 7]].forEach(([x, y]) => g.push(`<circle cx="${x}" cy="${y}" r="1.8" fill="#666"/>`));
    // battery cells inside the hull
    const n = { s: 1, m: 2, l: 3 }[d.battery];
    for (let i = 0; i < 3; i++) g.push(`<rect x="${x0 + 12 + i * 15}" y="${y0 + bh - 20}" width="11" height="8" rx="1.5" fill="${i < n ? ACC2 : "none"}" stroke="${i < n ? ACC2 : LINE}"/>`);
    // instruments: lenses sit in a row on the hull, booms hang below
    d.payloads.forEach((p, i) => { const ix = cx + (i - (d.payloads.length - 1) / 2) * 34; const onBoom = p === "mag" || p === "plasma"; g.push(instrument(p, ix, onBoom ? y0 + bh : y0 + 24)); });
    // antenna
    if (d.comms === "uhf") g.push(`<line x1="${cx}" y1="${y0}" x2="${cx}" y2="${y0 - 26}" stroke="${INK}" stroke-width="2"/><circle cx="${cx}" cy="${y0 - 26}" r="3" fill="${INK}"/>`);
    if (d.comms === "sband") g.push(`<line x1="${cx}" y1="${y0}" x2="${cx}" y2="${y0 - 14}" stroke="${INK}" stroke-width="2"/><rect x="${cx - 14}" y="${y0 - 22}" width="28" height="8" rx="3" fill="${DIM}"/>`);
    if (d.comms === "xband") g.push(`<line x1="${cx}" y1="${y0}" x2="${cx}" y2="${y0 - 14}" stroke="${INK}" stroke-width="2"/><path d="M${cx - 24} ${y0 - 30} Q${cx} ${y0 - 8} ${cx + 24} ${y0 - 30}Z" fill="${DIM}" stroke="${INK}"/><line x1="${cx}" y1="${y0 - 20}" x2="${cx}" y2="${y0 - 40}" stroke="${INK}"/><circle cx="${cx}" cy="${y0 - 40}" r="2.5" fill="${ACC2}"/>`);
    // thruster
    if (d.prop === "cold") g.push(`<rect x="${x0 - 7}" y="${y0 + bh - 14}" width="7" height="6" fill="${DIM}"/><rect x="${x0 + bw}" y="${y0 + bh - 14}" width="7" height="6" fill="${DIM}"/><circle cx="${x0 - 12}" cy="${y0 + bh - 11}" r="2" fill="${INK}"/><circle cx="${x0 + bw + 12}" cy="${y0 + bh - 11}" r="2" fill="${INK}"/>`);
    if (d.prop === "electric") g.push(`<path d="M${cx - 9} ${y0 + bh} L${cx + 9} ${y0 + bh} L${cx + 5} ${y0 + bh + 9} L${cx - 5} ${y0 + bh + 9}Z" fill="${DIM}"/><ellipse cx="${cx}" cy="${y0 + bh + 17}" rx="4" ry="9" fill="${ACC}" opacity=".9"/>`);
    return `<svg viewBox="0 0 360 230" class="craft" role="img" aria-label="Your spacecraft: ${MD.BUSES[d.bus].name}, ${MD.SOLAR[d.solar].name}, ${MD.BATTERY[d.battery].name}, ${MD.COMMS[d.comms].name}, ${d.payloads.length} instrument(s)">${g.join("")}</svg>`;
  };

  // ---------- option icons (32 x 32) ----------
  const S = (inner) => `<svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false" fill="none" stroke="${DIM}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${inner}</svg>`;
  const rocket = (h, wide) => `<path d="M16 ${30 - h} L${16 + wide} ${22} L${16 + wide} 28 L${16 - wide} 28 L${16 - wide} 22Z" fill="#222"/><circle cx="16" cy="${24 - h / 3}" r="2" stroke="${ACC2}"/><path d="M${16 - wide} 26 L${16 - wide - 4} 30 M${16 + wide} 26 L${16 + wide + 4} 30" stroke="${ACC}"/>`;
  const planet = `<circle cx="16" cy="16" r="6" fill="#222"/>`;
  const ICON = {
    launcher: { rideshare: S(rocket(12, 3) + `<circle cx="26" cy="8" r="1.5" fill="${ACC2}"/><circle cx="6" cy="8" r="1.5" fill="${ACC2}"/>`), small: S(rocket(18, 3.5)), medium: S(rocket(24, 4.5) + `<path d="M7 24 V30 M25 24 V30" stroke="${ACC}"/>`) },
    orbit: {
      leo: S(planet + `<ellipse cx="16" cy="16" rx="11" ry="11" stroke-dasharray="3 3"/><circle cx="27" cy="16" r="2" fill="${ACC}" stroke="none"/>`),
      sso: S(planet + `<ellipse cx="16" cy="16" rx="13" ry="7" transform="rotate(-30 16 16)" stroke-dasharray="3 3"/><circle cx="5" cy="5" r="2.5" fill="${ACC2}" stroke="none"/>`),
      polar: S(planet + `<ellipse cx="16" cy="16" rx="6" ry="13" stroke-dasharray="3 3"/><circle cx="16" cy="3" r="2" fill="${ACC}" stroke="none"/>`),
      lunar: S(`<circle cx="8" cy="22" r="4" fill="#222"/><circle cx="25" cy="8" r="5" fill="#222"/><circle cx="25" cy="8" r="9" stroke-dasharray="2 3"/><circle cx="31" cy="8" r="1.5" fill="${ACC}" stroke="none"/>`),
    },
    ground: { single: S(`<path d="M8 26 H24 M16 26 V16"/><path d="M8 12 Q16 22 24 12Z" fill="#222"/><path d="M16 16 L22 6" stroke="${ACC}"/>`), network: S(`<path d="M3 27 H11 M7 27 V20 M5 17 Q7 22 9 17Z"/><path d="M13 27 H21 M17 27 V20 M15 17 Q17 22 19 17Z"/><path d="M23 27 H31 M27 27 V20 M25 17 Q27 22 29 17Z"/><path d="M7 14 Q17 4 27 14" stroke="${ACC}" stroke-dasharray="2 3"/>`) },
    bus: { u3: S(`<rect x="11" y="11" width="10" height="10" fill="#222"/>`), u6: S(`<rect x="6" y="11" width="20" height="10" fill="#222"/><line x1="16" y1="11" x2="16" y2="21"/>`), u12: S(`<rect x="6" y="6" width="20" height="20" fill="#222"/><line x1="16" y1="6" x2="16" y2="26"/><line x1="6" y1="16" x2="26" y2="16"/>`) },
    solar: { body: S(`<rect x="9" y="9" width="14" height="14" fill="#222"/><line x1="9" y1="13" x2="23" y2="13" stroke="${ACC}"/>`), wings: S(`<rect x="12" y="12" width="8" height="8" fill="#222"/><rect x="1" y="10" width="9" height="12" fill="#26323f"/><rect x="22" y="10" width="9" height="12" fill="#26323f"/>`) },
    battery: { s: S(`<rect x="6" y="10" width="18" height="12" rx="2"/><rect x="24" y="14" width="3" height="4"/><rect x="9" y="13" width="4" height="6" fill="${ACC2}" stroke="none"/>`), m: S(`<rect x="6" y="10" width="18" height="12" rx="2"/><rect x="24" y="14" width="3" height="4"/><rect x="9" y="13" width="4" height="6" fill="${ACC2}" stroke="none"/><rect x="15" y="13" width="4" height="6" fill="${ACC2}" stroke="none"/>`), l: S(`<rect x="3" y="10" width="22" height="12" rx="2"/><rect x="25" y="14" width="3" height="4"/><rect x="6" y="13" width="4" height="6" fill="${ACC2}" stroke="none"/><rect x="12" y="13" width="4" height="6" fill="${ACC2}" stroke="none"/><rect x="18" y="13" width="4" height="6" fill="${ACC2}" stroke="none"/>`) },
    comms: { uhf: S(`<line x1="16" y1="28" x2="16" y2="10"/><circle cx="16" cy="9" r="2" fill="${ACC2}"/><path d="M10 6 Q16 1 22 6" stroke="${ACC}"/>`), sband: S(`<line x1="16" y1="28" x2="16" y2="16"/><rect x="9" y="11" width="14" height="5" rx="2" fill="#222"/><path d="M8 7 Q16 1 24 7" stroke="${ACC}"/><path d="M11 9 Q16 6 21 9" stroke="${ACC}"/>`), xband: S(`<path d="M6 12 Q16 28 26 12Z" fill="#222"/><line x1="16" y1="18" x2="16" y2="6" stroke="${ACC}"/><circle cx="16" cy="5" r="2" fill="${ACC2}"/><path d="M22 3 Q28 6 28 12 M25 1 Q31 6 31 14" stroke="${ACC}"/>`) },
    prop: { none: S(`<line x1="9" y1="9" x2="23" y2="23"/><line x1="23" y1="9" x2="9" y2="23"/>`), cold: S(`<path d="M10 8 H22 L20 18 H12Z" fill="#222"/><circle cx="12" cy="24" r="2" stroke="${ACC}"/><circle cx="20" cy="26" r="1.5" stroke="${ACC}"/><circle cx="16" cy="27" r="1.2" stroke="${ACC}"/>`), electric: S(`<path d="M10 6 H22 L20 16 H12Z" fill="#222"/><ellipse cx="16" cy="23" rx="4" ry="7" fill="${ACC}" stroke="none"/>`) },
    payloads: {
      camera: S(`<rect x="5" y="10" width="22" height="14" rx="3" fill="#222"/><circle cx="16" cy="17" r="5" stroke="${ACC2}"/><circle cx="16" cy="17" r="2" fill="${ACC}" stroke="none"/>`),
      multi: S(`<rect x="5" y="8" width="22" height="16" rx="3" fill="#222"/><circle cx="16" cy="15" r="5" stroke="${ACC2}"/><rect x="7" y="26" width="5" height="3" fill="${ACC}" stroke="none"/><rect x="14" y="26" width="5" height="3" fill="${ACC2}" stroke="none"/><rect x="21" y="26" width="5" height="3" fill="${DIM}" stroke="none"/>`),
      mag: S(`<rect x="5" y="20" width="10" height="8" fill="#222"/><line x1="15" y1="22" x2="28" y2="8"/><rect x="25" y="5" width="5" height="5" fill="${ACC}" stroke="none"/>`),
      plasma: S(`<circle cx="16" cy="16" r="3" fill="${ACC2}" stroke="none"/><path d="M16 16 L4 6 M16 16 L28 6 M16 16 L4 26 M16 16 L28 26"/>`),
      spectro: S(`<rect x="11" y="5" width="10" height="16" rx="3" fill="#222"/><rect x="13" y="21" width="6" height="5" fill="${ACC}" stroke="none"/><path d="M6 28 Q16 22 26 28" stroke-dasharray="2 3"/>`),
      lcam: S(`<circle cx="16" cy="14" r="7" fill="#222"/><circle cx="16" cy="14" r="3" fill="${ACC}" stroke="none"/><circle cx="25" cy="25" r="4" fill="#222"/>`),
    },
  };
  MR.mdArt.icon = function (group, id) { const html = (ICON[group] && ICON[group][id]) || ""; const el = document.createElement("span"); el.className = "pick-icon"; el.innerHTML = html; return el; };
})();
