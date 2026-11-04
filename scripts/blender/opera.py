"""
Opera House, generated in Blender and exported to public/models/opera-house.glb.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python scripts/blender/opera.py

Illustrative placeholder modelled after the official JCDC concept render: two rectilinear
volumes — a taller main hall and a lower second hall — wrapped in dense, pale fluted stone with
a scalloped crown, scattered tall window slots and gold lattice bays, a low wave-arched glazed
entrance cut into the base of the main hall, and a glazed lobby with a timber canopy between.

Local metres (x along the peninsula toward land, y up, z south); the web app rotates the model
onto the peninsula. Entrances face south.
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib import Model  # noqa: E402

MATERIALS = ["limestone", "roof", "lattice", "glass", "foyer", "timber"]
m = Model("opera", MATERIALS, seed=11)
rnd = m.random

FLUTE = {"width": 1.9, "depth": 0.55, "segments": 4, "parapet": 0.6}
SLOT_RECESS = 0.25
STEP = 4.0  # vertical subdivision for the occlusion bake

# Volumes: x0, x1, z0, z1, height; crown = (amplitude, period) of the scalloped top edge.
MAIN = {"x0": -76, "x1": -6, "z0": -34, "z1": 30, "h": 38, "crown": (4.0, 11.0)}
MAIN_TOP = {"x0": -66, "x1": -16, "z0": -26, "z1": 20, "h": 47, "crown": (2.5, 7.0)}
SECOND = {"x0": 14, "x1": 76, "z0": -30, "z1": 26, "h": 27, "crown": (0.0, 1.0)}
SECOND_TOP = {"x0": 20, "x1": 58, "z0": -24, "z1": 12, "h": 33, "crown": (0.0, 1.0)}
LOBBY = {"x0": -6, "x1": 14, "z0": -14, "z1": 22, "h": 11}
ARCH = {"a0": 12, "a1": 46, "height": 11, "depth": 6}  # along the main hall's south face


def arch_height(t):
    """Low wave arch: rises from both ends to a soft crest, with a gentle ripple."""
    if t <= 0 or t >= 1:
        return 0.0
    return ARCH["height"] * math.sin(math.pi * t) ** 0.75 * (1 + 0.07 * math.sin(5 * math.pi * t))


def window_slots(columns, height, density, bays):
    """Per column: sorted, non-overlapping (y0, y1, material) slots. Like the render: narrow
    single-flute openings that line up storey by storey in some columns, plus a few gold
    lattice bays a few flutes wide spanning two or three storeys."""
    slots = [[] for _ in range(columns)]
    floor, opening = 5.0, 3.6
    levels = [6 + floor * k for k in range(20) if 6 + floor * k + opening < height - 4]
    for c in range(columns):
        if rnd.random() < density:
            for y in levels:
                if rnd.random() < 0.55:
                    slots[c].append([y, y + opening + floor * rnd.choice((0, 0, 1)), "glass"])
    for _ in range(bays):
        c0 = rnd.randrange(1, max(2, columns - 5))
        y0 = rnd.choice(levels[:-1] or levels)
        y1 = min(y0 + floor * rnd.randint(2, 3) - (floor - opening), height - 4)
        for c in range(c0, min(columns - 1, c0 + rnd.randint(2, 3))):
            slots[c] = [s for s in slots[c] if s[1] < y0 - 0.5 or s[0] > y1 + 0.5]
            slots[c].append([y0, y1, "lattice"])
    for c in range(columns):
        merged = []
        for s in sorted(slots[c]):
            if merged and s[0] <= merged[-1][1] + 0.6:
                merged[-1][1] = max(merged[-1][1], s[1])
                if s[2] == "lattice":
                    merged[-1][2] = "lattice"
            else:
                merged.append(list(s))
        slots[c] = merged
    return slots


def fluted_wall(start, end, y0, y1, crown, roof, windows=None, arch=None, flute=FLUTE):
    """Fluted stone skin from `start` to `end` (x, z), outward to the right of travel
    (perimeters run clockwise seen from above). The skin rises past the roof (y1) as a
    parapet whose top follows the crown wave; `arch` cuts a glazed opening into the base."""
    sx, sz = start
    dx, dz = end[0] - start[0], end[1] - start[1]
    length = math.hypot(dx, dz)
    dx, dz = dx / length, dz / length
    nx, nz = dz, -dx  # outward
    columns = max(1, round(length / flute["width"]))
    w = length / columns
    seg = flute["segments"]
    depth, back = flute["depth"], flute["parapet"]
    amp, period = crown

    def at(a, off, y):
        return (sx + dx * a + nx * off, y, sz + dz * a + nz * off)

    def top(a):
        return y1 + amp * abs(math.sin(math.pi * a / period)) if amp else y1 + 1.2

    def base(a):
        if arch and arch["a0"] < a < arch["a1"]:
            return y0 + arch_height((a - arch["a0"]) / (arch["a1"] - arch["a0"]))
        return y0

    out = (nx, 0, nz)
    up, down = (0, 1, 0), (0, -1, 0)
    slots = windows or [[] for _ in range(columns)]
    for c in range(columns):
        a0 = c * w
        pts = [(a0 + w * k / seg, depth * math.sin(math.pi * k / seg)) for k in range(seg + 1)]
        col_slots = [(y0 + s0, y0 + s1, mat) for s0, s1, mat in slots[c]]
        for k in range(seg):
            (aa, oa), (ab, ob) = pts[k], pts[k + 1]
            ba, bb = base(aa), base(ab)
            ta, tb = top(aa), top(ab)
            # Vertical breaks: occlusion grid, slot edges.
            lo = max(ba, bb)
            breaks = {lo}
            y = math.floor(lo / STEP) * STEP + STEP
            while y < y1:
                breaks.add(y)
                y += STEP
            breaks.add(y1)
            for s0, s1, _ in col_slots:
                breaks.update((s0, s1))
            breaks = sorted(b for b in breaks if lo <= b <= y1)
            # Bottom strip follows the (possibly sloping) arch soffit.
            first = breaks[0] if len(breaks) > 1 else lo
            spans = [(None, first)] + list(zip(breaks, breaks[1:])) + [(y1, None)]
            for ya, yb in spans:
                if ya is None:  # base strip (follows the arch line)
                    if ba == bb == lo:
                        continue
                    m.quad("limestone", at(aa, oa, ba), at(aa, oa, lo), at(ab, ob, lo), at(ab, ob, bb))
                    continue
                if yb is None:  # parapet up to the crown
                    m.poly("limestone", [at(aa, oa, ya), at(aa, oa, ta), at(ab, ob, tb), at(ab, ob, ya)], out)
                    continue
                if yb - ya < 1e-3:
                    continue
                in_slot = next((s for s in col_slots if s[0] <= ya + 1e-3 and yb <= s[1] + 1e-3), None)
                if in_slot:
                    continue
                m.quad("limestone", at(aa, oa, ya), at(aa, oa, yb), at(ab, ob, yb), at(ab, ob, ya))
            # Crown cap and the parapet's inner face (seen from above).
            m.poly("limestone", [at(aa, oa, ta), at(aa, -back, ta), at(ab, -back, tb), at(ab, ob, tb)], up)
            m.poly("roof", [at(aa, -back, roof), at(aa, -back, ta), at(ab, -back, tb), at(ab, -back, roof)], (-nx, 0, -nz))
            # Underside of the skin over the arch, then the timber soffit back to the glazing.
            if ba > y0 + 0.05 or bb > y0 + 0.05:
                m.poly("limestone", [at(aa, oa, ba), at(aa, -back, ba), at(ab, -back, bb), at(ab, ob, bb)], down)
                m.poly("timber", [at(aa, -back, ba), at(aa, -arch["depth"], ba), at(ab, -arch["depth"], bb), at(ab, -back, bb)], down)
                m.poly("foyer", [at(aa, -arch["depth"], y0), at(aa, -arch["depth"], ba), at(ab, -arch["depth"], bb), at(ab, -arch["depth"], y0)], out)
        # Slots: recessed glazing / lattice, jambs, and caps closing the flute above and below.
        for s0, s1, mat in col_slots:
            r = -SLOT_RECESS
            m.quad(mat, at(a0, r, s0), at(a0, r, s1), at(a0 + w, r, s1), at(a0 + w, r, s0))
            m.poly("limestone", [at(a0, 0, s0), at(a0, r, s0), at(a0, r, s1), at(a0, 0, s1)], (dx, 0, dz))
            m.poly("limestone", [at(a0 + w, 0, s0), at(a0 + w, r, s0), at(a0 + w, r, s1), at(a0 + w, 0, s1)], (-dx, 0, -dz))
            arc = [at(a, o, s1) for a, o in pts] + [at(a0 + w, r, s1), at(a0, r, s1)]
            m.poly("limestone", arc, down)
            arc = [at(a, o, s0) for a, o in pts] + [at(a0 + w, r, s0), at(a0, r, s0)]
            m.poly("limestone", arc, up)


def volume(v, y0=0.0, density=0.12, bays=0, arch_side=None, flute=FLUTE):
    """Fluted box: four walls clockwise from the north-west corner, plus its roof."""
    x0, x1, z0, z1, h = v["x0"], v["x1"], v["z0"], v["z1"], v["h"]
    corners = [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]
    names = ["north", "east", "south", "west"]
    for i, name in enumerate(names):
        start, end = corners[i], corners[(i + 1) % 4]
        length = math.hypot(end[0] - start[0], end[1] - start[1])
        columns = max(1, round(length / flute["width"]))
        windows = window_slots(columns, h - y0, density, bays) if density else None
        arch = ARCH if name == arch_side else None
        if arch and windows:
            # Keep the stone above the arch solid for a storey.
            span = (arch["a0"] / length * columns, arch["a1"] / length * columns)
            for c in range(int(span[0]) - 1, int(span[1]) + 2):
                if 0 <= c < columns:
                    windows[c] = [s for s in windows[c] if s[0] > ARCH["height"] + 4]
        fluted_wall(start, end, y0, h, v["crown"], h, windows, arch, flute)
    m.grid("roof", (x0, h, z0), (0, 0, 1), (1, 0, 0), z1 - z0, x1 - x0, 8.0)


volume(MAIN, density=0.3, bays=2, arch_side="south")
volume(MAIN_TOP, y0=MAIN["h"], density=0, flute={**FLUTE, "width": 1.3, "depth": 0.4})
volume(SECOND, density=0.3, bays=2)
volume(SECOND_TOP, y0=SECOND["h"], density=0, flute={**FLUTE, "width": 1.3, "depth": 0.4})

# Glazed lobby between the halls, under a deep timber canopy reaching out over the forecourt.
L = LOBBY
m.wall_z("foyer", L["z1"], L["x0"], L["x1"], 0, L["h"] - 1, 1)
m.wall_z("foyer", L["z0"], L["x0"], L["x1"], 0, L["h"] - 1, -1)
m.box("timber", (L["x0"] + L["x1"]) / 2, L["h"] - 0.4, (L["z0"] + L["z1"]) / 2 + 4,
      L["x1"] - L["x0"] + 6, 1.4, L["z1"] - L["z0"] + 20, skip=("bottom",))
m.grid("timber", (L["x0"] - 3, L["h"] - 1.1, L["z0"] - 6), (1, 0, 0), (0, 0, 1),
       L["x1"] - L["x0"] + 6, L["z1"] - L["z0"] + 20, 4.0, tint=0.8)
for i in range(7):  # slender columns under the canopy's outer edge
    x = L["x0"] - 1 + (L["x1"] - L["x0"] + 2) * i / 6
    m.box("timber", x, (L["h"] - 1.1) / 2, L["z1"] + 13, 0.5, L["h"] - 1.1, 0.5, skip=("top", "bottom"))

m.export("opera-house.glb", ao_distance=12.0)
