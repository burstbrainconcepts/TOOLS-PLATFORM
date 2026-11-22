import test from 'node:test';
import assert from 'node:assert/strict';
import { lintEpisode, lintBible, words, estimateSeconds } from './lib.mjs';

const bible = {
  id: 't', palette: { accent: '#f00', accent2: '#00f', bg: '#fff', ink: '#000' },
  characters: { ada: { name: 'Ada', skin: '#8D5524', shirt: '#2B6CFF', voice: 'v' }, mel: { name: 'Mel', skin: '#6B4226', shirt: '#1FA66A', voice: 'v2' } },
  rules: { bannedPhrases: ['guaranteed'], targetSeconds: [8, 60] },
};
const ok = () => ({
  id: 'e1',
  scenes: [
    { template: 'hook', who: ['mel'], title: 'Why?', text: 'Why is the sky blue today?' },
    { template: 'board', who: ['ada'], title: 'Light', bullets: ['Sunlight', 'Scatters'], text: 'Sunlight scatters in the air.' },
    { template: 'outro', who: ['ada'], text: 'Follow for more.' },
  ],
});

test('words counts words, not punctuation', () => { assert.equal(words("Don't stop, 100% sure!"), 4); assert.equal(words(''), 0); });
test('a good episode has no errors', () => { const r = lintEpisode(bible, ok()); assert.deepEqual(r.errors, []); assert.ok(r.seconds > 3); });
test('unknown template, character and icon are errors', () => {
  const e = ok(); e.scenes[1].template = 'nope'; e.scenes[0].who = ['zed']; e.scenes.splice(2, 0, { template: 'flow', who: ['ada'], icons: ['phone', 'banana'], text: 'x y' });
  const r = lintEpisode(bible, e);
  assert.ok(r.errors.some((m) => m.includes('unknown template')));
  assert.ok(r.errors.some((m) => m.includes('unknown character "zed"')));
  assert.ok(r.errors.some((m) => m.includes('unknown icon "banana"')));
});
test('template-specific fields are required', () => {
  const e = ok(); e.scenes[1] = { template: 'board', who: ['ada'], text: 'No title or bullets here.' };
  const r = lintEpisode(bible, e);
  assert.ok(r.errors.some((m) => m.includes('board needs "title"')) && r.errors.some((m) => m.includes('bullets')));
});
test('banned phrases are errors', () => { const e = ok(); e.scenes[1].text = 'This is guaranteed to work.'; assert.ok(lintEpisode(bible, e).errors.some((m) => m.includes('banned phrase'))); });
test('structure warnings: no hook, no outro, repeats', () => {
  const e = { id: 'e', scenes: Array.from({ length: 5 }, () => ({ template: 'talk', who: ['ada'], text: 'Just talking here for a bit.' })) };
  const w = lintEpisode(bible, e).warnings.join(' | ');
  assert.match(w, /not a "hook"/); assert.match(w, /not an "outro"/); assert.match(w, /repeated 3 times/); assert.match(w, /only 1 different templates/);
});
test('ad claims: superlatives and invented numbers are errors unless in the brief', () => {
  const e = ok(); e.type = 'ad'; e.brief = { claimsAllowed: [], benefits: ['keeps drinks cold for 12 hours'] };
  e.scenes[1].text = 'It is the best bottle and cuts waste by 40%.';
  const r = lintEpisode(bible, e);
  assert.ok(r.errors.some((m) => m.includes('unsupported claim "best"')));
  assert.ok(r.errors.some((m) => m.includes('number "40%"')));
  e.scenes[1].text = 'It keeps drinks cold for 12 hours.';
  assert.deepEqual(lintEpisode(bible, e).errors, []);
});
test('a number ending a sentence still matches the brief', () => {
  const e = ok(); e.type = 'ad'; e.brief = { price: '$24' }; e.scenes[1].text = 'It costs $24.';
  assert.deepEqual(lintEpisode(bible, e).errors, []);
});
test('length estimate and target', () => {
  const e = ok(); e.scenes[0].text = 'word '.repeat(200);
  const r = lintEpisode(bible, e);
  assert.ok(r.warnings.some((m) => m.includes('outside the series target')));
  assert.ok(estimateSeconds(e.scenes) > 60);
});
test('bible validation', () => { assert.deepEqual(lintBible(bible), []); assert.ok(lintBible({ id: 'x', characters: {}, palette: {} }).length >= 2); });
