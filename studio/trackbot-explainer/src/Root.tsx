import { Composition } from 'remotion';
import data from './data.json';
import { Video, makeVideo, renderScene } from './Video';
import { ShotClip } from './ShotClip';
import shotConfig from './shots.config.json';
import { Shots } from './Shots';
import { MoneyVideo, moneyData } from './Money';

const Video3D = makeVideo(data, (k, f, e) => {
  const spec = shotConfig.find((c) => c.sceneKind === k);
  return spec ? <ShotClip spec={spec} /> : renderScene(k, f, e);
});

export const Root = () => (
  <>
    <Composition id="TrackbotExplainer" component={Video} durationInFrames={data.total} fps={data.fps} width={1080} height={1920} defaultProps={{ character: 'ada' as const }} />
    <Composition id="MoneyExplainer" component={MoneyVideo} durationInFrames={moneyData.total} fps={moneyData.fps} width={1080} height={1920} defaultProps={{ character: 'ada' as const }} />
    <Composition id="TrackbotExplainer3D" component={Video3D} durationInFrames={data.total} fps={data.fps} width={1080} height={1920} defaultProps={{ character: 'ada' as const }} />
    <Shots />
  </>
);
