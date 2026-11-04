"""
Museum, generated in Blender and exported to public/models/museum.glb.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python scripts/blender/museum.py

Illustrative placeholder modelled after the official JCDC concept render: a row of tall,
tapered "petal" shells clad in faceted, mirror-bright metal, separated by dark steel ribs, the
gaps between them closing upward into pointed glazed slots; two stacks with white perforated
crowns rising behind (the converted plant); an elevated walkway along the front and a ribbed
bronze drum at its end.

Local metres (x along the row, y up, z south = front). The web app positions the model.
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib import Model  # noqa: E402

MATERIALS = ["shell", "steel", "glass", "base", "stack", "crown", "deck", "bronze"]
m = Model("museum", MATERIALS, seed=5)
rnd = m.random

ROW = {"count": 14, "pitch": 10.6, "depth": 6.5, "bulge": 2.6}
PETAL = {"base_half": 3.4, "top_half": 5.6, "round": 0.22}
FACETS = {"across": 6, "height": 2.4, "jitter": 0.5}
STACKS = [
    {"x": -24.0, "z": -22.0, "radius": 3.0, "height": 56.0, "crown": 11.0},
    {"x": 30.0, "z": -26.0, "radius": 3.6, "height": 78.0, "crown": 15.0},
]
WALK = {"z": ROW["depth"] + 13, "half_width": 3.5, "height": 7.0, "x0": -96.0, "x1": 92.0}
DRUM = {"x": -104.0, "z": WALK["z"] + 2, "radius": 5.0, "height": 17.0, "ribs": 26}

N = ROW["count"]
centres = [(i - (N - 1) / 2) * ROW["pitch"] for i in range(N)]
# Heights swell toward the east end; the end petals lean outward like the render.
heights = [21 + 9 * (i / (N - 1)) ** 1.4 + rnd.uniform(-1.5, 1.5) for i in range(N)]
leans = [0.16 * ((i - (N - 1) / 2) / ((N - 1) / 2)) ** 3 for i in range(N)]


def half_width(i, v):
    """Petal half-width at relative height v (0 base, 1 top): tapered, with a rounded crown."""
    b, t, r = PETAL["base_half"], PETAL["top_half"], PETAL["round"]
    w = b + (t - b) * min(1.0, v / (1 - r)) ** 0.85
    if v > 1 - r:
        s = (v - (1 - r)) / r
        w *= math.sqrt(max(0.0, 1 - s * s))
    return w


def edge_x(i, v, side):
    """x of petal i's left (side=-1) or right (+1) edge at relative height v."""
    return centres[i] + heights[i] * v * math.tan(leans[i]) + side * half_width(i, v)


def jitter(*key):
    """Stable pseudo-random offset per lattice point, so adjacent facets share vertices."""
    h = hash(key) % 100003 / 100003.0
    return (h - 0.5) * 2 * FACETS["jitter"]


def petal(i):
    H = heights[i]
    D, bulge = ROW["depth"], ROW["bulge"]
    nu = FACETS["across"]
    nv = max(6, round(H / FACETS["height"]))

    def point(u, v, face, iu, iv):
        """Front (face=+1) or back (-1) surface point; u in [-1, 1] across."""
        x = centres[i] + H * v * math.tan(leans[i]) + u * half_width(i, v)
        edge = abs(u) > 0.999 or iv in (0, nv)
        z = face * (D + bulge * (1 - u * u) * math.sqrt(max(0.0, 1 - v)) + (0 if edge else jitter(i, face, iu, iv)))
        return (x, H * v, z)

    for face in (1, -1):
        for iu in range(nu):
            for iv in range(nv):
                u0, u1 = -1 + 2 * iu / nu, -1 + 2 * (iu + 1) / nu
                v0, v1 = iv / nv, (iv + 1) / nv
                a = point(u0, v0, face, iu, iv)
                b = point(u1, v0, face, iu + 1, iv)
                c = point(u1, v1, face, iu + 1, iv + 1)
                d = point(u0, v1, face, iu, iv + 1)
                want = (0, 0, face)
                # Two triangles per cell: flat-shaded facets catch the light like crumpled foil.
                m.poly("shell", [a, b, c], want)
                m.poly("shell", [a, c, d], want)
    # Sides and crown: strips along z around the outline (left edge up, over the top, right down).
    outline = [(-1, iv / nv) for iv in range(nv + 1)] + [(1, iv / nv) for iv in range(nv, -1, -1)]
    nz = 4
    for n, ((ua, va), (ub, vb)) in enumerate(zip(outline, outline[1:])):
        pa = (centres[i] + H * va * math.tan(leans[i]) + ua * half_width(i, va), H * va)
        pb = (centres[i] + H * vb * math.tan(leans[i]) + ub * half_width(i, vb), H * vb)
        if abs(pa[0] - pb[0]) < 1e-6 and abs(pa[1] - pb[1]) < 1e-6:
            continue
        # Outward normal of the outline segment (outline runs clockwise seen from the front).
        ex, ey = pb[0] - pa[0], pb[1] - pa[1]
        out = (-ey, ex, 0)
        length = math.hypot(ex, ey)
        ox, oy = -ey / length, ex / length

        def side(p, j, k):
            # Crumple the side too, except where it meets the front and back faces.
            d = 0 if k in (0, nz) else jitter(i, "side", j, k)
            return (p[0] + ox * d, p[1] + oy * d, -D + 2 * D * k / nz)

        for k in range(nz):
            a, b = side(pa, n, k), side(pb, n + 1, k)
            c, d = side(pb, n + 1, k + 1), side(pa, n, k + 1)
            m.poly("shell", [a, b, c], out)
            m.poly("shell", [a, c, d], out)


