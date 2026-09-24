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
- [x] **Elons** (Spiderlon's minions): ground walker + lobber in Happy Hills
- [ ] Android APK: install Android Studio, `npx cap add android`, lock landscape, `./gradlew assembleDebug`, test on a phone at 60 fps
- [ ] On-device touch tuning (drag sensitivity, hero size)
- [ ] Pack sprites into texture atlases
- [ ] SFX: star shot, enemy pop, boss hit, drumstick burst, gobble, explosion, shield break
- [ ] Logo: choose Perfect Dark extender style (A plain / B `BLUND@ER` / C `BLUND$ER`)
- [ ] Tuning pass: enemy HP, boss HP (650), wave density

## Milestone 2: all five heroes

- [x] Flight sheets, super poses, select idles and voices for all five Buddies
- [x] Shots: hearts spread, homing stars, bouncing balls, orbiting flowers, rainbow beam (placeholder projectile art)
- [x] Positive Vibes Wave: on-screen button, X/Space, gamepad face buttons; super pose swap
- [x] Vibes meter: fills from kills, boss damage and a slow trickle; +1 Wave per fill (max 3)
- [x] Buddy select (title screen) and results screen with Play again / Choose Buddy
- [ ] Tuning pass on the five weapons (roughly equal DPS; Oopsie and Whoopsie-Doodle weaker vs the boss)

## Milestone 3: companions and power-ups

- [x] Team power-up from carrier enemies; companions with snake trail / V formation, weaker fire, hit absorption, full-team payoff
- [ ] Vibe level power-up (what each level changes per hero) and super-stock pickups
- [ ] Pickup art (team orb is a placeholder)

## Milestone 4: remaining levels and bosses

- [ ] Level 1: Blunderbuddies Dome + mini-boss (TBD)
- [ ] Level 3: Snow Day + Agent Ice bulldozer tank
- [ ] Level 4: Villain Dome + boss (TBD)
- [ ] Level 5: Space + giant Spiderlons (befriended ending). Spiderlon boss idle sheet is already processed (`spiderlon-boss-idle`).

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
