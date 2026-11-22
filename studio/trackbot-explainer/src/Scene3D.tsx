import React, { Suspense, useEffect, useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { continueRender, delayRender, staticFile } from 'remotion';
import { useLoader, useThree } from '@react-three/fiber';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import * as THREE from 'three';
import { Person3D } from './Human3D';
import { CAST_LAYOUT, perform, type Ctx, type TplScene } from './Templates';

// 3D stage for episodes with ctx.style === '3d'. The SVG templates still draw titles, cards and captions on top; only the
// set and the people are 3D. Camera: telephoto-ish (fov 30) at 11.6 m, level, 1.38 m high, so that the screen position of a
// person matches the 2D layout (feet on the floor at the same screen y, 309 px per metre at scale 1.55).
const PPM = 309, CAM_Z = 1920 / PPM / (2 * Math.tan((15 * Math.PI) / 180)), CAM_Y = (1386 - 960) / PPM;
const screenToWorldX = (lx: number) => (-84 + 1.2 * lx - 540) / PPM;

const Loading: React.FC = () => { useEffect(() => { const h = delayRender('loading 3D stage'); return () => continueRender(h); }, []); return null; };

export type Mood = { top: string; bottom: string; bokeh: [string, string]; floor: string };
export const moodFor = (ctx: Ctx, setting?: string): Mood => {
  const P = ctx.palette, c = (x: string) => new THREE.Color(x);
  if (setting === 'street') return { top: '#4d8fd6', bottom: '#b9d6ee', bokeh: ['#ffe9a8', '#ffffff'], floor: '#8f949c' };
  if (setting === 'room') return { top: '#8a6f55', bottom: '#d8c2a3', bokeh: ['#ffd9a0', '#ffb36b'], floor: '#a68c70' };
  return { top: c(P.accent2).lerp(c('#0b0b18'), 0.62).getStyle(), bottom: c(P.bg).lerp(c(P.accent), 0.15).multiplyScalar(0.55).getStyle(), bokeh: [P.accent, P.accent2], floor: c(P.bg).lerp(c(P.accent), 0.15).multiplyScalar(0.55).lerp(c(P.accent2), 0.2).getStyle() };
};
const hdrFor = (setting?: string) => (setting === 'street' ? 'kloppenheim_02_puresky_1k' : setting === 'room' ? 'brown_photostudio_02_1k' : 'studio_small_09_1k');

const Env: React.FC<{ setting?: string; showBackground: boolean }> = ({ setting, showBackground }) => {
  const hdr = useLoader(RGBELoader, staticFile(`pbr/hdri/${hdrFor(setting)}.hdr`));
  const scene = useThree((s) => s.scene);
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr; (scene as any).environmentIntensity = 0.9;
  if (showBackground) { scene.background = hdr; (scene as any).backgroundBlurriness = setting === 'street' ? 0.12 : 0.55; (scene as any).backgroundIntensity = 0.85; (scene as any).backgroundRotation = new THREE.Euler(0, setting === 'street' ? 2.2 : 0.9, 0); }
  return null;
};

const gradientTexture = (top: string, bottom: string) => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const bokehTexture = () => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
};

// synthetic studio set: gradient cyclorama with out-of-focus light discs (the "blurred crowd / lights" depth cue)
const Cyclorama: React.FC<{ f: number; ctx: Ctx; mood: Mood }> = ({ f, ctx, mood }) => {
  const accent = mood.bokeh[0], accent2 = mood.bokeh[1];
  const grad = useMemo(() => gradientTexture(mood.top, mood.bottom), [mood.top, mood.bottom]);
  const bokeh = useMemo(() => bokehTexture(), []);
  const discs = useMemo(() => Array.from({ length: 26 }, (_, i) => {
    const r = (n: number) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
    return { x: (r(1) - 0.5) * 9, y: 0.4 + r(2) * 4.2, z: -9 - r(3) * 3, s: 0.35 + r(4) * 0.9, c: r(5) > 0.5 ? accent : accent2, o: 0.18 + r(6) * 0.3, sp: 0.15 + r(7) * 0.3 };
  }), [accent, accent2]);
  return (
    <group>
      <mesh position={[0, 3, -14]}><planeGeometry args={[40, 20]} /><meshBasicMaterial map={grad} toneMapped={false} fog={false} /></mesh>
      {discs.map((d, i) => (
        <mesh key={i} position={[d.x + Math.sin(f / 90 * d.sp + i) * 0.25, d.y + Math.cos(f / 110 * d.sp + i) * 0.12, d.z]} scale={d.s}>
          <planeGeometry args={[1, 1]} /><meshBasicMaterial map={bokeh} color={d.c} transparent opacity={d.o} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} fog={false} />
        </mesh>
      ))}
    </group>
  );
};

