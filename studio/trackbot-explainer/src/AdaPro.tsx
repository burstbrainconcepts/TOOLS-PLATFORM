import React from 'react';
import type { Emotion } from './Character';

// Higher-detail "Ada": gradients, shaded hair, detailed eyes/lips, hands with fingers.
const INK = '#1B1B1F';
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const BROW: Record<Emotion, { raise: number; tilt: number }> = {
  neutral: { raise: 0, tilt: 0 }, happy: { raise: -6, tilt: -3 }, surprised: { raise: -20, tilt: -5 }, worried: { raise: -4, tilt: 10 },
};

const Hand: React.FC = () => (
  <g>
    <ellipse cx={0} cy={22} rx={21} ry={26} fill="url(#skin)" stroke={INK} strokeWidth={4} />
    <ellipse cx={-19} cy={14} rx={8} ry={15} transform="rotate(25 -19 14)" fill="url(#skin)" stroke={INK} strokeWidth={4} />
    {[-9, 0, 9].map((x) => <line key={x} x1={x} y1={34} x2={x} y2={46} stroke="#5E3416" strokeWidth={3} strokeLinecap="round" />)}
  </g>
);

const ProArm: React.FC<{ side: 1 | -1; a1: number; a2: number }> = ({ side, a1, a2 }) => (
  <g transform={`translate(${135 * side} 8) rotate(${a1})`}>
    <line x1={0} y1={0} x2={0} y2={150} stroke="#F0572F" strokeWidth={46} strokeLinecap="round" />
    <line x1={0} y1={0} x2={0} y2={150} stroke={INK} strokeWidth={3} strokeLinecap="round" opacity={0.15} />
    <g transform={`translate(0 150) rotate(${a2})`}>
      <line x1={0} y1={0} x2={0} y2={100} stroke="#9A6232" strokeWidth={34} strokeLinecap="round" />
      <rect x={-21} y={-4} width={42} height={16} rx={7} fill="#F5B820" stroke={INK} strokeWidth={4} />
      <g transform="translate(0 100)"><Hand /></g>
    </g>
  </g>
);

