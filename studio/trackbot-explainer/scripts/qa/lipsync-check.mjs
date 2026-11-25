// Lip-sync gate: are the phoneme mouth shapes (Rhubarb cues) consistent with the audio? Compares, per scene and per frame, the jaw openness implied
// by the cues with the loudness-derived mouth openness (two independent estimates from the same audio). A timing offset, missing cues or
// a wrong file would show as low correlation. It does NOT prove the visemes are phonetically correct (that needs a reference).
// Usage: node scripts/qa/lipsync-check.mjs <episode.props.json>
// Gate (proposed, uncalibrated): in every scene >= 80% of loud frames (mouth > 0.35) have an open mouth shape, mean >= 90%, cue end within 0.25 s of the audio end.
// Raw correlation is only informational: loudness and jaw opening legitimately differ (loud 's' sounds have a nearly closed jaw), so it is capped well below 1 (about 0.2-0.65 here).
import { readFileSync } from 'node:fs';
const OPEN = { X: 0, A: 0, B: 0.2, C: 0.55, D: 0.95, E: 0.45, F: 0.2, G: 0.22, H: 0.42 };   // same jaw-opening values as VIS in src/Scene3D.tsx
const props = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const corr = (a, b) => { const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return saa && sbb ? sab / Math.sqrt(saa * sbb) : NaN; };
let fail = false; const rs = [], lo = [];
props.scenes.forEach((s, i) => {
  if (!s.visemes?.length) { console.log(`scene ${i + 1} (${s.template}): NO CUES`); fail = true; return; }
  const n = Math.min(s.audioFrames, s.mouth.length);
  const vis = Array.from({ length: n }, (_, f) => { const t = f / 30, c = s.visemes.find((c) => t >= c[0] && t < c[1]); return c ? OPEN[c[2]] ?? 0 : 0; });
  const loud = []; const quiet = [];
  for (let f = 0; f < n; f++) { if (s.mouth[f] > 0.35) loud.push(f); else if (s.mouth[f] < 0.05) quiet.push(f); }
  const loudOpen = loud.length ? loud.filter((f) => vis[f] >= 0.2).length / loud.length : NaN;
  const quietClosed = quiet.length ? quiet.filter((f) => vis[f] < 0.1).length / quiet.length : NaN;
  const sm = (a) => a.map((_, k) => (a[Math.max(0, k - 1)] + a[k] + a[Math.min(a.length - 1, k + 1)]) / 3);
  const r = corr(sm(vis), sm(s.mouth.slice(0, n))); rs.push(r); lo.push(loudOpen);
  const end = s.visemes[s.visemes.length - 1][1], audio = s.audioFrames / 30, cover = Math.abs(end - audio);
  console.log(`scene ${i + 1} (${s.template}): loud frames with an open mouth shape ${(loudOpen * 100).toFixed(0)}% (${loud.length}), [info] quiet frames closed ${(quietClosed * 100).toFixed(0)}%, [info] r = ${r.toFixed(2)}, cues ${s.visemes.length}, cue end ${end.toFixed(2)} s vs audio ${audio.toFixed(2)} s`);
  if (!(loudOpen >= 0.8) || cover > 0.25) fail = true;
});
const mean = lo.reduce((x, y) => x + y, 0) / lo.length; console.log(`mean loud-frame open-shape rate = ${(mean * 100).toFixed(0)}%`);
if (!(mean >= 0.9)) fail = true;
console.log(fail ? 'LIPSYNC GATE FAILED' : 'LIPSYNC GATE PASSED'); process.exit(fail ? 1 : 0);
