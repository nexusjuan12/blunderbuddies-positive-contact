#!/usr/bin/env python3
"""Turn Jake's original art/audio in assets/ into game-ready files in public/processed/.

Originals are only ever read. Re-run any time assets change:
    python3 tools/process_assets.py
Needs Pillow and ffmpeg.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets"
OUT = ROOT / "public" / "processed"
TMP = ROOT / "tools" / ".tmp"


def load(name: str | Path) -> Image.Image:
    return Image.open(SRC / name if isinstance(name, str) else name).convert("RGBA")


def trim(im: Image.Image) -> Image.Image:
    box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    return im.crop(box) if box else im


def centre_on_mass(im: Image.Image) -> Image.Image:
    """Pad so the alpha centroid sits at the image centre, so code rotation spins around the body."""
    alpha = im.getchannel("A")
    w, h = im.size
    total = sx = sy = 0
    px = alpha.load()
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            a = px[x, y]
            if a > 8:
                total += a
                sx += x * a
                sy += y * a
    cx, cy = sx / total, sy / total
    half_w = max(cx, w - cx)
    half_h = max(cy, h - cy)
    out = Image.new("RGBA", (int(half_w * 2) + 1, int(half_h * 2) + 1), (0, 0, 0, 0))
    out.paste(im, (int(half_w - cx), int(half_h - cy)))
    return out


def fit(im: Image.Image, max_dim: int) -> Image.Image:
    s = max_dim / max(im.size)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def to_height(im: Image.Image, h: int) -> Image.Image:
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


def save(im: Image.Image, name: str) -> None:
    path = OUT / name
    im.save(path, optimize=True)
    print(f"  {name:32s} {im.width}x{im.height}")


def sprites() -> None:
    print("sprites")
    for i in (1, 2, 3):
        save(fit(centre_on_mass(trim(load(f"mimic-{i}.png"))), 192), f"mimic-{i}.png")
    save(fit(trim(load("sun.png")), 320), "sun.png")


def hero_flight() -> None:
    """Nuh-Uh's flight loop sheet (already at 2x) plus the super pose; hitbox centre goes in a JSON."""
    print("hero flight")
    TMP.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(SRC / "files2.zip") as z:
        z.extractall(TMP / "fly")
    meta = json.loads((TMP / "fly" / "nuh_uh_fly_sheet.json").read_text())
    save(load(TMP / "fly" / "nuh_uh_fly_sheet.png"), "hero-nuhuh-fly.png")
    save(load(TMP / "fly" / "nuh_uh_super_pose.png"), "hero-nuhuh-super.png")
    hx, hy = meta["hitbox_center"]
    out = {
        "frameWidth": meta["frameWidth"],
        "frameHeight": meta["frameHeight"],
        "frames": meta["frames"],
        "fps": meta["fps"],
        # Hitbox centre as a 0..1 origin, so the sprite position is the hitbox position.
        "originX": hx / meta["frameWidth"],
        "originY": hy / meta["frameHeight"],
    }
    (OUT / "hero-nuhuh-fly.json").write_text(json.dumps(out, indent=2) + "\n")
    print("  hero-nuhuh-fly.json")
    shutil.rmtree(TMP)


# Title collage panels as clip polygons in % of the art box (from Jake's title-screen animation),
# plus the point each panel "pops" around when it lights up.
TITLE_PANELS = {
    "tl": ([(0, 0), (50, 0), (50, 18.75), (21.92, 49.65), (0, 49.65)], (22, 22)),
    "tr": ([(50, 0), (100, 0), (100, 49.65), (77.39, 49.65), (50, 18.75)], (78, 22)),
    "bl": ([(0, 49.65), (21.92, 49.65), (50, 94.97), (50, 100), (0, 100)], (22, 76)),
    "br": ([(100, 49.65), (77.39, 49.65), (50, 94.97), (50, 100), (100, 100)], (78, 76)),
    "c": ([(50, 18.75), (77.39, 49.65), (50, 94.97), (21.92, 49.65)], (50, 55)),
}


