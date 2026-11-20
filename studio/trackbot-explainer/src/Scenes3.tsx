import React from 'react';
import { Easing, interpolate, spring } from 'remotion';
import { FONT, Figure, K, Panel } from './Acting';

type P = { f: number };
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = (f: number, a: number, b: number, from = 0, to = 1) => interpolate(f, [a, b], [from, to], { ...clamp, easing: Easing.inOut(Easing.cubic) });
const S = (c: React.ReactNode) => <svg viewBox="0 0 1080 1920" width="100%" height="100%">{c}</svg>;

const Bank: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <Panel id={id} top="#EEE8D8" bottom="#D9D2C2" deco="room">
    <rect width={1040} height={980} fill="#EEE8D8" />
    <rect y={820} width={1040} height={160} fill="#D9D2C2" /><rect y={812} width={1040} height={10} fill="#C9C1AE" />
    {/* columns + arched windows */}
    {[110, 520, 930].map((x) => <g key={x}><rect x={x - 26} y={80} width={52} height={740} fill="#F7F2E6" stroke={K.ink} strokeWidth={6} /><rect x={x - 38} y={64} width={76} height={24} fill="#fff" stroke={K.ink} strokeWidth={6} /></g>)}
    <rect x={0} y={20} width={1040} height={48} fill={K.green} opacity={0.9} />
    <text x={520} y={56} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={32} letterSpacing={8} fill="#fff">VAULT ID BANK</text>
    {children}
  </Panel>
);
const Card: React.FC<{ x: number; y: number; title: string; amount: string; color?: string; w?: number }> = ({ x, y, title, amount, color = K.ink, w = 360 }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-w / 2} y={-100} width={w} height={200} rx={26} fill="#fff" stroke={color} strokeWidth={8} />
    <text x={0} y={-38} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={32} fill={K.muted}>{title}</text>
    <text x={0} y={52} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={92} fill={color}>{amount}</text>
  </g>
);
const Coin: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 28 }) => (
  <g><circle cx={x} cy={y} r={r} fill={K.gold} stroke={K.ink} strokeWidth={5} /><text x={x} y={y + r * 0.36} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={r * 1.1} fill={K.ink}>$</text></g>
);
const Bolt: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M20 -90 L-50 10 L-5 10 L-25 90 L50 -20 L5 -20Z" fill={K.accent} stroke={K.ink} strokeWidth={6} strokeLinejoin="round" />
);
const Lock: React.FC<{ x: number; y: number; s?: number; color?: string }> = ({ x, y, s = 1, color = K.green }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-50 -20 V-60 A50 50 0 0 1 50 -60 V-20" fill="none" stroke={K.ink} strokeWidth={14} />
    <rect x={-80} y={-20} width={160} height={130} rx={22} fill={color} stroke={K.ink} strokeWidth={8} />
    <circle cx={0} cy={38} r={16} fill="#fff" /><rect x={-5} y={44} width={10} height={34} fill="#fff" />
  </g>
);
const Pill: React.FC<{ x: number; y: number; w: number; t: string; c: string; size?: number }> = ({ x, y, w, t, c, size = 44 }) => (
  <g transform={`translate(${x} ${y})`}><rect x={-w / 2} y={-44} width={w} height={88} rx={44} fill={c} stroke={K.ink} strokeWidth={5} /><text x={0} y={size * 0.36} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={size} fill="#fff">{t}</text></g>
);
const SENDER = { skin: '#8D5524', hairStyle: 'puff' as const, shirt: K.blue };
const FRIEND = { skin: '#6B4226', hairStyle: 'short' as const, shirt: K.green };

export const MHook: React.FC<P & { mode?: 'tap' | 'crash' }> = ({ f, mode = 'tap' }) => {
  const k = mode === 'crash' ? 0.5 : (f % 70) / 70;
  const q = spring({ frame: f - 20, fps: 30, config: { damping: 7 } });
  return S(<Bank id="m1">
    <g transform="translate(230 900) scale(1.5)"><Figure frame={f} {...SENDER} emotion={mode === 'crash' ? 'worried' : 'neutral'} armR={46} armL={12} phone legL={5} legR={-5} /></g>
    <g transform="translate(830 900) scale(1.5)"><Figure frame={f} {...FRIEND} emotion="neutral" armR={12} armL={12} legL={5} legR={-5} /></g>
    <Coin x={350 + 330 * k} y={470 - 150 * Math.sin(k * Math.PI)} r={30} />
    {mode === 'crash' && <><g transform={`translate(520 330) scale(${q * 1.6})`}><Bolt x={0} y={0} /></g>
    <Pill x={520} y={165} w={480} t="app crashes?" c={K.accent} size={50} /></>}
  </Bank>);
};

export const MCheck: React.FC<P> = ({ f }) => {
  const pop = spring({ frame: f - 60, fps: 30, config: { damping: 9 } });
  return S(<Bank id="m2">
    <g transform="translate(850 810) scale(1.25)"><Figure frame={f} skin="#6B4226" hairStyle="short" shirt="#1B1B1F" emotion="happy" armR={20} armL={20} legL={0} legR={0} /></g>
    <rect x={640} y={650} width={380} height={170} rx={20} fill="#A87444" stroke={K.ink} strokeWidth={7} />
    <rect x={640} y={650} width={380} height={26} rx={10} fill="#8B5E3C" stroke={K.ink} strokeWidth={7} />
    <g transform="translate(200 900) scale(1.4)"><Figure frame={f} {...SENDER} emotion="neutral" armR={14} armL={14} phone legL={5} legR={-5} /></g>
    <Card x={300} y={290} title="BALANCE" amount="$500" w={280} />
    <text x={510} y={322} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={90} fill={K.ink}>≥</text>
    <Card x={720} y={290} title="SENDING" amount="$100" color={K.blue} w={280} />
    <g transform={`translate(510 520) scale(${pop})`}><circle r={70} fill={K.green} stroke={K.ink} strokeWidth={6} /><path d="M-32 4 L-8 30 L36 -24" fill="none" stroke="#fff" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" /></g>
  </Bank>);
};

