import React from 'react';
import { spring } from 'remotion';
import data from './data-money.json';
import { C, FONT, Label, ease, makeVideo } from './Video';

type P = { f: number };
const Card: React.FC<{ x: number; y: number; title: string; amount: string; color?: string; w?: number }> = ({ x, y, title, amount, color = C.ink, w = 380 }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-w / 2} y={-110} width={w} height={220} rx={26} fill="#fff" stroke={color} strokeWidth={8} />
    <text x={0} y={-45} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={34} fill={C.muted}>{title}</text>
    <text x={0} y={55} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={96} fill={color}>{amount}</text>
  </g>
);
const Coin: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 30 }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#F5B820" stroke={C.ink} strokeWidth={5} />
    <text x={x} y={y + r * 0.35} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={r * 1.1} fill={C.ink}>$</text>
  </g>
);
const Bolt: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M20 -90 L-50 10 L-5 10 L-25 90 L50 -20 L5 -20Z" fill={C.accent} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
);
const Lock: React.FC<{ x: number; y: number; s?: number; color?: string }> = ({ x, y, s = 1, color = C.green }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-50 -20 V-60 A50 50 0 0 1 50 -60 V-20" fill="none" stroke={C.ink} strokeWidth={14} />
    <rect x={-80} y={-20} width={160} height={130} rx={22} fill={color} stroke={C.ink} strokeWidth={8} />
    <circle cx={0} cy={38} r={16} fill="#fff" />
    <rect x={-5} y={44} width={10} height={34} fill="#fff" />
  </g>
);
const W = (c: React.ReactNode) => (
  <svg viewBox="0 0 1080 1500" width="100%" height="100%">{c}</svg>
);

const Hook: React.FC<P> = ({ f }) => {
  const k = (f % 80) / 80;
  const q = spring({ frame: f - 10, fps: 30, config: { damping: 8 } });
  return W(
    <>
      <Card x={250} y={700} title="YOU" amount="$500" />
      <Card x={830} y={700} title="FRIEND" amount="$?" color={C.blue} w={300} />
      <Coin x={420 + 220 * k} y={700 - 90 * Math.sin(k * Math.PI)} />
      <g transform={`translate(540 480) scale(${q})`}>
        <Bolt x={0} y={0} s={1.3} />
      </g>
      <Label x={540} y={1000} t="app crashes?" size={56} color={C.accent} />
    </>
  );
};

const Check: React.FC<P> = ({ f }) => {
  const pop = spring({ frame: f - 90, fps: 30, config: { damping: 9 } });
  return W(
    <>
      <Card x={300} y={600} title="BALANCE" amount="$500" />
      <Card x={780} y={600} title="SENDING" amount="$100" color={C.blue} w={340} />
      <text x={540} y={640} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={110} fill={C.ink}>≥</text>
      <g transform={`translate(540 1000) scale(${pop})`}>
        <circle r={90} fill={C.green} />
        <path d="M-40 5 L-10 38 L45 -30" fill="none" stroke="#fff" strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Label x={540} y={1200} t="enough money" size={52} color={C.green} />
    </>
  );
};

const Begin: React.FC<P> = ({ f }) => {
  const steps = ['Check balance', 'Take money out', 'Write the record'];
  const o = ease(f, 5, 30);
  return W(
    <>
      <g opacity={o}>
        <rect x={140} y={300} width={800} height={720} rx={36} fill="none" stroke={C.blue} strokeWidth={10} strokeDasharray="30 18" />
        <rect x={340} y={262} width={400} height={80} rx={40} fill={C.blue} />
        <text x={540} y={318} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={48} fill="#fff">BEGIN</text>
      </g>
      {steps.map((t, i) => {
        const a = ease(f, 40 + i * 25, 60 + i * 25);
        return (
          <g key={i} opacity={a} transform={`translate(0 ${30 * (1 - a)})`}>
            <rect x={220} y={420 + i * 170} width={640} height={120} rx={24} fill="#fff" stroke={C.ink} strokeWidth={7} />
            <text x={260} y={498 + i * 170} fontFamily={FONT} fontWeight={800} fontSize={44} fill={C.ink}>{i + 1}. {t}</text>
          </g>
        );
      })}
      <Label x={540} y={1180} t="ALL or NOTHING" size={72} color={C.accent} />
    </>
  );
};

