import React from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { staticFile } from 'remotion';
import { Ground } from './Park3D';

// Photographic 3D settings: a real 360-degree location photo (Poly Haven CC0 HDRI) as a softly blurred backdrop that also lights the
// scene, plus a textured floor (ambientCG CC0) and a light haze. Pick one per scene with `"setting": "<name>"`.
export type Photo = {
  label: string; hdri: string; blur: number; intensity: number; rot: number;      // backdrop: file, blur 0..1, brightness, rotation (rad)
  floor: string; repeat: number; tint: string; fog: [string, number, number] | null; exposure?: number;
};
export const PHOTO: Record<string, Photo> = {
  urban:   { label: 'City street and skyline', hdri: 'canary_wharf_1k', blur: 0.10, intensity: 0.8, rot: 0.0, floor: 'paving_153', repeat: 60, tint: '#bdbdbd', fog: ['#aab4be', 28, 90] },
  plaza:   { label: 'European plaza', hdri: 'piazza_bologni_1k', blur: 0.10, intensity: 0.8, rot: 0.0, floor: 'paving_153', repeat: 60, tint: '#c8c0b4', fog: ['#c9ced6', 30, 90] },
  alley:   { label: 'Old-town alley', hdri: 'braustuble_alley_1k', blur: 0.10, intensity: 0.8, rot: 0.0, floor: 'paving_153', repeat: 60, tint: '#a9a39a', fog: ['#c3c6c9', 30, 90] },
  market:  { label: 'Covered market', hdri: 'leadenhall_market_1k', blur: 0.12, intensity: 0.8, rot: 0.0, floor: 'paving_153', repeat: 70, tint: '#b0a89c', fog: null },
  cafe:    { label: 'Cafe interior', hdri: 'comfy_cafe_1k', blur: 0.16, intensity: 0.7, rot: 0.0, floor: 'wood_floor_051', repeat: 40, tint: '#d8c4a8', fog: null },
  shop:    { label: 'Shop interior', hdri: 'decor_shop_1k', blur: 0.16, intensity: 0.7, rot: 0.0, floor: 'wood_floor_051', repeat: 40, tint: '#cdb9a0', fog: null },
  office:  { label: 'Modern lobby / office', hdri: 'cinema_lobby_1k', blur: 0.14, intensity: 0.7, rot: 0.0, floor: 'tiles_141', repeat: 50, tint: '#d4d4d4', fog: null },
  hall:    { label: 'Grand hall', hdri: 'entrance_hall_1k', blur: 0.14, intensity: 0.6, rot: 0.0, floor: 'wood_floor_051', repeat: 50, tint: '#c8a888', fog: null },
  gym:     { label: 'Gym', hdri: 'crossfit_gym_1k', blur: 0.14, intensity: 0.6, rot: 0.0, floor: 'rubber_004', repeat: 50, tint: '#9a9a9a', fog: null },
  field:   { label: 'Open sports field', hdri: 'belfast_open_field_1k', blur: 0.06, intensity: 0.55, rot: 0.0, floor: 'grass_001', repeat: 50, tint: '#c5e0a0', fog: ['#cfd9e3', 40, 120] },
  farm:    { label: 'Farmland', hdri: 'belfast_farmhouse_1k', blur: 0.06, intensity: 0.6, rot: 0.0, floor: 'grass_001', repeat: 50, tint: '#cfd8a8', fog: ['#c8d6e3', 40, 120] },
  orchard: { label: 'Orchard track', hdri: 'citrus_orchard_road_1k', blur: 0.06, intensity: 0.55, rot: 0.0, floor: 'gravel_043', repeat: 50, tint: '#d2b48c', fog: ['#d4dde6', 40, 120] },
  stadium: { label: 'Football stadium (procedural crowd)', hdri: 'belfast_open_field_1k', blur: 0, intensity: 0.5, rot: 0.0, floor: 'pitch', repeat: 18.75, tint: '#ffffff', fog: null },
  woods:   { label: 'Woodland', hdri: 'epping_forest_01_1k', blur: 0.08, intensity: 0.6, rot: 0.0, floor: 'ground_037', repeat: 50, tint: '#b8a58a', fog: ['#b9c4a8', 22, 80] },
};

export const PhotoFloor: React.FC<{ p: Photo; shift?: number }> = ({ p, shift = 0 }) => (
  <Ground id={p.floor} w={300} d={300} z={-60} repeat={[p.repeat * 4, p.repeat * 4]} tint={p.tint} scroll={[shift / (300 / (p.repeat * 4)), 0]} />
);

// The backdrop is a pre-rendered, slightly blurred crop of the location photo (scripts/make-backdrops.py) on a plane behind the set,
// sized to fill the 3D camera's view exactly (vertical field of view 34 degrees, 9:16, horizon in the middle).
const CAM_Z = 1920 / 309 / (2 * Math.tan((15 * Math.PI) / 180)), CAM_Y = (1386 - 960) / 309;
export const PhotoBackdrop: React.FC<{ name: string }> = ({ name }) => {
  const tex = useLoader(THREE.TextureLoader, staticFile(`pbr/backdrops/${name}.jpg`));
  tex.colorSpace = THREE.SRGBColorSpace;
  const dist = CAM_Z + 55, h = 2 * dist * Math.tan((17 * Math.PI) / 180);
  return (
    <mesh position={[0, CAM_Y, -55]}>
      <planeGeometry args={[(h * 9) / 16, h]} /><meshBasicMaterial map={tex} toneMapped={false} fog={false} />
    </mesh>
  );
};
