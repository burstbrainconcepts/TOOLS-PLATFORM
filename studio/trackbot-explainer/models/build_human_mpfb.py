"""3D human from MPFB (MakeHuman plugin for Blender, GPL code / CC0 assets): detailed body + face, 53-bone game rig, facial morph targets.
Run headless (see models/README.md for setup):
    BLENDER_USER_SCRIPTS=<dir containing addons/mpfb> blender -b -P models/build_human_mpfb.py -- out.glb [m|f]
The MPFB add-on targets Blender 4.2; this script shims the few newer APIs it touches so it runs on Blender 4.0.
Everything MPFB-specific stays in this one script; the exported GLB is a plain glTF.
Layout of the result (glTF y-up, facing +Z, metres): skinned meshes body / shirt / pants; unskinned parts that the renderer attaches
to bones by name (eyes, brows, hair styles, glasses, shoes); morph targets on the body for blinking, brows and lip-sync."""
import bpy, bmesh, sys, os, math, importlib, gzip
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'human.glb'
SEX = argv[1] if len(argv) > 1 else 'm'
os.makedirs('/tmp/mpfb_ext', exist_ok=True)
bpy.utils.extension_path_user = lambda pkg, create=False, path='': '/tmp/mpfb_ext'   # shim: Blender 4.2 API used by MPFB
bpy.ops.preferences.addon_enable(module='mpfb')
HS = importlib.import_module('mpfb.services.humanservice').HumanService
TS = importlib.import_module('mpfb.services.targetservice').TargetService
LS = importlib.import_module('mpfb.services.locationservice').LocationService
scene = bpy.context.scene
for o in list(bpy.data.objects):
    if o.type in ('CAMERA', 'LIGHT') or o.name == 'Cube': bpy.data.objects.remove(o, do_unlink=True)

# ----------------------------------------------------------------------------------------------- body
macro = TS.get_default_macro_info_dict()
macro['gender'] = 1.0 if SEX == 'm' else 0.0
macro['age'] = 0.5; macro['muscle'] = 0.5 if SEX == 'm' else 0.35; macro['weight'] = 0.5
body = HS.create_human(macro_detail_dict=macro, feet_on_ground=True)
body.name = 'body'
for m in list(body.modifiers): body.modifiers.remove(m)           # the helper-hiding mask: helpers are deleted for real below
TS.bake_targets(body)                                             # fix the body shape, drop the macro shape keys
rig = HS.add_builtin_rig(body, 'game_engine'); rig.name = 'rig'
bpy.context.view_layer.update()

# ---------------------------------------------------------------------------------- facial morph targets
UNITS = os.path.join(os.path.dirname(importlib.import_module('mpfb').__file__), 'data', 'targets', 'expression', 'units', 'caucasian')
WANT = {'eye-left-closure': 'blink_l', 'eye-right-closure': 'blink_r', 'eyebrows-left-up': 'browUp_l', 'eyebrows-right-up': 'browUp_r',
        'eyebrows-left-down': 'browDown_l', 'eyebrows-right-down': 'browDown_r', 'eyebrows-left-inner-up': 'browInner_l', 'eyebrows-right-inner-up': 'browInner_r',
        'mouth-open': 'mouthOpen', 'mouth-corner-puller': 'smile', 'mouth-depression': 'frown', 'mouth-pursing': 'purse', 'mouth-elevation': 'upperLip', 'mouth-eversion': 'lipsOut'}
for fn, name in WANT.items():
    TS.load_target(body, os.path.join(UNITS, fn + '.target.gz'), weight=0.0, name=name)
keys = body.data.shape_keys.key_blocks
base = keys[0].data
def key_side(name):   # which side (+x / -x) does this key move? decided by the displaced vertices, so naming conventions cannot go wrong
    xs = [base[i].co.x for i, d in enumerate(keys[name].data) if (d.co - base[i].co).length > 1e-5]
    return 'p' if sum(xs) / max(1, len(xs)) > 0 else 'n'
renames = {}
for n in ('blink', 'browUp', 'browDown', 'browInner'):
    a, b = f'{n}_l', f'{n}_r'
    sa = key_side(a); renames[a] = f'{n}_{sa}'; renames[b] = f'{n}_{"n" if sa == "p" else "p"}'
for old, new in renames.items(): keys[old].name = new + '_'          # two-step rename avoids clashes
for k in keys:
    if k.name.endswith('_') and k.name != 'Basis': k.name = k.name[:-1]
print('morphs:', [k.name for k in keys])

