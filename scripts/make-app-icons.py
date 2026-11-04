"""Builds the app icon, Android adaptive icon layers and splash image from the Tora logo.

Run from the project root:  python scripts/make-app-icons.py
Needs Pillow (pip install pillow). Input: assets/brand/tora-logo.png (transparent background).
For sharper icons, replace tora-logo.png with a 1024 px (or larger) export and run again.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
SIZE = 1024
WHITE = (255, 255, 255, 255)


def logo_scaled(height: int) -> Image.Image:
    """The logo cropped to its drawing and scaled to `height` pixels tall."""
    logo = Image.open(ASSETS / "brand" / "tora-logo.png").convert("RGBA")
    logo = logo.crop(logo.getbbox())
    width = round(logo.width * height / logo.height)
    return logo.resize((width, height), Image.LANCZOS)


def centered(height: int, background=(0, 0, 0, 0)) -> Image.Image:
    canvas = Image.new("RGBA", (SIZE, SIZE), background)
    logo = logo_scaled(height)
    canvas.alpha_composite(logo, ((SIZE - logo.width) // 2, (SIZE - logo.height) // 2))
    return canvas


# Legacy/round icon: logo on a solid white square (no transparency allowed).
centered(round(SIZE * 0.72), WHITE).convert("RGB").save(ASSETS / "icon.png")

# Adaptive icon foreground: Android crops the 108dp layer to shapes and only the
# central 66dp circle is always visible, so the logo stays within ~46% of the canvas
# (the ears and tail must clear a circle mask too).
# The background layer is plain white (android.adaptiveIcon.backgroundColor).
foreground = centered(round(SIZE * 0.46))
foreground.save(ASSETS / "android-icon-foreground.png")

# Monochrome layer (Android 13+ themed icons): only the shape (alpha) is used.
mono = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
mono.putalpha(foreground.getchannel("A"))
mono.save(ASSETS / "android-icon-monochrome.png")

# Splash image: the logo on transparent; the splash plugin puts it on white.
centered(round(SIZE * 0.9)).save(ASSETS / "splash-icon.png")

# Favicon (web preview only).
centered(round(SIZE * 0.8), WHITE).resize((48, 48), Image.LANCZOS).save(ASSETS / "favicon.png")

print("Wrote icon.png, android-icon-foreground.png, android-icon-monochrome.png, splash-icon.png, favicon.png")
