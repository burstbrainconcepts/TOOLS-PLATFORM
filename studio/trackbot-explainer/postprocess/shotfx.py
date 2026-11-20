#!/usr/bin/env python3
"""CPU post-processing for rendered shots, with quality gates.

  interpolate  IN.mp4 OUT.mp4   2x frame rate with RIFE 4.25 lite (ONNX, MIT). Gate: scores every frame pair from the input
                                alone, lists the stretches to re-render at full rate, exits 3 if too many are weak.
  upscale      IN.mp4 OUT.mp4   Real-ESRGAN (NCNN, BSD-3) 2x/3x. Gate: the result downscaled must match the input.

Python 3.11 recommended (the realesrgan-ncnn-py wheel). See README.md.
"""
import argparse, glob, hashlib, json, os, shutil, subprocess, sys, tempfile, time, urllib.request
import numpy as np
import cv2

MODEL_URL = 'https://huggingface.co/t9749/rife-4.25-lite-onnx/resolve/main/rife_v425lite.onnx'
MODEL_SHA256 = '702802d0862ab78f2d72133c6bc3768e7e89b81756f7cd51d1055a2fe3d06577'
MODEL_DIR = os.environ.get('POSTPROCESS_MODELS', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models'))
EXIT_GATE = 3


# ---------- small pure helpers (unit-tested) ----------
def psnr(a, b):
    mse = float(np.mean((a.astype(np.float64) - b.astype(np.float64)) ** 2))
    return 99.0 if mse == 0 else 10 * float(np.log10(255.0 ** 2 / mse))


def pad_to_64(img):
    h, w = img.shape[:2]
    return cv2.copyMakeBorder(img, 0, (-h) % 64, 0, (-w) % 64, cv2.BORDER_REPLICATE)


def crossfade(a, b):
    return cv2.addWeighted(a, 0.5, b, 0.5, 0)


GATE_MAX_SIDE = 960          # the gate runs on frames shrunk to this size (4x cheaper, same verdict)


def _small(f, max_side=GATE_MAX_SIDE):
    h, w = f.shape[:2]; k = max_side / max(h, w)
    return f if k >= 1 else cv2.resize(f, (round(w * k), round(h * k)), interpolation=cv2.INTER_AREA)


def pair_scores(frames, mid_fn):
    """Predicted interpolation quality (dB) for every consecutive pair of input frames, without any reference.
    For each interior frame k, frames k-1 and k+1 are interpolated and compared with the real frame k (a harder job than
    the real one). A pair's score is the worse of its two neighbouring holdout scores."""
    n = len(frames)
    if n < 3: return None
    sm = [_small(f) for f in frames]
    hold = {k: psnr(mid_fn(sm[k - 1], sm[k + 1]), sm[k]) for k in range(1, n - 1)}
    return [min(hold[k] for k in (j, j + 1) if k in hold) for j in range(n - 1)]


def merge_ranges(idx):
    out = []
    for i in sorted(idx):
        if out and i == out[-1][1] + 1: out[-1][1] = i
        else: out.append([i, i])
    return out


def gate_interpolation(frames, mid_fn, min_pair_psnr=20.0, max_bad_fraction=0.15):
    """Per-pair gate. 'ok' is False when more than max_bad_fraction of the pairs are predicted to interpolate badly.
    'rerender_frames_2x' lists inclusive frame ranges (at the doubled frame rate) to render at full rate instead."""
    scores = pair_scores(frames, mid_fn)
    if scores is None:
        return {'ok': False, 'reason': 'need at least 3 frames', 'pair_psnr': [], 'bad_pairs': [], 'bad_fraction': 1.0, 'rerender_frames_2x': []}
    bad = [j for j, v in enumerate(scores) if v < min_pair_psnr]
    frac = len(bad) / len(scores)
    ok = frac <= max_bad_fraction
    return {'ok': ok, 'pair_psnr': [round(v, 1) for v in scores], 'bad_pairs': bad, 'bad_fraction': round(frac, 3),
            'rerender_frames_2x': [[2 * a, 2 * b + 2] for a, b in merge_ranges(bad)],
            'reason': None if ok else f'{len(bad)} of {len(scores)} pairs ({frac:.0%}) predicted below {min_pair_psnr:g} dB (max allowed {max_bad_fraction:.0%})'}


def gate_upscale(low, up, min_psnr=30.0):
    """The upscaled frame, shrunk back, must still match the source (catches invented detail / drift)."""
    back = cv2.resize(up, (low.shape[1], low.shape[0]), interpolation=cv2.INTER_AREA)
    p = psnr(back, low)
    return {'ok': p >= min_psnr, 'roundtrip_psnr': p, 'reason': None if p >= min_psnr else f'round-trip PSNR {p:.1f} dB < {min_psnr}'}


# ---------- model + io ----------
def ensure_model():
    path = os.path.join(MODEL_DIR, 'rife_v425lite.onnx')
    if not os.path.exists(path):
        os.makedirs(MODEL_DIR, exist_ok=True)
        print('downloading RIFE model (22 MB)...', flush=True)
        tmp = path + '.part'
        urllib.request.urlretrieve(MODEL_URL, tmp)
        digest = hashlib.sha256(open(tmp, 'rb').read()).hexdigest()
        if digest != MODEL_SHA256:
            os.remove(tmp); sys.exit(f'model checksum mismatch ({digest}); refusing to use it')
        os.replace(tmp, path)
    return path


def rife_session(threads):
    import onnxruntime as ort
    so = ort.SessionOptions(); so.intra_op_num_threads = threads
    return ort.InferenceSession(ensure_model(), so, providers=['CPUExecutionProvider'])


def make_mid_fn(sess):
    def mid(a, b):
        h, w = a.shape[:2]
        def prep(x): return np.ascontiguousarray(cv2.cvtColor(pad_to_64(x), cv2.COLOR_BGR2RGB).astype(np.float32).transpose(2, 0, 1)[None] / 255.0)
        out = sess.run(None, {'img0': prep(a), 'img1': prep(b), 'timestep': np.array([[[[0.5]]]], np.float32)})[0][0]
        return cv2.cvtColor((out.transpose(1, 2, 0)[:h, :w] * 255.0).clip(0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR)
    return mid


def parse_rate(text):
    """ffprobe prints rates like '30/1' (sometimes with a trailing comma or newline)."""
    tok = text.strip().split(',')[0].strip()
    n, _, d = tok.partition('/')
    return float(n) / float(d or 1)


def probe_fps(path):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'default=noprint_wrappers=1:nokey=1', path]).decode()
    return parse_rate(out)


