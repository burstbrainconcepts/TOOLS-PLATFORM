# trackbot-explainer

Self-contained Remotion video (no external APIs). Draft only: review before any publishing.

```bash
npm install
npm run voice     # script.json -> espeak-ng voice -> src/data.json (needs espeak-ng + ffprobe)
node scripts/build-voice.mjs script-money.json src/data-money.json m   # second video
npm run render    # out/trackbot-explainer.mp4 (1080x1920)
```

Edit `script.json` (hook, steps, CTA) to make new videos in the same style. Scenes are code-drawn SVG in `src/Video.tsx`.
Quality check: `node scripts/qa.mjs out/<video>.mp4` (clipping, loudness, silence, black frames, format). It cannot judge voice quality: a human must listen.
Better voice: `PIPER_MODEL=/path/to/voice.onnx npm run voice` uses Piper instead of espeak-ng.
Set `CHROME_PATH` to a Chrome/headless-shell binary if Remotion cannot find one.
The voice is espeak-ng (robotic). A better local voice (Piper/Kokoro) only needs a model file placed on disk.
