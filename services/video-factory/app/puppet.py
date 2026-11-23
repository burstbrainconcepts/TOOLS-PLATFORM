"""Procedural 2D character rig renderer.

This is a deterministic CPU animation backend, not a generative video model.
It creates actual frame-to-frame movement from a reusable articulated rig.
"""
import math
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def _font(size: int, bold: bool = False):
    candidates = (
        ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
         "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"]
        if bold else
        ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
         "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"]
    )
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def _line(draw, points, fill, width):
    draw.line(points, fill=fill, width=max(2, int(width)), joint="curve")


def _background(draw, width, height, palette):
    sky = tuple(palette.get("sky", [116, 184, 226]))
    hill = tuple(palette.get("hill", [80, 145, 91]))
    ground = tuple(palette.get("ground", [82, 132, 73]))
    draw.rectangle((0, 0, width, height), fill=sky)
    draw.ellipse((width * .70, height * .08, width * .86, height * .22), fill=(255, 222, 139))
    draw.ellipse((-width * .2, height * .49, width * .58, height * .82), fill=hill)
    draw.ellipse((width * .35, height * .51, width * 1.2, height * .84), fill=tuple(max(0, c-12) for c in hill))
    draw.rectangle((0, int(height * .68), width, height), fill=ground)


def _character(draw, cx, floor, scale, t, action, palette):
    skin = tuple(palette.get("skin", [154, 94, 63]))
    shirt = tuple(palette.get("shirt", [231, 157, 87]))
    trousers = tuple(palette.get("trousers", [48, 70, 105]))
    hair = tuple(palette.get("hair", [48, 34, 28]))
    hat = tuple(palette.get("hat", [221, 164, 69]))
    s = scale
    bob = math.sin(t * math.tau * (2 if action == "walk" else 1)) * 5 * s
    hip_y = floor - 105*s + bob
    shoulder_y = floor - 230*s + bob
    head_y = floor - 300*s + bob
    stride = math.sin(t * math.tau * 2) * 28*s if action == "walk" else 0
    leg_swing = stride
    # Legs and boots: independently animated limbs.
    _line(draw, [(cx-12*s, hip_y), (cx-20*s+leg_swing, floor-42*s)], trousers, 24*s)
    _line(draw, [(cx+12*s, hip_y), (cx+20*s-leg_swing, floor-42*s)], trousers, 24*s)
    draw.ellipse((cx-43*s+leg_swing, floor-52*s, cx-9*s+leg_swing, floor-34*s), fill=(45, 38, 34))
    draw.ellipse((cx+9*s-leg_swing, floor-52*s, cx+43*s-leg_swing, floor-34*s), fill=(45, 38, 34))
    # Torso and neck.
    draw.rounded_rectangle((cx-48*s, shoulder_y, cx+48*s, hip_y+15*s), radius=int(23*s), fill=shirt, outline=tuple(max(0,c-35) for c in shirt), width=max(1,int(3*s)))
    draw.rectangle((cx-13*s, shoulder_y-18*s, cx+13*s, shoulder_y+12*s), fill=skin)
    # Arm angles vary by action; shoulder/elbow/wrist form a simple IK-like articulated chain.
    left_angle, right_angle = 2.35, .80
    if action == "wave":
        right_angle = -1.0 + .13*math.sin(t*math.tau*2)
    elif action == "celebrate":
        left_angle, right_angle = -1.1, -2.0
    elif action == "plant":
        right_angle = 1.55 + .15*math.sin(t*math.tau)
    elif action == "water":
        right_angle = 1.15 + .12*math.sin(t*math.tau)
    for side, angle in [(-1,left_angle),(1,right_angle)]:
        sx = cx + side*39*s
        sy = shoulder_y + 18*s
        length1, length2 = 57*s, 54*s
        ex = sx + math.cos(angle)*length1
        ey = sy + math.sin(angle)*length1
        wrist_angle = angle + (0.45 if side < 0 else -0.35)
        wx = ex + math.cos(wrist_angle)*length2
        wy = ey + math.sin(wrist_angle)*length2
        _line(draw, [(sx,sy),(ex,ey),(wx,wy)], skin, 17*s)
        draw.ellipse((ex-10*s,ey-10*s,ex+10*s,ey+10*s), fill=skin)
        draw.ellipse((wx-10*s,wy-10*s,wx+10*s,wy+10*s), fill=skin)
    # Head, ears, hair, face.
    draw.ellipse((cx-43*s,head_y-43*s,cx+43*s,head_y+48*s), fill=skin)
    draw.pieslice((cx-45*s,head_y-51*s,cx+45*s,head_y+25*s),180,360,fill=hair)
    draw.ellipse((cx-26*s,head_y-3*s,cx-17*s,head_y+7*s), fill=(25,25,25))
    draw.ellipse((cx+15*s,head_y-3*s,cx+24*s,head_y+7*s), fill=(25,25,25))
    draw.arc((cx-17*s,head_y+8*s,cx+19*s,head_y+34*s),5,165,fill=(80,35,28),width=max(2,int(3*s)))
    # Straw hat.
    draw.ellipse((cx-65*s,head_y-64*s,cx+65*s,head_y-36*s), fill=hat, outline=(117,77,37), width=max(1,int(3*s)))
    draw.arc((cx-43*s,head_y-111*s,cx+43*s,head_y-40*s),180,360,fill=(117,77,37),width=max(2,int(8*s)))
    draw.pieslice((cx-43*s,head_y-111*s,cx+43*s,head_y-42*s),180,360,fill=hat)
    # Action-specific prop: seed/plant or watering can, tied to wrist movement.
    if action == "plant":
        draw.ellipse((cx+45*s, floor-20*s, cx+61*s, floor-8*s), fill=(244,204,104))
    if action == "water":
        can_x, can_y = cx+52*s, floor-128*s
        draw.rounded_rectangle((can_x,can_y,can_x+54*s,can_y+40*s),radius=int(8*s),fill=(91,147,163),outline=(42,78,92),width=max(1,int(3*s)))
        for i in range(4):
            drop_x = can_x+49*s+i*6*s
            drop_y = can_y+49*s+(t*120+i*11)%(38*s)
            draw.ellipse((drop_x,drop_y,drop_x+4*s,drop_y+9*s),fill=(185,231,248))
    if action in {"plant","water"}:
        # A growing sapling with a time-based stem and leaves.
        growth = min(1.0, max(.12, t))
        top = floor - (35+85*growth)*s
        _line(draw, [(cx+125*s,floor-2*s),(cx+125*s,top)], (50,133,66), 7*s)
        draw.ellipse((cx+96*s,top-7*s,cx+126*s,top+12*s),fill=(82,174,83))
        draw.ellipse((cx+123*s,top-15*s,cx+154*s,top+5*s),fill=(101,190,88))


