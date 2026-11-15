# OVERNIGHT PLAN (Claude Code, fully autonomous)

I am asleep. Nobody will answer questions until [WAKE_TIME, default 08:00 Asia/Qyzylorda, UTC+5]. Work alone, decide alone, log everything.

## 0. Mission
By wake time the project must be: (a) playable by a stranger from a public URL, (b) mapped item by item to the challenge statement with proof, (c) strong on all five judging criteria, with Presentation lifted from 2/5, (d) shipped with a complete submission kit, so the human only does the steps that need a human.

## 1. Read first (in this order)
1. `REQUIREMENTS_2026.md` (offline source of truth for the challenge, criteria, fields, demo and AI rules).
2. `COMPLIANCE.md`, `SELF_JUDGING.md`, `STATUS.md`, `MORNING_REPORT.md`, `DECISIONS.md`, `REFERENCES.md`, `AI_USE.md`.
3. `SUBMISSION.md` and `DEMO.md`. Their structure follows the 2026 guide; keep the field names and the `[ ... ]` placeholders you cannot fill honestly.

Starting state (verify each point locally first, the public GitHub copy is OLDER):
- The public repo `kak0yt0-che1/rover` shows only one commit from 14 Nov ("Rover Rules") on `main`, with the whole app inside a subfolder `rover/`, no Mission Design, none of the docs, no `autopilot` branch. The newer work (Mission Design, rover-fixed fixes, docs, tests) exists only on the local machine. On the public copy the tests fail because they read `data/terrain.json`, which does not exist (the data file is `data/terrain_data.js`).
- Locally: Mission Design (mission.html) and Rover Rules both exist on branch `autopilot`. Tests md_test, console_test, balance_test pass. NEVER done: a real click-through of the UI (only headless load + screenshots). Not yet done: public URL, video/slides, verified NASA values for Mission Design, sandbox, share/compare, competitive mode, tutorial. Self-score weakest: Presentation 2/5.

## 2. Rules (non-negotiable)
Integrity
- Never invent data, sources, quotes, test results or features. Say "works" only after you ran it and saw it work.
- Any number presented as NASA or agency data needs a source URL you actually opened this session. Cannot open it? Do not cite it as sourced; keep it a labelled game value.
- Never disable TLS verification or work around a blocked site by other means. Log it and move on.
- No third-party art, audio, fonts, code, or CDN dependencies. Pictures are SVG drawn by our own code. No AI-generated images, audio or video. No NASA logos or branding. Add nothing without an entry in `REFERENCES.md` (item, licence, link).
- No trackers, analytics, accounts or backend. Everything runs offline in the browser.

Autonomy
- Do not ask questions. Pick the reasonable option and write a line in `DECISIONS.md` (time, choice, reason).
- Blocked more than 15 minutes: skip, log in `OVERNIGHT_LOG.md`, continue.
- Use the task list tool. Keep exactly one task in progress.

Git
- Work on a new branch `autopilot2` created from `autopilot`. Small commits with clear messages.
- Tag a checkpoint after every phase that is green: `ckpt-1`, `ckpt-2`, ... Rollback point if a later step breaks things.
- Never touch `main`. Never force-push or rewrite history. Push policy (default, allowed): push `autopilot2` to origin after every green checkpoint, so the work exists on GitHub even if this machine dies. Never push to `main`.

Quality gate
- Before and after every change run the full test suite. A red test stops all new work until it is green again.
- New feature breaks something and you cannot fix it in 20 minutes: revert to the last checkpoint on your own branch, log it, move on.
- Mission Design and Rover Rules must both keep working at every checkpoint.
- Every feature you add needs (a) an automated test or e2e step and (b) a line in `COMPLIANCE.md` pointing at it.

Time
- Run `date` at the start of every phase and write the time in `OVERNIGHT_LOG.md`. Scale phase budgets below to the real time left.
- Feature freeze at [FREEZE_TIME, default 06:30]. After that only bug fixes, tests and docs. Stop all work at [WAKE_TIME - 15 min].
- Never leave a long command in the background. Keep working in the foreground.

## 3. Phases

### Phase 0 (about 20 min): orient
- Read the files above. Run all tests. Create branch `autopilot2`.
- Create `OVERNIGHT_LOG.md` (time, phase, what changed, result).
- Choose test tooling that needs no download: `puppeteer-core` or `playwright-core` pointed at the installed Edge or Chrome. Keep tooling in `tools/` and `devDependencies` only. The shipped game keeps no runtime dependencies and no build step.
Exit gate: baseline green, branch created, tooling can open mission.html and read the DOM.

