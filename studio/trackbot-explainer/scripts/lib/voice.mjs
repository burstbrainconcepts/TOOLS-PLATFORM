// Shared voice synthesis: Piper neural voice -> mastered 48 kHz wav + per-frame mouth openness (for lip sync).
import { execFileSync } from 'node:child_process';
import { mkdirSync, unlinkSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const FPS = 30, PAD = 0.6;
// Text as it is spoken, for the phoneme aligner (digits to words, CamelCase split, hyphens removed): numbers and brand names confuse its dictionary otherwise.
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const words = (n) => (n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '') : n < 1000 ? ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + words(n % 100) : '') : String(n));
export const spokenForm = (t) => t.replace(/\$(\d+)/g, (_, n) => `${words(+n)} dollars`).replace(/(\d+)%/g, (_, n) => `${words(+n)} percent`).replace(/\d+/g, (n) => words(+n))
  .replace(/([a-z])([A-Z])/g, '$1 $2').replace(/-/g, ' ').replace(/[^A-Za-z' .,?!]/g, ' ').replace(/\s+/g, ' ').trim();
const probeDuration = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

/** Synthesize `text` with the Piper voice at `model` into `file`. Returns timing and mouth data for the scene. */
export function synthScene({ text, model, file }) {
  mkdirSync(dirname(file), { recursive: true });
  const raw = file.replace('.wav', '.raw.wav');
  execFileSync('python3', ['-m', 'piper', '-m', model, '-f', raw], { input: text });
  // Mastering: 48 kHz, remove rumble, short fades (no clicks at scene joins), loudness to about -16 LUFS.
  const rawDur = probeDuration(raw);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af',
    `highpass=f=70,afade=t=in:d=0.02,afade=t=out:st=${Math.max(rawDur - 0.05, 0).toFixed(3)}:d=0.05,loudnorm=I=-16:TP=-2:LRA=7`,
    '-ar', '48000', '-ac', '1', file]);
  unlinkSync(raw);
  const dur = probeDuration(file);
  const frames = Math.ceil((dur + PAD) * FPS);
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
  // Phoneme-based mouth shapes (Rhubarb Lip Sync, MIT, CPU): cues [start, end, shape] with shapes A-H and X. Optional: set RHUBARB or install it at the default path.
  const RH = process.env.RHUBARB ?? '/home/user/rhubarb-bin/Rhubarb-Lip-Sync-1.14.0-Linux/rhubarb';
  let visemes = null;
  if (existsSync(RH)) {
    const txt = file.replace('.wav', '.txt'), js = file.replace('.wav', '.cues.json');
    writeFileSync(txt, spokenForm(text));
    try { execFileSync(RH, ['-f', 'json', '-q', '-d', txt, '-o', js, file], { stdio: 'pipe' }); visemes = JSON.parse(readFileSync(js, 'utf8')).mouthCues.map((c) => [c.start, c.end, c.value]); }
    catch (e) { console.warn('rhubarb failed, falling back to loudness-only lip sync:', String(e.message).slice(0, 120)); }
  }
  return { audioFrames: Math.ceil(dur * FPS), frames, mouth, visemes };
}
