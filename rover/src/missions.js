// Two missions on the same real Jezero terrain tile. Start/goal cells were picked by tools (see notes), not by hand.
(function () {
  const MR = (globalThis.MR = globalThis.MR || {});

  const ramp = (t, a, b, v0, v1) => (t <= a ? v0 : t >= b ? v1 : v0 + ((v1 - v0) * (t - a)) / (b - a));

  MR.MISSIONS = {
    storm: {
      id: "storm",
      title: "Sol 1: The Dust Storm",
      threat: "Power",
      brief:
        "A dust storm is building over the crater. Solar power will collapse around midday and the night is long and cold. " +
        "Reach the sample site and send your data home before the storm swallows your panels.",
      start: [95, 47], goal: [67, 39], sample: [67, 39],
      seed: 1101, planWeight: 2, tipSlope: 26, eventCount: 3,
      eventPool: ["dust_gust", "cold_snap", "rock_strike"],
      // storm builds from about step 24 to 40, holds, then clears slowly
      dust: (t) => (t < 56 ? ramp(t, 24, 40, 0.05, 0.75) : ramp(t, 56, 84, 0.75, 0.1)),
      real: "Inspired by the 2018 global dust storm that ended the Opportunity rover's mission.",
    },
    climb: {
      id: "climb",
      title: "Sol 2: The Ridge Climb",
      threat: "Terrain",
      brief:
        "Your science target sits on higher ground. The ground team drew the shortest route in a hurry. " +
        "Parts of it are steep enough to roll a rover. Decide how carefully the rover should look where it drives.",
      start: [39, 27], goal: [19, 30], sample: [19, 30],
      seed: 2202, planWeight: 0.1, tipSlope: 21, eventCount: 2,
      eventPool: ["rock_strike", "cold_snap", "dust_gust"],
      dust: () => 0.05,
      real: "Real slope data from a USGS Mars 2020 Jezero crater elevation model (20 m per pixel).",
    },
  };
  MR.MISSIONS.sand = {
    id: "sand",
    title: "Sol 3: The Sand Trap",
    threat: "Soft sand",
    brief:
      "The shortest way to the sample crosses a field of soft sand. Drive fast and the wheels dig in; drive slow and the sol runs out. " +
      "Use the navigation camera to see what is ahead and decide when to ease off.",
    start: [94, 60], goal: [88, 39], sample: [88, 39],
    seed: 3303, planWeight: 0.1, tipSlope: 26, eventCount: 2,
    eventPool: ["rock_strike", "dust_gust", "cold_snap"],
    dust: () => 0.05,
    real: "Real rovers have been stuck in sand: Opportunity spent weeks freeing its wheels from a dune in 2005. Terrain types here are inferred from the USGS elevation model.",
  };
  MR.MISSIONS.night = {
    id: "night",
    title: "Sol 4: The Night Crossing",
    threat: "Cold",
    brief:
      "You land late in the afternoon and the target is a long drive away. Sunset comes soon and the night drops below -70 °C. " +
      "Decide how far to push before dark, and keep the electronics warm until the sun returns.",
    start: [54, 34], goal: [32, 42], sample: [32, 42],
    seed: 4404, planWeight: 2, tipSlope: 26, eventCount: 3, startTod: 0.6,
    eventPool: ["cold_snap", "cold_snap", "rock_strike", "dust_gust"],
    dust: () => 0.05,
    real: "Mars nights are far colder than Earth's. Real rovers use heaters and radioisotope warmth to keep their electronics alive.",
  };
  MR.MISSION_LIST = [MR.MISSIONS.storm, MR.MISSIONS.climb, MR.MISSIONS.sand, MR.MISSIONS.night];
})();
