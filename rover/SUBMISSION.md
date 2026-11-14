# Submission drafts (check every field name and limit against the 2026 Project Submission Guide)

**Project title:** Rover Rules and Mission Design

**Short summary:** A browser game where you design a small space mission (spacecraft, rocket, orbit) under six limits, fly it through random events, and learn why it worked. A second game lets you program a Mars rover with visual IF-THEN-ELSE blocks on real Jezero terrain.

**Detailed description:** Players pick a scenario and difficulty, then build a CubeSat-class spacecraft: bus, solar panels, battery, radio, propulsion and science instruments. They choose a launch vehicle class and an orbit. A live dashboard shows mass, power, budget, data volume, communications and time. The game blocks launches that break limits, for example a spacecraft heavier than the rocket can carry to that orbit. A 30-day simulation runs with seeded random events (solar flare, ground-station outage, instrument glitch, wing failure, launch failure). The report scores performance, science, resource efficiency, decisions and teamwork and explains the cause. One to four players can take roles (planner, spacecraft engineer, science lead, communications lead); launch needs every role to approve. Built with plain HTML, CSS and JavaScript; no server; tests run with Node.

**Space agency data used:** USGS Astrogeology Mars 2020 TRN CTX DTM mosaic (Jezero crater; derived from NASA Mars Reconnaissance Orbiter Context Camera images) for the Mars rover terrain. Elevation gives slopes and terrain types that decide rover tipping and wheel wear. NASA public pages were used for facts quoted in the Mars game (see REFERENCES.md and `src/config.js`).

**Other data and resources:** none; see REFERENCES.md. Mission Design numbers are simplified game values.

**Use of AI:** see AI_USE.md.

**Originality:** the code and text are our own work with AI assistance as disclosed. No third-party art, audio or code is included beyond the cited data. (A human must confirm this statement.)
