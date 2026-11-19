import React from 'react';
import { Easing, interpolate, spring } from 'remotion';
import { Bubble, FONT, Figure, House, K, Panel, Rider, Street, Tower } from './Acting';

type P = { f: number };
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = (f: number, a: number, b: number, from = 0, to = 1) => interpolate(f, [a, b], [from, to], { ...clamp, easing: Easing.inOut(Easing.cubic) });
const S = (c: React.ReactNode) => <svg viewBox="0 0 1080 1000" width="100%" height="100%">{c}</svg>;

const PhoneUI: React.FC<{ x: number; y: number; s: number; children: React.ReactNode; glow?: boolean }> = ({ x, y, s, children, glow }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-130} y={-230} width={260} height={460} rx={36} fill="#fff" stroke={glow ? K.accent : K.ink} strokeWidth={8} />
    <rect x={-30} y={-212} width={60} height={10} rx={5} fill={K.ink} />
    {children}
  </g>
);

const Room: React.FC<{ w: number; h: number; dusk?: boolean; f: number }> = ({ w, h, dusk, f }) => (
  <g>
    <rect width={w} height={h} fill="#F1EBDD" />
    <rect y={h - 80} width={w} height={80} fill="#D9D2C2" /><rect y={h - 84} width={w} height={8} fill="#C9C1AE" />
    <g transform={`translate(${w - 330} 50)`}>
      <rect width={250} height={200} rx={14} fill={dusk ? '#FFB08A' : '#CFE4FF'} stroke={K.ink} strokeWidth={6} />
      <path d="M0 200 V140 H40 V105 H90 V150 H130 V90 H190 V140 H250 V200Z" fill={dusk ? '#C9786A' : '#9DB8E0'} />
      <line x1={125} y1={0} x2={125} y2={200} stroke={K.ink} strokeWidth={6} /><line x1={0} y1={100} x2={250} y2={100} stroke={K.ink} strokeWidth={6} />
    </g>
    <g transform={`translate(${w - 440} 120)`}>
      <circle r={40} fill="#fff" stroke={K.ink} strokeWidth={5} />
      <line x1={0} y1={0} x2={0} y2={-26} stroke={K.ink} strokeWidth={5} strokeLinecap="round" transform={`rotate(${(f / 30) * 6})`} />
      <line x1={0} y1={0} x2={0} y2={-16} stroke={K.accent} strokeWidth={6} strokeLinecap="round" transform={`rotate(${(f / 30) * 0.5})`} /><circle r={4} fill={K.ink} />
    </g>
  </g>
);

export const Hook: React.FC<P> = ({ f }) => {
  const q = spring({ frame: f - 25, fps: 30, config: { damping: 7 } });
  const lines = [0, 1, 2, 3].map((i) => ({ y: 330 + i * 34, o: ((f * 14 + i * 90) % 260) }));
  return S(<>
    <Panel x={20} y={10} w={1040} h={500} id="h1">
      <Street frame={f} w={1040} h={500} speed={7} dusk />
      {lines.map((l, i) => <line key={i} x1={300 - l.o} y1={l.y} x2={360 - l.o + 40} y2={l.y} stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.7} />)}
      <g transform="translate(560 476) scale(1.0)"><Rider frame={f} /></g>
    </Panel>
    <Panel x={20} y={530} w={1040} h={460} id="h2">
      <Room w={1040} h={460} dusk f={f} />
      <rect x={600} y={240} width={380} height={150} rx={34} fill="#8FA9C9" stroke={K.ink} strokeWidth={6} />
      <rect x={620} y={190} width={340} height={80} rx={30} fill="#7F9CCB" stroke={K.ink} strokeWidth={6} />
      <g transform="translate(300 440) scale(1.2)">
        <Figure frame={f} skin="#8D5524" hairStyle="puff" shirt={K.blue} emotion="worried" armR={44} armL={14} phone legL={5} legR={-5} />
      </g>
      <g transform={`translate(470 20) scale(${q})`}><Bubble x={0} y={0} w={190} h={140} text="?" /></g>
    </Panel>
  </>);
};

