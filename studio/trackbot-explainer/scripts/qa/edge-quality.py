"""Edge-quality gate: SSIM between a production render and a supersampled reference of the same frame (the 2x render downscaled).
Usage: python edge-quality.py <production.png> <reference.png> [x0 y0 x1 y1 character-region]      Exit 1 if SSIM on edges is below the gate.
Gate (proposed, not calibrated): SSIM over the character region >= 0.96 and SSIM on edge pixels >= 0.90 (thresholds set AFTER the first measurement: 1x render 0.925 / 0.873, 1.5x render 0.964 / 0.940; a baseline, not an independent standard)."""
import sys, cv2, numpy as np
def ssim(a, b):
    a = a.astype(np.float64); b = b.astype(np.float64); C1, C2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    g = lambda x: cv2.GaussianBlur(x, (11, 11), 1.5)
    mu1, mu2 = g(a), g(b); s11, s22, s12 = g(a * a) - mu1 ** 2, g(b * b) - mu2 ** 2, g(a * b) - mu1 * mu2
    return ((2 * mu1 * mu2 + C1) * (2 * s12 + C2)) / ((mu1 ** 2 + mu2 ** 2 + C1) * (s11 + s22 + C2))
A = cv2.imread(sys.argv[1], 0); B = cv2.imread(sys.argv[2], 0)
x0, y0, x1, y1 = [int(v) for v in sys.argv[3:7]] if len(sys.argv) >= 7 else (0, 0, A.shape[1], A.shape[0])
m = ssim(A, B)[y0:y1, x0:x1]
edges = cv2.dilate(cv2.Canny(B, 60, 140), np.ones((3, 3), np.uint8))[y0:y1, x0:x1] > 0
res = {'ssim_region': round(float(m.mean()), 4), 'ssim_edges': round(float(m[edges].mean()), 4), 'edge_pixels': int(edges.sum())}
print(res)
ok = res['ssim_region'] >= 0.96 and res['ssim_edges'] >= 0.90
print('EDGE GATE PASSED' if ok else 'EDGE GATE FAILED'); sys.exit(0 if ok else 1)
