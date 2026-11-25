import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { staticFile } from 'remotion';

// A character exported from Ara 3D Gen (MIT; CC0 MakeHuman body; CMU motion capture) carrying all 259 of its animation clips.
// The clip is chosen by name and sampled at an exact time, so the render is deterministic. Ara characters face +Z, feet at y = 0.
export const AraActor: React.FC<{ model: string; clip: string; t: number; loop?: boolean; position?: [number, number, number]; scale?: number; rotY?: number }> = ({ model, clip, t, loop = true, position = [0, 0, 0], scale = 1, rotY = 0 }) => {
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
    mixer.setTime(Math.max(0, t)); scene.updateMatrixWorld(true); invalidate();
  });
  useEffect(() => () => { mixer.stopAllAction(); }, [mixer]);
  if (!clipObj) throw new Error(`Ara clip "${clip}" not found (see scripts/ara/list-clips.mjs)`);
  return <group position={position} scale={scale * 1.08 * (1.66 / 1.86)} rotation={[0, rotY, 0]}><primitive object={scene} /></group>;
};
