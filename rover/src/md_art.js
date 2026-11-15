// Mission Design art: the spacecraft scene and the small icons on option cards. Pure drawing, drawn in code (no images, no fonts).
// Flat colours only: greys, one rust accent. Every drawing is decorative (aria-hidden) or carries its own aria-label.
(function () {
  const MR = (globalThis.MR = globalThis.MR || {}), MD = MR.MD;
  const ACC = "#e0703f", ACC2 = "#ff9a6e", INK = "#e8e8e8", DIM = "#a0a0a0", LINE = "#444", PANEL = "#26323f", CELL = "#3d5066", HULL = "#2a2a2c";

  // ---------- spacecraft scene (480 x 320) ----------
  // Layout rules, so nothing overlaps or leaves its place:
  //  - the hull is a fixed rectangle; the battery row, computer chip and payload bay live INSIDE it
  //  - the payload bay has one socket per bus slot; every instrument is drawn inside its own socket and clipped to it
  //  - solar wings, antenna and thruster attach to fixed mount points on the outside of the hull
  const W = 480, H = 320, CX = 240;
  const BUS = { u3: { w: 120, h: 120, slots: 1 }, u6: { w: 180, h: 120, slots: 2 }, u12: { w: 240, h: 132, slots: 3 } };
  const STARS = [[24, 52], [70, 96], [112, 44], [156, 70], [330, 40], [388, 82], [430, 54], [452, 118], [30, 170], [440, 190], [60, 230], [420, 238], [200, 36], [300, 74]];
  function cells(x, y, w, h, cols, rows) {
    let t = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + PANEL + '" stroke="' + DIM + '" stroke-width="1.5"/>';
    for (let i = 1; i < cols; i++) t += '<line x1="' + (x + (w * i) / cols) + '" y1="' + y + '" x2="' + (x + (w * i) / cols) + '" y2="' + (y + h) + '" stroke="' + CELL + '"/>';
    for (let j = 1; j < rows; j++) t += '<line x1="' + x + '" y1="' + (y + (h * j) / rows) + '" x2="' + (x + w) + '" y2="' + (y + (h * j) / rows) + '" stroke="' + CELL + '"/>';
    return t;
  }
  // an instrument drawn inside its socket (sx, sy, sw, sh)
  function instrument(id, sx, sy, sw, sh) {
    const mx = sx + sw / 2, my = sy + sh / 2, r = Math.min(sw, sh) / 2 - 8;
    const lens = (rr, cy) => '<circle cx="' + mx + '" cy="' + cy + '" r="' + rr + '" fill="#111" stroke="' + ACC2 + '" stroke-width="2"/><circle cx="' + mx + '" cy="' + cy + '" r="' + rr * 0.45 + '" fill="' + ACC + '"/>';
    switch (id) {
      case "camera": return lens(r * 0.85, my);
      case "multi": return lens(r * 0.62, my - 5) + '<rect x="' + (mx - 18) + '" y="' + (sy + sh - 13) + '" width="10" height="5" fill="' + ACC + '"/><rect x="' + (mx - 5) + '" y="' + (sy + sh - 13) + '" width="10" height="5" fill="' + ACC2 + '"/><rect x="' + (mx + 8) + '" y="' + (sy + sh - 13) + '" width="10" height="5" fill="' + DIM + '"/>';
      case "mag": return '<rect x="' + (sx + 10) + '" y="' + (sy + sh - 26) + '" width="20" height="16" rx="2" fill="#111" stroke="' + ACC2 + '" stroke-width="2"/><line x1="' + (sx + 30) + '" y1="' + (sy + sh - 22) + '" x2="' + (sx + sw - 14) + '" y2="' + (sy + 14) + '" stroke="' + INK + '" stroke-width="2"/><rect x="' + (sx + sw - 19) + '" y="' + (sy + 9) + '" width="9" height="9" fill="' + ACC + '"/>';
      case "plasma": return '<line x1="' + (sx + 12) + '" y1="' + (sy + 12) + '" x2="' + (sx + sw - 12) + '" y2="' + (sy + sh - 12) + '" stroke="' + INK + '" stroke-width="2"/><line x1="' + (sx + sw - 12) + '" y1="' + (sy + 12) + '" x2="' + (sx + 12) + '" y2="' + (sy + sh - 12) + '" stroke="' + INK + '" stroke-width="2"/><circle cx="' + mx + '" cy="' + my + '" r="5" fill="' + ACC + '"/>';
      case "spectro": return '<rect x="' + (mx - 12) + '" y="' + (sy + 8) + '" width="24" height="' + (sh - 24) + '" rx="5" fill="#111" stroke="' + ACC2 + '" stroke-width="2"/><rect x="' + (mx - 7) + '" y="' + (sy + sh - 16) + '" width="14" height="7" fill="' + ACC + '"/>';
      case "lcam": return lens(r * 0.7, my - 2) + '<path d="M' + (mx - 16) + ' ' + (sy + sh - 8) + ' L' + (mx - 11) + ' ' + (sy + sh - 15) + ' L' + (mx + 11) + ' ' + (sy + sh - 15) + ' L' + (mx + 16) + ' ' + (sy + sh - 8) + 'Z" fill="' + HULL + '" stroke="' + DIM + '"/>';
      default: return "";
    }
  }
  let lastDesign = null;
  MR.mdArt = {};
  MR.mdArt.craft = function (d) {
    const B = BUS[d.bus], bw = B.w, bh = B.h, x0 = CX - bw / 2, y0 = 160 - bh / 2, x1 = x0 + bw, y1 = y0 + bh, cy = 160;
    const changed = (k) => (lastDesign && JSON.stringify(lastDesign[k]) !== JSON.stringify(d[k]) ? " new" : "");
    const part = (name, key, inner) => '<g class="part' + changed(key) + '" data-part="' + name + '">' + inner + "</g>";
    const g = [];
    // backdrop: faint grid, stars, planet, orbit line, corner brackets
    for (let x = 40; x < W; x += 40) g.push('<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + H + '" stroke="#17171a"/>');
    for (let y = 40; y < H; y += 40) g.push('<line x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke="#17171a"/>');
    STARS.forEach(([x, y], i) => g.push('<circle cx="' + x + '" cy="' + y + '" r="' + (i % 3 === 0 ? 1.6 : 1) + '" fill="' + (i % 2 ? "#777" : "#bbb") + '"/>'));
    g.push('<circle cx="240" cy="572" r="300" fill="#161c24" stroke="#2e3a4d" stroke-width="2"/>');
    g.push('<path d="M16 302 Q240 258 464 302" fill="none" stroke="' + DIM + '" stroke-dasharray="5 6" opacity=".7"/>');
    [[10, 10, 1, 1], [W - 10, 10, -1, 1], [10, H - 10, 1, -1], [W - 10, H - 10, -1, -1]].forEach(([x, y, sx, sy]) => g.push('<path d="M' + x + " " + (y + 14 * sy) + " V" + y + " H" + (x + 14 * sx) + '" fill="none" stroke="' + ACC + '" stroke-width="2"/>'));
    g.push('<text x="26" y="30" fill="' + DIM + '" font-size="12">' + MD.BUSES[d.bus].name + "</text>");
    g.push('<text x="' + (W - 26) + '" y="30" fill="' + DIM + '" font-size="12" text-anchor="end">' + MD.ORBITS[d.orbit].name.split(",")[0] + "</text>");

    // solar: wings on fixed arms at the hull sides, or a cell band across the top of the hull
    if (d.solar === "wings") {
      let w = "";
      for (const sgn of [-1, 1]) { const ax = sgn < 0 ? x0 : x1, wx = sgn < 0 ? x0 - 12 - 84 : x1 + 12; w += '<line x1="' + ax + '" y1="' + cy + '" x2="' + (sgn < 0 ? x0 - 12 : x1 + 12) + '" y2="' + cy + '" stroke="' + DIM + '" stroke-width="4"/>' + cells(wx, cy - 42, 84, 84, 4, 4); }
      g.push(part("solar", "solar", w));
    }
    // hull
    g.push(part("bus", "bus", '<rect x="' + x0 + '" y="' + y0 + '" width="' + bw + '" height="' + bh + '" rx="9" fill="' + HULL + '" stroke="' + ACC + '" stroke-width="3"/>' +
      [[x0 + 8, y0 + 8], [x1 - 8, y0 + 8], [x0 + 8, y1 - 8], [x1 - 8, y1 - 8]].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="2" fill="#666"/>').join("")));
    if (d.solar === "body") g.push(part("solar", "solar", cells(x0 + 14, y0 + 4, bw - 28, 7, 6, 1)));
    // battery cells (left) and computer chip (right), inside the hull
    const n = { s: 1, m: 2, l: 3 }[d.battery];
    let bat = "";
    for (let i = 0; i < 3; i++) bat += '<rect x="' + (x0 + 14 + i * 20) + '" y="' + (y0 + 16) + '" width="16" height="22" rx="2" fill="' + (i < n ? ACC2 : "none") + '" stroke="' + (i < n ? ACC2 : LINE) + '" stroke-width="1.5"/>';
    g.push(part("battery", "battery", bat));
    g.push('<rect x="' + (x1 - 14 - 34) + '" y="' + (y0 + 16) + '" width="34" height="22" rx="2" fill="#1c1c1e" stroke="' + DIM + '"/>' + [0, 1, 2].map((i) => '<line x1="' + (x1 - 14 - 26 + i * 10) + '" y1="' + (y0 + 38) + '" x2="' + (x1 - 14 - 26 + i * 10) + '" y2="' + (y0 + 43) + '" stroke="' + DIM + '"/>').join(""));
    // payload bay: one socket per slot, instruments clipped to their socket
    const bayX = x0 + 12, bayY = y0 + 54, bayW = bw - 24, bayH = bh - 66, gap = 8, sw = (bayW - gap * (B.slots - 1)) / B.slots;
    let bay = "", defs = "";
    for (let i = 0; i < B.slots; i++) {
      const sx = bayX + i * (sw + gap), p = d.payloads[i];
      defs += '<clipPath id="slot' + i + '"><rect x="' + sx + '" y="' + bayY + '" width="' + sw + '" height="' + bayH + '" rx="5"/></clipPath>';
      bay += '<rect x="' + sx + '" y="' + bayY + '" width="' + sw + '" height="' + bayH + '" rx="5" fill="' + (p ? "#1b1b1d" : "none") + '" stroke="' + (p ? DIM : LINE) + '" stroke-width="1.5"' + (p ? "" : ' stroke-dasharray="4 4"') + "/>";
      if (p) bay += '<g clip-path="url(#slot' + i + ')">' + instrument(p, sx, bayY, sw, bayH) + "</g>";
    }
    g.push("<defs>" + defs + "</defs>" + part("payloads", "payloads", bay));
    if (d.payloads.length > B.slots) g.push('<text x="' + (x1 - 12) + '" y="' + (y0 + 51) + '" fill="' + ACC2 + '" font-size="11" text-anchor="end">+' + (d.payloads.length - B.slots) + " no room</text>");
    // antenna on the top mount
    let ant = "";
    if (d.comms === "uhf") ant = '<line x1="' + CX + '" y1="' + y0 + '" x2="' + CX + '" y2="' + (y0 - 46) + '" stroke="' + INK + '" stroke-width="2.5"/><circle cx="' + CX + '" cy="' + (y0 - 48) + '" r="3.5" fill="' + INK + '"/>';
    if (d.comms === "sband") ant = '<line x1="' + CX + '" y1="' + y0 + '" x2="' + CX + '" y2="' + (y0 - 22) + '" stroke="' + INK + '" stroke-width="2.5"/><rect x="' + (CX - 24) + '" y="' + (y0 - 32) + '" width="48" height="10" rx="4" fill="' + DIM + '" stroke="' + INK + '"/>';
    if (d.comms === "xband") ant = '<line x1="' + CX + '" y1="' + y0 + '" x2="' + CX + '" y2="' + (y0 - 24) + '" stroke="' + INK + '" stroke-width="2.5"/><path d="M' + (CX - 32) + " " + (y0 - 44) + " Q" + CX + " " + (y0 - 14) + " " + (CX + 32) + " " + (y0 - 44) + 'Z" fill="' + DIM + '" stroke="' + INK + '"/><line x1="' + CX + '" y1="' + (y0 - 26) + '" x2="' + CX + '" y2="' + (y0 - 56) + '" stroke="' + INK + '"/><circle cx="' + CX + '" cy="' + (y0 - 58) + '" r="3" fill="' + ACC2 + '"/>';
    g.push(part("comms", "comms", ant));
    // thruster on the bottom mount
    let th = "";
    if (d.prop === "cold") for (const x of [x0 + bw * 0.28, x0 + bw * 0.72]) th += '<path d="M' + (x - 9) + " " + y1 + " L" + (x + 9) + " " + y1 + " L" + (x + 6) + " " + (y1 + 14) + " L" + (x - 6) + " " + (y1 + 14) + 'Z" fill="' + DIM + '" stroke="' + INK + '"/><circle cx="' + (x - 3) + '" cy="' + (y1 + 22) + '" r="2" fill="' + INK + '"/><circle cx="' + (x + 4) + '" cy="' + (y1 + 27) + '" r="1.5" fill="' + INK + '"/>';
    if (d.prop === "electric") th = '<path d="M' + (CX - 15) + " " + y1 + " L" + (CX + 15) + " " + y1 + " L" + (CX + 9) + " " + (y1 + 18) + " L" + (CX - 9) + " " + (y1 + 18) + 'Z" fill="' + DIM + '" stroke="' + INK + '"/><ellipse cx="' + CX + '" cy="' + (y1 + 32) + '" rx="6" ry="13" fill="' + ACC + '"/><ellipse cx="' + CX + '" cy="' + (y1 + 29) + '" rx="3" ry="8" fill="' + ACC2 + '"/>';
    g.push(part("prop", "prop", th));
    lastDesign = JSON.parse(JSON.stringify(d));
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="craft" font-family="system-ui,sans-serif" role="img" aria-label="Your spacecraft: ' + MD.BUSES[d.bus].name + ", " + MD.SOLAR[d.solar].name + ", " + MD.BATTERY[d.battery].name + ", " + MD.COMMS[d.comms].name + ", " + d.payloads.length + ' instrument(s)">' + g.join("") + "</svg>";
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
  ICON.role = {
    planner: S('<circle cx="16" cy="16" r="5" fill="#222"/><ellipse cx="16" cy="16" rx="12" ry="6" stroke-dasharray="3 3" transform="rotate(-25 16 16)"/><circle cx="26" cy="10" r="2" fill="' + ACC + '" stroke="none"/><path d="M4 28 H28"/>'),
    craft: S('<rect x="9" y="9" width="14" height="14" rx="2" fill="#222"/><rect x="1" y="12" width="7" height="8" fill="#26323f"/><rect x="24" y="12" width="7" height="8" fill="#26323f"/><circle cx="16" cy="16" r="3" stroke="' + ACC2 + '"/>'),
    science: S('<path d="M12 4 H20 M14 4 V13 L7 26 H25 L18 13 V4" fill="#222"/><path d="M10 22 H22" stroke="' + ACC + '"/>'),
    comms: S('<path d="M6 12 Q16 28 26 12Z" fill="#222"/><line x1="16" y1="18" x2="16" y2="6" stroke="' + ACC + '"/><circle cx="16" cy="5" r="2" fill="' + ACC2 + '"/><path d="M22 3 Q28 6 28 12" stroke="' + ACC + '"/>'),
  };
  MR.mdArt.icon = function (group, id) { const html = (ICON[group] && ICON[group][id]) || ""; const el = document.createElement("span"); el.className = "pick-icon"; el.innerHTML = html; return el; };

  // ---------- mission card art (320 x 150) ----------
  const sat = (x, y, k) => '<g transform="translate(' + x + " " + y + ") scale(" + k + ')"><rect x="-6" y="-5" width="12" height="10" rx="1.5" fill="' + HULL + '" stroke="' + ACC + '" stroke-width="1.5"/><rect x="-22" y="-4" width="14" height="8" fill="' + PANEL + '" stroke="' + DIM + '"/><rect x="8" y="-4" width="14" height="8" fill="' + PANEL + '" stroke="' + DIM + '"/></g>';
  const stars2 = (n, seed) => { let o = "", a = seed; for (let i = 0; i < n; i++) { a = (a * 9301 + 49297) % 233280; const x = (a / 233280) * 320; a = (a * 9301 + 49297) % 233280; const y = (a / 233280) * 100; o += '<circle cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" r="' + (i % 4 === 0 ? 1.5 : 0.9) + '" fill="' + (i % 2 ? "#888" : "#ccc") + '"/>'; } return o; };
  MR.mdArt.mission = function (id) {
    let g = '<rect width="320" height="150" fill="#0e0f12"/>' + stars2(26, id.length * 77 + 5);
    if (id === "coast") {
      g += '<path d="M0 98 Q60 88 110 104 Q160 118 210 108 Q270 96 320 110 V150 H0Z" fill="#17222e"/>';
      for (let i = 0; i < 5; i++) g += '<path d="M' + (20 + i * 62) + " " + (122 + (i % 2) * 8) + ' q10 -6 20 0 t20 0" fill="none" stroke="#2f4258" stroke-width="2"/>';
      g += '<path d="M0 96 Q30 84 62 96 Q86 106 100 120 L0 150Z" fill="#2c2f33"/><path d="M0 96 Q30 84 62 96 Q86 106 100 120" fill="none" stroke="' + ACC2 + '" stroke-width="2"/>';
      g += '<path d="M236 32 L70 100 M236 32 L112 114" stroke="' + ACC + '" stroke-dasharray="3 5" opacity=".8"/>' + sat(236, 32, 1.3);
    } else if (id === "aurora") {
      g += '<circle cx="160" cy="330" r="236" fill="#161c24" stroke="#2e3a4d" stroke-width="2"/>';
      [[110, ACC, 0.9], [150, ACC2, 0.75], [190, ACC, 0.8], [226, ACC2, 0.6]].forEach(([x, c, o], i) => { g += '<path d="M' + x + " 112 C" + (x - 14) + " 80 " + (x + 14) + " " + (60 - i * 6) + " " + x + " " + (34 + i * 4) + '" fill="none" stroke="' + c + '" stroke-width="7" stroke-linecap="round" opacity="' + o + '"/>'; });
      g += '<ellipse cx="160" cy="112" rx="120" ry="14" fill="none" stroke="' + DIM + '" stroke-dasharray="4 5" opacity=".6"/>' + sat(262, 44, 1.2);
    } else {
      g += '<circle cx="232" cy="84" r="52" fill="#25272b" stroke="#3b3e44" stroke-width="2"/>';
      [[214, 70, 9], [246, 98, 12], [236, 58, 5], [208, 100, 6], [258, 72, 4]].forEach(([x, y, r]) => { g += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#1c1d20" stroke="#34373c"/>'; });
      g += '<ellipse cx="232" cy="84" rx="80" ry="22" fill="none" stroke="' + ACC + '" stroke-dasharray="4 5" transform="rotate(-18 232 84)"/>' + sat(172, 106, 1.1);
      g += '<circle cx="46" cy="104" r="20" fill="#1d2b3c" stroke="#33506f" stroke-width="2"/><path d="M34 98 q8 -6 14 2 t10 4" fill="none" stroke="#3d6a4e" stroke-width="3"/>';
    }
    return '<svg viewBox="0 0 320 150" class="mcard-art" aria-hidden="true" focusable="false">' + g + "</svg>";
  };

  // ---------- liftoff scene (320 x 360) for the flight screen ----------
  MR.mdArt.liftoff = function (launcherId) {
    const k = { rideshare: 0.85, small: 1, medium: 1.2 }[launcherId] || 1;
    const rocket = '<g class="rocket"><g transform="translate(160 262) scale(' + k + ')">' +
      '<path d="M0 -92 C16 -70 20 -40 20 0 V40 H-20 V0 C-20 -40 -16 -70 0 -92Z" fill="#d8d8da" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M0 -92 C10 -80 14 -68 15 -58 H-15 C-14 -68 -10 -80 0 -92Z" fill="' + ACC + '"/>' +
      '<circle cx="0" cy="-30" r="9" fill="#111" stroke="' + ACC2 + '" stroke-width="3"/>' +
      '<path d="M-20 8 L-38 44 L-20 38Z M20 8 L38 44 L20 38Z" fill="' + ACC + '"/><rect x="-20" y="40" width="40" height="6" fill="#555"/>' +
      '<g class="flame"><path d="M-11 46 L11 46 L0 94Z" fill="' + ACC + '"/><path d="M-6 46 L6 46 L0 74Z" fill="' + ACC2 + '"/></g></g></g>';
    let sky = ""; for (let i = 0; i < 22; i++) sky += '<circle class="streak" cx="' + ((i * 53) % 320) + '" cy="' + ((i * 37) % 300) + '" r="' + (i % 3 ? 1 : 1.6) + '" fill="#aaa" style="animation-delay:' + (i % 7) * 0.12 + 's"/>';
    return '<svg viewBox="0 0 320 360" class="liftoff" role="img" aria-label="Your rocket lifting off">' +
      '<rect width="320" height="360" fill="#0e0f12"/>' + sky + '<g class="smoke"><circle cx="130" cy="330" r="16" fill="#2a2a2c"/><circle cx="190" cy="334" r="20" fill="#2a2a2c"/><circle cx="160" cy="338" r="24" fill="#333"/></g>' +
      rocket + '<rect x="0" y="330" width="320" height="30" fill="#17171a"/><path d="M0 330 H320" stroke="' + ACC + '" stroke-width="2"/></svg>';
  };
})();
