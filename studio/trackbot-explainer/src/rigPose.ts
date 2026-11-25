import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Pure rig logic (no React, no Remotion): loading/recolouring a MPFB GLB, driving its bones and morph targets from numbers.
// Shared by the renderer (Human3D.tsx) and by the Node quality tests (scripts/qa/gait-probe.mjs), so tests run the real code.
export type Look3D = { skin: string; hair?: string; hairStyle?: 'puff' | 'short' | 'helmet' | 'bald'; shirt: string; pants?: string; shoe?: string; glasses?: boolean; body?: 'm' | 'f'; model?: string };
export type Pose3D = {
  head?: number;      // tilt, degrees (sideways)
  nod?: number;       // pitch, degrees (positive = chin down)
  look?: number;      // -1..1 head turn (positive = toward +x)
  lean?: number;      // torso sideways lean, degrees
  armR?: number; armL?: number;      // degrees away from the body (0 = hanging); R = the +x side
  elbowR?: number; elbowL?: number;  // forearm bend, degrees
  reachR?: number;                   // arm raised forward, degrees
  talk?: number;      // mouth openness 0..1
  mouthW?: number;    // mouth width multiplier
  brow?: number;      // -1..1
  blink?: number;     // 1 = open, 0 = closed
  emotion?: string;
  breath?: number;    // chest scale offset
  step?: number;      // -1..1 weight shift between feet
  walk?: number;      // gait phase in radians (used with stride)
  stride?: number;    // 0 = standing, 1 = walking, 1.5 = running
  kick?: number;      // 0..1 progress of a kick with the +x-side leg (undefined = none)
  cheer?: number;     // 0..1 arms-up celebration
  grip?: number;      // 0..1 closes the +x hand around a held object
  mocap?: { clip: MocapClip; t: number };   // play a captured clip: seconds into the clip (looped if the clip loops)
  viseme?: { open: number; purse: number; smile: number; upper: number; out: number };   // phoneme mouth shape (overrides the loudness-driven mouth)
};

const D = Math.PI / 180, D2R = D;
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const q = (axis: 'x' | 'y' | 'z', deg: number) => new THREE.Quaternion().setFromAxisAngle(AX[axis], deg * D);
const mul = (...qs: THREE.Quaternion[]) => qs.reduce((a, b) => a.multiply(b), new THREE.Quaternion());

const FINGERS = ['index', 'middle', 'ring', 'pinky'];
const CURL: Record<string, number[]> = { index: [4, 8, 6], middle: [5, 10, 8], ring: [6, 12, 9], pinky: [7, 14, 10] };   // relaxed hand, degrees per joint (added to the rest pose, which is already slightly curved)
const FACE_PARTS = ['eye_n', 'eye_p', 'pupil_n', 'pupil_p', 'brow_n', 'brow_p', 'mouth_in', 'teeth', 'glass_n', 'glass_p', 'glass_bridge', 'glass_temple_n', 'glass_temple_p', 'hair_short', 'hair_helmet', 'hair_puff'];

export type Rig = {
  root: THREE.Object3D; order: string[]; bones: Record<string, THREE.Bone>; parentOf: Record<string, string | null>;
  restLocal: Record<string, THREE.Quaternion>; restWorld: Record<string, THREE.Quaternion>; restPos: THREE.Vector3;
  rootQ: THREE.Quaternion;                     // world rotation of the bone hierarchy's parent at rest (the rig frame)
  suf: { p: string; n: string };               // which bone suffix (_l / _r) lies on the +x side
  armDir: Record<string, THREE.Vector3>; legDir: Record<string, THREE.Vector3>;   // rest directions (world), measured from the bones
  segDir: Record<string, THREE.Vector3>;   // rest direction of each body segment (bone head -> child head), for motion-capture retargeting
  leg: Record<string, { calfDir: THREE.Vector3; footDir: THREE.Vector3; hip: THREE.Vector3; l1: number; l2: number; ankleY: number }>;   // rest leg geometry for the gait IK
  face: Record<string, THREE.Object3D>; brow0: Record<string, THREE.Vector3>; brows: THREE.Object3D[]; brows0: THREE.Vector3[];
  morph?: { mesh: THREE.Mesh; idx: Record<string, number> };
};

