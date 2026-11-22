"""Draws a FICTIONAL product photo (a water bottle, brand 'AquaPeak') so the ad pipeline can be demonstrated without any real brand.
Usage: python3 make-demo-product.py <out.jpg>"""
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter

W = H = 1200
yy, xx = np.mgrid[0:H, 0:W]
bg = 236 - 22 * (((xx - W / 2) ** 2 + (yy - H / 2) ** 2) ** 0.5 / (W * 0.75))          # soft studio vignette
img = Image.fromarray(np.stack([bg + 2, bg + 2, bg], -1).clip(0, 255).astype('uint8'))
shadow = Image.new('L', (W, H), 0)
ImageDraw.Draw(shadow).ellipse([340, 1030, 860, 1110], fill=140)
shadow = shadow.filter(ImageFilter.GaussianBlur(26))
img.paste(Image.new('RGB', (W, H), (60, 70, 80)), mask=shadow)
d = ImageDraw.Draw(img)
body = (0, 150, 150); dark = (22, 36, 52)
d.rounded_rectangle([420, 330, 780, 1060], radius=70, fill=body)
for i in range(60):                                                                       # simple cylindrical shading
    a = int(70 * (1 - abs(i - 22) / 40)) if i < 44 else 0
    d.rounded_rectangle([430 + i * 2, 340, 436 + i * 2, 1050], radius=3, fill=tuple(min(255, c + a) for c in body))
d.rounded_rectangle([470, 560, 730, 800], radius=26, fill=(250, 250, 248))              # label
d.polygon([(500, 750), (560, 640), (600, 700), (640, 610), (700, 750)], fill=(0, 150, 150))
d.rounded_rectangle([430, 255, 770, 345], radius=30, fill=dark)                           # lid
d.rounded_rectangle([555, 170, 645, 262], radius=36, outline=dark, width=22)              # carry loop
d.ellipse([620, 330, 650, 360], fill=(255, 90, 54))
img = img.filter(ImageFilter.GaussianBlur(0.8))
n = np.random.default_rng(7).normal(0, 2.2, (H, W, 1))
Image.fromarray((np.asarray(img).astype(float) + n).clip(0, 255).astype('uint8')).save(sys.argv[1], quality=92)
