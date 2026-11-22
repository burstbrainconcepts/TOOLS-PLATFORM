// Shared voice synthesis: Piper neural voice -> mastered 48 kHz wav + per-frame mouth openness (for lip sync).
import { execFileSync } from 'node:child_process';
import { mkdirSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';

export const FPS = 30, PAD = 0.6;
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
  return { audioFrames: Math.ceil(dur * FPS), frames, mouth };
}
