"""
Oceanarium & Coral Farm, generated in Blender and exported to public/models/oceanarium.glb.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python scripts/blender/oceanarium.py

Illustrative placeholder modelled after the official JCDC concept renders (day and night): pale
stone halls at the water's edge under broad, overlapping copper-lattice canopies on slender
posts that cantilever out over the sea; lattice-clad glass cubes rising through the canopies;
timber decks and a jetty over the water.

Local metres (x east = inland, y up from the quay level, z south). The sea lies to the west
(−x); the water surface is 2.2 m below local y = 0 (COAST.landHeight).
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib import Model  # noqa: E402

MATERIALS = ["stone", "copper", "glass", "deck", "post"]
m = Model("oceanarium", MATERIALS, seed=3)
rnd = m.random

WATER = -2.2
SEG = 8.0  # long members are split so occlusion has vertices along them

# Stone halls: x0, x1, z0, z1, height.
HALLS = [
    (-72, -14, -46, 18, 12),
    (-12, 38, -32, 30, 9),
    (-92, -60, 18, 48, 8),
    (6, 40, 32, 52, 6),
]
# Lattice canopies: x0, x1, z0, z1, level.
CANOPIES = [
    (-100, -18, -62, 10, 17.0),
    (-44, 34, -20, 52, 19.5),
    (-24, 50, -68, -14, 15.5),
    (-112, -56, 4, 60, 14.0),
    (4, 62, 30, 66, 13.0),
]
LATTICE = {"pitch": 1.75, "width": 0.46, "depth": 0.42, "fascia": 0.9}
# Lattice cubes: centre x, z, size, base level.
CUBES = [
    (-56, -32, 18, 17.0),
    (-14, 6, 21, 19.5),
    (-64, 20, 15, 14.0),
    (14, -42, 15, 15.5),
    (24, 10, 16, 19.5),
]
SCREEN = {"vertical": 1.5, "horizontal": 3.0, "offset": 0.5, "width": 0.22}


def beam_x(mat, x0, x1, y, z, w, d):
    """Member along x, split into segments."""
    n = max(1, round((x1 - x0) / SEG))
    for k in range(n):
        a, b = x0 + (x1 - x0) * k / n, x0 + (x1 - x0) * (k + 1) / n
        m.box(mat, (a + b) / 2, y, z, b - a, d, w, skip=("east", "west") if 0 < k < n - 1 else ())


def beam_z(mat, z0, z1, y, x, w, d):
    n = max(1, round((z1 - z0) / SEG))
    for k in range(n):
        a, b = z0 + (z1 - z0) * k / n, z0 + (z1 - z0) * (k + 1) / n
        m.box(mat, x, y, (a + b) / 2, w, d, b - a, skip=("north", "south") if 0 < k < n - 1 else ())


def canopy(x0, x1, z0, z1, y):
    """Open copper trellis: a square grid of members inside a deeper perimeter fascia."""
    p, w, d, f = LATTICE["pitch"], LATTICE["width"], LATTICE["depth"], LATTICE["fascia"]
    x = x0 + p
    while x < x1 - p / 2:
        beam_z("copper", z0, z1, y, x, w, d)
        x += p
    z = z0 + p
    while z < z1 - p / 2:
        beam_x("copper", x0, x1, y + 0.02, z, w, d)
        z += p
    for zz in (z0, z1):
        beam_x("copper", x0 - 0.2, x1 + 0.2, y, zz, 0.4, f)
    for xx in (x0, x1):
        beam_z("copper", z0, z1, y, xx, 0.4, f)


def posts():
    """Slender columns on a loose grid under every canopy, clear of the halls."""
    def inside_hall(x, z):
        return any(h[0] - 1 < x < h[1] + 1 and h[2] - 1 < z < h[3] + 1 for h in HALLS)

    placed = []
    for x0, x1, z0, z1, y in CANOPIES:
        x = x0 + 4
        while x < x1:
            z = z0 + 4
            while z < z1:
                if not inside_hall(x, z) and all(math.hypot(x - px, z - pz) > 9 for px, pz in placed):
                    base = WATER if x < -60 else 0.0
                    m.box("post", x, (y + base) / 2, z, 0.4, y - base, 0.4, skip=("top", "bottom"))
                    placed.append((x, z))
                z += 16
            x += 16


def cube(cx, cz, size, base):
    """Glass volume behind a copper screen of slender verticals and wider horizontal bands."""
    h = size
    x0, x1, z0, z1 = cx - size / 2, cx + size / 2, cz - size / 2, cz + size / 2
    m.block("glass", x0, x1, z0, z1, base, base + h, step=size / 3)
    o, w = SCREEN["offset"], SCREEN["width"]
    for side, (fixed, along0, along1, axis) in enumerate(
        [(z1 + o, x0, x1, "x"), (z0 - o, x0, x1, "x"), (x1 + o, z0, z1, "z"), (x0 - o, z0, z1, "z")]
    ):
        a = along0
        while a <= along1 + 1e-6:
            if axis == "x":
                m.box("copper", a, base + h / 2, fixed, w, h, w)
            else:
                m.box("copper", fixed, base + h / 2, a, w, h, w)
            a += SCREEN["vertical"]
        y = base + 0.6
        while y < base + h:
            if axis == "x":
                beam_x("copper", along0 - o, along1 + o, y, fixed, w, 0.5)
            else:
                beam_z("copper", along0 - o, along1 + o, y, fixed, w, 0.5)
            y += SCREEN["horizontal"]
    # Roof trellis and cornice.
    canopy(x0 - o, x1 + o, z0 - o, z1 + o, base + h + 0.4)


for x0, x1, z0, z1, h in HALLS:
    m.block("stone", x0, x1, z0, z1, WATER if x0 < -60 else 0.0, h)
for c in CANOPIES:
    canopy(*c)
posts()
for c in CUBES:
    cube(*c)

# Decks over the water: a broad landing on the seaward side and a long jetty.
m.box("deck", -104, -0.6, -12, 22, 0.5, 44, skip=("bottom",))
m.box("deck", -150, -0.6, -4, 70, 0.5, 6, skip=("bottom",))
for k in range(8):
    x = -118 - k * 9
    for zz in (-6.6, -1.4):
        m.box("post", x, (WATER - 0.6) / 2 - 0.3, zz, 0.35, -0.6 - WATER, 0.35, skip=("top", "bottom"))
# Entrance terrace on the land side.
m.box("deck", 52, 0.25, 58, 30, 0.5, 24, skip=("bottom",))

m.export("oceanarium.glb", ao_distance=8.0)
