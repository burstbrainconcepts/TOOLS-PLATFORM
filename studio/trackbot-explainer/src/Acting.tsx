import React from 'react';
import { useCurrentFrame } from 'remotion';

// Reusable "acting" pieces: full-body cartoon people, a scooter rider, a scrolling street, a house, a tower.
export const K = { bg: '#FBF7EF', ink: '#1B1B1F', accent: '#FF5A36', blue: '#2B6CFF', muted: '#D9D2C2', green: '#1FA66A', gold: '#F5B820' };
export const FONT = '"Helvetica Neue", Arial, sans-serif';
const rad = (d: number) => (d * Math.PI) / 180;

export type FigureProps = {
  frame?: number;
  skin?: string; hair?: string; hairStyle?: 'puff' | 'short' | 'helmet';
  shirt?: string; pants?: string; shoe?: string;
  emotion?: 'neutral' | 'happy' | 'surprised' | 'worried';
  armR?: number; armL?: number; legL?: number; legR?: number; // degrees from straight down; positive = outward
  phone?: boolean; box?: boolean; talk?: number; glasses?: boolean;
  // performance controls (all default to 0 = the old static pose)
  head?: number;      // head tilt, degrees
  look?: number;      // -1..1 face/eye direction (fake turn)
  lean?: number;      // upper-body lean, degrees
  elbowR?: number;    // bends the right forearm (degrees) for gestures
  brow?: number;      // -1..1 eyebrow lift
  mouthW?: number;    // mouth width multiplier (1 = normal)
};

const Limb: React.FC<{ x: number; y: number; a: number; len: number; w: number; c: string; side: 1 | -1 }> = ({ x, y, a, len, w, c, side }) => {
  const ex = x + side * Math.sin(rad(a)) * len, ey = y + Math.cos(rad(a)) * len;
  return <line x1={x} y1={y} x2={ex} y2={ey} stroke={c} strokeWidth={w} strokeLinecap="round" />;
};
const endOf = (x: number, y: number, a: number, len: number, side: 1 | -1): [number, number] => [x + side * Math.sin(rad(a)) * len, y + Math.cos(rad(a)) * len];

