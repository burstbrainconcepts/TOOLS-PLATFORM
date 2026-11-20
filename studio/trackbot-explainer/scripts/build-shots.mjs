// Builds the pre-rendered 3D shot clips used by the TrackbotExplainer3D video (public/shots/<id>.mp4 + manifest.json).
// For each shot in src/shots.config.json:
//   1. render the half-rate (15 fps) composition,
//   2. run the interpolation quality gate (postprocess/shotfx.py),
//   3. gate passed  -> interpolate to 30 fps;   gate rejected -> render the full-rate (30 fps) composition instead.
// Usage: node scripts/build-shots.mjs [--force] [--reuse]
//   --force  rebuild even if the clip is up to date      --reuse  reuse existing out/shots/Shot*.mp4 renders newer than the code
// Env: POSTPROCESS_PY = python with onnxruntime + opencv (default python3); CHROME_PATH as for Remotion.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const PY = process.env.POSTPROCESS_PY ?? 'python3';
const force = process.argv.includes('--force'), reuse = process.argv.includes('--reuse');
const data = JSON.parse(readFileSync('src/data.json', 'utf8'));
const config = JSON.parse(readFileSync('src/shots.config.json', 'utf8'));
mkdirSync('public/shots', { recursive: true }); mkdirSync('out/shots', { recursive: true });
const manifestPath = 'public/shots/manifest.json';
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);
const codeFiles = ['src/City3D.tsx', 'src/Shots.tsx', 'src/shots.config.json', 'postprocess/shotfx.py'];
const codeHash = sha(codeFiles.map((f) => readFileSync(f, 'utf8')).join('\n'));
const newestCode = Math.max(...codeFiles.map((f) => statSync(f).mtimeMs));
const cap = (id) => id[0].toUpperCase() + id.slice(1);

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
  return r.status;
}
function render(comp, out) {
  if (reuse && existsSync(out) && statSync(out).mtimeMs > newestCode) { console.log(`reuse ${out}`); return; }
  console.log(`rendering ${comp} -> ${out}`);
  const st = run('npx', ['remotion', 'render', 'src/index.ts', comp, out, '--log=error', '--gl=swangle', '--concurrency=2', '--timeout=240000']);
  if (st !== 0) { console.error(`render of ${comp} failed`); process.exit(1); }
}

for (const c of config) {
  const frames = data.scenes.find((s) => s.kind === c.sceneKind)?.frames;
  if (!frames) { console.error(`no scene "${c.sceneKind}" in src/data.json`); process.exit(1); }
  const hash = sha(codeHash + ':' + frames);
  const final = `public/shots/${c.id}.mp4`;
  if (!force && manifest[c.id]?.hash === hash && existsSync(final)) { console.log(`${c.id}: up to date (${manifest[c.id].method})`); continue; }

  const half = `out/shots/Shot${cap(c.id)}15.mp4`, interp = `out/shots/${c.id}_from15.mp4`, report = `out/shots/${c.id}_report.json`;
  render(`Shot${cap(c.id)}15`, half);
  const st = run(PY, ['postprocess/shotfx.py', 'interpolate', half, interp, '--report', report]);
  let method;
  if (st === 0) { copyFileSync(interp, final); method = 'interpolated'; }
  else if (st === 3) { console.log(`${c.id}: gate rejected interpolation -> using a full-rate render`); render(`Shot${cap(c.id)}30`, `out/shots/Shot${cap(c.id)}30.mp4`); copyFileSync(`out/shots/Shot${cap(c.id)}30.mp4`, final); method = 'full'; }
  else { console.error(`${c.id}: post-processing failed (exit ${st})`); process.exit(1); }
  const gate = existsSync(report) ? JSON.parse(readFileSync(report, 'utf8')).gate : null;
  manifest[c.id] = { file: `shots/${c.id}.mp4`, method, hash, frames, gate: gate && { ok: gate.ok, bad_fraction: gate.bad_fraction, rerender_frames_2x: gate.rerender_frames_2x } };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`${c.id}: ${method}`);
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('manifest:', JSON.stringify(Object.fromEntries(Object.entries(manifest).map(([k, v]) => [k, v.method]))));
