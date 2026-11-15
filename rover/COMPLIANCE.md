# Compliance matrix (source: ../REQUIREMENTS_2026.md, the offline copy of the 2026 challenge, criteria and submission rules)

Status: done / partial / missing. Proof = test name (in `tools/e2e_tests.js` unless noted), file or screenshot (`docs/shots/`).

| Requirement | Status | Proof |
|---|---|---|
| Define mission objective and requirements | done | 3 scenarios with objective text; flow tests; `02_mission_setup.png` |
| Design spacecraft and payload (structure, power, battery, comms, instruments) | done | build screen; `05_build_valid.png`. Onboard computer and attitude control are NOT modelled (stated in `model.html`) |
| Select launch vehicle and orbit, several orbits explained simply | done | orbit cards with sunlight, eclipse and contact numbers |
| Mass fits orbit and launcher | done | `test/md_test.js` rejection checks; "blocked launch" tests; `04_launch_blocked.png` |
| Six resources shown, critical ones highlighted per scenario | done | dashboard "critical" tags; "axe" and "status is text" tests |
| Simulation and evaluation | done | `MD.simulate`; `test/md_test.js` (95 checks) |
| Scoring (performance, science, efficiency, decisions, teamwork) | done | `MD.score`; `06_report.png` |
| Difficulty levels and scenarios | done | 9 "flow" tests; `docs/BALANCE.md` |
| No single perfect solution, multiple valid designs | done (within a small model) | `test/md_balance.js` targets; `docs/BALANCE.md`. A cheaper and a more reliable design both win |
| Random events | done | events in `MD.simulate`; demo seed check in `md_test.js` |
| Modify design and rerun | done | "Redesign" and "Fly again" in the flow tests |
| Clear feedback, post-mission analysis | done | "Why it went this way"; "post-mission delta" test |
| 1 to 4 players, distinct roles, shared decisions | done (hot-seat) | "team mode 2, 3, 4 players" and "coop: assignment, team board, concerns, ready" tests; `MD.assignRoles`, `MD.roleReport` in `md_test.js`. Negotiation is by talking; the game shows concerns and who can help, and enforces approval |
| Outcome depends on coordination | partial | teamwork score = roles whose goal the final design meets |
| Cooperative mode | done | team mode |
| Competitive mode between teams | done | "team competition" test |
| Sandbox mode | done | "sandbox" test |
| Leaderboard | partial | local to the browser only |
| Save, share and compare designs | done | "share link", "compare two saved designs", "save, reload, load back" tests |
| Interactive vehicle visualisation | partial | 2D drawing changes with the choices and flies in the flight screen (`05_build_valid.png`); not 3D |
| Real-time dashboard | done | updates on every choice (hangar and GO/NO-GO bar); the animated mission (`src/md_flight.js`) plays the whole flight: countdown, ascent with Max-Q, stage and fairing separation, spacecraft release, Moon transit and orbit burn for the lunar mission, wing deployment, then the 30 days in orbit with sunlight, eclipse, instrument sensing, ground-station contact and every random event, driven by the real simulation result ("flight screen plays" test) |
| Final post-simulation report | partial | on screen only; no printable or exportable file |
| Educational: explanations, short tutorial, why | done | "tour" test; why lines; "model notes page" test |
| Accessible to beginners | partial | valid starter designs, tour, axe clean. No testing with real beginners |
| Realistic constraints | partial | simplified; real values only those on `model.html` |
| Works from a public URL | partial | relative paths; whole e2e suite passes under a sub-path; the real URL exists only after a human deploys (`DEPLOY.md`) |
| Submission kit | partial | `SUBMISSION.md`, `AI_USE.md`, `demo/demo.webm`, `demo/slides.pdf`; `[ ... ]` placeholders remain for humans |
| Five judging criteria | see SELF_JUDGING.md | |
