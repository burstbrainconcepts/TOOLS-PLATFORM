// Automated QA for a rendered video. Usage: node scripts/qa.mjs <video.mp4> [expectedSeconds]
// Exits non-zero if any hard check fails. Uses only ffmpeg/ffprobe.
import { execFileSync, spawnSync } from 'node:child_process';

const file = process.argv[2];
const expected = process.argv[3] ? parseFloat(process.argv[3]) : null;
if (!file) { console.error('usage: node scripts/qa.mjs <video.mp4> [expectedSeconds]'); process.exit(2); }

const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString());
const v = probe.streams.find((s) => s.codec_type === 'video');
const a = probe.streams.find((s) => s.codec_type === 'audio');
const dur = parseFloat(probe.format.duration);
const ff = (args) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, ...args, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;

const results = [];
const check = (name, ok, detail, hard = true) => results.push({ name, ok, detail, hard });

check('has video stream', !!v, v ? `${v.width}x${v.height} ${v.codec_name}` : 'missing');
check('has audio stream', !!a, a ? `${a.codec_name} ${a.sample_rate}Hz` : 'missing');
if (v) {
  const [n, d] = v.r_frame_rate.split('/').map(Number);
  check('resolution is 1080x1920 or 1920x1080', (v.width === 1080 && v.height === 1920) || (v.width === 1920 && v.height === 1080), `${v.width}x${v.height}`);
  check('frame rate 24-60', n / d >= 24 && n / d <= 60, `${(n / d).toFixed(2)} fps`);
}
if (expected) check('duration matches script', Math.abs(dur - expected) < 1.5, `${dur.toFixed(1)}s vs ${expected}s`);

if (a) {
  const stats = ff(['-af', 'astats=metadata=0:reset=0,ebur128=peak=true']);
  const peak = parseFloat((stats.match(/Peak level dB:\s*(-?[\d.]+)/g) || []).pop()?.split(':')[1] ?? 'NaN');
  const flat = Math.max(...(stats.match(/Flat factor:\s*([\d.]+)/g) || ['Flat factor: 0']).map((s) => parseFloat(s.split(':')[1])));
  const lufs = parseFloat((stats.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop()?.match(/-?[\d.]+/)?.[0] ?? 'NaN');
  check('no clipping (peak <= -1 dB)', peak <= -1, `peak ${peak} dB`);
  check('no flat-topped waveform', flat < 5, `flat factor ${flat}`);
  check('loudness -20..-12 LUFS', lufs >= -20 && lufs <= -12, `${lufs} LUFS`, false);

  const sil = ff(['-af', 'silencedetect=n=-45dB:d=2']);
  const longSilences = (sil.match(/silence_duration: [\d.]+/g) || []).map((s) => parseFloat(s.split(': ')[1]));
  check('no silence longer than 2s', longSilences.length === 0, longSilences.length ? longSilences.map((s) => s.toFixed(1) + 's').join(', ') : 'ok', false);

}

const black = ff(['-vf', 'blackdetect=d=0.5:pix_th=0.05']);
const blackN = (black.match(/black_start/g) || []).length;
check('no black frames > 0.5s', blackN === 0, blackN ? `${blackN} black segment(s)` : 'ok');
const freeze = ff(['-vf', 'freezedetect=n=-60dB:d=6']);
const freezeN = (freeze.match(/freeze_start/g) || []).length;
check('no frozen video > 6s', freezeN === 0, freezeN ? `${freezeN} freeze(s)` : 'ok', false);

let failed = 0;
for (const r of results) {
  const tag = r.ok ? 'PASS' : r.hard ? 'FAIL' : 'WARN';
  if (!r.ok && r.hard) failed++;
  console.log(`${tag}  ${r.name}  (${r.detail})`);
}
console.log(failed ? `\nQA FAILED: ${failed} hard check(s)` : '\nQA passed (automated checks only; a human must still watch and listen)');
process.exit(failed ? 1 : 0);
