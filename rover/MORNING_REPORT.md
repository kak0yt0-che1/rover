# Morning report

## What works (commands to check)
- `node test/md_test.js` -> "md_test: 81 checks passed" (core of Mission Design).
- `node test/console_test.js`, `node test/balance_test.js` -> Rover Rules logic runs.
- Open `mission.html` in a browser: pick a mission, Start designing, Launch mission. Default designs are valid, so the loop works end to end: objective -> design -> rocket and orbit -> six resources -> simulation -> score and reasons -> Redesign / Fly again.
- Team mode: choose 2 to 4 players, switch role tabs, approve as each role; Launch unlocks after all approve.
- Rover Rules (`index.html`) is linked from the Mission Design header, and back.

## What does not work or is missing
- Sandbox mode, competitive team mode, share link, printable report, shared leaderboard (local only).
- Role approval and the save/compare list were checked by loading pages, not by a human clicking through everything. Please click through once.
- Mission Design numbers are game values, not real vehicle data.
- The 2026 guides were not read (TLS error). Criteria are from the 2025 guide.

## Self-scores (SELF_JUDGING.md)
Impact 3, Creativity 4, Validity 3, Relevance 4, Presentation 2.

## Your manual steps before the deadline
1. Read the 2026 Judging & Awards Guide and Project Submission Guide; fix field names, limits and AI-disclosure wording in SUBMISSION.md, AI_USE.md, DEMO.md.
2. Publish: git push the branch, enable GitHub Pages, test `mission.html` on the public URL.
3. Record the video from DEMO.md (or build the 7 slides) with English subtitles.
4. Confirm the exact challenge title and the facts in `src/ui.js` (FACTS) and `src/missions.js` against NASA pages.
5. Decide about the three `verified: false`/game values in `src/config.js` (temperature, dust, tilt).
6. Fill in the team names in README (AI-use section) and press Submit.
