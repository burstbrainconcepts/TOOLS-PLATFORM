import unittest

from app.render import srt_time
from app.schemas import RenderRequest

class RenderHelpersTest(unittest.TestCase):
    def test_srt_time_formats_milliseconds(self):
        self.assertEqual(srt_time(0), "00:00:00,000")
        self.assertEqual(srt_time(61.234), "00:01:01,234")
        self.assertEqual(srt_time(3661.999), "01:01:01,999")

    def test_manifest_accepts_one_scene(self):
        manifest = RenderRequest.model_validate({
            "scenes": [{
                "asset_id": "00000000-0000-0000-0000-000000000000",
                "duration_sec": 3,
                "caption": "Test caption"
            }]
        })
        self.assertEqual(len(manifest.scenes), 1)
        self.assertEqual(manifest.fps, 30)

    def test_manifest_accepts_procedural_character_scene(self):
        manifest = RenderRequest.model_validate({
            "width": 720,
            "height": 1280,
            "scenes": [{
                "animation": {"action": "walk", "palette": {"shirt": [210, 90, 70]}},
                "duration_sec": 2.5,
                "caption": "Keep moving"
            }]
        })
        self.assertEqual(manifest.scenes[0].animation.action, "walk")
        self.assertEqual(manifest.scenes[0].animation.palette.shirt, [210, 90, 70])

    def test_manifest_rejects_scene_with_both_sources(self):
        with self.assertRaises(ValueError):
            RenderRequest.model_validate({
                "scenes": [{
                    "asset_id": "00000000-0000-0000-0000-000000000000",
                    "animation": {"action": "idle"},
                    "duration_sec": 2
                }]
            })

    def test_manifest_rejects_scene_without_source(self):
        with self.assertRaises(ValueError):
            RenderRequest.model_validate({"scenes": [{"duration_sec": 2}]})

    def test_manifest_rejects_duration_over_limit(self):
        with self.assertRaises(ValueError):
            RenderRequest.model_validate({
                "scenes": [
                    {"asset_id": "00000000-0000-0000-0000-000000000000", "duration_sec": 120}
                    for _ in range(6)
                ]
            })

if __name__ == "__main__":
    unittest.main()
