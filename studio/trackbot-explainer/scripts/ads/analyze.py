"""Product image analysis for ad mode (no AI service, no network): background removal + colour palette.
  - estimates the background from the image border, flood-selects pixels that differ from it (Lab colour distance),
    keeps the biggest blob, fills holes, feathers the edge, crops -> transparent PNG cutout
  - k-means palette of the product pixels -> accent / accent2 for the ad
  - quality check: if the cutout looks wrong (nothing found, or most of the image selected) it falls back to the plain image
Usage: python analyze.py <image> <out-dir>      Writes <out-dir>/product.png and <out-dir>/analysis.json   (needs opencv + numpy)"""
import json, sys, os
import cv2, numpy as np

def refine(small, m):
    """GrabCut seeded with the colour-distance mask: drops soft shadows and halos that look like the background."""
    sh, sw = m.shape
    r = max(3, sh // 60)
    sure = cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r * 2 + 1, r * 2 + 1)))
    gc = np.full(m.shape, cv2.GC_BGD, np.uint8)
    gc[m > 0] = cv2.GC_PR_FGD
    gc[sure > 0] = cv2.GC_FGD
    try:
        bgm, fgm = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
        cv2.grabCut(small, gc, None, bgm, fgm, 4, cv2.GC_INIT_WITH_MASK)
    except cv2.error:
        return m
    out = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 1, 0).astype(np.uint8)
    n, lbl, stats, _ = cv2.connectedComponentsWithStats(out)
    if n <= 1: return m
    out = (lbl == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    cnts, _ = cv2.findContours(out, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out = np.zeros_like(out); cv2.drawContours(out, cnts, -1, 1, cv2.FILLED)
    return out if out.sum() > 0.5 * m.sum() else m      # refinement must not throw away most of the object

def cutout(bgr):
    h, w = bgr.shape[:2]
    scale = 900 / max(h, w)
    small = cv2.resize(bgr, (int(w * scale), int(h * scale))) if scale < 1 else bgr.copy()
    lab = cv2.cvtColor(cv2.GaussianBlur(small, (0, 0), 1.2), cv2.COLOR_BGR2LAB).astype(np.float32)
    sh, sw = lab.shape[:2]
    b = max(4, sh // 40)
    border = np.concatenate([lab[:b].reshape(-1, 3), lab[-b:].reshape(-1, 3), lab[:, :b].reshape(-1, 3), lab[:, -b:].reshape(-1, 3)])
    bg = np.median(border, 0)
    # distance of every pixel to the background colour; threshold adapts to how noisy / vignetted the border is
    dist = np.linalg.norm(lab - bg, axis=2)
    bdist = np.linalg.norm(border - bg, axis=1)
    thr = max(14.0, float(np.percentile(bdist, 98)) * 1.8)
    loose = (dist > thr).astype(np.uint8)
    # hysteresis: soft shadows are only mildly different from the background, the product itself is strongly different.
    # Keep loose pixels only near strong ones (keeps antialiased edges, drops wide shadows). If nothing is strongly different
    # (e.g. a white product on a white background) the loose mask is used as is.
    strong = (dist > max(thr * 2.6, 38.0)).astype(np.uint8)
    if strong.mean() > 0.01:
        rr = max(2, sh // 130)
        mask = loose & cv2.dilate(strong, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (rr * 2 + 1, rr * 2 + 1)))
    else:
        mask = loose
    # shadow rule (only for clearly coloured products): neutral-coloured pixels that are darker than the background are shadow
    chroma = np.linalg.norm(lab[..., 1:] - bg[1:], axis=2)
    if mask.sum() and np.median(chroma[mask > 0]) > 18:
        shadow = (chroma < 7) & (lab[..., 0] < bg[0] - 4)
        mask = (mask & ~shadow).astype(np.uint8)
    k = max(3, sh // 150) | 1
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k * 2 + 1, k * 2 + 1)))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    n, lbl, stats, _ = cv2.connectedComponentsWithStats(mask)
    if n <= 1: return None, 0.0, thr
    biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    m = (lbl == biggest).astype(np.uint8)
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)       # fill holes: redraw the outer contour filled
    m = np.zeros_like(m); cv2.drawContours(m, cnts, -1, 1, cv2.FILLED)
    m = refine(small, m)
    coverage = float(m.mean())
    # upscale mask to the original, feather the edge a little
    full = cv2.resize(m.astype(np.float32), (w, h), interpolation=cv2.INTER_LINEAR)
    full = cv2.GaussianBlur(full, (0, 0), max(1.0, w / 700))
    return np.clip(full * 1.0, 0, 1), coverage, thr

def palette(bgr, alpha, k=4):
    px = bgr[alpha > 0.9]
    if len(px) > 40000: px = px[np.random.default_rng(1).choice(len(px), 40000, replace=False)]
    px = px.astype(np.float32)
    _, labels, centers = cv2.kmeans(px, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5), 3, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(labels.flatten(), minlength=k) / len(labels)
    hsv = cv2.cvtColor(centers.reshape(1, -1, 3).astype(np.uint8), cv2.COLOR_BGR2HSV).reshape(-1, 3)
    # score: saturated, not too dark / too bright, and reasonably common
    score = (hsv[:, 1] / 255.0) * (1 - np.abs(hsv[:, 2] / 255.0 - 0.6)) * (0.4 + counts)
    order = np.argsort(-score)
    hexes = ['#%02X%02X%02X' % tuple(int(v) for v in centers[i][::-1]) for i in order]
    return hexes, [float(counts[i]) for i in order]

def main(src, out):
    os.makedirs(out, exist_ok=True)
    bgr = cv2.imread(src)
    if bgr is None: sys.exit(f'cannot read {src}')
    h, w = bgr.shape[:2]
    alpha, coverage, thr = cutout(bgr)
    ok = alpha is not None and 0.04 <= coverage <= 0.80
    info = {'source': os.path.basename(src), 'size': [w, h], 'coverage': round(coverage, 3), 'threshold': round(thr, 1), 'cutout': bool(ok)}
    if ok:
        ys, xs = np.where(alpha > 0.5)
        pad = int(0.03 * max(h, w))
        y0, y1, x0, x1 = max(0, ys.min() - pad), min(h, ys.max() + pad), max(0, xs.min() - pad), min(w, xs.max() + pad)
        rgba = np.dstack([bgr, (alpha * 255).astype(np.uint8)])[y0:y1, x0:x1]
        cv2.imwrite(os.path.join(out, 'product.png'), rgba)
        info['aspect'] = round((x1 - x0) / (y1 - y0), 3)
        hexes, shares = palette(bgr, alpha)
    else:
        info['note'] = 'cutout unreliable (nothing found, or most of the image selected): using the original image unchanged'
        cv2.imwrite(os.path.join(out, 'product.png'), bgr)
        info['aspect'] = round(w / h, 3)
        hexes, shares = palette(bgr, np.ones(bgr.shape[:2], np.float32))
    info['palette'] = hexes; info['palette_share'] = [round(s, 3) for s in shares]
    info['accent'] = hexes[0]; info['accent2'] = hexes[1] if len(hexes) > 1 else hexes[0]
    json.dump(info, open(os.path.join(out, 'analysis.json'), 'w'), indent=2)
    print(json.dumps(info))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
