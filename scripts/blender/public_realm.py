"""Original beach/Central furniture kit, metres, with baked ambient occlusion.

Blender -b --factory-startup --python scripts/blender/public_realm.py

Each reusable asset has its origin at ground level. Objects are named
realm-<asset>-<surface>; the web app instances these parts and assigns its own PBR
materials. Models are separated during baking, then returned to the same origin
for export. No official geometry or third-party models are used.
"""

import math
import random
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/models/public-realm.glb"
BAKE_SAMPLES = 24
BAKE_SEPARATION = 40
BEVEL_SEGMENTS = 2
FAR_RATIO = .35  # sub-pixel manufacturing detail is removed for the wide views
PARTS = {}
ASSET = ""
RNG = random.Random(84)


def bl(p):
    return Vector((p[0], -p[2], p[1]))


def keep(obj, surface, bevel=0, smooth=False):
    """Apply manufacturing radii before joining; broad faces retain flat normals."""
    if bevel:
        modifier = obj.modifiers.new("soft edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = BEVEL_SEGMENTS
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    if smooth:
        for polygon in obj.data.polygons:
            polygon.use_smooth = len(polygon.vertices) == 4
    obj.data.materials.append(materials[surface])
    PARTS.setdefault((ASSET, surface), []).append(obj)
    return obj


def box(surface, p, size, bevel=0.025, pitch=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=bl(p))
    obj = bpy.context.object
    obj.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    keep(obj, surface, bevel)
    obj.rotation_euler.x = pitch
    return obj


def cylinder(surface, p, radius, height, vertices=16, bevel=0.015):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=height, location=bl(p))
    return keep(bpy.context.object, surface, bevel, smooth=True)


def tube(surface, a, b, radius=0.025, vertices=8):
    start, end = bl(a), bl(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=(end - start).length,
                                      location=(start + end) / 2)
    obj = bpy.context.object
    obj.rotation_euler = (end - start).to_track_quat("Z", "Y").to_euler()
    return keep(obj, surface, smooth=True)


def mesh(surface, points, faces, smooth=False):
    data = bpy.data.meshes.new(f"{ASSET}-{surface}")
    data.from_pydata([bl(p) for p in points], [], faces)
    data.update()
    obj = bpy.data.objects.new(data.name, data)
    bpy.context.scene.collection.objects.link(obj)
    keep(obj, surface)
    if smooth:
        for polygon in data.polygons:
            polygon.use_smooth = True
    return obj


def bench():
    for z in [-0.24, -0.12, 0, 0.12, 0.24]:
        box("timber", (0, 0.48, z), (2.45, 0.08, 0.105), 0.022)
    for i in range(4):
        box("timber", (0, 0.7 + i * 0.105, -0.32 - i * 0.014), (2.45, 0.09, 0.065), 0.02)
    for x in [-0.94, 0.94]:
        for z in [-0.22, 0.22]:
            tube("metal", (x, 0.04, z * 1.5), (x, 0.46, z), 0.035)
        tube("metal", (x, 0.43, -0.25), (x, 1.06, -0.41), 0.03)
        tube("metal", (x, 0.44, -0.25), (x, 0.44, 0.27), 0.035)
        for a, b in zip([(x, .5, .24), (x, .7, .24), (x, .74, .18), (x, .74, -.22)],
                        [(x, .7, .24), (x, .74, .18), (x, .74, -.22), (x, .64, -.32)]):
            tube("metal", a, b, 0.027)


def lounger():
    for x in [-.34, .34]:
        path = [(x, .08, .78), (x, .28, .7), (x, .33, -.2), (x, .7, -.94), (x, .82, -1.1)]
        for a, b in zip(path, path[1:]):
            tube("metal", a, b, .035)
        tube("metal", (x, .05, -.76), (x, .51, -.55), .033)
    for i in range(10):
        box("timber", (0, .32, .78 - i * .105), (.77, .065, .084), .015)
    box("fabric", (0, .41, .28), (.7, .14, 1.2), .06)
    box("fabric", (0, .64, -.7), (.7, .13, .88), .055, pitch=math.radians(29))
    box("fabric", (0, .86, -.98), (.5, .1, .23), .04, pitch=math.radians(29))
    for x in [-.3, .3]:
        tube("timber", (x, .32, -.15), (x, .77, -1.1), .035)


