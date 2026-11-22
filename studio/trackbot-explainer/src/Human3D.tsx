import React from 'react';
import * as THREE from 'three';

// A procedural 3D person (about 1.75 m tall, feet at y = 0, facing +z). No downloaded model: every part is a smooth primitive,
// so colours come from the series bible and every pose is driven by numbers (same performance values as the 2D figure).
export type Look3D = { skin: string; hair?: string; hairStyle?: 'puff' | 'short' | 'helmet'; shirt: string; pants?: string; shoe?: string; glasses?: boolean };
export type Pose3D = {
  head?: number;      // tilt, degrees (sideways)
  nod?: number;       // pitch, degrees (positive = chin down)
  look?: number;      // -1..1 head/eye turn
  lean?: number;      // torso sideways lean, degrees
  armR?: number; armL?: number;      // degrees away from the body (0 = hanging)
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

const rad = (d: number) => (d * Math.PI) / 180;
const Mat: React.FC<{ c: string; r?: number; m?: number }> = ({ c, r = 0.62, m = 0 }) => <meshStandardMaterial color={c} roughness={r} metalness={m} />;
const Cap: React.FC<{ r: number; l: number; c: string; pos?: [number, number, number]; scale?: [number, number, number]; rot?: [number, number, number] }> = ({ r, l, c, pos, scale, rot }) => (
  <mesh position={pos} scale={scale} rotation={rot} castShadow receiveShadow><capsuleGeometry args={[r, l, 8, 20]} /><Mat c={c} /></mesh>
);
const Ball: React.FC<{ r: number; c: string; pos?: [number, number, number]; scale?: [number, number, number]; rough?: number }> = ({ r, c, pos, scale, rough }) => (
  <mesh position={pos} scale={scale} castShadow><sphereGeometry args={[r, 28, 20]} /><Mat c={c} r={rough} /></mesh>
);

// tapered limb segment (cylinder) with a rounded joint ball at its top: reads as muscle, not as a sausage
const Seg: React.FC<{ rt: number; rb: number; l: number; c: string; y?: number; rough?: number }> = ({ rt, rb, l, c, y = 0, rough }) => (
  <group position={[0, y, 0]}>
    <mesh position={[0, -l / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[rt, rb, l, 20, 1]} /><Mat c={c} r={rough} /></mesh>
    <Ball r={rt} c={c} rough={rough} />
    <Ball r={rb} c={c} pos={[0, -l, 0]} rough={rough} />
  </group>
);

const Arm: React.FC<{ side: 1 | -1; out: number; elbow: number; reach: number; look: Look3D }> = ({ side, out, elbow, reach, look }) => (
  // shoulder joint: z rotation swings the arm away from the body, x rotation raises it forward
  <group position={[side * 0.215, 1.42, 0]} rotation={[-rad(reach), 0, side * rad(out)]}>
    <Ball r={0.07} c={look.shirt} scale={[1, 1, 0.9]} />
    <Seg rt={0.066} rb={0.052} l={0.27} c={look.shirt} />
    <group position={[0, -0.29, 0]} rotation={[-rad(elbow) * 1.1, 0, side * rad(elbow) * 0.25]}>
      <Seg rt={0.048} rb={0.038} l={0.25} c={look.skin} />
      <Ball r={0.047} c={look.skin} pos={[0, -0.28, 0.006]} scale={[0.9, 1.15, 0.65]} />
    </group>
  </group>
);

const Leg: React.FC<{ side: 1 | -1; swing: number; look: Look3D }> = ({ side, swing, look }) => (
  <group position={[side * 0.095, 0.92, 0]} rotation={[rad(swing), 0, side * rad(1.2)]}>
    <Seg rt={0.1} rb={0.072} l={0.46} c={look.pants ?? '#2A2F45'} />
    <group position={[0, -0.46, 0]} rotation={[-rad(Math.max(0, swing) * 0.4), 0, 0]}>
      <Seg rt={0.072} rb={0.052} l={0.4} c={look.pants ?? '#2A2F45'} />
      <mesh position={[0, -0.43, 0.06]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.78]} castShadow><capsuleGeometry args={[0.058, 0.13, 6, 16]} /><Mat c={look.shoe ?? '#FFFFFF'} r={0.45} /></mesh>
    </group>
  </group>
);

const Face: React.FC<{ look: Look3D; pose: Pose3D }> = ({ look, pose }) => {
  const talk = pose.talk ?? 0, w = pose.mouthW ?? 1, blink = pose.blink ?? 1, brow = pose.brow ?? 0, lk = pose.look ?? 0;
  const happy = pose.emotion === 'happy', worried = pose.emotion === 'worried', surprised = pose.emotion === 'surprised';
  const ink = '#1B1B1F';
  return (
    <group position={[lk * 0.012, 0, 0]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.04, 0.018, 0.094]}>
          <mesh scale={[1, blink, 0.6]}><sphereGeometry args={[0.02, 16, 12]} /><meshStandardMaterial color="#FFFFFF" roughness={0.3} /></mesh>
          <mesh position={[lk * 0.008, 0, 0.011 * blink]} scale={[1, blink, 0.5]}><sphereGeometry args={[0.0105, 12, 10]} /><meshStandardMaterial color={ink} roughness={0.2} /></mesh>
          <mesh position={[s * 0.002, 0.04 + brow * 0.01 + (surprised ? 0.008 : 0), 0.004]} rotation={[0, 0, s * (worried ? -0.28 : 0.05) * -1]}><boxGeometry args={[0.04, 0.0085, 0.008]} /><meshStandardMaterial color={look.hair ?? ink} roughness={0.7} /></mesh>
        </group>
      ))}
      {look.glasses && <group position={[0, 0.018, 0.108]}>{[-1, 1].map((s) => <mesh key={s} position={[s * 0.04, 0, 0]}><torusGeometry args={[0.03, 0.0045, 8, 28]} /><meshStandardMaterial color={ink} roughness={0.4} /></mesh>)}<mesh><boxGeometry args={[0.02, 0.004, 0.004]} /><meshStandardMaterial color={ink} /></mesh></group>}
      <Ball r={0.017} c={look.skin} pos={[0, -0.012, 0.108]} scale={[1, 0.9, 1]} />
      <group position={[0, -0.056, 0.098]}>
        {talk > 0.1 || surprised
          ? <mesh scale={[(0.024 - talk * 0.004) * w, 0.006 + (surprised ? 0.012 : 0) + talk * 0.022, 0.01]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#4A1620" roughness={0.5} /></mesh>
          : <mesh rotation={[0, 0, happy ? Math.PI : 0]} position={[0, happy ? 0.012 : 0, 0]} scale={[1, worried ? -1 : 1, 1]}><torusGeometry args={[0.024, 0.0042, 8, 20, Math.PI]} /><meshStandardMaterial color={ink} roughness={0.5} /></mesh>}
      </group>
    </group>
  );
};