export const Start: React.FC<P> = ({ f }) => {
  const press = ease(f, 40, 58) * (1 - ease(f, 64, 78));
  const pop = spring({ frame: f - 85, fps: 30, config: { damping: 12 } });
  const allow = ease(f, 140, 150) * (1 - ease(f, 155, 165));
  const ring = ((f - 40) % 60) / 60;
  return S(<>
    <Panel x={20} y={10} w={1040} h={980} id="s1">
      <Street frame={f} w={1040} h={980} speed={0} />
      <rect y={800} width={1040} height={180} fill="#D9D2C2" />
      <g transform="translate(250 930) scale(1.55)">
        <Figure frame={f} skin="#6B4226" hairStyle="helmet" shirt={K.accent} emotion="happy" armR={102} armL={10} legL={6} legR={-6} />
      </g>
      <PhoneUI x={730} y={470} s={1.55} glow>
        <text x={0} y={-130} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={28} fill={K.ink}>Delivery #204</text>
        <rect x={-95} y={-90} width={190} height={14} rx={7} fill={K.muted} /><rect x={-95} y={-60} width={130} height={14} rx={7} fill={K.muted} />
        <g transform={`scale(${1 - 0.06 * press})`}><rect x={-100} y={60} width={200} height={64} rx={32} fill={K.accent} /><text x={0} y={103} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={30} fill="#fff">START</text></g>
        {f >= 40 && f < 100 && <circle cx={0} cy={92} r={30 + ring * 60} fill="none" stroke={K.accent} strokeWidth={5} opacity={1 - ring} />}
        <g transform={`translate(0 40) scale(${pop})`} opacity={pop > 0.05 ? 1 : 0}>
          <rect x={-110} y={-90} width={220} height={190} rx={22} fill="#fff" stroke={K.ink} strokeWidth={5} />
          <path d="M0 -10 C-22 -40 -24 -54 -24 -62 A24 24 0 1 1 24 -62 C24 -54 22 -40 0 -10Z" fill={K.accent} /><circle cx={0} cy={-62} r={8} fill="#fff" />
          <text x={0} y={30} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={19} fill={K.ink}>Share your location?</text>
          <rect x={-86} y={50} width={172} height={36} rx={18} fill={allow > 0.3 ? K.green : K.blue} /><text x={0} y={76} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={20} fill="#fff">Allow</text>
        </g>
      </PhoneUI>
    </Panel>
  </>);
};

export const Gps: React.FC<P> = ({ f }) => {
  const sats: [number, number][] = [[170, 120], [520, 70], [870, 120]];
  return S(<>
    <Panel x={20} y={10} w={1040} h={980} id="g1">
      <Street frame={f} w={1040} h={980} speed={3} />
      {sats.map(([x, y], i) => {
        const k = ((f + i * 16) % 60) / 60;
        const tx = 520, ty = 440;
        return (
          <g key={i}>
            <line x1={x} y1={y + 34} x2={tx} y2={ty} stroke={K.blue} strokeWidth={5} strokeDasharray="6 18" opacity={0.55} />
            <circle cx={x + (tx - x) * k} cy={y + 34 + (ty - y - 34) * k} r={13} fill={K.blue} />
            <g transform={`translate(${x} ${y + Math.sin(f / 20 + i) * 6})`}>
              <rect x={-28} y={-28} width={56} height={56} rx={9} fill={K.blue} stroke={K.ink} strokeWidth={5} />
              <rect x={-96} y={-12} width={54} height={24} fill="#fff" stroke={K.blue} strokeWidth={5} /><rect x={42} y={-12} width={54} height={24} fill="#fff" stroke={K.blue} strokeWidth={5} />
            </g>
          </g>
        );
      })}
      {[0, 1].map((i) => { const k = ((f + i * 30) % 60) / 60; return <circle key={i} cx={520} cy={470} r={30 + k * 80} fill="none" stroke={K.accent} strokeWidth={6} opacity={1 - k} />; })}
      <g transform="translate(520 505)"><path d="M0 0 C-26 -34 -28 -50 -28 -58 A28 28 0 1 1 28 -58 C28 -50 26 -34 0 0Z" fill={K.accent} stroke={K.ink} strokeWidth={5} /><circle cy={-58} r={10} fill="#fff" /></g>
      <g transform="translate(520 940) scale(1.15)"><Rider frame={f} /></g>
      <rect x={400} y={300} width={240} height={64} rx={32} fill={K.ink} /><text x={520} y={344} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={32} fill="#fff">lat, lng</text>
    </Panel>
  </>);
};

const Server: React.FC<{ x: number; y: number; s?: number; f: number }> = ({ x, y, s = 1, f }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[0, 1, 2].map((i) => (
      <g key={i}><rect x={-120} y={-130 + i * 90} width={240} height={76} rx={14} fill="#fff" stroke={K.ink} strokeWidth={7} />
        <circle cx={-80} cy={-92 + i * 90} r={11} fill={K.green} opacity={0.5 + 0.5 * Math.abs(Math.sin(f / 8 + i))} /><rect x={-50} y={-100 + i * 90} width={130} height={14} rx={7} fill={K.muted} /></g>
    ))}
  </g>
);

