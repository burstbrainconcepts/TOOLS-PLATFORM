// Foot-slide test on the REAL rig code (src/rigPose.ts, bundled with esbuild) and the REAL character file, in Node (no browser, no GPU).
// For a walk and a run cycle it measures, while a foot is on the ground:
//   slip  = how fast the foot moves relative to the floor (the floor scrolls backward at the gait speed). 0 = planted.
//   sink  = how far below the floor the foot goes (penetration).
// Usage: node scripts/qa/gait-probe.mjs [rigPose.ts path] [model.glb] [--old]      Exit code 1 if a gate fails.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const src = args[0] ?? 'src/rigPose.ts', glb = args[1] ?? 'public/models/human_ada.glb', OLD = process.argv.includes('--old');
mkdirSync('out/qa', { recursive: true });
await build({ entryPoints: [src], bundle: true, format: 'esm', platform: 'node', outfile: 'out/qa/rigPose.bundle.mjs', external: ['three'], logLevel: 'error', loader: { '.ts': 'ts' } });
const R = await import(pathToFileURL(process.cwd() + '/out/qa/rigPose.bundle.mjs').href);

// strip images/textures so the loader needs no browser (the skeleton and meshes are all this test needs)
const buf = readFileSync(glb); const jl = buf.readUInt32LE(12); const json = JSON.parse(buf.slice(20, 20 + jl).toString());
delete json.images; delete json.textures; delete json.samplers;
for (const m of json.materials ?? []) { delete m.normalTexture; delete m.occlusionTexture; delete m.emissiveTexture; if (m.pbrMetallicRoughness) { delete m.pbrMetallicRoughness.baseColorTexture; delete m.pbrMetallicRoughness.metallicRoughnessTexture; } }
const jb = Buffer.from(JSON.stringify(json)); const pad = (4 - (jb.length % 4)) % 4; const jbp = Buffer.concat([jb, Buffer.alloc(pad, 0x20)]);
const binStart = 20 + jl + 8; const bin = buf.slice(binStart, binStart + buf.readUInt32LE(20 + jl));
const out = Buffer.alloc(12 + 8 + jbp.length + 8 + bin.length); out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
out.writeUInt32LE(jbp.length, 12); out.writeUInt32LE(0x4e4f534a, 16); jbp.copy(out, 20); const o2 = 20 + jbp.length; out.writeUInt32LE(bin.length, o2); out.writeUInt32LE(0x004e4942, o2 + 4); bin.copy(out, o2 + 8);
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(out.buffer.slice(out.byteOffset, out.byteOffset + out.length), '', res, rej));

