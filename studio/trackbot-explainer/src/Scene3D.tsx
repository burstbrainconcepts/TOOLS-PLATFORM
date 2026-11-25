import React, { Suspense, useEffect, useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { continueRender, delayRender, staticFile } from 'remotion';
import { useLoader, useThree } from '@react-three/fiber';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import * as THREE from 'three';
import { Person3D } from './Human3D';
import { AraActor } from './AraActor';
import { CAST_LAYOUT, perform, type Ctx, type TplScene } from './Templates';
import { ParkSet } from './Park3D';
import { PHOTO, PhotoFloor, PhotoBackdrop } from './Settings3D';
import BD from './backdrops.json';
import { gaitSpeedRig, GAIT } from './rigPose';
import { CLIPS } from './mocap';

const BDX = BD as Record<string, { yaw: number; horizon: string }>;
// Gait speed that matches the stride (so the feet do not glide over the ground): mean backward foot speed during stance = 2*L*sin(A) / half-cycle
export const gaitSpeed = (run: boolean | undefined, scl: number) => gaitSpeedRig(run) * 1.08 * scl;

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
const hdrFor = (setting?: string) => PHOTO[setting ?? '']?.hdri ?? (setting === 'street' || setting === 'park' ? 'kloppenheim_02_puresky_1k' : setting === 'room' ? 'brown_photostudio_02_1k' : 'studio_small_09_1k');

const Env: React.FC<{ setting?: string; showBackground: boolean; debugBg?: boolean }> = ({ setting, showBackground, debugBg }) => {
  const hdr = useLoader(RGBELoader, staticFile(`pbr/hdri/${hdrFor(setting)}.hdr`));
  const scene = useThree((s) => s.scene);
  const ph = PHOTO[setting ?? ''];
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr; (scene as any).environmentIntensity = ph ? 1.0 : 0.9;
  // align the lighting HDRI with the backdrop crop: the crop looks along yaw theta, the camera looks along -z
  const bd = BDX[setting ?? ''];
  const phi = bd ? Math.PI / 2 + (bd.yaw * Math.PI) / 180 : 0;   // three.js flips the sign of environment/background rotations
  if (bd) (scene as any).environmentRotation = new THREE.Euler(0, phi, 0);
  if (debugBg && bd) { scene.background = hdr; (scene as any).backgroundBlurriness = 0; (scene as any).backgroundIntensity = 1; (scene as any).backgroundRotation = new THREE.Euler(0, phi, 0); return null; }
  if (showBackground) {
    scene.background = hdr;
    (scene as any).backgroundBlurriness = ph ? ph.blur : setting === 'park' ? 0.04 : setting === 'street' ? 0.12 : 0.55;
    (scene as any).backgroundIntensity = ph ? ph.intensity : setting === 'park' ? 0.42 : 0.85;
    (scene as any).backgroundRotation = new THREE.Euler(0, ph ? ph.rot : setting === 'street' || setting === 'park' ? 2.2 : 0.9, 0);
  }
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

// Rhubarb mouth shapes -> weights on our morph targets (mouthOpen = jaw, purse = lips rounded/pursed, smile = corner puller, upperLip = lip raised for F/V, lipsOut = lips pushed out)
const VIS: Record<string, { open: number; purse: number; smile: number; upper: number; out: number }> = {
  X: { open: 0, purse: 0, smile: 0, upper: 0, out: 0 },        // rest
  A: { open: 0, purse: 0.12, smile: 0, upper: 0, out: 0 },     // P B M: lips pressed
  B: { open: 0.2, purse: 0, smile: 0.1, upper: 0, out: 0 },    // K S T: teeth nearly together
  C: { open: 0.55, purse: 0, smile: 0.12, upper: 0, out: 0 },  // EH AE: open
  D: { open: 0.95, purse: 0, smile: 0.05, upper: 0, out: 0 },  // AA: wide open
  E: { open: 0.45, purse: 0.55, smile: 0, upper: 0, out: 0.2 }, // AO ER: rounded
  F: { open: 0.2, purse: 0.9, smile: 0, upper: 0, out: 0.45 },  // UW OW W: puckered
  G: { open: 0.22, purse: 0, smile: 0, upper: 0.65, out: 0 },   // F V: upper teeth on lower lip
  H: { open: 0.42, purse: 0, smile: 0.08, upper: 0, out: 0 },   // L: tongue up, mouth open
};
const visemeAt = (cues: [number, number, string][], t: number) => {
  let i = cues.findIndex((c) => t >= c[0] && t < c[1]);
  if (i < 0) return VIS.X;
  const cur = VIS[cues[i][2]] ?? VIS.X, prev = i > 0 ? VIS[cues[i - 1][2]] ?? VIS.X : VIS.X;
  const k = Math.min(1, Math.max(0, (t - cues[i][0]) / 0.07)), e = k * k * (3 - 2 * k);     // 70 ms transition into each shape
  const mix = (a: number, b: number) => a + (b - a) * e;
  return { open: mix(prev.open, cur.open), purse: mix(prev.purse, cur.purse), smile: mix(prev.smile, cur.smile), upper: mix(prev.upper, cur.upper), out: mix(prev.out, cur.out) };
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
        const pointing = !!lay.point && talking && !scene.hold;
        const armR = pointing ? 96 + wave * 4 : 12 + g * 55 + (talking && mouthAt > 0.12 ? wave * 5 : 0);
        const bp = (ff + 30 + seed * 40) % 110;
        const wk = scene.walk, cad = wk?.run ? GAIT.run.cad : GAIT.walk.cad;                       // gait cycles per second
        const act = scene.action, t0 = Math.round((act?.at ?? 0.8) * 30);
        const isKicker = act?.type === 'kick' && i === 0;
        const kickK = isKicker && f >= t0 ? (f - t0) / 27 : undefined;                  // the kick takes 0.9 s
        const cheer = act?.type === 'cheer' ? Math.min(1, Math.max(0, (f - t0) / 8)) : 0;
        const clipScene = scene.clip && i === 0 ? CLIPS[scene.clip.name] : undefined;
        const holding = !!scene.hold && talking && !wk && !isKicker && !clipScene;
        const viseme = talking && scene.visemes ? visemeAt(scene.visemes, f / 30) : undefined;
        const emotion = cheer > 0 ? 'happy' : talking ? (scene.emotion ?? 'neutral') : 'happy';
        const scl = (s * (multi ? 0.92 : 1)) / 1.55;
        const px = screenToWorldX(xs[i]);
        return (
          <React.Fragment key={id}>
            <ContactShadow x={px} w={(wk || isKicker ? 1.5 : 0.95) * scl} d={(wk || isKicker ? 0.5 : 0.55) * scl} />
          {scene.ara ? <AraActor model={scene.ara.models?.[id] ?? id} clip={scene.ara.clips?.[id] ?? (i === 0 ? scene.ara.clip : 'idle')} loop={scene.ara.loop ?? true} t={Math.max(0, f / 30 - (scene.ara.at ?? 0)) * (scene.ara.rate ?? 1)}
              face={{ ...(viseme ?? { open: 0, purse: 0, smile: 0, upper: 0 }), smile: (viseme?.smile ?? 0) + (emotion === 'happy' ? 0.45 : 0), press: 0, blink: bp < 5 ? 1 : 0 }} position={[px + (scene.ara.dx?.[id] ?? 0), 0, 0]} scale={scl} rotY={(scene.ara.dirs?.[id] ?? scene.ara.dir ?? 0) * Math.PI / 2} /> : <Person3D look={{ skin: c.skin, hair: c.hair, hairStyle: c.hairStyle, shirt: c.shirt, pants: c.pants, shoe: c.shoe, glasses: c.glasses, body: c.body, model: c.model }}
            position={[screenToWorldX(xs[i]), 0, 0]} scale={scl} rotY={clipScene ? (scene.clip!.dir ?? 0) * Math.PI / 2 : isKicker ? Math.PI / 2 : wk ? wk.dir * Math.PI / 2 : (pointing ? -0.15 : towards * (talking ? 0.1 : 0.32))}
            pose={{ viseme, ...(clipScene ? { mocap: { clip: clipScene, t: Math.max(0, f / 30 - (scene.clip!.at ?? 0)) * (scene.clip!.rate ?? 1) }, blink: bp < 5 ? 0.15 : 1, emotion, talk: talking ? mouthAt : 0, brow: pf.brow, breath: Math.sin(ff / 17) * 0.008 } : isKicker || cheer > 0 ? { head: pf.head * 0.5, nod: cheer > 0 ? -8 : 3, look: 0, lean: 0, armR: 12, armL: 12, elbowR: 12, elbowL: 12, talk: cheer > 0 ? 0.7 + 0.3 * Math.sin(f / 2) : 0, mouthW: 1.3, brow: cheer > 0 ? 0.8 : 0.2, blink: 1, emotion, breath: Math.sin(ff / 17) * 0.008, kick: kickK !== undefined && kickK <= 1 ? kickK : undefined, cheer, walk: (f - t0) * 0.31 } : wk ? { head: pf.head * 0.4, nod: 2, look: wk.dir * 0.1, lean: 0, armR: 12, armL: 12, elbowR: 12, elbowL: 12, talk: talking ? mouthAt : 0, mouthW: pf.mouthW, brow: 0, blink: bp < 5 ? 0.15 : 1, emotion: talking ? (scene.emotion ?? 'happy') : 'happy', breath: Math.sin(ff / 17) * 0.008, walk: 2 * Math.PI * cad * (f / 30) + i * 0.35, stride: wk.run ? 1.5 : 1 } : { head: pf.head, nod: pf.env * 4 + (talking ? 0 : 1.5 * Math.sin(ff / 33)), look: pointing ? 0.6 : pf.look, lean: pf.lean, armR: holding ? 16 : Math.min(armR, 100), armL: 9 + (talking ? 0 : 3), elbowR: holding ? 100 : pointing ? 6 : 10 + pf.elbow, elbowL: 10, reachR: holding ? 36 : 0, grip: holding ? 1 : 0,
              talk: talking ? mouthAt : 0, mouthW: pf.mouthW, brow: pf.brow, blink: bp < 5 ? 0.15 : 1, emotion, breath: Math.sin(ff / 17) * 0.008, step: Math.sin(ff / 47 + seed) }) }} held={holding ? { color: ctx.palette.accent, cap: '#162434' } : undefined} />}
          </React.Fragment>
        );
      })}
    </>
  );
};

