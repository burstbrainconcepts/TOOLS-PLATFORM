// Local voiceover: espeak-ng (no API, no network). Writes public/voice/sN.wav and src/data.json.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
const FPS = 30, PAD = 0.6;
const [scriptFile = 'script.json', outFile = 'src/data.json', prefix = 's'] = process.argv.slice(2);
const script = JSON.parse(readFileSync(scriptFile, 'utf8'));
mkdirSync('public/voice', { recursive: true });
let total = 0;
const scenes = script.scenes.map((s, i) => {
  const file = `public/voice/${prefix}${i}.wav`;
  const raw = file.replace('.wav', '.raw.wav');
  if (process.env.PIPER_MODEL) {
    // Neural voice (much better). PIPER_MODEL = path to a .onnx voice file.
    execFileSync('python3', ['-m', 'piper', '-m', process.env.PIPER_MODEL, '-f', raw], { input: s.text });
  } else {
    // Fallback only: formant synthesizer. Robotic by design.
    execFileSync('espeak-ng', ['-v', 'en-us+f3', '-s', '150', '-p', '55', '-g', '4', '-w', raw, s.text]);
  }
  // Mastering: 48 kHz, remove rumble, short fades (no clicks at scene joins), loudness to about -16 LUFS.
  const rawDur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', raw]).toString());
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af',
    `highpass=f=70,afade=t=in:d=0.02,afade=t=out:st=${Math.max(rawDur - 0.05, 0).toFixed(3)}:d=0.05,loudnorm=I=-16:TP=-2:LRA=7`,
    '-ar', '48000', '-ac', '1', file]);
  unlinkSync(raw);
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
  const frames = Math.ceil((dur + PAD) * FPS);
  total += frames;
  return { ...s, audio: `voice/${prefix}${i}.wav`, audioFrames: Math.ceil(dur * FPS), frames };
});
writeFileSync(outFile, JSON.stringify({ tag: script.tag ?? '', fps: FPS, total, title: script.title, brand: script.brand, cta: script.cta, scenes }, null, 2));
console.log(`${scenes.length} scenes, ${(total / FPS).toFixed(1)}s`);
