"""One-time data prep: USGS Mars 2020 CTX DTM (Jezero crater, 20 m/px) -> compact game grid.
Usage: python3 -I prep_terrain.py <input.tif> <output_dir>
Source: USGS Astrogeology, "Mars 2020 Terrain Relative Navigation CTX DTM Mosaic" (public domain, no access constraints).
"""
import sys, json
import numpy as np
import tifffile

src, outdir = sys.argv[1], sys.argv[2]
dem = tifffile.imread(src).astype("float64")
PIX = 20.0            # metres per source pixel
BLOCK = 16            # source pixels per game cell -> 320 m cells
H, W = dem.shape
gh, gw = H // BLOCK, W // BLOCK
dem = dem[: gh * BLOCK, : gw * BLOCK]

# slope at full resolution (central differences over 2 px = 40 m baseline)
dzdx = (np.roll(dem, -1, 1) - np.roll(dem, 1, 1)) / (2 * PIX)
dzdy = (np.roll(dem, -1, 0) - np.roll(dem, 1, 0)) / (2 * PIX)
slope = np.degrees(np.arctan(np.hypot(dzdx, dzdy)))
slope[:, [0, -1]] = 0; slope[[0, -1], :] = 0

def blocks(a):
    return a.reshape(gh, BLOCK, gw, BLOCK).transpose(0, 2, 1, 3).reshape(gh, gw, -1)

sb = blocks(slope)
elev = blocks(dem).mean(axis=2)
rough = blocks(dem).std(axis=2)
slope_p90 = np.percentile(sb, 90, axis=2)     # "steepest part of the cell"
slope_mean = sb.mean(axis=2)

print("grid", gh, "x", gw, "cell m", PIX * BLOCK)
print("elev", elev.min(), elev.max())
print("slope full-res pct 50/90/99/max:", [round(float(np.percentile(slope, q)), 1) for q in (50, 90, 99, 100)])
print("slope_p90 per cell pct 50/90/99/max:", [round(float(np.percentile(slope_p90, q)), 1) for q in (50, 90, 99, 100)])
print("rough pct 50/90/99:", [round(float(np.percentile(rough, q)), 1) for q in (50, 90, 99)])

# Terrain type is a HEURISTIC from slope + local roughness (informed by AI4Mars classes, not trained on them).
# 0 = regolith (easy), 1 = sand (can trap wheels), 2 = bedrock/rocky (hard on wheels)
r_hi = np.percentile(rough, 75)
terrain = np.zeros((gh, gw), dtype=int)
terrain[(slope_mean < np.percentile(slope_mean, 22)) & (rough < np.percentile(rough, 22))] = 1
terrain[rough > r_hi] = 2

out = {
    "source": "USGS Astrogeology: Mars 2020 TRN CTX DTM Mosaic (Jezero crater), 20 m/px, MOLA-aligned",
    "url": "https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic",
    "cell_m": PIX * BLOCK, "w": gw, "h": gh,
    "elev": np.round(elev, 1).flatten().tolist(),
    "slope": np.round(slope_p90, 1).flatten().tolist(),
    "terrain": terrain.flatten().tolist(),
}
with open(f"{outdir}/terrain.json", "w") as f:
    json.dump(out, f, separators=(",", ":"))
with open(f"{outdir}/terrain_data.js", "w") as f:
    f.write("window.TERRAIN_DATA = " + json.dumps(out, separators=(",", ":")) + ";\n")
print("terrain counts", np.bincount(terrain.flatten()))
