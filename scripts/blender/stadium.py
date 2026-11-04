"""
Stadium exterior, generated in Blender and exported to public/models/stadium.glb.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python scripts/blender/stadium.py

Illustrative placeholder modelled after the official JCDC concept renders: a rectangular hall
under a vast timber-louvre roof with a rectangular opening over the pitch, Hijazi wind towers on
the roof edge, stepped louvred terraces over limestone walls with vertical timber fins, and a
grand stair to the elevated east entrance. It wraps the existing explorable bowl (see
src/experience/config/stadium.ts): those dimensions are mirrored below and must stay in sync.

Ambient occlusion is baked with Cycles into the COLOR_0 vertex colours (multiplied with a
per-panel tint); materials carry only a name, and the web app assigns textured PBR materials.
Coordinates below are the web app's stadium-local metres (x east, y up, z south); they are
converted to Blender's Z-up axes when written.
"""

import math
import random
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/models/stadium.glb"
random.seed(7)

# ── Dimensions (metres). Mirrors src/experience/config/stadium.ts where noted. ──────────
BOWL = {"rx": 118, "rz": 140}  # STADIUM.rx / rz
TUNNEL = {"half_width": 4.5, "floor": 14, "ceiling": 19}  # STADIUM.tunnel
HALL = {"hx": 128, "hz": 150, "wall": 2.0, "height": 42.0}
ROOF = {"overhang": 4, "opening_hx": 70, "opening_hz": 84, "underside": 43.0, "deck": 44.2}
TERRACE = {"hx": 172, "hz": 194, "height": 24.0, "forecourt_hz": 34}
PERGOLA = {"hx": 206, "hz": 228, "height": 11.0}
STAIR = {"x_top": HALL["hx"] + 10, "x_bottom": 206, "half_width": 26}
PANEL = {"along": 5.4, "across": 2.3, "gap_along": 0.5, "gap_across": 0.55, "thick": 0.32}
FIN = {"width": 0.32, "depth": 0.9, "pitch": 1.15}
BAY = 12.0  # façade bay rhythm
GRID = 4.0  # wall subdivision so baked occlusion has vertices to live on

MATERIALS = ["limestone", "timber", "timber-dark", "underlay", "glass", "led", "paving", "bronze"]

meshes = {name: bmesh.new() for name in MATERIALS}
tints = {name: [] for name in MATERIALS}  # one RGB per face loop vertex, appended per element


def bl(x, y, z):
    """Web (x, y-up, z-south) → Blender (x, y-north, z-up)."""
    return Vector((x, -z, y))


def add_quad(mat, a, b, c, d, tint=1.0):
    bm = meshes[mat]
    verts = [bm.verts.new(bl(*p)) for p in (a, b, c, d)]
    face = bm.faces.new(verts)
    tints[mat].append((face, tint))


def add_grid(mat, origin, u, v, length_u, length_v, step=GRID, tint=1.0):
    """Subdivided rectangle origin + s·u + t·v (u, v unit vectors), facing u × v."""
    nu = max(1, round(length_u / step))
    nv = max(1, round(length_v / step))
    o, uu, vv = Vector(origin), Vector(u), Vector(v)
    for i in range(nu):
        for j in range(nv):
            p = lambda a, b: tuple(o + uu * (length_u * a / nu) + vv * (length_v * b / nv))
            add_quad(mat, p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1), tint)


def add_box(mat, cx, cy, cz, sx, sy, sz, tint=1.0, skip=()):
    """Axis-aligned box: centre (cx, cy, cz), full sizes; outward faces except those in `skip`
    (any of top, bottom, south, north, east, west), for faces that are always hidden."""
    x0, x1 = cx - sx / 2, cx + sx / 2
    y0, y1 = cy - sy / 2, cy + sy / 2
    z0, z1 = cz - sz / 2, cz + sz / 2
    faces = {
        "top": ((x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0)),
        "bottom": ((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)),
        "south": ((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)),  # +z
        "north": ((x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)),  # −z
        "east": ((x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)),  # +x
        "west": ((x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)),  # −x
    }
    for name, f in faces.items():
        if name not in skip:
            add_quad(mat, *f, tint=tint)


