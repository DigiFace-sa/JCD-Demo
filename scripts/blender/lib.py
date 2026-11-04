"""
Shared helpers for the landmark models (scripts/blender/<landmark>.py).

Geometry is authored in the web app's local metres (x east, y up, z south) and converted to
Blender's Z-up on write. Each material name becomes one object (`<prefix>-<material>`); the web
app assigns real PBR materials by that name. Ambient occlusion is baked with Cycles into the
COLOR_0 vertex colours (× per-face tint), then the model is exported as Draco-compressed GLB.
"""

import random
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
GRID = 4.0  # default wall subdivision (m) so baked occlusion has vertices to live on


def bl(x, y, z):
    """Web (x, y-up, z-south) → Blender (x, y-north, z-up)."""
    return Vector((x, -z, y))


class Model:
    def __init__(self, prefix, materials, seed=1):
        self.prefix = prefix
        self.meshes = {name: bmesh.new() for name in materials}
        self.tints = {name: [] for name in materials}
        self.random = random.Random(seed)

    # ── primitives ───────────────────────────────────────────────────────────────────────
    def quad(self, mat, a, b, c, d, tint=1.0):
        bm = self.meshes[mat]
        face = bm.faces.new([bm.verts.new(bl(*p)) for p in (a, b, c, d)])
        self.tints[mat].append(tint)
        return face

    def tri(self, mat, a, b, c, tint=1.0):
        bm = self.meshes[mat]
        bm.faces.new([bm.verts.new(bl(*p)) for p in (a, b, c)])
        self.tints[mat].append(tint)

    def poly(self, mat, points, want, tint=1.0):
        """Polygon (any vertex count, near-planar) oriented to face `want` (web axes)."""
        bm = self.meshes[mat]
        bm.faces.new([bm.verts.new(bl(*p)) for p in facing(points, want)])
        self.tints[mat].append(tint)

    def grid(self, mat, origin, u, v, length_u, length_v, step=GRID, tint=1.0):
        """Subdivided rectangle origin + s·u + t·v (u, v unit vectors), facing u × v."""
        nu = max(1, round(length_u / step))
        nv = max(1, round(length_v / step))
        o, uu, vv = Vector(origin), Vector(u), Vector(v)
        for i in range(nu):
            for j in range(nv):
                p = lambda a, b: tuple(o + uu * (length_u * a / nu) + vv * (length_v * b / nv))
                self.quad(mat, p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1), tint)

    def box(self, mat, cx, cy, cz, sx, sy, sz, tint=1.0, skip=()):
        """Axis-aligned box (centre, full sizes); `skip` names always-hidden faces."""
        x0, x1 = cx - sx / 2, cx + sx / 2
        y0, y1 = cy - sy / 2, cy + sy / 2
        z0, z1 = cz - sz / 2, cz + sz / 2
        faces = {
            "top": ((x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0)),
            "bottom": ((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)),
            "south": ((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)),
            "north": ((x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)),
            "east": ((x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)),
            "west": ((x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)),
        }
        for name, f in faces.items():
            if name not in skip:
                self.quad(mat, *f, tint=tint)

    def wall_x(self, mat, x, z0, z1, y0, y1, outward, step=GRID):
        """Subdivided wall in the plane x = const facing ±x."""
        if outward > 0:
            self.grid(mat, (x, y0, z1), (0, 0, -1), (0, 1, 0), z1 - z0, y1 - y0, step)
        else:
            self.grid(mat, (x, y0, z0), (0, 0, 1), (0, 1, 0), z1 - z0, y1 - y0, step)

    def wall_z(self, mat, z, x0, x1, y0, y1, outward, step=GRID):
        """Subdivided wall in the plane z = const facing ±z."""
        if outward > 0:
            self.grid(mat, (x0, y0, z), (1, 0, 0), (0, 1, 0), x1 - x0, y1 - y0, step)
        else:
            self.grid(mat, (x1, y0, z), (-1, 0, 0), (0, 1, 0), x1 - x0, y1 - y0, step)

    def block(self, mat, x0, x1, z0, z1, y0, y1, top=True, step=GRID):
        """Closed rectangular volume with subdivided walls (and roof)."""
        self.wall_x(mat, x1, z0, z1, y0, y1, 1, step)
        self.wall_x(mat, x0, z0, z1, y0, y1, -1, step)
        self.wall_z(mat, z1, x0, x1, y0, y1, 1, step)
        self.wall_z(mat, z0, x0, x1, y0, y1, -1, step)
        if top:
            self.grid(mat, (x0, y1, z0), (0, 0, 1), (1, 0, 0), z1 - z0, x1 - x0, step * 2)

    # ── build, bake, export ─────────────────────────────────────────────────────────────
    def export(self, filename, ao_distance=10.0, samples=40):
        for obj in list(bpy.data.objects):
            bpy.data.objects.remove(obj)
        scene = bpy.context.scene
        objects = []
        for name, bm in self.meshes.items():
            if not bm.faces:
                continue
            mesh = bpy.data.meshes.new(name)
            bm.to_mesh(mesh)
            mesh.attributes.new("tint", "FLOAT", "FACE")
            for i, t in enumerate(self.tints[name][: len(mesh.polygons)]):
                mesh.attributes["tint"].data[i].value = t
            mesh.attributes.new("ao", "FLOAT_COLOR", "CORNER")
            mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
            mesh.materials.append(mat)
            obj = bpy.data.objects.new(f"{self.prefix}-{name}", mesh)
            scene.collection.objects.link(obj)
            objects.append(obj)
            print(f"{name:12} {len(mesh.polygons):7} faces")

        # Ground so occlusion darkens wall bases (not exported).
        gm = bpy.data.meshes.new("ground")
        gbm = bmesh.new()
        s = 800
        gbm.faces.new([gbm.verts.new(v) for v in ((-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0))])
        gbm.to_mesh(gm)
        ground = bpy.data.objects.new("ground", gm)
        scene.collection.objects.link(ground)

        scene.render.engine = "CYCLES"
        scene.cycles.samples = samples
        prefs = bpy.context.preferences.addons["cycles"].preferences
        try:
            prefs.compute_device_type = "METAL"
            prefs.get_devices()
            for device in prefs.devices:
                device.use = True
            scene.cycles.device = "GPU"
        except Exception as error:
            print("GPU unavailable, baking on CPU:", error)
        scene.render.bake.target = "VERTEX_COLORS"
        scene.world = scene.world or bpy.data.worlds.new("World")
        scene.world.light_settings.distance = ao_distance

        for obj in objects:
            mesh = obj.data
            mesh.color_attributes.active_color = mesh.color_attributes["ao"]
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.bake(type="AO")
            ao, tint = mesh.attributes["ao"].data, mesh.attributes["tint"].data
            # Float (linear) colours: byte colours are sRGB in Blender and darken on export.
            color = mesh.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
            for poly in mesh.polygons:
                t = tint[poly.index].value
                for li in poly.loop_indices:
                    v = (ao[li].color[0] * 0.85 + 0.15) * t
                    color.data[li].color = (v, v, v, 1.0)
            mesh.attributes.remove(mesh.attributes["ao"])
            mesh.attributes.remove(mesh.attributes["tint"])
            mesh.color_attributes.active_color = color
            mesh.color_attributes.render_color_index = mesh.color_attributes.find("Color")

        bpy.data.objects.remove(ground)
        out = ROOT / "public/models" / filename
        out.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.export_scene.gltf(
            filepath=str(out),
            export_format="GLB",
            use_selection=True,
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
        print("exported", out, out.stat().st_size // 1024, "KB")


def facing(points, want):
    """Points ordered so the polygon's normal points along `want` (web axes)."""
    a, b, c = (Vector(p) for p in points[:3])
    normal = (b - a).cross(c - a)
    if normal.length < 1e-9:
        # Degenerate leading triangle (e.g. a fan from a collinear start): use Newell's method.
        normal = Vector((0, 0, 0))
        for p, q in zip(points, points[1:] + points[:1]):
            normal += Vector(p).cross(Vector(q))
    return list(points) if normal.dot(Vector(want)) >= 0 else list(reversed(points))