def read_frames(path, tmp):
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', path, '-vsync', '0', os.path.join(tmp, 'in_%06d.png')])
    files = sorted(glob.glob(os.path.join(tmp, 'in_*.png')))
    return [cv2.imread(f) for f in files]


def write_video(frames, fps, out, tmp, audio_from=None):
    for i, f in enumerate(frames): cv2.imwrite(os.path.join(tmp, f'out_{i:06d}.png'), f)
    cmd = ['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(tmp, 'out_%06d.png')]
    if audio_from: cmd += ['-i', audio_from, '-map', '0:v', '-map', '1:a?', '-c:a', 'copy', '-shortest']
    subprocess.check_call(cmd + ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '14', out])


# ---------- commands ----------
def cmd_interpolate(a):
    fps = probe_fps(a.input)
    with tempfile.TemporaryDirectory() as tmp:
        frames = read_frames(a.input, tmp)
        mid = make_mid_fn(rife_session(a.threads))
        g = gate_interpolation(frames, mid, a.min_pair_psnr, a.max_bad_fraction)
        report = {'command': 'interpolate', 'input_frames': len(frames), 'input_fps': fps, 'gate': g}
        print('gate:', {k: g[k] for k in ('ok', 'bad_fraction', 'rerender_frames_2x', 'reason')})
        if g['bad_pairs'] and g['ok']: print('NOTE: some pairs are predicted weak; consider re-rendering these frame ranges at full rate:', g['rerender_frames_2x'])
        if a.check_only or (not g['ok'] and not a.force):
            if a.report: json.dump(report, open(a.report, 'w'), indent=2)
            if not g['ok']:
                print('REJECTED: ' + g['reason'] + '\n  Render these output-frame ranges at full frame rate (inclusive): ' + str(g['rerender_frames_2x']) + '\n  (or the whole shot at full rate, or pass --force)', file=sys.stderr); return EXIT_GATE
            return 0
        t = time.time(); out = []
        for i in range(len(frames) - 1):
            out += [frames[i], mid(frames[i], frames[i + 1])]
        out += [frames[-1], frames[-1]]                                # keep duration exactly 2x
        report.update(output_frames=len(out), output_fps=fps * 2, seconds=time.time() - t, seconds_per_new_frame=(time.time() - t) / max(1, len(frames) - 1))
        write_video(out, fps * 2, a.output, tmp, a.input if a.audio else None)
        if a.report: json.dump(report, open(a.report, 'w'), indent=2)
        print(f"wrote {a.output}: {len(out)} frames @ {fps * 2:g} fps in {report['seconds']:.1f}s")
    return 0