export const Send: React.FC<P> = ({ f }) => {
  const path: [number, number][] = [[300, 560], [560, 410], [850, 700]];
  const at = (t: number): [number, number] => t < 0.5 ? [path[0][0] + (path[1][0] - path[0][0]) * t * 2, path[0][1] + (path[1][1] - path[0][1]) * t * 2] : [path[1][0] + (path[2][0] - path[1][0]) * (t - 0.5) * 2, path[1][1] + (path[2][1] - path[1][1]) * (t - 0.5) * 2];
  return S(<>
    <Panel x={20} y={10} w={1040} h={980} id="n1">
      <Street frame={f} w={1040} h={980} speed={0} />
      <rect y={820} width={1040} height={160} fill="#D9D2C2" />
      <g transform="translate(180 900) scale(1.3)"><Figure frame={f} skin="#6B4226" hairStyle="helmet" shirt={K.accent} emotion="happy" armR={68} armL={10} phone legL={4} legR={-4} /></g>
      <Tower x={540} y={880} frame={f} />
      <Server x={880} y={780} s={0.95} f={f} />
      <polyline points={path.map((p) => p.join(',')).join(' ')} fill="none" stroke={K.muted} strokeWidth={6} strokeDasharray="4 16" />
      {[0, 1, 2].map((i) => { const k = ((f + i * 28) % 84) / 84; const [px, py] = at(k); return <g key={i} transform={`translate(${px} ${py})`} opacity={k > 0.95 ? 0 : 1}><rect x={-22} y={-16} width={44} height={32} rx={6} fill={K.accent} stroke={K.ink} strokeWidth={4} /><path d="M-22 -16 L0 2 L22 -16" fill="none" stroke="#fff" strokeWidth={4} /></g>; })}
      <rect x={290} y={140} width={460} height={70} rx={35} fill={K.ink} /><text x={520} y={188} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={36} fill="#fff">every few seconds</text>
    </Panel>
  </>);
};

export const Push: React.FC<P> = ({ f }) => {
  const t = ease(f, 5, 130, 0.1, 0.95);
  const route: [number, number][] = [[-70, 130], [-70, 40], [10, 40], [10, -50], [70, -50], [70, -130]];
  const lens = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]));
  const tot = lens.reduce((a, b) => a + b, 0);
  let d = t * tot, dx = route[0][0], dy = route[0][1];
  for (let i = 0; i < lens.length; i++) { if (d <= lens[i]) { const k = d / lens[i]; dx = route[i][0] + (route[i + 1][0] - route[i][0]) * k; dy = route[i][1] + (route[i + 1][1] - route[i][1]) * k; break; } d -= lens[i]; }
  return S(<>
    <Panel x={20} y={10} w={1040} h={980} id="u1">
      <Room w={1040} h={980} f={f} />
      <Server x={190} y={300} s={0.8} f={f} />
      <line x1={300} y1={330} x2={600} y2={420} stroke={K.muted} strokeWidth={6} strokeDasharray="4 16" />
      {[0, 1, 2].map((i) => { const k = ((f + i * 14) % 42) / 42; return <circle key={i} cx={300 + 300 * k} cy={330 + 90 * k} r={13} fill={K.accent} opacity={1 - k * 0.4} />; })}
      <g transform="translate(300 940) scale(1.5)"><Figure frame={f} skin="#8D5524" hairStyle="puff" shirt={K.blue} emotion="happy" armR={98} armL={10} legL={5} legR={-5} /></g>
      <PhoneUI x={780} y={500} s={1.5} glow>
        <clipPath id="scr2"><rect x={-110} y={-190} width={220} height={380} rx={20} /></clipPath>
        <g clipPath="url(#scr2)">
          <rect x={-110} y={-190} width={220} height={380} fill={K.bg} />
          <rect x={-100} y={-90} width={60} height={50} fill={K.muted} opacity={0.5} /><rect x={30} y={-20} width={60} height={70} fill={K.muted} opacity={0.5} /><rect x={-60} y={70} width={80} height={40} fill={K.muted} opacity={0.5} />
          <polyline points={route.map((p) => p.join(',')).join(' ')} fill="none" stroke={K.blue} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={dx} cy={dy} r={14} fill={K.accent} />
          <rect x={-60} y={-176} width={120} height={36} rx={18} fill={K.green} /><text x={0} y={-151} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={22} fill="#fff">● LIVE</text>
        </g>
      </PhoneUI>
      <rect x={560} y={870} width={440} height={64} rx={32} fill={K.ink} /><text x={780} y={914} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={30} fill="#fff">no refresh needed</text>
    </Panel>
  </>);
};

