import React from 'react';
import { AdaPro } from './AdaPro';

export type CharacterType = 'ada' | 'tunde' | 'bolt';
export type Emotion = 'neutral' | 'happy' | 'surprised' | 'worried';
export const CHARACTERS: Record<CharacterType, { name: string; voice: string }> = {
  ada: { name: 'ADA', voice: 'en_US-lessac-medium' },
  tunde: { name: 'TUNDE', voice: 'en_US-ryan-high' },
  bolt: { name: 'BOLT', voice: 'en_GB-alan-medium' },
};

const INK = '#1B1B1F';
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Props = { type: CharacterType; mouth: number; emotion: Emotion; frame: number };

// Brow shape per emotion: [outer y, inner y, extra raise]
const BROWS: Record<Emotion, { raise: number; tilt: number }> = {
  neutral: { raise: 0, tilt: 0 },
  happy: { raise: -6, tilt: -2 },
  surprised: { raise: -20, tilt: -4 },
  worried: { raise: -4, tilt: 9 },
};

const Arm: React.FC<{ side: 1 | -1; a1: number; a2: number; sleeve: string; skin: string; robot?: boolean }> = ({ side, a1, a2, sleeve, skin, robot }) => (
  <g transform={`translate(${135 * side} 8) rotate(${a1})`}>
    <line x1={0} y1={0} x2={0} y2={150} stroke={sleeve} strokeWidth={robot ? 38 : 42} strokeLinecap="round" />
    <g transform={`translate(0 150) rotate(${a2})`}>
      <line x1={0} y1={0} x2={0} y2={118} stroke={robot ? '#D9D2C2' : skin} strokeWidth={robot ? 30 : 34} strokeLinecap="round" />
      <circle cx={0} cy={128} r={robot ? 24 : 26} fill={robot ? '#D9D2C2' : skin} stroke={INK} strokeWidth={5} />
    </g>
  </g>
);

