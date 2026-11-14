# Mission Design (with the Mars game Rover Rules)

A browser game for 1 to 4 players, made for the NASA Space Apps Challenge 2026, challenge **Space Mission Design Game**
(https://github.com/NASA-SPACEAPP-2026/Space-Mission-Design-Game). Not affiliated with or endorsed by NASA.

**Play:** `[PUBLIC URL: fill in after deploying, see DEPLOY.md]`, or open `index.html` from this folder in a browser (no install, no server, no build step).

## What it is
Pick a mission, design a small spacecraft (bus, solar panels, battery, radio, instruments, propulsion), choose a rocket and an orbit, then fly a 30-day mission with random events. The dashboard shows the six limits live: **mass, power, budget, data, communications, time**. A report says why it worked or failed. Redesign and fly again.

## Play in 2 minutes
1. Open `index.html`, press **Play Mission Design**.
2. Choose "Coastal Watch", press **Start designing**. A short tour explains the six limits (skippable).
3. The starting design is valid but modest. Add the "Multispectral imager", press **Launch mission**.
4. Read the report. Press **Redesign**, change the radio, launch again: the game shows what changed.

## Features (each one has an automated test, see COMPLIANCE.md)
- 3 missions x 3 difficulty levels; several different designs can win (`docs/BALANCE.md` has the numbers).
- Launch is blocked, with the reason, when the spacecraft is too heavy or the rocket cannot reach the orbit.
- Random events with a fixed seed: solar flare, ground-station outage, instrument glitch, wing failure, launch failure.
- Score (100 points): performance, science, resource efficiency, decision quality, teamwork.
- Teams of 1 to 4 with roles (planner, spacecraft, science, communications); launch needs every role's approval.
- Sandbox mode (limits only warn, unscored) and hot-seat team competition (same random events for every team, then a ranking).
- Share a design as a link, save designs, compare two side by side, local leaderboard (this browser only).
- Comparison with your last run of the same mission.
- Quick tour and "why it matters" text next to every choice; `model.html` shows the formulas, simplifications and NASA-sourced values.
- Keyboard use, text status next to colours, axe-core clean on the main screens.
- **Rover Rules** (`rover.html`): program a Mars rover with IF / ELSE IF / ELSE blocks on real Jezero crater terrain.
- Demo mode: `mission.html?demo=1` replays a scripted run of the real game with captions (used for the video).

## Controls
Mouse or touch. Keyboard: Tab to move, Enter or Space to choose, Escape closes dialogs.

## Run the tests (need Node.js 22; the tests also need Edge or Chrome installed)
```
npm install        # dev tools only: playwright-core and axe-core. The game itself has no dependencies.
npm test           # model tests, balance check, rover logic tests
npm run e2e        # real click tests of the UI (about 90 seconds)
node tools/e2e.js --prefix=my-repo   # same tests served under a sub-path, as on GitHub Pages
node tools/shots.js                  # screenshots into docs/shots
node tools/record_demo.js            # demo video into demo/demo.webm (needs: npx playwright-core install ffmpeg)
```
Deploying: see `DEPLOY.md`. Project documents: `COMPLIANCE.md`, `SELF_JUDGING.md`, `SUBMISSION.md`, `AI_USE.md`, `REFERENCES.md`, `DEMO.md`.

## Screenshots
`docs/shots/` (1920x1080): `02_mission_setup.png`, `05_build_valid.png`, `04_launch_blocked.png`, `06_report.png`, `08_team_roles.png`, `10_model_notes.png`, `14_rover_debrief.png`.

## Honest limits
Mission Design numbers are simplified game values, not data for real spacecraft or rockets. Only the facts listed in `model.html` and `REFERENCES.md` come from NASA pages. Leaderboard and saved designs live in your browser only.

---

# Rover Rules (the Mars game)

You are the engineer, not the driver: design a rover, write IF-THEN rules, send them up as one package, watch the sol play out, read the replay, fix the rules. Open `rover.html`.

## Structure (one owner per file)
| File | What it does |
|---|---|
| `src/config.js` | every game number, with a source note and a "verified" flag |
| `src/terrain.js` | terrain grid, A* path planning |
| `src/rover.js` | parts catalogue, budget, which sensors/actions the hardware allows |
| `src/rules.js` | the IF-THEN rule engine (first true rule wins) |
| `src/missions.js` | the four missions (dust storm, ridge climb, sand trap, night crossing) |
| `src/sim.js` | the sol loop: `simulate(design, rules, mission) -> trace + summary`. No drawing here. |
| `src/tune.js` | "AI co-pilot": hill-climbing search over rule thresholds (search, not a trained model) |
| `src/visual.js` | rover drawing: animated side-view SVG for the assembly bay, top-down sprite for the map |
| `src/ui.js`, `rover.html`, `style.css` | Rover Rules screens; only plays back the trace |
| `src/md_model.js`, `src/md_ui.js`, `mission.html`, `md.css` | Mission Design: pure model and score, then the screens |
| `src/md_demo.js` | demo mode (clicks the real game, shows captions) |
| `index.html`, `model.html` | landing page, model notes with formulas |
| `tools/`, `test/` | e2e tests, serve, screenshots, recorder; unit and balance tests |
| `tools/prep_terrain.py` | one-time data prep: USGS DEM -> `data/terrain_data.js` |

## Data
- Elevation: USGS Astrogeology, Mars 2020 Terrain Relative Navigation CTX DTM Mosaic (Jezero crater, 20 m/px).
  https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic
  Re-create the grid: download the GeoTIFF, then `python3 -I tools/prep_terrain.py JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif data/` (needs `numpy`, `tifffile`).
- Slope is computed by us. Terrain types (regolith / sand / rock) are a heuristic from slope and roughness, informed by NASA AI4Mars (not trained on it, not redistributed).

## Sources for the Mars game numbers (checked by teammates; not re-opened in the last session)
- Sol = 24 h 39 m 35 s: Royal Museums Greenwich, "How long is a day on Mars?" https://www.rmg.co.uk/stories/space-astronomy/how-long-day-on-mars (not a NASA page)
- Signal delay up to about 22 min: NASA NTRS, "Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions" (ASCEND 2022). The game does not simulate the delay.
- Jezero air temperature about -83 to -23 C: NASA Science, "Daily records of atmospheric temperature with Perseverance" https://science.nasa.gov/blogs/daily-records-of-atmospheric-temperature-with-perseverance/ (the game's -73 to -7 C is a game value)
- 2018 dust storm (sunlight blocked about four months, opacity peak 10.8 vs 0.5 average): NASA JPL, "Mars rover mission comes to an end but science legacy live on" https://jpl.nasa.gov/edu/news/2019/2/13/mars-rover-mission-comes-to-an-end-but-science-legacy-live-on
- Perseverance tilt (designed for 45 deg, drivers avoid more than 30 deg) and Curiosity wheel wear: NASA Science, rover components https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/
- Opportunity stuck in a dune in 2005 (more than five weeks to escape): NASA JPL PIA07999 https://www.jpl.nasa.gov/images/pia07999-looking-back-at-purgatory-dune
- Terrain: USGS Mars 2020 TRN CTX DTM Mosaic, built from Context Camera images from NASA's Mars Reconnaissance Orbiter; CC0. https://www.usgs.gov/data/mars-2020-terrain-relative-navigation-ctx-dtm-mosaic

## Still needs a human (do not trust AI for these)
- Power, wear and probability numbers are game values (marked "game value" in the in-game Science & sources dialog).
- The Night Crossing note ("heaters and radioisotope warmth") in `src/missions.js` is from general knowledge: confirm it against a NASA page or reword it.
- Terrain types: decide the final wording about AI4Mars before submitting (the code does not use AI4Mars data at all).
- Confirm the exact official challenge title and wording on spaceappschallenge.org and use it in the submission.
- Re-check the 2026 Submission Guide on the live site if it opens (an offline copy is in `../REQUIREMENTS_2026.md`).
- At least two teammates should be able to explain `sim.js` and `rules.js` in plain words.

## AI-use log (fill in for the submission)
- Code in `src/`, `tools/`, `test/`, `*.html` was first drafted by Claude (Anthropic). Tested by: Olzhas Maisuly and Margulan Maratuly.

