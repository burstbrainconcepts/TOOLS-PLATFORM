import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { staticFile } from 'remotion';

// A 3D person built from the MPFB body (models/build_human_mpfb.py): detailed body and face, 53-bone rig with fingers,
// facial morph targets, skinned clothes. Colours come from the series bible (materials are recoloured by name) and every
// pose is driven by numbers, so the same acting values drive the 2D and the 3D cast. Faces +Z, feet at y = 0, about 1.66 m.
export type Look3D = { skin: string; hair?: string; hairStyle?: 'puff' | 'short' | 'helmet' | 'bald'; shirt: string; pants?: string; shoe?: string; glasses?: boolean; body?: 'm' | 'f' };
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
};

const D = Math.PI / 180;
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const q = (axis: 'x' | 'y' | 'z', deg: number) => new THREE.Quaternion().setFromAxisAngle(AX[axis], deg * D);
const mul = (...qs: THREE.Quaternion[]) => qs.reduce((a, b) => a.multiply(b), new THREE.Quaternion());

const FINGERS = ['index', 'middle', 'ring', 'pinky'];
const CURL: Record<string, number[]> = { index: [4, 8, 6], middle: [5, 10, 8], ring: [6, 12, 9], pinky: [7, 14, 10] };   // relaxed hand, degrees per joint (added to the rest pose, which is already slightly curved)
const FACE_PARTS = ['eye_n', 'eye_p', 'pupil_n', 'pupil_p', 'brow_n', 'brow_p', 'mouth_in', 'teeth', 'glass_n', 'glass_p', 'glass_bridge', 'glass_temple_n', 'glass_temple_p', 'hair_short', 'hair_helmet', 'hair_puff'];

type Rig = {
  root: THREE.Object3D; order: string[]; bones: Record<string, THREE.Bone>; parentOf: Record<string, string | null>;
  restLocal: Record<string, THREE.Quaternion>; restWorld: Record<string, THREE.Quaternion>; restPos: THREE.Vector3;
  suf: { p: string; n: string };               // which bone suffix (_l / _r) lies on the +x side
  armDir: Record<string, THREE.Vector3>; legDir: Record<string, THREE.Vector3>;   // rest directions (world), measured from the bones
  face: Record<string, THREE.Object3D>; brow0: Record<string, THREE.Vector3>;
  morph?: { mesh: THREE.Mesh; idx: Record<string, number> };
};

