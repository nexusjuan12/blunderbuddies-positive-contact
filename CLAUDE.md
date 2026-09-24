# CLAUDE.md

## Project

A Cho Aniki-style side-scrolling shmup starring the Blunderbuddies, Jake's animated YouTube/TikTok series. Non-commercial hobby project. Must run in the browser and build to an Android APK (sideloaded). Full design lives in `GAME_DESIGN.md`; read it before implementing gameplay features.

## Stack

- Phaser (latest stable), TypeScript (strict), Vite
- Capacitor for Android
- Dev machine: Ubuntu 22.04

Check the installed Phaser version in `package.json` before using an API, and don't mix APIs from different major versions.

## Commands

- `npm run dev` – local dev server (also on your LAN, for testing on a phone)
- `npm run build` – type-check (`tsc`) + production web build into `dist/`
- `npm run preview` – serve the production build
- `python3 tools/process_assets.py` – regenerate `public/processed/` from `assets/` (Pillow + ffmpeg)
- `npx cap sync android` – copy the web build into the Android project (`npm run cap:sync` builds first)
- APK build: via Android Studio or `./gradlew assembleDebug` in `android/` (needs JDK 21 + Android SDK; `android/` not added yet)

Debug URL flags: `?fps` (FPS counter), `?boss` (skip to boss), `?hitboxes` (draw collision circles), `?god` (no damage), `?hero=<nuhuh|uhhuh|oopsie|whoopsie|teehee>` (skip the title), `?team=N` (start with N companions), `?debug` (exposes `window.game` for automated tests).

## Universe rules (important)

- Buddies are Teletubbies-inspired: simple-minded, befuddling, toddler-like in behavior.
- **Buddies never speak real words.** They communicate only through intonations of their own names. Never write dialogue for them. Any on-screen text is UI, not character speech.
- Heroes (five, all playable): **Uh-Huh** (hearts, spread), **Nuh-Uh** (stars, homing), **Oopsie** (bouncing rubber balls), **Whoopsie-Doodle** (flowers, orbiting shield/burst), **Tee-Hee** (rainbow beam).
- Heroes wear tokusatsu / Voltron-style helmets and capes and fly **Superman-style**, not in ships, with a fast fake horizontal spin on hits and power-ups.
- Hero motifs: hearts, stars, rainbows, flowers, positive-vibes beams.
- **Avoid** literal toddler props: no sippy cups, pacifiers, bottles, diapers.
- Villains:
  - **Mr. Uh-Uh-No:** tantruming toddler energy; boss rides a giant mecha-turkey.
  - **Agent Ice:** bureaucratic monotone; boss drives a bulldozer tank with a freeze ray.
  - **Spiderlon:** childlike anti-villain; final boss appears as giant Spiderlons. He gets befriended, not destroyed.
- Tone: absurd and over the top, but the game should play like a real, well-tuned shmup.

## Code conventions

- One Phaser Scene per screen/level under `src/scenes/`.
- Gameplay entities under `src/entities/` (hero, companions, enemies, bosses, bullets).
- Data-driven where practical: enemy waves, boss phases, and hero stats in `src/data/` as typed objects, so tuning doesn't require touching logic.
- Pool all bullets and short-lived effects. No allocations inside `update()` hot paths.
- Hero hitbox is a small fixed circle at the hitbox centre from the flight sheet's JSON (roughly the chest) and **must not rotate or bob** with the sprite.
- Hero flight: a looping flight sprite sheet (Superman pose) with procedural bob, tilt following vertical movement, and a fake horizontal spin (scaleX) on damage / pickups. A separate super pose is used for the Positive Vibes Wave.

## Input

- Touch is the primary target: relative drag-to-move, autofire always on, on-screen Super button.
- Also support keyboard and gamepad. Landscape only.

## Assets

- `assets/` is Jake's. Don't regenerate, overwrite, or re-encode originals; write processed versions to a separate output folder.
- Use placeholder shapes (colored circles/rects) when real art isn't there yet, and list missing assets in `ASSETS_TODO.md`.
- Cutscenes: MP4 (H.264 + AAC), skippable, lazy-loaded per level.
- Buddy voice clips are a finite library that can't be regenerated. Use them for damage, pickups, companion arrival, and ambience only. Randomize pitch slightly and avoid immediate repeats.

## Performance

- Target 60 fps on a mid-range Android phone at 960×540 logical resolution.
- Use texture atlases. Test on-device regularly, not just in desktop Chrome.

## Working with Jake

- Jake makes the creative calls. When a design choice isn't covered in `GAME_DESIGN.md`, propose options and ask rather than deciding silently.
- Keep changes small and playable: after each feature, the game should still run in the browser.
- Follow the milestone order in `GAME_DESIGN.md`.
