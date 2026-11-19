import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import data from './data.json';
import { Host, type CharacterType, type Emotion } from './Character';
import * as V2 from './Scenes2';

export const C = { bg: '#FBF7EF', ink: '#1B1B1F', accent: '#FF5A36', blue: '#2B6CFF', muted: '#D9D2C2', green: '#1FA66A' };
export const FONT = '"Helvetica Neue", Arial, sans-serif';
type P = { f: number; fps: number };
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const ease = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: Easing.inOut(Easing.cubic) });

// ---------- shared drawing helpers ----------
export const Phone: React.FC<{ x: number; y: number; s?: number; children?: React.ReactNode; glow?: boolean }> = ({ x, y, s = 1, children, glow }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-130} y={-230} width={260} height={460} rx={36} fill="#fff" stroke={glow ? C.accent : C.ink} strokeWidth={8} />
    <rect x={-30} y={-212} width={60} height={10} rx={5} fill={C.ink} />
    {children}
  </g>
);
export const Pin: React.FC<{ x: number; y: number; color?: string; s?: number }> = ({ x, y, color = C.accent, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M0 0 C-30 -40 -34 -60 -34 -72 A34 34 0 1 1 34 -72 C34 -60 30 -40 0 0Z" fill={color} />
    <circle cx={0} cy={-72} r={12} fill="#fff" />
  </g>
);
const Server: React.FC<{ x: number; y: number; pulse?: number }> = ({ x, y, pulse = 0 }) => (
  <g transform={`translate(${x} ${y})`}>
    {[0, 1, 2].map((i) => (
      <g key={i}>
        <rect x={-120} y={-130 + i * 90} width={240} height={76} rx={14} fill="#fff" stroke={C.ink} strokeWidth={7} />
        <circle cx={-80} cy={-92 + i * 90} r={11} fill={i === 1 ? C.green : C.muted} opacity={i === 1 ? 0.5 + 0.5 * pulse : 1} />
        <rect x={-50} y={-100 + i * 90} width={130} height={14} rx={7} fill={C.muted} />
      </g>
    ))}
  </g>
);
export const Label: React.FC<{ x: number; y: number; t: string; size?: number; color?: string }> = ({ x, y, t, size = 44, color = C.ink }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={FONT} fontSize={size} fontWeight={800} fill={color}>{t}</text>
);

// route used by several scenes (shop -> house), in map coordinates
const ROUTE: [number, number][] = [[200, 1150], [200, 900], [470, 900], [470, 650], [820, 650], [820, 430]];
const segLens = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
const routeLen = segLens.reduce((a, b) => a + b, 0);
const pointAt = (t: number): [number, number] => {
  let d = Math.min(Math.max(t, 0), 1) * routeLen;
  for (let i = 0; i < segLens.length; i++) {
    if (d <= segLens[i]) {
      const k = d / segLens[i];
      return [ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * k, ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * k];
    }
    d -= segLens[i];
  }
  return ROUTE[ROUTE.length - 1];
};
const routePts = (t: number) => {
  const pts: string[] = [`${ROUTE[0][0]},${ROUTE[0][1]}`];
  let d = t * routeLen;
  for (let i = 0; i < segLens.length && d > 0; i++) {
    const k = Math.min(d / segLens[i], 1);
    pts.push(`${ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * k},${ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * k}`);
    d -= segLens[i];
  }
  return pts.join(' ');
};
const City: React.FC = () => (
  <g>
    {[[90, 560, 260, 300], [330, 760, 200, 100], [590, 480, 150, 140], [930, 540, 100, 220], [620, 760, 260, 90], [330, 1000, 360, 100], [880, 780, 130, 300]].map(([x, y, w, h], i) => (
      <rect key={i} x={x} y={y} width={w} height={h} rx={14} fill={C.muted} opacity={0.45} />
    ))}
    <polyline points={ROUTE.map((p) => p.join(',')).join(' ')} fill="none" stroke="#fff" strokeWidth={46} strokeLinejoin="round" strokeLinecap="round" />
    <polyline points={ROUTE.map((p) => p.join(',')).join(' ')} fill="none" stroke={C.muted} strokeWidth={8} strokeDasharray="4 22" strokeLinecap="round" />
  </g>
);
const House: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M-48 0 L0 -46 L48 0 L48 56 L-48 56Z" fill="#fff" stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
    <rect x={-12} y={14} width={24} height={42} fill={C.ink} />
  </g>
);
const Shop: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-52} y={-30} width={104} height={70} fill="#fff" stroke={C.ink} strokeWidth={7} />
    <path d="M-60 -30 L-46 -66 L46 -66 L60 -30Z" fill={C.accent} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
  </g>
);