# ── Wall helpers ──────────────────────────────────────────────────────────────────────────
def wall_x(x, z0, z1, y0, y1, outward, holes=()):
    """Wall in the plane x = const between z0..z1, facing ±x; holes are (zA, zB, yA, yB)."""
    nz = max(1, round((z1 - z0) / GRID))
    ny = max(1, round((y1 - y0) / GRID))
    for i in range(nz):
        for j in range(ny):
            za, zb = z0 + (z1 - z0) * i / nz, z0 + (z1 - z0) * (i + 1) / nz
            ya, yb = y0 + (y1 - y0) * j / ny, y0 + (y1 - y0) * (j + 1) / ny
            if any(za >= h[0] - 1e-6 and zb <= h[1] + 1e-6 and ya >= h[2] - 1e-6 and yb <= h[3] + 1e-6 for h in holes):
                continue
            if outward > 0:
                add_quad("limestone", (x, ya, zb), (x, ya, za), (x, yb, za), (x, yb, zb))
            else:
                add_quad("limestone", (x, ya, za), (x, ya, zb), (x, yb, zb), (x, yb, za))


def wall_z(z, x0, x1, y0, y1, outward):
    """Wall in the plane z = const between x0..x1, facing ±z."""
    nx = max(1, round((x1 - x0) / GRID))
    ny = max(1, round((y1 - y0) / GRID))
    for i in range(nx):
        for j in range(ny):
            xa, xb = x0 + (x1 - x0) * i / nx, x0 + (x1 - x0) * (i + 1) / nx
            ya, yb = y0 + (y1 - y0) * j / ny, y0 + (y1 - y0) * (j + 1) / ny
            if outward > 0:
                add_quad("limestone", (xa, ya, z), (xb, ya, z), (xb, yb, z), (xa, yb, z))
            else:
                add_quad("limestone", (xb, ya, z), (xa, ya, z), (xa, yb, z), (xb, yb, z))


def fin_screen(axis, fixed, a0, a1, y0, y1, outward):
    """Bay of vertical timber fins over a recessed dark glazing panel, on a wall plane."""
    n = int((a1 - a0) / FIN["pitch"])
    pad = ((a1 - a0) - n * FIN["pitch"]) / 2
    glass_off = fixed + outward * 0.06
    if axis == "x":
        add_quad("glass", *(
            [(glass_off, y0, a1), (glass_off, y0, a0), (glass_off, y1, a0), (glass_off, y1, a1)]
            if outward > 0 else
            [(glass_off, y0, a0), (glass_off, y0, a1), (glass_off, y1, a1), (glass_off, y1, a0)]
        ))
    else:
        add_quad("glass", *(
            [(a0, y0, glass_off), (a1, y0, glass_off), (a1, y1, glass_off), (a0, y1, glass_off)]
            if outward > 0 else
            [(a1, y0, glass_off), (a0, y0, glass_off), (a0, y1, glass_off), (a1, y1, glass_off)]
        ))
    for k in range(n):
        c = a0 + pad + (k + 0.5) * FIN["pitch"]
        tint = 0.92 + random.random() * 0.12
        d = fixed + outward * FIN["depth"] / 2
        # The back face sits against the wall and the ends against slabs: never visible.
        if axis == "x":
            back = "west" if outward > 0 else "east"
            add_box("timber-dark", d, (y0 + y1) / 2, c, FIN["depth"], y1 - y0, FIN["width"], tint, skip=("top", "bottom", back))
        else:
            back = "north" if outward > 0 else "south"
            add_box("timber-dark", c, (y0 + y1) / 2, d, FIN["width"], y1 - y0, FIN["depth"], tint, skip=("top", "bottom", back))


def facade_bays(axis, fixed, a0, a1, y0, y1, outward, skip=()):
    """Alternate solid limestone piers and fin bays along a façade."""
    count = int((a1 - a0) / BAY)
    pad = ((a1 - a0) - count * BAY) / 2
    for k in range(count):
        b0 = a0 + pad + k * BAY
        if k % 3 == 1:
            continue  # solid pier bay
        lo, hi = b0 + 1.2, b0 + BAY - 1.2
        if any(lo < s1 and hi > s0 for s0, s1 in skip):
            continue
        fin_screen(axis, fixed, lo, hi, y0, y1, outward)


