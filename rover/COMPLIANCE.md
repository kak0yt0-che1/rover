# Compliance matrix: Space Mission Design Game

Source of the requirements: the challenge brief `documentation/challenge.md` in github.com/NASA-SPACEAPP-2026/Space-Mission-Design-Game (read 2026-11-15). The Judging & Awards Guide and Project Submission Guide on spaceappschallenge.org could not be opened from this machine (TLS certificate error), so the five criteria below are from a search result quoting the 2025 guide (Impact, Creativity, Validity, Relevance, Presentation). **A human must re-read both 2026 guides** (see MORNING_REPORT.md).

Status: yes / partial / no. Evidence = file or command. "MD" = the Mission Design page `mission.html`; "Rover" = the Mars game `index.html`.

| # | Requirement or criterion | Status | Evidence | To do |
|---|---|---|---|---|
| 1 | Define mission objective and requirements | yes | `MD.SCENARIOS` in `src/md_model.js`; mission cards in `mission.html` | |
| 2 | Design spacecraft and payload | yes | bus, solar, battery, radio, propulsion, payload pickers in `src/md_ui.js` | |
| 3 | Select launch vehicle and orbit | yes | `MD.LAUNCHERS`, `MD.ORBITS` | Vehicles are generic classes, not real ones |
| 4 | Check mass vs orbit and launcher | yes | `MD.analyse` problems "cannot reach"/"carries only"; `node test/md_test.js` | |
| 5 | Six resources shown: mass, power, budget, data, comms, time | yes | "Mission dashboard" panel, one bar per resource | |
| 6 | Each scenario highlights critical resources | yes | `critical` list per scenario, orange "critical" tag | |
| 7 | Simulation | yes | `MD.simulate`, 30 days, seeded, deterministic per seed | Model is simplified |
| 8 | Scoring | yes | `MD.score`: performance 30, science 20, efficiency 20, decisions 15, teamwork 15 | |
| 9 | 1 to 4 players | yes | Player count in setup | Hot-seat only, no network |
| 10 | Distinct roles | yes | four roles in `MD.ROLES`, each owns different choices | |
| 11 | Shared decisions / negotiation | partial | every role must approve; any change clears approvals | No in-game chat or voting UI |
| 12 | Outcome depends on coordination | partial | teamwork score = roles whose goal is met | |
| 13 | Several scenarios + difficulty | yes | 3 scenarios x 3 difficulty levels | |
| 14 | Redesign and rerun | yes | "Redesign" and "Fly again" buttons | |
| 15 | Feedback on why it worked or failed | yes | "Why it went this way", role check, chart with events | |
| 16 | Educational hints | yes | "why" line under each resource and group; lessons attached to events | |
| 17 | More than one valid solution | yes | `test/md_test.js` checks two different designs per scenario can both succeed | |
| 18 | Random events | yes | solar flare, ground outage, instrument glitch, wing deployment, launch failure (seeded) | |
| 19 | Final report | partial | results screen | No printable/exportable report |
| 20 | Interactive vehicle visualisation | partial | Rover has an SVG assembly bay; MD has no spacecraft drawing | Draw a spacecraft that changes with choices |
| 21 | Real-time dashboard | partial | dashboard updates on every choice; results chart is static after the run | |
| 22 | Leaderboard | partial | local to the browser (`md.board`) | Not shared between devices |
| 23 | Save, share, compare designs | partial | save and compare table (local) | No share link |
| 24 | Sandbox mode with no constraints | no | | |
| 25 | Competitive team mode | no | | |
| 26 | Criterion Impact | partial | see SELF_JUDGING.md | |
| 27 | Criterion Creativity | yes | Rover Rules (visual block rules) plus Mission Design | |
| 28 | Criterion Validity | partial | numbers marked game vs sourced in `src/config.js`; tests | MD catalogue numbers are game values |
| 29 | Criterion Relevance | partial | scenario texts tied to real mission types | |
| 30 | Criterion Presentation | partial | README, DEMO.md, SUBMISSION.md drafted | Video and screenshots still to produce |
