"""Procedural courier + scooter model (our own asset, no third-party licence).
Run:  blender -b --python models/build_courier.py -- [preview.png]
Writes public/models/courier_scooter.glb. Faces -Y in Blender (= +Z in glTF/three.js).
Named nodes for animation in three.js: WheelF, WheelR (spin about local X), Steer (rotate about local Y), Body, Rider, Box.
"""
import bpy, math, sys, os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.getcwd()
OUT = os.path.join(HERE, '..', 'public', 'models', 'courier_scooter.glb')
PREVIEW = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv and len(sys.argv) > sys.argv.index('--') + 1 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def lin(h):
    h = h.lstrip('#'); return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4)) + (1,)

MATS = {}
def mat(name, color, rough=0.5, metal=0.0, emit=None, strength=0.0, coat=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = lin(color); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if coat: b.inputs['Coat Weight'].default_value = coat
    if emit: b.inputs['Emission Color'].default_value = lin(emit); b.inputs['Emission Strength'].default_value = strength
    MATS[name] = m; return m

PAINT = mat('paint_blue', '#2b6cff', 0.28, 0.35, coat=0.6)
PLASTIC = mat('plastic_black', '#15151a', 0.55)
CHROME = mat('chrome', '#d8d8dc', 0.18, 1.0)
RUBBER = mat('rubber', '#0e0e10', 0.9)
JACKET = mat('jacket_orange', '#ff5a36', 0.65)
HELMET = mat('helmet_orange', '#ff5a36', 0.22, 0.0, coat=1.0)
VISOR = mat('visor', '#101820', 0.08, 0.2)
SKIN = mat('skin', '#6b4226', 0.6)
PANTS = mat('pants', '#1d2233', 0.8)
SHOES = mat('shoes', '#f2f2f2', 0.55)
GLOVE = mat('glove', '#111111', 0.7)
BOXM = mat('box_orange', '#ff5a36', 0.45)
WHITE = mat('white', '#ffffff', 0.5)
HEAD_L = mat('headlight', '#fff3c4', 0.2, 0, '#fff0b0', 8.0)
TAIL_L = mat('taillight', '#ff2020', 0.3, 0, '#ff2020', 4.0)
REFL = mat('reflective', '#e8e8e8', 0.3, 0.6, '#ffffff', 0.6)

def finish(o, m, smooth=True, bevel=0.0, subsurf=0):
    o.data.materials.append(m)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    if bevel:
        bm = o.modifiers.new('bevel', 'BEVEL'); bm.width = bevel; bm.segments = 4; bm.limit_method = 'ANGLE'
    if subsurf:
        sm = o.modifiers.new('sub', 'SUBSURF'); sm.levels = subsurf
    return o

def ellipsoid(name, loc, sc3, m, rot=(0, 0, 0), seg=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=1, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = sc3; return finish(o, m)

def rbox(name, loc, size, m, bevel=0.03, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m, bevel=bevel)

def tube(name, p1, p2, r1, r2, m, cap=True):
    a, b = Vector(p1), Vector(p2); d = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=r1, radius2=r2, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object; o.name = name; o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); finish(o, m)
    parts = [o]
    if cap:
        for p, r in ((a, r1), (b, r2)):
            s = ellipsoid(name + '_j', tuple(p), (r, r, r), m, seg=16, rings=8); parts.append(s)
    return parts

def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); o = bpy.context.object; o.name = name; return o

def empty(name, loc):
    e = bpy.data.objects.new(name, None); sc.collection.objects.link(e); e.location = loc; return e

def parent(children, par):
    for c in children:
        mw = c.matrix_world.copy(); c.parent = par; c.matrix_parent_inverse = par.matrix_world.inverted();