### Phase 1 (about 75 min): real click-tests and bug fixing (Relevance, completeness)
Write e2e tests that drive the real UI with clicks and keys, not function calls:
- For each of the 3 scenarios x 3 difficulties: configure, launch, reach the report, press Redesign, change something, launch again, press Fly again.
- Launch blocking: an overweight design cannot launch and shows the message; fixing it unblocks launch.
- Team mode with 2, 3 and 4 players: roles, shared approval, launch only after everyone approves, one player withdrawing blocks it.
- Save a design, reload the page, load it back. Leaderboard records and sorts.
- Rover Rules smoke test: place blocks, run, see a result.
- No console errors or failed requests during any flow. Test viewports 1920x1080, 1366x768, 390x844 (phone). Keyboard-only path reaches launch.
Fix every bug found. Log each one.
Exit gate: e2e green. Tag `ckpt-1`.

### Phase 2 (about 45 min): public deployment readiness
- GitHub Pages serves the ROOT of one branch (or `/docs`). If the app sits in a subfolder (as on the public copy, `rover/`), the site root would 404. Fix it: move the app so `index.html` is in the repo root (`git mv`, then fix script paths, test paths and the README), or add a root `index.html` that links to the app. Pick one, log it, and test it.
- Third-party AI tooling folders (`.agents/`, `.claude/skills/`, `skills-lock.json`) must not clutter the shipped site: remove them from the repo, or keep them and list them in `REFERENCES.md` with their licence. Do not delete anything you did not create without logging it.
- The Pages branch: the human will point Pages at `autopilot2` or merge it into `main` (see Reports). Write both options in `DEPLOY.md`.
- All paths relative so the game works under a repo subpath (`https://<user>.github.io/<repo>/`). Prove it by serving the folder under a prefix locally and re-running the e2e suite.
- Add `.nojekyll` and a GitHub Pages workflow or documented `/docs` setup. Write `DEPLOY.md` with exact commands and clicks for the human (merge to main, enable Pages, expected URL).
- `index.html` becomes a clear landing page: Mission Design first (primary button), Rover Rules as bonus. A stranger must understand what to do in 10 seconds.
- Write a real `README.md`: what it is, challenge link, play link placeholder, controls, screenshots, how to run tests, data and licences, AI disclosure pointer.
Exit gate: works under a subpath, e2e green. Tag `ckpt-2`.

### Phase 3 (about 100 min): challenge coverage (highest value first; stop at feature freeze)
Do these in order. Each must be small, tested and honest.
1. Guided first-run tutorial and "why" hints (educational value, Influence). Short, skippable, 5 steps max: what the six resources are, why mass limits depend on orbit, what a data rate is. Hints near each choice explain WHY it changes the score. Plain English.
2. Verified values and a Model notes page (Validity, NASA Data field). FIRST resolve what the README itself lists as unverified: every entry in `src/config.js` marked `verified: false` (sol length, signal delay, temperatures, dust loss, tilt limit), the "Did you know?" lines in `src/ui.js` (FACTS), and the real-world notes in `src/missions.js`. For each: open a NASA page, paste the URL and date opened next to the value, or if you cannot confirm it, remove the claim or relabel it as a game value. Then do the same for Mission Design values. Open NASA or agency pages (WebFetch) and record 3 to 5 real values the game actually uses (for example typical orbit altitudes, typical small-satellite data rates, solar irradiance at Earth, only if the game uses them), each with URL and date opened. Use them in the model where they fit. Add `model.html` that explains the simulation, lists every simplification, and writes the key formulas in proper mathematical notation (MathML or well-formed HTML, not plain-text symbols), for example the rocket equation. If the sites cannot be opened, skip the "NASA data" claim and write that clearly in `SUBMISSION.md`.
3. Share and compare designs (suggested feature). Encode a design in the URL hash; opening the link loads it. A compare view shows two saved designs and their results side by side.
4. Sandbox mode (suggested feature): constraints optional, all parts unlocked, free experimentation, clearly labelled as unscored.
5. Competitive hot-seat mode (suggested feature): teams fly the same seed, then a comparison screen ranks them. No backend.
6. Post-mission analysis delta: compare this run with the previous run of the same scenario and say what changed the outcome.
7. Accessibility pass: keyboard focus order and visible focus, labels for every control, text contrast, never colour alone for status (add text or icons), respects reduced motion, touch targets, readable at 200% zoom.
If time runs short, drop from the bottom. Items 1, 2 and 7 are the most valuable.
Exit gate: each finished item has tests; e2e green. Tag `ckpt-3` (and `ckpt-3b` as needed).

### Phase 4 (about 45 min): balance and validity
- Extend `balance_test`: for every scenario x difficulty run a few thousand seeds with at least two different strategies. Record success rate, score spread, and which events cause failures.
- Tune so that there are at least two clearly different working designs in every scenario, no dominant strategy, and difficulty visibly changes outcomes. Easy must be winnable by a careful beginner; hard must be able to fail even good designs.
- Put the results table in `docs/BALANCE.md`. No hand-waving: show the numbers.
Exit gate: all targets met or the gap documented. Tag `ckpt-4`.

