"""Independent trim/rotation and ambiguity checks for current static line extraction."""
import importlib.util
from pathlib import Path
import unittest

from PIL import Image, ImageDraw

_spec = importlib.util.spec_from_file_location("m100_atlas_verifier", Path(__file__).with_name("verify-atlas.py"))
atlas = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(atlas)


class AtlasGeometryTests(unittest.TestCase):
    def test_clockwise_texturepacker_trim_restores_exact_logical_pixels(self):
        # Logical3x2: R G B / Y M C. Stored clockwise2x3: Y R / M G / C B.
        r, g, b, y, m, c = [(255, 0, 0, 255), (0, 255, 0, 255), (0, 0, 255, 255),
                            (255, 255, 0, 255), (255, 0, 255, 255), (0, 255, 255, 255)]
        texture = Image.new("RGBA", (8, 8))
        for px, py, color in [(2, 1, y), (3, 1, r), (2, 2, m), (3, 2, g), (2, 3, c), (3, 3, b)]:
            texture.putpixel((px, py), color)
        decoded = atlas.decode_frame(texture, {"frame": {"x": 2, "y": 1, "w": 3, "h": 2}, "rotated": True,
            "sourceSize": {"w": 888, "h": 704}, "spriteSourceSize": {"x": 5, "y": 7, "w": 3, "h": 2}})
        self.assertEqual([decoded.getpixel((x, z)) for z in (7, 8) for x in (5, 6, 7)], [r, g, b, y, m, c])
        self.assertEqual(decoded.getpixel((4, 7)), (0, 0, 0, 0))
        self.assertEqual(decoded.getpixel((5, 6)), (0, 0, 0, 0))

    def test_rows_are_recovered_from_independently_drawn_multi_row_zigzag(self):
        image = Image.new("RGBA", (888, 704))
        ImageDraw.Draw(image).line([(67, 636), (257, 446), (446, 256), (636, 446), (824, 636)], fill=(255, 255, 0, 255), width=10)
        line, _ = atlas.infer_path(image)
        self.assertEqual(line, [3, 2, 1, 2, 3])

    def test_between_row_artwork_is_rejected_instead_of_assigned_a_fabricated_path(self):
        image = Image.new("RGBA", (888, 704))
        ImageDraw.Draw(image).line([(66, 150), (824, 150)], fill=(255, 255, 0, 255), width=10)
        with self.assertRaisesRegex(ValueError, "ROW_AMBIGUOUS"):
            atlas.infer_path(image)

    def test_missing_alpha_is_not_a_zero_row(self):
        with self.assertRaisesRegex(ValueError, "NO_ALPHA_SUPPORT"):
            atlas.infer_path(Image.new("RGBA", (888, 704)))

    def test_outside_texture_and_trim_dimensions_reject_before_crop(self):
        metadata = {"frame": {"x": 7, "y": 7, "w": 3, "h": 2}, "rotated": True,
            "sourceSize": {"w": 888, "h": 704}, "spriteSourceSize": {"x": 5, "y": 7, "w": 3, "h": 2}}
        with self.assertRaisesRegex(ValueError, "TEXTURE_BOUNDS"):
            atlas.decode_frame(Image.new("RGBA", (8, 8)), metadata)
        metadata["frame"]["x"] = 0
        metadata["frame"]["y"] = 0
        metadata["spriteSourceSize"]["w"] = 2
        with self.assertRaisesRegex(ValueError, "TRIM_SIZE"):
            atlas.decode_frame(Image.new("RGBA", (8, 8)), metadata)


if __name__ == "__main__":
    unittest.main()
