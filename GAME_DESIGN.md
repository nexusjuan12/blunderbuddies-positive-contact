# Blunderbuddies: Positive Contact

An absurd, over-the-top side-scrolling shmup / cute 'em up in the spirit of Cho Aniki, starring the Blunderbuddies. Non-commercial hobby project. Playable in the browser and installable on Android as a sideloaded APK.

## Pillars

1. **Sincere mechanics, absurd presentation.** The jokes land because the shooting feels good. Tight controls, readable bullets, fair hitboxes.
2. **Positive vibes vs. villain chaos.** Heroes fire hearts, stars, flowers, and rainbows. Villains bring tantrums, bureaucracy, and giant Spiderlons.
3. **Touch-first.** Every system is designed for a phone held in landscape, then adapted for keyboard and gamepad.
4. **Built from Jake's existing assets.** Hero artwork, music covers, video cutscenes, and the Buddies' vocal library.

## Tone and visual language

- Buddies are Teletubbies-inspired: simple-minded, befuddling creatures with toddler-like behavior.
- Heroes appear in their tokusatsu / Voltron-style helmets and capes (existing artwork is the reference).
- Hero-side motifs: hearts, stars, rainbows, flowers, beams of positive vibes.
- **Not the vibe:** literal toddler props (sippy cups, pacifiers, bottles, diapers).
- Villains are the bald versions of the Buddy face, except Spiderlon, who is his own thing.

## Heroes

The player picks one of five Buddies on the Buddy select screen. Heroes fly through levels **Superman-style**, rather than piloting ships.

| Buddy | Main shot | Feel |
|---|---|---|
| Uh-Huh | Hearts: wide spread | Crowd clearing, weaker per hit |
| Nuh-Uh | Stars: homing | Forgiving, good for newer players |
| Oopsie | Rubber balls in his costume colours, fired alternately up and down, bouncing 2–3 times off the top and bottom of the screen with a squash on each bounce | The tricky shot: hits things you're not lined up with |
| Whoopsie-Doodle | Flowers: petals orbit the hero and absorb bullets, then bloom outward as a shockwave | Defensive, rhythmic |
| Tee-Hee | Rainbow beam: continuous piercing laser | High damage, narrow, rewards aim |

**Super (all heroes): Positive Vibes Wave.** A screen-filling burst that damages everything on screen and converts every enemy bullet into floating hearts. The hero swaps to the super pose while it fires. Limited stock (starts at 1, up to 3). A vibes meter fills mostly from destroying enemies and damaging the boss, plus a slow passive trickle; each full meter adds one Wave. Forming the full team also fires a free Wave.

### Buddy select

The title screen doubles as the Buddy select. The collage panels are: Oopsie top-left, Whoopsie-Doodle top-right, Uh-Huh bottom-left, Tee-Hee bottom-right, Nuh-Uh centre.

1. The intro plays (narrator, roll call, logo slam). Tapping during the intro skips to the end state and never selects anything.
2. The prompt reads "Choose your Buddy".
3. First tap on a panel highlights it: the other panels dim, the chosen panel glows, the name and attack icon appear in the bottom prompt slot, and that Buddy's select voice clip plays. Tapping a different panel moves the highlight.
4. Second tap on the same panel confirms: the standing idle zooms to fill the screen, then the level starts.

After a stage clear or game over, the results screen offers "Play again" (same Buddy) or "Choose Buddy".

### Flight

- Default flight is a Superman pose: a looping flight animation (sprite sheet, cape fluttering) with procedural motion in code: a gentle bob and a tilt up or down following vertical movement.
- A fast fake horizontal spin plays when the hero takes damage or picks up a power-up.
- A separate spread-eagle super pose swaps in for the Positive Vibes Wave.
- The hitbox is a small fixed circle at the hero's chest (from the sheet's JSON) and never rotates. It is shown as a glowing dot when the player is focusing or moving slowly.

### Companions (the team power-up)

- The team power-up adds a random Buddy as a mini companion: never the one you're playing, never one already on the team. Up to four companions, so the full team is all five Buddies. With the team full, further pickups boost everyone's fire rate instead.
- Companions are drawn at about 60% scale, behind the hero, each starting their flight animation on a different frame so capes and bobs don't move in lockstep.
- **Trail while moving:** each companion follows the path the hero took a moment ago (Gradius options), about 10 frames further back per companion, so the team snakes after you and skilled players can aim the tail.
- **V formation when still:** after about half a second of holding still, companions glide into a wedge behind and to either side, then peel back into the trail on the next move, with a smooth ease between the two.
- **Firing:** each companion auto-fires a weaker version of their own attack, so a full team is a mix of hearts, stars, balls, flowers and rainbows.
- **Getting hit:** companions have no hitbox. When the hero is hit, the last companion in line is knocked off with a spin and tumbles off screen, before the shield or lives are touched.
- **Full-team payoff:** when the fifth Buddy joins, a "team formed" moment: a flash, a brief invincibility window and a free Positive Vibes Wave.

