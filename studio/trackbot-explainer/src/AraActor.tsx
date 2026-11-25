import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { staticFile } from 'remotion';

// A character exported from Ara 3D Gen (MIT; CC0 MakeHuman body; CMU motion capture) carrying all 259 of its animation clips.
// The clip is chosen by name and sampled at an exact time, so the render is deterministic. Ara characters face +Z, feet at y = 0.
export type AraFace = { open: number; purse: number; smile: number; upper: number; press?: number; blink?: number };
export const AraActor: React.FC<{ face?: AraFace; model: string; clip: string; t: number; loop?: boolean; position?: [number, number, number]; scale?: number; rotY?: number }> = ({ face, model, clip, t, loop = true, position = [0, 0, 0], scale = 1, rotY = 0 }) => {
  const gltf = useLoader(GLTFLoader, staticFile(`models/ara/${model}.glb`));
  const scene = useMemo(() => { const s = SkeletonUtils.clone(gltf.scene) as THREE.Group; s.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } }); return s; }, [gltf]);
  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  const clipObj = useMemo(() => {
    const k = clip.toLowerCase().replace(/[^a-z0-9]/g, '');
    return gltf.animations.find((a) => a.name.toLowerCase().replace(/[^a-z0-9]/g, '') === k) ?? gltf.animations.find((a) => a.name.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(k));
  }, [gltf, clip]);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    if (!clipObj) return;
    mixer.stopAllAction(); const a = mixer.clipAction(clipObj); a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = true; a.play();
    const needsProp = /pick|carry|put down|drop|throw|ball/i.test(clip);   // Ara bakes a parcel (and other props) into the character: show it only for clips that use it
    scene.traverse((o) => { if (/^(Parcel|WeaponR|Phone|Ball)/i.test(o.name)) o.visible = needsProp; const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m && /^Parcel/i.test(m.name)) o.visible = needsProp; });
    mixer.setTime(Math.max(0, t));
    if (face) scene.traverse((o) => {                       // face: the mouth shapes from the Rhubarb cues, blinking and the emotion smile, written to the ARKit-named morph targets
      const m = o as THREE.Mesh; const d = m.morphTargetDictionary, inf = m.morphTargetInfluences; if (!d || !inf) return;
      const set = (n: string, v: number) => { if (d[n] !== undefined) inf[d[n]] = Math.max(0, Math.min(1, v)); };
      set('jawOpen', face.open * 0.85); set('mouthPucker', face.purse * 0.8); set('mouthSmile', face.smile); set('mouthUpperUp', face.upper * 0.7); set('mouthPress', face.press ?? 0);
      set('eyeBlinkLeft', face.blink ?? 0); set('eyeBlinkRight', face.blink ?? 0);
    });
    scene.updateMatrixWorld(true); invalidate();
  });
  useEffect(() => () => { mixer.stopAllAction(); }, [mixer]);
  if (!clipObj) throw new Error(`Ara clip "${clip}" not found (see scripts/ara/list-clips.mjs)`);
  return <group position={position} scale={scale * 1.08 * 0.976} rotation={[0, rotY, 0]}><primitive object={scene} /></group>;
};
