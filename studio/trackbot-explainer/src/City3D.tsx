import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import * as THREE from 'three';

// Realistic-ish low-poly night/day city: lit window textures, shadows, fog, trees, lamps, cars, detailed scooter, chase camera.
const rand = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const ROUTE: [number, number][] = [[-26, 46], [-26, 14], [4, 14], [4, -18], [34, -18], [34, -52]];
const lens = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
const total = lens.reduce((a, b) => a + b, 0);
const at = (t: number): { x: number; z: number; yaw: number } => {
  let d = Math.min(Math.max(t, 0), 1) * total;
  for (let i = 0; i < lens.length; i++) {
    const dx = ROUTE[i + 1][0] - ROUTE[i][0], dz = ROUTE[i + 1][1] - ROUTE[i][1];
    if (d <= lens[i] || i === lens.length - 1) { const k = Math.min(d / lens[i], 1); return { x: ROUTE[i][0] + dx * k, z: ROUTE[i][1] + dz * k, yaw: Math.atan2(dx, dz) }; }
    d -= lens[i];
  }
  return { x: 0, z: 0, yaw: 0 };
};
const distToRoute = (x: number, z: number) => Math.min(...ROUTE.slice(1).map((p, i) => {
  const [ax, az] = ROUTE[i]; const [bx, bz] = p;
  const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
  return Math.hypot(x - (ax + t * (bx - ax)), z - (az + t * (bz - az)));
}));