// ---------- scenes ----------
const Hook: React.FC<P> = ({ f }) => {
  const t = ease(f, 20, 200, 0, 0.55);
  const [px, py] = pointAt(t);
  const q = spring({ frame: f - 10, fps: 30, config: { damping: 8 } });
  return (
    <svg viewBox="0 0 1080 1500" width="100%" height="100%">
      <City />
      <Shop x={200} y={1190} />
      <House x={820} y={400} />
      <circle cx={px} cy={py} r={26} fill={C.accent} />
      <circle cx={px} cy={py} r={26 + 16 * ((f % 40) / 40)} fill="none" stroke={C.accent} strokeWidth={5} opacity={1 - (f % 40) / 40} />
      <text x={px + 70} y={py - 30} fontFamily={FONT} fontWeight={900} fontSize={150} fill={C.ink} transform={`scale(${q})`} style={{ transformOrigin: `${px + 70}px ${py - 30}px` }}>?</text>
    </svg>
  );
};

const Start: React.FC<P> = ({ f }) => {
  const press = ease(f, 40, 60, 0, 1) * (1 - ease(f, 66, 80));
  const pop = spring({ frame: f - 85, fps: 30, config: { damping: 12 } });
  const allow = ease(f, 140, 150) * (1 - ease(f, 155, 165));
  return (
    <svg viewBox="0 0 1080 1500" width="100%" height="100%">
      <Phone x={540} y={700} s={1.9}>
        <Label x={0} y={-130} t="Delivery #204" size={28} />
        <rect x={-95} y={-60} width={190} height={14} rx={7} fill={C.muted} />
        <rect x={-95} y={-30} width={130} height={14} rx={7} fill={C.muted} />
        <g transform={`scale(${1 - 0.06 * press})`}>
          <rect x={-100} y={60} width={200} height={64} rx={32} fill={C.accent} />
          <text x={0} y={103} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={30} fill="#fff">START</text>
        </g>
        <g transform={`translate(0 40) scale(${pop})`} opacity={pop > 0.05 ? 1 : 0}>
          <rect x={-110} y={-90} width={220} height={190} rx={22} fill="#fff" stroke={C.ink} strokeWidth={5} />
          <Pin x={0} y={-20} s={0.7} />
          <text x={0} y={34} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={19} fill={C.ink}>Share your location?</text>
          <rect x={-86} y={50} width={172} height={36} rx={18} fill={allow > 0.3 ? C.green : C.blue} />
          <text x={0} y={76} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={20} fill="#fff">Allow</text>
        </g>
      </Phone>
    </svg>
  );
};

const Gps: React.FC<P> = ({ f }) => {
  const sats: [number, number][] = [[200, 250], [540, 160], [880, 250]];
  return (
    <svg viewBox="0 0 1080 1500" width="100%" height="100%">
      <path d="M-100 1500 Q540 1000 1180 1500" fill="none" stroke={C.muted} strokeWidth={10} />
      {sats.map(([x, y], i) => {
        const k = ((f + i * 18) % 60) / 60;
        return (
          <g key={i}>
            <g transform={`translate(${x} ${y})`}>
              <rect x={-26} y={-26} width={52} height={52} rx={8} fill={C.blue} />
              <rect x={-90} y={-12} width={52} height={24} fill="#fff" stroke={C.blue} strokeWidth={5} />
              <rect x={38} y={-12} width={52} height={24} fill="#fff" stroke={C.blue} strokeWidth={5} />
            </g>
            <line x1={x} y1={y + 30} x2={540} y2={880} stroke={C.blue} strokeWidth={5} strokeDasharray="6 18" opacity={0.5} />
            <circle cx={x + (540 - x) * k} cy={y + 30 + (880 - y - 30) * k} r={14} fill={C.blue} opacity={1 - k * 0.3} />
          </g>
        );
      })}
      <Phone x={540} y={1060} s={0.8} glow>
        <Pin x={0} y={30} s={1.3} />
      </Phone>
      <circle cx={540} cy={880} r={40 + 40 * ((f % 45) / 45)} fill="none" stroke={C.accent} strokeWidth={5} opacity={1 - (f % 45) / 45} />
      <Label x={540} y={1330} t="lat, lng" size={44} color={C.accent} />
    </svg>
  );
};