# ---------------- scooter ----------------
FY, RY, WR = -0.74, 0.64, 0.27           # front axle y, rear axle y, wheel radius
body = []
body.append(rbox('floor', (0, -0.06, 0.31), (0.46, 0.66, 0.07), PAINT, 0.03))
body.append(ellipsoid('cowl_c', (0, 0.46, 0.50), (0.22, 0.55, 0.26), PAINT))
for sx in (-1, 1): body.append(ellipsoid('cowl_s', (sx * 0.15, 0.46, 0.49), (0.10, 0.50, 0.23), PAINT))
body.append(ellipsoid('seat', (0, 0.26, 0.87), (0.21, 0.44, 0.075), PLASTIC))
body.append(ellipsoid('shield', (0, -0.50, 0.66), (0.27, 0.075, 0.40), PAINT, rot=(math.radians(-14), 0, 0)))
body.append(ellipsoid('tailcowl', (0, 1.00, 0.57), (0.11, 0.15, 0.075), PAINT))
body.append(rbox('tail_light', (0, 1.13, 0.57), (0.12, 0.02, 0.05), TAIL_L, 0.005))
body.append(rbox('rack', (0, 0.78, 0.99), (0.42, 0.48, 0.03), PLASTIC, 0.008))
body += tube('exhaust', (0.23, 0.30, 0.22), (0.23, 0.95, 0.24), 0.045, 0.05, CHROME, cap=False)
body.append(ellipsoid('rear_fender', (0, 0.66, 0.46), (0.10, 0.27, 0.05), PAINT))
for sx in (-1, 1): body += tube('rear_swing', (sx * 0.10, 0.4, 0.33), (sx * 0.10, RY, WR), 0.025, 0.025, CHROME, cap=False)
body_obj = join(body, 'Body')
# delivery box
box_parts = [rbox('box', (0, 0.78, 1.265), (0.50, 0.52, 0.48), BOXM, 0.035), rbox('lid', (0, 0.78, 1.51), (0.52, 0.54, 0.03), BOXM, 0.012)]
pin = ellipsoid('pin_head', (0, 1.058, 1.325), (0.085, 0.010, 0.085), WHITE); pin2 = ellipsoid('pin_dot', (0, 1.066, 1.325), (0.030, 0.008, 0.030), BOXM)
bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.080, radius2=0.0, depth=0.13, location=(0, 1.058, 1.26), rotation=(math.radians(180), 0, 0))
cone = bpy.context.object; cone.scale = (1, 0.10, 1); finish(cone, WHITE)
box_obj = join(box_parts + [pin, pin2, cone], 'Box')

def wheel(name, y):
    bpy.ops.mesh.primitive_torus_add(major_radius=WR - 0.06, minor_radius=0.06, major_segments=40, minor_segments=18, rotation=(0, math.radians(90), 0))
    tire = bpy.context.object; finish(tire, RUBBER)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=WR - 0.085, depth=0.09, rotation=(0, math.radians(90), 0)); rim = bpy.context.object; finish(rim, CHROME)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.05, depth=0.13, rotation=(0, math.radians(90), 0)); hub = bpy.context.object; finish(hub, PLASTIC)
    spokes = []
    for k in range(5):
        bpy.ops.mesh.primitive_cube_add(); s = bpy.context.object; s.scale = (0.02, 0.012, (WR - 0.10) / 2 + 0.0); bpy.ops.object.transform_apply(scale=True)
        s.rotation_euler = (math.radians(72 * k), 0, 0); s.location = (0, 0, 0); finish(s, CHROME, smooth=False); spokes.append(s)
    w = join([tire, rim, hub] + spokes, name); w.location = (0, y, WR); return w
wr = wheel('WheelR', RY)
wf = wheel('WheelF', FY)

# steering assembly (fork, bars, headlight, mirrors, front fender) pivoting at the head tube
steer = empty('Steer', (0, -0.62, 1.0))
st = []
for sx in (-1, 1): st += tube('fork', (sx * 0.075, -0.64, 0.98), (sx * 0.075, FY, WR), 0.028, 0.024, CHROME, cap=False)
st.append(ellipsoid('headcover', (0, -0.62, 1.04), (0.25, 0.14, 0.11), PAINT))
st += tube('bar', (-0.33, -0.60, 1.12), (0.33, -0.60, 1.12), 0.022, 0.022, CHROME, cap=False)
for sx in (-1, 1):
    st += tube('grip', (sx * 0.30, -0.60, 1.12), (sx * 0.39, -0.60, 1.12), 0.034, 0.034, PLASTIC, cap=False)
    st += tube('mirror_stalk', (sx * 0.28, -0.58, 1.14), (sx * 0.33, -0.62, 1.40), 0.012, 0.012, CHROME, cap=False)
    st.append(ellipsoid('mirror', (sx * 0.33, -0.62, 1.42), (0.07, 0.015, 0.05), CHROME))