const Floor: React.FC<{ mood: Mood; setting?: string }> = ({ mood, setting }) => {
  const col = useMemo(() => new THREE.Color(mood.floor), [mood.floor]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} receiveShadow>
      <planeGeometry args={[60, 40]} /><meshStandardMaterial color={col} roughness={setting === 'street' ? 0.85 : 0.28} metalness={setting === 'street' ? 0 : 0.15} envMapIntensity={0.9} />
    </mesh>
  );
};

const CameraRig: React.FC = () => {
  const camera = useThree((s) => s.camera);
  camera.position.set(0, CAM_Y, CAM_Z); camera.lookAt(0, CAM_Y, 0);
  return null;
};

const People: React.FC<{ f: number; scene: TplScene; ctx: Ctx }> = ({ f, scene, ctx }) => {
  const who = scene.who?.length ? scene.who : [Object.keys(ctx.chars)[0]];
  const speaker = scene.speaker ?? who[0];
  const lay = CAST_LAYOUT[scene.template] ?? {};
  const s = lay.s ?? 1.55;
  const multi = who.length > 1;
  const xs = lay.xs ?? (who.length === 1 ? (scene.template === 'stat' ? [520] : [520]) : who.length === 2 ? [300, 760] : [190, 520, 850]);
  const sx = xs[Math.max(0, who.indexOf(speaker))];
  const mouthAt = scene.mouth[Math.min(f, scene.mouth.length - 1)] ?? 0;
  return (
    <>
      {who.map((id, i) => {
        const c = ctx.chars[id]; if (!c) return null;
        const talking = id === speaker, ff = f + i * 11, seed = i * 2.1 + 0.7, towards = Math.sign(sx - xs[i]);
        const pf = perform(ff, scene.mouth, talking, seed, towards);
        const wave = Math.sin(ff / 9), g = talking && mouthAt > 0.12 ? 0.55 + 0.45 * Math.sin(ff / 20) : 0;
        const pointing = !!lay.point && talking;
        const armR = pointing ? 96 + wave * 4 : 12 + g * 55 + (talking && mouthAt > 0.12 ? wave * 5 : 0);
        const bp = (ff + 30 + seed * 40) % 110;
        const emotion = talking ? (scene.emotion ?? 'neutral') : 'happy';
        const scl = (s * (multi ? 0.92 : 1)) / 1.55;
        return (
          <Person3D key={id} look={{ skin: c.skin, hair: c.hair, hairStyle: c.hairStyle, shirt: c.shirt, pants: c.pants, shoe: c.shoe, glasses: c.glasses, body: c.body, model: c.model }}
            position={[screenToWorldX(xs[i]), 0, 0]} scale={scl} rotY={(pointing ? -0.15 : towards * (talking ? 0.1 : 0.32))}
            pose={{ head: pf.head, nod: pf.env * 4 + (talking ? 0 : 1.5 * Math.sin(ff / 33)), look: pointing ? 0.6 : pf.look, lean: pf.lean, armR: Math.min(armR, 100), armL: 9 + (talking ? 0 : 3), elbowR: pointing ? 6 : 10 + pf.elbow, elbowL: 10,
              talk: talking ? mouthAt : 0, mouthW: pf.mouthW, brow: pf.brow, blink: bp < 5 ? 0.15 : 1, emotion, breath: Math.sin(ff / 17) * 0.008, step: Math.sin(ff / 47 + seed) }} />
        );
      })}
    </>
  );
};

export const Scene3D: React.FC<{ f: number; scene: TplScene; ctx: Ctx; quality?: number }> = ({ f, scene, ctx, quality = 1 }) => {
  const W = 1080, H = 1920, rw = Math.round(W * quality), rh = Math.round(H * quality);
  const setting = scene.setting && ['room', 'street'].includes(scene.setting) ? scene.setting : (scene.template === 'board' ? 'room' : 'studio');
  const mood = moodFor(ctx, setting);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ width: rw, height: rh, transform: `scale(${1 / quality})`, transformOrigin: '0 0' }}>
        <ThreeCanvas width={rw} height={rh} shadows gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, antialias: false }} camera={{ position: [0, CAM_Y, CAM_Z], fov: 30, near: 1, far: 80 }}>
          <CameraRig />
          <Suspense fallback={<Loading />}>
            <Env setting={setting} showBackground={false} />
            <Cyclorama f={f} ctx={ctx} mood={mood} />
            <fog attach="fog" args={[mood.bottom, 9, 26]} />
            <Floor mood={mood} setting={setting} />
            <hemisphereLight args={['#ffffff', '#555566', 0.45]} />
            <directionalLight position={[-4, 8, 7]} intensity={2.4} color="#fff3e2" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-1} shadow-camera-near={2} shadow-camera-far={24} shadow-bias={-0.0004} />
            <pointLight position={[-3.2, 2.6, -2.5]} intensity={26} color={ctx.palette.accent} distance={14} />
            <pointLight position={[3.4, 2.4, -2.5]} intensity={22} color={ctx.palette.accent2} distance={14} />
            <People f={f} scene={scene} ctx={ctx} />
          </Suspense>
        </ThreeCanvas>
      </div>
    </div>
  );
};