# ── Louvre roofs ──────────────────────────────────────────────────────────────────────────
def louvre_field(x0, x1, z0, z1, deck, exclude=None):
    """Rows of timber panels over a dark underlay; `exclude` = (hx, hz) opening around origin."""
    step_x = PANEL["along"] + PANEL["gap_along"]
    step_z = PANEL["across"] + PANEL["gap_across"]
    add_underlay(x0, x1, z0, z1, deck, exclude)
    z = z0 + step_z / 2
    row = 0
    while z < z1:
        offset = (row % 2) * step_x / 2
        x = x0 + step_x / 2 + offset
        while x < x1 - PANEL["along"] / 2:
            inside = exclude and abs(x) < exclude[0] + PANEL["along"] / 2 and abs(z) < exclude[1] + PANEL["across"]
            if not inside:
                tint = 0.82 + random.random() * 0.3
                # Panel undersides face the membrane just below: never visible.
                add_box("timber", x, deck + PANEL["thick"] / 2 + 0.25, z, PANEL["along"], PANEL["thick"], PANEL["across"], tint, skip=("bottom",))
            x += step_x
        z += step_z
        row += 1


def add_underlay(x0, x1, z0, z1, deck, exclude):
    """Dark roof membrane beneath the panels (top and underside), opening cut out."""
    cells_x = max(1, round((x1 - x0) / 8))
    cells_z = max(1, round((z1 - z0) / 8))
    for i in range(cells_x):
        for j in range(cells_z):
            xa, xb = x0 + (x1 - x0) * i / cells_x, x0 + (x1 - x0) * (i + 1) / cells_x
            za, zb = z0 + (z1 - z0) * j / cells_z, z0 + (z1 - z0) * (j + 1) / cells_z
            if exclude and abs((xa + xb) / 2) < exclude[0] and abs((za + zb) / 2) < exclude[1]:
                continue
            add_quad("underlay", (xa, deck, za), (xa, deck, zb), (xb, deck, zb), (xb, deck, za))
            add_quad("underlay", (xa, deck - 0.6, za), (xb, deck - 0.6, za), (xb, deck - 0.6, zb), (xa, deck - 0.6, zb))


# ── Wind towers ───────────────────────────────────────────────────────────────────────────
def wind_tower(cx, cz, base, size, body=8.0, stone=4.5):
    """Hijazi wind tower: stone podium, four timber-fin walls, cornice and lattice crown."""
    h = size / 2
    add_box("limestone", cx, base + stone / 2, cz, size, stone, size)
    y0, y1 = base + stone, base + stone + body
    add_box("glass", cx, (y0 + y1) / 2, cz, size - 1.2, body, size - 1.2)
    for side in (-1, 1):
        fin_screen("x", cx + side * (h - 0.6), cz - h + 0.8, cz + h - 0.8, y0, y1, side)
        fin_screen("z", cz + side * (h - 0.6), cx - h + 0.8, cx + h - 0.8, y0, y1, side)
    add_box("limestone", cx, y1 + 0.6, cz, size + 0.8, 1.2, size + 0.8)
    crown = y1 + 1.2
    # Lattice crown: perimeter frame, cross bars and four inclined ribs to a low apex.
    for side in (-1, 1):
        add_box("bronze", cx + side * (h - 0.3), crown + 0.25, cz, 0.5, 0.5, size)
        add_box("bronze", cx, crown + 0.25, cz + side * (h - 0.3), size, 0.5, 0.5)
    add_box("bronze", cx, crown + 0.6, cz, size, 0.35, 0.35)
    add_box("bronze", cx, crown + 0.6, cz, 0.35, 0.35, size)
    apex = crown + size * 0.18
    for sx in (-1, 1):
        for sz in (-1, 1):
            rib_len = math.dist((sx * h, crown, sz * h), (0, apex, 0))
            steps = 6
            for s in range(steps):
                t = (s + 0.5) / steps
                add_box("bronze", cx + sx * h * (1 - t), crown + (apex - crown) * t, cz + sz * h * (1 - t), 0.4, 0.4, 0.4)
            del rib_len


