import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Scene3D } from './Scene3D';
import type { Ctx, TplScene } from './Templates';

const ctx: Ctx = {
  style: '3d',
  quality3d: 1,
  brand: 'Classroom Preview',
  palette: { accent: '#d77a42', accent2: '#e7b66d', bg: '#eadbc6', ink: '#25232a' },
  chars: {
    teacher: { name: 'Teacher Ada', skin: '#b9784d', hair: '#382016', hairStyle: 'short', shirt: '#b75c35', pants: '#493b55', shoe: '#292b35', glasses: true, body: 'f', model: 'f', voice: 'en-US-female' },
    child1: { name: 'Student 1', skin: '#8d5738', hair: '#211813', hairStyle: 'puff', shirt: '#397c9b', pants: '#34445c', shoe: '#292b35', body: 'm', model: 'm', voice: 'en-US-child-1' },
    child2: { name: 'Student 2', skin: '#d09a6b', hair: '#5a3020', hairStyle: 'short', shirt: '#d19b42', pants: '#405b47', shoe: '#292b35', body: 'm', model: 'm', voice: 'en-US-child-2' },
    child3: { name: 'Student 3', skin: '#a96b49', hair: '#201713', hairStyle: 'puff', shirt: '#7d659b', pants: '#3f3d55', shoe: '#292b35', glasses: true, body: 'f', model: 'f', voice: 'en-US-child-3' },
  },
};

export const classroomPreviewScene: TplScene = {
  template: 'classroom',
  text: 'Welcome to our classroom',
  title: 'Today we learn together',
  who: ['teacher', 'child1', 'child2', 'child3'],
  speaker: 'teacher',
  setting: 'classroom',
  emotion: 'happy',
  frames: 180,
  mouth: Array.from({ length: 180 }, (_, i) => {
    const phrase = i % 72;
    return phrase < 42 ? Math.max(0, Math.sin(phrase * 0.38)) * 0.72 : 0;
  }),
};

export const ClassroomPreview: React.FC = () => {
  const f = useCurrentFrame();
  const scene = useMemo(() => classroomPreviewScene, []);
  return (
    <AbsoluteFill style={{ backgroundColor: '#241b19' }}>
      <Scene3D f={f} scene={scene} ctx={ctx} quality={1} />
    </AbsoluteFill>
  );
};