### Phase 5 (about 75 min): Presentation (the weakest criterion)
1. Demo mode: `mission.html?demo=1` runs a scripted, deterministic ~28 second sequence on the REAL game logic (same clicks and events as a player, fixed seed), with burned-in English captions. It follows `DEMO.md`: team card, challenge, six resources, blocked launch, launch with an event, report with "why", teams, future, end card. Invisible during normal play. It must be a real run of the game, not a fake animation.
2. Video: record the demo mode to `demo/demo.mp4` (playwright-core recordVideo or screencast frames plus ffmpeg), 1080p, 30 seconds or less, check the duration with ffprobe. Time-box to 45 minutes. If it does not work, write exact OBS steps (5 minutes for the human) and keep demo mode.
3. Screenshots at 1920x1080 into `docs/shots/` for each key screen.
4. Slides: build the 7-slide backup deck from `DEMO.md` (HTML to PDF with headless Edge or Chrome), in English, large fonts, few words, team name and member names as placeholders, includes the data slide. Export as `demo/slides.pdf`.
5. Replace remaining placeholders only where you can honestly fill them.
Exit gate: video or OBS instructions ready, deck PDF ready. Tag `ckpt-5`.

### Phase 6 (about 40 min): documents match reality
- Update `COMPLIANCE.md` so every requirement in `REQUIREMENTS_2026.md` is marked done, partial or missing, with a proof pointer (test name, file or screenshot).
- Re-score `SELF_JUDGING.md` for all five criteria with evidence. State the biggest remaining weakness plainly.
- Update `SUBMISSION.md`, `README.md`, `AI_USE.md`, `REFERENCES.md`. CLAIMS AUDIT: for every sentence in README and SUBMISSION that says the game does something, check it against a test, a screenshot or the code. Delete or fix any claim you cannot prove. List unfilled human-only placeholders at the top of `MORNING_REPORT.md`.
Exit gate: audit clean. Tag `ckpt-6`.

### Phase 7 (last 60 min before stop): freeze and fresh eyes
- Start only after FREEZE_TIME. No features.
- Run everything: unit tests, e2e at three viewports, subpath serving, the demo mode, links and file references (no broken links in the docs).
- Spawn a reviewer subagent with NO context but the public materials (README, landing page, `SUBMISSION.md`). Ask it to (1) play the game from the README alone and list every point of confusion or breakage, (2) score the five judging criteria with reasons. Fix what is cheap. Compare its scores with `SELF_JUDGING.md` and explain the gaps honestly.
- Tag `final` and write `MORNING_REPORT.md`.

## 4. Backlog value table (stay in scope)
| Item | Serves | Priority |
|---|---|---|
| Real click-tests, bug fixes | Relevance (complete, usable) | must |
| Public-URL readiness, README, landing | Relevance, Presentation | must |
| Demo mode, video or OBS steps, deck PDF, screenshots | Presentation | must |
| Tutorial and "why" hints | Educational goal, Influence | high |
| Verified values, Model notes page with formulas | Validity, NASA Data field | high |
| Accessibility pass | Relevance, Influence | high |
| Balance numbers | Validity, "multiple valid solutions" | high |
| Share and compare designs | Suggested feature | medium |
| Sandbox mode | Suggested feature | medium |
| Competitive hot-seat mode | Suggested feature | medium |
| Post-mission delta analysis | Suggested feature | medium |
| Shared online leaderboard | needs a backend | NO, out of scope |
Anything not in this table needs a clear link to a requirement or criterion, otherwise do not do it.

## 5. Reports
`OVERNIGHT_LOG.md` entry: `HH:MM | phase | what | result (tests green/red) | commit`.
`MORNING_REPORT.md` must contain, in this order:
1. Three-line verdict: ready or not, the single biggest risk, what the human must do first.
2. What works, with the command or test that proves each item.
3. What does not work or is partial. Be blunt.
4. Self-scores for the five criteria with the evidence.
5. Human-only steps with exact clicks: (a) either merge `autopilot2` into `main` (GitHub: open a pull request, merge), or leave it and point Pages at the `autopilot2` branch, (b) enable GitHub Pages (Settings, Pages, branch and root folder), with the expected URL, (c) open the live URL and play one run, (d) upload `demo/demo.mp4` (or record with OBS) to YouTube as Public or Unlisted and test the link in a private window, or host `demo/slides.pdf` as the deck, (e) fill every `[ ... ]` in `SUBMISSION.md` (project name, team, members, links, NASA data, AI details), (f) confirm originality and AI statements, (g) press "Submit for Judging" before 11:59 p.m. local time of the Local Event, with a safe target time hours earlier.
6. Rollback map: checkpoint tags and what each contains.
7. Decisions I made that you may want to reverse.
