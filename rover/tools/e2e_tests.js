// The e2e test list. Each test uses only clicks and keys on the real pages.
module.exports = async function (H) {
  const { test, newPage, btn, pick, setDesign, launchEnabled, startScenario, expect, SOL } = H;
  const OUT = /Mission success|Partial success|Mission fell short|Spacecraft lost|Design rejected/;

  // 1. every scenario x difficulty: configure, launch, report, redesign, launch again, fly again
  for (const sc of Object.keys(SOL)) for (const diff of ["Easy", "Normal", "Hard"]) {
    await test(`flow ${sc} ${diff}`, async (problems) => {
      const page = await newPage({ width: 1366, height: 768 }, problems);
      await startScenario(page, sc, diff);
      let ok = false;
      for (const d of SOL[sc]) { await setDesign(page, d); if (await launchEnabled(page)) { ok = true; break; } }
      expect(ok, "no reference design could launch; dashboard says: " + (await page.locator(".dash .msg").allTextContents()).join(" / "));
      await btn(page, "Launch mission").click();
      await page.locator("h1", { hasText: OUT }).waitFor({ timeout: 3000 });
      await page.locator(".big-total").waitFor();
      expect((await page.locator("text=Why it went this way").count()) === 1, "report has no reasons section");
      await btn(page, "Redesign").click();
      await pick(page, "Large battery, 120 Wh").click();
      if (!(await launchEnabled(page))) await pick(page, "Medium battery, 60 Wh").click();
      if (!(await launchEnabled(page))) await pick(page, "Small battery, 20 Wh").click();
      expect(await launchEnabled(page), "cannot launch after redesign");
      await btn(page, "Launch mission").click();
      await page.locator("h1", { hasText: OUT }).waitFor({ timeout: 3000 });
      await btn(page, "Fly again (new surprises)").click();
      await page.locator("h1", { hasText: OUT }).waitFor({ timeout: 3000 });
      await page.ctx.close();
    });
  }

  // 2. launch blocking
  await test("blocked launch: wrong orbit then fixed", async (problems) => {
    const page = await newPage({ width: 1366, height: 768 }, problems);
    await startScenario(page, "coast", "Normal");
    await pick(page, "Polar orbit, 550 km").click();
    expect(!(await launchEnabled(page)), "launch should be blocked");
    expect((await page.locator(".dash .msg").allTextContents()).some((t) => /cannot reach/.test(t)), "no 'cannot reach' message");
    await pick(page, "Sun-synchronous orbit, 600 km").click();
    expect(await launchEnabled(page), "launch should be unblocked");
    await page.ctx.close();
  });
  await test("blocked launch: overweight design", async (problems) => {
    const page = await newPage({ width: 1366, height: 768 }, problems);
    await startScenario(page, "coast", "Easy");
    await setDesign(page, { rocket: "Rideshare slot", orbit: "Sun-synchronous orbit, 600 km", ground: "One ground station", bus: "12U bus", solar: "Deployable wings", battery: "Large battery, 120 Wh", radio: "X-band radio", prop: "Electric thruster", payloads: ["Multispectral imager", "Lunar surface camera", "Plasma wave receiver"] });
    expect(!(await launchEnabled(page)), "overweight design must not launch");
    expect((await page.locator(".dash .msg").allTextContents()).some((t) => /carries only/.test(t)), "no mass message");
    await pick(page, "Medium rocket").click();
    expect((await page.locator(".dash .msg").allTextContents()).every((t) => !/carries only/.test(t)), "mass message should be gone with the medium rocket");
    await page.ctx.close();
  });

  // 3. team mode
  for (const n of [2, 3, 4]) await test(`team mode ${n} players`, async (problems) => {
    const page = await newPage({ width: 1366, height: 768 }, problems);
    await startScenario(page, "coast", "Normal", n);
    const tabs = page.locator('[role="tab"]');
    expect((await tabs.count()) === 4, "expected 4 role tabs");
    expect(!(await launchEnabled(page)), "launch must wait for approvals");
    for (let i = 0; i < 4; i++) {
      await tabs.nth(i).click();
      await page.locator("button", { hasText: /^Approve as / }).click();
      const en = await launchEnabled(page);
      expect(en === (i === 3), `after ${i + 1} approvals launch enabled=${en}`);
    }
    await tabs.nth(2).click(); await page.locator("button", { hasText: "Take back approval" }).click();
    expect(!(await launchEnabled(page)), "withdrawing must block launch");
    await page.locator("button", { hasText: /^Approve as / }).click();
    expect(await launchEnabled(page), "launch should be enabled again");
    await tabs.nth(0).click(); await pick(page, "Medium rocket").click();
    expect(!(await launchEnabled(page)), "changing a choice must clear approvals");
    await page.ctx.close();
  });

  // 4. save, reload, load; leaderboard
  await test("save, reload, load back; leaderboard sorts", async (problems) => {
    const page = await newPage({ width: 1366, height: 768 }, problems);
    await startScenario(page, "coast", "Normal");
    await setDesign(page, SOL.coast[0]);
    await btn(page, "Save this design").click();
    await page.reload();
    expect((await page.locator("table.cmp").count()) >= 1, "saved table missing after reload");
    await page.locator("table.cmp button", { hasText: "Load" }).first().click();
    expect((await pick(page, "Dedicated small rocket").getAttribute("aria-pressed")) === "true", "loaded design lost the rocket choice");
    expect((await pick(page, "Multispectral imager").getAttribute("aria-pressed")) === "true", "loaded design lost payloads");
    await btn(page, "Launch mission").click(); await btn(page, "Add to leaderboard").click();
    await btn(page, "Redesign").click(); await pick(page, "Multispectral imager").click(); // camera only: a different score
    await btn(page, "Launch mission").click(); await btn(page, "Add to leaderboard").click();
    await btn(page, "New mission").click();
    expect((await page.locator("text=Leaderboard on this device").count()) === 1, "leaderboard not shown");
    const nums = (await page.locator(".card", { hasText: "Leaderboard on this device" }).locator("tr td:last-child").allTextContents()).map(Number);
    expect(nums.length >= 2 && nums.every((v, i) => i === 0 || nums[i - 1] >= v), "leaderboard not sorted: " + nums);
    await page.ctx.close();
  });

  // 5. layout in three viewports + keyboard only
  for (const [w, h] of [[1920, 1080], [1366, 768], [390, 844]]) await test(`viewport ${w}x${h}: no overflow, launch reachable`, async (problems) => {
    const page = await newPage({ width: w, height: h }, problems);
    await startScenario(page, "coast", "Normal");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over <= 1, "horizontal overflow of " + over + "px on build screen");
    await btn(page, "Launch mission").scrollIntoViewIfNeeded(); expect(await launchEnabled(page), "launch not enabled");
    await btn(page, "Launch mission").click(); await page.locator("h1", { hasText: OUT }).waitFor();
    const over2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over2 <= 1, "horizontal overflow of " + over2 + "px on report");
    await page.ctx.close();
  });
  await test("keyboard only: reach and press Launch", async (problems) => {
    const page = await newPage({ width: 1366, height: 768 }, problems);
    await page.goto(H.getBase() + "mission.html"); await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} }); await page.reload();
    const tabTo = async (re) => { for (let i = 0; i < 300; i++) { await page.keyboard.press("Tab"); const t = await page.evaluate(() => (document.activeElement.textContent || "").trim()); if (re.test(t)) return; } throw new Error("never focused " + re); };
    await tabTo(/^Start designing$/); await page.keyboard.press("Enter");
    await tabTo(/^Launch mission$/); await page.keyboard.press("Enter");
    await page.locator("h1", { hasText: OUT }).waitFor({ timeout: 3000 });
    await page.ctx.close();
  });
  // 6. Rover Rules smoke test: build, load example rules, run, reach the debrief
  await test("rover rules: design, program, run, debrief", async (problems) => {
    const page = await newPage({ width: 1366, height: 768 }, problems);
    await page.goto(H.getBase() + "rover.html"); await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} }); await page.reload();
    await page.locator("button", { hasText: "Enter the assembly bay" }).click();
    await page.locator("button", { hasText: "Program the rover" }).click();
    await page.locator("button", { hasText: "Load example" }).click();
    await page.locator("button", { hasText: "Uplink and run the sol" }).click();
    await page.locator("button", { hasText: "Skip" }).click({ timeout: 8000 }).catch(() => {});
    await page.locator("button", { hasText: "Fix my rules" }).waitFor({ timeout: 60000 });
    expect((await page.locator("text=Bonus objectives").count()) >= 1, "debrief has no objectives");
    await page.ctx.close();
  });
  // 7. landing page: a stranger finds the primary button and both games open
  await test("landing page links work", async (problems) => {
    const page = await newPage({ width: 390, height: 844 }, problems);
    await page.goto(H.getBase());
    expect((await page.locator("h1").innerText()).length > 10, "landing has no headline");
    await page.locator("a.btn.primary", { hasText: "Play Mission Design" }).click();
    await page.locator("button", { hasText: "Start designing" }).waitFor();
    await page.locator("a", { hasText: "Home" }).click();
    await page.locator("a", { hasText: "Play Rover Rules" }).click();
    await page.locator("button", { hasText: "Enter the assembly bay" }).waitFor();
    await page.ctx.close();
  });
  // 8. quick tour: 5 steps, skippable, remembered
  await test("tour: five steps, then gone after reload", async (problems) => {
    const page = await newPage({ width: 1366, height: 768 }, problems);
    await startScenario(page, "coast", "Normal");
    const card = page.locator("section.tour");
    expect((await card.count()) === 1, "tour card should show on the first visit");
    for (let i = 0; i < 4; i++) { expect((await card.innerText()).includes("step " + (i + 1) + " of 5"), "wrong step " + i); await card.locator("button", { hasText: "Next" }).click(); }
    await card.locator("button", { hasText: "Done" }).click();
    expect((await page.locator("section.tour").count()) === 0, "tour should close");
    await page.reload(); await btn(page, "Start designing").click();
    expect((await page.locator("section.tour").count()) === 0, "tour should not come back");
    await page.locator("#helpBtn").click(); await page.locator("button", { hasText: "Replay the quick tour" }).click();
    expect((await page.locator("section.tour").count()) === 1, "replay should show the tour");
    await page.locator("section.tour button", { hasText: "Skip the tour" }).click();
    expect((await page.locator("section.tour").count()) === 0, "skip should close it");
    await page.ctx.close();
  });
  // 9. model notes page
  await test("model notes page: formulas and sources", async (problems) => {
    const page = await newPage({ width: 1366, height: 768 }, problems);
    await page.goto(H.getBase() + "model.html");
    expect((await page.locator("math").count()) >= 8, "expected MathML formulas");
    expect((await page.locator('a[href^="https://science.nasa.gov"]').count()) >= 1, "NASA source link missing");
    await page.locator("a", { hasText: "Play" }).click(); await page.locator("button", { hasText: "Start designing" }).waitFor();
    await page.ctx.close();
  });
};
