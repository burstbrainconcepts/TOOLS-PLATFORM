// Lists the animation clip names inside an Ara GLB (the names a scene's "ara.clip" can use). Usage: node scripts/ara/list-clips.mjs [model=ada] [filter]
import { readFileSync } from 'node:fs';
const b = readFileSync(`public/models/ara/${process.argv[2] ?? 'ada'}.glb`); const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
const f = (process.argv[3] ?? '').toLowerCase(); const n = j.animations.map((a) => a.name).filter((x) => x.toLowerCase().includes(f));
console.log(n.length + ' clips\n' + n.join('\n'));