const Send: React.FC<P> = ({ f }) => (
  <svg viewBox="0 0 1080 1500" width="100%" height="100%">
    <Phone x={230} y={760} s={0.85} glow><Pin x={0} y={30} s={1.2} /></Phone>
    <Server x={850} y={760} pulse={Math.abs(Math.sin(f / 10))} />
    <line x1={380} y1={760} x2={720} y2={760} stroke={C.muted} strokeWidth={6} strokeDasharray="4 16" />
    {[0, 1, 2].map((i) => {
      const k = ((f + i * 30) % 90) / 90;
      return <g key={i} transform={`translate(${380 + 340 * k} 760)`} opacity={k < 0.9 ? 1 : 0}><rect x={-22} y={-16} width={44} height={32} rx={6} fill={C.accent} /><path d="M-22 -16 L0 2 L22 -16" fill="none" stroke="#fff" strokeWidth={4} /></g>;
    })}
    <Label x={230} y={1050} t="Driver" />
    <Label x={850} y={1050} t="Server" />
    <Label x={540} y={640} t="every few seconds" size={38} color={C.accent} />
  </svg>
);

const Route: React.FC<P> = ({ f }) => {
  const t = ease(f, 20, 200);
  const arrow = ease(f, 210, 240);
  return (
    <svg viewBox="0 0 1080 1500" width="100%" height="100%">
      <City />
      <polyline points={routePts(t)} fill="none" stroke={C.blue} strokeWidth={18} strokeLinejoin="round" strokeLinecap="round" />
      <Shop x={200} y={1190} />
      <House x={820} y={400} />
      <g opacity={arrow} transform={`translate(0 ${20 * (1 - arrow)})`}>
        <rect x={250} y={1010} width={260} height={90} rx={20} fill={C.ink} />
        <text x={380} y={1070} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={38} fill="#fff">↱ Turn right</text>
      </g>
    </svg>
  );
};

const Push: React.FC<P> = ({ f }) => {
  const t = ease(f, 10, 300, 0.2, 0.75);
  const [dx, dy] = pointAt(t);
  const k = (f % 40) / 40;
  return (
    <svg viewBox="0 0 1080 1500" width="100%" height="100%">
      <Server x={230} y={480} pulse={Math.abs(Math.sin(f / 10))} />
      <Phone x={780} y={720} s={1.5} glow>
        <clipPath id="scr"><rect x={-110} y={-190} width={220} height={380} rx={20} /></clipPath>
        <g clipPath="url(#scr)">
          <rect x={-110} y={-190} width={220} height={380} fill={C.bg} />
          <g transform="scale(0.27) translate(-555 -825)">
            <City />
            <polyline points={routePts(1)} fill="none" stroke={C.blue} strokeWidth={26} strokeLinejoin="round" />
            <circle cx={dx} cy={dy} r={34} fill={C.accent} />
          </g>
        </g>
      </Phone>
      {[0, 1].map((i) => {
        const kk = ((f + i * 20) % 40) / 40;
        return <circle key={i} cx={360 + 250 * kk} cy={520 + 120 * kk} r={14} fill={C.accent} opacity={1 - kk * 0.4} />;
      })}
      <line x1={360} y1={520} x2={610} y2={640} stroke={C.muted} strokeWidth={5} strokeDasharray="4 14" />
      <Label x={230} y={780} t="live stream" size={44} color={C.accent} />
      <rect x={580} y={1080} width={400} height={64} rx={32} fill={C.ink} />
      <text x={780} y={1124} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={30} fill="#fff">no refresh needed</text>
    </svg>
  );
};

const Arrive: React.FC<P> = ({ f }) => {
  const t = ease(f, 10, 150, 0.7, 1);
  const [px, py] = pointAt(t);
  const tap = spring({ frame: f - 190, fps: 30, config: { damping: 9 } });
  return (
    <svg viewBox="0 0 1080 1500" width="100%" height="100%">
      <City />
      <House x={820} y={400} />
      <circle cx={px} cy={py} r={26} fill={C.accent} />
      <g opacity={ease(f, 180, 195)} transform={`translate(540 1120) scale(${0.9 + 0.1 * tap})`}>
        <rect x={-340} y={-60} width={680} height={120} rx={60} fill={tap > 0.9 ? C.green : C.blue} />
        <text x={0} y={18} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={44} fill="#fff">{tap > 0.9 ? '✓ Delivered' : 'I received my order'}</text>
      </g>
    </svg>
  );
};

