# Assets TODO

Originals live in `assets/` and are never modified. `python3 tools/process_assets.py` writes the
game-ready versions to `public/processed/` (needs Pillow + ffmpeg). Re-run it whenever `assets/` changes.

## In use (Milestone 1)

| Original | Processed | Used as |
|---|---|---|
| `files2.zip`, `uh-huh.zip`, `oopsie.zip`, `whoopsie-doodle.zip`, `tee-hee.zip`, `nuh-uh-select-idle.zip` | `hero-<id>-fly.png/.json` (half size), `hero-<id>-super.png`, `hero-<id>-select.png/.json` | Flight loops, super poses, Buddy-select standing idles |
| Per-Buddy select / damage / recover clips | `voice-<id>-{select,damage,recover}.mp3` | Select screen, hit reaction, respawn, companion arrival |
| `elon-ground-minion.zip` | `elon-walk.png/.json` | Elon ground enemy |
| `spiderlon-boss.zip` | `spiderlon-boss-idle.png/.json` | Final boss (not used yet) |
| `mimic-1.png` (orange horn) | `mimic-1.png` | Charger enemy |
| `mimic-2.png` (propeller) | `mimic-2.png` | Sine-wave flyer |
| `mimic-3.png` (purple hood) | `mimic-3.png` | Turret (aimed shots) |
| `happy_hills_sky/far/near.png` | `hh-sky/far/near.png` (540px tall) | Parallax layers |
| `happy_hills_dome_landmark.png` | `hh-dome.png` | Buddies' home dome, scrolls past at level start |
| `sun.png` | `sun.png` (320px) | Bouncing sun |
| `files.zip` (mecha-turkey rig) | `turkey-*.png` + `turkey-rig.json` | Boss, animated from the rig pivots |
| `tmpcq1n1jae.png` (collage v2) | `title-{tl,tr,bl,br,c}.png` + `title-panels.json`, `title-bg.png` | Title screen collage panels and blurred backdrop |
| `perfect_dark/pdark.ttf` | `pdark.ttf` | Title screen font (logo, subtitle, prompts) |
| `title-loop.mp3` | `music-title.ogg` / `.mp3` | Title music (loops); same file as the Positive Contact track |
| `axel-f-cover.wav` | `music-happy-hills.ogg` / `.mp3` | Level music (loops) |
| `uh-uh-no.wav` | `voice-uhuhno-taunt.mp3` | Mr. Uh-Uh-No taunt: boss arrival and each phase change |
| `uh-uh-no-buddies-no-win.mp3` | `voice-uhuhno-defeat.mp3` | Boss defeated |

Not used yet: `nuh-uh-standing-transparent.png` (not planned for use), `nuh-uh-flying-hero-pose.png` and
`replicate-prediction-…png` (earlier static flying poses), `preview_parallax.jpg` (reference only).

## Still placeholder (generated shapes in `BootScene`)

- Hero projectiles: star, heart, flower, rubber balls, rainbow beam
- Team pickup orb, Elon web ball, on-screen Super button
- Enemy bullets: pink round (`bullet`), orange gobble-ring bullet (`bullet-ring`)
- Drumstick missile (`drumstick`)
- Hit sparks, explosion rings, hitbox glow dot, shield pips

## Wanted

- **SFX** (designed, not voice): star shot, heart shot, ball boing, petal bloom, beam hum, enemy pop, boss hit, drumstick burst, gobble, explosion, shield break, pickup, Positive Vibes Wave.
- **More Nuh-Uh voice clips**: with one clip per situation the no-immediate-repeat rule can't do anything.
  2–4 more hurt clips plus a few pickup/ambience clips would help.
- Level 1 (Blunderbuddies Dome) and later-level art, per `GAME_DESIGN.md`.

## Art notes

- `happy_hills_far.png` has a small purple smudge on the horizon at its left edge; it shows once per tile repeat.
- `happy_hills_sky.png`'s lower gradient band has a faint vertical seam where the tile wraps.