st.append(ellipsoid('headlight', (0, -0.76, 1.03), (0.095, 0.06, 0.095), HEAD_L))
st.append(ellipsoid('front_fender', (0, FY - 0.02, WR + 0.20), (0.10, 0.27, 0.05), PAINT))
steer_geo = join(st, 'SteerGeo')
for o in (steer_geo, wf): o.parent = steer
steer_geo.matrix_parent_inverse = steer.matrix_world.inverted(); wf.matrix_parent_inverse = steer.matrix_world.inverted()

# ---------------- rider ----------------
R = []
R.append(ellipsoid('pelvis', (0, 0.34, 0.98), (0.19, 0.15, 0.12), PANTS))
R.append(ellipsoid('torso', (0, 0.17, 1.31), (0.225, 0.155, 0.30), JACKET, rot=(math.radians(14), 0, 0)))
R.append(ellipsoid('stripe', (0, 0.155, 1.27), (0.232, 0.165, 0.035), REFL, rot=(math.radians(14), 0, 0)))
R.append(ellipsoid('collar', (0, 0.07, 1.57), (0.15, 0.11, 0.06), JACKET))
R += tube('neck', (0, 0.05, 1.58), (0, 0.0, 1.69), 0.055, 0.05, SKIN)
R.append(ellipsoid('head', (0, -0.02, 1.775), (0.105, 0.12, 0.125), SKIN))
R.append(ellipsoid('helmet', (0, 0.0, 1.805), (0.145, 0.165, 0.135), HELMET))
R.append(ellipsoid('visor', (0, -0.115, 1.78), (0.105, 0.05, 0.05), VISOR))
for sx in (-1, 1):
    R += tube('upper_arm', (sx * 0.25, 0.06, 1.50), (sx * 0.31, -0.20, 1.30), 0.062, 0.052, JACKET)
    R += tube('forearm', (sx * 0.31, -0.20, 1.30), (sx * 0.345, -0.58, 1.13), 0.050, 0.042, JACKET)
    R.append(ellipsoid('glove', (sx * 0.345, -0.60, 1.12), (0.048, 0.06, 0.048), GLOVE))
    R += tube('thigh', (sx * 0.12, 0.33, 1.0), (sx * 0.17, -0.12, 0.90), 0.092, 0.075, PANTS)
    R += tube('shin', (sx * 0.17, -0.12, 0.90), (sx * 0.18, -0.20, 0.42), 0.072, 0.058, PANTS)
    R.append(ellipsoid('shoe', (sx * 0.18, -0.26, 0.37), (0.075, 0.17, 0.055), SHOES))
rider_obj = join(R, 'Rider')

# root + export
root = empty('Courier', (0, 0, 0))
for o in (body_obj, box_obj, wr, steer, rider_obj): o.parent = root
sc.render.fps = 30
os.makedirs(os.path.dirname(OUT), exist_ok=True)

if PREVIEW:
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = 900, 900; sc.render.filepath = PREVIEW
    sc.view_settings.view_transform = 'Filmic'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.55, 0.62, 0.75, 1); bg.inputs['Strength'].default_value = 1.0
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0)); g = bpy.context.object; g.data.materials.append(mat('ground', '#8a8680', 0.9))
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 4.0; so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so); so.rotation_euler = (math.radians(55), 0, math.radians(35))
    fill = bpy.data.lights.new('fill', 'AREA'); fill.energy = 120; fill.size = 4; fo = bpy.data.objects.new('fill', fill); sc.collection.objects.link(fo); fo.location = (-4, -3, 3); fo.rotation_euler = (math.radians(60), 0, math.radians(-50))
    cam = bpy.data.cameras.new('cam'); cam.lens = 50; co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    views = {'rear34': (2.7, 3.3, 1.9), 'front34': (-2.8, -3.4, 1.6), 'side': (4.6, 0.0, 1.2)}
    which = os.environ.get('VIEW', 'rear34'); co.location = views[which]
    tgt = empty('tgt', (0, 0.0, 0.95)); tr = co.constraints.new('TRACK_TO'); tr.target = tgt; tr.track_axis = 'TRACK_NEGATIVE_Z'; tr.up_axis = 'UP_Y'
    bpy.ops.render.render(write_still=True)
else:
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True)
    print('exported', OUT, os.path.getsize(OUT) // 1024, 'KB')
