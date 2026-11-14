# Decisions

- 2026-11-15: The placeholders in the task brief ([PATH], [STACK], [TIME], [DEADLINE], push policy) were not filled. Chose: project folder = this folder, stack = plain HTML/CSS/JS (no build step), no push, no freeze times computed. Work is committed on branch `autopilot`.
- 2026-11-15: The challenge is a spacecraft mission design game (rocket, orbit, six resources). The existing game is a Mars rover rule-programming game. Chose to add a new page `mission.html` (CubeSat-class mission design) beside it and keep Rover Rules as a second experience, instead of rewriting the rover game. Why: smallest honest path to cover the brief's core loop.
- 2026-11-15: Could not open spaceappschallenge.org guides (TLS certificate error on this machine). Did not disable certificate checks. Used the five criteria from a search result and flagged them for human re-check.
- 2026-11-15: Imported the team's `rover-fixed.zip` over the project: it had better-sourced numbers, a `tune.js` fix and a working test loader. Kept my later README note about verification state out; theirs replaced it.
- 2026-11-15: Mission Design numbers are game values (labelled as such), not data for real vehicles. Launchers are generic classes. Why: no verified source for real figures, rule is to never invent sources.
- 2026-11-15: Score uses fixed weights (30/20/20/15/15) and is tied to the brief: performance, science, efficient resource use, decision quality, teamwork.