const Debit: React.FC<P> = ({ f }) => {
  const bal = Math.round(ease(f, 30, 90, 500, 400));
  const row = ease(f, 100, 130);
  return W(
    <>
      <Card x={540} y={420} title="YOUR BALANCE" amount={`$${bal}`} />
      <Coin x={540} y={420 + ease(f, 30, 90, 0, 260)} />
      <g opacity={row} transform={`translate(0 ${30 * (1 - row)})`}>
        <rect x={140} y={760} width={800} height={150} rx={26} fill="#fff" stroke={C.ink} strokeWidth={7} />
        <text x={180} y={826} fontFamily={FONT} fontWeight={800} fontSize={42} fill={C.ink}>- $100  Transfer</text>
        <text x={180} y={880} fontFamily={FONT} fontWeight={700} fontSize={34} fill={C.muted}>history record saved</text>
        <rect x={730} y={800} width={170} height={60} rx={30} fill={C.green} />
        <text x={815} y={842} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={30} fill="#fff">done</text>
      </g>
    </>
  );
};

const Rollback: React.FC<P> = ({ f }) => {
  const crash = f >= 70;
  const bal = f < 70 ? Math.round(ease(f, 10, 60, 500, 400)) : Math.round(ease(f, 130, 190, 400, 500));
  const flash = crash && f < 125 ? (f % 12 < 6 ? 1 : 0.4) : 0;
  const back = ease(f, 130, 150);
  return W(
    <>
      <Card x={540} y={420} title="YOUR BALANCE" amount={`$${bal}`} color={crash && f < 130 ? C.accent : C.ink} />
      <g opacity={flash}>
        <Bolt x={540} y={760} s={1.8} />
      </g>
      <g opacity={back} transform="translate(540 1000)">
        <rect x={-250} y={-60} width={500} height={120} rx={60} fill={C.accent} />
        <text x={0} y={22} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={60} fill="#fff">ROLLBACK</text>
      </g>
    </>
  );
};

const Commit: React.FC<P> = ({ f }) => {
  const s = spring({ frame: f - 40, fps: 30, config: { damping: 10 } });
  return W(
    <>
      <Card x={540} y={420} title="YOUR BALANCE" amount="$400" color={C.green} />
      <Lock x={540} y={760} s={1.5 * s} />
      <rect x={290} y={1060} width={500} height={110} rx={55} fill={C.green} />
      <text x={540} y={1136} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={58} fill="#fff">COMMIT</text>
    </>
  );
};

const Outro: React.FC<P & { brand: string; cta: string }> = ({ f, brand, cta }) => {
  const s = spring({ frame: f - 5, fps: 30, config: { damping: 11 } });
  return W(
    <>
      <Lock x={540} y={470} s={1.9 * s} />
      <Label x={540} y={900} t={brand} size={110} />
      <rect x={160} y={1020} width={760} height={120} rx={60} fill={C.accent} />
      <text x={540} y={1100} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={56} fill="#fff">Comment "{cta}"</text>
    </>
  );
};

export const MoneyVideo = makeVideo(data as any, (kind, f, e) => {
  switch (kind) {
    case 'hook': return <Hook f={f} />;
    case 'check': return <Check f={f} />;
    case 'begin': return <Begin f={f} />;
    case 'debit': return <Debit f={f} />;
    case 'rollback': return <Rollback f={f} />;
    case 'commit': return <Commit f={f} />;
    default: return <Outro f={f} {...e} />;
  }
});
export const moneyData = data;
