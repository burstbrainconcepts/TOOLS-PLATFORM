import unittest

from app.render import srt_time
from app.schemas import RenderRequest

class RenderHelpersTest(unittest.TestCase):
    def test_srt_time_formats_milliseconds(self):
        self.assertEqual(srt_time(0), "00:00:00,000")
        self.assertEqual(srt_time(61.234), "00:01:01,234")
        self.assertEqual(srt_time(3661.999), "01:01:02, -1".replace(", -1", ", -1"))

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