const Basic: React.FC<Props> = ({ type, mouth, emotion, frame }) => {
  const robot = type === 'bolt';
  const skin = type === 'ada' ? '#8D5524' : '#6B4226';
  const top = type === 'ada' ? '#FF5A36' : type === 'tunde' ? '#2B6CFF' : '#2B6CFF';
  const speaking = mouth > 0.12;
  const bob = Math.sin(frame / 14) * 4;
  const tilt = Math.sin(frame / 37) * 2.2 + (emotion === 'worried' ? -3 : 0);
  // blink for 5 frames about every 100 frames, offset by character
  const bp = (frame + (type === 'ada' ? 20 : type === 'tunde' ? 55 : 0)) % 100;
  const blink = bp < 5 ? Math.abs(bp - 2.5) / 2.5 : 1;
  const look = Math.sin(frame / 50) * 4;
  const wave = Math.sin(frame / 9);
  const g = speaking ? 0.55 + 0.45 * Math.sin(frame / 20) : 0;
  const rA1 = lerp(-14, -112, g) + (speaking ? wave * 6 : 0);
  const rA2 = lerp(-12, -30, g) + (speaking ? wave * 10 : 0);
  const lA1 = 16 + Math.sin(frame / 31) * 2;
  const br = BROWS[emotion];

  return (
    <g transform={`translate(0 ${bob})`}>
      {/* torso */}
      <path d="M-150 20 Q-150 -30 -90 -38 L90 -38 Q150 -30 150 20 L160 420 L-160 420Z" fill={top} stroke={INK} strokeWidth={6} />
      {robot && <rect x={-60} y={60} width={120} height={80} rx={18} fill="#fff" stroke={INK} strokeWidth={5} />}
      {robot && [0, 1, 2].map((i) => <circle key={i} cx={-30 + i * 30} cy={100} r={9} fill={i === (Math.floor(frame / 10) % 3) ? '#FF5A36' : '#D9D2C2'} />)}
      {!robot && type === 'tunde' && <path d="M-40 -38 L0 10 L40 -38" fill="#fff" stroke={INK} strokeWidth={5} />}
      {!robot && type === 'ada' && <path d="M-46 -36 Q0 24 46 -36" fill="none" stroke="#F5B820" strokeWidth={7} />}
      <Arm side={-1} a1={lA1} a2={8} sleeve={top} skin={skin} robot={robot} />
      <Arm side={1} a1={rA1} a2={rA2} sleeve={top} skin={skin} robot={robot} />

      {/* neck */}
      {!robot && <rect x={-30} y={-80} width={60} height={50} fill={skin} stroke={INK} strokeWidth={5} />}
      {robot && <rect x={-26} y={-76} width={52} height={44} fill="#D9D2C2" stroke={INK} strokeWidth={5} />}

      {/* head */}
      <g transform={`translate(0 -190) rotate(${tilt})`}>
        {type === 'ada' && (
          <g>
            {[[-70, -92, 52], [70, -92, 52], [0, -122, 64], [-38, -118, 48], [38, -118, 48]].map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} fill="#17120F" />
            ))}
          </g>
        )}
        {!robot ? (
          <>
            <ellipse cx={-102} cy={6} rx={14} ry={22} fill={skin} stroke={INK} strokeWidth={5} />
            <ellipse cx={102} cy={6} rx={14} ry={22} fill={skin} stroke={INK} strokeWidth={5} />
            <ellipse cx={0} cy={0} rx={100} ry={112} fill={skin} stroke={INK} strokeWidth={6} />
            {type === 'ada' && <path d="M-94 -40 Q0 -128 94 -40 Q70 -92 0 -94 Q-70 -92 -94 -40Z" fill="#17120F" />}
            {type === 'tunde' && <path d="M-98 -34 Q-96 -112 0 -114 Q96 -112 98 -34 Q70 -72 0 -70 Q-70 -72 -98 -34Z" fill="#14100D" stroke={INK} strokeWidth={4} />}
            {/* eyes */}
            {[-38, 38].map((x) => (
              <g key={x}>
                <ellipse cx={x} cy={-12} rx={17} ry={19 * blink + 1} fill="#fff" stroke={INK} strokeWidth={4} />
                {blink > 0.3 && <circle cx={x + look} cy={-12} r={8} fill={INK} />}
                {type === 'ada' && <path d={`M${x - 18} -24 Q${x} -36 ${x + 18} -24`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />}
              </g>
            ))}
            {/* glasses */}
            {type === 'tunde' && (
              <g fill="none" stroke={INK} strokeWidth={6}>
                <circle cx={-38} cy={-12} r={27} /><circle cx={38} cy={-12} r={27} /><line x1={-11} y1={-12} x2={11} y2={-12} />
              </g>
            )}
            {/* brows */}
            <path d={`M${-60} ${-44 + br.raise + br.tilt} Q${-38} ${-54 + br.raise} ${-16} ${-44 + br.raise - br.tilt}`} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
            <path d={`M${60} ${-44 + br.raise + br.tilt} Q${38} ${-54 + br.raise} ${16} ${-44 + br.raise - br.tilt}`} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
            <path d="M-6 8 Q0 20 8 8" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
            {/* mouth */}
            {mouth < 0.08 ? (
              <path d={emotion === 'happy' ? 'M-30 52 Q0 82 30 52' : emotion === 'worried' ? 'M-24 62 Q0 46 24 62' : emotion === 'surprised' ? 'M-10 56 Q0 70 10 56 Q0 46 -10 56Z' : 'M-24 58 Q0 66 24 58'} fill={emotion === 'surprised' ? '#3B1010' : 'none'} stroke={INK} strokeWidth={6} strokeLinecap="round" />
            ) : (
              <g>
                <ellipse cx={0} cy={58} rx={26 - mouth * 8} ry={5 + mouth * 24} fill="#3B1010" stroke={INK} strokeWidth={5} />
                <ellipse cx={0} cy={58 + mouth * 14} rx={14} ry={Math.max(2, mouth * 9)} fill="#D9576B" />
              </g>
            )}
            {emotion === 'happy' && [-1, 1].map((s) => <ellipse key={s} cx={s * 62} cy={36} rx={14} ry={8} fill="#FF5A36" opacity={0.28} />)}
          </>
        ) : (
          <>
            <line x1={0} y1={-112} x2={0} y2={-150} stroke={INK} strokeWidth={7} />
            <circle cx={0} cy={-158} r={14} fill={emotion === 'surprised' ? '#FF5A36' : '#2B6CFF'} stroke={INK} strokeWidth={5} />
            <rect x={-108} y={-104} width={216} height={200} rx={56} fill="#D9D2C2" stroke={INK} strokeWidth={6} />
            <rect x={-82} y={-62} width={164} height={80} rx={34} fill={INK} />
            {[-38, 38].map((x) => (
              <rect key={x} x={x - 20} y={-22 - 16 * blink + (emotion === 'happy' ? 6 : 0)} width={40} height={Math.max(4, 28 * blink) - (emotion === 'happy' ? 10 : 0)} rx={14} fill="#3DE0FF" />
            ))}
            <path d={`M-70 ${-74 + br.raise} L-16 ${-74 + br.raise + br.tilt}`} stroke="#3DE0FF" strokeWidth={6} strokeLinecap="round" />
            <path d={`M70 ${-74 + br.raise} L16 ${-74 + br.raise + br.tilt}`} stroke="#3DE0FF" strokeWidth={6} strokeLinecap="round" />
            {/* LED mouth bars */}
            {[-48, -24, 0, 24, 48].map((x, i) => {
              const h = mouth < 0.08 ? (emotion === 'happy' ? 6 + Math.abs(i - 2) * 2 : 6) : 6 + mouth * 34 * (0.55 + 0.45 * Math.sin(frame / 3 + i * 1.7));
              return <rect key={x} x={x - 7} y={58 - h / 2} width={14} height={h} rx={7} fill="#2B6CFF" stroke={INK} strokeWidth={3} />;
            })}
            <circle cx={-84} cy={20} r={10} fill="#FF5A36" opacity={emotion === 'happy' ? 0.8 : 0.25} />
            <circle cx={84} cy={20} r={10} fill="#FF5A36" opacity={emotion === 'happy' ? 0.8 : 0.25} />
          </>
        )}
      </g>
    </g>
  );
};