export const buildRig = (scene: THREE.Object3D, look: Look3D): Rig => {
  const root = cloneSkinned(scene);
  const byName: Record<string, THREE.Object3D> = {};
  root.traverse((o) => { if (o.name) byName[o.name] = o; });
  const col = (hex?: string, fallback = '#888888') => new THREE.Color(hex ?? fallback);
  const colors: Record<string, THREE.Color> = { skin: col(look.skin), shirt: col(look.shirt), pants: col(look.pants, '#2A2F45'), shoe: col(look.shoe, '#FFFFFF'), hair: col(look.hair, '#14100D') };
  let morph: Rig['morph'];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    // the exporter marks every material as alpha-blended: only hair, brows and lashes really need transparency (as a cutout)
    const cutout = /afro|bob|braid|long0|ponytail|short0|eyebrow|eyelash/i.test(m.name);
    const rep = (mm: THREE.Material) => {
      const c = (mm as THREE.MeshStandardMaterial).clone();
      const t = colors[mm.name.replace(/\.\d+$/, '')];
      if (t) c.color.copy(t);
      c.metalness = 0;
      c.transparent = false; c.opacity = 1; c.depthWrite = true; c.alphaTest = cutout ? 0.45 : 0;
      if (/shirt|polo|top|sweater|camisole|bodice/i.test(m.name)) c.color.copy(colors.shirt);          // the shirt texture is white: tint it with the bible colour
      if (/shorts/i.test(m.name)) c.color.copy(colors.pants);
      if (/pants|jeans|shorts|trousers/i.test(m.name)) { c.polygonOffset = true; c.polygonOffsetFactor = -2; c.polygonOffsetUnits = -2; }   // waistband wins over the shirt hem
      if (!cutout) c.side = THREE.FrontSide;
      return c;
    };
    m.material = Array.isArray(m.material) ? m.material.map(rep) : rep(m.material);
    if (m.morphTargetDictionary && m.morphTargetInfluences) morph = { mesh: m, idx: m.morphTargetDictionary };
  });
  root.updateMatrixWorld(true);
  // bones, top-down
  const bones: Record<string, THREE.Bone> = {}, parentOf: Record<string, string | null> = {}, order: string[] = [];
  const walk = (o: THREE.Object3D, parent: string | null) => {
    if ((o as THREE.Bone).isBone) { bones[o.name] = o as THREE.Bone; parentOf[o.name] = parent; order.push(o.name); parent = o.name; }
    for (const c of o.children) walk(c, parent);
  };
  walk(root, null);
  const wp = new THREE.Vector3(); bones.upperarm_l.getWorldPosition(wp);
  const suf = wp.x > 0 ? { p: '_l', n: '_r' } : { p: '_r', n: '_l' };
  // unskinned parts ride on the bone that carries them (world transform preserved)
  for (const n of FACE_PARTS) if (byName[n]) bones.head.attach(byName[n]);
  for (const s of ['p', 'n'] as const) for (const n of [`shoe_${s}`, `sole_${s}`]) if (byName[n]) bones[`foot${suf[s]}`].attach(byName[n]);
  root.updateMatrixWorld(true);
  const restLocal: Record<string, THREE.Quaternion> = {}, restWorld: Record<string, THREE.Quaternion> = {};
  for (const b of order) { restLocal[b] = bones[b].quaternion.clone(); restWorld[b] = bones[b].getWorldQuaternion(new THREE.Quaternion()); }
  const dirOf = (a: string, b: string) => { const pa = bones[a].getWorldPosition(new THREE.Vector3()), pb = bones[b].getWorldPosition(new THREE.Vector3()); return pb.sub(pa).normalize(); };
  const armDir: Record<string, THREE.Vector3> = {}, legDir: Record<string, THREE.Vector3> = {};
  for (const s of ['p', 'n'] as const) { armDir[s] = dirOf(`upperarm${suf[s]}`, `lowerarm${suf[s]}`); legDir[s] = dirOf(`thigh${suf[s]}`, `calf${suf[s]}`); }
  const pos = (n: string) => bones[n].getWorldPosition(new THREE.Vector3());
  const leg: Rig['leg'] = {};
  for (const s of ['p', 'n'] as const) {
    const th = pos(`thigh${suf[s]}`), ca = pos(`calf${suf[s]}`), fo = pos(`foot${suf[s]}`), ba = pos(`ball${suf[s]}`);
    leg[s] = { calfDir: dirOf(`calf${suf[s]}`, `foot${suf[s]}`), footDir: ba.clone().sub(fo).normalize(), hip: th, l1: th.distanceTo(ca), l2: ca.distanceTo(fo), ankleY: fo.y };
  }
  // body segments for retargeting captured motion: our bone -> the child bone that gives its direction
  const CHILD: Record<string, string> = { pelvis: 'spine_01', spine_01: 'spine_02', spine_02: 'spine_03', spine_03: 'neck_01', neck_01: 'head' };
  for (const sd of ['p', 'n'] as const) { const x = suf[sd]; Object.assign(CHILD, { [`clavicle${x}`]: `upperarm${x}`, [`upperarm${x}`]: `lowerarm${x}`, [`lowerarm${x}`]: `hand${x}`, [`hand${x}`]: `middle_01${x}`, [`thigh${x}`]: `calf${x}`, [`calf${x}`]: `foot${x}`, [`foot${x}`]: `ball${x}` }); }
  const segDir: Record<string, THREE.Vector3> = {};
  for (const [b, c] of Object.entries(CHILD)) if (bones[b] && bones[c]) segDir[b] = dirOf(b, c);
  segDir.head = segDir.neck_01.clone();
  const face: Record<string, THREE.Object3D> = {}, brow0: Record<string, THREE.Vector3> = {};
  for (const n of FACE_PARTS) if (byName[n]) face[n] = byName[n];
  for (const n of ['brow_p', 'brow_n']) if (face[n]) brow0[n] = face[n].position.clone();
  const brows: THREE.Object3D[] = []; root.traverse((o) => { if ((o as THREE.Mesh).isMesh && /eyebrow/i.test(o.name)) brows.push(o); });
  const hs = look.hairStyle ?? 'short';
  for (const n of ['hair_short', 'hair_helmet', 'hair_puff']) if (face[n]) face[n].visible = n === `hair_${hs}`;
  for (const n of ['glass_n', 'glass_p', 'glass_bridge', 'glass_temple_n', 'glass_temple_p']) if (face[n]) face[n].visible = !!look.glasses;
  return { root, order, bones, parentOf, restLocal, restWorld, leg, segDir, restPos: bones.pelvis.position.clone(), rootQ: bones[order[0]].parent!.getWorldQuaternion(new THREE.Quaternion()), suf, armDir, legDir, face, brow0, brows, brows0: brows.map((b) => b.position.clone()), morph };
};

