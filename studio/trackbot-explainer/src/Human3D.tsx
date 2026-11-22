import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { staticFile } from 'remotion';

// A 3D person built in Blender (models/build_human.py): smooth skinned body with hands, sculpted head, separate face parts.
// Colours come from the series bible (materials are recoloured by name) and every pose is driven by numbers, so the same
// acting values drive 2D and 3D. Faces +Z, feet at y = 0, about 1.8 m tall.
export type Look3D = { skin: string; hair?: string; hairStyle?: 'puff' | 'short' | 'helmet'; shirt: string; pants?: string; shoe?: string; glasses?: boolean };
export type Pose3D = {
  head?: number;      // tilt, degrees (sideways)
  nod?: number;       // pitch, degrees (positive = chin down)
  look?: number;      // -1..1 head/eye turn (positive = toward +x)
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

const BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'upperarm_p', 'forearm_p', 'hand_p', 'upperarm_n', 'forearm_n', 'hand_n', 'thigh_p', 'shin_p', 'foot_p', 'thigh_n', 'shin_n', 'foot_n'] as const;
const PARENT: Record<string, string | null> = { hips: null, spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', upperarm_p: 'chest', forearm_p: 'upperarm_p', hand_p: 'forearm_p', upperarm_n: 'chest', forearm_n: 'upperarm_n', hand_n: 'forearm_n', thigh_p: 'hips', shin_p: 'thigh_p', foot_p: 'shin_p', thigh_n: 'hips', shin_n: 'thigh_n', foot_n: 'shin_n' };
type Rig = {
  root: THREE.Object3D; bones: Record<string, THREE.Object3D>;
  restLocal: Record<string, THREE.Quaternion>; restWorld: Record<string, THREE.Quaternion>; restPos: THREE.Vector3;
  nodes: Record<string, THREE.Object3D>; base: Record<string, THREE.Vector3>;
};

const HEAD_PARTS = ['head_mesh', 'ear_n', 'ear_p', 'eye_n', 'eye_p', 'pupil_n', 'pupil_p', 'brow_n', 'brow_p', 'mouth_open', 'mouth_smile', 'mouth_flat', 'glass_n', 'glass_p', 'glass_bridge', 'hair_short', 'hair_helmet', 'hair_puff', 'lid_n', 'lid_p'];

const buildRig = (scene: THREE.Object3D, look: Look3D): Rig => {
  const root = cloneSkinned(scene);
  const byName: Record<string, THREE.Object3D> = {};
  root.traverse((o) => { if (o.name) byName[o.name] = o; });
  const col = (hex?: string, fallback = '#888888') => new THREE.Color(hex ?? fallback);
  const colors: Record<string, THREE.Color> = { skin: col(look.skin), shirt: col(look.shirt), pants: col(look.pants, '#2A2F45'), shoe: col(look.shoe, '#FFFFFF'), hair: col(look.hair, '#14100D') };
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
  });
  root.updateMatrixWorld(true);
  const bones: Record<string, THREE.Object3D> = {};
  for (const b of BONES) bones[b] = byName[b];
  // parts that are not skinned are attached to the bone that carries them (their world transform is preserved)
  for (const n of HEAD_PARTS) if (byName[n]) bones.head.attach(byName[n]);
  for (const s of ['p', 'n']) for (const n of [`shoe_${s}`, `sole_${s}`]) if (byName[n]) bones[`foot_${s}`].attach(byName[n]);
  root.updateMatrixWorld(true);
  const restLocal: Record<string, THREE.Quaternion> = {}, restWorld: Record<string, THREE.Quaternion> = {};
  for (const b of BONES) { restLocal[b] = bones[b].quaternion.clone(); restWorld[b] = bones[b].getWorldQuaternion(new THREE.Quaternion()); }
  const nodes: Record<string, THREE.Object3D> = {}, base: Record<string, THREE.Vector3> = {};
  for (const n of HEAD_PARTS) if (byName[n]) { nodes[n] = byName[n]; base[n] = byName[n].scale.clone(); }
  const hs = look.hairStyle ?? 'short';
  for (const n of ['hair_short', 'hair_helmet', 'hair_puff']) if (nodes[n]) nodes[n].visible = n === `hair_${hs}`;
  for (const n of ['glass_n', 'glass_p', 'glass_bridge']) if (nodes[n]) nodes[n].visible = !!look.glasses;
  return { root, bones, restLocal, restWorld, restPos: bones.hips.position.clone(), nodes, base };
};