def parasol():
    ribs, segments, rings = 10, 6, 7
    n = ribs * segments

    def canopy(r, a):
        radius = 3.1 * r * (1 - .035 * math.sin(a * ribs / 2) ** 2 * r ** 6)
        height = 3.75 - 1.05 * r ** .9 - .055 * math.sin(a * ribs / 2) ** 2 * math.sin(math.pi * r)
        return (math.sin(a) * radius, height, math.cos(a) * radius)

    pts = [canopy(max(.015, r / rings), i / n * math.tau)
           for r in range(rings + 1) for i in range(n)]
    faces = []
    for r in range(rings):
        for i in range(n):
            a, b = r * n + i, r * n + (i + 1) % n
            faces.append((a, b, b + n, a + n))
    # A separate hanging hem gives the canopy thickness and a recognisable scalloped edge.
    pts += [(x, y - .14, z) for x, y, z in pts[rings * n: (rings + 1) * n]]
    for i in range(n):
        faces.append((rings * n + i, rings * n + (i + 1) % n,
                      (rings + 1) * n + (i + 1) % n, (rings + 1) * n + i))
    cloth = mesh("fabric", pts, [tuple(reversed(face)) for face in faces], smooth=True)
    solid = cloth.modifiers.new("cloth thickness", "SOLIDIFY")
    solid.thickness = .012
    bpy.context.view_layer.objects.active = cloth
    bpy.ops.object.modifier_apply(modifier=solid.name)
    cylinder("metal", (0, 1.83, 0), .048, 3.66, bevel=.006)
    cylinder("stone", (0, .08, 0), .42, .16, vertices=24, bevel=.035)
    cylinder("metal", (0, 3.76, 0), .09, .1, bevel=.018)
    for rib in range(ribs):
        a = rib / ribs * math.tau
        points = [canopy(t / 5, a) for t in range(1, 6)]
        points = [(x, y - .025, z) for x, y, z in [(0, 3.71, 0)] + points]
        for start, end in zip(points, points[1:]):
            tube("metal", start, end, .016, 6)
        tube("metal", (0, 2.65, 0), points[3], .018, 6)


def table():
    cylinder("timber", (0, .75, 0), .72, .09, vertices=32, bevel=.03)
    cylinder("metal", (0, .4, 0), .075, .65, bevel=.015)
    for i in range(4):
        a = i / 4 * math.tau
        tube("metal", (0, .26, 0), (.52 * math.cos(a), .05, .52 * math.sin(a)), .035)


def chair():
    for z in [-.2, -.1, 0, .1, .2]:
        box("timber", (0, .47, z), (.52, .055, .08), .014)
    for x in [-.24, .24]:
        tube("metal", (x * 1.15, .035, .26), (x, .46, .18), .022)
        tube("metal", (x * 1.1, .035, -.31), (x, .95, -.29), .022)
        tube("metal", (x, .43, -.24), (x, .43, .24), .023)
    for y in [.69, .8, .91]:
        for i in range(8):
            x0, x1 = -.27 + i * .0675, -.27 + (i + 1) * .0675
            z0, z1 = -.31 + .45 * x0 ** 2, -.31 + .45 * x1 ** 2
            tube("timber", (x0, y, z0), (x1, y, z1), .034, 6)


