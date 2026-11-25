import React from 'react';
import { Composition } from 'remotion';
import { City3D } from './City3D';
import data from './data.json';
import config from './shots.config.json';

// Stand-alone 3D shots (silent). For each shot: <Id>30 at full rate (reference / fallback) and <Id>15 at half rate
// (cheap; post-processed to 30 fps by postprocess/shotfx.py). Durations follow the narration in data.json.
export type ShotSpec = (typeof config)[number];
export const cap = (id: string) => id[0].toUpperCase() + id.slice(1);
export const shotFrames = (sceneKind: string) => data.scenes.find((s) => s.kind === sceneKind)?.frames ?? 90;

const make = (c: ShotSpec, ts: number) => () => <City3D width={1080} height={1920} progress={c.progress as [number, number]} dusk={c.dusk} timeScale={ts} />;

export const Shots: React.FC = () => (
  <>
    {config.map((c) => {
      const frames = shotFrames(c.sceneKind);
      return (
        <React.Fragment key={c.id}>
          <Composition id={`Shot${cap(c.id)}30`} component={make(c, 1)} durationInFrames={frames} fps={30} width={1080} height={1920} />
          <Composition id={`Shot${cap(c.id)}15`} component={make(c, 2)} durationInFrames={Math.ceil(frames / 2)} fps={15} width={1080} height={1920} />
        </React.Fragment>
      );
    })}
  </>
);