# ── Build ─────────────────────────────────────────────────────────────────────────────────
hx, hz, top = HALL["hx"], HALL["hz"], HALL["height"]
doorway = (-TUNNEL["half_width"], TUNNEL["half_width"], TUNNEL["floor"], TUNNEL["ceiling"])
# Snap the doorway to the wall grid by giving it its own column of cells.
wall_x(hx, -hz, -TUNNEL["half_width"], 0, top, 1)
wall_x(hx, TUNNEL["half_width"], hz, 0, top, 1)
wall_x(hx, -TUNNEL["half_width"], TUNNEL["half_width"], 0, TUNNEL["floor"], 1)
wall_x(hx, -TUNNEL["half_width"], TUNNEL["half_width"], TUNNEL["ceiling"], top, 1)
wall_x(-hx, -hz, hz, 0, top, -1)
wall_z(hz, -hx, hx, 0, top, 1)
wall_z(-hz, -hx, hx, 0, top, -1)
# Doorway reveals (jambs, head, sill) so the opening reads as a deep portal.
d = HALL["wall"] + 1.5
for zs in (-TUNNEL["half_width"], TUNNEL["half_width"]):
    add_box("limestone", hx - d / 2, (TUNNEL["floor"] + TUNNEL["ceiling"]) / 2, zs + (0.25 if zs > 0 else -0.25), d, TUNNEL["ceiling"] - TUNNEL["floor"], 0.5)
add_box("limestone", hx - d / 2, TUNNEL["ceiling"] + 0.3, 0, d, 0.6, TUNNEL["half_width"] * 2 + 1)

# Monumental east portal: a recessed, finned glass wall in a deep stone frame, the doorway open
# at its foot (the camera's route into the bowl).
PORTAL = {"hz": 22, "top": 38}
fin_screen("x", hx, -PORTAL["hz"], -TUNNEL["half_width"] - 1.5, TUNNEL["floor"], PORTAL["top"], 1)
fin_screen("x", hx, TUNNEL["half_width"] + 1.5, PORTAL["hz"], TUNNEL["floor"], PORTAL["top"], 1)
fin_screen("x", hx, -TUNNEL["half_width"] - 1.5, TUNNEL["half_width"] + 1.5, TUNNEL["ceiling"] + 2, PORTAL["top"], 1)
for zs in (-1, 1):
    add_box("limestone", hx + 1.6, (TUNNEL["floor"] + PORTAL["top"] + 2) / 2, zs * (PORTAL["hz"] + 1.6), 3.2, PORTAL["top"] - TUNNEL["floor"] + 2, 3.2)
add_box("limestone", hx + 1.6, PORTAL["top"] + 1.2, 0, 3.2, 2.4, PORTAL["hz"] * 2 + 6.4)

# Upper hall façades (above the terraces): fin bays between limestone piers.
facade_bays("x", hx, -hz, hz, TERRACE["height"] + 2, top - 3, 1, skip=((-14, 14),))
facade_bays("x", -hx, -hz, hz, TERRACE["height"] + 2, top - 3, -1)
facade_bays("z", hz, -hx, hx, TERRACE["height"] + 2, top - 3, 1)
facade_bays("z", -hz, -hx, hx, TERRACE["height"] + 2, top - 3, -1)
# Stone cornice band at the roof line.
for side in (-1, 1):
    add_box("limestone", side * (hx + 0.6), top + 0.4, 0, 1.2, 1.6, hz * 2 + 2.4)
    add_box("limestone", 0, top + 0.4, side * (hz + 0.6), hx * 2 + 2.4, 1.6, 1.2)

# Main roof and its opening over the pitch.
o = ROOF["overhang"]
ohx, ohz = ROOF["opening_hx"], ROOF["opening_hz"]
louvre_field(-hx - o, hx + o, -hz - o, hz + o, ROOF["deck"], exclude=(ohx, ohz))
# Opening fascia: dark band with an LED ribbon, facing into the bowl.
fy0, fy1 = ROOF["underside"] - 5.5, ROOF["deck"] + 0.6
for side in (-1, 1):
    add_grid("underlay", (side * ohx, fy0, -ohz * side), (0, 0, side), (0, 1, 0), ohz * 2, fy1 - fy0)
    add_grid("underlay", (ohx * side, fy0, side * ohz), (-side, 0, 0), (0, 1, 0), ohx * 2, fy1 - fy0)
    add_box("led", side * (ohx - 0.15), fy0 + 2.2, 0, 0.3, 1.6, ohz * 2 - 2)
    add_box("led", 0, fy0 + 2.2, side * (ohz - 0.15), ohx * 2 - 2, 1.6, 0.3)
