# trackbot-explainer

Self-contained Remotion video (no external APIs). Draft only: review before any publishing.

```bash
npm install
npm run voice     # script.json -> espeak-ng voice -> src/data.json (needs espeak-ng + ffprobe)
node scripts/build-voice.mjs script-money.json src/data-money.json m   # second video
npm run render    # out/trackbot-explainer.mp4 (1080x1920)
```

Edit `script.json` (hook, steps, CTA) to make new videos in the same style. Scenes are code-drawn SVG in `src/Video.tsx`.
Set `CHROME_PATH` to a Chrome/headless-shell binary if Remotion cannot find one.
The voice is espeak-ng (robotic). A better local voice (Piper/Kokoro) only needs a model file placed on disk.