// Feet at (0,0), about 320 tall.
export const Figure: React.FC<FigureProps> = ({
  frame = 0, skin = '#8D5524', hair = '#14100D', hairStyle = 'puff', shirt = K.blue, pants = K.ink, shoe = '#fff',
  emotion = 'neutral', armR = 12, armL = 12, legL = 4, legR = -4, phone, box, talk = 0, glasses,
  head = 0, look = 0, lean = 0, elbowR = 0, brow = 0, mouthW = 1,
}) => {
  const bob = Math.sin(frame / 14) * 1.5;
  const bp = (frame + 30) % 110; const blink = bp < 5 ? 0.15 : 1;
  const [ex1, ey1] = endOf(32, -212, armR, 58, 1);
  const [rx, ry] = elbowR ? endOf(ex1, ey1, armR + elbowR, 56, 1) : endOf(32, -212, armR, 108, 1);
  const breath = 1 + Math.sin(frame / 17) * 0.006;
  const [lx, ly] = endOf(-32, -212, armL, 108, -1);
  const [lfx, lfy] = endOf(-14, -118, legL, 118, -1);
  const [rfx, rfy] = endOf(14, -118, legR, 118, 1);
  const m = Math.min(1, talk);
  return (
    <g>
      <ellipse cx={0} cy={6} rx={66} ry={12} fill="#000" opacity={0.2} />
    <g transform={`translate(0 ${bob})`}>
      {/* legs */}
      <Limb x={-14} y={-118} a={legL} len={118} w={30} c={pants} side={-1} />
      <Limb x={14} y={-118} a={legR} len={118} w={30} c={pants} side={1} />
      <ellipse cx={lfx - 6} cy={lfy + 2} rx={22} ry={11} fill={shoe} stroke={K.ink} strokeWidth={4} />
      <ellipse cx={rfx + 6} cy={rfy + 2} rx={22} ry={11} fill={shoe} stroke={K.ink} strokeWidth={4} />
      <g transform={`rotate(${lean} 0 -118) translate(0 -118) scale(1 ${breath}) translate(0 118)`}>
      {/* torso */}
      <rect x={-36} y={-228} width={72} height={118} rx={26} fill={shirt} stroke={K.ink} strokeWidth={5} />
      {/* arms (behind-hand first) */}
      <Limb x={-32} y={-212} a={armL} len={108} w={26} c={shirt} side={-1} />
      <circle cx={lx} cy={ly} r={14} fill={skin} stroke={K.ink} strokeWidth={4} />
      {elbowR
        ? <><Limb x={32} y={-212} a={armR} len={58} w={26} c={shirt} side={1} /><Limb x={ex1} y={ey1} a={armR + elbowR} len={56} w={24} c={shirt} side={1} /></>
        : <Limb x={32} y={-212} a={armR} len={108} w={26} c={shirt} side={1} />}
      <circle cx={rx} cy={ry} r={14} fill={skin} stroke={K.ink} strokeWidth={4} />
      {phone && <g transform={`translate(${rx + 6} ${ry - 28}) rotate(-12)`}><rect x={-14} y={-24} width={28} height={50} rx={6} fill="#fff" stroke={K.ink} strokeWidth={4} /><rect x={-9} y={-18} width={18} height={30} rx={3} fill={K.blue} opacity={0.85} /></g>}
      {box && <g transform={`translate(${rx - 4} ${ry - 20})`}><rect x={-34} y={-30} width={68} height={56} rx={6} fill={K.accent} stroke={K.ink} strokeWidth={5} /><rect x={-34} y={-14} width={68} height={10} fill="#fff" opacity={0.6} /></g>}
      {/* neck + head */}
      <rect x={-10} y={-250} width={20} height={26} fill={skin} stroke={K.ink} strokeWidth={4} />
      <g transform={`translate(0 -250) rotate(${head}) translate(0 -35)`}>
        {hairStyle === 'puff' && [[-30, -22, 22], [30, -22, 22], [0, -36, 28], [-16, -34, 20], [16, -34, 20]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={hair} />)}
        <circle cx={0} cy={0} r={38} fill={skin} stroke={K.ink} strokeWidth={5} />
        {hairStyle === 'puff' && <path d="M-36 -10 Q0 -48 36 -10 Q22 -30 0 -30 Q-22 -30 -36 -10Z" fill={hair} />}
        {hairStyle === 'short' && <path d="M-38 -6 Q-38 -42 0 -42 Q38 -42 38 -6 Q22 -26 0 -26 Q-22 -26 -38 -6Z" fill={hair} stroke={K.ink} strokeWidth={3} />}
        {hairStyle === 'helmet' && <g><path d="M-42 -2 Q-44 -52 0 -52 Q44 -52 42 -2Z" fill={K.accent} stroke={K.ink} strokeWidth={5} /><path d="M-4 -2 L46 -2 L40 8 L-4 8Z" fill="#1B1B1F" opacity={0.85} /></g>}
        <g transform={`translate(${look * 6} 0)`}>
        {[-14, 14].map((x) => <ellipse key={x} cx={x + look * 2.5} cy={2} rx={4.5} ry={5.5 * blink} fill={K.ink} />)}
        {glasses && <g fill="none" stroke={K.ink} strokeWidth={3.5}><circle cx={-14} cy={2} r={11.5} /><circle cx={14} cy={2} r={11.5} /><line x1={-2.5} y1={2} x2={2.5} y2={2} /></g>}
        <path d={`M-24 ${-12 - brow * 5 + (emotion === 'surprised' ? -6 : 0)} Q-14 ${-18 + (emotion === 'worried' ? 4 : 0)} -6 ${-12}`} fill="none" stroke={K.ink} strokeWidth={3.5} strokeLinecap="round" />
        <path d={`M24 ${-12 - brow * 5 + (emotion === 'surprised' ? -6 : 0)} Q14 ${-18 + (emotion === 'worried' ? 4 : 0)} 6 ${-12}`} fill="none" stroke={K.ink} strokeWidth={3.5} strokeLinecap="round" />
        {m > 0.1
          ? <ellipse cx={0} cy={20} rx={(10 - m * 2) * mouthW} ry={3 + m * 8} fill="#4A1620" stroke={K.ink} strokeWidth={3} />
          : <path d={emotion === 'happy' ? 'M-14 16 Q0 32 14 16' : emotion === 'worried' ? 'M-10 24 Q0 16 10 24' : emotion === 'surprised' ? 'M-5 18 Q0 28 5 18 Q0 12 -5 18Z' : 'M-10 20 Q0 24 10 20'} fill={emotion === 'surprised' ? '#4A1620' : 'none'} stroke={K.ink} strokeWidth={3.5} strokeLinecap="round" />}
        {emotion === 'happy' && [-1, 1].map((s) => <ellipse key={s} cx={s * 26} cy={14} rx={8} ry={5} fill={K.accent} opacity={0.3} />)}
        </g>
      </g>
      </g>
    </g>
    </g>
  );
};