export const Character: React.FC<Props> = (p) =>
  p.type === 'ada' ? <AdaPro mouth={p.mouth} emotion={p.emotion} frame={p.frame} /> : <Basic {...p} />;

const Room: React.FC<{ frame: number }> = ({ frame }) => (
  <g>
    {/* wall panel + floor */}
    <rect x={24} y={10} width={1032} height={520} rx={36} fill="#F1EBDD" />
    <rect x={24} y={478} width={1032} height={52} rx={26} fill="#D9D2C2" />
    <rect x={24} y={478} width={1032} height={10} fill="#C9C1AE" />
    {/* window with skyline */}
    <g transform="translate(70 70)">
      <rect width={470} height={330} rx={18} fill="#CFE4FF" stroke="#1B1B1F" strokeWidth={6} />
      <path d="M0 330 V250 H50 V200 H110 V260 H160 V170 H230 V240 H290 V210 H350 V270 H410 V230 H470 V330Z" fill="#9DB8E0" />
      <path d="M0 330 V290 H70 V250 H140 V300 H220 V260 H300 V300 H380 V270 H470 V330Z" fill="#7F9CCB" />
      <circle cx={380} cy={70} r={30} fill="#FFE9A8" />
      <line x1={235} y1={0} x2={235} y2={330} stroke="#1B1B1F" strokeWidth={6} /><line x1={0} y1={165} x2={470} y2={165} stroke="#1B1B1F" strokeWidth={6} />
    </g>
    {/* shelf with books, plant, lamp */}
    <g transform="translate(640 40)">
      <rect x={0} y={150} width={380} height={12} rx={6} fill="#8B5E3C" />
      {[['#FF5A36', 0], ['#2B6CFF', 28], ['#F5B820', 56], ['#1FA66A', 84]].map(([c, x], i) => (
        <rect key={i} x={Number(x) + 8} y={92 - (i % 2) * 14} width={24} height={58 + (i % 2) * 14} rx={3} fill={String(c)} stroke="#1B1B1F" strokeWidth={3} />
      ))}
      <g transform="translate(250 150)">
        <path d="M-30 0 L-22 -50 H22 L30 0Z" fill="#C9722E" stroke="#1B1B1F" strokeWidth={4} />
        {[[-24, -90, -30], [0, -110, 0], [24, -88, 30]].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx={14} ry={38} transform={`rotate(${Number(r) + Math.sin(frame / 40 + i) * 3} ${x} -50)`} fill="#1FA66A" stroke="#1B1B1F" strokeWidth={3} />
        ))}
      </g>
      <g transform="translate(340 150)">
        <rect x={-6} y={-60} width={12} height={60} fill="#1B1B1F" /><path d="M-30 -60 L30 -60 L18 -100 H-18Z" fill="#F5B820" stroke="#1B1B1F" strokeWidth={4} />
      </g>
    </g>
    {/* wall clock + framed pin picture */}
    <g transform="translate(700 270)">
      <circle r={54} fill="#fff" stroke="#1B1B1F" strokeWidth={6} />
      <line x1={0} y1={0} x2={0} y2={-34} stroke="#1B1B1F" strokeWidth={6} strokeLinecap="round" transform={`rotate(${(frame / 30) * 6})`} />
      <line x1={0} y1={0} x2={0} y2={-22} stroke="#FF5A36" strokeWidth={7} strokeLinecap="round" transform={`rotate(${(frame / 30) * 0.5})`} />
      <circle r={5} fill="#1B1B1F" />
    </g>
    <g transform="translate(850 220)">
      <rect width={150} height={130} rx={10} fill="#fff" stroke="#1B1B1F" strokeWidth={6} />
      <path d="M75 100 C55 75 52 62 52 54 A23 23 0 1 1 98 54 C98 62 95 75 75 100Z" fill="#FF5A36" /><circle cx={75} cy={54} r={8} fill="#fff" />
    </g>
  </g>
);

export const Host: React.FC<Props> = (p) => (
  <svg viewBox="0 0 1080 540" width="100%" height="100%">
    <Room frame={p.frame} />
    <g transform="translate(330 425)">
      <Character {...p} />
    </g>
    <g transform="translate(790 440)">
      <rect x={0} y={0} width={210} height={64} rx={32} fill="#1B1B1F" />
      <text x={105} y={44} textAnchor="middle" fontFamily='"Helvetica Neue", Arial, sans-serif' fontWeight={900} fontSize={34} letterSpacing={4} fill="#FBF7EF">{CHARACTERS[p.type].name}</text>
    </g>
  </svg>
);
