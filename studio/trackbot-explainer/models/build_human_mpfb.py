"""3D human from MPFB (MakeHuman plugin for Blender, GPL code / CC0 assets): detailed body + face, 53-bone game rig, facial morph targets.
Run headless (see models/README.md for setup):
    BLENDER_USER_SCRIPTS=<dir containing addons/mpfb> blender -b -P models/build_human_mpfb.py -- out.glb [m|f]
The MPFB add-on targets Blender 4.2; this script shims the few newer APIs it touches so it runs on Blender 4.0.
Everything MPFB-specific stays in this one script; the exported GLB is a plain glTF.
Layout of the result (glTF y-up, facing +Z, metres): skinned meshes body / shirt / pants; unskinned parts that the renderer attaches
to bones by name (eyes, brows, hair styles, glasses, shoes); morph targets on the body for blinking, brows and lip-sync."""
import bpy, bmesh, sys, os, math, importlib, gzip
from mathutils import Vector

import json
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'human.glb'
SPEC = {'sex': 'm', 'skin': None, 'hair': None, 'eyebrows': 'eyebrow001', 'clothes': [], 'glasses': False, 'assets': os.environ.get('MPFB_ASSETS', os.path.expanduser('~/mpfb-assets/root')), 'texture_px': 1024}
if len(argv) > 1: SPEC.update(json.loads(open(argv[1]).read()) if os.path.exists(argv[1]) else {'sex': argv[1]})
SEX = SPEC['sex']
os.makedirs('/tmp/mpfb_ext', exist_ok=True)
bpy.utils.extension_path_user = lambda pkg, create=False, path='': '/tmp/mpfb_ext'   # shim: Blender 4.2 API used by MPFB
bpy.ops.preferences.addon_enable(module='mpfb')
HS = importlib.import_module('mpfb.services.humanservice').HumanService
TS = importlib.import_module('mpfb.services.targetservice').TargetService
LS = importlib.import_module('mpfb.services.locationservice').LocationService
scene = bpy.context.scene
bpy.context.preferences.addons['mpfb'].preferences.mpfb_second_root = SPEC['assets']
LS.update_second_root()
AS = importlib.import_module('mpfb.services.assetservice').AssetService
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
if SPEC['skin']:
    HS.set_character_skin(AS.find_asset_absolute_path(SPEC['skin'] + '.mhmat', asset_subdir='skins'), body, skin_type='GAMEENGINE')
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

def fetch(sub, name):
    path = AS.find_asset_absolute_path(name, asset_subdir=sub)
    if path is None: print('MISSING ASSET', sub, name)
    return path
# --------------------------------------------------------------- real assets: eyes, brows, lashes, mouth, hair, clothes
ADD = [('eyes', 'low-poly.mhclo', 'Eyes'), ('eyebrows', SPEC['eyebrows'] + '.mhclo', 'Eyebrows'), ('eyelashes', 'eyelashes01.mhclo', 'Eyelashes'),
       ('tongue', 'tongue01.mhclo', 'Tongue'), ('teeth', 'teeth_base.mhclo', 'Teeth')]
if SPEC['hair']: ADD.append(('hair', SPEC['hair'] + '.mhclo', 'Hair'))
for c in SPEC['clothes']: ADD.append(('clothes', c + '.mhclo', 'Clothes'))
added = []
for sub, fn, kind in ADD:
    pth = fetch(sub, fn)
    if pth: added.append(HS.add_mhclo_asset(pth, body, asset_type=kind, subdiv_levels=0, material_type='GAMEENGINE'))
print('assets added:', [o.name for o in added])

# ------------------------------------------------------------------- helper geometry out (the body keeps its shape keys)
gi = body.vertex_groups['body'].index
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active = body
for v in body.data.vertices:
    gs = {g.group: g.weight for g in v.groups}
    v.select = not (gi in gs and gs[gi] >= 0.5)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.delete(type='VERT'); bpy.ops.object.mode_set(mode='OBJECT')
for m in list(body.modifiers):
    if m.type == 'MASK': body.modifiers.remove(m)
print('body after helper removal:', len(body.data.vertices), 'verts')

# ------------------------------------------------------------------------------ glasses (optional, shown by the renderer)
def dark():
    m = bpy.data.materials.get('glass_dark') or bpy.data.materials.new('glass_dark'); m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.01, 0.01, 0.012, 1); return m
def surface_point(origin, direction=Vector((0, 1, 0))):
    ok, loc, nor, idx = body.ray_cast(origin, direction, distance=1.0)
    return (loc, nor) if ok else (origin + direction * 0.1, Vector((0, -1, 0)))
for s, c in EYE.items():
    hit, hn = surface_point(Vector((c.x, c.y - 0.25, c.z)))
    ring_c = Vector((c.x, min(hit.y, c.y - EYE_R * 0.9) - 0.006, c.z))
    bpy.ops.mesh.primitive_torus_add(major_radius=EYE_R * 1.5, minor_radius=EYE_R * 0.14, major_segments=32, minor_segments=8, location=ring_c, rotation=(math.radians(90), 0, 0))
    g = bpy.context.active_object; g.name = f'glass_{s}'; g.data.materials.append(dark())
    sgn = 1 if s == 'p' else -1
    a_, b_ = Vector((ring_c.x + sgn * EYE_R * 1.5, ring_c.y, ring_c.z)), Vector((sgn * 0.083, ring_c.y + 0.10, ring_c.z - 0.005))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(a_ + b_) / 2); t = bpy.context.active_object; t.name = f'glass_temple_{s}'
    t.scale = (0.003, (b_ - a_).length, 0.003); t.rotation_euler = (0, 0, math.atan2(-(b_.x - a_.x), (b_.y - a_.y))); t.data.materials.append(dark())
mid = (EYE['p'] + EYE['n']) / 2
nb, _ = surface_point(Vector((0, mid.y - 0.25, mid.z)))
bpy.ops.mesh.primitive_cube_add(size=1, location=Vector((0, nb.y - 0.004, mid.z))); gb = bpy.context.active_object; gb.name = 'glass_bridge'; gb.scale = (EYE_R * 1.3, 0.004, 0.004); gb.data.materials.append(dark())
for o in [o for o in bpy.data.objects if o.name.startswith('glass_')]:
    o.hide_render = not SPEC['glasses']
if not SPEC['glasses']:
    for o in [o for o in bpy.data.objects if o.name.startswith('glass_')]: bpy.data.objects.remove(o, do_unlink=True)

# ---------------------------------------------------------------------------- textures: shrink, then export
mx = SPEC['texture_px']
for im in bpy.data.images:
    if im.size[0] > mx or im.size[1] > mx:
        k = mx / max(im.size); im.scale(max(1, int(im.size[0] * k)), max(1, int(im.size[1] * k)))
for o in bpy.data.objects: o.select_set(o.type in ('MESH', 'ARMATURE') and not o.hide_get())
bpy.context.view_layer.objects.active = rig
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=False, export_yup=True, export_skins=True, export_animations=False,
                          export_morph=True, export_morph_normal=False, export_draco_mesh_compression_enable=False)
print('exported', OUT, os.path.getsize(OUT) // 1024, 'KB')
