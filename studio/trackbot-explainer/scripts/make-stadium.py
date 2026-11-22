"""Procedural stadium for the 3D "stadium" setting: a crowd backdrop (dusk sky, floodlights, two tiers of crowd, advertising boards with
made-up names, no real brands) and a striped pitch texture built from the grass texture. Everything is generated, nothing is downloaded.
Usage: python scripts/make-stadium.py   (needs opencv-python-headless, numpy, Pillow)   -> public/pbr/backdrops/stadium.jpg, public/pbr/pitch/*"""
import numpy as np, cv2, os, shutil
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(__file__); PBR = os.path.join(HERE, '..', 'public', 'pbr')
W, H = 1440, 2560; HZ = 1280
rng = np.random.default_rng(5)
img = Image.new('RGB', (W, H))
d = ImageDraw.Draw(img)
for y in range(H):                                    # dusk sky
    t = min(1, y / 1050); c = (int(10 + 40 * t), int(14 + 52 * t), int(38 + 78 * t)); d.line([(0, y), (W, y)], fill=c)
glow = Image.new('RGB', (W, H)); gd = ImageDraw.Draw(glow)
for x in (140, 420, 720, 1020, 1300):                 # floodlight glows
    for r, a in ((60, 255), (30, 255)): gd.ellipse([x - r, 330 - r, x + r, 330 + r], fill=(a, a, int(a * 0.88)))
glow = Image.fromarray(cv2.GaussianBlur(np.asarray(glow), (0, 0), 55))
img = Image.fromarray(np.clip(np.asarray(img).astype(int) + np.asarray(glow).astype(int) * 0.55, 0, 255).astype('uint8')); d = ImageDraw.Draw(img)
d.polygon([(0, 470), (W, 430), (W, 560), (0, 600)], fill=(18, 20, 30))                       # roof edge of the upper tier
PAL = [(30, 150, 80), (240, 240, 240), (25, 25, 35), (200, 50, 50), (240, 160, 40), (60, 90, 190), (240, 240, 240), (30, 150, 80)]
SKIN = [(141, 85, 36), (198, 134, 66), (224, 172, 105), (96, 58, 28), (255, 205, 148)]
def tier(y0, y1, size0, size1, dark):
    y = y0; r = 0
    while y < y1:
        k = (y - y0) / max(1, (y1 - y0)); sz = size0 + (size1 - size0) * k
        x = -rng.uniform(0, sz)
        while x < W + sz:
            col = PAL[rng.integers(len(PAL))]; col = tuple(int(c * dark) for c in col)
            d.rectangle([x - sz * .45, y, x + sz * .45, y + sz * 1.1], fill=col)                     # torso
            sk = tuple(int(c * dark) for c in SKIN[rng.integers(len(SKIN))])
            d.ellipse([x - sz * .28, y - sz * .62, x + sz * .28, y - sz * .06], fill=sk)            # head
            x += sz * rng.uniform(0.75, 1.0)
        y += size0 * 0.5 + (size1 - size0) * 0.5 * k + 3; r += 1
tier(600, 930, 19, 32, 0.55)                                                                 # upper tier (far, darker)
d.rectangle([0, 930, W, 970], fill=(12, 14, 20))                                            # concourse
tier(970, 1190, 32, 56, 0.9)                                                                 # lower tier (near, brighter)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 40)
except Exception: font = ImageFont.load_default()
BOARDS = [('SPORTS HUB', (200, 30, 40)), ('FIT FUEL', (25, 90, 190)), ('GO ACTIVE', (250, 190, 30)), ('PRO LEAGUE', (20, 140, 80)), ('TEAM GEAR', (230, 230, 235))]
x, i = 0, 0
while x < W:                                                                                  # advertising boards
    name, col = BOARDS[i % len(BOARDS)]; bw = 330
    d.rectangle([x, 1196, x + bw, 1268], fill=col); tc = (255, 255, 255) if sum(col) < 600 else (20, 20, 30)
    d.text((x + 24, 1210), name, fill=tc, font=font); x += bw + 6; i += 1
d.rectangle([0, 1268, W, HZ + 40], fill=(20, 110, 50))
a = np.asarray(img)
a = cv2.GaussianBlur(a, (0, 0), 2.6)                                                          # depth of field
a = np.clip(a * 1.08, 0, 255).astype('uint8')
os.makedirs(os.path.join(PBR, 'backdrops'), exist_ok=True)
cv2.imwrite(os.path.join(PBR, 'backdrops', 'stadium.jpg'), a[..., ::-1], [cv2.IMWRITE_JPEG_QUALITY, 88])
# striped pitch: one tile = two 2 m stripes (light, dark); the grass detail comes from the grass texture
g = cv2.imread(os.path.join(PBR, 'grass_001', 'diff.jpg')).astype(np.float32)
h = g.shape[0]; mask = np.ones_like(g); mask[h // 2:] = 0.78
os.makedirs(os.path.join(PBR, 'pitch'), exist_ok=True)
cv2.imwrite(os.path.join(PBR, 'pitch', 'diff.jpg'), np.clip(g * mask * np.array([0.95, 1.1, 0.9]), 0, 255).astype('uint8'))
for n in ('nor.jpg', 'rough.jpg'): shutil.copy(os.path.join(PBR, 'grass_001', n), os.path.join(PBR, 'pitch', n))
print('stadium backdrop + pitch written')
