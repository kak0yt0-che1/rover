// Small game sounds made with the browser's Web Audio API (no audio files). Off by default; the header button turns them on.
(function () {
  const MR = (globalThis.MR = globalThis.MR || {});
  let on = false, ctx = null;
  try { on = JSON.parse(localStorage.getItem("md.sound") || "false") === true; } catch (e) { /* no storage: stays off */ }
  const ensure = () => { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } } if (ctx && ctx.state === "suspended") ctx.resume(); return ctx; };
  function tone(freq, t0, dur, type, vol, slideTo) {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type || "square"; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const SOUNDS = {
    click: () => tone(520, 0, 0.06, "square", 0.04),
    pick: () => { tone(440, 0, 0.05, "triangle", 0.05); tone(660, 0.05, 0.07, "triangle", 0.05); },
    nogo: () => tone(160, 0, 0.18, "sawtooth", 0.05),
    count: () => tone(880, 0, 0.09, "square", 0.05),
    launch: () => { tone(90, 0, 1.4, "sawtooth", 0.06, 420); tone(60, 0, 1.4, "square", 0.04, 200); },
    event: () => { tone(300, 0, 0.12, "square", 0.05); tone(240, 0.12, 0.16, "square", 0.05); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.2, "triangle", 0.06)),
    lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.18, 0.28, "sawtooth", 0.05)),
    star: () => tone(1175, 0, 0.18, "triangle", 0.06),
  };
  MR.sfx = (name) => { if (on && SOUNDS[name]) SOUNDS[name](); };
  MR.sfxOn = () => on;
  MR.sfxToggle = () => { on = !on; try { localStorage.setItem("md.sound", JSON.stringify(on)); } catch (e) { /* ignore */ } if (on) { ensure(); SOUNDS.pick(); } return on; };
})();