# ------------------------------------------------------- measurements (before helper geometry is removed)
def group_center(name):
    gi = body.vertex_groups[name].index
    pts = [v.co.copy() for v in body.data.vertices if any(g.group == gi and g.weight > 0.5 for g in v.groups)]
    c = sum(pts, Vector()) / len(pts)
    ext = Vector((max(p.x for p in pts) - min(p.x for p in pts), max(p.y for p in pts) - min(p.y for p in pts), max(p.z for p in pts) - min(p.z for p in pts)))
    return c, ext
eyeL, eyeLext = group_center('helper-l-eye'); eyeR, _ = group_center('helper-r-eye')
EYE = {('p' if eyeL.x > 0 else 'n'): eyeL, ('n' if eyeL.x > 0 else 'p'): eyeR}
EYE_R = max(eyeLext) * 0.5
# mouth line: where the smile morph moves the lip corners (the joint group sits elsewhere)
_sm = [(i, (d.co - base[i].co).length) for i, d in enumerate(keys['smile'].data)]
_mx = max(l for _, l in _sm)
_cs = [base[i].co for i, l in _sm if l > 0.5 * _mx and base[i].co.y < -0.05]
mouth_c = sum(_cs, Vector()) / len(_cs)
print('mouth centre', tuple(round(c, 3) for c in mouth_c))
B = rig.data.bones
bone = lambda n: (B[n].head_local.copy(), B[n].tail_local.copy())
print('eye centre', {k: tuple(round(c, 3) for c in v) for k, v in EYE.items()}, 'radius', round(EYE_R, 4))

# ------------------------------------------------------------------------- remove helper geometry for real
gi = body.vertex_groups['body'].index
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active = body
bm = bmesh.new(); bm.from_mesh(body.data)
dl = bm.verts.layers.deform.active
drop = [v for v in bm.verts if gi not in v[dl] or v[dl][gi] < 0.5]
bmesh.ops.delete(bm, geom=drop, context='VERTS')
# shape keys must be rebuilt consistently: do the deletion through the edit-mode operator instead (keeps all keys in sync)
bm.free()
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
for v in body.data.vertices:
    gs = {g.group: g.weight for g in v.groups}
    v.select = not (gi in gs and gs[gi] >= 0.5)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.delete(type='VERT'); bpy.ops.object.mode_set(mode='OBJECT')
print('body after helper removal:', len(body.data.vertices), 'verts')

def mat(name, color, rough=0.6):
    h = color.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = c; b.inputs['Roughness'].default_value = rough
    return m
M = {n: mat(n, c, r) for n, c, r in (('skin', '#8D5524', 0.55), ('shirt', '#2B6CFF', 0.7), ('pants', '#2A2F45', 0.75), ('shoe', '#FFFFFF', 0.45), ('hair', '#14100D', 0.85),
                                     ('eye_white', '#F4F4F2', 0.25), ('eye_dark', '#1B1B1F', 0.2), ('mouth', '#2A0C12', 0.5), ('trim', '#FFFFFF', 0.6))}
body.data.materials.clear(); body.data.materials.append(M['skin'])
for p in body.data.polygons: p.material_index = 0
for p in body.data.polygons: p.use_smooth = True

# ------------------------------------------------------------- clothing shells cut from the body surface
def shell(name, keep, offset, matname, thick=0.004, snaps=()):
    o = body.copy(); o.data = body.data.copy(); o.name = name; scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    if o.data.shape_keys: o.shape_key_clear()
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f.calc_center_median())], context='FACES_ONLY')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.normal_update()
    # clean edges: boundary vertices near a hem / collar / waist are snapped onto a horizontal plane
    bnd = {v for e in bm.edges if e.is_boundary for v in e.verts}
    for v in bnd:
        for z0, test in snaps:
            if test(v.co): v.co.z = z0; break
    for v in bm.verts: v.co += v.normal * offset
    bm.to_mesh(o.data); bm.free()
    o.data.materials.clear(); o.data.materials.append(M[matname])
    for p in o.data.polygons: p.use_smooth = True
    sol = o.modifiers.new('solid', 'SOLIDIFY'); sol.thickness = thick; sol.offset = 1
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    # the armature modifier must stay last: apply solidify only
    for m in list(o.modifiers):
        if m.type == 'SOLIDIFY': bpy.ops.object.modifier_apply(modifier=m.name)
    return o
(uh, ut), (fh, ft), (ph, _), (s1h, _), (nh, _), (cph, _), (hh, ht) = bone('upperarm_l'), bone('lowerarm_l'), bone('pelvis'), bone('spine_01'), bone('neck_01'), bone('clavicle_l'), bone('head')
sx, ex, zarm = abs(uh.x), abs(ft.x if abs(ft.x) > abs(fh.x) else fh.x), uh.z
hem, neck_z, waist = ph.z - 0.07, nh.z - 0.015, s1h.z
(ankle, _), (ball, _) = bone('foot_l'), bone('ball_l')
def near_sleeve(c, reach=0.82, rad=0.095):   # short sleeve: within `rad` of the upper-arm axis (shoulder -> elbow), up to `reach` of its length
    A, Bv = Vector((abs(uh.x), uh.y, uh.z)), Vector((abs(ut.x), ut.y, ut.z)); P = Vector((abs(c.x), c.y, c.z))
    t = (P - A).dot(Bv - A) / (Bv - A).length_squared
    return -0.1 <= t <= reach and (P - (A + (Bv - A) * max(0.0, t))).length < rad
