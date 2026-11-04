"""Quick look-dev render of an exported GLB. Usage: Blender -b -P preview.py -- <glb> <out.png> [az] [el] [dist]"""
import math
import sys
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
glb, out = args[0], args[1]
az, el, dist = (float(a) for a in (args[2:5] if len(args) >= 5 else (35, 32, 620)))
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
bpy.ops.import_scene.gltf(filepath=glb)
PALETTE = {
    "limestone": (0.80, 0.72, 0.60), "timber": (0.62, 0.40, 0.25), "timber-dark": (0.32, 0.21, 0.14),
    "underlay": (0.09, 0.08, 0.07), "glass": (0.10, 0.12, 0.13), "led": (0.5, 0.6, 1.0),
    "paving": (0.75, 0.70, 0.62), "bronze": (0.55, 0.38, 0.22),
}
for mat in bpy.data.materials:
    key = mat.name.split(".")[0]
    if key not in PALETTE:
        continue
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF") or nt.nodes.new("ShaderNodeBsdfPrincipled")
    col = nt.nodes.new("ShaderNodeVertexColor")
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs[0].default_value = 1
    mix.inputs[6].default_value = (*PALETTE[key], 1)
    nt.links.new(col.outputs[0], mix.inputs[7])
    nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.7
    if key == "led":
        bsdf.inputs["Emission Color"].default_value = (0.5, 0.6, 1, 1); bsdf.inputs["Emission Strength"].default_value = 5
    out_node = nt.nodes.get("Material Output") or nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(bsdf.outputs[0], out_node.inputs[0])
bpy.ops.mesh.primitive_plane_add(size=2000)
g = bpy.context.object; gm = bpy.data.materials.new("g"); gm.use_nodes = True
gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.55, 0.5, 0.42, 1); g.data.materials.append(gm)
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); bpy.context.scene.collection.objects.link(sun)
sun.data.energy = 4.0; sun.data.angle = math.radians(1.5); sun.rotation_euler = (math.radians(55), 0, math.radians(-120))
w = bpy.context.scene.world or bpy.data.worlds.new("w"); bpy.context.scene.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.65, 0.8, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.8
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); bpy.context.scene.collection.objects.link(cam)
a, e = math.radians(az), math.radians(el)
cam.location = Vector((dist * math.cos(e) * math.sin(a), -dist * math.cos(e) * math.cos(a), dist * math.sin(e)))
d = (Vector((0, 0, 15)) - cam.location); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
cam.data.lens = 40; cam.data.clip_end = 5000
s = bpy.context.scene; s.camera = cam; s.render.engine = "CYCLES"; s.cycles.samples = 24
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"; prefs.get_devices(); [setattr(dv, "use", True) for dv in prefs.devices]; s.cycles.device = "GPU"
except Exception:
    pass
s.render.resolution_x, s.render.resolution_y = 1280, 720
s.view_settings.view_transform = "AgX"
s.render.filepath = out
bpy.ops.render.render(write_still=True)
