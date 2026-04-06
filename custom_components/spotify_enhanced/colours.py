import io
import ssl
import colorsys

from urllib.request import urlopen
from urllib.parse import urljoin, urlparse
from PIL import Image


def get_spotify_colors(
    url,
    ha_url=None,
    verify_cert=True,
    lights_mode=False,
    min_lightness=0.5,
):
    # --- URL handling (unchanged logic) ---
    if not bool(urlparse(url).netloc):
        if not ha_url:
            raise ValueError("Relative URL but no ha_url provided")
        url = urljoin(ha_url, url)

    context = None if verify_cert else ssl.SSLContext()
    fd = urlopen(url, context=context)
    im = Image.open(io.BytesIO(fd.read()))

    # --- match original behaviour ---
    im = im.convert("RGB")
    palette = im.quantize(colors=2).getpalette()

    colors = [palette[i:i+3] for i in range(0, 6, 3)]

    # --- process colors ---
    processed = [
        _process_color(c, lights_mode, min_lightness)
        for c in colors
    ]

    # --- sort by brightness (darkest first = primary) ---
    processed.sort(key=_perceived_brightness)

    return {
        "primary": processed[0],
        "accent": processed[1],
    }


# -------------------------
# Helpers
# -------------------------

def _process_color(color, lights_mode, min_lightness):
    r, g, b = color

    # detect near-black
    if _perceived_brightness(color) < 0.05:
        return [0, 0, 0]

    if not lights_mode:
        return color

    # convert to HLS
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)

    # enforce minimum brightness
    if l < min_lightness:
        l = min_lightness

    # optional: also prevent super low saturation (grey-ish garbage)
    if s < 0.2:
        s = 0.2

    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)

    return [
        int(r2 * 255),
        int(g2 * 255),
        int(b2 * 255),
    ]


def _perceived_brightness(color):
    r, g, b = color
    # perceptual luminance (better than avg)
    return (0.299*r + 0.587*g + 0.114*b) / 255