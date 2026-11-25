"""Verify M100 line geometry against separately retained original static artwork.

Usage: python verify-atlas.py /absolute/path/to/retained/Sprites
Requires Pillow. Reads only; publishes no artwork or executable provider program.
"""
import hashlib
import json
from pathlib import Path
import statistics
import sys

from PIL import Image

SAMPLE_X = (80, 257, 446, 635, 810)
ROW_Y = (67.5, 256.5, 446.5, 636.5)


def decode_frame(texture, metadata):
    f = metadata["frame"]
    trim = metadata["spriteSourceSize"]
    size = metadata["sourceSize"]
    rotated = metadata.get("rotated", False)
    width, height = (f["h"], f["w"]) if rotated else (f["w"], f["h"])
    integers = [f["x"], f["y"], f["w"], f["h"], trim["x"], trim["y"], trim["w"], trim["h"], size["w"], size["h"]]
    if any(not isinstance(value, int) or isinstance(value, bool) or value < 0 for value in integers):
        raise ValueError("M100_LINE_ATLAS_INTEGERS")
    if (size["w"], size["h"]) != (888, 704) or not f["w"] or not f["h"]:
        raise ValueError("M100_LINE_SOURCE_SIZE")
    if f["w"] != trim["w"] or f["h"] != trim["h"]:
        raise ValueError("M100_LINE_TRIM_SIZE")
    if f["x"] + width > texture.width or f["y"] + height > texture.height:
        raise ValueError("M100_LINE_TEXTURE_BOUNDS")
    if trim["x"] + trim["w"] > size["w"] or trim["y"] + trim["h"] > size["h"]:
        raise ValueError("M100_LINE_TRIM_BOUNDS")
    region = texture.crop((f["x"], f["y"], f["x"] + width, f["y"] + height))
    if rotated:
        region = region.transpose(Image.Transpose.ROTATE_90)
    result = Image.new("RGBA", (size["w"], size["h"]))
    result.paste(region, (trim["x"], trim["y"]))
    return result


def infer_path(image):
    path, medians = [], []
    for column, x in enumerate(SAMPLE_X):
        support = [y for y in range(image.height) for dx in (-1, 0, 1) if image.getpixel((x + dx, y))[3] > 16]
        if not support:
            raise ValueError("M100_LINE_NO_ALPHA_SUPPORT")
        median = statistics.median(support)
        distances = [abs(median - row) for row in ROW_Y]
        row = min(range(4), key=lambda index: distances[index])
        # End samples lie14pixels inward from the tapered line endpoints;
        # their slope offset stays below50px even for the three-row diagonal.
        if distances[row] > 50 or (column in (1, 2, 3) and distances[row] > 4):
            raise ValueError("M100_LINE_ROW_AMBIGUOUS")
        path.append(row)
        medians.append(median)
    return path, medians


def verify(root):
    root = root.resolve(strict=True)
    evidence = json.loads((Path(__file__).parent / "payline-art-evidence.json").read_text())
    for pin in evidence["atlasPins"]:
        body = (root / pin["filename"]).read_bytes()
        if len(body) != pin["bytes"] or hashlib.sha256(body).hexdigest() != pin["sha256"]:
            raise ValueError("M100_CURRENT_ATLAS_PIN_CHANGED: " + pin["filename"])
    actual = {}
    for number in range(8):
        path = root / ("Images-" + str(number) + ".json")
        metadata = json.loads(path.read_text())
        with Image.open(path.with_suffix(".png")) as texture:
            texture = texture.convert("RGBA")
            for name, frame in metadata["frames"].items():
                if not name.startswith("Box/Line/"):
                    continue
                line_id = int(name.rsplit("/", 1)[1])
                if line_id in actual or not 1 <= line_id <= 100:
                    raise ValueError("M100_LINE_ID_SET")
                image = decode_frame(texture, frame)
                line, medians = infer_path(image)
                actual[line_id] = {"lineId": line_id, "path": line, "observedSampleMedianY": medians,
                                   "decodedRgbaSha256": hashlib.sha256(image.tobytes()).hexdigest()}
    if set(actual) != set(range(1, 101)):
        raise ValueError("M100_LINE_MISSING")
    for expected in evidence["lines"]:
        if actual[expected["lineId"]] != expected:
            raise ValueError("M100_LINE_EXTRACTION_CHANGED: " + str(expected["lineId"]))
    if len({tuple(item["path"]) for item in actual.values()}) != 100:
        raise ValueError("M100_DUPLICATE_LINE_GEOMETRY")
    return {"atlasPinsVerified": len(evidence["atlasPins"]), "pathsVerified": len(actual), "uniquePaths": 100,
            "line45": actual[45]["path"], "line46": actual[46]["path"], "artworkPublished": False,
            "probabilityModelVerified": False, "financialApproval": False}


if __name__ == "__main__":
    if len(sys.argv) != 2 or not Path(sys.argv[1]).is_absolute():
        raise SystemExit("Usage: python verify-atlas.py /absolute/path/to/retained/Sprites")
    print(json.dumps(verify(Path(sys.argv[1])), separators=(",", ":")))
