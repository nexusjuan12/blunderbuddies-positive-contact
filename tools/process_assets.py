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


# Each Buddy: zip with the flight sheet + super pose, zip with the select-idle sheet, and voice clips.
BUDDIES = {
    "nuhuh": {"fly_zip": "files2.zip", "select_zip": "nuh-uh-select-idle.zip", "stem": "nuh_uh",
              "voices": {"select": "nuh-uh-select.mp3", "damage": "nuh-uh-hurt.mp3", "recover": "nuh-uh-defiant.mp3"}},
    "uhhuh": {"fly_zip": "uh-huh.zip", "select_zip": "uh-huh.zip", "stem": "uh_huh",
              "voices": {"select": "uh-huh-select.mp3", "damage": "uh-huh-damage.mp3", "recover": "uh-huh-recover.mp3"}},
    "oopsie": {"fly_zip": "oopsie.zip", "select_zip": "oopsie.zip", "stem": "oopsie",
               "voices": {"select": "Oopsie-select.mp3", "damage": "Oopsie-damage.mp3", "recover": "oopsie-recover.mp3"}},
    "whoopsie": {"fly_zip": "whoopsie-doodle.zip", "select_zip": "whoopsie-doodle.zip", "stem": "whoopsie_doodle",
                 "voices": {"select": "whoopsie-doodle-select.mp3", "damage": "whoopsie-doodle-damage.wav",
                            "recover": "Whoopsie-Doodle-recover.mp3"}},
    "teehee": {"fly_zip": "tee-hee.zip", "select_zip": "tee-hee.zip", "stem": "tee_hee",
               "voices": {"select": "Tee-Hee-select.mp3", "damage": "tee-hee-damage.wav", "recover": "tee-hee-recover.wav"}},
}


