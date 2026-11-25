"""Contact sheet: N evenly spaced frames of a video in one PNG, so a human can review a whole video at a glance.
Usage: python3 contact-sheet.py <video.mp4> <out.png> [n=8]"""
import subprocess, sys, tempfile, os
from PIL import Image

video, out = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 8
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]))
tmp = tempfile.mkdtemp()
tiles = []
for i in range(n):
    t = dur * (i + 0.5) / n
    p = os.path.join(tmp, f'{i}.png')
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', video, '-frames:v', '1', '-vf', 'scale=270:-2', p])
    tiles.append(Image.open(p).convert('RGB'))
w, h = tiles[0].size
cols = min(n, 4); rows = (n + cols - 1) // cols
sheet = Image.new('RGB', (w * cols, h * rows), 'white')
for i, im in enumerate(tiles): sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(out)
