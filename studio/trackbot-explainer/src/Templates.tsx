import React from 'react';
import { continueRender, delayRender, interpolate, spring, staticFile, Easing } from 'remotion';
import { FONT, Figure, K, Panel, Street } from './Acting';
import { Room } from './Scenes2';

// Reusable scene templates for episodes and ads. Characters come from the series bible, so they look identical everywhere.
export type CharSpec = { name: string; skin: string; hair?: string; hairStyle?: 'puff' | 'short' | 'helmet'; shirt: string; pants?: string; shoe?: string; glasses?: boolean; voice: string };
export type Palette = { accent: string; accent2: string; bg: string; ink: string };
export type TplScene = {
  template: string; text: string; who?: string[]; speaker?: string; setting?: string; emotion?: string;
  title?: string; bullets?: string[]; icons?: string[]; labels?: string[]; stat?: { value: string; label: string };
  product?: { src: string; name?: string; tag?: string }; brand?: string; cta?: string;
  frames: number; mouth: number[];
};
export type Ctx = { chars: Record<string, CharSpec>; palette: Palette; brand?: string; cta?: string };
type P = { f: number; scene: TplScene; ctx: Ctx };

const clampX = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = (f: number, a: number, b: number, from = 0, to = 1) => interpolate(f, [a, b], [from, to], { ...clampX, easing: Easing.inOut(Easing.cubic) });
const S = (c: React.ReactNode) => <svg viewBox="0 0 1080 1920" width="100%" height="100%">{c}</svg>;
const mouthAt = (s: TplScene, f: number) => s.mouth[Math.min(f, s.mouth.length - 1)] ?? 0;
export const wrap = (t: string, max: number): string[] => {
  const out: string[] = []; let line = '';
  for (const w of t.split(' ')) { if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }
  if (line) out.push(line); return out;
};
const Lines: React.FC<{ x: number; y: number; t: string; max: number; size: number; fill?: string; lh?: number; anchor?: 'middle' | 'start'; weight?: number }> = ({ x, y, t, max, size, fill = K.ink, lh = 1.15, anchor = 'middle', weight = 900 }) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={FONT} fontWeight={weight} fontSize={size} fill={fill}>{wrap(t, max).map((l, i) => <tspan key={i} x={x} dy={i ? size * lh : 0}>{l}</tspan>)}</text>
);