def planter():
    # Four separate capped stone walls leave an actual recessed soil bed.
    for x in [-2.17, 2.17]:
        box("stone", (x, .34, 0), (.16, .68, 7), .045)
        box("stone", (x, .69, 0), (.24, .08, 7), .025)
    for z in [-3.42, 3.42]:
        box("stone", (0, .34, z), (4.25, .68, .16), .045)
        box("stone", (0, .69, z), (4.25, .08, .24), .025)
    box("soil", (0, .56, 0), (4.15, .12, 6.65), .02)
    for _ in range(12):
        x, z = RNG.uniform(-1.95, 1.95), RNG.uniform(-3.1, 3.1)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=RNG.uniform(.08, .16),
                                            location=bl((x, .64, z)))
        obj = bpy.context.object
        obj.scale.z = .45
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        keep(obj, "stone")
    # Sparse, curved leaf clusters over the soil, leaving the tree's root collar clear.
    points, faces = [], []
    for ix in range(5):
        for iz in range(8):
            x, z = -1.7 + ix * .85, -2.9 + iz * .83
            if abs(x) < .6 and abs(z) < .65:
                continue
            for _ in range(9):
                angle, length = RNG.random() * math.tau, RNG.uniform(.2, .4)
                origin = len(points)
                for t in [0, .33, .66, 1]:
                    radius = length * t * .8
                    height = .62 + length * (1.3 * t - .45 * t * t)
                    width = .035 * math.sin(math.pi * t) + .002
                    for side in [-1, 1]:
                        points.append((x + math.sin(angle) * radius + math.cos(angle) * width * side,
                                       height, z + math.cos(angle) * radius - math.sin(angle) * width * side))
                for segment in range(3):
                    a = origin + segment * 2
                    faces.append((a, a + 1, a + 3, a + 2))
    mesh("foliage", points, faces, smooth=True)


def lamp():
    cylinder("metal", (0, .08, 0), .18, .16, bevel=.025)
    cylinder("metal", (0, 2.4, 0), .075, 4.65, vertices=12, bevel=.012)
    tube("metal", (0, 4.62, 0), (.58, 4.77, 0), .045)
    box("metal", (.58, 4.79, 0), (.96, .12, .32), .045)
    box("led", (.58, 4.725, 0), (.73, .016, .22), .007)


def pavilion():
    box("stone", (0, .1, 0), (18, .2, 22), .075)
    box("stone", (0, .24, 0), (17.5, .12, 21.5), .04)
    for x in [-7.2, 7.2]:
        for z in [-9, 9]:
            box("stone", (x, .55, z), (.65, .5, .65), .04)
            box("timber", (x, 2.5, z), (.32, 4.1, .32), .045)
            box("metal", (x, 4.12, z), (.38, .46, .38), .025)
    for z in [-9, 0, 9]:
        box("timber", (0, 4.3, z), (16.5, .35, .22), .035)
    for i in range(-12, 13):
        x = i * .66
        for j in range(8):
            z = -10.7 + (j + .5) * 2.675
            y = 4.58 + .48 * math.cos(z / 21.4 * math.pi)
            slope = -.48 * math.pi / 21.4 * math.sin(z / 21.4 * math.pi)
            box("timber", (x, y, z), (.16, .25, 2.7), .018, pitch=math.atan(slope))
    for x in [-7.2, 7.2]:
        box("led", (x, 4.11, 0), (.035, .035, 18), .006)


def arcade():
    # One bay, facing local -x. Arched stone portal and bronze lattice at the glazed rear.
    for z in [-4.55, 4.55]:
        box("stone", (-5, 2.5, z), (.72, 5, .7), .055)
        box("stone", (-5, .14, z), (.9, .28, .9), .04)
    points, faces = [], []
    for i in range(25):
        a = math.pi * i / 24
        for x in [-5.4, -4.6]:
            for radius in [4.2, 4.75]:
                points.append((x, 4.7 + 1.8 * math.sin(a) + (radius - 4.2) * math.sin(a),
                               radius * math.cos(a)))
    for i in range(24):
        a, b = i * 4, (i + 1) * 4
        faces.extend([(a, b, b + 1, a + 1), (a + 2, a + 3, b + 3, b + 2),
                      (a, a + 2, b + 2, b), (a + 1, b + 1, b + 3, a + 3)])
    faces.extend([(0, 1, 3, 2), (96, 98, 99, 97)])
    mesh("stone", points, faces)
    for x in [-5.9, 5.9]:
        box("stone", (x, 7.25, 0), (.55, .55, 10), .06)
    for z in [-4.7, 4.7]:
        box("stone", (0, 7.25, z), (12.3, .55, .6), .055)
    for z in [i * .45 for i in range(-10, 11)]:
        box("timber", (0, 7.45, z), (12.6, .26, .14), .018)
    for z in [-4.55, 0, 4.55]:
        box("stone", (5.6, 3.4, z), (.65, 6.8, .55), .045)
    box("stone", (5.6, .45, 0), (.5, .9, 9), .035)
    box("stone", (5.6, 6.5, 0), (.55, 1.15, 9.4), .045)
    for z in [-2.25, 2.25]:
        box("glass", (5.64, 3.3, z), (.05, 4.65, 3.95), .01)
        for dz in [-2.05, 0, 2.05]:
            box("metal", (5.53, 3.3, z + dz), (.12, 4.8, .045), .008)
    for z in [i * .6 for i in range(-7, 8)]:
        box("metal", (5.37, 5.15, z), (.1, 1.7, .045), .008)
    for y in [4.4, 4.8, 5.2, 5.6, 6]:
        box("metal", (5.37, y, 0), (.1, .045, 8.5), .008)
    box("led", (-4.35, 6.82, 0), (.045, .04, 8.2), .005)