const distToOthers = (x: number, z: number, skip: number) => Math.min(...ROUTE.slice(1).map((p, i) => {
  if (i === skip) return 1e9;
  const [ax, az] = ROUTE[i]; const [bx, bz] = p;
  const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
  return Math.hypot(x - (ax + t * (bx - ax)), z - (az + t * (bz - az)));
}));
const windowTexture = (floors: number, seed: number, wall: string) => {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64 * floors;
  const g = c.getContext('2d')!;
  g.fillStyle = wall; g.fillRect(0, 0, c.width, c.height);
  for (let r = 0; r < floors * 2; r++) for (let col = 0; col < 4; col++) {
    const lit = rand(seed * 91 + r * 7 + col * 13) > 0.45;
    g.fillStyle = lit ? '#FFE08A' : '#2C3A52';
    g.fillRect(10 + col * 30, 8 + r * 32, 20, 20);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
};
const emissiveTexture = (floors: number, seed: number) => {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64 * floors;
  const g = c.getContext('2d')!; g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  for (let r = 0; r < floors * 2; r++) for (let col = 0; col < 4; col++) {
    if (rand(seed * 91 + r * 7 + col * 13) > 0.45) { g.fillStyle = '#FFD470'; g.fillRect(10 + col * 30, 8 + r * 32, 20, 20); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

type B = { x: number; z: number; h: number; w: number; d: number; cls: number; c: string };
const Scooter: React.FC<{ spin: number }> = ({ spin }) => (
  <group>
    {[-0.75, 0.8].map((z, i) => (
      <group key={i} position={[0, 0.34, z]} rotation={[spin, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.34, 0.34, 0.16, 24]} /><meshStandardMaterial color="#1b1b1f" roughness={0.9} /></mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.18, 0.18, 0.18, 16]} /><meshStandardMaterial color="#d9d2c2" metalness={0.5} roughness={0.4} /></mesh>
        <mesh><boxGeometry args={[0.2, 0.06, 0.5]} /><meshStandardMaterial color="#888" /></mesh>
      </group>
    ))}
    <mesh position={[0, 0.62, -0.1]} castShadow><boxGeometry args={[0.5, 0.34, 1.5]} /><meshStandardMaterial color="#2b6cff" metalness={0.3} roughness={0.35} /></mesh>
    <mesh position={[0, 0.9, -0.5]} castShadow><boxGeometry args={[0.42, 0.14, 0.7]} /><meshStandardMaterial color="#1b1b1f" roughness={0.8} /></mesh>
    <mesh position={[0, 0.95, 0.72]} rotation={[0.25, 0, 0]} castShadow><boxGeometry args={[0.16, 0.8, 0.12]} /><meshStandardMaterial color="#2b6cff" metalness={0.3} roughness={0.35} /></mesh>
    <mesh position={[0, 1.38, 0.78]}><boxGeometry args={[0.8, 0.07, 0.07]} /><meshStandardMaterial color="#1b1b1f" /></mesh>
    <mesh position={[0, 0.9, 0.98]}><sphereGeometry args={[0.1, 12, 12]} /><meshStandardMaterial color="#fff6c8" emissive="#fff3b0" emissiveIntensity={2.2} /></mesh>
    <mesh position={[0, 0.7, -0.95]}><boxGeometry args={[0.14, 0.06, 0.04]} /><meshStandardMaterial color="#ff2a2a" emissive="#ff2a2a" emissiveIntensity={2} /></mesh>
    {/* delivery box */}
    <group position={[0, 1.35, -0.9]} scale={0.7}>
      <mesh castShadow><boxGeometry args={[0.9, 0.85, 0.9]} /><meshStandardMaterial color="#ff5a36" roughness={0.5} /></mesh>
      <mesh position={[0, 0.1, 0.46]}><boxGeometry args={[0.5, 0.3, 0.02]} /><meshStandardMaterial color="#fff" /></mesh>
    </group>
    {/* rider */}
    <mesh position={[0, 1.38, -0.12]} rotation={[0.35, 0, 0]} castShadow><capsuleGeometry args={[0.24, 0.55, 6, 12]} /><meshStandardMaterial color="#ff5a36" roughness={0.6} /></mesh>
    <mesh position={[0.22, 1.35, 0.4]} rotation={[1.1, 0, 0.1]}><capsuleGeometry args={[0.09, 0.55, 4, 8]} /><meshStandardMaterial color="#ff5a36" /></mesh>
    <mesh position={[-0.22, 1.35, 0.4]} rotation={[1.1, 0, -0.1]}><capsuleGeometry args={[0.09, 0.55, 4, 8]} /><meshStandardMaterial color="#ff5a36" /></mesh>
    <mesh position={[0.2, 0.95, 0.08]} rotation={[0.2, 0, 0]}><capsuleGeometry args={[0.1, 0.5, 4, 8]} /><meshStandardMaterial color="#1b1b1f" /></mesh>
    <mesh position={[-0.2, 0.95, 0.08]} rotation={[0.2, 0, 0]}><capsuleGeometry args={[0.1, 0.5, 4, 8]} /><meshStandardMaterial color="#1b1b1f" /></mesh>
    <mesh position={[0, 1.95, 0.06]} castShadow><sphereGeometry args={[0.26, 20, 20]} /><meshStandardMaterial color="#6b4226" roughness={0.7} /></mesh>
    <mesh position={[0, 2.02, 0.04]} castShadow><sphereGeometry args={[0.31, 20, 14, 0, Math.PI * 2, 0, Math.PI / 1.9]} /><meshStandardMaterial color="#ff5a36" roughness={0.3} metalness={0.2} /></mesh>
    <mesh position={[0, 1.93, 0.28]}><boxGeometry args={[0.46, 0.12, 0.1]} /><meshStandardMaterial color="#111" roughness={0.2} metalness={0.4} /></mesh>
  </group>
);

export const City3D: React.FC<{ width: number; height: number; progress?: [number, number]; dusk?: boolean }> = ({ width, height, progress = [0.02, 0.98], dusk = false }) => {
  const Q = 0.67; // render scale: fewer pixels for the CPU renderer
  const rw = Math.round(width * Q), rh = Math.round(height * Q);
  const frame = useCurrentFrame();
  const tex = useMemo(() => [1, 2, 3].map((fl, i) => ({ map: windowTexture(fl * 2, i + 3, dusk ? '#8A6A66' : '#B8C4D4'), em: emissiveTexture(fl * 2, i + 3) })), [dusk]);
  const buildings = useMemo(() => {
    const out: B[] = [];
    const cols = dusk ? ['#8A6A66', '#9C7468', '#6F5A66', '#A78B7F'] : ['#B8C4D4', '#CBBFA9', '#A9B8C9', '#D6CDBB'];
    ROUTE.slice(1).forEach((p, i) => {
      const [ax, az] = ROUTE[i]; const dx = p[0] - ax, dz = p[1] - az; const L = lens[i]; const nx = -dz / L, nz = dx / L;
      for (let s = 0; s < L; s += 9) for (const side of [-1, 1]) {
        const r = rand(i * 131 + s * 3 + side * 17);
        const off = 12 + r * 2;
        const h = 6 + r * 14; const cls = h < 9 ? 0 : h < 14 ? 1 : 2;
        const bx = ax + (dx / L) * s + nx * off * side, bz = az + (dz / L) * s + nz * off * side;
        if (distToRoute(bx, bz) < 10.5) continue;
        out.push({ x: bx, z: bz, h, w: 6 + r * 2, d: 6 + rand(s + i) * 2, cls, c: cols[Math.floor(r * 4) % 4] });
      }
    });
    for (let gx = -60; gx <= 70; gx += 14) for (let gz = -90; gz <= 80; gz += 14) {
      if (distToRoute(gx, gz) < 22) continue;
      const r = rand(gx * 13 + gz * 7);
      const h = 10 + r * 34;
      out.push({ x: gx + r * 3, z: gz + rand(gx) * 3, h, w: 8 + r * 3, d: 8 + rand(gz) * 3, cls: 2, c: cols[Math.floor(r * 4) % 4] });
    }
    return out;
  }, [dusk]);
  const props = useMemo(() => {
    const trees: [number, number][] = []; const lamps: [number, number, number][] = []; const cars: { x: number; z: number; yaw: number; c: string }[] = [];
    ROUTE.slice(1).forEach((p, i) => {
      const [ax, az] = ROUTE[i]; const dx = p[0] - ax, dz = p[1] - az; const L = lens[i]; const nx = -dz / L, nz = dx / L; const yaw = Math.atan2(dx, dz);
      for (let s = 3; s < L; s += 8) for (const side of [-1, 1]) {
        const px = ax + (dx / L) * s + nx * 5.3 * side, pz = az + (dz / L) * s + nz * 5.3 * side;
        if (distToOthers(px, pz, i) < 7) continue;
        if (Math.floor(s / 8) % 2) trees.push([px, pz]); else lamps.push([px, pz, side]);
        if (rand(i * 7 + s + side) > 0.72 && distToOthers(ax + (dx / L) * s, az + (dz / L) * s, i) > 9) cars.push({ x: ax + (dx / L) * s + nx * 2.6 * side, z: az + (dz / L) * s + nz * 2.6 * side, yaw, c: ['#e0e0e0', '#c0392b', '#2b6cff', '#f5b820'][Math.floor(rand(s + side) * 4)] });
      }
    });
    return { trees, lamps, cars };
  }, []);

  const t = interpolate(frame, [0, 170], progress, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const me = at(t); const ahead = { x: me.x + Math.sin(me.yaw) * 1.2, z: me.z + Math.cos(me.yaw) * 1.2 };
  const dirx = Math.sin(me.yaw), dirz = Math.cos(me.yaw);
  const back = at(Math.max(0, t - 0.055));
  const sway = Math.sin(frame / 55) * 1.0;
  const camX = back.x + Math.cos(back.yaw) * sway, camZ = back.z - Math.sin(back.yaw) * sway;
  const sky = dusk ? '#f2a07a' : '#bcd9f5';
  const endX = ROUTE[ROUTE.length - 1][0], endZ = ROUTE[ROUTE.length - 1][1];
  const pulse = (frame % 50) / 50;

  return (
    <div style={{ width, height, overflow: 'hidden' }}><div style={{ width: rw, height: rh, transform: `scale(${1 / Q})`, transformOrigin: '0 0' }}>
    <ThreeCanvas width={rw} height={rh} shadows camera={{ position: [camX, 7.4, camZ], fov: 56, near: 0.1, far: 220 }}
      onCreated={({ camera }) => camera.lookAt(ahead.x, 1.0, ahead.z)}>
      <CameraRig cx={camX} cz={camZ} tx={ahead.x} tz={ahead.z} />
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 38, 120]} />
      <hemisphereLight args={[dusk ? '#ffd7b0' : '#dff0ff', '#7a6a60', dusk ? 0.8 : 1.0]} />
      <directionalLight position={[me.x + 24, 30, me.z + 14]} intensity={dusk ? 1.6 : 2.2} color={dusk ? '#ffb27a' : '#fff4dc'} castShadow shadow-mapSize={[768, 768]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} shadow-camera-near={1} shadow-camera-far={120} />
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow><planeGeometry args={[400, 400]} /><meshStandardMaterial color={dusk ? '#6b5a58' : '#a9b3a0'} roughness={1} /></mesh>
      {/* roads, sidewalks, markings, route glow */}
      {ROUTE.slice(1).map((p, i) => {
        const [ax, az] = ROUTE[i]; const L = lens[i]; const yaw = Math.atan2(p[0] - ax, p[1] - az); const mx = (ax + p[0]) / 2, mz = (az + p[1]) / 2;
        return (
          <group key={i} position={[mx, 0, mz]} rotation={[0, yaw, 0]}>
            <mesh position={[0, 0.02, 0]} receiveShadow><boxGeometry args={[7, 0.06, L + 7]} /><meshStandardMaterial color="#35363d" roughness={0.85} /></mesh>
            {[-4.6, 4.6].map((x) => <mesh key={x} position={[x, 0.12, 0]} receiveShadow castShadow><boxGeometry args={[2.2, 0.24, L + 7]} /><meshStandardMaterial color="#cfc8b8" roughness={0.9} /></mesh>)}
            {Array.from({ length: Math.floor(L / 4) }, (_, k) => <mesh key={k} position={[0, 0.06, -L / 2 + k * 4 + 2]}><boxGeometry args={[0.18, 0.02, 1.8]} /><meshStandardMaterial color="#f4f1e8" /></mesh>)}
            <mesh position={[0, 0.075, 0]}><boxGeometry args={[1.3, 0.01, L + 7]} /><meshStandardMaterial color="#2b6cff" emissive="#2b6cff" emissiveIntensity={0.9} transparent opacity={0.55} /></mesh>
          </group>
        );
      })}
      {/* buildings */}
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.c} map={tex[b.cls].map} emissiveMap={tex[b.cls].em} emissive="#ffd070" emissiveIntensity={dusk ? 1.3 : 0.35} roughness={0.8} />
        </mesh>
      ))}
      {/* trees */}
      {props.trees.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.9, 0]} castShadow><cylinderGeometry args={[0.14, 0.2, 1.8, 8]} /><meshStandardMaterial color="#5a3d28" /></mesh>
          <mesh position={[0, 2.5, 0]} castShadow><sphereGeometry args={[1.2, 14, 12]} /><meshStandardMaterial color={['#2f8f4e', '#3aa35b', '#277a42'][i % 3]} roughness={0.9} /></mesh>
        </group>
      ))}
      {/* street lamps */}
      {props.lamps.map(([x, z, side], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2.4, 0]} castShadow><cylinderGeometry args={[0.07, 0.09, 4.8, 8]} /><meshStandardMaterial color="#2a2a2f" /></mesh>
          <mesh position={[-side * 0.5, 4.8, 0]}><sphereGeometry args={[0.28, 12, 12]} /><meshStandardMaterial color="#fff3c4" emissive="#ffe08a" emissiveIntensity={dusk ? 3 : 1.2} /></mesh>
        </group>
      ))}
      {/* parked cars */}
      {props.cars.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]} rotation={[0, c.yaw, 0]}>
          <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.5, 0.6, 3.2]} /><meshStandardMaterial color={c.c} metalness={0.4} roughness={0.35} /></mesh>
          <mesh position={[0, 1.0, -0.2]} castShadow><boxGeometry args={[1.3, 0.5, 1.7]} /><meshStandardMaterial color="#5a6a80" metalness={0.5} roughness={0.25} /></mesh>
        </group>
      ))}
      {/* destination house + pulsing marker */}
      <group position={[endX, 0, endZ - 5]}>
        <mesh position={[0, 1.8, 0]} castShadow receiveShadow><boxGeometry args={[7, 3.6, 6]} /><meshStandardMaterial color="#f6efe4" /></mesh>
        <mesh position={[0, 4.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[6, 2.4, 4]} /><meshStandardMaterial color="#ff5a36" /></mesh>
        <mesh position={[0, 1.1, 3.02]}><boxGeometry args={[1.2, 2.2, 0.08]} /><meshStandardMaterial color="#5a3d28" /></mesh>
      </group>
      <mesh position={[endX, 0.3, endZ + 1]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.5 + pulse * 3, 1.9 + pulse * 3, 40]} /><meshBasicMaterial color="#ff5a36" transparent opacity={1 - pulse} /></mesh>
      <mesh position={[endX, 7.5, endZ - 5]}><coneGeometry args={[0.9, 2.2, 16]} /><meshStandardMaterial color="#ff5a36" emissive="#ff5a36" emissiveIntensity={1.2} /></mesh>
      {/* the rider */}
      <group position={[me.x, 0, me.z]} rotation={[0, me.yaw, 0]}><Scooter spin={frame * 0.9} /></group>
      <mesh position={[me.x - dirx * 0.2, 0.01, me.z - dirz * 0.2]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.6 + pulse, 1.8 + pulse, 32]} /><meshBasicMaterial color="#2b6cff" transparent opacity={0.7 * (1 - pulse)} /></mesh>
    </ThreeCanvas>
    </div></div>
  );
};

import { useThree } from '@react-three/fiber';
const CameraRig: React.FC<{ cx: number; cz: number; tx: number; tz: number }> = ({ cx, cz, tx, tz }) => {
  const { camera } = useThree();
  camera.position.set(cx, 7.4, cz);
  camera.lookAt(tx, 1.0, tz);
  return null;
};