// Side-view delivery rider on a scooter, facing right. Ground at y=0, centered at x=0.
export const Rider: React.FC<{ frame: number; moving?: boolean }> = ({ frame, moving = true }) => {
  const spin = moving ? frame * 18 : 0;
  const bounce = moving ? Math.sin(frame / 3) * 2.5 : 0;
  const Wheel: React.FC<{ cx: number }> = ({ cx }) => (
    <g transform={`translate(${cx} -38)`}>
      <circle r={38} fill="#2A2A30" stroke={K.ink} strokeWidth={5} />
      <circle r={20} fill={K.muted} stroke={K.ink} strokeWidth={4} />
      <g transform={`rotate(${spin})`}>{[0, 60, 120].map((a) => <line key={a} x1={-20} y1={0} x2={20} y2={0} stroke={K.ink} strokeWidth={4} transform={`rotate(${a})`} />)}</g>
    </g>
  );
  return (
    <g transform={`translate(0 ${bounce})`}>
      <Wheel cx={-96} /><Wheel cx={100} />
      {/* body */}
      <path d="M-130 -84 Q-130 -122 -86 -122 L-40 -122 Q-20 -122 -10 -92 L72 -92 L84 -150 L98 -152 L96 -80 L60 -70 L-60 -70 Q-120 -70 -130 -84Z" fill={K.blue} stroke={K.ink} strokeWidth={6} strokeLinejoin="round" />
      <line x1={96} y1={-80} x2={104} y2={-46} stroke={K.ink} strokeWidth={9} strokeLinecap="round" />
      <path d="M86 -152 L112 -164" stroke={K.ink} strokeWidth={9} strokeLinecap="round" />
      <ellipse cx={104} cy={-120} rx={9} ry={14} fill={K.gold} stroke={K.ink} strokeWidth={4} />
      {/* delivery box */}
      <g transform="translate(-188 -216)">
        <rect width={116} height={104} rx={12} fill={K.accent} stroke={K.ink} strokeWidth={6} />
        <rect y={34} width={116} height={14} fill="#fff" opacity={0.55} />
        <g transform="translate(58 70) scale(0.5)"><path d="M0 0 C-24 -30 -26 -46 -26 -54 A26 26 0 1 1 26 -54 C26 -46 24 -30 0 0Z" fill="#fff" /><circle cx={0} cy={-54} r={9} fill={K.accent} /></g>
      </g>
      {/* rider */}
      <path d="M-70 -132 Q-50 -220 -6 -226" fill="none" stroke="#FF5A36" strokeWidth={46} strokeLinecap="round" />
      <path d="M-70 -132 Q-50 -220 -6 -226" fill="none" stroke={K.ink} strokeWidth={4} strokeLinecap="round" opacity={0.2} />
      <path d="M-66 -128 L-10 -124 L-6 -76" fill="none" stroke={K.ink} strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={0} cy={-70} rx={22} ry={10} fill="#fff" stroke={K.ink} strokeWidth={4} />
      <path d="M-4 -226 L58 -184 L92 -164" fill="none" stroke="#FF5A36" strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={96} cy={-164} r={13} fill="#6B4226" stroke={K.ink} strokeWidth={4} />
      <g transform="translate(6 -266)">
        <circle r={34} fill="#6B4226" stroke={K.ink} strokeWidth={5} />
        <path d="M-40 4 Q-42 -48 0 -48 Q42 -48 40 4Z" fill={K.accent} stroke={K.ink} strokeWidth={5} />
        <path d="M2 4 L44 4 L38 14 L2 14Z" fill="#1B1B1F" opacity={0.85} />
        <circle cx={20} cy={-2} r={4} fill={K.ink} />
        <path d="M10 18 Q22 26 34 16" fill="none" stroke={K.ink} strokeWidth={3.5} strokeLinecap="round" />
      </g>
    </g>
  );
};

