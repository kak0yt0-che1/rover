# Rover Rules (working title): program a Mars rover to survive

NASA Space Apps Challenge 2026. You are the engineer, not the driver: design a rover, write IF-THEN rules, send them up as one package, watch the sol play out, read the replay, fix the rules.

## Run it
- Open `index.html` in a browser (works from disk, no server, no build step).
- Publish: push this folder to a GitHub repo, then Settings > Pages > deploy from the main branch root. The Pages URL is the public demo link.
- Logic tests without graphics: `node test/console_test.js` and `node test/balance_test.js`.

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
| `src/ui.js`, `index.html`, `style.css` | screens; only plays back the trace |
| `tools/prep_terrain.py` | one-time data prep: USGS DEM -> `data/terrain_data.js` |

## Data
- Elevation: USGS Astrogeology, Mars 2020 Terrain Relative Navigation CTX DTM Mosaic (Jezero crater, 20 m/px).
  https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic
  Re-create the grid: download the GeoTIFF, then `python3 -I tools/prep_terrain.py JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif data/` (needs `numpy`, `tifffile`).
- Slope is computed by us. Terrain types (regolith / sand / rock) are a heuristic from slope and roughness, informed by NASA AI4Mars (not trained on it, not redistributed).

## Still needs a human (do not trust AI for these)
- Every entry in `src/config.js` marked `verified: false` (sol length, signal delay, temperatures, dust loss, tilt limit): look each up on a NASA page and paste the source.
- Confirm the exact official challenge title and wording on spaceappschallenge.org and use it in the submission.
- The short "Did you know?" lines in `src/ui.js` (FACTS) and the real-world notes in `src/missions.js` are written from general knowledge: confirm each against a NASA page before submitting.
- Re-check the 2026 Project Submission Guide (demo limit, AI-use and watermark rules). The 2025 guide said: video up to 30 s or up to 7 slides, English or English subtitles.
- At least two teammates should be able to explain `sim.js` and `rules.js` in plain words.

## AI-use log (fill in for the submission)
- Code in `src/`, `tools/`, `test/` and `index.html` was first drafted by Claude (Anthropic). Tested by: ______.