const Hair: React.FC<{ look: Look3D }> = ({ look }) => {
  const c = look.hair ?? '#14100D';
  if (look.hairStyle === 'puff') {
    return <group>{[[-0.07, 0.07, 0, 0.06], [0.07, 0.07, 0, 0.06], [0, 0.11, -0.01, 0.075], [-0.04, 0.1, 0.03, 0.055], [0.04, 0.1, 0.03, 0.055], [0, 0.07, -0.07, 0.07]].map(([x, y, z, r], i) => <Ball key={i} r={r} c={c} pos={[x, y, z]} rough={0.9} />)}</group>;
  }
  if (look.hairStyle === 'helmet') return <mesh position={[0, 0.02, -0.005]} castShadow><sphereGeometry args={[0.118, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} /><Mat c={c} r={0.4} /></mesh>;
  return <mesh position={[0, 0.012, -0.012]} rotation={[-0.22, 0, 0]} castShadow><sphereGeometry args={[0.115, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.5]} /><Mat c={c} r={0.85} /></mesh>;
};

export const Person3D: React.FC<{ look: Look3D; pose?: Pose3D; position?: [number, number, number]; scale?: number; rotY?: number }> = ({ look, pose = {}, position = [0, 0, 0], scale = 1, rotY = 0 }) => {
  const p = { armR: 8, armL: 8, ...pose };
  const sway = (p.step ?? 0) * 0.018;
  return (
    <group position={position} scale={scale} rotation={[0, rotY, 0]}>
      <group position={[sway, 0, 0]}>
        <Leg side={-1} swing={(p.step ?? 0) * 3} look={look} />
        <Leg side={1} swing={-(p.step ?? 0) * 3} look={look} />
        <group position={[0, 0.93, 0]} rotation={[0, 0, rad(p.lean ?? 0)]}>
          <group position={[0, -0.93, 0]}>
            <Ball r={0.15} c={look.pants ?? '#2A2F45'} pos={[0, 0.94, 0]} scale={[1.18, 0.8, 0.78]} />
            <group scale={[1 + (p.breath ?? 0), 1 + (p.breath ?? 0) * 1.4, 1]} position={[0, 0.92, 0]}>
              <mesh position={[0, 0.27, 0]} scale={[1.2, 1, 0.66]} castShadow receiveShadow><cylinderGeometry args={[0.178, 0.14, 0.54, 28, 1]} /><Mat c={look.shirt} r={0.7} /></mesh>
              <Ball r={0.178} c={look.shirt} pos={[0, 0.54, 0]} scale={[1.2, 0.46, 0.66]} rough={0.7} />
              <Ball r={0.14} c={look.shirt} pos={[0, 0.0, 0]} scale={[1.2, 0.5, 0.66]} rough={0.7} />
            </group>
            <Arm side={-1} out={p.armL ?? 8} elbow={p.elbowL ?? 8} reach={0} look={look} />
            <Arm side={1} out={p.armR ?? 8} elbow={p.elbowR ?? 8} reach={p.reachR ?? 0} look={look} />
            <mesh position={[0, 1.55, 0]} castShadow><cylinderGeometry args={[0.05, 0.058, 0.1, 18]} /><Mat c={look.skin} /></mesh>
            <group position={[0, 1.66, 0]} rotation={[rad(p.nod ?? 0), rad((p.look ?? 0) * 22), rad(p.head ?? 0)]} scale={1.2}>
              <Ball r={0.108} c={look.skin} scale={[0.92, 1.12, 1]} rough={0.55} />
              {[-1, 1].map((x) => <Ball key={x} r={0.02} c={look.skin} pos={[x * 0.097, -0.005, -0.005]} scale={[0.6, 1.1, 0.8]} />)}
              <Face look={look} pose={p} />
              <Hair look={look} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

export const _THREE = THREE; // keeps the three import used when tree-shaking in some bundlers