const rig = R.buildRig(gltf.scene, { skin: '#8D5524', shirt: '#2B6CFF' });
const bone = (n) => rig.bones[n];
const sufP = rig.suf.p, sufN = rig.suf.n;
const FPS = 30, SECS = 8;
if (process.argv.includes('--debug')) {
  R.applyPose(rig, { walk: 0.0, stride: 1 }); rig.root.updateMatrixWorld(true);
  const P = (n) => rig.bones[n].getWorldPosition(new THREE.Vector3()).toArray().map((v) => +v.toFixed(3));
  const L = rig.leg.p;
  console.error('rest hip', L.hip.toArray().map((v) => +v.toFixed(3)), 'l1', +L.l1.toFixed(3), 'l2', +L.l2.toFixed(3), 'ankleY', +L.ankleY.toFixed(3), 'root.y', rig.root.position.y.toFixed(3));
  console.error('posed: pelvis', P('pelvis'), 'thigh', P('thigh' + sufP), 'calf', P('calf' + sufP), 'foot', P('foot' + sufP));
  console.error('posed other: thigh', P('thigh' + sufN), 'calf', P('calf' + sufN), 'foot', P('foot' + sufN));
}
const results = {};
for (const mode of ['walk', 'run']) {
  const run = mode === 'run';
  const cad = run ? (R.GAIT?.run.cad ?? 1.35) : (R.GAIT?.walk.cad ?? 0.95);
  const floorSpeed = R.gaitSpeedRig ? R.gaitSpeedRig(run) : (run ? 3.15 : 1.61);          // old code: constant ground speed used by the renderer (rig metres/s)
  const rows = []; let ankle0 = null;
  for (let f = 0; f < FPS * SECS; f++) {
    R.applyPose(rig, { walk: 2 * Math.PI * cad * (f / FPS), stride: run ? 1.5 : 1, armR: 12, armL: 12, elbowR: 12, elbowL: 12 });
    rig.root.updateMatrixWorld(true);
    const P = (n) => bone(n).getWorldPosition(new THREE.Vector3());
    const fp = P('foot' + sufP), fn = P('foot' + sufN);
    rows.push({ p: fp, n: fn, pelvis: P('pelvis') });
  }
  ankle0 ??= rig.leg?.p.ankleY ?? Math.min(...rows.map((r) => r.p.y));
  const allY = rows.flatMap((r) => [r.p.y, r.n.y]).sort((x, y) => x - y), groundY = allY[Math.floor(allY.length * 0.05)];   // ground height as seen in the data (5th percentile)
  let slips = [], sink = 0, stanceFrames = 0;
  for (const side of ['p', 'n']) {
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1][side], b = rows[i][side];
      const onGround = Math.max(a.y, b.y) < groundY + 0.004;           // in contact in both frames: within 4 mm of the lowest foot height actually reached
      if (!onGround) continue;
      stanceFrames++;
      const vz = (b.z - a.z) * FPS;                  // forward speed of the foot (rig metres/s); the floor moves at -floorSpeed
      slips.push(Math.abs(vz + floorSpeed));
      if (process.argv.includes('--trace') && mode === 'walk' && side === 'p' && i < 70) console.error('f', i, 'foot z', b.z.toFixed(3), 'y', b.y.toFixed(3), 'vz', vz.toFixed(2), 'slip', Math.abs(vz + floorSpeed).toFixed(2));
      sink = Math.max(sink, groundY - b.y);
    }
  }
  const ys = rows.map((r) => r.pelvis.y); const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const fy = rows.map((r) => r.p.y); console.error(mode, 'ankle rest y', ankle0.toFixed(3), 'foot y range', Math.min(...fy).toFixed(3), Math.max(...fy).toFixed(3), 'root y', rig.root.position.y.toFixed(3));
  const sorted = [...slips].sort((x, y) => x - y), p95 = sorted[Math.floor(sorted.length * 0.95)] ?? NaN;
  results[mode] = { floorSpeed: +floorSpeed.toFixed(2), stanceSamples: stanceFrames, meanSlipCmS: +(mean(slips) * 100).toFixed(1), p95SlipCmS: +(p95 * 100).toFixed(1), maxSlipCmS: +(Math.max(...slips) * 100).toFixed(1),
    meanSlipPct: +((mean(slips) / floorSpeed) * 100).toFixed(1), p95SlipPct: +((p95 / floorSpeed) * 100).toFixed(1), maxSinkCm: +(sink * 100).toFixed(1), pelvisRangeCm: +((Math.max(...ys) - Math.min(...ys)) * 100).toFixed(1) };
}
console.log(JSON.stringify(results, null, 1));
// Proposed gates (NOT calibrated against a reference clip): relative to floor speed, 95th percentile instead of the single worst frame (the toe-off frame is a measurement edge).
const GATE = { meanSlipPct: 5, p95SlipPct: 10, maxSinkCm: 1.5 };
let fail = false;
for (const [m, r] of Object.entries(results)) if (r.stanceSamples < 50) { console.log(`FAIL ${m}: only ${r.stanceSamples} ground-contact samples, the measurement is not valid`); fail = true; }
for (const [m, r] of Object.entries(results)) for (const [k, lim] of Object.entries(GATE)) if (r[k] > lim) { console.log(`FAIL ${m} ${k} = ${r[k]} > ${lim}`); fail = true; }
console.log(fail ? 'GAIT GATE FAILED' : 'GAIT GATE PASSED');
process.exit(fail ? 1 : 0);
