"""
Palms and trees for the masterplan landscape → public/models/vegetation.glb

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python scripts/blender/vegetation.py

Each variant is two objects, `<variant>-trunk` and `<variant>-foliage`, origin at the foot of the
trunk, metres. Foliage is alpha-cut cards textured with public/textures/vegetation/* (see
scripts/vegetation-textures.mjs); the web app instances each object and assigns materials.
Self-shadowing is baked into vertex colours analytically (darker toward the crown's base and
interior), which reads better on alpha cards than a ray-traced bake. Web coordinates (y up).
"""

import math
import random
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/models/vegetation.glb"
random.seed(23)

PALMS = {
    "palm-a": {"height": 11.0, "lean": 0.9, "fronds": 18, "frond_length": 5.6},
    "palm-b": {"height": 14.5, "lean": 1.6, "fronds": 20, "frond_length": 6.0},
}
TREES = {
    "tree-olive": {"trunk": 2.6, "radius": 3.6, "height": 3.4, "cards": 72, "card": 2.9, "branches": 3},
    "tree-shade": {"trunk": 3.4, "radius": 5.2, "height": 5.0, "cards": 86, "card": 3.6, "branches": 4},
    "tree-jacaranda": {"trunk": 3.8, "radius": 5.6, "height": 3.8, "cards": 84, "card": 3.5, "branches": 4},
}
SHRUB = {"radius": 1.3, "height": 1.1, "cards": 6, "card": 1.9}
FROND_ASPECT = 256 / 1024  # texture height / width
TRUNK_SIDES = 6
TRUNK_TILE = 3.0  # metres of trunk per texture repeat


def bl(v):
    return Vector((v[0], -v[2], v[1]))


