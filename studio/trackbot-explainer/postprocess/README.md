# postprocess: CPU frame interpolation and upscaling with quality gates

Two optional steps for rendered shots, both CPU-only (no GPU, no API):

| Command | What it does | Licence of the model |
|---|---|---|
| `interpolate` | Doubles the frame rate with **RIFE 4.25 lite** (ONNX). Render a shot at 15 fps, get 30 fps. | MIT (hzwer / Practical-RIFE) |
| `upscale` | **Real-ESRGAN** (`realesr-animevideov3`, NCNN) 2x/3x. Best on 2D / line-art; marginal on our 3D. | BSD-3 |

## Setup
```bash
python3.11 -m venv .venv && . .venv/bin/activate
pip install -r postprocess/requirements.txt
sudo apt-get install -y ffmpeg libomp5 libvulkan1     # libomp5/libvulkan1 only for `upscale`
```
The RIFE model (22 MB) downloads on first use into `postprocess/models/` and is SHA-256 verified.

## Use
```bash
python postprocess/shotfx.py interpolate shot15.mp4 shot30.mp4 --report report.json
python postprocess/shotfx.py interpolate shot15.mp4 shot30.mp4 --check-only      # gate only
python postprocess/shotfx.py upscale shot540.mp4 shot1080.mp4 --scale 2
python -m unittest postprocess/test_postprocess.py
```

## Quality gates (exit code 3 = rejected; use `--force` to override)
> The default thresholds (20 dB per pair, 15% flagged) were calibrated on two shots (see "Measured" below). Two shots is a small sample: re-check them when the scenes change.

* **interpolate** scores *every frame pair* from your input alone (no reference needed): it interpolates frames k-1 and k+1 and compares with the real frame k (a harder job than the real one). A pair predicted below `--min-pair-psnr` (default 20 dB) is flagged. The shot is rejected if more than `--max-bad-fraction` (default 15%) of its pairs are flagged. Either way the report lists `rerender_frames_2x`: the inclusive output-frame ranges to render at full frame rate (typically camera turns). The gate runs on frames shrunk to 960 px, so it is cheap.
* **upscale**: the upscaled frame shrunk back must match the source (`--min-roundtrip`, default 30 dB), which catches invented detail.

The gates predict where interpolation will smear; they do not prove a shot looks good. Watch the result.

## Measured (CPU, 4 cores, 1080x1920 shots rendered at 15 fps then interpolated to 30 fps, compared with a true 30 fps render)
| Shot | Gate verdict | Result vs true render |
|---|---|---|
| Route (several corners) | rejected: 56% of pairs flagged | straight stretches 29-35 dB, corners 12-15 dB; mean 23.5 dB (cross-fade 20.2 dB). The gate's per-pair prediction correlated with the real quality at r = 0.89 and flagged all 27 truly bad pairs (3 false alarms). |

## Rendering a shot at half rate (Remotion)
`src/Shots.tsx` has `ShotRoute15` / `ShotRoute30` and `ShotHook15` / `ShotHook30`. The 15 fps compositions use `timeScale={2}`, so the motion is identical but only half the frames are rendered:
```bash
npx remotion render src/index.ts ShotRoute15 out/shots/ShotRoute15.mp4 --gl=swangle --concurrency=2 --timeout=240000
python postprocess/shotfx.py interpolate out/shots/ShotRoute15.mp4 out/shots/ShotRoute30_from15.mp4
```
| Hook (straight ride) | passed: 0% flagged | every frame 31-34 dB, mean 33.7 dB (cross-fade 27.2 dB, hold-previous-frame 23.7 dB). Prediction vs real quality r = 0.89. |

### What it saves (render time scales with frame count)
* Per 3D frame at 1080x1920: about 7.8 s to render, about 2.5 s to interpolate (4 threads) and about 0.6 s for the gate. Rendering half the frames and interpolating the rest therefore saves roughly **30%** on a straight shot (hook), and about **half** that when most of a shot is a camera turn (the corner stretches must be rendered at full rate).
* For slow renderers the saving is larger: a Blender frame costs about 56 s at 540x960, so interpolating costs about 5%, saving close to **half**.
* Absolute render times measured here were noisy because other jobs ran at the same time; the frame counts are the reliable part.

### Limits
* RIFE smears small, fast-moving parts (the rider's head and arms) in weak stretches, and a high PSNR does not guarantee it looks right.
* Measured on stylised 3D renders with the 4.25-lite model only; not tested on live-action or photoreal footage.

