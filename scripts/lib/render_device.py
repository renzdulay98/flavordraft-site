"""Renders a FlavorDraft capture inside the App Store campaign's own hardware, with alpha.

Called by scripts/build-screens.mjs for a manifest entry that has a `device`:

  {"src": "/abs/capture.png", "crop": [x, y, w, h] | null,
   "tools": "/abs/flavordraft-app-docs/app-store/2.0/tools",
   "device": {"kit": "duo", "pose": "lying_open", "camera": 78, "px": 1.7, ...}
            | {"kit": "slab", "scale": 0.5},
   "out": "/abs/device.png", "quads": "/abs/device.json" | null}

`kit: "duo"` is the campaign's iPhone Duo model (duokit.py: one physical model in Star
White, ray-traced, the capture laid on the plane of the display it belongs to), in one
of its postures: `lying_open` (flat, inner display up; a tall capture gives the phone
lying tall; `yaw`), `lying_closed` (closed, the outer display up, spine to the left;
`yaw`), `laptop` (held tall and folded partway: the capture's lower half lies, the
upper half stands; `opening`, `yaw`) and `tent` (stood on its two free edges, hinge
up, the outer display facing the viewer on its side; `opening`, `yaw`), with `camera`
(its elevation in degrees, and `distance`) and `px` (picture pixels to the point). `kit: "slab"` is the campaign's dark
iPhone (slabkit.py: the drawn body, the capture as its display) at `scale` pixels to
the capture's pixel. The phone's own shadow on the paper is composited under it, and
the result is cut to its bounds. Nothing on a display is drawn here: it is the capture.

With `quads`, the laptop pose also writes where the inner display's two halves fall in
the picture (each as four corners, top-left clockwise, as fractions of the picture's
size), so the page can lay a moving picture of that display over the still.
"""

import json
import sys

import numpy as np
from PIL import Image


def main():
    spec = json.loads(sys.argv[1])
    sys.path.insert(0, spec["tools"])
    import slabkit as k
    import duokit as dk

    capture = Image.open(spec["src"]).convert("RGB")
    if spec.get("crop"):
        x, y, w, h = spec["crop"]
        capture = capture.crop((x, y, x + w, y + h))
    device = spec["device"]
    quads = None

    if device["kit"] == "slab":
        scale = device.get("scale", 0.5)
        shot, body_origin, screen_origin = k.device(capture, scale)
        layers = []
        for blur, offset, opacity in k.DEVICE_SHADOWS(scale):
            layer, (dx, dy) = k.shadow(shot, blur, offset, opacity)
            layers.append((layer, dx, dy))
        pad = max(-min(dx, dy) for _, dx, dy in layers) + 2
        pad = int(pad)
        w = max(shot.width + 2 * pad, max(layer.width + dx + pad for layer, dx, dy in layers))
        h = max(shot.height + 2 * pad, max(layer.height + dy + pad for layer, dx, dy in layers))
        out = Image.new("RGBA", (int(w), int(h)), (0, 0, 0, 0))
        for layer, dx, dy in layers:
            out.alpha_composite(layer, (int(pad + dx), int(pad + dy)))
        out.alpha_composite(shot, (pad, pad))
    elif device["kit"] == "duo":
        pose = device["pose"]
        cam = dk.Camera(device.get("camera", 78), distance=device.get("distance", 9000.0))
        px = device.get("px", 1.5)
        if pose == "lying_open":
            duo = dk.lying_open(capture, yaw=device.get("yaw", 0.0))
        elif pose == "lying_closed":
            duo = dk.lying_closed(capture, yaw=device.get("yaw", 0.0))
        elif pose == "laptop":
            duo = dk.laptop(capture, opening=device.get("opening", 95.0), yaw=device.get("yaw", 0.0))
        elif pose == "tent":
            duo = dk.tent(capture, opening=device.get("opening", 70.0), yaw=device.get("yaw", 0.0))
        else:
            sys.exit(f"unknown pose {pose}")
        picture, shadow, origin = dk.render(duo, cam, px)
        out = Image.new("RGBA", picture.size, (0, 0, 0, 0))
        out.alpha_composite(shadow)
        out.alpha_composite(picture)
        if spec.get("quads") and pose == "laptop":
            # The inner display held tall: u across (0..669), v down (0..951); its top is the wide display's right.
            def at(u, v):
                p = cam.project(duo.inner_point(dk.INNER[0] - v, u), px)[0] - np.array(origin)
                return [float(p[0]), float(p[1])]
            # Held tall, the display is INNER[1] (669) across and INNER[0] (951) down, and
            # the fold is halfway down.
            across, down = dk.INNER[1], dk.INNER[0]
            mid = down / 2
            quads = {
                "top": [at(0, 0), at(across, 0), at(across, mid), at(0, mid)],
                "bottom": [at(0, mid), at(across, mid), at(across, down), at(0, down)],
            }
    else:
        sys.exit(f"unknown kit {device['kit']}")

    bbox = out.getchannel("A").getbbox()
    out = out.crop(bbox)
    if quads:
        w, h = out.size
        for key in quads:
            quads[key] = [[round((x - bbox[0]) / w, 5), round((y - bbox[1]) / h, 5)] for x, y in quads[key]]
    out.save(spec["out"])
    if spec.get("quads"):
        with open(spec["quads"], "w") as f:
            json.dump({"w": out.width, "h": out.height, "quads": quads}, f)
    print(json.dumps({"w": out.width, "h": out.height}))


if __name__ == "__main__":
    main()
