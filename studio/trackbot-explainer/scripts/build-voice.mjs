// Local voiceover with Piper neural voices (no API). Needs PIPER_MODEL=/path/to/voice.onnx (+ .onnx.json beside it).
// Writes public/voice/sN.wav and src/data.json.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
const FPS = 30, PAD = 0.6;
const [scriptFile = 'script.json', outFile = 'src/data.json', prefix = 's'] = process.argv.slice(2);
const script = JSON.parse(readFileSync(scriptFile, 'utf8'));
const model = process.env.PIPER_MODEL;
if (!model) { console.error('Set PIPER_MODEL to a Piper .onnx voice file (see README).'); process.exit(2); }
mkdirSync('public/voice', { recursive: true });
let total = 0;
const scenes = script.scenes.map((s, i) => {
  const file = `public/voice/${prefix}${i}.wav`;
  const raw = file.replace('.wav', '.raw.wav');
  execFileSync('python3', ['-m', 'piper', '-m', model, '-f', raw], { input: s.text });
  // Mastering: 48 kHz, remove rumble, short fades (no clicks at scene joins), loudness to about -16 LUFS.
  const rawDur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', raw]).toString());
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af',
    `highpass=f=70,afade=t=in:d=0.02,afade=t=out:st=${Math.max(rawDur - 0.05, 0).toFixed(3)}:d=0.05,loudnorm=I=-16:TP=-2:LRA=7`,
    '-ar', '48000', '-ac', '1', file]);
  unlinkSync(raw);
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
  const frames = Math.ceil((dur + PAD) * FPS);
  total += frames;
  // Mouth openness per video frame from the voice loudness (lip-flap driven by the real audio).
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], { maxBuffer: 1 << 28 });
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
  const win = Math.floor(16000 / FPS);
  const rms = Array.from({ length: frames }, (_, f) => {
    let sum = 0, n = 0;
    for (let k = f * win; k < Math.min((f + 1) * win, samples.length); k++) { sum += samples[k] * samples[k]; n++; }
    return n ? Math.sqrt(sum / n) : 0;
  });
  const sorted = [...rms].sort((a, b) => a - b);
  const ref = sorted[Math.floor(sorted.length * 0.95)] || 1;
  let prev = 0;
  const mouth = rms.map((r) => { const t = Math.min(1, r / ref); const v = t < 0.12 ? 0 : t; prev = prev * 0.45 + v * 0.55; return Math.round(prev * 100) / 100; });
  return { ...s, audio: `voice/${prefix}${i}.wav`, audioFrames: Math.ceil(dur * FPS), frames, mouth };
});
writeFileSync(outFile, JSON.stringify({ tag: script.tag ?? '', character: script.character ?? 'ada', fps: FPS, total, title: script.title, brand: script.brand, cta: script.cta, scenes }, null, 2));
console.log(`${scenes.length} scenes, ${(total / FPS).toFixed(1)}s`);