export const Arrive: React.FC<P> = ({ f }) => {
  const walk = ease(f, 0, 80, 130, 560);
  const stride = f < 80 ? Math.sin(f / 4) * 24 : 0;
  const handover = ease(f, 84, 106);
  const door = f > 50 ? 1 : 0;
  const boxX = walk + 60 + (700 - walk - 60) * handover;
  const done = spring({ frame: f - 118, fps: 30, config: { damping: 9 } });
  const conf = Array.from({ length: 26 }, (_, i) => ({ x: 80 + ((i * 197) % 880), v: 3 + (i % 5), c: [K.accent, K.blue, K.gold, K.green][i % 4], r: i * 31 }));
  return S(<>
    <Panel x={20} y={10} w={1040} h={980} id="a1">
      <Street frame={f} w={1040} h={980} speed={0} />
      <rect y={800} width={1040} height={180} fill="#D9D2C2" />
      <House x={790} y={830} s={1.2} door={door} />
      <g transform="translate(110 920) scale(0.75)"><Rider frame={f} moving={false} /></g>
      <g transform={`translate(${walk} 890) scale(1.0)`}><Figure frame={f} skin="#6B4226" hairStyle="helmet" shirt={K.accent} emotion="happy" armR={f < 80 ? 30 : 70} armL={14} legL={stride} legR={-stride} box={f < 84} /></g>
      <g transform="translate(700 890) scale(1.0)"><Figure frame={f} skin="#8D5524" hairStyle="puff" shirt={K.blue} emotion={f > 84 ? 'happy' : 'neutral'} armR={f > 110 ? 82 : 14} armL={f > 84 ? 62 : 14} phone={f > 112} legL={4} legR={-4} box={f >= 106 && f < 130} /></g>
      {f >= 84 && f < 106 && <g transform={`translate(${boxX} ${670})`}><rect x={-34} y={-30} width={68} height={56} rx={6} fill={K.accent} stroke={K.ink} strokeWidth={5} /></g>}
      <g transform={`translate(520 150) scale(${done})`} opacity={done > 0.05 ? 1 : 0}>
        <rect x={-300} y={-60} width={600} height={120} rx={60} fill={K.green} stroke={K.ink} strokeWidth={6} />
        <text x={0} y={20} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={52} fill="#fff">✓ Order received</text>
      </g>
      {f > 120 && conf.map((c, i) => <rect key={i} x={c.x} y={-20 + ((f - 120) * c.v) % 900} width={14} height={22} fill={c.c} transform={`rotate(${c.r + f * 4} ${c.x} ${-20 + ((f - 120) * c.v) % 900})`} />)}
    </Panel>
  </>);
};

