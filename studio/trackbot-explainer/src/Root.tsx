import { Composition } from 'remotion';
import data from './data.json';
import { Video } from './Video';

export const Root = () => (
  <Composition id="TrackbotExplainer" component={Video} durationInFrames={data.total} fps={data.fps} width={1080} height={1920} />
);
