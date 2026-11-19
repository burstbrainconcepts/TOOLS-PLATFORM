import { Composition } from 'remotion';
import data from './data.json';
import { Video, makeVideo, renderScene } from './Video';
import { City3D } from './City3D';
import { MoneyVideo, moneyData } from './Money';

const Video3D = makeVideo(data, (k, f, e) => (k === 'route' ? <div style={{ margin: '24px 40px 0', borderRadius: 44, overflow: 'hidden', border: '8px solid #1B1B1F', height: 920 }}><City3D width={1000} height={904} progress={[0.02, 0.98]} /></div> : renderScene(k, f, e)));

export const Root = () => (
  <>
    <Composition id="TrackbotExplainer" component={Video} durationInFrames={data.total} fps={data.fps} width={1080} height={1920} defaultProps={{ character: 'ada' as const }} />
    <Composition id="MoneyExplainer" component={MoneyVideo} durationInFrames={moneyData.total} fps={moneyData.fps} width={1080} height={1920} defaultProps={{ character: 'ada' as const }} />
    <Composition id="TrackbotExplainer3D" component={Video3D} durationInFrames={data.total} fps={data.fps} width={1080} height={1920} defaultProps={{ character: 'ada' as const }} />
  </>
);
