# Demo kit

Rules (from ../REQUIREMENTS_2026.md): video up to 30 seconds with English subtitles, OR up to 7 slides including the title slide; hosted on an external public site (no uploads to the Space Apps site).

## Ready now
- `demo/demo.webm`: 1920x1080, 26.6 s, recorded from the real game with burned-in English captions. Record again with your team name and link: `node tools/record_demo.js --team="Your Team" --url="https://your-url"` (needs `npx playwright-core install ffmpeg` once). It is .webm, not .mp4; YouTube and Google Drive accept it. No ffmpeg command-line tool was available to convert it.
- `demo/slides.pdf` (source `demo/slides.html`): 7 slides, English, large text. Fill in team name, members and URL in the HTML, then print again: `msedge --headless --print-to-pdf=demo/slides.pdf demo/slides.html`.
- Live preview of the scripted run: open `mission.html?demo=1` (add `&speed=2` for slower).

## What the video shows (about 26 s)
1. Team card, challenge card, title (5.6 s). 2. Build screen with the live six-limit dashboard. 3. A blocked launch with its reason, then the fix. 4. Launch: 30 days with two solar flares. 5. The report with "why". 6. Four players with roles. 7. End card (plans, not built; URL).

## If you prefer to record yourself with OBS (5 minutes)
Open `mission.html?demo=1&team=Your+Team&url=your-url` in Edge at 1920x1080, start OBS Window Capture, reload the page so it starts at the first card, stop after the end card (about 27 s), export as MP4.