// soft contact shadow under a person: grounds them on the floor (the real shadow map only covers a small area and has no ambient occlusion)
const ContactShadow: React.FC<{ x: number; w: number; d: number }> = ({ x, w, d }) => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0]} scale={[w, d, 1]} renderOrder={2}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={tex} transparent depthWrite={false} opacity={0.7} /></mesh>;
};

// a football: white with dark panels, rolls at the kicker's feet and flies off when kicked
const ballTexture = () => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d')!; g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#1b1b1f';
  for (const [x, y] of [[32, 40], [96, 90], [160, 36], [224, 84], [128, 14], [128, 114], [0, 84], [256, 40]]) { g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const Ball: React.FC<{ f: number; x0: number; t0: number }> = ({ f, x0, t0 }) => {
  const tex = useMemo(() => ballTexture(), []);
  const fi = t0 + 13, t = Math.max(0, (f - fi) / 30);
  const y = Math.max(0.11, 0.11 + 4.2 * t - 4.9 * t * t);
  return (
    <mesh position={[x0 + 9 * t, y, -3 * t]} rotation={[t * 6, 0, -t * 9]} castShadow>
      <sphereGeometry args={[0.11, 24, 16]} /><meshStandardMaterial map={tex} roughness={0.45} />
    </mesh>
  );
};

export const Scene3D: React.FC<{ f: number; scene: TplScene; ctx: Ctx; quality?: number }> = ({ f, scene, ctx, quality = 1 }) => {
  const W = 1080, H = 1920, rw = Math.round(W * quality), rh = Math.round(H * quality);
  const setting = scene.setting && (['room', 'street', 'park'].includes(scene.setting) || PHOTO[scene.setting]) ? scene.setting : (scene.template === 'board' ? 'room' : 'studio');
  const mood = moodFor(ctx, setting);
  const park = setting === 'park';
  const photo = PHOTO[setting];
  const lay0 = CAST_LAYOUT[scene.template] ?? {}, walkScl = ((lay0.s ?? 1.55) * ((scene.who?.length ?? 1) > 1 ? 0.92 : 1)) / 1.55;   // same scale People applies
  const horizon = BDX[setting]?.horizon;
  const ck0 = scene.clip ? CLIPS[scene.clip.name] : undefined;
  // how the world moves past the character: a gait speed (walk/run) or the speed measured from a captured clip
  const move = scene.ara?.floor ? { dir: scene.ara.dir ?? 1, speed: scene.ara.floor * 1.08 * 0.976 * walkScl * (scene.ara.rate ?? 1) } : scene.walk ? { dir: scene.walk.dir, speed: scene.walk.speed ?? gaitSpeed(scene.walk.run, walkScl) } : ck0 && scene.clip?.floor ? { dir: scene.clip.dir ?? 1, speed: ck0.floorSpeed * (0.814 / ck0.hipRef) * 1.08 * walkScl * (scene.clip.rate ?? 1) } : undefined;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ width: rw, height: rh, transform: `scale(${1 / quality})`, transformOrigin: '0 0' }}>
        <ThreeCanvas width={rw} height={rh} shadows gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, antialias: true }} camera={{ position: [0, CAM_Y, CAM_Z], fov: 30, near: 1, far: 80 }}>
          <CameraRig />
          <Suspense fallback={<Loading />}>
            <Env setting={setting} showBackground={park} debugBg={ctx.debug === 'envbg'} />
            {!park && !photo && <Cyclorama f={f} ctx={ctx} mood={mood} />}
            {photo && <>{ctx.debug !== 'envbg' && <PhotoBackdrop name={setting} />}<PhotoFloor p={photo} shift={move ? move.dir * move.speed * f / 30 : 0} /></>}
            {park && <ParkSet walk={move ? { dir: move.dir, dist: (move.speed * f) / 30 } : undefined} />}
            {photo ? (photo.fog && <fog attach="fog" args={[horizon ?? photo.fog[0], 22, 70]} />) : <fog attach="fog" args={park ? ['#bcd4e6', 16, 52] : [mood.bottom, 9, 26]} />}
            {!park && !photo && <Floor mood={mood} setting={setting} />}
            <hemisphereLight args={['#ffffff', '#555566', 0.45]} />
            <directionalLight position={[-4, 8, 7]} intensity={2.4} color="#fff3e2" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-1} shadow-camera-near={2} shadow-camera-far={24} shadow-bias={-0.0004} />
            <pointLight position={[-3.2, 2.6, -2.5]} intensity={photo ? 0 : park ? 5 : 26} color={park ? '#ffffff' : ctx.palette.accent} distance={14} />
            <pointLight position={[3.4, 2.4, -2.5]} intensity={photo ? 0 : park ? 4 : 22} color={park ? '#fff4e0' : ctx.palette.accent2} distance={14} />
            <People f={f} scene={scene} ctx={ctx} />
            {scene.action?.type === 'kick' && <Ball f={f} x0={screenToWorldX((CAST_LAYOUT[scene.template]?.xs ?? (scene.who && scene.who.length > 1 ? [300, 760] : [520]))[0]) + 0.34} t0={Math.round((scene.action.at ?? 0.8) * 30)} />}
          </Suspense>
        </ThreeCanvas>
      </div>
    </div>
  );
};