// Walk and run are defined by FOOT PATHS, not by joint sine waves: in stance the foot moves backward in a straight line at the floor's speed
// (so it does not slide), in swing it lifts and arcs forward. A two-bone IK solver (thigh + calf, in the sagittal plane) then finds the joint angles.
// S = half step length in rig metres, cad = gait cycles per second, duty = fraction of the cycle a foot is on the ground, lift = swing foot height.
export const GAIT = { walk: { S: 0.26, cad: 1.15, duty: 0.5, lift: 0.07 }, run: { S: 0.38, cad: 1.4, duty: 0.4, lift: 0.16 } };
// ---- captured motion (from video, via VideoIntoBlenderModel + scripts/mocap/build-clip.py) ----
export type MocapClip = { name: string; fps: number; loop: boolean; joints: string[]; hipRef: number; floorSpeed: number; hip: number[]; yaw: number[]; pos: number[][][]; source?: string };
// our bone -> [from joint, to joint] of the captured skeleton ({s} = left/right; our +x side is the character's left)
const MOCAP_SEG: Record<string, [string, string]> = {
  pelvis: ['pelvis', 'spine1'], spine_01: ['spine1', 'spine2'], spine_02: ['spine2', 'spine3'], spine_03: ['spine3', 'neck'], neck_01: ['neck', 'head'], head: ['neck', 'head'],
};
for (const [sd, m] of [['p', 'left'], ['n', 'right']] as const) {
  const x = sd === 'p' ? 'P' : 'N';
  Object.assign(MOCAP_SEG, { [`clavicle@${x}`]: [`${m}_collar`, `${m}_shoulder`], [`upperarm@${x}`]: [`${m}_shoulder`, `${m}_elbow`], [`lowerarm@${x}`]: [`${m}_elbow`, `${m}_wrist`], [`hand@${x}`]: [`${m}_wrist`, `${m}_hand`],
    [`thigh@${x}`]: [`${m}_hip`, `${m}_knee`], [`calf@${x}`]: [`${m}_knee`, `${m}_ankle`], [`foot@${x}`]: [`${m}_ankle`, `${m}_foot`] });
}
const mocapFrame = (clip: MocapClip, t: number) => {
  const n = clip.pos.length, f = t * clip.fps;
  const i0 = clip.loop ? ((Math.floor(f) % n) + n) % n : Math.min(n - 1, Math.max(0, Math.floor(f))), i1 = clip.loop ? (i0 + 1) % n : Math.min(n - 1, i0 + 1), k = f - Math.floor(f);
  return { i0, i1, k: clip.loop || (f >= 0 && f < n - 1) ? k : 0 };
};
// Retarget by DIRECTION: each of our bones is turned to point the way the captured segment points (the same method used for arms and legs).
// Twist about the bone axis is not transferred. The whole body is lowered/raised by the captured hip height relative to standing, scaled to our proportions.
const mocapDeltas = (rig: Rig, clip: MocapClip, t: number) => {
  const { i0, i1, k } = mocapFrame(clip, t), ix: Record<string, number> = {}; clip.joints.forEach((j, i) => { ix[j] = i; });
  const pt = (j: string) => new THREE.Vector3().fromArray(clip.pos[i0][ix[j]]).lerp(new THREE.Vector3().fromArray(clip.pos[i1][ix[j]]), k);
  const d: Record<string, THREE.Quaternion> = {};
  for (const [key, [a, b]] of Object.entries(MOCAP_SEG)) {
    const side = key.includes('@') ? key.split('@')[1] : null, base = key.split('@')[0];
    const bone = side ? `${base}${rig.suf[side.toLowerCase() as 'p' | 'n']}` : base;
    if (!rig.segDir[bone]) continue;
    const dir = pt(b).sub(pt(a)); if (dir.lengthSq() < 1e-8) continue;
    d[bone] = new THREE.Quaternion().setFromUnitVectors(rig.segDir[bone], dir.normalize());
  }
  const hip = clip.hip[i0] + (clip.hip[i1] - clip.hip[i0]) * k;
  const scale = rig.leg.p.hip.y / clip.hipRef;                    // our standing hip height / the actor's standing hip height
  return { d, ry: (hip - clip.hipRef) * scale };
};