const buildRig = (scene: THREE.Object3D, look: Look3D): Rig => {
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
    const rep = (mm: THREE.Material) => {
      const c = (mm as THREE.MeshStandardMaterial).clone();
      const t = colors[mm.name.replace(/\.\d+$/, '')];
      if (t) c.color.copy(t);
      c.metalness = 0;
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
  const face: Record<string, THREE.Object3D> = {}, brow0: Record<string, THREE.Vector3> = {};
  for (const n of FACE_PARTS) if (byName[n]) face[n] = byName[n];
  for (const n of ['brow_p', 'brow_n']) if (face[n]) brow0[n] = face[n].position.clone();
  const hs = look.hairStyle ?? 'short';
  for (const n of ['hair_short', 'hair_helmet', 'hair_puff']) if (face[n]) face[n].visible = n === `hair_${hs}`;
  for (const n of ['glass_n', 'glass_p', 'glass_bridge', 'glass_temple_n', 'glass_temple_p']) if (face[n]) face[n].visible = !!look.glasses;
  return { root, order, bones, parentOf, restLocal, restWorld, restPos: bones.pelvis.position.clone(), suf, armDir, legDir, face, brow0, morph };
};

const applyPose = (rig: Rig, p: Pose3D) => {
  const n = (a?: number) => a ?? 0;
  const lean = n(p.lean), step = n(p.step), nod = n(p.nod), look = n(p.look);
  // desired WORLD-space rotation change per bone relative to rest; a bone without an entry inherits its parent's motion
  const d: Record<string, THREE.Quaternion> = {};
  const torso = q('z', lean * 0.65);                       // lean of the upper body, shared by everything above the waist
  d.pelvis = q('z', lean * 0.15);
  d.spine_01 = q('z', lean * 0.3);
  d.spine_02 = q('z', lean * 0.5).multiply(q('y', look * 3));
  d.spine_03 = torso.clone().multiply(q('y', look * 5));
  d.neck_01 = mul(torso, q('x', nod * 0.35), q('y', look * 8));
  d.head = mul(torso, q('z', n(p.head)), q('y', look * 14), q('x', nod * 0.65));
  const arms: ['p' | 'n', number, number, number, number][] = [['p', 1, p.armR ?? 8, p.elbowR ?? 8, n(p.reachR)], ['n', -1, p.armL ?? 8, p.elbowL ?? 8, 0]];
  for (const [s, sign, out, el, reach] of arms) {
    const sf = rig.suf[s];
    // swing the arm from its rest direction (relaxed A-pose, measured from the bones) to `out` degrees away from vertical
    const target = new THREE.Vector3(sign * Math.sin(out * D), -Math.cos(out * D), 0);
    const up = mul(torso, q('x', -reach), new THREE.Quaternion().setFromUnitVectors(rig.armDir[s], target));
    const fore = mul(q('x', -Math.max(0, el - 10) * 1.1), up);               // extra forearm flexion on top of the natural rest bend
    d[`upperarm${sf}`] = up; d[`lowerarm${sf}`] = fore; d[`hand${sf}`] = fore;
    const flat = out > 50 ? 0.25 : 1;                                       // pointing / presenting: the hand stays open and flat
    for (const f of FINGERS) { let cum = 0; for (let k = 1; k <= 3; k++) { cum += CURL[f][k - 1] * flat; d[`${f}_0${k}${sf}`] = mul(fore, q('z', -sign * cum)); } }
    for (let k = 1; k <= 3; k++) d[`thumb_0${k}${sf}`] = mul(fore, q('z', -sign * 3 * k * flat), q('x', sign * 2 * k));
    d[`clavicle${sf}`] = mul(torso, q('z', -sign * 5));                     // sloping shoulders
  }
  for (const s of ['p', 'n'] as const) { const sg = s === 'p' ? 1 : -1; const st = (s === 'p' ? 1 : -1) * step * 3; d[`thigh${rig.suf[s]}`] = mul(q('x', st), new THREE.Quaternion().setFromUnitVectors(rig.legDir[s], new THREE.Vector3(sg * Math.sin(2.5 * D), -Math.cos(2.5 * D), 0))); }
  d[`calf${rig.suf.p}`] = q('x', -Math.max(0, step) * 1.2); d[`calf${rig.suf.n}`] = q('x', -Math.max(0, -step) * 1.2);

  const curW: Record<string, THREE.Quaternion> = {};
  for (const b of rig.order) {
    const par = rig.parentOf[b];
    const pw = par ? curW[par] : rig.bones[b].parent!.getWorldQuaternion(new THREE.Quaternion());
    if (d[b]) {
      curW[b] = d[b].clone().multiply(rig.restWorld[b]);
      rig.bones[b].quaternion.copy(pw.clone().invert().multiply(curW[b]));
    } else {
      rig.bones[b].quaternion.copy(rig.restLocal[b]);
      curW[b] = pw.clone().multiply(rig.restLocal[b]);
    }
  }
  rig.bones.pelvis.position.set(rig.restPos.x + step * 0.016, rig.restPos.y, rig.restPos.z);
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
    set('mouthOpen', surprised ? 0.7 : talk * 0.95);
    set('smile', (happy ? 0.75 : worried ? 0 : 0.28) + Math.max(0, (w - 1) * 0.35) * (talk > 0.1 ? 1 : 0));   // a friendly resting smile by default
    set('frown', worried ? 0.7 : 0);
    set('purse', talk > 0.1 ? Math.max(0, (1 - w) * 0.6) : 0);
  }
  const mouthOpen = talk > 0.1 || surprised;
  if (rig.face.mouth_in) rig.face.mouth_in.visible = mouthOpen;
  if (rig.face.teeth) rig.face.teeth.visible = mouthOpen;
  const headQ = curW.head.clone().invert();
  for (const s of ['p', 'n']) {
    const b = rig.face[`brow_${s}`], b0 = rig.brow0[`brow_${s}`];
    if (b && b0) b.position.copy(b0).add(new THREE.Vector3(0, brow * 0.007, 0).applyQuaternion(headQ).multiplyScalar(1 / 1.1));
  }
};

export const Person3D: React.FC<{ look: Look3D; pose?: Pose3D; position?: [number, number, number]; scale?: number; rotY?: number }> = ({ look, pose = {}, position = [0, 0, 0], scale = 1, rotY = 0 }) => {
  const gltf = useLoader(GLTFLoader, staticFile(`models/human_${look.body ?? 'm'}.glb`));
  const key = JSON.stringify(look);
  const rig = useMemo(() => buildRig(gltf.scene, look), [gltf, key]);
  const poseRef = useRef(pose); poseRef.current = pose;
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => { applyPose(rig, pose); rig.root.updateMatrixWorld(true); invalidate(); });
  useFrame(() => { applyPose(rig, poseRef.current); });
  return <group position={position} scale={scale * 1.08} rotation={[0, rotY, 0]}><primitive object={rig.root} /></group>;
};