## Power-ups

- **Vibe level:** strengthens the main shot (3 levels).
- **Team:** adds a random Buddy companion (see above). Dropped by glowing carrier enemies placed in each level's wave data.
- **Super stock:** +1 Positive Vibes Wave.
- Pickups drop as hearts, stars, flowers, and rainbow shards.

## Audio

- **Music:** Jake's covers and instrumentals (see level table).
- **Buddy voices:** the existing per-character vocal library is finite and can't be regenerated reliably. Use it for damage reactions, pickups, companion arrival, and idle ambience rather than for core attack sounds.
- Randomize voice clip playback pitch slightly (roughly ±1 semitone) and avoid repeating the same clip back-to-back, to stretch the library.
- Attack sounds are designed SFX, not voice.

## Levels

| # | Level | Boss | Music |
|---|---|---|---|
| 1 | Blunderbuddies Dome | Mini-boss TBD | Clint Eastwood (funky bass instrumental cover) |
| 2 | Happy Hills | Mr. Uh-Uh-No in a giant mecha-turkey | Axel F cover |
| 3 | Snow Day (outdoor ice level) | Agent Ice in a bulldozer tank | TBD |
| 4 | Villain Dome | TBD: boss rush or Spiderlon's first appearance | Sabotage cover |
| 5 | Space | Giant Spiderlons (final) | Positive Contact rewrite |

### Bosses

**Mr. Uh-Uh-No, mecha-turkey (Happy Hills).** A nod to Thankful Buddy Day.
- Phase 1: drumstick missiles that arc and burst.
- Phase 2: gobble shockwaves, expanding rings with gaps to slip through.
- Phase 3, tantrum: Mr. Uh-Uh-No pounds the controls, the mech stomps erratically and sprays random bullets. Chaotic but readable.

**Agent Ice, bulldozer tank (Snow Day).** Bureaucratic monotone.
- Freeze ray: a telegraphed beam. If it hits, the hero is locked in an ice block and the player rapid-taps / mashes to break out.
- Snow wall: the bulldozer pushes snow that shrinks the play area from one side.
- Phase announcements in flat monotone ("Phase two. Please take a number.").

**Giant Spiderlons (Space, final).** Size escalation.
- Wave 1: a squad of big Spiderlons.
- Wave 2: one much bigger Spiderlon.
- Wave 3: a Spiderlon so large only part of him fits on screen; the level scrolls across his body and the player destroys weak points.
- Ending: Spiderlon is a childlike anti-villain, so the Buddies befriend him rather than destroy him.

## Cutscenes

- Short, skippable video clips from the existing video pipeline.
- Planned: intro, one before each boss, ending.
- Encoded as MP4 (H.264 + AAC) for browser and Android WebView compatibility, kept small, and lazy-loaded per level so the game starts fast.

## Controls

- **Touch:** drag anywhere to move (relative movement, so the finger never covers the hero). Autofire always on. On-screen button for Super.
- **Keyboard:** arrows/WASD move, Shift for slow/focus movement, X or Space for Super.
- **Gamepad:** stick/D-pad move, face button for Super, shoulder for focus.
- Landscape only.

## Tech

- Phaser (latest stable) + TypeScript + Vite.
- Capacitor to build the Android APK. Distribution by sideloading, not the Play Store.
- Web build can be hosted anywhere static.
- Logical resolution 960×540 (16:9), scaled to fit.
- Target 60 fps on a mid-range Android phone: pooled bullets, texture atlases, no per-frame allocations in hot loops.

## Milestones

1. **Vertical slice:** Nuh-Uh (homing stars is the most forgiving shot to tune first), Happy Hills scrolling background, basic enemy waves, the mecha-turkey fight, touch + keyboard controls, running in browser and as an APK.
2. **All four heroes** with their shots and the Positive Vibes Wave; hero select screen.
3. **Companions and power-ups.**
4. **Remaining levels and bosses.**
5. **Cutscenes, voice ambience, polish, title screen, ending.**

## Open questions

- Level 1 mini-boss.
- Level 4 boss: boss rush or Spiderlon's first appearance?
- Level 3 and boss music.
- Lives vs. health bar; continues.
- Local score saving.
