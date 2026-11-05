"""Original illustrative stadium lounge and goals, with baked AO and local-metre origins.

Blender -b --factory-startup --python scripts/blender/stadium_lounge.py
The lounge is placed at VIP_LOUNGE.x / floor by the web app. Dimensions mirror stadium.ts.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import public_realm as kit
import bpy
from mathutils import Matrix

ROOT = Path(__file__).resolve().parents[2]
kit.initialize(["stone", "plaster", "paving", "timber", "metal", "fabric", "accent", "rug", "foliage", "led", "net"])


def sofa(x, z, width=3.4):
    kit.box("timber", (x, .25, z), (1.12, .22, width), .07)
    for side in [-1, 1]:
        for end in [-1, 1]:
            kit.cylinder("metal", (x + side * .39, .12, z + end * (width / 2 - .23)), .035, .24, bevel=.01)
    for seat in [-1, 0, 1]:
        kit.box("fabric", (x + .06, .51, z + seat * width / 3), (.98, .28, width / 3 - .07), .105)
    kit.box("fabric", (x - .47, .92, z), (.3, .88, width - .08), .13)
    for end in [-1, 1]:
        kit.box("fabric", (x, .7, z + end * width / 2), (1.2, .62, .23), .09)
        kit.box("accent", (x - .25, .87, z + end * width * .29), (.24, .48, .51), .085)


def pot(x, z):
    kit.cylinder("stone", (x, .3, z), .34, .6, vertices=24, bevel=.045)
    points, faces = [], []
    for i in range(14):
        angle, height = i * 2.39996, .65 + (i % 4) * .15
        base = len(points)
        for t in [0, .25, .5, .75, 1]:
            r = .55 * t
            for side in [-1, 1]:
                w = math.sin(t * math.pi) * .13 * side
                points.append((x + math.cos(angle) * r + math.sin(angle) * w,
                               .55 + height * (1.4 * t - .65 * t * t),
                               z + math.sin(angle) * r - math.cos(angle) * w))
        for j in range(4):
            a = base + j * 2
            faces.append((a, a + 1, a + 3, a + 2))
    kit.mesh("foliage", points, faces, smooth=True)


def armchair(x, z, angle):
    before = {obj.name for obj in bpy.data.objects}
    sofa(x, z, 1.12)
    centre = kit.bl((x, 0, z))
    transform = Matrix.Translation(centre) @ Matrix.Rotation(angle, 4, "Z") @ Matrix.Translation(-centre)
    for obj in bpy.data.objects:
        if obj.name not in before:
            obj.matrix_world = transform @ obj.matrix_world


kit.ASSET = "lounge"
# Raised suite between the middle and upper terraces; upper seating is opened locally in TS.
kit.box("stone", (0, -1.15, 0), (15.5, 2.3, 32.4), .045)
points, faces = [], []
for ix in range(17):
    for iz in range(33):
        points.append((-7.75 + ix * 15.5 / 16, .025, -16 + iz))
for ix in range(16):
    for iz in range(32):
        a = ix * 33 + iz
        faces.append((a, a + 1, a + 34, a + 33))
kit.mesh("paving", points, faces)
kit.box("plaster", (-7.65, 1.85, 0), (.28, 3.7, 32.4), .025)
for z in [-16.1, 16.1]:
    kit.box("plaster", (0, 1.85, z), (15.5, 3.7, .25), .025)
    kit.box("timber", (-1.4, 1.6, z * .992), (9.2, 2.6, .09), .025)
# Ceiling overhang covers the small opening cut into the upper terrace.
kit.box("plaster", (0, 3.7, 0), (16, .22, 40), .04)
for x in [-6.9, 6.9]:
    kit.box("plaster", (x, 3.46, 0), (.65, .26, 31), .035)
    kit.box("led", (x + (.34 if x < 0 else -.34), 3.59, 0), (.035, .035, 30), .004)
for z in [-15.1, 15.1]:
    kit.box("plaster", (0, 3.46, z), (14, .26, .65), .035)
    kit.box("led", (0, 3.59, z * .976), (13, .035, .035), .004)
for z in [-16, -8, 0, 8, 16]:
    kit.box("metal", (7.62, 1.85, z), (.16, 3.7, .12), .02)
kit.box("metal", (7.62, 3.42, 0), (.16, .1, 32), .015)
kit.box("stone", (7.55, .13, 0), (.3, .26, 32), .025)

# Two window-side seating groups and larger, quieter groups deeper in the room.
for x, z in [(3.25, -7), (3.25, 1), (-2.3, -9), (-2.3, 3)]:
    kit.box("rug", (x + 1, .045, z), (4, .045, 4.8), .02)
    sofa(x, z)
    kit.cylinder("metal", (x + 1.7, .23, z), .38, .4, vertices=24, bevel=.035)
    kit.cylinder("stone", (x + 1.7, .48, z), .68, .09, vertices=32, bevel=.035)
    kit.cylinder("stone", (x + 1.7, .57, z), .12, .1, bevel=.018)
    armchair(x + 1.5, z + 2.45, math.pi / 2)
armchair(2.5, 6.4, math.pi / 3)

# Ribbed walnut bar, stone top and restrained shelves; no logos or display text.
kit.box("timber", (-6.1, .54, 0), (1.2, 1.08, 8), .055)
kit.box("stone", (-6.1, 1.13, 0), (1.4, .14, 8.3), .05)
for z in [i * .16 for i in range(-24, 25)]:
    kit.box("timber", (-5.45, .55, z), (.12, .97, .08), .015)
for y in [1.55, 2.15, 2.75]:
    kit.box("timber", (-7.2, y, 0), (.5, .07, 7.6), .018)
    kit.box("led", (-6.98, y - .05, 0), (.02, .018, 7), .003)
    for z in [-2.8, -1.7, 1.3, 2.5]:
        kit.cylinder("stone", (-7.12, y + .15, z), .085, .24, vertices=12, bevel=.015)
        kit.cylinder("metal", (-7.12, y + .31, z), .04, .09, vertices=12, bevel=.01)
for z in [-2.7, -.9, .9, 2.7]:
    kit.cylinder("metal", (-4.7, .37, z), .045, .74, bevel=.01)
    kit.cylinder("metal", (-4.7, .06, z), .27, .06, vertices=24, bevel=.015)
    kit.cylinder("accent", (-4.7, .77, z), .31, .14, vertices=24, bevel=.05)
for z in [-12.7, 12.7]:
    pot(-6, z)
for z in [-7, 1]:
    kit.cylinder("metal", (3.7, 3.12, z), .012, .7, vertices=8, bevel=0)
    kit.cylinder("metal", (3.7, 2.78, z), .38, .13, vertices=32, bevel=.045)
    kit.cylinder("led", (3.7, 2.7, z), .31, .025, vertices=24, bevel=.008)

kit.ASSET = "goal"
half_width, height, depth = 3.66, 2.44, 1.8
for x in [-half_width, half_width]:
    kit.tube("metal", (x, .06, 0), (x, height, 0), .06, 16)
    kit.tube("metal", (x, .04, depth), (x, 2.1, depth), .035, 10)
    kit.tube("metal", (x, height, 0), (x, 2.1, depth), .035, 10)
    kit.tube("metal", (x, .04, 0), (x, .04, depth), .035, 10)
kit.tube("metal", (-half_width, height, 0), (half_width, height, 0), .06, 16)
kit.tube("metal", (-half_width, .04, depth), (half_width, .04, depth), .035, 10)
kit.mesh("net", [(-half_width, 0, depth), (half_width, 0, depth),
                 (half_width, 2.1, depth), (-half_width, 2.1, depth),
                 (-half_width, height, 0), (half_width, height, 0),
                 (-half_width, 0, 0), (half_width, 0, 0)],
         [(0, 1, 2, 3), (3, 2, 5, 4), (6, 0, 3, 4), (1, 7, 5, 2)])

kit.export(ROOT / "public/models/stadium-interior.glb", prefix="stadium-detail", lod=False, ao_distance=5)
