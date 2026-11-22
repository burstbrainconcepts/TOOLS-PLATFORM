import React from 'react';
import * as THREE from 'three';

// Procedural classroom set designed for CPU-friendly rendering.
// All geometry is native Three.js; no external model downloads are required.
const wood = new THREE.MeshStandardMaterial({ color: '#98613b', roughness: 0.68 });
const woodLight = new THREE.MeshStandardMaterial({ color: '#c58b55', roughness: 0.62 });
const darkWood = new THREE.MeshStandardMaterial({ color: '#493126', roughness: 0.82 });
const metal = new THREE.MeshStandardMaterial({ color: '#343c49', metalness: 0.62, roughness: 0.38 });
const boardMat = new THREE.MeshStandardMaterial({ color: '#174b59', roughness: 0.88 });
const wall = new THREE.MeshStandardMaterial({ color: '#d8c6ae', roughness: 0.95 });
const trim = new THREE.MeshStandardMaterial({ color: '#72503b', roughness: 0.82 });
const paper = new THREE.MeshStandardMaterial({ color: '#f0e7d6', roughness: 0.9 });
const bookMats = ['#bd6544', '#3d6d82', '#78915b', '#d6a34e'].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));

const Box: React.FC<{ position: [number, number, number]; size: [number, number, number]; material: THREE.Material; radius?: number }> = ({ position, size, material }) => (
  <mesh position={position} castShadow receiveShadow material={material}>
    <boxGeometry args={size} />
  </mesh>
);

const Desk: React.FC<{ x: number; z: number; scale?: number }> = ({ x, z, scale = 1 }) => (
  <group position={[x, 0, z]} scale={scale}>
    <Box position={[0, 0.83, 0]} size={[1.05, 0.12, 0.82]} material={woodLight} />
    <Box position={[0, 0.75, 0]} size={[0.98, 0.035, 0.72]} material={wood} />
    {[-0.43, 0.43].map((dx) => [-0.29, 0.29].map((dz) => (
      <Box key={`${dx}-${dz}`} position={[dx, 0.39, dz]} size={[0.075, 0.78, 0.075]} material={metal} />
    )))}
    <Box position={[0, 0.43, -0.32]} size={[0.9, 0.08, 0.06]} material={metal} />
    <Box position={[0, 0.98, -0.08]} size={[0.54, 0.055, 0.36]} material={bookMats[1]} />
    <Box position={[0.03, 1.02, -0.08]} size={[0.48, 0.018, 0.32]} material={paper} />
  </group>
);

const Chair: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, 0, z]}>
    <Box position={[0, 0.48, 0]} size={[0.58, 0.09, 0.54]} material={wood} />
    <Box position={[0, 0.91, -0.23]} size={[0.58, 0.83, 0.09]} material={woodLight} />
    {[-0.22, 0.22].map((dx) => [-0.18, 0.18].map((dz) => <Box key={`${dx}-${dz}`} position={[dx, 0.24, dz]} size={[0.055, 0.48, 0.055]} material={metal} />))}
  </group>
);

const Bookshelf: React.FC = () => (
  <group position={[-2.55, 0, -4.6]}>
    <Box position={[0, 1.55, 0]} size={[1.45, 3.1, 0.38]} material={darkWood} />
    {[0.35, 1.15, 1.95, 2.72].map((y) => <Box key={y} position={[0, y, 0.23]} size={[1.42, 0.075, 0.52]} material={woodLight} />)}
    {Array.from({ length: 4 }, (_, row) => Array.from({ length: 5 }, (_, i) => (
      <Box key={`${row}-${i}`} position={[-0.52 + i * 0.25, 0.58 + row * 0.78, 0.18]} size={[0.17, 0.48 + (i % 2) * 0.12, 0.24]} material={bookMats[(i + row) % bookMats.length]} />
    )))}
  </group>
);

const Window: React.FC<{ x: number }> = ({ x }) => (
  <group position={[x, 2.75, -5.75]}>
    <Box position={[0, 0, 0]} size={[1.9, 1.85, 0.12]} material={trim} />
    <Box position={[0, 0, 0.075]} size={[1.72, 1.67, 0.035]} material={new THREE.MeshStandardMaterial({ color: '#a9d4e8', roughness: 0.22, metalness: 0.08, emissive: '#28485a', emissiveIntensity: 0.12 })} />
    <Box position={[0, 0, 0.11]} size={[0.055, 1.7, 0.04]} material={paper} />
    <Box position={[0, 0, 0.11]} size={[1.72, 0.055, 0.04]} material={paper} />
  </group>
);

export const ClassroomSet: React.FC = () => (
  <group>
    {/* Warm classroom walls, floor and skirting */}
    <Box position={[0, 2.55, -6.1]} size={[13.5, 5.1, 0.28]} material={wall} />
    <Box position={[0, -0.13, -2.7]} size={[24, 0.26, 24]} material={new THREE.MeshStandardMaterial({ color: '#8b725e', roughness: 0.86 })} />
    <Box position={[0, 0.34, -5.91]} size={[13.5, 0.34, 0.12]} material={trim} />
    <Window x={2.1} />
    <Bookshelf />
    {/* Framed teaching board */}
    <group position={[-0.1, 2.65, -5.83]} scale={[0.82, 1, 1]}>
      <Box position={[0, 0, 0]} size={[4.8, 2.55, 0.2]} material={trim} />
      <Box position={[0, 0, 0.12]} size={[4.52, 2.28, 0.055]} material={boardMat} />
      <Box position={[0, -1.34, 0.24]} size={[1.45, 0.09, 0.28]} material={metal} />
      <Box position={[-0.62, -1.25, 0.3]} size={[0.12, 0.07, 0.08]} material={bookMats[0]} />
      <Box position={[0.05, -1.25, 0.3]} size={[0.12, 0.07, 0.08]} material={paper} />
      {/* Chalk-like lesson lines */}
      {[0.58, 0.18, -0.22].map((y, i) => <Box key={y} position={[-0.45 + i * 0.12, y, 0.17]} size={[1.55 - i * 0.18, 0.035, 0.018]} material={paper} />)}
      <Box position={[1.25, 0.5, 0.18]} size={[0.42, 0.52, 0.025]} material={bookMats[2]} />
      <Box position={[1.25, 0.79, 0.18]} size={[0.42, 0.035, 0.025]} material={paper} />
    </group>
    {/* Foreground desks and chairs */}
    <Desk x={-0.47} z={0.78} scale={0.85} />
    <Desk x={0.39} z={0.78} scale={0.68} />
    <Desk x={1.24} z={0.78} scale={0.68} />
    <Chair x={-0.47} z={-0.35} />
    <Chair x={0.39} z={-0.35} />
    <Chair x={1.24} z={-0.35} />
    {/* Warm pendant lights */}
    {[ -2.6, 1.4 ].map((x) => (
      <group key={x} position={[x, 4.75, -2.8]}>
        <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.018, 0.018, 0.55, 8]} /><meshStandardMaterial color="#554638" /></mesh>
        <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.42, 0.2, 0.22, 24, 1, true]} /><meshStandardMaterial color="#d6b779" side={THREE.DoubleSide} emissive="#6b4c1d" emissiveIntensity={0.12} /></mesh>
        <pointLight position={[0, -0.1, 0]} intensity={1.1} distance={5} color="#ffd29a" />
      </group>
    ))}
  </group>
);
