import { Composition } from 'remotion';
import data from './data.json';
import { Video } from './Video';
import { MoneyVideo, moneyData } from './Money';

export const Root = () => (
  <>
    <Composition id="TrackbotExplainer" component={Video} durationInFrames={data.total} fps={data.fps} width={1080} height={1920} />
    <Composition id="MoneyExplainer" component={MoneyVideo} durationInFrames={moneyData.total} fps={moneyData.fps} width={1080} height={1920} />
  </>
);