// ---------- icons (simple, readable at small sizes) ----------
export const Icon: React.FC<{ name: string; x: number; y: number; s?: number; c?: string }> = ({ name, x, y, s = 1, c = K.ink }) => {
  const st = { fill: 'none', stroke: c, strokeWidth: 9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const body = (() => {
    switch (name) {
      case 'phone': return <><rect x={-26} y={-44} width={52} height={88} rx={10} {...st} /><line x1={-8} y1={32} x2={8} y2={32} {...st} /></>;
      case 'wifi': return <><path d="M-44 -8 Q0 -48 44 -8" {...st} /><path d="M-28 10 Q0 -14 28 10" {...st} /><circle cx={0} cy={30} r={5} fill={c} /></>;
      case 'cloud': return <path d="M-34 24 Q-52 24 -50 4 Q-48 -14 -30 -12 Q-24 -40 4 -38 Q30 -36 32 -12 Q52 -10 50 10 Q48 24 34 24Z" {...st} />;
      case 'server': return <>{[-32, 0, 32].map((y) => <rect key={y} x={-40} y={y - 12} width={80} height={24} rx={6} {...st} />)}</>;
      case 'lock': return <><path d="M-22 -8 V-24 A22 22 0 0 1 22 -24 V-8" {...st} /><rect x={-34} y={-8} width={68} height={52} rx={10} {...st} /></>;
      case 'key': return <><circle cx={-22} cy={0} r={18} {...st} /><path d="M-4 0 H44 M30 0 V16 M42 0 V12" {...st} /></>;
      case 'coin': return <><circle r={38} {...st} /><path d="M-12 -14 Q0 -24 12 -14 Q-12 6 12 14 Q0 24 -12 14 M0 -26 V26" {...st} strokeWidth={6} /></>;
      case 'check': return <path d="M-34 4 L-10 28 L36 -26" {...st} strokeWidth={13} />;
      case 'pin': return <><path d="M0 40 C-34 0 -36 -14 -36 -22 A36 36 0 1 1 36 -22 C36 -14 34 0 0 40Z" {...st} /><circle cx={0} cy={-22} r={11} {...st} /></>;
      case 'home': return <><path d="M-44 -2 L0 -40 L44 -2" {...st} /><path d="M-32 -6 V38 H32 V-6" {...st} /></>;
      case 'heart': return <path d="M0 38 C-52 0 -44 -40 -20 -40 C-8 -40 0 -30 0 -24 C0 -30 8 -40 20 -40 C44 -40 52 0 0 38Z" {...st} />;
      case 'bolt': return <path d="M10 -44 L-28 6 H-2 L-12 44 L30 -8 H4Z" {...st} />;
      case 'shield': return <><path d="M0 -44 L38 -30 V4 C38 28 18 40 0 48 C-18 40 -38 28 -38 4 V-30Z" {...st} /><path d="M-14 4 L-4 14 L16 -10" {...st} /></>;
      case 'mail': return <><rect x={-42} y={-28} width={84} height={56} rx={8} {...st} /><path d="M-42 -24 L0 8 L42 -24" {...st} /></>;
      case 'star': return <path d="M0 -42 L12 -14 L42 -12 L18 8 L26 38 L0 22 L-26 38 L-18 8 L-42 -12 L-12 -14Z" {...st} />;
      case 'cart': return <><path d="M-46 -34 H-30 L-18 20 H30 L40 -16 H-24" {...st} /><circle cx={-12} cy={36} r={6} fill={c} /><circle cx={24} cy={36} r={6} fill={c} /></>;
      default: return <circle r={30} {...st} />;
    }
  })();
  return <g transform={`translate(${x} ${y}) scale(${s})`}>{body}</g>;
};

// ---------- stage (setting) ----------
const Stage: React.FC<{ id: string; setting?: string; f: number; ctx: Ctx; over?: React.ReactNode; children: React.ReactNode }> = ({ id, setting = 'studio', f, ctx, over, children }) => (
  <>
    <StagePanel id={id} setting={setting} f={f} ctx={ctx}>{children}</StagePanel>
    {over}
  </>
);
const StagePanel: React.FC<{ id: string; setting?: string; f: number; ctx: Ctx; children: React.ReactNode }> = ({ id, setting = 'studio', f, ctx, children }) => {
  if (setting === 'street') return <Panel id={id} top="#CFE8FF" bottom="#D9D2C2"><Street frame={f} w={1040} h={980} speed={0} /><rect y={800} width={1040} height={180} fill="#D9D2C2" />{children}</Panel>;
  if (setting === 'room') return <Panel id={id} top="#F1EBDD" bottom="#D9D2C2" deco="room"><Room w={1040} h={980} f={f} />{children}</Panel>;
  return (
    <Panel id={id} top={ctx.palette.bg} bottom="#D9D2C2" deco="none">
      <rect width={1040} height={980} fill={ctx.palette.bg} />
      <circle cx={820} cy={260} r={380} fill={ctx.palette.accent} opacity={0.10} /><circle cx={160} cy={700} r={260} fill={ctx.palette.accent2} opacity={0.10} />
      <rect y={860} width={1040} height={120} fill="#D9D2C2" /><rect y={852} width={1040} height={10} fill="#C9C1AE" />
      {children}
    </Panel>
  );
};

// ---------- cast ----------
const Actor: React.FC<{ c: CharSpec; x: number; y: number; s: number; f: number; mouth: number; emotion: string; point?: boolean; talking: boolean }> = ({ c, x, y, s, f, mouth, emotion, point, talking }) => {
  const wave = Math.sin(f / 9), g = talking && mouth > 0.12 ? 0.55 + 0.45 * Math.sin(f / 20) : 0;
  const armR = point ? 96 + wave * 4 : 12 + g * 55 + (talking && mouth > 0.12 ? wave * 5 : 0);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Figure frame={f} skin={c.skin} hair={c.hair} hairStyle={c.hairStyle ?? 'short'} shirt={c.shirt} pants={c.pants} shoe={c.shoe} glasses={c.glasses}
        emotion={(emotion as 'neutral') ?? 'neutral'} armR={armR} armL={12 + (talking ? 0 : 3)} talk={talking ? mouth : 0} legL={5} legR={-5} />
    </g>
  );
};
const Cast: React.FC<P & { y?: number; s?: number; point?: boolean; xs?: number[] }> = ({ f, scene, ctx, y = 930, s = 1.55, point, xs }) => {
  const who = scene.who?.length ? scene.who : [Object.keys(ctx.chars)[0]];
  const speaker = scene.speaker ?? who[0];
  const pos = xs ?? (who.length === 1 ? [520] : who.length === 2 ? [300, 760] : [190, 520, 850]);
  return <>{who.map((id, i) => ctx.chars[id] && <Actor key={id} c={ctx.chars[id]} x={pos[i]} y={y} s={who.length > 1 ? s * 0.92 : s} f={f + i * 11} mouth={mouthAt(scene, f)} emotion={id === speaker ? (scene.emotion ?? 'neutral') : 'happy'} talking={id === speaker} point={point && id === speaker} />)}</>;
};
const TitlePill: React.FC<{ scene: TplScene; ctx: Ctx; f: number; y?: number; size?: number }> = ({ scene, ctx, f, y = 330, size = 72 }) => {
  if (!scene.title) return null;
  const k = spring({ frame: f - 6, fps: 30, config: { damping: 11 } });
  const lines = wrap(scene.title, 16);
  const w = Math.min(940, Math.max(...lines.map((l) => l.length)) * size * 0.6 + 90), h = lines.length * size * 1.15 + 50;
  return (
    <g transform={`translate(540 ${y}) scale(${k})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={42} fill="#fff" stroke={K.ink} strokeWidth={7} />
      <Lines x={0} y={-h / 2 + size * 1.0 + 16} t={scene.title} max={16} size={size} fill={ctx.palette.accent} />
    </g>
  );
};

// ---------- templates ----------
export const Talk: React.FC<P> = (p) => S(<Stage id="t-talk" setting={p.scene.setting} f={p.f} ctx={p.ctx} over={<TitlePill scene={p.scene} ctx={p.ctx} f={p.f} />}><Cast {...p} /></Stage>);

export const Hook: React.FC<P> = (p) => {
  const q = spring({ frame: p.f - 8, fps: 30, config: { damping: 7 } });
  const lines = wrap(p.scene.title ?? '', 15), size = 96, h = lines.length * size * 1.15 + 70;
  return S(<Stage id="t-hook" setting={p.scene.setting ?? 'studio'} f={p.f} ctx={p.ctx} over={p.scene.title && <g transform={`translate(540 340) scale(${q})`}><rect x={-450} y={-h / 2} width={900} height={h} rx={56} fill={p.ctx.palette.accent} stroke={K.ink} strokeWidth={8} /><Lines x={0} y={-h / 2 + size + 14} t={p.scene.title} max={15} size={size} fill="#fff" /></g>}>
    <Cast {...p} s={2.0} y={940} />
  </Stage>);
};

export const Board: React.FC<P> = ({ f, scene, ctx }) => {
  const bullets = scene.bullets ?? [];
  return S(<Stage id="t-board" setting={scene.setting ?? 'room'} f={f} ctx={ctx}>
    <Cast f={f} scene={scene} ctx={ctx} xs={[215]} s={1.5} point />
    <g transform="translate(640 470)">
      <rect x={-270} y={-330} width={540} height={620} rx={30} fill="#fff" stroke={K.ink} strokeWidth={8} />
      <rect x={-270} y={-330} width={540} height={84} rx={30} fill={ctx.palette.accent} />
      <rect x={-270} y={-286} width={540} height={40} fill={ctx.palette.accent} />
      <text x={0} y={-272} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={Math.min(44, 500 / Math.max(8, (scene.title ?? '').length * 0.58))} fill="#fff">{scene.title ?? ''}</text>
      {bullets.slice(0, 4).map((b, i) => {
        const a = ease(f, 14 + i * Math.max(14, Math.floor(scene.frames / (bullets.length + 1))), 30 + i * Math.max(14, Math.floor(scene.frames / (bullets.length + 1))));
        return <g key={i} opacity={a} transform={`translate(0 ${22 * (1 - a)})`}><circle cx={-232} cy={-170 + i * 120} r={16} fill={ctx.palette.accent2} stroke={K.ink} strokeWidth={4} /><Lines x={-198} y={-158 + i * 120} t={b} max={17} size={38} anchor="start" weight={800} /></g>;
      })}
    </g>
  </Stage>);
};

export const Flow: React.FC<P> = ({ f, scene, ctx }) => {
  const icons = (scene.icons ?? []).slice(0, 4), labels = scene.labels ?? icons;
  const ys = icons.map((_, i) => 200 + i * (icons.length > 3 ? 195 : 235));
  const dot = ((f % 60) / 60) * Math.max(1, icons.length - 1);
  const seg = Math.min(icons.length - 2, Math.floor(dot));
  return S(<Stage id="t-flow" setting={scene.setting ?? 'studio'} f={f} ctx={ctx}>
    {icons.slice(0, -1).map((_, i) => <line key={i} x1={450} y1={ys[i] + 85} x2={450} y2={ys[i + 1] - 85} stroke={K.ink} strokeWidth={8} strokeDasharray="4 16" strokeLinecap="round" />)}
    {icons.length > 1 && <circle cx={450} cy={ys[seg] + 85 + (ys[seg + 1] - ys[seg] - 170) * (dot - seg)} r={15} fill={ctx.palette.accent} stroke={K.ink} strokeWidth={4} />}
    {icons.map((ic, i) => {
      const a = ease(f, 8 + i * 12, 26 + i * 12);
      return <g key={i} opacity={a} transform={`translate(450 ${ys[i]}) scale(${0.85 + 0.15 * a})`}>
        <rect x={-85} y={-85} width={170} height={170} rx={34} fill="#fff" stroke={K.ink} strokeWidth={7} />
        <Icon name={ic} x={0} y={-6} s={1.25} c={i % 2 ? ctx.palette.accent2 : ctx.palette.accent} />
        <Lines x={112} y={-6} t={labels[i] ?? ''} max={11} size={46} anchor="start" fill={K.ink} />
      </g>;
    })}
    <Cast f={f} scene={scene} ctx={ctx} xs={[235]} s={1.3} y={930} />
  </Stage>);
};

export const Stat: React.FC<P> = ({ f, scene, ctx }) => {
  const k = spring({ frame: f - 6, fps: 30, config: { damping: 10 } });
  const st = scene.stat ?? { value: '', label: '' };
  const vs = Math.min(190, 780 / Math.max(3, st.value.length * 0.6));
  return S(<Stage id="t-stat" setting={scene.setting ?? 'studio'} f={f} ctx={ctx} over={<g transform={`translate(540 380) scale(${k})`}>
      <rect x={-450} y={-220} width={900} height={440} rx={56} fill="#fff" stroke={K.ink} strokeWidth={9} />
      <text x={0} y={-10} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={vs} fill={ctx.palette.accent}>{st.value}</text>
      <Lines x={0} y={80} t={st.label} max={28} size={44} fill={K.ink} weight={800} />
    </g>}>
    <Cast f={f} scene={scene} ctx={ctx} xs={scene.who && scene.who.length > 1 ? undefined : [520]} s={1.4} />
  </Stage>);
};

// Waits (via delayRender) until an image has loaded, so Remotion never captures a frame before the picture is there.
const useImageReady = (src?: string) => {
  const [ready, setReady] = React.useState(!src);
  React.useEffect(() => {
    if (!src) return;
    const h = delayRender('product image');
    const im = new window.Image();
    const done = () => { setReady(true); continueRender(h); };
    im.onload = done; im.onerror = done; im.src = src;
  }, [src]);
  return ready;
};

// Product scene for ads: the product image floats in a halo, a price/tag pill and benefit chips pop in, the presenter points.
export const Product: React.FC<P> = ({ f, scene, ctx }) => {
  const pr = scene.product; const bullets = scene.bullets ?? [];
  const url = pr ? (/^(https?:|data:|blob:)/.test(pr.src) ? pr.src : staticFile(pr.src)) : undefined;
  const ready = useImageReady(url);
  const k = spring({ frame: f - 4, fps: 30, config: { damping: 9 } });
  const bob = Math.sin(f / 14) * 9;
  return S(<Stage id="t-product" setting="studio" f={f} ctx={ctx}>
    <g transform="translate(690 340)">
      {Array.from({ length: 12 }, (_, i) => <path key={i} d="M0 0 L-24 -480 L24 -480Z" fill={ctx.palette.accent} opacity={0.12} transform={`rotate(${i * 30 + f * 0.4})`} />)}
      <circle r={250} fill="#fff" opacity={0.9} stroke={K.ink} strokeWidth={8} />
      <ellipse cx={0} cy={236} rx={150} ry={22} fill="#000" opacity={0.18} />
      {pr && ready && <g transform={`translate(0 ${bob}) scale(${k})`}><image href={url} x={-205} y={-205} width={410} height={410} preserveAspectRatio="xMidYMid meet" /></g>}
    </g>
    {pr?.tag && <g transform={`translate(690 650) scale(${ease(f, 10, 24)})`}><rect x={-230} y={-42} width={460} height={84} rx={42} fill={ctx.palette.accent} stroke={K.ink} strokeWidth={6} /><text x={0} y={15} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={40} fill="#fff">{pr.tag}</text></g>}
    <Cast f={f} scene={scene} ctx={ctx} xs={[210]} s={1.45} point />
    {bullets.slice(0, 3).map((b, i) => {
      const a = ease(f, 24 + i * 18, 42 + i * 18);
      return (
        <g key={i} opacity={a} transform={`translate(690 ${760 + i * 90}) scale(${0.9 + 0.1 * a})`}>
          <rect x={-215} y={-38} width={430} height={76} rx={38} fill="#fff" stroke={K.ink} strokeWidth={5} />
          <Icon name="check" x={-174} y={0} s={0.42} c={ctx.palette.accent2} />
          <text x={-136} y={12} fontFamily={FONT} fontWeight={800} fontSize={30} fill={K.ink}>{b.length > 24 ? b.slice(0, 23) + '…' : b}</text>
        </g>
      );
    })}
  </Stage>);
};

export const Outro: React.FC<P> = ({ f, scene, ctx }) => {
  const s = spring({ frame: f - 5, fps: 30, config: { damping: 11 } });
  const brand = scene.brand ?? ctx.brand ?? '', cta = scene.cta ?? ctx.cta ?? '';
  return S(<Stage id="t-outro" setting="studio" f={f} ctx={ctx} over={<g transform={`translate(540 390) scale(${s})`}>
      <rect x={-440} y={-250} width={880} height={500} rx={56} fill="#fff" stroke={K.ink} strokeWidth={9} />
      <Lines x={0} y={-70} t={brand} max={12} size={110} fill={K.ink} />
      <rect x={-380} y={90} width={760} height={110} rx={55} fill={ctx.palette.accent} stroke={K.ink} strokeWidth={6} />
      <Lines x={0} y={166} t={cta} max={24} size={52} fill="#fff" />
    </g>}>
    <Cast f={f} scene={scene} ctx={ctx} s={1.5} />
  </Stage>);
};

export const TEMPLATES: Record<string, React.FC<P>> = { talk: Talk, hook: Hook, board: Board, flow: Flow, stat: Stat, product: Product, outro: Outro };