def render_character_scene(scene: dict, output: Path, width: int, height: int, fps: int, work: Path):
    """Render a self-contained character-action scene to H.264 MP4."""
    animation = scene["animation"]
    duration = float(scene["duration_sec"])
    action = animation["action"]
    palette = animation.get("palette", {})
    scale = min(width / 720, height / 1280) * 1.0
    frames_dir = work / "puppet-frames"
    frames_dir.mkdir()
    total = max(1, math.ceil(duration * fps))
    for index in range(total):
        t = index / max(1, total-1)
        image = Image.new("RGB", (width, height))
        draw = ImageDraw.Draw(image)
        _background(draw, width, height, palette)
        floor = int(height * .82)
        # Simple camera drift gives depth without replacing character animation.
        camera_x = math.sin(t * math.tau) * width * .012
        cx = width*.40 + camera_x
        _character(draw, cx, floor, scale, t, action, palette)
        caption = (scene.get("caption") or "").strip()
        if caption:
            fnt = _font(max(18, int(width*.045)), True)
            bbox = draw.textbbox((0,0), caption, font=fnt)
            text_w = bbox[2]-bbox[0]
            x = (width-text_w)//2
            y = int(height*.91)
            draw.rounded_rectangle((x-22,y-12,x+text_w+22,y+max(40,int(height*.065))),radius=14,fill=(9,24,36))
            draw.text((x,y),caption,font=fnt,fill=(255,255,255))
        image.save(frames_dir / f"{index:06d}.jpg", quality=88)
    command = ["ffmpeg","-hide_banner","-loglevel","error","-y","-framerate",str(fps),
               "-i",str(frames_dir / "%06d.jpg"),"-t",str(duration),
               "-an","-c:v","libx264","-preset","veryfast","-crf","23",
               "-pix_fmt","yuv420p","-movflags","+faststart",str(output)]
    completed = subprocess.run(command,capture_output=True,text=True,timeout=3600)
    if completed.returncode:
        raise RuntimeError(f"Character animation encode failed: {completed.stderr[-4000:]}")
    return output
