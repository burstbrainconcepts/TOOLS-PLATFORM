import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

// A small low-poly city. Deterministic (seeded) so every render is identical.
const rand = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
const ROUTE: [number, number][] = [[-6, 6], [-6, 2], [-1, 2], [-1, -2], [4, -2], [4, -6]];
const lens = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
const total = lens.reduce((a, b) => a + b, 0);
const at = (t: number): [number, number, number] => {
  let d = Math.min(Math.max(t, 0), 1) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) { const k = d / lens[i]; return [ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * k, ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * k, Math.atan2(ROUTE[i + 1][0] - ROUTE[i][0], ROUTE[i + 1][1] - ROUTE[i][1])]; }
    d -= lens[i];
  }
  return [ROUTE[ROUTE.length - 1][0], ROUTE[ROUTE.length - 1][1], 0];
};
const onRoad = (x: number, z: number) => ROUTE.slice(1).some((p, i) => {
  const [ax, az] = ROUTE[i]; const [bx, bz] = p;
  const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
  return Math.hypot(x - (ax + t * (bx - ax)), z - (az + t * (bz - az))) < 2.4;
});

export const City3D: React.FC<{ width: number; height: number; progress?: [number, number] }> = ({ width, height, progress = [0.05, 0.98] }) => {
  const frame = useCurrentFrame();
  const blocks = useMemo(() => {
    const out: { x: number; z: number; h: number; w: number; c: string }[] = [];
    const cols = ['#D9D2C2', '#E8E0CE', '#C9C1AE', '#F1EBDD'];
    for (let gx = -8; gx <= 8; gx += 2) for (let gz = -8; gz <= 8; gz += 2) {
      if (onRoad(gx, gz)) continue;
      const r = rand(gx * 31 + gz * 17 + 3);
      out.push({ x: gx, z: gz, h: 0.35 + r * 1.1, w: 1.2 + rand(gx + gz * 7) * 0.5, c: cols[Math.floor(r * 4) % 4] });
    }
    return out;
  }, []);
  const t = interpolate(frame, [0, 240], progress, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const [px, pz] = at(t);
  const cam = interpolate(frame, [0, 240], [-0.6, 0.6]);
  return (
    <ThreeCanvas width={width} height={height} camera={{ position: [Math.sin(cam) * 10, 17, 12 + Math.cos(cam) * 2], fov: 40, near: 0.1, far: 100 }} style={{ background: 'transparent' }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}>
      <ambientLight intensity={1.15} />
      <directionalLight position={[8, 14, 6]} intensity={1.4} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#FFFFFF" /></mesh>
      {ROUTE.slice(1).map((p, i) => {
        const [ax, az] = ROUTE[i]; const len = lens[i];
        return (
          <mesh key={i} position={[(ax + p[0]) / 2, 0.01, (az + p[1]) / 2]} rotation={[-Math.PI / 2, 0, -Math.atan2(p[0] - ax, p[1] - az)]}>
            <planeGeometry args={[1.5, len + 1.5]} /><meshStandardMaterial color="#2B6CFF" />
          </mesh>
        );
      })}
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}><boxGeometry args={[b.w, b.h, b.w]} /><meshStandardMaterial color={b.c} /></mesh>
      ))}
      {/* destination building highlighted in red (as TRACKBOT does) */}
      <mesh position={[4, 1.1, -6]}><boxGeometry args={[1.5, 2.2, 1.5]} /><meshStandardMaterial color="#FF5A36" /></mesh>
      {/* delivery bike: body + rider block, heading along the route */}
      <group position={[px, 0.5, pz]} scale={1.5}>
        <mesh><boxGeometry args={[0.7, 0.5, 1.2]} /><meshStandardMaterial color="#1B1B1F" /></mesh>
        <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.8, 0.6, 0.8]} /><meshStandardMaterial color="#FF5A36" /></mesh>
        <mesh position={[0, 1.2, 0]}><sphereGeometry args={[0.22, 16, 16]} /><meshStandardMaterial color="#2B6CFF" /></mesh>
      </group>
    </ThreeCanvas>
  );
};
