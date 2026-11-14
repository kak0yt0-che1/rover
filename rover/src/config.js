// All game numbers live here, each with a source note.
// verified:false = still needs a human to check it against a NASA source (do NOT trust AI-recalled numbers).
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
    SIGNAL_DELAY_MIN: [3, 22],    // one-way Earth-Mars, minutes (display only)
  };

  const SOURCES = {
    SOL_HOURS: { verified: false, note: "Mars mean solar day = 24 h 39 m 35 s. Check against NASA Mars fact sheet." },
    SIGNAL_DELAY_MIN: { verified: false, note: "One-way light time Earth-Mars, roughly 3-22 min. Check NASA/JPL." },
    AMBIENT_MIN_C: { verified: false, note: "Jezero diurnal air temperature range. Check Perseverance MEDA data (NASA PDS)." },
    AMBIENT_MAX_C: { verified: false, note: "Same as above." },
    DUST_SOLAR_LOSS: { verified: false, note: "Global dust storms cut solar power by a large fraction (Opportunity 2018). Check NASA release." },
    TIP_SLOPE_DEG: { verified: false, note: "Game value. Real rovers have tilt limits; look up the Perseverance/Curiosity limit." },
    TERRAIN: { verified: true, note: "USGS Astrogeology, Mars 2020 TRN CTX DTM Mosaic (Jezero), 20 m/px. Slope computed by us." },
    TERRAIN_TYPES: { verified: true, note: "Heuristic from slope + roughness, informed by (not trained on) NASA AI4Mars classes. Say this in the write-up." },
    ALL_OTHER: { verified: false, note: "Power, wear and probability numbers are game-balance values, not NASA numbers." },
  };

  MR.CONFIG = CONFIG;
  MR.SOURCES = SOURCES;
})();