# Primary roof ribs under the membrane, visible from the bowl.
for k in range(-10, 11):
    z = k * 14.0
    if abs(z) > hz:
        continue
    for x0, x1 in ((-hx, -ohx), (ohx, hx)) if abs(z) < ohz else ((-hx, hx),):
        add_box("timber-dark", (x0 + x1) / 2, ROOF["underside"] - 1.4, z, x1 - x0, 2.2, 1.2)

# Wind towers on the roof edge (two sizes; larger at the corners and mid-points).
for x in (-96, -32, 32, 96):
    for side in (-1, 1):
        wind_tower(x, side * (hz - 9), ROOF["deck"] + 0.6, 14 if abs(x) > 60 else 12)
for z in (-110, -40, 40, 110):
    for side in (-1, 1):
        if side > 0 and abs(z) < 50:
            continue  # keep the sky above the east approach clear
        wind_tower(side * (hx - 9), z, ROOF["deck"] + 0.6, 12)

# Terrace ring: louvred roof over limestone walls with fin bays, broken for the east forecourt.
tx, tz, th = TERRACE["hx"], TERRACE["hz"], TERRACE["height"]
fc = TERRACE["forecourt_hz"]
segments = [
    (-tx, tx, -tz, -hz),  # north band
    (-tx, tx, hz, tz),  # south band
    (-tx, -hx, -hz, hz),  # west band
    (hx, tx, -hz, -fc),  # east band, north of the forecourt
    (hx, tx, fc, hz),  # east band, south of the forecourt
]
for x0, x1, z0, z1 in segments:
    louvre_field(x0, x1, z0, z1, th)
    add_box("limestone", (x0 + x1) / 2, th - 0.5, (z0 + z1) / 2, x1 - x0, 1.0, z1 - z0)  # slab edge
wall_x(tx, -tz, -fc, 0, th, 1)
wall_x(tx, fc, tz, 0, th, 1)
wall_x(-tx, -tz, tz, 0, th, -1)
wall_z(tz, -tx, tx, 0, th, 1)
wall_z(-tz, -tx, tx, 0, th, -1)
for zs, out in ((-fc, 1), (fc, -1)):  # forecourt side walls
    wall_z(zs, hx, tx, 0, th, out)
facade_bays("x", tx, -tz, -fc, 4, th - 2, 1)
facade_bays("x", tx, fc, tz, 4, th - 2, 1)
facade_bays("x", -tx, -tz, tz, 4, th - 2, -1)
facade_bays("z", tz, -tx, tx, 4, th - 2, 1)
facade_bays("z", -tz, -tx, tx, 4, th - 2, -1)
for x in (-130, -65, 0, 65, 130):
    for side in (-1, 1):
        wind_tower(x, side * (tz - 7), th, 10, body=6, stone=3)

# Outer pergolas: slatted shade on slender posts, the lowest step of the massing.
px, pz, ph = PERGOLA["hx"], PERGOLA["hz"], PERGOLA["height"]
for x0, x1, z0, z1 in ((-px, px, -pz, -tz), (-px, px, tz, pz), (-px, -tx, -tz, tz)):
    for k in range(int((x1 - x0) / 9)):
        cx = x0 + 4.5 + k * 9
        for cz in (z0 + 2, z1 - 2):
            add_box("timber-dark", cx, ph / 2, cz, 0.6, ph, 0.6)
    z = z0 + 1.2
    while z < z1:
        add_box("timber", (x0 + x1) / 2, ph + 0.3, z, x1 - x0, 0.3, 1.1, 0.85 + random.random() * 0.2)
        z += 2.6
    for cz in (z0 + 2, z1 - 2):
        add_box("timber-dark", (x0 + x1) / 2, ph - 0.3, cz, x1 - x0, 0.6, 0.6)