def shirt_keep(c): return (hem <= c.z <= neck_z and (abs(c.x) <= sx + 0.015 or (c.z < 1.20 and abs(c.x) <= 0.255))) or (abs(c.x) > sx + 0.015 and c.z < neck_z + 0.04 and near_sleeve(c))
def pants_keep(c): return ankle.z + 0.07 <= c.z <= hem + 0.04 and abs(c.x) < 0.3      # the waistband hides under the shirt hem
shirt = shell('shirt', shirt_keep, 0.011, 'shirt', 0.005, snaps=[(hem, lambda c: c.z < hem + 0.06 and abs(c.x) <= sx + 0.02), (neck_z, lambda c: c.z > neck_z - 0.05 and abs(c.x) <= sx + 0.02)])
pants = shell('pants', pants_keep, 0.010, 'pants', 0.005, snaps=[(hem + 0.04, lambda c: c.z > hem - 0.02), (ankle.z + 0.07, lambda c: c.z < ankle.z + 0.13)])
print('shirt', len(shirt.data.polygons), 'faces; pants', len(pants.data.polygons))

# ------------------------------------------------------------------------------ face parts and accessories
bvh_obj = body
def surface_point(origin, direction=Vector((0, 1, 0)), back=0.0):
    ok, loc, nor, idx = bvh_obj.ray_cast(origin, direction, distance=1.0)
    return (loc, nor) if ok else (origin + direction * 0.1, Vector((0, -1, 0)))
def uv_sphere(name, loc, scale, matname, seg=24, rings=14):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o); o.location = loc; o.scale = scale
    o.data.materials.append(M[matname])
    for p in me.polygons: p.use_smooth = True
    return o
FRONT = Vector((0, -1, 0))          # the face looks toward -Y in Blender (= +Z in glTF)
for s, c in EYE.items():
    uv_sphere(f'eye_{s}', c, (EYE_R,) * 3, 'eye_white', 24, 16)
    uv_sphere(f'pupil_{s}', c + FRONT * (EYE_R * 0.74), (EYE_R * 0.52, EYE_R * 0.30, EYE_R * 0.52), 'eye_dark', 16, 10)
    loc, nor = surface_point(Vector((c.x, c.y - 0.25, c.z + EYE_R * 2.1)), Vector((0, 1, 0)))
    b = uv_sphere(f'brow_{s}', loc + nor * 0.0015, (EYE_R * 1.55, EYE_R * 0.28, EYE_R * 0.30), 'hair', 12, 8)
    hit, hn = surface_point(Vector((c.x, c.y - 0.25, c.z)), Vector((0, 1, 0)))
    ring_c = Vector((c.x, min(hit.y, c.y - EYE_R * 0.9) - 0.006, c.z))          # lenses sit just in front of the eye / lid
    bpy.ops.mesh.primitive_torus_add(major_radius=EYE_R * 1.5, minor_radius=EYE_R * 0.14, major_segments=32, minor_segments=8, location=ring_c, rotation=(math.radians(90), 0, 0))
    g = bpy.context.active_object; g.name = f'glass_{s}'; g.data.materials.append(M['eye_dark'])
    sgn = 1 if s == 'p' else -1                                                  # temple arm: lens edge -> toward the ear
    a_, b_ = Vector((ring_c.x + sgn * EYE_R * 1.5, ring_c.y, ring_c.z)), Vector((sgn * 0.083, ring_c.y + 0.10, ring_c.z - 0.005))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(a_ + b_) / 2); t = bpy.context.active_object; t.name = f'glass_temple_{s}'
    t.scale = (0.003, (b_ - a_).length, 0.003); t.rotation_euler = (0, 0, math.atan2(-(b_.x - a_.x), (b_.y - a_.y))); t.data.materials.append(M['eye_dark'])
