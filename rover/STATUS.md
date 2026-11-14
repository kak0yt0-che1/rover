# Status (2026-11-15, autopilot branch)

Done and checked by running:
- Merged the team's `rover-fixed.zip` (sourced numbers, `tune.js` fix, test loader). `node test/console_test.js`, `node test/balance_test.js` run.
- Mission Design model `src/md_model.js` and `node test/md_test.js` (81 checks pass): rejection of impossible designs, determinism, score range, two different winning designs per scenario.
- Mission Design page `mission.html`: setup, build with spacecraft drawing and six-resource dashboard, roles and approvals (checked in a headless Edge screenshot at 1280 and 390 px wide), launch, results with chart and reasons, saved designs, local leaderboard.
- Docs: COMPLIANCE, DECISIONS, REFERENCES, SELF_JUDGING, AI_USE, DEMO, SUBMISSION, MORNING_REPORT.

Not done / risks:
- 2026 Judging Guide and Submission Guide could not be opened (TLS error). Criteria and fields are from the 2025 guide via search.
- No sandbox mode, no competitive team mode, no share link, no printable report.
- Team mode is hot-seat only. The role approval flow was only checked by loading the page, not clicked through by a person.
- Mission Design numbers are game values.
