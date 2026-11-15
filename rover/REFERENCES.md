# External resources

| Resource | Used for | Licence | Link |
|---|---|---|---|
| USGS Astrogeology, Mars 2020 TRN CTX DTM Mosaic | Jezero terrain in Rover Rules | CC0 (as stated by USGS) | https://www.usgs.gov/data/mars-2020-terrain-relative-navigation-ctx-dtm-mosaic |
| Royal Museums Greenwich, "How long is a day on Mars?" | sol length | text reference only | https://www.rmg.co.uk/stories/space-astronomy/how-long-day-on-mars |
| NASA NTRS, Communication Delays for Crewed Mars Missions (ASCEND 2022) | signal delay text | NASA public | https://ntrs.nasa.gov |
| NASA Science, Perseverance rover components | tilt limits, wheels | NASA public | https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/ |
| NASA JPL, Opportunity end of mission (2019) | dust storm | NASA public | https://jpl.nasa.gov |
| anthropics/skills `frontend-design` | design guidance while building the UI (installed into `.agents/`, not shipped in the game) | see the repo licence, check before redistributing | https://github.com/anthropics/skills |
| Fonts | none loaded: the game uses system fonts | n/a | |
| Images, audio, 3D models | none; visuals are inline SVG/canvas drawn in code, sounds are generated with the Web Audio API | n/a | |
| NASA-SPACEAPP-2026/Space-Mission-Design-Game | read only for the challenge text; no code copied | n/a | https://github.com/NASA-SPACEAPP-2026/Space-Mission-Design-Game |

Mission Design catalogue numbers (`src/md_model.js`) are game values, not taken from any source.

## Added during the second autonomous session (pages opened 2026-11-15)
| Resource | Used for | Licence | Link |
|---|---|---|---|
| NASA Earth Observatory, Catalog of Earth Satellite Orbits | orbit card text, `model.html` (Aqua 705 km, sun-synchronous purpose, polar, geostationary) | NASA content, reused with attribution; no NASA logos used | https://science.nasa.gov/earth/earth-observatory/catalog-of-earth-satellite-orbits |
| NASA NSSDC Moon Fact Sheet | Moon distance in lunar orbit card and `model.html` | NASA public data | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html |
| playwright-core 1.49.1 (dev only, not shipped) | end-to-end tests in `tools/` | Apache-2.0 | https://github.com/microsoft/playwright |
| axe-core 4.10.2 (dev only, not shipped) | accessibility checks in `tools/e2e_tests.js` | MPL-2.0 | https://github.com/dequelabs/axe-core |
| Playwright ffmpeg build (dev only, downloaded by `npx playwright-core install ffmpeg`, not committed) | encodes `demo/demo.webm` | see the Playwright project | https://github.com/microsoft/playwright |