mid = (EYE['p'] + EYE['n']) / 2
nb, _ = surface_point(Vector((0, mid.y - 0.25, mid.z)), Vector((0, 1, 0)))
bpy.ops.mesh.primitive_cube_add(size=1, location=Vector((0, nb.y - 0.004, mid.z))); gb = bpy.context.active_object; gb.name = 'glass_bridge'; gb.scale = (EYE_R * 1.3, 0.004, 0.004); gb.data.materials.append(M['eye_dark'])
# dark mouth interior: sits just behind the closed lips, only visible when the mouth-open morph parts them
mp, mn = surface_point(Vector((0, mid.y - 0.25, mouth_c.z)), Vector((0, 1, 0)))
uv_sphere('mouth_in', mp + Vector((0, 0.012, 0)), (0.022, 0.012, 0.014), 'mouth', 16, 10)
uv_sphere('teeth', mp + Vector((0, 0.004, 0.0055)), (0.0185, 0.0045, 0.0042), 'trim', 16, 8)

# hair: shells grown from the scalp (a cap, a taller helmet) and a few spheres for the puff style
def hair_shell(name, offset, lowest, thick):
    def keep(c):
        if c.z < lowest: return False
        if c.z < mid.z + 0.02 and abs(c.x) > 0.075: return False     # leave the ears free
        if c.y < mid.y + 0.012 and c.z < mid.z + EYE_R * 4.2: return False   # leave the forehead free
        return c.z > mid.z - 0.02
    return shell(name, keep, offset, 'hair', thick)
hs = hair_shell('hair_short', 0.006, mid.z - 0.03, 0.005)
hh2 = hair_shell('hair_helmet', 0.016, mid.z - 0.05, 0.008)
for h in (hs, hh2):                                                      # hair is not skinned: the renderer attaches it to the head bone
    for m in list(h.modifiers): h.modifiers.remove(m)
    h.parent = None; h.vertex_groups.clear()
top = Vector((0, mid.y + 0.03, mid.z + 0.075))
puffs = [uv_sphere(f'puff{i}', top + Vector((x, y, z)), (r, r, r), 'hair', 20, 12) for i, (x, y, z, r) in enumerate([(-0.06, 0, 0.0, 0.05), (0.06, 0, 0.0, 0.05), (0, 0, 0.035, 0.065), (-0.035, -0.04, 0.01, 0.045), (0.035, -0.04, 0.01, 0.045), (0, 0.06, -0.01, 0.06)])]
bpy.ops.object.select_all(action='DESELECT')
for p_ in puffs: p_.select_set(True)
bpy.context.view_layer.objects.active = puffs[0]; bpy.ops.object.join(); bpy.context.active_object.name = 'hair_puff'
# sneakers, built from the foot bones: sole slab, upper, toe cap, heel collar and laces
def rounded_box(name, loc, size, matname, bevel=0.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.active_object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True); bv = o.modifiers.new('b', 'BEVEL'); bv.width = bevel; bv.segments = 3
    bpy.ops.object.modifier_apply(modifier='b'); o.data.materials.append(M[matname])
    for p_ in o.data.polygons: p_.use_smooth = True
    return o
def join_named(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); bpy.context.active_object.name = name
for s_, sgn in (('p', 1), ('n', -1)):
    side = '_l' if (bone('foot_l')[0].x > 0) == (sgn > 0) else '_r'
    (a, _), (bl, _) = bone('foot' + side), bone('ball' + side)
    cx, cy = a.x, (a.y + bl.y) / 2 - 0.045
    parts = [rounded_box('sole', Vector((cx, cy, 0.014)), (0.066, 0.285, 0.028), 'trim', 0.012)]
    up = uv_sphere('upper', Vector((cx, cy + 0.01, 0.052)), (0.052, 0.128, 0.044), 'shoe', 28, 16); parts.append(up)
    parts.append(uv_sphere('toe', Vector((cx, cy - 0.095, 0.034)), (0.048, 0.062, 0.030), 'trim', 20, 10))
    parts.append(uv_sphere('collar', Vector((cx, cy + 0.105, 0.075)), (0.046, 0.04, 0.042), 'shoe', 20, 12))
    for k in range(3): parts.append(rounded_box('lace', Vector((cx, cy - 0.03 + k * 0.026 - 0.0, 0.092)), (0.04, 0.008, 0.006), 'trim', 0.002))
    join_named(parts, f'shoe_{s_}')
    # the shoes are one piece now; keep a tiny placeholder so the renderer's sole_* lookups stay harmless
    uv_sphere(f'sole_{s_}', Vector((cx, cy, -1.0)), (0.001, 0.001, 0.001), 'trim', 4, 3)

# ----------------------------------------------------------------------------------------------- export
for o in bpy.data.objects: o.select_set(o.type in ('MESH', 'ARMATURE'))
bpy.context.view_layer.objects.active = rig
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=False, export_yup=True, export_skins=True, export_animations=False,
                          export_morph=True, export_morph_normal=False, export_draco_mesh_compression_enable=False)
print('exported', OUT, os.path.getsize(OUT) // 1024, 'KB')
