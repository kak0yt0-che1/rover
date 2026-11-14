# Morning report

## 1. Verdict
- Ready to play and test locally: yes. Not ready to submit: the public URL, the video upload, team names and the final form do not exist until you do them.
- Biggest risk: the 2026 Judging and Submission Guides could not be opened from this machine (certificate error), so field names and the demo and AI rules come from your `REQUIREMENTS_2026.md`; re-check them on the live site.
- Do first: step 5(a) and (b) below (merge and enable GitHub Pages), then fill every `[ ... ]` in `SUBMISSION.md`.

## 2. What works (command that proves it)
| Item | Proof |
|---|---|
| Mission Design model: limits, launch blocking, events, score, share links, sandbox, delta, ranking | `node test/md_test.js` -> 95 checks passed |
| Balance: 3 scenarios x 3 difficulties x 3 strategies, 2000 seeds each; all targets met | `node test/md_balance.js` -> "All targets met"; table in `docs/BALANCE.md` |
| Rover Rules logic | `node test/console_test.js`, `node test/balance_test.js` |
| Real UI click tests (32): all 9 scenario/difficulty flows, blocked launch, team mode 2/3/4, save/reload/load, leaderboard, 3 viewports, keyboard-only, tour, share, compare, sandbox, competition, delta, model page, demo mode, landing, Rover Rules run, axe-core accessibility | `npm install` then `npm run e2e` -> "32/32 e2e tests passed" |
| Works under a sub-path like GitHub Pages | `node tools/e2e.js --prefix=my-repo` -> 32/32 |
| Demo video, 1080p, 26.6 s | `demo/demo.webm` (made by `node tools/record_demo.js`) |
| 7-slide deck | `demo/slides.pdf` |
| Screenshots 1920x1080 | `docs/shots/` (14 files) |

## 3. What does not work or is partial (blunt)
- No public URL. Nothing is pushed anywhere.
- Video is .webm with captions only: no voice, no mp4. Team name and URL show as placeholders in video and slides until you re-record or edit.
- Leaderboard is per browser. No printable report. Competition and teams are hot-seat on one screen.
- Model is simplified; only 4 orbit facts come from NASA pages; no onboard computer or attitude control. The Mars game numbers marked game values in `src/config.js` are still unconfirmed by a human.
- Mission Design code has had no human review; no testing with real beginners.
- Not done by me: nothing was run on a phone, only at 390 px width in a desktop browser.

## 4. Self-scores (my opinion; see SELF_JUDGING.md)
Influence 3, Creativity 4, Validity 3, Relevance 4, Presentation 3. Independent reviewer result: see the section at the end.

## 5. Your steps, with exact clicks
a. In a terminal in the folder that contains the `rover` folder: `git checkout main`, `git merge autopilot2`, `git push origin main` (first time: create an empty repo on github.com and `git remote add origin <its URL>`).
b. GitHub repo > Settings > Pages > Source: "GitHub Actions". Wait about a minute (Actions tab). The URL is `https://<user>.github.io/<repo>/`.
c. Open that URL in a private window, play one mission.
d. Re-record with your names: `node tools/record_demo.js --team="Team" --url="https://..."` (once: `npx playwright-core install ffmpeg`), or use OBS (DEMO.md). Upload `demo/demo.webm` to YouTube as Public or Unlisted and test the link in a private window. Or host `demo/slides.pdf` (edit names in `demo/slides.html` first).
e. Fill every `[ ... ]` in `SUBMISSION.md`; put the same URL in README ("Play").
f. Read AI_USE.md and the originality statement; correct anything untrue.
g. On the Space Apps site press "Submit for Judging" well before 11:59 p.m. local time of your Local Event (aim for several hours earlier).

## 6. Rollback map (git tags on branch autopilot2)
- `ckpt-1`, `ckpt-2`: e2e tests, landing page (`index.html`), Rover Rules moved to `rover.html`, Pages workflow, DEPLOY.md.
- `ckpt-3`: tour, model notes page with sources, accessibility pass.
- `ckpt-3b`: share links, compare, sandbox, competition, delta.
- `ckpt-4`, `ckpt-5`: balance table and difficulty retune, demo mode, video, screenshots, slides.
- `ckpt-6`: documents match reality. `final`: after the reviewer pass.

## 7. Decisions you may want to reverse
- Hard difficulty was made easier (budget 0.8 to 0.87, deadline 0.85 to 0.93) so that at least one strategy wins half the time.
- `index.html` is now a landing page; the Mars game moved to `rover.html`.
- The Pages workflow sits one folder above the game folder (the git repo root) and publishes `rover/`.
- Third-party skill files (`.agents`, `.claude`, `skills-lock.json`) were removed from git and ignored.
- Video is .webm because no ffmpeg command line was available.

## 8. Independent reviewer (fresh agent, no context, played from README)
Scores (strict judge): Influence 3, Creativity 3.5, Validity 3, Relevance 4, Presentation 3.5. My own scores are close (3, 4, 3, 4, 3). No page errors in any run.
Fixed after the review: wrong "Mass over the limit, 26.6 / 0 kg" and "carries 0 kg" when a rocket cannot reach an orbit; generic "add an instrument" advice for a design that breaks limits; "Score 0 compared" now says "unchanged"; report footer pointed to README instead of model.html; README no longer shows internal "needs a human" notes (moved to `HUMAN_TODO.md`); "fixed seed" wording clarified.
Not fixed, your call:
- README and SUBMISSION still have `[ ... ]` placeholders (URL, team, demo link): only you can fill them.
- Solo play gets full teamwork points, so solo scores sit at 94 to 98 with little spread; the first run on Normal is easy (starter default plus the imager wins).
- Two-player mode still shows four role tabs and gives no hint on merging roles.
- "Add to leaderboard" shows no confirmation near the button; saved state persists across reloads (by design).
- The reviewer did not play Rover Rules and did not rerun the tests; my e2e suite does play one Rover run.

## 9. Update after the plan was amended (second pass)
- Mars-game facts: each claim in `src/config.js`, the "Did you know?" lines and `src/missions.js` was checked on a page opened on 2026-11-15 (NASA rover components, NASA/JPL Purgatory Dune, NASA Science temperature blog, JPL dust-storm article, NASA NTRS 20220013418, Royal Museums Greenwich for the sol). The Night Crossing note was reworded (the NASA page does not mention heaters) and the AI4Mars claim removed (the code never used it). Still game values, unconfirmed by design: power, wear and probability numbers, and the game's -73/-7 C and 90% dust loss (the real values are cited next to them).
- Pages layout: a root `index.html` redirect (repo root) plus the Actions workflow; three ways to publish are in DEPLOY.md. The redirect was tested under a sub-path.
- Push: `autopilot2` pushed to origin (the plan allows it); `main` untouched. The public copy of `main` still shows the old project, so Pages must point at `autopilot2` or you merge it (step 5a).
