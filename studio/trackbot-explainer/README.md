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

## 3D assets (CC0, Poly Haven)
`public/pbr/` holds the HDRI lighting map, road/pavement PBR textures and the street-lamp and hydrant models used by `src/City3D.tsx` (see `public/pbr/CREDITS.md`). Re-download with `python3 scripts/fetch-polyhaven.py`.
Experiments with third-party assets that need attribution (`exp/`, `public/exp/`) are git-ignored.

## Courier + scooter model (our own)
`models/build_courier.py` builds the scooter, rider and delivery box procedurally in Blender (`blender -b --python models/build_courier.py`, add `-- preview.png` for a test render; set `VIEW=front34|side`) and exports `public/models/courier_scooter.glb`. `src/City3D.tsx` animates the named parts: wheels spin with distance, the front fork steers and the scooter leans into turns.