const Outro: React.FC<P & { brand: string; cta: string }> = ({ f, brand, cta }) => {
  const s = spring({ frame: f - 5, fps: 30, config: { damping: 11 } });
  return (
    <svg viewBox="0 0 1080 1500" width="100%" height="100%">
      <g transform={`translate(540 560) scale(${s})`}>
        <Pin x={0} y={140} s={3} />
      </g>
      <Label x={540} y={900} t={brand} size={120} />
      <rect x={160} y={1020} width={760} height={120} rx={60} fill={C.accent} />
      <text x={540} y={1100} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={56} fill="#fff">Comment "{cta}"</text>
    </svg>
  );
};

export const renderScene = (kind: string, f: number, extra: { brand: string; cta: string }) => {
  const p = { f, fps: 30 };
  switch (kind) {
    case 'hook': return <V2.Hook f={f} />;
    case 'wait': return <V2.Wait f={f} />;
    case 'confirm': return <V2.Confirm f={f} />;
    case 'start': return <V2.Start f={f} />;
    case 'gps': return <V2.Gps f={f} />;
    case 'send': return <V2.Send f={f} />;
    case 'route': return <V2.Route2 f={f} />;
    case 'push': return <V2.Push f={f} />;
    case 'arrive': return <V2.Arrive f={f} />;
    default: return <V2.Outro2 f={f} {...extra} />;
  }
};

// ---------- captions (timed by character share of the narration) ----------
const Captions: React.FC<{ text: string; frame: number; audioFrames: number }> = ({ text, frame, audioFrames }) => {
  const words = text.split(' ');
  const total = text.length;
  let acc = 0;
  const marks = words.map((w) => { const s = acc / total; acc += w.length + 1; return s; });
  const prog = Math.min(frame / audioFrames, 0.999);
  let cur = 0;
  marks.forEach((m, i) => { if (prog >= m) cur = i; });
  const start = Math.floor(cur / 4) * 4;
  const chunk = words.slice(start, start + 4);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18, padding: '22px 44px', background: 'rgba(255,255,255,0.9)', borderRadius: 44, border: '6px solid #1B1B1F', maxWidth: 980, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
      {chunk.map((w, i) => (
        <span key={i} style={{ fontFamily: FONT, fontWeight: 900, fontSize: 78, color: start + i === cur ? C.accent : C.ink, textTransform: 'uppercase' }}>{w}</span>
      ))}
    </div>
  );
};

type D = typeof data;
export type RenderFn = (kind: string, f: number, extra: { brand: string; cta: string }) => React.ReactNode;
const SceneView: React.FC<{ s: D['scenes'][number]; d: D; render: RenderFn }> = ({ s, d, render }) => {
  const f = useCurrentFrame();
  const fade = interpolate(f, [0, 8, s.frames - 8, s.frames], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <Audio src={staticFile(s.audio)} />
      <div style={{ position: 'absolute', inset: 0, opacity: fade, transform: `translateX(${interpolate(f, [0, 12], [70, 0], clamp)}px) scale(${1 + f * 0.00032})`, transformOrigin: `${40 + (s.frames % 3) * 20}% 60%` }}>{render(s.kind, f, { brand: d.brand, cta: d.cta })}</div>
      {/* cinematic grade: vignette + warm light bloom */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(20,10,30,0.38) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 85% 8%, rgba(255,236,190,0.35), rgba(255,236,190,0) 45%)' }} />
      <div style={{ position: 'absolute', bottom: 150, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Captions text={s.text} frame={f} audioFrames={s.audioFrames} />
      </div>
    </AbsoluteFill>
  );
};

export type VideoProps = { character?: CharacterType };
export const makeVideo = (d: D, render: RenderFn): React.FC<VideoProps> => ({ character }) => {
  let from = 0;
  const who = (character ?? (d as { character?: string }).character ?? 'ada') as CharacterType;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {d.scenes.map((s, i) => {
        const el = <Sequence key={i} from={from} durationInFrames={s.frames}><SceneView s={s} d={d} render={render} /></Sequence>;
        from += s.frames;
        return el;
      })}
    </AbsoluteFill>
  );
};
export const Video = makeVideo(data, (k, f, e) => renderScene(k, f, e));
