# Submission drafts (field names from ../REQUIREMENTS_2026.md; every `[ ... ]` needs a human)

**Project Name:** Mission Design (with the Mars game Rover Rules)

**High-Level Project Summary:** A browser game for 1 to 4 players where you design a small space mission under six limits (mass, power, budget, data, communications, time): choose a spacecraft, a rocket and an orbit, fly 30 days with random events, and read why it worked. It makes engineering trade-offs concrete for students. A second game lets you program a Mars rover with if / else rules on real Jezero crater terrain.

**Link to Project Demo:** [upload demo/demo.webm (26.6 s) or demo/slides.pdf (7 slides) to a public site and paste the link]

**Link to Final Project:** [public URL after deploying, see DEPLOY.md]

**Team:** [team name], members [names]

**Detailed Project Description:** Players pick a scenario (Coastal Watch, Aurora Watch, Moon Scout) and a difficulty, then build a CubeSat-class spacecraft: bus, solar panels, battery, radio, propulsion and science instruments, plus a launch vehicle class, an orbit and ground stations. A live dashboard shows the six limits and marks the critical ones. The game blocks a launch that breaks a limit, for example a spacecraft too heavy for the rocket or an orbit the rocket cannot reach, and says why. A seeded 30-day simulation runs with random events (solar flare, ground-station outage, instrument glitch, wing failure, launch failure). The report scores performance, science, resource efficiency, decision quality and teamwork, explains the cause, and compares with the previous run. One to four players can hold roles (planner, spacecraft engineer, science lead, communications lead); launch needs every role's approval. Extra modes: sandbox (unscored), hot-seat team competition, share links, saved-design comparison. A quick tour and "why" text explain the concepts; model.html lists formulas and simplifications. Built with plain HTML, CSS and JavaScript (no framework, no server); tested with Node unit tests, a balance simulation of 2000 seeds per cell, and browser click tests with Playwright and axe-core.

**NASA Data:** Rover Rules uses the USGS Astrogeology Mars 2020 TRN CTX DTM mosaic of Jezero crater (built from NASA Mars Reconnaissance Orbiter Context Camera images); slopes computed from it decide tipping and wheel wear. Mission Design uses facts read from NASA pages on 2026-11-15: the NASA Earth Observatory orbit catalog (sun-synchronous example Aqua at about 705 km and 99 minutes; polar orbit; geostationary altitude) and the NASA NSSDC Moon Fact Sheet (distance). They shape the orbit descriptions and model.html. All other Mission Design numbers are simplified game values, not NASA data.

**Space Agency Partner & Other Data:** [confirm] No other datasets. Tools: HTML, CSS, JavaScript, Node.js, Playwright (tests, recording), axe-core (accessibility tests). Code, text and images are listed in REFERENCES.md; all visuals are drawn by our own code.

**Use of Artificial Intelligence:** Yes. Claude (Anthropic) via Claude Code drafted the code, tests, texts and documents; people tested and reviewed Rover Rules, and the team is responsible for the final submission. No AI-generated images, video, audio or data. Details: AI_USE.md. [team to confirm]

**Project Submission Verification:** [team confirms: work is original, external resources are listed, rules read]
