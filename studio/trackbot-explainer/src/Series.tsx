import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import { TEMPLATES, type Ctx, type TplScene } from './Templates';
import { FONT } from './Acting';

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

const SceneView: React.FC<{ s: EpisodeScene; ctx: Ctx }> = ({ s, ctx }) => {
  const f = useCurrentFrame();
  const Tpl = TEMPLATES[s.template] ?? TEMPLATES.talk;
  const fade = interpolate(f, [0, 8, s.frames - 8, s.frames], [0, 1, 1, 0], clampX);
  return (
    <AbsoluteFill>
      <Audio src={staticFile(s.audio)} />
      <div style={{ position: 'absolute', inset: 0, opacity: fade, transform: `translateX(${interpolate(f, [0, 12], [70, 0], clampX)}px) scale(${1 + f * 0.00032})`, transformOrigin: `${40 + (s.frames % 3) * 20}% 60%` }}>
        <Tpl f={f} scene={s} ctx={ctx} />
      </div>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(20,10,30,0.38) 100%)' }} />
      <div style={{ position: 'absolute', bottom: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Captions text={s.text} frame={f} audioFrames={s.audioFrames} accent={ctx.palette.accent} ink={ctx.palette.ink} />
      </div>
    </AbsoluteFill>
  );
};

export const Episode: React.FC<EpisodeProps> = ({ scenes, ctx }) => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: ctx.palette.bg }}>
      {scenes.map((s, i) => {
        const el = <Sequence key={i} from={from} durationInFrames={s.frames}><SceneView s={s} ctx={ctx} /></Sequence>;
        from += s.frames;
        return el;
      })}
    </AbsoluteFill>
  );
};
