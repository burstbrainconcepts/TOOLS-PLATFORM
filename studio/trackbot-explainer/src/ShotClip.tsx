import React, { useEffect, useState } from 'react';
import { OffthreadVideo, continueRender, delayRender, staticFile } from 'remotion';
import { City3D } from './City3D';
import type { ShotSpec } from './Shots';

// Plays a pre-rendered shot clip (public/shots/<id>.mp4, built by scripts/build-shots.mjs). If no clip exists for the
// shot, falls back to rendering the 3D scene live, so the video always works.
type Manifest = Record<string, { file: string }>;
const useManifest = (): Manifest | null => {
  const [m, setM] = useState<Manifest | null>(null);
  const [handle] = useState(() => delayRender('shot manifest'));
  useEffect(() => {
    fetch(staticFile('shots/manifest.json')).then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((j) => { setM(j); continueRender(handle); });
  }, [handle]);
  return m;
};

export const ShotClip: React.FC<{ spec: ShotSpec }> = ({ spec }) => {
  const m = useManifest();
  if (m === null) return null;
  const entry = m[spec.id];
  if (!entry) return <City3D width={1080} height={1920} progress={spec.progress as [number, number]} dusk={spec.dusk} />;
  return <OffthreadVideo src={staticFile(entry.file)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
};
