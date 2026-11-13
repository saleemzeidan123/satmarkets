# App icons: the SAT Markets mark, four lots with one lit, reversed on navy.
#
# PKG-DESIGN-6. This script used to write the letters "SAT" in whatever serif
# the machine had, on a brown square, over a short blue rule. That was never the
# mark: the mark is the four lots the header, the footer and the favicon draw
# (src/app/icon.svg), and an installed app showed a different identity from the
# site it opened. The geometry below is that SVG's, in its own 100-unit box.
#
# Reversed on navy the three plain lots are white and the lit lot is sky, the
# same pairing the footer logo uses, because Harbor on navy is only 2.8 to 1.
#
# The maskable icon keeps the whole mark inside the central 60 percent, well
# within the safe zone a launcher may crop to. Drawn at four times the size and
# reduced, so the corners are smooth without depending on a font or a renderer.
#
# Run from the repository root:  python3 scripts/gen_icons.py
from PIL import Image, ImageDraw

NAVY = "#111A33"
WHITE = "#FFFFFF"
SKY = "#A9BEEA"

# (x, y, width, height, lit) in the favicon's 100-unit viewBox.
LOTS = [
    (7.0, 7.0, 32.25, 47.73, False),
    (43.55, 7.0, 49.45, 47.73, True),
    (7.0, 59.03, 32.25, 33.97, False),
    (43.55, 59.03, 49.45, 33.97, False),
]
SS = 4  # supersampling factor


def make(size, mark_share):
    big = size * SS
    img = Image.new("RGB", (big, big), NAVY)
    d = ImageDraw.Draw(img)
    # The mark occupies 86 of the 100 units (7 to 93); scale that span to the
    # requested share of the icon and centre it.
    span = 86.0
    k = big * mark_share / span
    off = (big - span * k) / 2 - 7.0 * k
    for x, y, w, h, lit in LOTS:
        box = [off + x * k, off + y * k, off + (x + w) * k, off + (y + h) * k]
        d.rounded_rectangle(box, radius=3.0 * k, fill=SKY if lit else WHITE)
    return img.resize((size, size), Image.LANCZOS)


make(192, 0.62).save("public/icon-192.png")
make(512, 0.62).save("public/icon-512.png")
make(512, 0.52).save("public/icon-maskable-512.png")
make(180, 0.62).save("public/apple-touch-icon.png")
print("icons written")