export const Route2: React.FC<P> = ({ f }) => {
  const R: [number, number][] = [[160, 820], [160, 600], [420, 600], [420, 380], [760, 380], [760, 200]];
  const lens = R.slice(1).map((p, i) => Math.hypot(p[0] - R[i][0], p[1] - R[i][1]));
  const tot = lens.reduce((a, b) => a + b, 0);
  const t = ease(f, 8, 88);
  const pts: [number, number][] = [R[0]];
  let d = t * tot, mx = R[0][0], my = R[0][1];
  for (let i = 0; i < lens.length && d > 0; i++) { const k = Math.min(d / lens[i], 1); mx = R[i][0] + (R[i + 1][0] - R[i][0]) * k; my = R[i][1] + (R[i + 1][1] - R[i][1]) * k; pts.push([mx, my]); d -= lens[i]; }
  const banner = ease(f, 66, 84);
  return S(<>
    <Panel x={20} y={10} w={1040} h={980} id="r1">
      <rect width={1040} height={980} fill="#F4F1E8" />
      <rect x={470} y={430} width={250} height={140} rx={20} fill="#CDE8C8" />
      <rect x={810} y={420} width={230} height={560} fill="#CFE4FF" />
      {[[0, 0], [210, 0], [450, 0], [820, 0], [0, 250], [210, 250], [450, 250], [830, 250], [0, 430], [210, 430], [830, 650], [0, 650], [210, 650], [450, 650], [0, 880], [210, 880]].map(([x, y], i) => (
        <rect key={i} x={x + 30} y={y + 30} width={150} height={120} rx={12} fill="#E3DCCB" opacity={0.0} />
      ))}
      {[200, 380, 600, 820].map((y) => <line key={y} x1={0} y1={y} x2={1040} y2={y} stroke="#fff" strokeWidth={56} />)}
      {[160, 420, 760].map((x) => <line key={x} x1={x} y1={0} x2={x} y2={980} stroke="#fff" strokeWidth={56} />)}
      {[200, 380, 600, 820].map((y) => <line key={'d' + y} x1={0} y1={y} x2={1040} y2={y} stroke={K.muted} strokeWidth={4} strokeDasharray="14 18" />)}
      {[[260, 70, 130, 110], [500, 70, 200, 110], [860, 60, 140, 110], [260, 250, 130, 90], [500, 250, 200, 90], [60, 250, 70, 90], [860, 250, 130, 90], [60, 440, 70, 120], [260, 440, 130, 120], [540, 440, 100, 110], [60, 650, 70, 120], [260, 650, 130, 120], [500, 650, 200, 120], [830, 650, 150, 120], [260, 880, 130, 80], [500, 880, 200, 80]].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx={12} fill="#E3DCCB" stroke="#C9C1AE" strokeWidth={3} />)}
      <polyline points={R.map((p) => p.join(',')).join(' ')} fill="none" stroke="#fff" strokeWidth={40} strokeLinejoin="round" strokeLinecap="round" opacity={0.0} />
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={K.blue} strokeWidth={22} strokeLinejoin="round" strokeLinecap="round" />
      <g transform="translate(160 850)"><rect x={-44} y={-30} width={88} height={62} fill="#fff" stroke={K.ink} strokeWidth={6} /><path d="M-52 -30 L-40 -64 L40 -64 L52 -30Z" fill={K.accent} stroke={K.ink} strokeWidth={6} strokeLinejoin="round" /></g>
      <House x={760} y={190} s={0.38} />
      <circle cx={mx} cy={my} r={40 + 14 * ((f % 40) / 40)} fill="none" stroke={K.accent} strokeWidth={5} opacity={1 - (f % 40) / 40} />
      <circle cx={mx} cy={my} r={26} fill={K.accent} stroke={K.ink} strokeWidth={6} /><circle cx={mx} cy={my} r={9} fill="#fff" />
      <g opacity={banner} transform={`translate(520 ${60 + 18 * (1 - banner)})`}><rect x={-230} y={-44} width={460} height={88} rx={30} fill={K.ink} /><text x={0} y={14} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={46} fill="#fff">↱ Turn right</text></g>
    </Panel>
  </>);
};

export const Outro2: React.FC<P & { brand: string; cta: string; lock?: boolean }> = ({ f, brand, cta, lock }) => {
  const s = spring({ frame: f - 5, fps: 30, config: { damping: 11 } });
  const rx = ease(f, 0, 125, -150, 1250);
  return S(<>
    <Panel x={20} y={10} w={1040} h={980} id="o1">
      <Street frame={f} w={1040} h={980} speed={2} dusk />
      <g transform={`translate(${rx} 930) scale(0.95)`}><Rider frame={f} /></g>
      <rect x={160} y={130} width={720} height={480} rx={50} fill="#fff" opacity={0.92} stroke={K.ink} strokeWidth={7} />
      {lock
        ? <g transform={`translate(520 250) scale(${s * 1.3})`}><path d="M-50 -20 V-60 A50 50 0 0 1 50 -60 V-20" fill="none" stroke={K.ink} strokeWidth={14} /><rect x={-80} y={-20} width={160} height={130} rx={22} fill={K.green} stroke={K.ink} strokeWidth={8} /><circle cx={0} cy={38} r={16} fill="#fff" /><rect x={-5} y={44} width={10} height={34} fill="#fff" /></g>
        : <g transform={`translate(520 410) scale(${s * 1.7})`}><path d="M0 0 C-26 -34 -28 -50 -28 -58 A28 28 0 1 1 28 -58 C28 -50 26 -34 0 0Z" fill={K.accent} stroke={K.ink} strokeWidth={5} /><circle cy={-58} r={10} fill="#fff" /></g>}
      <text x={520} y={490} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={88} fill={K.ink}>{brand}</text>
      <rect x={210} y={515} width={620} height={76} rx={38} fill={K.accent} /><text x={520} y={568} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={44} fill="#fff">Comment "{cta}"</text>
    </Panel>
  </>);
};
