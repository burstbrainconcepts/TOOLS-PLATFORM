// Local voiceover with Piper neural voices (no API). Needs PIPER_MODEL=/path/to/voice.onnx (+ .onnx.json beside it).
// Writes public/voice/sN.wav and src/data.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { FPS, synthScene } from './lib/voice.mjs';
const [scriptFile = 'script.json', outFile = 'src/data.json', prefix = 's'] = process.argv.slice(2);
const script = JSON.parse(readFileSync(scriptFile, 'utf8'));
const model = process.env.PIPER_MODEL;
if (!model) { console.error('Set PIPER_MODEL to a Piper .onnx voice file (see README).'); process.exit(2); }
const VOICE_DIR = process.env.VOICE_DIR ?? 'voice';
mkdirSync(`public/${VOICE_DIR}`, { recursive: true });
let total = 0;
const scenes = script.scenes.map((s, i) => {
  const r = synthScene({ text: s.text, model, file: `public/${VOICE_DIR}/${prefix}${i}.wav` });
  total += r.frames;
  return { ...s, audio: `${VOICE_DIR}/${prefix}${i}.wav`, ...r };
});
writeFileSync(outFile, JSON.stringify({ tag: script.tag ?? '', character: script.character ?? 'ada', fps: FPS, total, title: script.title, brand: script.brand, cta: script.cta, scenes }, null, 2));
console.log(`${scenes.length} scenes, ${(total / FPS).toFixed(1)}s`);
