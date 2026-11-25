"""Procedural sound effects and a music bed (numpy only, no samples, no licences). Writes 48 kHz mono wavs to public/sfx/.
Usage: python3 sound.py [outdir=public/sfx]"""
import sys, os, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(11)
t_ = lambda d: np.arange(int(SR * d)) / SR

def save(name, x, outdir, peak=0.9):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    with wave.open(os.path.join(outdir, name), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())

def bandpass_noise(d, f0, f1):
    """noise through a one-pole band sweep (cheap, smooth)"""
    n = rng.normal(0, 1, int(SR * d)); t = t_(d)
    fc = f0 * (f1 / f0) ** (t / d)
    out = np.zeros_like(n); lp = 0.0; lp2 = 0.0
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    for i in range(len(n)):
        lp += a[i] * (n[i] - lp); lp2 += a[i] * (lp - lp2)
    return lp - lp2 * 0.9

def whoosh():
    d = 0.42; t = t_(d)
    x = bandpass_noise(d, 250, 3500) * np.sin(np.pi * t / d) ** 2
    return x

def pop():
    d = 0.16; t = t_(d)
    f = 520 * np.exp(-t * 7) + 200
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 28)
    x[:60] += rng.normal(0, 0.15, 60) * np.linspace(1, 0, 60)
    return x

def tick():
    d = 0.07; t = t_(d)
    return (np.sin(2 * np.pi * 1900 * t) * 0.8 + np.sin(2 * np.pi * 3800 * t) * 0.2) * np.exp(-t * 90)

def chime():
    d = 1.1; t = t_(d)
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) * a for f, k, a in ((880, 3.2, 1), (1320, 4, .55), (1760, 5.5, .3), (2640, 8, .15)))

def bed(bpm=96, bars=8):
    beat = 60 / bpm; bar = beat * 4; d = bar * bars; n = int(SR * d); x = np.zeros(n + SR * 2)
    chords = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]          # Am F C G
    mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
    def add(start, sig):
        i = int(start * SR); x[i:i + len(sig)] += sig[:len(x) - i]
    for b in range(bars):
        ch = chords[b % 4]; s0 = b * bar
        t = t_(bar + 0.8)
        env = np.minimum(1, t / 0.35) * np.exp(-np.maximum(0, t - bar) * 6)     # soft pad swell
        pad = sum(np.sin(2 * np.pi * mtof(m) * t) + 0.5 * np.sin(2 * np.pi * mtof(m) * 2.003 * t) for m in ch) * env * 0.08
        add(s0, pad)
        bass = np.sin(2 * np.pi * mtof(ch[0] - 24) * t_(beat * 2)) * np.exp(-t_(beat * 2) * 3) * 0.35
        add(s0, bass); add(s0 + beat * 2, bass * 0.8)
        for k in range(8):                                                       # eighth-note pluck arpeggio
            m = ch[(0, 1, 2, 1, 2, 1, 0, 1)[k]] + 12
            tt = t_(0.5)
            pl = np.sin(2 * np.pi * mtof(m) * tt) * np.exp(-tt * 7) * 0.16 * (0.6 if k % 2 else 1)
            add(s0 + k * beat / 2, pl)
        for k in range(8):                                                       # quiet offbeat hat
            tt = t_(0.06); add(s0 + k * beat / 2 + beat / 4, rng.normal(0, 1, len(tt)) * np.exp(-tt * 90) * 0.025)
    x[:SR * 2] += 0  # tail kept, then folded to make the loop seamless
    loop = x[:n].copy(); loop[:len(x) - n] += x[n:]
    return loop

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'public/sfx'
    os.makedirs(out, exist_ok=True)
    for name, sig, pk in (('whoosh.wav', whoosh(), .9), ('pop.wav', pop(), .9), ('tick.wav', tick(), .8), ('chime.wav', chime(), .8), ('bed.wav', bed(), .7)):
        save(name, sig, out, pk)
    print('wrote', sorted(os.listdir(out)))
