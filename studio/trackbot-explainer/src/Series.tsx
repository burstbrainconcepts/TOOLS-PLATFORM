import React from 'react';
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import { TEMPLATES, type Ctx, type TplScene } from './Templates';
import { FONT } from './Acting';
import { Scene3D } from './Scene3D';

// "Episode" composition: renders any series episode or ad from props (see scripts/series/build-episode.mjs).
export type EpisodeScene = TplScene & { audio: string; audioFrames: number };
export type EpisodeProps = { id: string; fps: number; total: number; ctx: Ctx; scenes: EpisodeScene[] };

export const defaultEpisode: EpisodeProps = {
  id: 'empty', fps: 30, total: 30,
  ctx: { chars: {}, palette: { accent: '#FF5A36', accent2: '#2B6CFF', bg: '#FBF7EF', ink: '#1B1B1F' } },
  scenes: [],
};

export const episodeMetadata: CalculateMetadataFunction<EpisodeProps> = ({ props }) => ({ durationInFrames: Math.max(props.total, 30), fps: props.fps });

const clampX = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Sound effects timed to what each template animates (kept in step with the timings in Templates.tsx).
type Sfx = { at: number; file: 'whoosh' | 'pop' | 'tick' | 'chime'; vol: number };
export const sfxFor = (s: EpisodeScene, first: boolean): Sfx[] => {
  const out: Sfx[] = first ? [] : [{ at: 0, file: 'whoosh', vol: 0.5 }];
  const n = (s.bullets ?? []).length;
  switch (s.template) {
    case 'hook': out.push({ at: 8, file: 'pop', vol: 0.7 }); break;
    case 'stat': out.push({ at: 6, file: 'pop', vol: 0.7 }); break;
    case 'outro': out.push({ at: 5, file: 'chime', vol: 0.55 }); break;
    case 'product': out.push({ at: 4, file: 'pop', vol: 0.7 }, { at: 10, file: 'pop', vol: 0.45 }); for (let i = 0; i < Math.min(3, n); i++) out.push({ at: 24 + i * 18, file: 'tick', vol: 0.5 }); break;
    case 'board': { const step = Math.max(14, Math.floor(s.frames / (n + 1))); for (let i = 0; i < Math.min(4, n); i++) out.push({ at: 14 + i * step, file: 'tick', vol: 0.5 }); break; }
    case 'flow': for (let i = 0; i < (s.icons ?? []).length; i++) out.push({ at: 8 + i * 12, file: 'tick', vol: 0.5 }); break;
  }
  return out.filter((e) => e.at < s.frames - 4);
};

const Captions: React.FC<{ text: string; frame: number; audioFrames: number; accent: string; ink: string }> = ({ text, frame, audioFrames, accent, ink }) => {
  const ws = text.split(' ');
  let acc = 0;
  const marks = ws.map((w) => { const s = acc / text.length; acc += w.length + 1; return s; });
  const prog = Math.min(frame / Math.max(audioFrames, 1), 0.999);
  let cur = 0;
  marks.forEach((m, i) => { if (prog >= m) cur = i; });
  const start = Math.floor(cur / 4) * 4;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18, padding: '22px 44px', background: 'rgba(255,255,255,0.92)', borderRadius: 44, border: `6px solid ${ink}`, maxWidth: 980, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
      {ws.slice(start, start + 4).map((w, i) => (
        <span key={i} style={{ fontFamily: FONT, fontWeight: 900, fontSize: 78, color: start + i === cur ? accent : ink, textTransform: 'uppercase' }}>{w}</span>
      ))}
    </div>
  );
};

const SceneView: React.FC<{ s: EpisodeScene; ctx: Ctx; index: number }> = ({ s, ctx, index }) => {
  const f = useCurrentFrame();
  const Tpl = TEMPLATES[s.template] ?? TEMPLATES.talk;
  const fade = interpolate(f, [0, 8, s.frames - 8, s.frames], [0, 1, 1, 0], clampX);
  // camera: eased push-in on even scenes, pull-out on odd ones, plus a decelerating slide-and-settle entry
  const k = interpolate(f, [0, s.frames], index % 2 ? [1.07, 1] : [1, 1.07], { ...clampX, easing: Easing.inOut(Easing.quad) });
  const enter = interpolate(f, [0, 16], [1, 0], { ...clampX, easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill>
      <Audio src={staticFile(s.audio)} />
      {sfxFor(s, index === 0).map((e, i) => <Sequence key={i} from={e.at} durationInFrames={48}><Audio src={staticFile(`sfx/${e.file}.wav`)} volume={e.vol * 0.5} /></Sequence>)}
      <div style={{ position: 'absolute', inset: 0, opacity: fade, transform: `translateX(${enter * 90}px) scale(${k * (1 + enter * 0.03)})`, transformOrigin: `${40 + (s.frames % 3) * 20}% 60%` }}>
        {ctx.style === '3d' && <Scene3D f={f} scene={s} ctx={ctx} quality={ctx.quality3d ?? 1} />}
        <div style={{ position: 'absolute', inset: 0 }}><Tpl f={f} scene={s} ctx={ctx} /></div>
      </div>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(20,10,30,0.38) 100%)' }} />
      <div style={{ position: 'absolute', bottom: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Captions text={s.text} frame={f} audioFrames={s.audioFrames} accent={ctx.palette.accent} ink={ctx.palette.ink} />
      </div>
    </AbsoluteFill>
  );
};

export const Episode: React.FC<EpisodeProps> = ({ scenes, ctx, total }) => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: ctx.palette.bg }}>
      <Audio src={staticFile('sfx/bed.wav')} loop volume={(fr) => 0.1 * Math.min(1, fr / 30, Math.max(0, (total - fr) / 45))} />
      {scenes.map((s, i) => {
        const el = <Sequence key={i} from={from} durationInFrames={s.frames}><SceneView s={s} ctx={ctx} index={i} /></Sequence>;
        from += s.frames;
        return el;
      })}
    </AbsoluteFill>
  );
};
