// Parts catalogue and rover builder. Hardware decides which sensors and actions the rules may use.
(function () {
  const MR = (globalThis.MR = globalThis.MR || {});

  const PARTS = {
    battery: {
      S: { label: "Battery S (200 Wh)", mass: 6, cost: 8, wh: 200 },
      M: { label: "Battery M (400 Wh)", mass: 12, cost: 16, wh: 400 },
      L: { label: "Battery L (700 Wh)", mass: 22, cost: 30, wh: 700 },
    },
    solar: {
      S: { label: "Solar S (60 W)", mass: 4, cost: 8, w: 60 },
      M: { label: "Solar M (120 W)", mass: 8, cost: 16, w: 120 },
      L: { label: "Solar L (200 W)", mass: 14, cost: 28, w: 200 },
    },
    wheels: {
      std: { label: "Standard wheels", mass: 10, cost: 10, wear: 1.0, stuck: 1.0, speed: 1.0 },
      rugged: { label: "Rugged wheels", mass: 16, cost: 20, wear: 0.5, stuck: 0.6, speed: 0.85 },
    },
    computer: {
      basic: { label: "Computer basic (4 rules)", mass: 2, cost: 6, slots: 4, powerW: 2 },
      std: { label: "Computer standard (6 rules)", mass: 3, cost: 14, slots: 6, powerW: 4 },
      adv: { label: "Computer advanced (8 rules)", mass: 4, cost: 24, slots: 8, powerW: 7 },
    },
    // optional hardware
    options: {
      navcam: { label: "Navigation camera", mass: 4, cost: 12, powerW: 2, gives: "Sensors: slope ahead, terrain ahead" },
      wheelsensor: { label: "Wheel current sensor", mass: 1, cost: 6, powerW: 1, gives: "Sensor: wheel health" },
      sunsensor: { label: "Sun sensor", mass: 1, cost: 4, powerW: 1, gives: "Sensor: sunlight" },
      dustsensor: { label: "Dust / opacity sensor", mass: 1, cost: 8, powerW: 1, gives: "Sensor: dust level" },
      heater: { label: "Heater", mass: 3, cost: 8, powerW: 0, gives: "Action: heat" },
      sciencecam: { label: "Science camera", mass: 3, cost: 10, powerW: 0, gives: "Action: take photo" },
      drill: { label: "Sample drill", mass: 12, cost: 25, powerW: 0, gives: "Action: drill" },
      antenna: { label: "High-gain antenna", mass: 4, cost: 10, powerW: 0, gives: "Action: send data" },
    },
  };
  const CHASSIS = { mass: 20, cost: 15 };

  const SENSOR_NEEDS = { slope_ahead: "navcam", terrain_ahead: "navcam", wheel_health: "wheelsensor", sunlight: "sunsensor", dust: "dustsensor" };
  const ACTION_NEEDS = { heat: "heater", take_photo: "sciencecam", drill: "drill", send_data: "antenna" };

  MR.PARTS = PARTS; MR.SENSOR_NEEDS = SENSOR_NEEDS; MR.ACTION_NEEDS = ACTION_NEEDS;

  MR.defaultDesign = function () {
    return { battery: "M", solar: "M", wheels: "std", computer: "std", options: ["navcam", "heater", "antenna", "sciencecam"] };
  };

  MR.buildRover = function (d) {
    const C = MR.CONFIG;
    const opts = d.options || [];
    const errors = [];
    const b = PARTS.battery[d.battery], s = PARTS.solar[d.solar], w = PARTS.wheels[d.wheels], c = PARTS.computer[d.computer];
    if (!b || !s || !w || !c) return { ok: false, errors: ["Incomplete design"] };
    let mass = CHASSIS.mass + b.mass + s.mass + w.mass + c.mass;
    let cost = CHASSIS.cost + b.cost + s.cost + w.cost + c.cost;
    let optPower = 0;
    for (const o of opts) {
      const p = PARTS.options[o];
      if (!p) { errors.push("Unknown part " + o); continue; }
      mass += p.mass; cost += p.cost; optPower += p.powerW;
    }
    if (mass > C.BUDGET_MASS) errors.push(`Too heavy: ${mass} > ${C.BUDGET_MASS}`);
    if (cost > C.BUDGET_COST) errors.push(`Too expensive: ${cost} > ${C.BUDGET_COST}`);
    const has = (o) => opts.includes(o);
    const sensors = new Set(["battery", "temp", "storage", "time_of_day"]);
    for (const [sn, need] of Object.entries(SENSOR_NEEDS)) if (has(need)) sensors.add(sn);
    const actions = new Set(["follow_plan", "stop", "charge", "reroute", "slow_down", "retreat"]);
    for (const [an, need] of Object.entries(ACTION_NEEDS)) if (has(need)) actions.add(an);
    return {
      ok: errors.length === 0, errors, mass, cost,
      capWh: b.wh, solarW: s.w, slots: c.slots, wheel: w,
      idlePowerW: C.BASE_POWER_W + c.powerW + optPower,
      drivePowerW: C.DRIVE_POWER_W * (mass / 60),
      speed: 0.75 * w.speed * Math.min(1.1, Math.max(0.7, 70 / mass)),
      sensors, actions,
    };
  };
})();