def title() -> None:
    """Cut the title collage into its five panels, make the blurred backdrop, copy font + music."""
    print("title")
    art = load("title-screen.png")
    art = art.resize((1440, 1080), Image.LANCZOS)  # 2x the 720x540 art box
    aw, ah = art.size
    ss = 4  # supersample the masks for smooth diagonal edges
    meta = {}
    for name, (poly, origin) in TITLE_PANELS.items():
        mask = Image.new("L", (aw * ss, ah * ss), 0)
        ImageDraw.Draw(mask).polygon([(x / 100 * aw * ss, y / 100 * ah * ss) for x, y in poly], fill=255)
        mask = mask.resize((aw, ah), Image.LANCZOS)
        piece = art.copy()
        piece.putalpha(mask)
        box = mask.getbbox()
        assert box
        save(piece.crop(box), f"title-{name}.png")
        meta[name] = {
            # Crop rectangle and pop origin, all as 0..1 of the art box.
            "x": box[0] / aw,
            "y": box[1] / ah,
            "w": (box[2] - box[0]) / aw,
            "h": (box[3] - box[1]) / ah,
            "originX": origin[0] / 100,
            "originY": origin[1] / 100,
        }
    (OUT / "title-panels.json").write_text(json.dumps(meta, indent=2) + "\n")
    print("  title-panels.json")

    # Backdrop: covers the stage 8% past each edge, blurred and a little more saturated.
    # Stored at half size; it's drawn at 2x (blur hides the resolution).
    bw, bh = round(960 * 1.16 / 2), round(540 * 1.16 / 2)
    src = load("title-screen.png").convert("RGB")
    scale = max(bw / src.width, bh / src.height)
    src = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    left, top = (src.width - bw) // 2, (src.height - bh) // 2
    bg = src.crop((left, top, left + bw, top + bh)).filter(ImageFilter.GaussianBlur(12))
    save(ImageEnhance.Color(bg).enhance(1.3), "title-bg.png")

    shutil.copyfile(SRC / "perfect_dark" / "pdark.ttf", OUT / "pdark.ttf")
    print("  pdark.ttf")
    shutil.copyfile(SRC / "title-loop.mp3", OUT / "music-title.mp3")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(SRC / "title-loop.mp3"), "-c:a", "libvorbis", "-q:a", "4", str(OUT / "music-title.ogg")],
        check=True,
    )
    print("  music-title.mp3 / .ogg")


def backgrounds() -> None:
    print("backgrounds")
    for layer in ("sky", "far", "near"):
        save(to_height(load(f"happy_hills_{layer}.png"), 540), f"hh-{layer}.png")
    # Same scale the layers use: 1080 -> 540, then 2x for sharpness (drawn at 0.5).
    save(fit(load("happy_hills_dome_landmark.png"), 700), "hh-dome.png")


def mecha_turkey(scale: float = 0.75) -> None:
    """Trim each rig part and record where it sits on the shared canvas plus its pivot."""
    print("mecha turkey")
    TMP.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(SRC / "files.zip") as z:
        z.extractall(TMP / "turkey")
    rig = json.loads((TMP / "turkey" / "mecha_turkey_parts.json").read_text())
    cw, ch = rig["canvas"]
    parts = {}
    for part in rig["draw_order"]:
        im = load(TMP / "turkey" / f"mecha_turkey_{part}.png")
        box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        assert box
        cropped = im.crop(box)
        cropped = cropped.resize((round(cropped.width * scale), round(cropped.height * scale)), Image.LANCZOS)
        px, py = rig["pivots"][part]
        key = f"turkey-{part.replace('_', '-')}"
        save(cropped, f"{key}.png")
        parts[part] = {
            "key": key,
            # Pivot as a 0..1 origin inside the trimmed image.
            "originX": (px - box[0]) / (box[2] - box[0]),
            "originY": (py - box[1]) / (box[3] - box[1]),
            # Pivot position relative to the rig canvas centre, in processed pixels.
            "x": (px - cw / 2) * scale,
            "y": (py - ch / 2) * scale,
        }
    rig_out = {"drawOrder": rig["draw_order"], "parts": parts}
    (OUT / "turkey-rig.json").write_text(json.dumps(rig_out, indent=2) + "\n")
    print("  turkey-rig.json")
    shutil.rmtree(TMP)


def audio() -> None:
    print("audio")
    wav = SRC / "axel-f-cover.wav"
    for ext, args in (("ogg", ["-c:a", "libvorbis", "-q:a", "4"]), ("mp3", ["-c:a", "libmp3lame", "-b:a", "160k"])):
        dst = OUT / f"music-happy-hills.{ext}"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), *args, str(dst)], check=True)
        print(f"  {dst.name}")
    for clip in ("hurt", "defiant"):
        shutil.copyfile(SRC / f"nuh-uh-{clip}.mp3", OUT / f"voice-nuhuh-{clip}.mp3")
        print(f"  voice-nuhuh-{clip}.mp3")
    shutil.copyfile(SRC / "uh-uh-no-buddies-no-win.mp3", OUT / "voice-uhuhno-defeat.mp3")
    print("  voice-uhuhno-defeat.mp3")
    dst = OUT / "voice-uhuhno-taunt.mp3"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(SRC / "uh-uh-no.wav"), "-c:a", "libmp3lame", "-q:a", "2", str(dst)], check=True)
    print(f"  {dst.name}")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    sprites()
    hero_flight()
    title()
    backgrounds()
    mecha_turkey()
    audio()