export const AdaPro: React.FC<{ mouth: number; emotion: Emotion; frame: number }> = ({ mouth, emotion, frame }) => {
  const bob = Math.sin(frame / 14) * 4;
  const tilt = Math.sin(frame / 37) * 2.2 + (emotion === 'worried' ? -3 : 0);
  const bp = (frame + 20) % 100;
  const blink = bp < 5 ? Math.abs(bp - 2.5) / 2.5 : 1;
  const look = Math.sin(frame / 50) * 4;
  const speaking = mouth > 0.12;
  const wave = Math.sin(frame / 9);
  const g = speaking ? 0.55 + 0.45 * Math.sin(frame / 20) : 0;
  const rA1 = lerp(-14, -112, g) + (speaking ? wave * 6 : 0);
  const rA2 = lerp(-12, -30, g) + (speaking ? wave * 10 : 0);
  const lA1 = 16 + Math.sin(frame / 31) * 2;
  const br = BROW[emotion];
  const w = 26 - mouth * 7;
  const h = 4 + mouth * 24;

  return (
    <g transform={`translate(0 ${bob})`}>
      <defs>
        <radialGradient id="skin" cx="45%" cy="38%" r="75%">
          <stop offset="0%" stopColor="#B7773F" /><stop offset="100%" stopColor="#7A4620" />
        </radialGradient>
        <linearGradient id="shirt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF7A55" /><stop offset="100%" stopColor="#E8431C" />
        </linearGradient>
        <radialGradient id="iris" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#8A5A2B" /><stop offset="100%" stopColor="#2A150A" />
        </radialGradient>
        <clipPath id="mouthClip"><ellipse cx={0} cy={58} rx={w} ry={h} /></clipPath>
      </defs>

      {/* back hair volume */}
      <g transform="translate(0 -190)">
        {[[-84, -82, 58], [84, -82, 58], [0, -128, 72], [-48, -122, 54], [48, -122, 54], [-96, -30, 40], [96, -30, 40]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#14100D" />
        ))}
        {[[-60, -128, 22], [30, -150, 18], [78, -100, 16], [-92, -76, 14]].map(([x, y, r], i) => (
          <path key={i} d={`M${x - r} ${y} Q${x} ${y - r} ${x + r} ${y}`} fill="none" stroke="#3A2A22" strokeWidth={6} strokeLinecap="round" />
        ))}
      </g>

      {/* torso with shading and folds */}
      <path d="M-150 20 Q-150 -30 -90 -38 L90 -38 Q150 -30 150 20 L160 420 L-160 420Z" fill="url(#shirt)" stroke={INK} strokeWidth={6} />
      <path d="M-60 60 Q-30 160 -40 300" fill="none" stroke="#B93212" strokeWidth={5} opacity={0.35} strokeLinecap="round" />
      <path d="M70 80 Q50 180 60 320" fill="none" stroke="#B93212" strokeWidth={5} opacity={0.35} strokeLinecap="round" />
      <path d="M-120 -10 Q-110 80 -118 200" fill="none" stroke="#fff" strokeWidth={8} opacity={0.18} strokeLinecap="round" />
      <path d="M-60 -38 Q0 38 60 -38 L40 -38 Q0 6 -40 -38Z" fill="#7A4620" opacity={0.55} />
      <path d="M-46 -34 Q0 32 46 -34" fill="none" stroke="#F5B820" strokeWidth={6} />
      <circle cx={0} cy={26} r={9} fill="#F5B820" stroke={INK} strokeWidth={3} />

      <ProArm side={-1} a1={lA1} a2={8} />
      <ProArm side={1} a1={rA1} a2={rA2} />

      {/* neck + shadow */}
      <rect x={-30} y={-84} width={60} height={56} fill="url(#skin)" stroke={INK} strokeWidth={5} />
      <path d="M-30 -80 Q0 -52 30 -80 L30 -62 Q0 -38 -30 -62Z" fill="#5E3416" opacity={0.45} />

      <g transform={`translate(0 -190) rotate(${tilt})`}>
        {/* ears + hoops */}
        {[-1, 1].map((s) => (
          <g key={s}>
            <ellipse cx={s * 102} cy={6} rx={14} ry={22} fill="url(#skin)" stroke={INK} strokeWidth={5} />
            <path d={`M${s * 100} 8 Q${s * 108} 12 ${s * 102} 18`} fill="none" stroke="#5E3416" strokeWidth={3} />
            <circle cx={s * 106} cy={34} r={11} fill="none" stroke="#F5B820" strokeWidth={5} />
          </g>
        ))}
        {/* face */}
        <ellipse cx={0} cy={0} rx={100} ry={112} fill="url(#skin)" stroke={INK} strokeWidth={6} />
        <path d="M-78 70 Q0 130 78 70 Q40 112 0 114 Q-40 112 -78 70Z" fill="#5E3416" opacity={0.25} />
        {/* hair front + band */}
        <path d="M-96 -34 Q-96 -116 0 -118 Q96 -116 96 -34 Q64 -80 0 -78 Q-64 -80 -96 -34Z" fill="#14100D" />
        <path d="M-90 -56 Q0 -104 90 -56" fill="none" stroke="#FF5A36" strokeWidth={9} strokeLinecap="round" />
        <path d="M-70 -84 Q-30 -100 10 -92" fill="none" stroke="#3A2A22" strokeWidth={5} strokeLinecap="round" />

        {/* eyes */}
        {[-38, 38].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy={-12} rx={18} ry={Math.max(2, 20 * blink)} fill="#fff" stroke={INK} strokeWidth={3.5} />
            {blink > 0.3 && (
              <>
                <circle cx={x + look} cy={-12} r={11} fill="url(#iris)" />
                <circle cx={x + look} cy={-12} r={5} fill={INK} />
                <circle cx={x + look + 4} cy={-17} r={3.5} fill="#fff" />
              </>
            )}
            <path d={`M${x - 20} -17 Q${x} -34 ${x + 20} -17`} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
            <path d={`M${x + (x < 0 ? -20 : 20)} -17 l${x < 0 ? -8 : 8} -7`} stroke={INK} strokeWidth={4} strokeLinecap="round" />
            <path d={`M${x - 16} 8 Q${x} 16 ${x + 16} 8`} fill="none" stroke="#5E3416" strokeWidth={3} opacity={0.5} />
          </g>
        ))}
        {/* tapered brows */}
        {[-1, 1].map((s) => (
          <path key={s} d={`M${s * 62} ${-46 + br.raise + br.tilt} Q${s * 38} ${-58 + br.raise} ${s * 14} ${-46 + br.raise - br.tilt} Q${s * 38} ${-52 + br.raise} ${s * 62} ${-46 + br.raise + br.tilt}Z`} fill="#14100D" stroke="#14100D" strokeWidth={4} strokeLinejoin="round" />
        ))}
        {/* nose */}
        <path d="M-5 -2 Q-12 26 -16 30 Q0 40 16 30 Q12 26 5 -2" fill="none" stroke="#5E3416" strokeWidth={3.5} strokeLinecap="round" opacity={0.7} />
        <ellipse cx={-9} cy={31} rx={4} ry={2.5} fill="#3A1F0C" opacity={0.6} /><ellipse cx={9} cy={31} rx={4} ry={2.5} fill="#3A1F0C" opacity={0.6} />
        {emotion !== 'worried' && [-1, 1].map((s) => <ellipse key={s} cx={s * 62} cy={36} rx={16} ry={9} fill="#FF5A36" opacity={emotion === 'happy' ? 0.32 : 0.16} />)}

        {/* mouth */}
        {mouth < 0.08 ? (
          <g>
            <path d={emotion === 'happy' ? 'M-30 54 Q0 84 30 54 Q0 66 -30 54Z' : emotion === 'worried' ? 'M-24 64 Q0 48 24 64 Q0 56 -24 64Z' : emotion === 'surprised' ? 'M-11 54 Q0 76 11 54 Q0 44 -11 54Z' : 'M-26 58 Q0 70 26 58 Q0 62 -26 58Z'} fill={emotion === 'happy' ? '#fff' : '#B0344F'} stroke="#8E2339" strokeWidth={5} strokeLinejoin="round" />
            {emotion === 'happy' && <path d="M-30 54 Q0 84 30 54" fill="none" stroke="#B0344F" strokeWidth={7} strokeLinecap="round" />}
          </g>
        ) : (
          <g>
            <ellipse cx={0} cy={58} rx={w} ry={h} fill="#4A1620" />
            <g clipPath="url(#mouthClip)">
              <rect x={-w} y={58 - h} width={w * 2} height={Math.min(10, h * 0.75)} fill="#fff" />
              <ellipse cx={0} cy={58 + h * 0.8} rx={w * 0.6} ry={h * 0.55} fill="#D9576B" />
            </g>
            <ellipse cx={0} cy={58} rx={w} ry={h} fill="none" stroke="#B0344F" strokeWidth={8} />
            <ellipse cx={0} cy={58} rx={w + 4} ry={h + 4} fill="none" stroke="#8E2339" strokeWidth={2.5} />
          </g>
        )}
      </g>
    </g>
  );
};