def rescale_sheet(sheet: Image.Image, fw: int, fh: int, frames: int, cols: int, scale: float) -> tuple[Image.Image, int, int]:
    """Resize a sprite sheet frame by frame so the new frame size stays a whole number of pixels."""
    nw, nh = round(fw * scale), round(fh * scale)
    rows = (frames + cols - 1) // cols
    out = Image.new("RGBA", (nw * cols, nh * rows), (0, 0, 0, 0))
    for i in range(frames):
        cx, cy = (i % cols) * fw, (i // cols) * fh
        frame = sheet.crop((cx, cy, cx + fw, cy + fh)).resize((nw, nh), Image.LANCZOS)
        out.paste(frame, ((i % cols) * nw, (i // cols) * nh))
    return out, nw, nh


def unzip(name: str) -> Path:
    dst = TMP / Path(name).stem
    with zipfile.ZipFile(SRC / name) as z:
        z.extractall(dst)
    return dst


def encode_mp3(src: Path, dst: Path) -> None:
    if src.suffix.lower() == ".mp3":
        shutil.copyfile(src, dst)
    else:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-c:a", "libmp3lame", "-q:a", "2", str(dst)], check=True)


def buddies(fly_scale: float = 0.5, select_scale: float = 0.85) -> None:
    """Flight sheet (half size), super pose and select-idle sheet per Buddy, plus JSON metadata and voices."""
    print("buddies")
    TMP.mkdir(parents=True, exist_ok=True)
    for bid, cfg in BUDDIES.items():
        stem = cfg["stem"]
        fly_dir = unzip(cfg["fly_zip"])
        meta = json.loads((fly_dir / f"{stem}_fly_sheet.json").read_text())
        sheet, fw, fh = rescale_sheet(load(fly_dir / f"{stem}_fly_sheet.png"), meta["frameWidth"], meta["frameHeight"],
                                      meta["frames"], meta["columns"], fly_scale)
        save(sheet, f"hero-{bid}-fly.png")
        hx, hy = meta["hitbox_center"]
        (OUT / f"hero-{bid}-fly.json").write_text(json.dumps({
            "frameWidth": fw, "frameHeight": fh, "frames": meta["frames"], "fps": meta["fps"],
            # Hitbox centre as a 0..1 origin, so the sprite position is the hitbox position.
            "originX": hx / meta["frameWidth"], "originY": hy / meta["frameHeight"],
        }, indent=2) + "\n")
        save(load(fly_dir / f"{stem}_super_pose.png"), f"hero-{bid}-super.png")

        sel_dir = unzip(cfg["select_zip"])
        smeta = json.loads((sel_dir / f"{stem}_select_idle.json").read_text())[f"{stem}_select_idle_640.png"]
        sheet, fw, fh = rescale_sheet(load(sel_dir / f"{stem}_select_idle_640.png"), smeta["frameWidth"], smeta["frameHeight"],
                                      smeta["frames"], smeta["columns"], select_scale)
        save(sheet, f"hero-{bid}-select.png")
        (OUT / f"hero-{bid}-select.json").write_text(json.dumps({
            "frameWidth": fw, "frameHeight": fh, "frames": smeta["frames"], "fps": smeta["fps"],
            "feetY": smeta["feet_baseline_y"] / smeta["frameHeight"],
        }, indent=2) + "\n")

        for kind, name in cfg["voices"].items():
            encode_mp3(SRC / name, OUT / f"voice-{bid}-{kind}.mp3")
        print(f"  {bid}: json + voices")
    shutil.rmtree(TMP)


def spiderlons() -> None:
    """Elon ground minion walk sheet (half size) and the Spiderlon boss idle sheet (for a later level)."""
    print("spiderlons")
    TMP.mkdir(parents=True, exist_ok=True)
    d = unzip("elon-ground-minion.zip")
    meta = json.loads((d / "spiderlon_walk_sheet.json").read_text())
    scale = 0.5
    sheet, fw, fh = rescale_sheet(load(d / "spiderlon_walk_sheet.png"), meta["frameWidth"], meta["frameHeight"],
                                  meta["frames"], meta["columns"], scale)
    save(sheet, "elon-walk.png")
    hb = meta["hitbox"]
    (OUT / "elon-walk.json").write_text(json.dumps({
        "frameWidth": fw, "frameHeight": fh, "frames": meta["frames"], "fps": meta["fps"],
        # Everything as 0..1 of the frame.
        "feetY": meta["feet_baseline_y"] / meta["frameHeight"],
        "hitbox": {"x": hb["x"] / meta["frameWidth"], "y": hb["y"] / meta["frameHeight"],
                   "w": hb["w"] / meta["frameWidth"], "h": hb["h"] / meta["frameHeight"]},
    }, indent=2) + "\n")

    d = unzip("spiderlon-boss.zip")
    meta = json.loads((d / "spiderlon_boss_idle_sheet.json").read_text())
    shutil.copyfile(d / "spiderlon_boss_idle_sheet.png", OUT / "spiderlon-boss-idle.png")
    (OUT / "spiderlon-boss-idle.json").write_text(json.dumps(meta, indent=2) + "\n")
    print("  spiderlon-boss-idle.png + json")
    shutil.rmtree(TMP)


# Title collage panels as clip polygons in % of the art box (from Jake's title-screen animation),
# plus the point each panel "pops" around when it lights up.
TITLE_ART = "tmpcq1n1jae.png"  # 2400x1792 collage (v2, Uh-Huh bottom-left)
TITLE_PANELS = {
    "tl": ([(0, 0), (50, 0), (50, 18.64), (21.92, 49.65), (0, 49.65)], (22, 22)),
    "tr": ([(50, 0), (100, 0), (100, 49.65), (77.39, 49.65), (50, 18.64)], (78, 22)),
    "bl": ([(0, 49.65), (21.92, 49.65), (50, 95.20), (50, 100), (0, 100)], (22, 76)),
    "br": ([(100, 49.65), (77.39, 49.65), (50, 95.20), (50, 100), (100, 100)], (78, 76)),
    "c": ([(50, 18.64), (77.39, 49.65), (50, 95.20), (21.92, 49.65)], (50, 55)),
}
# Glowing frame lines between the panels, in the collage's 2400x1792 pixel space.
TITLE_FRAME = [
    [(1200, 334), (1857, 890), (1200, 1706), (526, 890), (1200, 334)],
    [(1200, 334), (1200, 0)],
    [(1200, 1706), (1200, 1792)],
    [(526, 890), (0, 890)],
    [(1857, 890), (2400, 890)],
]


def title() -> None:
    """Cut the title collage into its five panels, make the blurred backdrop, copy font + music."""
    print("title")
    art = load(TITLE_ART)
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
            # Clip polygon, 0..1 of the art box (used for tap hit-testing).
            "poly": [(x / 100, y / 100) for x, y in poly],
        }
    frame = [[(x / 2400, y / 1792) for x, y in line] for line in TITLE_FRAME]
    (OUT / "title-panels.json").write_text(json.dumps({"panels": meta, "frame": frame}, indent=2) + "\n")
    print("  title-panels.json")

    # Backdrop: covers the stage 8% past each edge, blurred and a little more saturated.
    # Stored at half size; it's drawn at 2x (blur hides the resolution).
    bw, bh = round(960 * 1.16 / 2), round(540 * 1.16 / 2)
    src = load(TITLE_ART).convert("RGB")
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
    shutil.copyfile(SRC / "uh-uh-no-buddies-no-win.mp3", OUT / "voice-uhuhno-defeat.mp3")
    print("  voice-uhuhno-defeat.mp3")
    dst = OUT / "voice-uhuhno-taunt.mp3"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(SRC / "uh-uh-no.wav"), "-c:a", "libmp3lame", "-q:a", "2", str(dst)], check=True)
    print(f"  {dst.name}")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    sprites()
    buddies()
    spiderlons()
    title()
    backgrounds()
    mecha_turkey()
    audio()
