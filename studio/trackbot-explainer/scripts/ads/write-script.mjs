// Turns a product brief into ad episodes (UGC-style short ads), several hook variants of the same body for A/B testing.
// RULES (enforced again by the lint): only facts from the brief, numbers must be in the brief, no superlatives unless the brief allows
// them, no invented testimonials ("I used it for a month"), no invented discounts. Pure function: no I/O.
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const trim = (s) => String(s ?? '').trim().replace(/[.!?]+$/, '');
const low = (s) => trim(s).replace(/^./, (c) => c.toLowerCase());

export const HOOKS = {
  problem: (b) => ({ title: `${cap(trim(b.pain))}?`, text: `Tired of ${low(b.pain)}?`, emotion: 'worried' }),
  pov: (b) => ({ title: `POV: ${low(b.pain)}`, text: `Point of view: ${low(b.pain)}.`, emotion: 'surprised' }),
  meet: (b) => ({ title: cap(trim(b.tagline)), text: `${trim(b.tagline)}. Meet ${trim(b.name)}.`, emotion: 'happy' }),
};

const firstNumber = (s) => { const m = String(s).match(/(\d[\d,.]*\s*[A-Za-z%$]+)/); return m ? m[1].replace(/[.,]+$/, '') : null; };

export function writeAds(brief, { variants = ['problem', 'pov', 'meet'], idPrefix, productSrc, palette } = {}) {
  const b = brief;
  const miss = ['name', 'tagline', 'pain', 'benefits', 'cta'].filter((k) => !b[k] || (Array.isArray(b[k]) && !b[k].length));
  if (miss.length) throw new Error(`brief is missing: ${miss.join(', ')}`);
  const lead = b.presenter ?? 'ada', side = b.sidekick;
  const benefits = b.benefits.map(trim);
  const stat = benefits.map((x) => ({ x, n: firstNumber(x) })).find((o) => o.n);
  const slug = (idPrefix ?? b.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return variants.map((v) => {
    const h = HOOKS[v](b);
    const scenes = [
      { template: 'hook', who: side && b.walk ? [lead, side] : [lead], speaker: lead, emotion: h.emotion, title: h.title, text: h.text, ...(b.walk ? { walk: { dir: 1 } } : {}) },
      { template: 'product', who: [lead], useProduct: true, ...(b.hold ? { hold: true } : {}), product: { src: productSrc, name: b.name, tag: b.price ? `${b.name}  ${b.price}` : b.name }, bullets: benefits.slice(0, 3), text: `${trim(b.name)} is made for ${low(b.audience ?? 'everyday life')}. ${trim(b.tagline)}.` },
      { template: 'board', who: [lead], title: 'What you get', bullets: benefits.slice(0, 4), text: `Here is what you get. ${benefits.slice(0, 3).map((x) => trim(x)).join('. ')}.` },
      ...(stat ? [{ template: 'stat', who: [lead], stat: { value: stat.n, label: stat.x.replace(stat.n, '').replace(/\s+/g, ' ').trim() || stat.x }, text: `${stat.x}.` }] : []),
      ...(side ? [{ template: 'talk', who: [side, lead], speaker: side, setting: 'room', emotion: 'surprised', text: b.price ? `And it costs ${trim(b.price)}?` : `Where can I get one?` }] : []),
      ...(b.offer ? [{ template: 'talk', who: [lead, ...(side ? [side] : [])], speaker: lead, setting: 'street', emotion: 'happy', text: `${trim(b.offer)}.${b.price ? ` ${trim(b.name)} is ${trim(b.price)}.` : ''}` }] : []),
      { template: 'outro', who: [lead, ...(side ? [side] : [])], brand: b.name, cta: trim(b.cta), text: `${trim(b.cta)}.` },
    ];
    if (b.setting) for (const sc of scenes) sc.setting = b.setting;      // 3D: where the whole ad takes place
    return { id: `${slug}-${v}`, type: 'ad', cast: [lead], brief: { ...b, palette }, scenes };
  });
}