# Grand stair to the elevated east entrance, with a landing at the doorway.
steps = 28
rise = TUNNEL["floor"] / steps
run = (STAIR["x_bottom"] - STAIR["x_top"]) / steps
for s in range(steps):
    x_inner = STAIR["x_bottom"] - (s + 1) * run
    y = (s + 0.5) * rise
    add_box("paving", (x_inner + STAIR["x_bottom"]) / 2 if False else x_inner + run / 2, y, 0, run, rise, STAIR["half_width"] * 2)
add_box("paving", (hx + STAIR["x_top"]) / 2, TUNNEL["floor"] / 2, 0, STAIR["x_top"] - hx, TUNNEL["floor"], STAIR["half_width"] * 2)
for side in (-1, 1):  # cheek walls
    for s in range(steps):
        x_inner = STAIR["x_bottom"] - (s + 1) * run
        add_box("limestone", x_inner + run / 2, (s + 1) * rise / 2 + 0.6, side * (STAIR["half_width"] + 0.8), run, (s + 1) * rise + 1.2, 1.6)

# Forecourt paving, just above the masterplan plaza.
add_grid("paving", (-px, 0.18, -pz), (0, 0, 1), (1, 0, 0), pz * 2, px * 2, step=16)

# ── Objects, ambient-occlusion bake, export ──────────────────────────────────────────────
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj)
scene = bpy.context.scene
objects = []
for name, bm in meshes.items():
    if not bm.faces:
        continue
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    face_tints = [t for _, t in tints[name]]
    mesh.attributes.new("ao", "FLOAT_COLOR", "CORNER")
    mesh.attributes.new("tint", "FLOAT", "FACE")
    tint_attr = mesh.attributes["tint"].data
    for i, t in enumerate(face_tints[: len(mesh.polygons)]):
        tint_attr[i].value = t
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(f"stadium-{name}", mesh)
    scene.collection.objects.link(obj)
    objects.append(obj)
    print(f"{name:12} {len(mesh.polygons):7} faces")

# Ground plane so occlusion darkens the base of every wall (not exported).
ground_mesh = bpy.data.meshes.new("ground")
gbm = bmesh.new()
size = 600
verts = [gbm.verts.new(v) for v in ((-size, -size, 0), (size, -size, 0), (size, size, 0), (-size, size, 0))]
gbm.faces.new(verts)
gbm.to_mesh(ground_mesh)
ground = bpy.data.objects.new("ground", ground_mesh)
scene.collection.objects.link(ground)

scene.render.engine = "CYCLES"
scene.cycles.samples = 48
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for device in prefs.devices:
        device.use = True
    scene.cycles.device = "GPU"
except Exception as error:  # CPU fallback
    print("GPU unavailable, baking on CPU:", error)
scene.render.bake.target = "VERTEX_COLORS"
scene.world = scene.world or bpy.data.worlds.new("World")
scene.world.light_settings.distance = 12.0  # AO reach (m)

for obj in objects:
    mesh = obj.data
    mesh.color_attributes.active_color = mesh.color_attributes["ao"]
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.bake(type="AO")
    # COLOR_0 = baked occlusion × per-panel tint; the only colour data the web app reads.
    ao = mesh.attributes["ao"].data
    tint = mesh.attributes["tint"].data
    # Float (linear) colours: byte colours are sRGB in Blender and would be darkened on export.
    color = mesh.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
    for poly in mesh.polygons:
        t = tint[poly.index].value
        for li in poly.loop_indices:
            v = ao[li].color[0] * 0.85 + 0.15
            color.data[li].color = (v * t, v * t, v * t, 1.0)
    mesh.attributes.remove(mesh.attributes["ao"])
    mesh.attributes.remove(mesh.attributes["tint"])
    mesh.color_attributes.active_color = color
    mesh.color_attributes.render_color_index = mesh.color_attributes.find("Color")
    print(f"baked {obj.name}")

bpy.data.objects.remove(ground)
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=str(OUT),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_normals=True,
    export_texcoords=False,
    export_vertex_color="ACTIVE",
    export_materials="PLACEHOLDER",
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14,
    export_draco_color_quantization=8,
)
print("exported", OUT, OUT.stat().st_size // 1024, "KB")
