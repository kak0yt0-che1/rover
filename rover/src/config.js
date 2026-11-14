// All game numbers live here, each with a source note.
// Every entry in SOURCES says whether it was checked against a cited page or is a game value.
(function () {
  const MR = (globalThis.MR = globalThis.MR || {});

  const CONFIG = {
    STEPS_PER_SOL: 96,            // game resolution, not a real number
    SOL_HOURS: 24.66,             // 24 h 39 m 35 s mean solar day
    SOL_START_TOD: 0.25,          // the sol starts at 06:00 local solar time

    // power / thermal (game-scaled; see SOURCES for the real-world basis)
    BASE_POWER_W: 8,             // computer + radio idle
    SENSOR_POWER_W: 3,
    DRIVE_POWER_W: 50,
    HEATER_POWER_W: 30,
    DRILL_POWER_W: 120,
    PHOTO_POWER_W: 30,
    SEND_POWER_W: 50,
    HEATER_GAIN_C: 3.5,           // deg C per step while heating
    THERMAL_K: 0.05,              // how fast the rover follows ambient temperature
    TEMP_FAIL_C: -50,             // electronics fail below this (game value)
    COLD_STEPS_TO_DIE: 4,
    AMBIENT_MIN_C: -73,
    AMBIENT_MAX_C: -7,
    DUST_SOLAR_LOSS: 0.9,         // fraction of sunlight lost at dust level 1.0 (storm)

    // terrain effects (game-scaled)
    TIP_SLOPE_DEG: 26,
    TIP_CHANCE_FAST: 0.5,
    TIP_CHANCE_SLOW: 0.12,
    SAND_STUCK_FAST: 0.12,
    SAND_STUCK_SLOW: 0.03,
    STUCK_STEPS: 3,
    SLOPE_SAFE_DEG: 18,           // reroute treats cells above this as very expensive

    // budget
    BUDGET_MASS: 78,
    BUDGET_COST: 115,
    SIGNAL_DELAY_MAX_MIN: 22,     // one-way Earth-Mars, longest delay in minutes (shown in text only, NOT simulated)
  };

  // verified:true  = we opened the cited page and the number matches.
  // kind:"game"    = a game-balance value; the note says what the real world looks like for comparison.
  const SOURCES = {
    SOL_HOURS: { verified: true, note: "24 h 39 m 35 s. Royal Museums Greenwich, 'How long is a day on Mars?' https://www.rmg.co.uk/stories/space-astronomy/how-long-day-on-mars (not a NASA page; opened 2026-11-15). NASA's Mars Fact Sheet lists 24.6597 h (hours), consistent." },
    SIGNAL_DELAY_MAX_MIN: { verified: true, note: "Up to about 22 minutes one-way. NASA NTRS 20220013418, 'Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions' (ASCEND 2022): delays vary from 0 to 22 minutes, https://ntrs.nasa.gov/citations/20220013418 (opened 2026-11-15). The delay is described in text only; the game does not simulate it." },
    AMBIENT_MIN_C: { kind: "game", note: "Real: NASA reports Jezero air temperature of about -83 to -23 C over a typical day (NASA Science, 'Daily records of atmospheric temperature with Perseverance', https://science.nasa.gov/blogs/daily-records-of-atmospheric-temperature-with-perseverance/, opened 2026-11-15). The game uses -73, a bit warmer than reality." },
    AMBIENT_MAX_C: { kind: "game", note: "The game uses -7. See above: real air temperature peaks nearer -23 C." },
    DUST_SOLAR_LOSS: { kind: "game", note: "The game loses up to 90% of sunlight at full dust. Real: the 2018 global dust storm blocked Opportunity's sunlight for about four months; opacity peaked at 10.8 against an average of 0.5 (NASA JPL, 'Mars rover mission comes to an end', https://www.jpl.nasa.gov/edu/resources/teachable-moment/mars-rover-mission-comes-to-an-end-but-science-legacy-live-on/, opened 2026-11-15)." },
    TIP_SLOPE_DEG: { kind: "game", note: "The game tips rovers from 26 deg. Real: Perseverance is designed to withstand a 45 deg tilt, and drivers avoid terrain that would tilt it more than 30 deg (NASA Science, rover components page, https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/, opened 2026-11-15)." },
    TERRAIN: { verified: true, note: "USGS Astrogeology, Mars 2020 TRN CTX DTM Mosaic (Jezero), 20 m/px. Slope computed by us: each 320 m cell uses the steepest 10% of its 20 m slopes, not an average." },
    TERRAIN_TYPES: { verified: true, note: "Our own heuristic from slope and roughness. It does not use or copy any NASA terrain-label data." },
    ALL_OTHER: { kind: "game", note: "Power, wear and probability numbers are game-balance values, not NASA numbers." },
  };

  MR.CONFIG = CONFIG;
  MR.SOURCES = SOURCES;
})();
