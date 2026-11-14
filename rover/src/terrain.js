// Terrain grid (real USGS elevation, slope computed in tools/prep_terrain.py) and A* path planning.
(function () {
  const MR = (globalThis.MR = globalThis.MR || {});

  const TYPE = { REGOLITH: 0, SAND: 1, ROCK: 2 };
  const TYPE_NAMES = ["regolith", "sand", "rock"];

  class Terrain {
    constructor(d) {
      this.w = d.w; this.h = d.h; this.cellM = d.cell_m;
      this.elev = d.elev; this.slope = d.slope; this.type = d.terrain;
      this.source = d.source; this.url = d.url;
    }
    inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    i(x, y) { return y * this.w + x; }
    slopeAt(x, y) { return this.slope[this.i(x, y)]; }
    typeAt(x, y) { return this.type[this.i(x, y)]; }
    elevAt(x, y) { return this.elev[this.i(x, y)]; }
  }

  // What the mission planner knew when it drew the original route: slopes only, no sand map.
  // `w` is how much the ground planner cared about slope (small w = a straighter, riskier route).
  function makePlanCost(w) {
    return function (T, x, y) {
      const s = T.slopeAt(x, y);
      return 1 + w * Math.pow(s / 14, 2);
    };
  }
  const planCost = makePlanCost(2);

  // What the rover uses when it re-plans on board with its own sensors.
  function safeCost(T, x, y) {
    const C = MR.CONFIG;
    const s = T.slopeAt(x, y);
    let c = 1 + 3 * Math.pow(s / 10, 2);
    if (s > C.SLOPE_SAFE_DEG) c += 60;
    const ty = T.typeAt(x, y);
    if (ty === TYPE.SAND) c += 6;
    else if (ty === TYPE.ROCK) c += 1.5;
    return c;
  }

  class Heap {
    constructor() { this.a = []; }
    push(f, v) {
      const a = this.a; a.push([f, v]);
      let i = a.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (a[p][0] <= a[i][0]) break;
        [a[p], a[i]] = [a[i], a[p]]; i = p;
      }
    }
    pop() {
      const a = this.a; const top = a[0]; const last = a.pop();
      if (a.length) {
        a[0] = last; let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < a.length && a[l][0] < a[m][0]) m = l;
          if (r < a.length && a[r][0] < a[m][0]) m = r;
          if (m === i) break;
          [a[m], a[i]] = [a[i], a[m]]; i = m;
        }
      }
      return top;
    }
    get size() { return this.a.length; }
  }

  // 8-neighbour A*. Returns [[x,y],...] from the cell after `start` to `goal`, or null.
  function astar(T, start, goal, costFn) {
    const W = T.w, N = T.w * T.h;
    const g = new Float64Array(N).fill(Infinity);
    const prev = new Int32Array(N).fill(-1);
    const s = T.i(start[0], start[1]), e = T.i(goal[0], goal[1]);
    const hfun = (x, y) => {
      const dx = Math.abs(x - goal[0]), dy = Math.abs(y - goal[1]);
      return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
    };
    g[s] = 0;
    const open = new Heap();
    open.push(hfun(start[0], start[1]), s);
    const closed = new Uint8Array(N);
    while (open.size) {
      const [, cur] = open.pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (cur === e) break;
      const cx = cur % W, cy = (cur / W) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx, ny = cy + dy;
          if (!T.inb(nx, ny)) continue;
          const ni = T.i(nx, ny);
          if (closed[ni]) continue;
          const step = (dx && dy ? Math.SQRT2 : 1) * costFn(T, nx, ny);
          const ng = g[cur] + step;
          if (ng < g[ni]) { g[ni] = ng; prev[ni] = cur; open.push(ng + hfun(nx, ny), ni); }
        }
      }
    }
    if (prev[e] === -1 && s !== e) return null;
    const path = [];
    for (let c = e; c !== s; c = prev[c]) path.push([c % W, (c / W) | 0]);
    return path.reverse();
  }

  MR.TYPE = TYPE; MR.TYPE_NAMES = TYPE_NAMES;
  MR.Terrain = Terrain; MR.astar = astar; MR.planCost = planCost; MR.makePlanCost = makePlanCost; MR.safeCost = safeCost;
  MR.loadTerrain = function (data) { MR.terrain = new Terrain(data || globalThis.TERRAIN_DATA); return MR.terrain; };
})();
