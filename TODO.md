# To-do

Grouped by milestone, in `GAME_DESIGN.md` order. Tick items off as they land.

## Milestone 1: vertical slice (finish)

- [x] Scaffold: Phaser 4 + TypeScript + Vite + Capacitor
- [x] Nuh-Uh: flight loop, bob/tilt, fake horizontal spin on hits, homing stars
- [x] Happy Hills: parallax layers, dome landmark, bouncing sun, music
- [x] Mimic enemies: sine flyer, charger, turret
- [x] Mecha-turkey boss: 3 phases, Mr. Uh-Uh-No taunt/defeat voice
- [x] Touch (relative drag), keyboard and gamepad controls
- [x] Title screen (Jake's animation, Perfect Dark font, title music)
- [ ] **Elons** (Spiderlon's minions) as ground enemies in Happy Hills. *Waiting on art* (walk/idle image(s)).
      Behaviour: walker + lobber. They walk along the ground, pause and lob aimed shots up at the hero.
      Add as a new `ground` behaviour in `src/data/enemies.ts` (ground line around y = 470).
- [ ] Android APK: install Android Studio, `npx cap add android`, lock landscape, `./gradlew assembleDebug`, test on a phone at 60 fps
- [ ] On-device touch tuning (drag sensitivity, hero size)
- [ ] Pack sprites into texture atlases
- [ ] SFX: star shot, enemy pop, boss hit, drumstick burst, gobble, explosion, shield break
- [ ] Logo: choose Perfect Dark extender style (A plain / B `BLUND@ER` / C `BLUND$ER`)
- [ ] Tuning pass: enemy HP, boss HP (650), wave density

## Milestone 2: all four heroes

- [ ] Flight sheet + super pose + voice clips for **Uh-Huh**, **Whoopsie-Doodle**, **Tee-Hee** (same format as Nuh-Uh's `files2.zip`)
- [ ] Shots: Uh-Huh hearts (wide spread), Whoopsie-Doodle flowers (orbit, absorb, bloom), Tee-Hee rainbow beam
- [ ] Positive Vibes Wave (super): on-screen Super button, X/Space, gamepad face button; super pose swap
- [ ] Hero select screen

## Milestone 3: companions and power-ups

- [ ] **Decide the power-ups** (open questions):
  - Where pickups come from: carrier enemies, timed drops, or random drops?
  - How pickups move (float, drift, bounce off edges?)
  - What each vibe level changes per hero
  - Confirm the companion rules from the design doc (stack to 3, then fire-rate upgrade; a hit knocks one off)
- [ ] Power-up pickups: hearts, stars, flowers, rainbow shards
- [ ] Companions: mini Buddies with Gradius-style trailing follow

## Milestone 4: remaining levels and bosses

- [ ] Level 1: Blunderbuddies Dome + mini-boss (TBD)
- [ ] Level 3: Snow Day + Agent Ice bulldozer tank
- [ ] Level 4: Villain Dome + boss (TBD)
- [ ] Level 5: Space + giant Spiderlons (befriended ending)

## Milestone 5: polish

- [ ] Cutscenes (MP4, skippable, lazy-loaded per level)
- [ ] Voice ambience
- [ ] Ending
- [x] Title screen

## Open questions

- Level 1 mini-boss
- Level 4 boss: boss rush or Spiderlon's first appearance?
- Level 3 and boss music
- Continues
- Local score saving
- Title music and the Level 5 track are the same Positive Contact track. Keep both?

## Asset notes

- `happy_hills_far.png`: small purple smudge on the horizon at the left edge (shows once per repeat)
- `happy_hills_sky.png`: faint seam in the lower band where the tile wraps
- Perfect Dark font: readme credits Brian Kent but states no license
