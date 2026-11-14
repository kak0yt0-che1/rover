// Demo mode (mission.html?demo=1): a scripted run of the REAL game. It presses the same buttons a player would,
// on the same logic, with a fixed random seed, and shows English captions. Nothing here changes the game; it only clicks.
// Optional query: &team=Team+Name  &url=your-public-url  &speed=1 (1 = about 28 seconds; 2 = twice as slow)
(function () {
  const q = new URLSearchParams(location.search), speed = parseFloat(q.get("speed")) || 1;
  const team = q.get("team") || "[TEAM NAME]", link = q.get("url") || "[PUBLIC URL]";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms * speed));
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const style = document.createElement("style");
  style.textContent = `
    .demo-cap { position:fixed; left:0; right:0; bottom:0; z-index:50; padding:16px 24px; background:rgba(18,18,18,.94); color:#e8e8e8; font:600 26px/1.3 system-ui,sans-serif; text-align:center; border-top:2px solid #e0703f; }
    .demo-card { position:fixed; inset:0; z-index:60; display:grid; place-content:center; text-align:center; background:#121212; color:#e8e8e8; padding:32px; gap:16px; }
    .demo-card h2 { font-size:44px; margin:0; } .demo-card p { font-size:26px; margin:0; color:#a0a0a0; } .demo-card .acc { color:#ff9a6e; }
    .demo-ring { outline:3px solid #e0703f !important; outline-offset:2px; }`;
  document.head.append(style);
  const cap = document.createElement("div"); cap.className = "demo-cap"; cap.setAttribute("role", "status"); cap.hidden = true; document.body.append(cap);
  const caption = (t) => { cap.hidden = !t; cap.textContent = t || ""; };
  let card = null;
  const showCard = (h, p1, p2) => { hideCard(); card = document.createElement("div"); card.className = "demo-card"; card.innerHTML = ""; const a = document.createElement("h2"); a.textContent = h; card.append(a); for (const t of [p1, p2]) if (t) { const p = document.createElement("p"); p.textContent = t; card.append(p); } document.body.append(card); };
  const hideCard = () => { if (card) { card.remove(); card = null; } };

  const btn = (text) => [...document.querySelectorAll("button")].find((b) => new RegExp("^\\s*" + esc(text) + "\\s*$").test(b.textContent.replace(/\s*\(selected\)\s*$/, "")) || (b.querySelector("b") && b.querySelector("b").textContent.trim() === text));
  const click = (text) => { const b = btn(text); if (!b) throw new Error("demo: no button " + text); b.scrollIntoView({ block: "center" }); b.classList.add("demo-ring"); b.click(); };
  const ring = (sel) => { const e = document.querySelector(sel); if (e) { e.classList.add("demo-ring"); } };
  const until = (fn, ms) => new Promise((res, rej) => { const t0 = Date.now(); const tick = () => (fn() ? res() : Date.now() - t0 > ms ? rej(new Error("demo: timeout waiting")) : setTimeout(tick, 100)); tick(); });
  const unring = () => document.querySelectorAll(".demo-ring").forEach((e) => e.classList.remove("demo-ring"));

  async function run() {
    window.scrollTo(0, 0);
    // 1. team card, challenge, name
    showCard("Team: " + team, "NASA Space Apps Challenge 2026", "Challenge: Space Mission Design Game"); await wait(1800);
    showCard("Design a space mission", "Six limits fight each other.", "Mass, power, budget, data, communications, time."); await wait(1800);
    showCard("Mission Design", "Build it. Launch it. Learn why."); await wait(1400);
    hideCard();
    // 2. start the real game
    click("Start designing"); await wait(500);
    const skip = btn("Skip the tour"); if (skip) skip.click();
    caption("Pick a rocket, an orbit and a spacecraft"); await wait(1200);
    ring(".dash"); caption("The dashboard shows all six limits, live"); document.querySelector(".dash").scrollIntoView({ block: "start" }); await wait(2000); unring();
    // 3. blocked launch, then fix it
    window.scrollTo(0, 0);
    click("Polar orbit, 550 km"); caption("Blocked: this rocket cannot reach that orbit"); await wait(2000); unring();
    click("Sun-synchronous orbit, 600 km"); await wait(500); click("Dedicated small rocket"); await wait(500); click("Multispectral imager");
    caption("Fix the design, add an instrument"); await wait(1800); unring();
    // 4. launch with an event (seed fixed: the demo seed is 7 and launch adds 1)
    click("Launch mission"); await wait(300); unring();
    caption("Countdown, liftoff, then 30 days with random events"); await until(() => document.querySelector(".big-total"), 14000); await wait(300);
    // 5. report with why
    const why = [...document.querySelectorAll("h3")].find((h) => /Why it went this way/.test(h.textContent)); if (why) why.scrollIntoView({ block: "center" });
    caption("Stars, a score and the reasons why: then redesign"); await wait(2400);
    // 6. teams
    window.scrollTo(0, 0); caption(""); click("New mission"); await wait(500); click("4 players"); await wait(300); click("Start designing"); await wait(300);
    caption("One to four players, each with a role. Launch needs everyone's approval."); await wait(2400); unring();
    // 7. future + end card
    caption(""); showCard("Next: more missions and classroom packs", "Plans, not yet built.", link); await wait(1800);
    document.body.setAttribute("data-demo", "done");
  }
  window.addEventListener("load", () => { run().catch((e) => { document.body.setAttribute("data-demo", "error: " + e.message); }); });
})();
