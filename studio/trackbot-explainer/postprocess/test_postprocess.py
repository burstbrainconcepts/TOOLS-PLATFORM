"""Unit tests for the pure helpers and the gate logic (no model or ffmpeg needed). Run: python -m unittest postprocess/test_postprocess.py"""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shotfx as pp


def frames_moving(n=7, h=64, w=96, step=4):
    out = []
    for i in range(n):
        f = np.zeros((h, w, 3), np.uint8); x = 10 + i * step; f[20:40, x:x + 16] = (255, 128, 0); out.append(f)
    return out


class Helpers(unittest.TestCase):
    def test_psnr_identical_and_different(self):
        a = np.zeros((8, 8, 3), np.uint8)
        self.assertEqual(pp.psnr(a, a), 99.0)
        self.assertLess(pp.psnr(a, a + 50), 20)

    def test_pad_to_64(self):
        out = pp.pad_to_64(np.zeros((960, 540, 3), np.uint8))
        self.assertEqual(out.shape[:2], (960, 576))
        self.assertEqual(pp.pad_to_64(np.zeros((64, 64, 3), np.uint8)).shape[:2], (64, 64))

    def test_crossfade_is_the_mean(self):
        a = np.full((4, 4, 3), 100, np.uint8); b = np.full((4, 4, 3), 200, np.uint8)
        self.assertTrue((pp.crossfade(a, b) == 150).all())


class Gate(unittest.TestCase):
    def test_good_interpolator_passes(self):
        fr = frames_moving()
        # an "oracle" that returns the true middle frame: must beat the cross-fade by a lot
        mids = {id(fr[i]): fr[i + 1] for i in range(len(fr) - 2)}
        g = pp.gate_interpolation(fr, lambda a, b: mids[id(a)], samples=5)
        self.assertTrue(g['ok'], g)
        self.assertGreater(g['gain_db'], 3.0)

    def test_crossfade_interpolator_is_rejected(self):
        g = pp.gate_interpolation(frames_moving(), pp.crossfade, samples=5)
        self.assertFalse(g['ok'])
        self.assertIn('gain over cross-fade', g['reason'])

    def test_too_few_frames(self):
        self.assertFalse(pp.gate_interpolation(frames_moving(2), pp.crossfade)['ok'])

    def test_upscale_gate(self):
        import cv2
        low = (np.random.RandomState(0).rand(32, 32, 3) * 255).astype(np.uint8)
        good = cv2.resize(low, (96, 96), interpolation=cv2.INTER_NEAREST)
        bad = 255 - good
        self.assertTrue(pp.gate_upscale(low, good)['ok'])
        self.assertFalse(pp.gate_upscale(low, bad)['ok'])


if __name__ == '__main__':
    unittest.main()