export const MBegin: React.FC<P> = ({ f }) => {
  const steps = ['Check balance', 'Take money out', 'Write the record'];
  return S(<Bank id="m3">
    <g transform="translate(190 900) scale(1.55)"><Figure frame={f} skin="#8D5524" hairStyle="short" shirt="#1B1B1F" emotion="happy" armR={96} armL={12} legL={5} legR={-5} /></g>
    <g opacity={ease(f, 5, 25)}>
      <rect x={400} y={190} width={600} height={560} rx={34} fill="#fff" opacity={0.7} stroke={K.blue} strokeWidth={9} strokeDasharray="28 16" />
      <rect x={560} y={152} width={280} height={74} rx={37} fill={K.blue} stroke={K.ink} strokeWidth={5} /><text x={700} y={204} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={44} fill="#fff">BEGIN</text>
    </g>
    {steps.map((t, i) => { const a = ease(f, 30 + i * 22, 48 + i * 22); return (
      <g key={i} opacity={a} transform={`translate(0 ${24 * (1 - a)})`}><rect x={440} y={270 + i * 140} width={520} height={104} rx={22} fill="#fff" stroke={K.ink} strokeWidth={6} /><text x={480} y={336 + i * 140} fontFamily={FONT} fontWeight={800} fontSize={40} fill={K.ink}>{i + 1}. {t}</text></g>); })}
    <Pill x={700} y={830} w={520} t="ALL or NOTHING" c={K.accent} size={46} />
  </Bank>);
};

export const MDebit: React.FC<P> = ({ f }) => {
  const bal = Math.round(ease(f, 25, 70, 500, 400));
  const row = ease(f, 80, 105);
  const tap = ease(f, 10, 20) * (1 - ease(f, 24, 34));
  return S(<Bank id="m4">
    <g transform="translate(220 900) scale(1.5)"><Figure frame={f} {...SENDER} emotion="neutral" armR={60 + tap * -8} armL={12} phone legL={5} legR={-5} /></g>
    <Card x={680} y={250} title="YOUR BALANCE" amount={`$${bal}`} />
    <Coin x={680} y={250 + ease(f, 25, 70, 0, 250)} r={32} />
    <g opacity={row} transform={`translate(0 ${24 * (1 - row)})`}>
      <rect x={470} y={560} width={520} height={160} rx={26} fill="#fff" stroke={K.ink} strokeWidth={7} />
      <text x={500} y={630} fontFamily={FONT} fontWeight={800} fontSize={42} fill={K.ink}>- $100  Transfer</text>
      <text x={500} y={684} fontFamily={FONT} fontWeight={700} fontSize={32} fill={K.muted}>history record saved</text>
      <rect x={810} y={596} width={150} height={56} rx={28} fill={K.green} /><text x={885} y={636} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={30} fill="#fff">done</text>
    </g>
  </Bank>);
};

export const MRollback: React.FC<P> = ({ f }) => {
  const crash = f >= 55 && f < 100;
  const bal = f < 55 ? Math.round(ease(f, 5, 45, 500, 400)) : f < 100 ? 400 : Math.round(ease(f, 100, 140, 400, 500));
  const flash = crash ? (f % 10 < 5 ? 1 : 0.35) : 0;
  const back = ease(f, 100, 118);
  return S(<Bank id="m5">
    <g transform="translate(220 900) scale(1.5)"><Figure frame={f} {...SENDER} emotion={f < 55 ? 'neutral' : f < 100 ? 'surprised' : 'happy'} armR={f < 55 ? 60 : f < 100 ? 130 : 20} armL={f < 55 ? 12 : f < 100 ? 130 : 12} phone={f < 55} legL={5} legR={-5} /></g>
    <Card x={680} y={250} title="YOUR BALANCE" amount={`$${bal}`} color={crash ? K.accent : K.ink} />
    <g opacity={flash}><Bolt x={680} y={520} s={1.9} /></g>
    <g opacity={back} transform="translate(680 760)"><Pill x={0} y={0} w={500} t="↺ ROLLBACK" c={K.accent} size={54} /></g>
  </Bank>);
};

export const MCommit: React.FC<P> = ({ f }) => {
  const s = spring({ frame: f - 25, fps: 30, config: { damping: 10 } });
  return S(<Bank id="m6">
    <g transform="translate(200 900) scale(1.5)"><Figure frame={f} {...SENDER} emotion="happy" armR={150} armL={12} legL={5} legR={-5} /></g>
    <Card x={700} y={260} title="YOUR BALANCE" amount="$400" color={K.green} />
    <Lock x={700} y={520} s={1.5 * s} />
    <Pill x={700} y={820} w={460} t="✓ COMMIT" c={K.green} size={56} />
  </Bank>);
};
