import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSceneContinuity } from './continuity.mjs';

const bible = {
  visualStyleId: 'warm-3d',
  defaultLocationId: 'classroom',
  locations: { classroom: { setting: 'classroom' }, studio: { setting: 'studio' } },
  characters: { ada: { wardrobeId: 'school-uniform' }, tunde: { wardrobeId: 'blue-shirt' } },
};
const episode = () => ({ scenes: [
  { template: 'hook', who: ['ada'], text: 'A story begins.' },
  { template: 'talk', who: ['ada', 'tunde'], text: 'The teacher speaks.' },
] });

test('inherits locked style, location and wardrobe across scenes', () => {
  const r = resolveSceneContinuity(bible, episode());
  assert.deepEqual(r.errors, []);
  assert.equal(r.scenes[0].setting, 'classroom');
  assert.equal(r.scenes[1].locationId, 'classroom');
  assert.equal(r.scenes[1].wardrobe.ada, 'school-uniform');
  assert.equal(r.scenes[1].wardrobe.tunde, 'blue-shirt');
});
test('rejects accidental location and wardrobe drift', () => {
  const e = episode();
  e.scenes[1].locationId = 'studio';
  e.scenes[1].wardrobe = { ada: 'party-clothes' };
  const r = resolveSceneContinuity(bible, e);
  assert.ok(r.errors.some((x) => x.includes('location changed')));
  assert.ok(r.errors.some((x) => x.includes('wardrobe for "ada" changed')));
});
test('allows explicit story transitions', () => {
  const e = episode();
  e.scenes[1].locationId = 'studio';
  e.scenes[1].wardrobe = { ada: 'party-clothes' };
  e.scenes[1].continuityBreak = true;
  const r = resolveSceneContinuity(bible, e);
  assert.deepEqual(r.errors, []);
  assert.equal(r.scenes[1].setting, 'studio');
});
test('rejects unknown locations and unapproved style drift', () => {
  const e = episode();
  e.scenes[1].locationId = 'moon-base';
  e.scenes[1].visualStyleId = 'photoreal';
  const r = resolveSceneContinuity(bible, e);
  assert.ok(r.errors.some((x) => x.includes('unknown locationId')));
  assert.ok(r.errors.some((x) => x.includes('visual style changed')));
});
