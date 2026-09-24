# Blunderbuddies: Positive Contact

An absurd, over-the-top side-scrolling shmup in the spirit of Cho Aniki, starring the
**Blunderbuddies** from Jake Hunter's animated series. Non-commercial hobby project.

Built with Phaser 4, TypeScript and Vite; Capacitor for the Android build.

## Play

```
npm install
npm run dev
```

Open the `Local:` address it prints. The `Network:` address works on a phone on the same Wi-Fi (hold it landscape).

**Controls**

- Touch: drag anywhere to move (relative drag). Fire is automatic.
- Keyboard: arrows / WASD to move, Shift for slow movement.
- Gamepad: stick or D-pad to move, shoulder button for slow movement.

**Debug flags** (add to the URL, combine with `&`): `?boss` skip to the boss, `?god` no damage,
`?fps` frame counter, `?hitboxes` show collision circles.

## Build

- `npm run build`: type-check and build the web version into `dist/`
- Android: see `CLAUDE.md` (needs Android Studio / JDK 21)

## Project layout

- `src/scenes/`: one scene per screen or level
- `src/entities/`: hero, enemies, boss, bullets
- `src/data/`: tuning (hero stats, enemies, waves, boss phases, title timing)
- `public/processed/`: game-ready art and audio
- `tools/process_assets.py`: builds `public/processed/` from the original source files, which are not in this repo
- `GAME_DESIGN.md`: the design; `TODO.md`: what's left

## Credits

Characters, art, music and voices are Jake Hunter's (Blunderbuddies). Title font: Perfect Dark by Brian Kent.
