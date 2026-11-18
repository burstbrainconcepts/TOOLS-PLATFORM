// Local voiceover: espeak-ng (no API, no network). Writes public/voice/sN.wav and src/data.json.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const FPS = 30, PAD = 0.6;
const [scriptFile = 'script.json', outFile = 'src/data.json', prefix = 's'] = process.argv.slice(2);
const script = JSON.parse(readFileSync(scriptFile, 'utf8'));
mkdirSync('public/voice', { recursive: true });
let total = 0;
const scenes = script.scenes.map((s, i) => {
  const file = `public/voice/${prefix}${i}.wav`;
  execFileSync('espeak-ng', ['-v', 'en-us+f3', '-s', '150', '-p', '55', '-g', '4', '-w', file, s.text]);
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
  const frames = Math.ceil((dur + PAD) * FPS);
  total += frames;
  return { ...s, audio: `voice/${prefix}${i}.wav`, audioFrames: Math.ceil(dur * FPS), frames };
});
writeFileSync(outFile, JSON.stringify({ tag: script.tag ?? '', fps: FPS, total, title: script.title, brand: script.brand, cta: script.cta, scenes }, null, 2));
console.log(`${scenes.length} scenes, ${(total / FPS).toFixed(1)}s`);
