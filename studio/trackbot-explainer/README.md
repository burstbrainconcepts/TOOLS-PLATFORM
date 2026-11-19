# trackbot-explainer

Self-contained Remotion video (no external APIs). Draft only: review before any publishing.

```bash
npm install
PIPER_MODEL=/path/to/voice.onnx npm run voice   # script.json -> Piper neural voice -> src/data.json (needs ffprobe/ffmpeg)
node scripts/build-voice.mjs script-money.json src/data-money.json m   # second video
npm run render    # out/trackbot-explainer.mp4 (1080x1920)
```

Edit `script.json` (hook, steps, CTA) to make new videos in the same style. Scenes are code-drawn SVG in `src/Video.tsx`.
Quality check: `node scripts/qa.mjs out/<video>.mp4` (clipping, loudness, silence, black frames, format). It cannot judge voice quality: a human must listen.
Voices: Piper models from https://huggingface.co/rhasspy/piper-voices (the .onnx and .onnx.json must sit together). Used: en_US-lessac-medium (ada), en_US-ryan-high (tunde), en_GB-alan-medium (bolt).
Set `CHROME_PATH` to a Chrome/headless-shell binary if Remotion cannot find one.

## Characters and 3D
- Host characters: `ada`, `tunde`, `bolt` (`src/Character.tsx`). Pick one: `npx remotion render src/index.ts TrackbotExplainer out/x.mp4 --props='{"character":"tunde"}'`. Lip movement comes from the voice audio; each scene has an `emotion` in its script file.
- `TrackbotExplainer3D` swaps the route scenes for a real three.js 3D city (CPU software WebGL, slow: about 4 minutes for 56s here).
