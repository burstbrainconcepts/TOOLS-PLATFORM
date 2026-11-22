import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { staticFile } from 'remotion';

// Outdoor set for setting "park": textured grass, a dirt trail into the distance, and CC0 props (
// fetched by scripts/fetch-nature.py, Poly Haven CC0 scans). Every prop is normalised at load time (scaled to a target height, standing on y = 0).
const pbr = (id: string) => ['diff', 'nor', 'rough'].map((k) => staticFile(`pbr/${id}/${k}.jpg`));

const Prop: React.FC<{ name: string; x: number; z: number; h: number; rot?: number; shadow?: boolean }> = ({ name, x, z, h, rot = 0, shadow = false }) => {
  const gltf = useLoader(GLTFLoader, staticFile(`pbr/models/${name}/${name}_1k.gltf`));
  const obj = useMemo(() => {
    const o = gltf.scene.clone(true);
    o.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(o);
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    o.traverse((m) => {
      const me = m as THREE.Mesh;
      if (!me.isMesh) return;
      me.castShadow = shadow; me.receiveShadow = true; me.frustumCulled = false;
      const fix = (mm: THREE.Material) => { const c2 = (mm as THREE.MeshStandardMaterial).clone(); c2.side = THREE.DoubleSide; c2.transparent = false; c2.alphaTest = 0.5; c2.metalness = 0; return c2; };
      me.material = Array.isArray(me.material) ? me.material.map(fix) : fix(me.material);
    });
    const inner = new THREE.Group(); o.position.set(-c.x, -box.min.y, -c.z); inner.add(o);
    inner.scale.setScalar(h / (size.y || 1));
    return inner;
  }, [gltf, h, shadow]);
  return <group position={[x, 0, z]} rotation={[0, rot, 0]}><primitive object={obj} /></group>;
};

const Ground: React.FC<{ id: string; w: number; d: number; z: number; y?: number; repeat: [number, number]; tint?: string }> = ({ id, w, d, z, y = 0, repeat, tint = '#ffffff' }) => {
  const [diff, nor, rough] = useLoader(THREE.TextureLoader, pbr(id));
  for (const t of [diff, nor, rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.anisotropy = 4; }
  diff.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, z]} receiveShadow>
      <planeGeometry args={[w, d]} /><meshStandardMaterial map={diff} normalMap={nor} roughnessMap={rough} color={tint} />
    </mesh>
  );
};

const TREES: [string, number, number, number][] = [['fir_sapling', -4.6, -7, 6.5], ['pine_sapling_small', 5.0, -8.5, 6], ['fir_sapling', -1.6, -13, 8], ['fir_sapling', 7.0, -14, 8.5], ['pine_sapling_small', -8.0, -12, 7.5], ['fir_sapling', 3.0, -20, 9], ['fir_sapling', -6.0, -22, 9.5], ['pine_sapling_small', 0.5, -28, 9]];
const SMALL: [string, number, number, number, number][] = [
  ['boulder_01', 2.7, -2.0, 0.8, 0.4], ['boulder_01', -3.4, -3.0, 1.1, 2.0], ['boulder_01', -7.0, -6.0, 2.2, 0.8], ['dead_tree_trunk', 4.2, -3.4, 0.7, -0.5],
  ['fern_02', -2.2, -1.5, 0.55, 0.3], ['fern_02', 2.1, -1.3, 0.5, 1.6], ['fern_02', -3.8, -4.4, 0.7, 2.4], ['fern_02', 4.0, -5.2, 0.7, 0.9], ['fern_02', 1.0, -9, 0.8, 0],
  ['nettle_plant', -1.6, -0.8, 0.6, 0.4], ['nettle_plant', 3.0, -0.8, 0.6, 1.9], ['periwinkle_plant', -2.8, -0.5, 0.25, 0], ['periwinkle_plant', 2.5, -0.4, 0.25, 1],
  ['dandelion_01', -1.2, -1.3, 0.3, 0], ['dandelion_01', 1.5, -1.7, 0.3, 1.2], ['dandelion_01', -3.0, -1.9, 0.3, 2.5], ['dandelion_01', 3.5, -1.2, 0.3, 0.7],
];

export const ParkSet: React.FC = () => (
  <group>
    <Ground id="grass_001" w={140} d={90} z={-30} repeat={[46, 30]} tint="#c9d8b0" />
    <Ground id="ground_037" w={3.6} d={60} z={-26} y={0.012} repeat={[2, 26]} tint="#d8c3a5" />
    {TREES.map(([n, x, z, h], i) => <Prop key={`t${i}`} name={n} x={x} z={z} h={h} rot={i * 1.7} />)}
    {SMALL.map(([n, x, z, h, r], i) => <Prop key={`s${i}`} name={n} x={x} z={z} h={h} rot={r} shadow={z > -4} />)}
  </group>
);