class Builder:
    """Faces with UVs and per-corner shade, written into one Blender object."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.faces = []  # (face, [shade per corner])

    def quad(self, pts, uvs, shades):
        verts = [self.bm.verts.new(bl(p)) for p in pts]
        face = self.bm.faces.new(verts)
        for loop, uv in zip(face.loops, uvs):
            loop[self.uv].uv = uv
        self.faces.append((face, shades))

    def finish(self, material):
        mesh = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(mesh)
        color = mesh.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
        for poly, (_, shades) in zip(mesh.polygons, self.faces):
            for li, s in zip(poly.loop_indices, shades):
                color.data[li].color = (s, s, s, 1.0)
        mat = bpy.data.materials.get(material) or bpy.data.materials.new(material)
        mesh.materials.append(mat)
        for poly in mesh.polygons:
            poly.use_smooth = True
        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        return obj


def tube(builder, path, radii, shade_of, tile=TRUNK_TILE, sides=TRUNK_SIDES):
    """Tube along a polyline of points with per-point radius; v follows length for tiling."""
    length = 0.0
    rings = []
    for i, p in enumerate(path):
        if i:
            length += (Vector(p) - Vector(path[i - 1])).length
        d = Vector(path[min(i + 1, len(path) - 1)]) - Vector(path[max(i - 1, 0)])
        d.normalize()
        side = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized()
        up = side.cross(d).normalized()
        ring = []
        for k in range(sides + 1):
            a = 2 * math.pi * k / sides
            ring.append((Vector(p) + (side * math.cos(a) + up * math.sin(a)) * radii[i], k / sides, length / tile))
        rings.append((ring, shade_of(i / (len(path) - 1))))
    for (r0, s0), (r1, s1) in zip(rings, rings[1:]):
        for k in range(sides):
            a, b, c, d = r0[k], r0[k + 1], r1[k + 1], r1[k]
            builder.quad([a[0], b[0], c[0], d[0]], [(a[1], a[2]), (b[1], b[2]), (c[1], c[2]), (d[1], d[2])], [s0, s0, s1, s1])


def palm(name, spec):
    trunk = Builder(f"{name}-trunk")
    h = spec["height"]
    lean_dir = random.random() * math.tau
    path = []
    for i in range(6):
        t = i / 5
        bend = spec["lean"] * t * t
        path.append((math.cos(lean_dir) * bend, t * h, math.sin(lean_dir) * bend))
    radii = [0.36 - 0.12 * (i / 5) for i in range(6)]
    radii[0] = 0.5  # flared base
    tube(trunk, path, radii, lambda t: 0.55 + 0.4 * t)
    top = Vector(path[-1])

    fronds = Builder(f"{name}-foliage")
    count = spec["fronds"]
    for f in range(count + 6):
        skirt = f >= count  # older, drooping fronds below the crown
        az = (f / count) * math.tau * 2.39996 + random.random() * 0.3  # golden-angle spiral
        pitch = random.uniform(-0.55, -0.85) if skirt else random.uniform(-0.15, 0.75)
        length = spec["frond_length"] * (0.8 if skirt else random.uniform(0.85, 1.1))
        width = length * FROND_ASPECT * 2.0
        droop = 1.6 if skirt else random.uniform(0.6, 1.1)
        direction = Vector((math.cos(az) * math.cos(pitch), math.sin(pitch), math.sin(az) * math.cos(pitch)))
        sideways = Vector((-math.sin(az), 0, math.cos(az)))
        segs = 4
        pts = []
        for s in range(segs + 1):
            t = s / segs
            p = top + direction * (length * t)
            p.y -= droop * t * t * length * 0.35  # gravity sag toward the tip
            pts.append(p)
        tint = 0.62 if skirt else 1.0
        for s in range(segs):
            t0, t1 = s / segs, (s + 1) / segs
            # Leaflets fold upward in a shallow V: lift the card edges slightly.
            lift = Vector((0, width * 0.12, 0))
            a = pts[s] - sideways * width / 2 + lift
            b = pts[s + 1] - sideways * width / 2 + lift
            c = pts[s + 1] + sideways * width / 2 + lift
            d = pts[s] + sideways * width / 2 + lift
            shade0 = (0.5 + 0.5 * t0) * tint
            shade1 = (0.5 + 0.5 * t1) * tint
            fronds.quad([a, b, c, d], [(t0, 0), (t1, 0), (t1, 1), (t0, 1)], [shade0, shade1, shade1, shade0])
    return trunk.finish("palm-trunk"), fronds.finish("frond")


def tree(name, spec):
    wood = Builder(f"{name}-trunk")
    trunk_h = spec["trunk"]
    tube(wood, [(0, 0, 0), (0.1, trunk_h * 0.5, 0.05), (0.15, trunk_h, 0.1)], [0.34, 0.27, 0.22], lambda t: 0.45 + 0.35 * t, sides=5)
    crown_centre = Vector((0.15, trunk_h + spec["height"] * 0.5, 0.1))
    for b in range(spec["branches"]):
        az = b / spec["branches"] * math.tau + random.random() * 0.5
        end = crown_centre + Vector((math.cos(az) * spec["radius"] * 0.55, random.uniform(-0.2, 0.6) * spec["height"], math.sin(az) * spec["radius"] * 0.55))
        start = Vector((0.15, trunk_h * 0.92, 0.1))
        mid = start.lerp(end, 0.5) + Vector((0, 0.5, 0))
        tube(wood, [tuple(start), tuple(mid), tuple(end)], [0.18, 0.12, 0.06], lambda t: 0.5 + 0.3 * t, sides=4)

    leaves = Builder(f"{name}-foliage")
    rx, ry = spec["radius"], spec["height"] / 2
    for _ in range(spec["cards"]):
        # Cards near the crown's surface (where foliage receives light), facing roughly outward.
        u = random.uniform(-1, 1)
        az = random.random() * math.tau
        r = math.sqrt(1 - u * u)
        n = Vector((r * math.cos(az), u * 0.8 + 0.2, r * math.sin(az))).normalized()
        depth = random.uniform(0.55, 0.95)
        centre = crown_centre + Vector((n.x * rx * depth, n.y * ry * depth, n.z * rx * depth))
        jitter = Vector((random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4)))
        normal = (n + jitter).normalized()
        tangent = normal.cross(Vector((0, 1, 0)) if abs(normal.y) < 0.95 else Vector((1, 0, 0))).normalized()
        bitangent = normal.cross(tangent).normalized()
        rot = Matrix.Rotation(random.random() * math.tau, 3, normal)
        tangent, bitangent = rot @ tangent, rot @ bitangent
        s = spec["card"] * random.uniform(0.8, 1.2) / 2
        corners = [centre - tangent * s - bitangent * s, centre + tangent * s - bitangent * s, centre + tangent * s + bitangent * s, centre - tangent * s + bitangent * s]
        shades = []
        for c in corners:
            rel = c - crown_centre
            height = (rel.y / ry + 1) / 2  # 0 at crown base, 1 at top
            outer = min(1.0, Vector((rel.x / rx, rel.y / ry, rel.z / rx)).length)
            shades.append(max(0.35, min(1.0, 0.35 + 0.4 * height + 0.35 * outer)))
        leaves.quad(corners, [(0, 0), (1, 0), (1, 1), (0, 1)], shades)
    return wood.finish("bark"), leaves.finish(f"leaves-{name.split('-')[1]}")


for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj)
objects = []
for name, spec in PALMS.items():
    objects += palm(name, spec)
for name, spec in TREES.items():
    objects += tree(name, spec)


def shrub():
    """Low garden clump: a handful of crossed leaf cards over a dome, no trunk."""
    leaves = Builder("shrub-foliage")
    for k in range(SHRUB["cards"]):
        az = k / SHRUB["cards"] * math.pi + random.random() * 0.2
        tilt = random.uniform(-0.35, 0.35)
        normal = Vector((math.cos(az), tilt, math.sin(az))).normalized()
        if k >= SHRUB["cards"] - 2:
            normal = Vector((random.uniform(-0.2, 0.2), 1, random.uniform(-0.2, 0.2))).normalized()  # top cards
        tangent = normal.cross(Vector((0, 1, 0)) if abs(normal.y) < 0.9 else Vector((1, 0, 0))).normalized()
        bitangent = normal.cross(tangent).normalized()
        centre = Vector((0, SHRUB["height"] * 0.55, 0))
        s = SHRUB["card"] / 2
        corners = [centre - tangent * s - bitangent * s, centre + tangent * s - bitangent * s, centre + tangent * s + bitangent * s, centre - tangent * s + bitangent * s]
        shades = [max(0.4, min(1.0, 0.45 + 0.5 * (c.y / SHRUB["height"]))) for c in corners]
        leaves.quad(corners, [(0, 0), (1, 0), (1, 1), (0, 1)], shades)
    return [leaves.finish("leaves-shrub")]


objects += shrub()
for obj in objects:
    print(f"{obj.name:24} {len(obj.data.polygons):5} quads")

OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=str(OUT),
    export_format="GLB",
    use_selection=True,
    export_yup=True,
    export_normals=True,
    export_texcoords=True,
    export_vertex_color="ACTIVE",
    export_materials="PLACEHOLDER",
)
print("exported", OUT, OUT.stat().st_size // 1024, "KB")
