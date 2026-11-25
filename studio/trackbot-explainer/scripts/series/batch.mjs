// Batch runner: lint -> voices -> render -> QA -> contact sheet -> one report, for every episode of a series.
// Usage: node scripts/series/batch.mjs <series-dir> [--only <substring>] [--lint-only]
//   <series-dir> contains bible.json and episodes/*.json.  Output: out/batch/<series>/<ep>.mp4 + .png + report.md
// Nothing is published. The report is for a human to review before any posting.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { lintBible, lintEpisode } from './lib.mjs';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const lintOnly = args.includes('--lint-only');
if (!dir) { console.error('usage: batch.mjs <series-dir> [--only text] [--lint-only]'); process.exit(2); }
const bible = JSON.parse(readFileSync(`${dir}/bible.json`, 'utf8'));
const epDir = `${dir}/episodes`;
const files = readdirSync(epDir).filter((f) => f.endsWith('.json') && (!only || f.includes(only))).sort();
const out = `out/batch/${bible.id}`; mkdirSync(out, { recursive: true });
const PY = process.env.PYTHON ?? 'python3';
const run = (cmd, a, opts = {}) => spawnSync(cmd, a, { encoding: 'utf8', stdio: opts.quiet ? 'pipe' : 'inherit', env: process.env });

const bibleErrors = lintBible(bible);
if (bibleErrors.length) { bibleErrors.forEach((e) => console.error('BIBLE ERROR', e)); process.exit(1); }

const rows = [];
for (const f of files) {
  const ep = JSON.parse(readFileSync(`${epDir}/${f}`, 'utf8'));
  const row = { file: f, id: ep.id, status: 'ok', notes: [], seconds: 0 };
  const lint = lintEpisode(bible, ep);
  row.notes.push(...lint.errors.map((e) => `ERROR ${e}`), ...lint.warnings.map((w) => `warn ${w}`));
  if (lint.errors.length) { row.status = 'lint failed'; rows.push(row); console.log(`${f}: lint failed`); continue; }
  if (lintOnly) { rows.push({ ...row, seconds: lint.seconds, status: 'lint ok' }); continue; }

  console.log(`\n=== ${f} ===`);
  let r = run('node', ['scripts/series/build-episode.mjs', `${dir}/bible.json`, `${epDir}/${f}`, '--out', out], { quiet: true });
  if (r.status !== 0) { row.status = 'voice build failed'; row.notes.push(r.stderr.slice(-300)); rows.push(row); continue; }
  const props = `${out}/${ep.id}.props.json`, mp4 = `${out}/${ep.id}.mp4`;
  r = run('npx', ['remotion', 'render', 'src/index.ts', 'Episode', mp4, `--props=${props}`, '--log=error', '--gl=swangle', '--concurrency=2', '--timeout=240000']);
  if (r.status !== 0) { row.status = 'render failed'; rows.push(row); continue; }
  const total = JSON.parse(readFileSync(props, 'utf8')).total;
  row.seconds = total / 30;
  r = run('node', ['scripts/qa.mjs', mp4, String(row.seconds.toFixed(2))], { quiet: true });
  const qaFail = (r.stdout ?? '').split('\n').filter((l) => /FAIL/i.test(l));
  if (r.status !== 0) { row.status = 'QA failed'; row.notes.push(...qaFail); }
  run(PY, ['scripts/series/contact-sheet.py', mp4, `${out}/${ep.id}.png`, '8'], { quiet: true });
  rows.push(row);
}

const md = [
  `# Batch report: ${bible.title ?? bible.id}`, '',
  bible.note ? `> ${bible.note}` : '', '',
  `${rows.length} episode(s). **Drafts only: a human must review every video before anything is posted.**`, '',
  '| Episode | Status | Length | Contact sheet |', '|---|---|---|---|',
  ...rows.map((r) => `| ${r.id ?? r.file} | ${r.status} | ${r.seconds ? r.seconds.toFixed(1) + 's' : '-'} | ${existsSync(`${out}/${r.id}.png`) ? basename(`${out}/${r.id}.png`) : '-'} |`), '',
  ...rows.filter((r) => r.notes.length).flatMap((r) => [`## ${r.id ?? r.file}`, ...r.notes.map((n) => `- ${n}`), '']),
].join('\n');
writeFileSync(`${out}/report.md`, md);
console.log(`\nreport: ${out}/report.md`);
console.log(rows.map((r) => `${r.id}: ${r.status}`).join('\n'));
process.exit(rows.some((r) => !/^(ok|lint ok)$/.test(r.status)) ? 1 : 0);
