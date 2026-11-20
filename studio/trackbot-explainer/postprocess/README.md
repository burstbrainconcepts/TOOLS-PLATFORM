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
> The default thresholds are **provisional** until they have been calibrated against full-rate reference renders (see `src/Shots.tsx`).

* **interpolate**: before writing anything, it predicts real frames of *your own input* from their neighbours (gap of two input frames, which is harder than the real job) and compares with the true frame. It rejects the shot if the mean PSNR is below `--min-psnr` (default 18 dB) or the gain over a plain cross-fade is below `--min-gain` (default 3 dB). A rejected shot should be rendered at full frame rate.
* **upscale**: the upscaled frame shrunk back must match the source (`--min-roundtrip`, default 30 dB), which catches invented detail.

The gates catch smeared or ghosted interpolation on average; they do not prove a shot looks good. Watch the result.

## Rendering a shot at half rate (Remotion)
`src/Shots.tsx` has `ShotRoute15` / `ShotRoute30` and `ShotHook15` / `ShotHook30`. The 15 fps compositions use `timeScale={2}`, so the motion is identical but only half the frames are rendered:
```bash
npx remotion render src/index.ts ShotRoute15 out/shots/ShotRoute15.mp4 --gl=swangle --concurrency=2 --timeout=240000
python postprocess/shotfx.py interpolate out/shots/ShotRoute15.mp4 out/shots/ShotRoute30_from15.mp4
```