export const gaitSpeedRig = (run?: boolean) => { const g = run ? GAIT.run : GAIT.walk; return (2 * g.S) / (g.duty / g.cad); };   // floor speed that keeps planted feet still (rig metres/s)
const frac = (x: number) => x - Math.floor(x);
type Gait = { ry: number; S: number; p: { fz: number; fy: number; u: number }; n: { fz: number; fy: number; u: number }; duty: number };
const gaitState = (rig: Rig, phase: number, run: boolean): Gait => {
  const g = run ? GAIT.run : GAIT.walk;
  const up = frac(phase / (2 * Math.PI));
  const foot = (u: number) => {
    if (u < g.duty) return { fz: g.S - (2 * g.S * u) / g.duty, fy: 0, u };
    const t = (u - g.duty) / (1 - g.duty), e = t * t * (3 - 2 * t);
    return { fz: -g.S + 2 * g.S * e, fy: g.lift * Math.sin(Math.PI * t), u };
  };
  const reach = (rig.leg.p.l1 + rig.leg.p.l2) * 0.985, hy0 = rig.leg.p.hip.y, aH = rig.leg.p.ankleY;
  // hips ride a compass-gait arc: just low enough for each leg to reach its foot target, so they are highest at mid-stance (leg nearly straight)
  // and dip at heel strike / toe-off, instead of crouching all the time
  const need = (f: { fz: number; fy: number }) => Math.max(0, (hy0 - aH - f.fy) - Math.sqrt(Math.max(0, reach * reach - f.fz * f.fz)));
  const fp = foot(up), fn = foot(frac(up + 0.5));
  const drop = Math.max(need(fp), need(fn));
  const bob = 0;
  return { ry: -drop + bob, S: g.S, p: fp, n: fn, duty: g.duty };
};

