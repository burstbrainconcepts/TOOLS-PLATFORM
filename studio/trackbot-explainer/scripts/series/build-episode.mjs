// Build one episode: lint -> per-scene voices (each character's own Piper voice) -> props file for the "Episode" composition.
// Usage: node scripts/series/build-episode.mjs <bible.json> <episode.json> [--out out/episodes] [--no-voice]
// Writes public/episodes/<id>/sNN.wav and <out>/<id>.props.json
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { lintBible, lintEpisode } from './lib.mjs';
import { synthScene } from '../lib/voice.mjs';

const [biblePath, epPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const outDir = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'out/episodes';
const VOICES = process.env.VOICES_DIR ?? '/home/user/voices';
if (!biblePath || !epPath) { console.error('usage: build-episode.mjs <bible.json> <episode.json>'); process.exit(2); }
const bible = JSON.parse(readFileSync(biblePath, 'utf8')), ep = JSON.parse(readFileSync(epPath, 'utf8'));

const be = lintBible(bible);
import { readdirSync } from 'node:fs';
const clips = existsSync('src/mocap') ? readdirSync('src/mocap').filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')) : [];
const { errors, warnings, seconds } = lintEpisode(bible, ep, { clips });
for (const m of [...be, ...errors]) console.error(`ERROR  ${m}`);
for (const m of warnings) console.warn(`warn   ${m}`);
if (be.length || errors.length) process.exit(1);
console.log(`lint ok: ${ep.scenes.length} scenes, about ${seconds.toFixed(0)}s`);

import { spawnSync } from 'node:child_process';
if (!existsSync('public/sfx/bed.wav')) spawnSync('python3', ['scripts/lib/sound.py'], { stdio: 'inherit' });   // procedural sfx + music bed
const defaultWho = Object.keys(bible.characters)[0];
const dir = `public/episodes/${ep.id}`; mkdirSync(dir, { recursive: true }); mkdirSync(outDir, { recursive: true });
const scenes = ep.scenes.map((s, i) => {
  const who = s.who?.length ? s.who : [defaultWho];
  const speaker = s.speaker ?? who[0];
  const voice = bible.characters[speaker].voice;
  const model = `${VOICES}/${voice}.onnx`;
  if (!existsSync(model)) { console.error(`ERROR  voice model missing: ${model}`); process.exit(1); }
  // cache by text+voice so unchanged scenes are not re-synthesised
  const key = createHash('sha1').update(`${voice}|${s.text}|rh2`).digest('hex').slice(0, 10);
  const file = `${dir}/s${String(i + 1).padStart(2, '0')}-${key}.wav`;
  const cache = file.replace('.wav', '.json');
  let t;
  if (existsSync(file) && existsSync(cache)) t = JSON.parse(readFileSync(cache, 'utf8'));
  else { t = synthScene({ text: s.text, model, file }); writeFileSync(cache, JSON.stringify(t)); }
  return { ...s, who, speaker, audio: `episodes/${ep.id}/${file.split('/').pop()}`, audioFrames: t.audioFrames, frames: t.frames, mouth: t.mouth, visemes: t.visemes ?? undefined };
});
const total = scenes.reduce((a, s) => a + s.frames, 0);
const props = { id: ep.id, fps: 30, total, ctx: { chars: bible.characters, palette: bible.palette, brand: bible.brand, cta: bible.cta, style: bible.style ?? '2d', quality3d: bible.quality3d }, scenes };
const out = `${outDir}/${ep.id}.props.json`;
writeFileSync(out, JSON.stringify(props));
console.log(`built ${out}: ${total} frames (${(total / 30).toFixed(1)}s)`);
