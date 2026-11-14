# Rover Rules (working title): program a Mars rover to survive

NASA Space Apps Challenge 2026. You are the engineer, not the driver: design a rover, write IF-THEN rules, send them up as one package, watch the sol play out, read the replay, fix the rules.

## Run it
- Open `index.html` in a browser (works from disk, no server, no build step).
- Publish: push this folder to a GitHub repo, then Settings > Pages > deploy from the main branch root. The Pages URL is the public demo link.
- Logic tests without graphics (need Node.js; run from this folder): `node test/console_test.js` and `node test/balance_test.js`. Both read `data/terrain_data.js`.

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

## Sources for the numbers (checked by opening the page)
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
- Re-check the 2026 Project Submission Guide (demo limit, AI-use and watermark rules). The 2025 guide said: video up to 30 s or up to 7 slides, English or English subtitles.
- At least two teammates should be able to explain `sim.js` and `rules.js` in plain words.

## AI-use log (fill in for the submission)
- Code in `src/`, `tools/`, `test/` and `index.html` was first drafted by Claude (Anthropic). Tested by: Olzhas Maisuly and Margulan Maratuly.