// A scrolling street panel. Draw inside a <g> clipped to (0,0,w,h).
const FAR = [[0, 120, 150], [130, 90, 230], [230, 140, 170], [380, 100, 260], [490, 120, 190], [620, 90, 220], [720, 110, 160], [840, 80, 250]];
const MID = [[0, 150, 190], [170, 110, 270], [300, 160, 210], [480, 120, 300], [620, 150, 230], [790, 120, 280]];
export const Street: React.FC<{ frame: number; w: number; h: number; speed?: number; dusk?: boolean }> = ({ frame, w, h, speed = 6, dusk }) => {
  const sky0 = dusk ? '#FFD3A8' : '#CFE8FF', sky1 = dusk ? '#FF9E7A' : '#F4FAFF';
  const far = dusk ? '#E9A58C' : '#BCD0E8', mid = dusk ? '#C9786A' : '#8FA9C9', win = dusk ? '#FFE9A8' : '#F4FAFF';
  const off = (k: number, period: number) => -((frame * speed * k) % period);
  const gid = dusk ? 'skyD' : 'skyN';
  const road = h - 100;
  return (
    <g>
      <defs><filter id="blurFar"><feGaussianBlur stdDeviation="2.2" /></filter><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky0} /><stop offset="1" stopColor={sky1} /></linearGradient></defs>
      <rect width={w} height={h} fill={`url(#${gid})`} />
      <circle cx={w * 0.78} cy={h * 0.2} r={46} fill={dusk ? '#FFF1C2' : '#FFE9A8'} />
      {[0, 1, 2].map((rep) => (
        <g key={'f' + rep} filter="url(#blurFar)" transform={`translate(${off(0.25, 960) + rep * 960} 0)`}>
          {FAR.map(([x, bw, bh], i) => <rect key={i} x={x} y={road - 20 - bh} width={bw} height={bh + 20} fill={far} />)}
        </g>
      ))}
      {[0, 1, 2].map((rep) => (
        <g key={'m' + rep} transform={`translate(${off(0.6, 960) + rep * 960} 0)`}>
          {MID.map(([x, bw, bh], i) => (
            <g key={i}>
              <rect x={x} y={road - 8 - bh} width={bw} height={bh + 8} fill={mid} stroke={K.ink} strokeWidth={4} />
              {Array.from({ length: Math.floor(bh / 46) }, (_, r) => Array.from({ length: Math.floor(bw / 44) }, (_, c) => (
                <rect key={r + '-' + c} x={x + 14 + c * 40} y={road - bh + 6 + r * 46} width={22} height={26} rx={3} fill={win} opacity={(r + c + i) % 3 === 0 ? 1 : 0.55} />
              )))}
            </g>
          ))}
        </g>
      ))}
      {/* sidewalk, road, dashes */}
      <rect y={road - 24} width={w} height={26} fill="#D9D2C2" />
      <rect y={road} width={w} height={100} fill="#3A3A42" />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={((i * 120 + off(1.5, 120)) % (w + 120)) - 40 + ((i * 120 + off(1.5, 120)) < -40 ? w + 120 : 0)} y={road + 46} width={64} height={8} rx={4} fill="#fff" opacity={0.8} />)}
      {/* lamp posts */}
      {[0, 1, 2, 3].map((i) => {
        const x = (((i * 360 + off(1.0, 1440)) % 1440) + 1440) % 1440 - 100;
        return <g key={i} transform={`translate(${x} ${road - 24})`}><rect x={-4} y={-190} width={8} height={190} fill={K.ink} /><rect x={-4} y={-192} width={44} height={8} fill={K.ink} /><circle cx={38} cy={-176} r={11} fill={K.gold} /></g>;
      })}
    </g>
  );
};

export const House: React.FC<{ x: number; y: number; s?: number; door?: number }> = ({ x, y, s = 1, door = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-170} y={-220} width={340} height={220} fill="#fff" stroke={K.ink} strokeWidth={7} />
    <path d="M-200 -220 L0 -330 L200 -220Z" fill={K.accent} stroke={K.ink} strokeWidth={7} strokeLinejoin="round" />
    <rect x={-130} y={-170} width={80} height={80} rx={8} fill="#CFE4FF" stroke={K.ink} strokeWidth={5} />
    <line x1={-90} y1={-170} x2={-90} y2={-90} stroke={K.ink} strokeWidth={4} /><line x1={-130} y1={-130} x2={-50} y2={-130} stroke={K.ink} strokeWidth={4} />
    <rect x={30} y={-150} width={100} height={150} rx={6} fill={door > 0.5 ? '#3B2A20' : '#8B5E3C'} stroke={K.ink} strokeWidth={5} />
    <circle cx={112} cy={-76} r={7} fill={K.gold} />
  </g>
);

