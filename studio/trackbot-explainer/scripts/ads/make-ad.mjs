// One command: product image + brief -> analysed product, ad scripts (hook variants), linted, voiced, rendered, QA'd, contact sheets.
// Usage: node scripts/ads/make-ad.mjs ads/<name> [--variants problem,pov,meet] [--lint-only] [--bible series/demo/bible.json]
// ads/<name>/ holds brief.json and a product image (product.jpg|png|webp). Output: out/batch/ad-<name>/ (videos, sheets, report.md)
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { basename } from 'node:path';
import { writeAds } from './write-script.mjs';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
if (!dir) { console.error('usage: make-ad.mjs ads/<name> [--variants a,b] [--lint-only] [--bible path]'); process.exit(2); }
const name = basename(dir);
const brief = JSON.parse(readFileSync(`${dir}/brief.json`, 'utf8'));
const image = readdirSync(dir).find((f) => /^product\.(jpe?g|png|webp)$/i.test(f));
if (!image) { console.error(`no product image in ${dir} (product.jpg / .png / .webp)`); process.exit(1); }
const PY = process.env.ANALYZE_PY ?? '/home/user/cpu-test/venv/bin/python';

// 1. analyse the product image (cutout + palette)
const work = `out/ads/${name}`; mkdirSync(work, { recursive: true });
let r = spawnSync(PY, ['scripts/ads/analyze.py', `${dir}/${image}`, work], { encoding: 'utf8' });
if (r.status !== 0) { console.error('image analysis failed:\n' + r.stderr); process.exit(1); }
const analysis = JSON.parse(readFileSync(`${work}/analysis.json`, 'utf8'));
console.log(`product: cutout=${analysis.cutout}, accent ${analysis.accent}, accent2 ${analysis.accent2}${analysis.note ? ' (' + analysis.note + ')' : ''}`);
mkdirSync(`public/ads/${name}`, { recursive: true });
copyFileSync(`${work}/product.png`, `public/ads/${name}/product.png`);

// 2. a series bible for this ad: the shared cast (consistent characters) + the product's own colours
const base = JSON.parse(readFileSync(opt('--bible') ?? 'series/demo/bible.json', 'utf8'));
const palette = { ...base.palette, accent: analysis.accent, accent2: analysis.accent2 };
const bible = { ...base, id: `ad-${name}`, title: `Ad: ${brief.name}`, brand: brief.name, cta: brief.cta, palette, note: `Draft ads built from ads/${name}/brief.json. Review before posting.`,
  rules: { ...base.rules, targetSeconds: [15, 45], bannedPhrases: [...(base.rules?.bannedPhrases ?? []), 'doctors', 'cure'] } };
const out = `out/ads/${name}/series`; rmSync(`${out}/episodes`, { recursive: true, force: true }); mkdirSync(`${out}/episodes`, { recursive: true });
writeFileSync(`${out}/bible.json`, JSON.stringify(bible, null, 2));

// 3. scripts (one per hook variant), then lint + voice + render + QA through the shared batch runner
const variants = (opt('--variants') ?? 'problem,pov,meet').split(',');
const eps = writeAds(brief, { variants, idPrefix: name, productSrc: `ads/${name}/product.png`, palette });
eps.forEach((e, i) => writeFileSync(`${out}/episodes/${String(i + 1).padStart(2, '0')}-${e.id}.json`, JSON.stringify(e, null, 2)));
console.log(`wrote ${eps.length} ad script(s) to ${out}/episodes`);
r = spawnSync('node', ['scripts/series/batch.mjs', out, ...(args.includes('--lint-only') ? ['--lint-only'] : [])], { stdio: 'inherit' });
process.exit(r.status ?? 1);
