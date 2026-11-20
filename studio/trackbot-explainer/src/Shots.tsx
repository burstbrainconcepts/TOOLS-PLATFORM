import React from 'react';
import { Composition } from 'remotion';
import { City3D } from './City3D';

// Stand-alone 3D shots, rendered silent, at full rate (reference) and at half rate (cheap; post-process with postprocess/shotfx.py interpolate).
const route = (ts: number) => () => <City3D width={1080} height={1920} progress={[0.35, 0.98]} timeScale={ts} />;
const hook = (ts: number) => () => <City3D width={1080} height={1920} progress={[0.07, 0.34]} dusk timeScale={ts} />;
const RouteFull = route(1), RouteHalf = route(2), HookFull = hook(1), HookHalf = hook(2);

export const Shots: React.FC = () => (
  <>
    <Composition id="ShotRoute30" component={RouteFull} durationInFrames={110} fps={30} width={1080} height={1920} />
    <Composition id="ShotRoute15" component={RouteHalf} durationInFrames={55} fps={15} width={1080} height={1920} />
    <Composition id="ShotHook30" component={HookFull} durationInFrames={64} fps={30} width={1080} height={1920} />
    <Composition id="ShotHook15" component={HookHalf} durationInFrames={32} fps={15} width={1080} height={1920} />
  </>
);
