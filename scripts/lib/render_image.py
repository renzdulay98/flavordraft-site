"""Crops, masks and resizes one source image for `npm run screens`.

Called by scripts/build-screens.mjs with one JSON argument:

  {"src": "/abs/source.png", "crop": [x, y, w, h] | null,
   "bands": [[x, y, w, h], ...] | null, "radius": px | null, "continuous": bool,
   "widths": [400, 800], "quality": 55, "out": "/abs/dir", "name": "hero-duo",
   "tmp": "/abs/tmpdir"}

For every width it writes <out>/<name>-<w>.avif (AV1, 4:4:4 so the app's red
type and strikes keep their edges) and a lossless <tmp>/<name>-<w>.png that the
caller turns into WebP with cwebp. `radius` rounds the crop's corners into an
alpha mask (used for the glass menu, which sits over other content in its
capture). `bands`, in place of `crop`, cuts several full-width strips of one
screen and sets them one under the other: an excerpt, as the App Store
screenshots make one (nothing is retyped or redrawn; the strips share the
screen's own paper, so the joins do not show). Prints {"w": ..., "h": ...,
"alpha": ...} for the result.

Needs Pillow with AVIF support (Pillow 11.3 or later).
"""

import json
import os
import sys

from PIL import Image, ImageDraw


def rounded_mask(size, radius, scale=4, continuous=False, exponent=5):
    """An antialiased rounded-rectangle mask, drawn large and reduced.

    With `continuous`, each corner is a superellipse (`exponent`, 5 by default),
    approximating the "continuous" corner iOS draws on glass and sheets, so a mask
    can follow a captured system shape instead of cutting a second, circular
    corner into it. `radius` is then how far along each edge the curve runs.
    """
    w, h = size
    W, H, R = w * scale, h * scale, radius * scale
    big = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(big)
    if not continuous:
        draw.rounded_rectangle((0, 0, W - 1, H - 1), radius=R, fill=255)
        return big.resize(size, Image.LANCZOS)

    import math

    def corner(cx, cy, sx, sy):
        # a quarter superellipse from the side to the top/bottom, centred on (cx, cy)
        points = []
        for i in range(0, 91, 3):
            t = math.radians(i)
            c, s = math.cos(t), math.sin(t)
            x = math.copysign(abs(c) ** (2 / exponent), c) * R
            y = math.copysign(abs(s) ** (2 / exponent), s) * R
            points.append((cx + sx * x, cy + sy * y))
        return points

    outline = (
        corner(W - R, R, 1, -1)[::-1]  # top right, from the top edge down
        + corner(W - R, H - R, 1, 1)  # bottom right
        + corner(R, H - R, -1, 1)[::-1]  # bottom left
        + corner(R, R, -1, -1)  # top left
    )
    draw.polygon(outline, fill=255)
    return big.resize(size, Image.LANCZOS)


def main():
    spec = json.loads(sys.argv[1])
    image = Image.open(spec["src"])
    image = image.convert("RGBA" if spec.get("radius") else "RGB")

    if spec.get("bands"):
        strips = [image.crop((x, y, x + w, y + h)) for x, y, w, h in spec["bands"]]
        if len({strip.width for strip in strips}) != 1:
            sys.exit(f'{spec["name"]}: every band must be the same width')
        excerpt = Image.new(image.mode, (strips[0].width, sum(strip.height for strip in strips)))
        top = 0
        for strip in strips:
            excerpt.paste(strip, (0, top))
            top += strip.height
        image = excerpt
    elif spec.get("crop"):
        x, y, w, h = spec["crop"]
        image = image.crop((x, y, x + w, y + h))

    if spec.get("radius"):
        image.putalpha(rounded_mask(image.size, spec["radius"], continuous=spec.get("continuous", False), exponent=spec.get("exponent", 5)))

    os.makedirs(spec["out"], exist_ok=True)
    os.makedirs(spec["tmp"], exist_ok=True)
    for width in spec["widths"]:
        height = round(image.height * width / image.width)
        sized = image if width == image.width else image.resize((width, height), Image.LANCZOS)
        stem = f'{spec["name"]}-{width}'
        sized.save(
            os.path.join(spec["out"], f"{stem}.avif"),
            quality=spec.get("quality", 55),
            subsampling="4:4:4",
            speed=4,
        )
        sized.save(os.path.join(spec["tmp"], f"{stem}.png"))

    print(json.dumps({"w": image.width, "h": image.height, "alpha": bool(spec.get("radius"))}))


if __name__ == "__main__":
    main()