def gap(i):
    """Glazing and steel rib between petals i and i+1, front and back."""
    samples = 40
    left, right, top_v = [], [], 0.0
    for k in range(samples + 1):
        v = 0.8 * k / samples
        y = min(heights[i], heights[i + 1]) * v
        # Edges are sampled at the same height on both petals (their heights differ).
        va, vb = y / heights[i], y / heights[i + 1]
        xa, xb = edge_x(i, va, 1), edge_x(i + 1, vb, -1)
        if xb - xa < 0.25:
            break
        left.append((xa, y))
        right.append((xb, y))
        top_v = y
    D = ROW["depth"]
    for face in (1, -1):
        z = face * (D - 0.35)
        outline = [(x, y, z) for x, y in left] + [(x, y, z) for x, y in reversed(right)]
        if len(outline) >= 3:
            m.poly("glass", outline, (0, 0, face))
            # Mullions every ~3 m up the slot.
            for k in range(1, len(left), 6):
                (xa, y), (xb, _) = left[k], right[k]
                m.box("steel", (xa + xb) / 2, y, z + face * 0.1, xb - xa, 0.18, 0.2)
        # Rib: dark steel down the seam where the petals meet, up to the lower crown.
        x = (edge_x(i, top_v / heights[i], 1) + edge_x(i + 1, top_v / heights[i + 1], -1)) / 2
        top = min(heights[i], heights[i + 1]) * 0.86
        if top > top_v:
            m.box("steel", x, (top_v + top) / 2, face * (D + 0.2), 0.45, top - top_v, 0.7, skip=("bottom",))


def stack(s):
    """Cylindrical stack with a white perforated crown and a dark rim."""
    sides = 20
    r, h, crown = s["radius"], s["height"], s["crown"]
    bands = [(0, h - crown, "stack", r), (h - crown, h, "crown", r * 1.08)]
    for y0, y1, mat, radius in bands:
        rows = max(1, round((y1 - y0) / 4))
        for k in range(sides):
            a0, a1 = 2 * math.pi * k / sides, 2 * math.pi * (k + 1) / sides
            for j in range(rows):
                ya, yb = y0 + (y1 - y0) * j / rows, y0 + (y1 - y0) * (j + 1) / rows
                p = lambda a, y: (s["x"] + radius * math.cos(a), y, s["z"] + radius * math.sin(a))
                mid = (a0 + a1) / 2
                m.poly(mat, [p(a0, ya), p(a1, ya), p(a1, yb), p(a0, yb)], (math.cos(mid), 0, math.sin(mid)))
    # Crown ledge and dark open top.
    ring = [(s["x"] + r * 1.08 * math.cos(2 * math.pi * k / sides), h, s["z"] + r * 1.08 * math.sin(2 * math.pi * k / sides)) for k in range(sides)]
    m.poly("steel", ring, (0, 1, 0))
    under = [(x, h - crown, z) for x, _, z in ring]
    m.poly("crown", under, (0, -1, 0))


def drum(d):
    """Ribbed bronze drum: alternating proud and recessed bands."""
    sides = 28
    for k in range(sides):
        a0, a1 = 2 * math.pi * k / sides, 2 * math.pi * (k + 1) / sides
        for j in range(d["ribs"]):
            y0, y1 = d["height"] * j / d["ribs"], d["height"] * (j + 1) / d["ribs"]
            radius = d["radius"] * (1.0 if j % 2 == 0 else 0.94)
            p = lambda a, y: (d["x"] + radius * math.cos(a), y, d["z"] + radius * math.sin(a))
            mid = (a0 + a1) / 2
            m.poly("bronze", [p(a0, y0), p(a1, y0), p(a1, y1), p(a0, y1)], (math.cos(mid), 0, math.sin(mid)))
    top = [(d["x"] + d["radius"] * math.cos(2 * math.pi * k / sides), d["height"], d["z"] + d["radius"] * math.sin(2 * math.pi * k / sides)) for k in range(sides)]
    m.poly("steel", top, (0, 1, 0))


for i in range(N):
    petal(i)
for i in range(N - 1):
    gap(i)
for s in STACKS:
    stack(s)

# The plant's low base hall beneath and behind the shells.
span = centres[-1] - centres[0] + 2 * PETAL["top_half"]
m.block("base", -span / 2 - 4, span / 2 + 4, -ROW["depth"] - 34, -ROW["depth"] + 1, 0, 14)

# Elevated walkway along the front, on slender columns, with solid parapet upstands.
W = WALK
m.box("deck", (W["x0"] + W["x1"]) / 2, W["height"], W["z"], W["x1"] - W["x0"], 0.8, 2 * W["half_width"])
for side in (-1, 1):
    m.box("steel", (W["x0"] + W["x1"]) / 2, W["height"] + 0.95, W["z"] + side * (W["half_width"] - 0.1), W["x1"] - W["x0"], 1.1, 0.12, skip=("bottom",))
x = W["x0"] + 4
while x < W["x1"]:
    m.box("steel", x, (W["height"] - 0.4) / 2, W["z"], 0.6, W["height"] - 0.4, 0.6, skip=("top", "bottom"))
    x += 12
drum(DRUM)

m.export("museum.glb", ao_distance=12.0)
