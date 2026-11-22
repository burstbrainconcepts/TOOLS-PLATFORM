// Series engine core: bible + episode validation ("lint"). Pure functions, no I/O, unit-tested.
export const TEMPLATES = ['talk', 'hook', 'board', 'flow', 'stat', 'product', 'outro'];
export const SETTINGS = ['studio', 'room', 'street', 'park', 'urban', 'plaza', 'alley', 'market', 'cafe', 'shop', 'office', 'hall', 'gym', 'field', 'farm', 'orchard', 'woods'];
export const ICONS = ['phone', 'wifi', 'cloud', 'server', 'lock', 'key', 'coin', 'check', 'pin', 'home', 'heart', 'bolt', 'shield', 'mail', 'star', 'cart'];
export const EMOTIONS = ['neutral', 'happy', 'surprised', 'worried'];
const SUPERLATIVES = ['best', 'fastest', 'cheapest', 'first', 'only', 'guaranteed', 'proven', 'miracle', 'cure', 'cures', 'no. 1', '#1', 'number one', 'risk-free', '100%', 'instantly', 'perfect'];
export const WORDS_PER_SECOND = 2.6;        // measured speaking rate of the Piper voices at default speed
export const PAD_SECONDS = 0.6;

export const words = (t) => (String(t ?? '').match(/[\p{L}\p{N}'’%-]+/gu) ?? []).length;
export const estimateSeconds = (scenes) => scenes.reduce((a, s) => a + words(s.text) / WORDS_PER_SECOND + PAD_SECONDS, 0);

const need = {
  hook: (s) => (s.title ? [] : ['hook needs "title" (the big on-screen question or claim)']),
  board: (s) => [...(s.title ? [] : ['board needs "title"']), ...((s.bullets?.length ?? 0) >= 1 ? [] : ['board needs "bullets" (1 to 4)'])],
  flow: (s) => ((s.icons?.length ?? 0) >= 2 ? [] : ['flow needs "icons" (2 to 4)']),
  stat: (s) => (s.stat?.value ? [] : ['stat needs "stat": { "value", "label" }']),
  product: (s) => (s.product?.src || s.useProduct ? [] : ['product needs "product.src" (or "useProduct": true in an ad episode)']),
};

/** Validate an episode against its series bible. Returns { errors: string[], warnings: string[], seconds }. */
export function lintEpisode(bible, ep) {
  const errors = [], warnings = [];
  const rules = { maxWordsPerScene: 24, targetSeconds: [20, 50], hookWithinSeconds: 4, maxSameTemplateInRow: 2, minTemplateVariety: 3, bannedPhrases: [], requireCta: true, ...(bible.rules ?? {}) };
  const chars = bible.characters ?? {};
  const scenes = ep.scenes ?? [];
  if (!ep.id) errors.push('episode needs an "id"');
  if (!scenes.length) { errors.push('episode has no scenes'); return { errors, warnings, seconds: 0 }; }
  const banned = rules.bannedPhrases.map((p) => p.toLowerCase());
  const allowedClaims = (ep.brief?.claimsAllowed ?? []).map((c) => c.toLowerCase());

  scenes.forEach((s, i) => {
    const at = `scene ${i + 1} (${s.template ?? '?'})`;
    if (!TEMPLATES.includes(s.template)) { errors.push(`${at}: unknown template "${s.template}" (known: ${TEMPLATES.join(', ')})`); return; }
    if (!s.text || !words(s.text)) errors.push(`${at}: missing "text" (the spoken line)`);
    const who = s.who?.length ? s.who : Object.keys(chars).slice(0, 1);
    for (const id of who) if (!chars[id]) errors.push(`${at}: unknown character "${id}" (bible has: ${Object.keys(chars).join(', ')})`);
    if (s.speaker && !who.includes(s.speaker)) errors.push(`${at}: speaker "${s.speaker}" is not in "who"`);
    if (s.setting && !SETTINGS.includes(s.setting)) errors.push(`${at}: unknown setting "${s.setting}" (known: ${SETTINGS.join(', ')})`);
    if (s.emotion && !EMOTIONS.includes(s.emotion)) errors.push(`${at}: unknown emotion "${s.emotion}"`);
    for (const ic of s.icons ?? []) if (!ICONS.includes(ic)) errors.push(`${at}: unknown icon "${ic}" (known: ${ICONS.join(', ')})`);
    if ((s.bullets?.length ?? 0) > 4) errors.push(`${at}: at most 4 bullets`);
    if ((s.icons?.length ?? 0) > 4) errors.push(`${at}: at most 4 icons`);
    for (const m of need[s.template]?.(s) ?? []) errors.push(`${at}: ${m}`);
    const w = words(s.text);
    if (w > rules.maxWordsPerScene) warnings.push(`${at}: ${w} words (over ${rules.maxWordsPerScene}); split it so captions stay readable`);
    const blob = [s.text, s.title, ...(s.bullets ?? []), ...(s.labels ?? [])].join(' ').toLowerCase();
    for (const b of banned) if (blob.includes(b)) errors.push(`${at}: banned phrase "${b}"`);
    // ad claim grounding: superlatives need explicit permission; numbers must come from the brief
    if (ep.type === 'ad') {
      for (const sup of SUPERLATIVES) if (new RegExp(`(^|[^\\p{L}])${sup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu').test(blob) && !allowedClaims.some((c) => c.includes(sup))) errors.push(`${at}: unsupported claim "${sup}" (add it to brief.claimsAllowed only if you can prove it)`);
      const briefBlob = JSON.stringify(ep.brief ?? {}).toLowerCase();
      for (const n of (blob.match(/\d[\d,.]*%?/g) ?? []).map((x) => x.replace(/[.,]+$/, ''))) if (!briefBlob.includes(n.toLowerCase())) errors.push(`${at}: number "${n}" is not in the brief (do not invent figures)`);
    }
  });

  // structure and rhythm
  if (scenes[0].template !== 'hook') warnings.push('first scene is not a "hook"');
  if (rules.requireCta && scenes[scenes.length - 1].template !== 'outro') warnings.push('last scene is not an "outro" with a call to action');
  const firstSecs = words(scenes[0].text) / WORDS_PER_SECOND + PAD_SECONDS;
  if (firstSecs > rules.hookWithinSeconds + 1.5) warnings.push(`the hook line takes about ${firstSecs.toFixed(1)}s (aim for under ${rules.hookWithinSeconds}s)`);
  let run = 1;
  for (let i = 1; i < scenes.length; i++) {
    run = scenes[i].template === scenes[i - 1].template ? run + 1 : 1;
    if (run > rules.maxSameTemplateInRow) { warnings.push(`scenes ${i - run + 2}-${i + 1}: "${scenes[i].template}" repeated ${run} times in a row (vary the visuals)`); run = 0; }
  }
  const variety = new Set(scenes.map((s) => s.template)).size;
  if (scenes.length >= 5 && variety < rules.minTemplateVariety) warnings.push(`only ${variety} different templates (aim for ${rules.minTemplateVariety}+)`);
  const speakers = new Set(scenes.map((s) => s.speaker ?? s.who?.[0] ?? Object.keys(chars)[0]));
  for (const id of ep.cast ?? []) if (!speakers.has(id)) warnings.push(`cast member "${id}" never speaks`);
  const seconds = estimateSeconds(scenes);
  const [lo, hi] = rules.targetSeconds;
  if (seconds < lo || seconds > hi) warnings.push(`estimated length ${seconds.toFixed(0)}s is outside the series target ${lo}-${hi}s`);
  return { errors, warnings, seconds };
}

/** Validate the bible itself. */
export function lintBible(bible) {
  const errors = [];
  if (!bible.id) errors.push('bible needs an "id"');
  if (!Object.keys(bible.characters ?? {}).length) errors.push('bible has no characters');
  for (const [id, c] of Object.entries(bible.characters ?? {})) for (const k of ['name', 'skin', 'shirt', 'voice']) if (!c[k]) errors.push(`character "${id}" is missing "${k}"`);
  for (const k of ['accent', 'accent2', 'bg', 'ink']) if (!bible.palette?.[k]) errors.push(`palette is missing "${k}"`);
  return errors;
}