def export():
    scene = bpy.context.scene
    objects = []
    offsets = {name: i * BAKE_SEPARATION for i, name in enumerate(BUILDERS)}
    for (asset, surface), pieces in PARTS.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in pieces:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = pieces[0]
        bpy.ops.object.join()
        obj = bpy.context.object
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        obj.name = f"realm-{asset}-{surface}"
        obj.location.x = offsets[asset]
        data = obj.data
        bm = bmesh.new()
        bm.from_mesh(data)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(data)
        bm.free()
        color = data.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
        data.color_attributes.active_color = color
        data.color_attributes.render_color_index = data.color_attributes.find("Color")
        objects.append((obj, asset))
    bpy.ops.mesh.primitive_plane_add(size=1500, location=(160, 0, -.02))
    ground = bpy.context.object
    scene.render.engine = "CYCLES"
    scene.cycles.samples = BAKE_SAMPLES
    preferences = bpy.context.preferences.addons["cycles"].preferences
    try:
        preferences.compute_device_type = "METAL"
        preferences.get_devices()
        for device in preferences.devices:
            device.use = True
        scene.cycles.device = "GPU"
    except Exception as error:
        print("AO using CPU:", error)
    scene.render.bake.target = "VERTEX_COLORS"
    scene.world = scene.world or bpy.data.worlds.new("World")
    scene.world.light_settings.distance = 2.5
    bpy.ops.object.select_all(action="DESELECT")
    for obj, _ in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0][0]
    bpy.ops.object.bake(type="AO")
    triangles = 0
    far_triangles = 0
    for obj, asset in objects:
        for corner in obj.data.color_attributes["Color"].data:
            shade = .22 + .78 * corner.color[0]
            corner.color = (shade, shade, shade, 1)
        obj.location.x = 0
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
        print(obj.name, len(obj.data.loop_triangles), "triangles")
        far = obj.copy()
        far.data = obj.data.copy()
        far.name = obj.name + "-far"
        scene.collection.objects.link(far)
        bpy.context.view_layer.objects.active = far
        modifier = far.modifiers.new("distance detail", "DECIMATE")
        modifier.ratio = FAR_RATIO
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        far.data.calc_loop_triangles()
        far_triangles += len(far.data.loop_triangles)
        far.select_set(True)
    bpy.data.objects.remove(ground, do_unlink=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT), export_format="GLB", use_selection=True,
                              export_yup=True, export_normals=True, export_texcoords=False,
                              export_vertex_color="ACTIVE", export_materials="PLACEHOLDER",
                              export_draco_mesh_compression_enable=True,
                              export_draco_mesh_compression_level=6,
                              export_draco_position_quantization=14,
                              export_draco_color_quantization=8)
    print("KIT NEAR", triangles, "FAR", far_triangles, "triangles", OUT.stat().st_size, "bytes")


BUILDERS = {"bench": bench, "lounger": lounger, "parasol": parasol, "table": table,
            "chair": chair, "planter": planter, "lamp": lamp, "pavilion": pavilion, "arcade": arcade}

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
materials = {name: bpy.data.materials.new(name) for name in
             ["stone", "timber", "metal", "fabric", "soil", "foliage", "led", "glass"]}
for ASSET, builder in BUILDERS.items():
    builder()
export()
