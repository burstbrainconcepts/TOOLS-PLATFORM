# UGC + short-form video production architecture

This extends the existing Remotion episode engine; it does not replace it. The current production path is:

1. A series bible defines characters, voices, palette, brand and rules.
2. An episode JSON defines ordered scenes, dialogue, templates, setting, emotion and cast.
3. `scripts/series/build-episode.mjs` validates the material, synthesizes per-scene Piper audio, caches voice files and writes Remotion props.
4. The `Episode` composition renders scenes, captions, sound effects and transitions.

## New continuity contract

Use `visualStyleId`, `locations`, `defaultLocationId` and each character's `wardrobeId` in the bible. Each scene inherits those locks. Intentional time jumps, outfit changes or location changes must set `continuityBreak: true` on that scene. The resolver emits normalized per-scene continuity metadata and rejects accidental drift.

## Prompt-to-production contract

The language model (or human writer) should produce structured JSON, never executable code:

- `brief`: audience, platform, objective, tone, duration target, language, CTA and factual claims supplied by the user.
- `bible`: stable cast IDs, character appearance, voice IDs, visual style, brand palette, location IDs and wardrobe IDs.
- `scenes[]`: template, spoken line, speaker, cast, locationId, emotion, shot/camera notes, action, title/bullets and continuityBreak only when story requires a change.

The model must not invent product claims, prices, statistics, testimonials or credentials. Existing `lintEpisode` rejects unsupported superlatives and numbers for ads. The new continuity resolver protects identity/location/style/wardrobe locks.

## Production modes

- **2D motion graphics:** fastest, low compute; existing templates and captions.
- **3D characters and sets:** repeatable cast and reusable locations; more CPU/GPU time.
- **AI-generated footage:** optional provider adapter, only when configured with credentials and budget; preserve reference frames and use continuity metadata. Never make an external video API a mandatory dependency.
- **Hybrid:** 3D or illustrated reference frames + AI footage + deterministic Remotion assembly.

## Quality gates

Before render: validate bible, episode, duration, scene count, dialogue length, cast IDs, location/style/wardrobe continuity and ad claims.
After render: run `scripts/qa.mjs`, verify 9:16 dimensions, frame rate, audio, duration, silence, clipping and black frames. A human still needs to watch and listen for acting, lip-sync, visual drift and voice naturalness.

## Current limitations

The renderer and episode data contract exist. This repository does not yet contain a connected prompt-generation model/provider, AI video provider credentials, a universal facial animation system or guaranteed lip-sync for every 3D rig. Those must be implemented as optional adapters and tested with real provider access. The system should continue to render with local assets when no paid provider is configured.
