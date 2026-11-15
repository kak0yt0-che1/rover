# AI use disclosure (draft; confirm against the live 2026 Submission Guide)

Rules (from `../REQUIREMENTS_2026.md`): AI use must be stated, where and how; AI images and videos need a visible watermark; AI audio, code and data must be acknowledged in the description and metadata; AI content must not use or modify NASA branding.

- Tool: Claude (Anthropic) in Claude Code.
- Code: all game code (`src/`, `*.html`, `style.css`, `md.css`), tests and scripts (`test/`, `tools/`) were drafted by Claude and then run. Rover Rules was tested by teammates. Mission Design was written and tested by Claude in autonomous sessions and has had no human code review yet.
- Text: README, scenario and hint texts, model notes, submission and demo drafts were written by Claude.
- Data: no AI-generated data. Terrain is real USGS data processed by a script. Orbit facts were read from NASA pages and are cited. Other numbers are invented game values, labelled as such.
- Images: none generated. All visuals are SVG or canvas drawn by code; screenshots are of the game. The demo video is a screen recording of the real game, not AI video.
- Audio: none in the demo video. Rover Rules makes simple tones with the browser's Web Audio API.
- No NASA logos, patches or branding are used or altered.
- The team is responsible for the submission.