export const Tower: React.FC<{ x: number; y: number; frame: number }> = ({ x, y, frame }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M-60 0 L0 -330 L60 0Z" fill="none" stroke={K.ink} strokeWidth={8} strokeLinejoin="round" />
    {[-60, -120, -190, -250].map((yy, i) => { const hw = 60 * (1 - -yy / 330); return <line key={i} x1={-hw} y1={yy} x2={hw} y2={yy} stroke={K.ink} strokeWidth={5} />; })}
    <circle cx={0} cy={-336} r={14} fill={K.accent} stroke={K.ink} strokeWidth={5} />
    {[0, 1, 2].map((i) => { const k = ((frame + i * 14) % 42) / 42; return <circle key={i} cx={0} cy={-336} r={20 + k * 90} fill="none" stroke={K.accent} strokeWidth={5} opacity={1 - k} />; })}
  </g>
);

// Full-bleed stage: the 1040x980 scene is scaled to the full 1080 width and the sky/wall above and floor/road below are extended.
export const Panel: React.FC<{ x?: number; y?: number; w?: number; h?: number; id: string; top?: string; bottom?: string; deco?: 'sky' | 'room' | 'none'; children: React.ReactNode }> = ({ id, top = '#CFE8FF', bottom = '#D9D2C2', deco = 'sky', children }) => {
  const f = useCurrentFrame();
  const SC = 1.2, TX = -(1040 * 1.2 - 1080) / 2, TY = 270;
  return (
    <g>
      <clipPath id={id}><rect width={1080} height={1920} /></clipPath>
      <g clipPath={`url(#${id})`}>
        <rect y={0} width={1080} height={TY + 20} fill={top} />
        <rect y={TY + 980 * SC - 4} width={1080} height={1920 - (TY + 980 * SC) + 8} fill={bottom} />
        {deco === 'sky' && [[120, 90, 1.0, 0.18], [700, 190, 1.3, 0.12], [420, 40, 0.8, 0.25], [900, 60, 0.9, 0.2]].map(([x, y, sc, sp], i) => (
          <g key={i} transform={`translate(${(((Number(x) + f * Number(sp) * 3) % 1500) + 1500) % 1500 - 200} ${y}) scale(${sc})`} opacity={0.9}>
            <ellipse cx={0} cy={0} rx={90} ry={30} fill="#fff" /><ellipse cx={-50} cy={10} rx={60} ry={24} fill="#fff" /><ellipse cx={55} cy={12} rx={64} ry={24} fill="#fff" />
          </g>
        ))}
        {deco === 'room' && <g opacity={0.9}>
          {[[150, 70], [700, 90]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}><rect width={190} height={150} rx={8} fill="#fff" stroke={K.ink} strokeWidth={6} /><rect x={14} y={14} width={162} height={122} fill={i ? '#F5D9B8' : '#CFE4FF'} /><path d={i ? 'M14 120 L70 70 L110 100 L150 60 L176 100 V136 H14Z' : 'M14 136 V90 H50 V60 H90 V100 H130 V70 H176 V136Z'} fill={i ? '#E0A97A' : '#9DB8E0'} /></g>)}
          <line x1={540} y1={0} x2={540} y2={110} stroke={K.ink} strokeWidth={5} /><path d="M470 150 L610 150 L580 110 L500 110Z" fill={K.gold} stroke={K.ink} strokeWidth={5} />
        </g>}
        <g transform={`translate(${TX} ${TY}) scale(${SC})`}>{children}</g>
      </g>
    </g>
  );
};

export const Bubble: React.FC<{ x: number; y: number; w?: number; h?: number; text: string; color?: string; size?: number }> = ({ x, y, w = 150, h = 120, text, color = K.accent, size = 80 }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="#fff" stroke={K.ink} strokeWidth={6} />
    <circle cx={-10} cy={h + 18} r={13} fill="#fff" stroke={K.ink} strokeWidth={5} /><circle cx={-34} cy={h + 44} r={8} fill="#fff" stroke={K.ink} strokeWidth={4} />
    <text x={w / 2} y={h / 2 + size * 0.34} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={size} fill={color}>{text}</text>
  </g>
);