const applyPose = (rig: Rig, p: Pose3D) => {
  // desired WORLD-space rotation change per bone (relative to rest); bones without one inherit their parent's motion
  const n = (a?: number) => a ?? 0;
  const d: Record<string, THREE.Quaternion> = {};
  const lean = n(p.lean), step = n(p.step);
  d.hips = q('z', lean * 0.3);
  d.spine = q('z', lean * 0.5).multiply(q('y', n(p.look) * 4));
  d.neck = q('x', n(p.nod) * 0.35).multiply(q('y', n(p.look) * 8));
  d.head = q('z', n(p.head)).multiply(q('y', n(p.look) * 14)).multiply(q('x', n(p.nod) * 0.65));
  const arms: [string, number, number, number, number][] = [['p', 1, p.armR ?? 8, p.elbowR ?? 8, n(p.reachR)], ['n', -1, p.armL ?? 8, p.elbowL ?? 8, 0]];
  for (const [s, sign, out, el, reach] of arms) {
    const up = q('z', sign * out).multiply(q('x', -reach));
    d[`upperarm_${s}`] = up;
    d[`forearm_${s}`] = up.clone().multiply(q('x', -el * 1.1)).multiply(q('z', sign * el * 0.25));
  }
  d.thigh_p = q('x', step * 3); d.thigh_n = q('x', -step * 3);
  d.shin_p = q('x', -Math.max(0, step) * 1.2); d.shin_n = q('x', -Math.max(0, -step) * 1.2);

  const curW: Record<string, THREE.Quaternion> = {};
  const rootW = new THREE.Quaternion();
  for (const b of BONES) {
    const pw = PARENT[b] ? curW[PARENT[b]!] : rootW;
    if (d[b]) {
      curW[b] = d[b].clone().multiply(rig.restWorld[b]);
      rig.bones[b].quaternion.copy(pw.clone().invert().multiply(curW[b]));
    } else {
      rig.bones[b].quaternion.copy(rig.restLocal[b]);
      curW[b] = pw.clone().multiply(rig.restLocal[b]);
    }
  }
  rig.bones.head.scale.setScalar(1.2);   // stylised: slightly large head reads better on a phone
  rig.bones.hips.position.set(rig.restPos.x + step * 0.018, rig.restPos.y, rig.restPos.z);
  rig.bones.chest.scale.set(1 + n(p.breath), 1 + n(p.breath) * 1.4, 1);

  // face: blink by squashing the eyes, brows tilt with emotion, mouth switches between open / smile / flat
  const N = rig.nodes, B = rig.base, ink = p.blink ?? 1;
  const talk = n(p.talk), w = p.mouthW ?? 1;
  const happy = p.emotion === 'happy', worried = p.emotion === 'worried', surprised = p.emotion === 'surprised';
  for (const s of ['n', 'p']) {
    const sgn = s === 'p' ? 1 : -1;
    const eye = N[`eye_${s}`], pup = N[`pupil_${s}`], brow = N[`brow_${s}`];
    if (eye) eye.scale.set(B[`eye_${s}`].x, B[`eye_${s}`].y, B[`eye_${s}`].z * Math.max(0.12, ink));
    if (pup) { pup.scale.set(B[`pupil_${s}`].x, B[`pupil_${s}`].y, B[`pupil_${s}`].z * Math.max(0.12, ink)); pup.visible = ink > 0.4; }
    if (brow) { brow.rotation.z = sgn * (worried ? 0.3 : -0.06); brow.position.y = (brow.userData.y0 ??= brow.position.y) + n(p.brow) * 0.008 + (surprised ? 0.007 : 0); }
    if (N[`lid_${s}`]) N[`lid_${s}`].visible = false;
  }
  const mo = N.mouth_open, sm = N.mouth_smile, fl = N.mouth_flat;
  const open = talk > 0.1 || surprised;
  if (mo) { mo.visible = open; mo.scale.set(B.mouth_open.x * (1 - talk * 0.15) * w, B.mouth_open.y * (1 + (surprised ? 1.6 : 0) + talk * 3.6), B.mouth_open.z); }
  if (sm) { sm.visible = !open && (happy || worried); sm.rotation.z = worried ? Math.PI : 0; }
  if (fl) fl.visible = !open && !happy && !worried;
};

export const Person3D: React.FC<{ look: Look3D; pose?: Pose3D; position?: [number, number, number]; scale?: number; rotY?: number }> = ({ look, pose = {}, position = [0, 0, 0], scale = 1, rotY = 0 }) => {
  const gltf = useLoader(GLTFLoader, staticFile('models/human.glb'));
  const key = JSON.stringify(look);
  const rig = useMemo(() => buildRig(gltf.scene, look), [gltf, key]);
  const poseRef = useRef(pose); poseRef.current = pose;
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => { applyPose(rig, pose); rig.root.updateMatrixWorld(true); invalidate(); });
  useFrame(() => { applyPose(rig, poseRef.current); });
  return <group position={position} scale={scale} rotation={[0, rotY, 0]}><primitive object={rig.root} /></group>;
};