def cmd_upscale(a):
    try:
        from realesrgan_ncnn_py import Realesrgan
    except Exception as e:
        sys.exit(f'realesrgan-ncnn-py not available ({e}). See README.md (Python 3.11; apt: libomp5 libvulkan1).')
    model = {2: 0, 3: 1, 4: 2}[a.scale]                                    # realesr-animevideov3 x2 / x3 / x4
    rg = Realesrgan(gpuid=-1, tta_mode=False, tilesize=0, model=model)
    fps = probe_fps(a.input)
    with tempfile.TemporaryDirectory() as tmp:
        frames = read_frames(a.input, tmp)
        t = time.time(); ups, bad = [], []
        for i, f in enumerate(frames):
            u = rg.process_cv2(f); ups.append(u)
            if i % max(1, len(frames) // 5) == 0:
                g = gate_upscale(f, u, a.min_roundtrip)
                if not g['ok']: bad.append((i, g))
        report = {'command': 'upscale', 'frames': len(frames), 'seconds': time.time() - t, 'gate_failures': [{'frame': i, **g} for i, g in bad]}
        if a.report: json.dump(report, open(a.report, 'w'), indent=2)
        if bad and not a.force:
            print('REJECTED: ' + '; '.join(f"frame {i}: {g['reason']}" for i, g in bad), file=sys.stderr); return EXIT_GATE
        write_video(ups, fps, a.output, tmp, a.input if a.audio else None)
        print(f"wrote {a.output}: {len(ups)} frames in {report['seconds']:.1f}s ({report['seconds'] / len(frames):.1f}s/frame)")
    return 0


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)
    for name in ('interpolate', 'upscale'):
        s = sub.add_parser(name); s.add_argument('input'); s.add_argument('output')
        s.add_argument('--report'); s.add_argument('--audio', action='store_true', help='copy the input audio into the output')
        s.add_argument('--force', action='store_true', help='write the output even if the quality gate fails')
    i = sub.choices['interpolate']
    i.add_argument('--check-only', action='store_true')
    i.add_argument('--min-pair-psnr', type=float, default=20.0, help='a pair predicted below this PSNR (dB) is flagged')
    i.add_argument('--max-bad-fraction', type=float, default=0.15, help='reject the shot if more than this fraction of pairs is flagged')
    i.add_argument('--threads', type=int, default=os.cpu_count() or 4)
    u = sub.choices['upscale']; u.add_argument('--scale', type=int, choices=(2, 3, 4), default=2); u.add_argument('--min-roundtrip', type=float, default=30.0)
    a = p.parse_args(argv)
    return cmd_interpolate(a) if a.cmd == 'interpolate' else cmd_upscale(a)


if __name__ == '__main__':
    sys.exit(main())