export const applyPose = (rig: Rig, p: Pose3D) => {
  const n = (a?: number) => a ?? 0;
  const lean = n(p.lean), step = n(p.step), nod = n(p.nod), look = n(p.look);
  const kk = p.kick, ch = n(p.cheer);
  // desired WORLD-space rotation change per bone relative to rest; a bone without an entry inherits its parent's motion
  const d: Record<string, THREE.Quaternion> = {};
  const sr = n(p.stride), ph = n(p.walk), sn = Math.sin(ph);
  const gait = sr > 0 ? gaitState(rig, ph, sr > 1.2) : null;
  const torso = mul(q('z', lean * 0.65), q('x', sr * 5 + (kk !== undefined ? -6 * Math.sin(Math.min(1, kk / 0.62) * Math.PI) : 0) - ch * 6));          // lean sideways, and forward when walking                       // lean of the upper body, shared by everything above the waist
  d.pelvis = mul(q('z', lean * 0.15), q('y', -sr * 5 * sn));
  d.spine_01 = q('z', lean * 0.3);
  d.spine_02 = q('z', lean * 0.5).multiply(q('y', look * 3));
  d.spine_03 = mul(torso, q('y', look * 5 + sr * 6 * sn));        // shoulders counter-rotate against the hips
  d.neck_01 = mul(torso, q('x', nod * 0.35), q('y', look * 8));
  d.head = mul(torso, q('z', n(p.head)), q('y', look * 14), q('x', nod * 0.65));
  const kickArm = kk === undefined ? 0 : Math.sin(Math.min(1, kk / 0.62) * Math.PI) * 35;
  const swingOf = (side: 'p' | 'n') => (gait ? -24 * Math.min(sr, 1.5) * (gait[side].fz / gait.S) : 0);   // arms swing opposite to the legs
  const arms: ['p' | 'n', number, number, number, number][] = [['p', 1, (p.armR ?? 8) + ch * 150, (p.elbowR ?? 8) + Math.max(0, swingOf('p')) * 0.75 + ch * 10, n(p.reachR) + swingOf('p') + kickArm * 0.4], ['n', -1, (p.armL ?? 8) + ch * 150, (p.elbowL ?? 8) + Math.max(0, swingOf('n')) * 0.75 + ch * 10, swingOf('n') + kickArm]];
  for (const [s, sign, out, el, reach] of arms) {
    const sf = rig.suf[s];
    // swing the arm from its rest direction (relaxed A-pose, measured from the bones) to `out` degrees away from vertical
    const target = new THREE.Vector3(sign * Math.sin(out * D), -Math.cos(out * D), 0);
    const up = mul(torso, q('x', -reach), new THREE.Quaternion().setFromUnitVectors(rig.armDir[s], target));
    const fore = mul(q('x', -Math.max(0, el - 10) * 1.1), up);               // extra forearm flexion on top of the natural rest bend
    d[`upperarm${sf}`] = up; d[`lowerarm${sf}`] = fore; d[`hand${sf}`] = fore;
    const flat = out > 50 ? 0.25 : 1;                                       // pointing / presenting: the hand stays open and flat
    const gp = s === 'p' ? 1 + 5 * n(p.grip) : 1;                            // gripping: fingers close around the object
    for (const f of FINGERS) { let cum = 0; for (let k = 1; k <= 3; k++) { cum += CURL[f][k - 1] * flat * gp; d[`${f}_0${k}${sf}`] = mul(fore, q('z', -sign * cum)); } }
    for (let k = 1; k <= 3; k++) d[`thumb_0${k}${sf}`] = mul(fore, q('z', -sign * 3 * k * flat), q('x', sign * 2 * k));
    d[`clavicle${sf}`] = mul(torso, q('z', -sign * 5));                     // sloping shoulders
  }
  // kick profile (degrees forward): wind back, whip through, follow through, recover
  const kickF = kk === undefined ? 0 : kk < 0.4 ? -55 * (kk / 0.4) : kk < 0.62 ? -55 + 135 * ((kk - 0.4) / 0.22) : 80 * (1 - (kk - 0.62) / 0.38);
  const kickKnee = kk === undefined ? 0 : kk < 0.4 ? 95 * (kk / 0.4) : kk < 0.62 ? 95 - 85 * ((kk - 0.4) / 0.22) : 10 + 20 * ((kk - 0.62) / 0.38);
  for (const s of ['p', 'n'] as const) {
    const sg = s === 'p' ? 1 : -1, L = rig.leg[s];
    if (gait) {
      // two-bone IK in the sagittal plane (z forward, y up), in the root frame; the floor is at y = -ry there
      const f = gait[s], hz = L.hip.z, hy = L.hip.y;          // in the root frame the hip keeps its rest height; the root itself is lowered by ry
      const Fz = hz + f.fz, Fy = -gait.ry + L.ankleY + f.fy;
      const dx = Fz - hz, dy = hy - Fy, D = Math.min(Math.hypot(dx, dy), (L.l1 + L.l2) * 0.999);
      const beta = Math.atan2(dx, dy), gam = Math.acos(Math.max(-1, Math.min(1, (L.l1 * L.l1 + D * D - L.l2 * L.l2) / (2 * L.l1 * D))));
      const alpha = beta + gam;                                                    // thigh angle from vertical (knee in front)
      const kz = hz + L.l1 * Math.sin(alpha), ky = hy - L.l1 * Math.cos(alpha);
      const thighDir = new THREE.Vector3(rig.legDir[s].x, -Math.cos(alpha), Math.sin(alpha)).normalize();
      const shankDir = new THREE.Vector3(L.calfDir.x, Fy - ky, Fz - kz).normalize();
      d[`thigh${rig.suf[s]}`] = new THREE.Quaternion().setFromUnitVectors(rig.legDir[s], thighDir);
      d[`calf${rig.suf[s]}`] = new THREE.Quaternion().setFromUnitVectors(L.calfDir, shankDir);
      // foot: toe up at heel strike, flat through stance, heel rises at toe-off, toe relaxes in swing
      const u = f.u, dty = gait.duty;
      const pitch = u < 0.12 * dty ? 12 * (1 - u / (0.12 * dty)) : u < 0.7 * dty ? 0 : u < dty ? -28 * ((u - 0.7 * dty) / (0.3 * dty)) : -28 + 40 * Math.min(1, (u - dty) / ((1 - dty) * 0.6));
      const pr = (pitch * D2R);
      d[`foot${rig.suf[s]}`] = new THREE.Quaternion().setFromUnitVectors(L.footDir, new THREE.Vector3(L.footDir.x * 0.3, Math.sin(pr) - 0.05, Math.cos(pr)).normalize());
      continue;
    }
    const kicking = kk !== undefined && s === 'p';
    const th = q('x', -(kicking ? kickF : sg * step * 3));                        // positive swing = leg forward (+z)
    const knee = kicking ? kickKnee : kk !== undefined ? 12 : 0;
    const leg = new THREE.Quaternion().setFromUnitVectors(rig.legDir[s], new THREE.Vector3(sg * Math.sin(2.5 * D), -Math.cos(2.5 * D), 0));
    d[`thigh${rig.suf[s]}`] = mul(th, leg);
    d[`calf${rig.suf[s]}`] = mul(th, leg, q('x', knee + Math.max(0, sg * step) * 1.2));
  }

  let mocapRy: number | null = null;
  if (p.mocap) { const m = mocapDeltas(rig, p.mocap.clip, p.mocap.t); Object.assign(d, m.d); mocapRy = m.ry; }
  const curW: Record<string, THREE.Quaternion> = {};
  for (const b of rig.order) {
    const par = rig.parentOf[b];
    const pw = par ? curW[par] : rig.rootQ;
    if (d[b]) {
      curW[b] = d[b].clone().multiply(rig.restWorld[b]);
      rig.bones[b].quaternion.copy(pw.clone().invert().multiply(curW[b]));
    } else {
      rig.bones[b].quaternion.copy(rig.restLocal[b]);
      curW[b] = pw.clone().multiply(rig.restLocal[b]);
    }
  }
  rig.bones.pelvis.position.set(rig.restPos.x + step * 0.016, rig.restPos.y, rig.restPos.z);
  rig.root.position.y = mocapRy ?? (gait ? gait.ry : 0);
  rig.bones.spine_03.scale.set(1 + n(p.breath), 1 + n(p.breath) * 1.2, 1);
  rig.bones.head.scale.setScalar(1.1);       // slightly large head reads better on a phone

  // face: morph targets for blink / brows / mouth, brow meshes follow the brow morph
  const talk = n(p.talk), w = p.mouthW ?? 1, ink = p.blink ?? 1;
  const happy = p.emotion === 'happy', worried = p.emotion === 'worried', surprised = p.emotion === 'surprised';
  const brow = n(p.brow) + (surprised ? 0.8 : 0);
  if (rig.morph) {
    const { mesh, idx } = rig.morph; const inf = mesh.morphTargetInfluences!;
    const set = (k: string, v: number) => { if (idx[k] !== undefined) inf[idx[k]] = Math.max(0, Math.min(1, v)); };
    for (const s of ['p', 'n']) {
      set(`blink_${s}`, 1 - ink);
      set(`browUp_${s}`, Math.max(0, brow)); set(`browDown_${s}`, Math.max(0, -brow) + (worried ? 0.1 : 0)); set(`browInner_${s}`, worried ? 0.8 : 0);
    }
    const base = happy ? 0.75 : worried ? 0 : 0.28;                   // a friendly resting smile by default
    if (p.viseme) {
      const v = p.viseme;
      set('mouthOpen', surprised ? Math.max(0.7, v.open) : v.open);
      set('smile', base * (1 - 0.8 * Math.max(v.purse, v.open * 0.6)) + v.smile);   // the resting smile gives way to the spoken shape
      set('purse', v.purse); set('upperLip', v.upper); set('lipsOut', v.out);
    } else {
      set('mouthOpen', surprised ? 0.7 : talk * 0.95);
      set('smile', base + Math.max(0, (w - 1) * 0.35) * (talk > 0.1 ? 1 : 0));
      set('purse', talk > 0.1 ? Math.max(0, (1 - w) * 0.6) : 0);
    }
    set('frown', worried ? 0.7 : 0);
  }
  const mouthOpen = talk > 0.1 || surprised;
  if (rig.face.mouth_in) rig.face.mouth_in.visible = mouthOpen;
  if (rig.face.teeth) rig.face.teeth.visible = mouthOpen;
  rig.brows.forEach((b, i) => b.position.copy(rig.brows0[i]).add(new THREE.Vector3(0, brow * 0.006, 0)));
  const headQ = curW.head.clone().invert();
  for (const s of ['p', 'n']) {
    const b = rig.face[`brow_${s}`], b0 = rig.brow0[`brow_${s}`];
    if (b && b0) b.position.copy(b0).add(new THREE.Vector3(0, brow * 0.007, 0).applyQuaternion(headQ).multiplyScalar(1 / 1.1));
  }
};

