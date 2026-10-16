# Ideas queued

## In-world feedback pass: done (branch `feedback-pass`, 2026-10-10)
Helpers `fb` / `inputHint` / `iconSprite` in part4a, every game's banner texts converted or dropped, `how` texts trimmed.
Follow-ups: look for more "press X now" moments for `inputHint` (Dump Run's GO once loaded?), playtest the pop-up
sizes on the TV and on phones (`camK` in `fbStep`: size follows the camera distance), Drag/Ramp/Scoop playtest notes.
- Drag Race (burnout + mash, PR on `drag-burnout`): maybe a skill twist later, easing off the taps right at each
  automatic shift for a small bonus (the user liked the idea, chose plain automatic for now).

- Mixie has no truck special (Concrete Pour dropped: too close to Concrete Crumble). Dumpy's is Dump Run, Zoomer's is Drift King.
- Coin Rush is on hold (too similar to Cone Smash); proposed theme: casino rooftop car park at dusk.
- Concrete Crumble (`tiles`) CPUs still fall early; bot pathing could be smarter.
- Possibly swap to real Kenney assets (CC0) now that files can live in the project.

## Minigame visual upgrade (one PR each)
1. Lane races (Drag Race, Green Light, Rush Hour, Ramp Jump, Crate Drop): done, shared `partscene.js`.
2. Arenas: Cone Smash, Fire Brigade, Rock Fall: done.
3. Coin Rush retheme (casino rooftop car park at dusk).
4. Touch-ups: done for Dump Run, Concrete Crumble, Mud Brawl, Sort It Out, Taco Tower, Drift King, Drift Race (Tow Rescue, Scoop Stack, Hot Load already had their own textures).
5. Detailed models (partmodels.js kits) instead of plain boxes: houses and traffic cars (Rush Hour), city blocks with shop fronts (Green Light), shops and fire station (Fire Brigade) done; Crate Drop port, Cone Smash yard (containers, office, gatehouse, town skyline) done; next candidate: Coin Rush (with its retheme).

## Lighting upgrade (new look)
- Trial on Cone Smash, Dump Run, Sort It Out via `def.look` (sRGB + ACES, cool fill, RoomEnvironment reflections, emissive-only bloom). Roll out to the other games, the board and the showroom once approved.
- Night games later: 2-4 point / spot lights without shadows (street lamps, headlights, site floodlights) plus fake light cones
  (additive transparent cones, `depthWrite:false`) and emissive lamp heads so the bloom picks them up. No extra shadow-casting lights (phones).
- Ambient occlusion: baked AO textures in `bakeKit` (`KIT_AO`, atlas pages `AO_PG`) are in. Only props built as kits get it;
  trucks (`mergeTruck`), board pieces (`mergeStatic`) and minigame-only meshes don't yet. Same atlas approach would work there.

## Performance (phones)
- Perf panel in practice mode: switches for the floodlight / lamps, beams, bloom, shadows, sprites and resolution, plus live
  fps and draw calls, so the cost of each thing can be measured on the phone itself. Dump Run still runs ~50 fps on an
  iPhone 13 Pro (all other games hold 60 after the draw-call work in PR #30); its floodlight spot light is the main suspect
  but the user wants to keep it.
- three.js upgrade (r128 -> latest) as one planned project: step through versions (r128 -> ~r150 -> ~r160 -> latest) with
  the Migration Guide (three.js wiki) and console deprecation warnings, type-check the plain JS against `@types/three`
  (`tsc --checkJs`) to list renamed / removed APIs, load the ES modules through a small module shim that sets
  `window.THREE` before the game script. Colour management and light units change (intensities ~x pi): add a
  version-compare mode to `tools/scenecheck.mjs` (old vs new render per game) to retune, then the user re-approves each
  game. Most of `lookShaders` can go (sRGB + ACES are built in). Payoff: BatchedMesh (one draw call for many different,
  even moving, objects), later WebGPURenderer (much cheaper draw calls on phones; needs the look shaders and post chain
  rebuilt as node materials). Estimate: 1-2 sessions porting plus the retuning pass.

## PWA (Add to Home Screen)
- Main win: true fullscreen on iPhone (Safari can't fullscreen a page; a home-screen app has no toolbar), app icon, faster
  loads, offline practice / CPU games (online play still needs the PeerJS signalling server).
- Small PR: `manifest.json` (`display: "standalone"`, icons from the art, theme colour), `apple-touch-icon` + meta tags in
  part1, a `sw.js` that caches the page and the CDN scripts (network-first for the page so deploys show up at once),
  `build.sh` copies them to `dist/`. Register the service worker only on GitHub Pages (not raw.githack or the artifact).
- Leave the manifest `orientation` unset: iPhone ignores it and on Android it would lock the whole app (portrait board
  games too). TV controllers already lock landscape on Android at runtime (`tvcLand`); iPhone keeps the rotate overlay.
- iPhone caveats: no install prompt (Share → Add to Home Screen; maybe a hint), storage separate from Safari (identity,
  light panel saves, map edits), `?join=CODE` QR links open in Safari, not the app. Fullscreen draws under the notch:
  `viewport-fit=cover` + `env(safe-area-inset-*)` padding for the HUD. The Hide Toolbar tip already hides itself in
  standalone (`IOS_SAFARI` checks `!navigator.standalone`).

## Minigame intro camera
- Mario Party style opening for every minigame: start high / tilted down over the whole arena (showing props like Dump Run's dirt piles behind the excavators), then sweep down to the game camera during the ready screen or countdown.

## Music
- On the step sequencer in partfx (`SONGS`, `JINGLES`, `musScene`). Done: Monster Mash boss track (anime opening, section per phase), board themes per map (level 2 in the last 3 rounds; Volcano by the lava cycle), jingles (minigame start, dice roll, result win / mid / lose, podium finale).
- Next: minigame tracks that build up (races: faster on the last lap; survival games heavier as trucks drop out), a lobby / menu theme, a looping podium theme after the finale.

## Monster Mash: next ideas
- Boss intro (camera swoop + name card, the jaw snaps), dramatic ending (wheels pop off, boss tips over smoking; boss victory donut).
- Weak spot (glowing rear, TNT from behind = double damage), revive knocked-out teammates from the mud edge.
- Hazards in later phases (stage fire jets in phase 2, mud geysers in phase 3), desperation spin at 1 HP, RC minion trucks in phase 2.

## Minigame reworks and new games (user's list, 2026-10-11)
- **Crate Drop → "build the highest tower"** (strategy, built 2026-10-11 with planck.js physics; Plinko next): no crate limit, only the timer; the tallest
  tower at the end wins; a collapse costs the pieces that fall but you keep building (no knockout). Mixed pieces: crates, wide pallets (start with one on the truck so crates can sit side by side), long beams,
  small boxes (fill gaps), maybe a heavy steel drum (stable once placed) and a light barrel that rolls. The crane no
  longer swings by itself: TV controller like Scoop Stack (slider on the left moves the crane, DROP on the right).
  My notes: height scored at the end (or live tallest), a "next piece" preview on the crane so placing is a plan, a
  small wind gust now and then to test stability; reuse `crateModel` / `plankBox`.
- **Drift Race → kart racer**: chase camera (3rd person), several laps, item boxes (Mario Kart style: boost, oil
  slick, bumper/shell-like homing tyre, shield). My notes: TV split (each player their own view, 2-4 cells) since a
  shared overhead view doesn't work in 3rd person; items synced as events via `e.f` like Drift King's steals; CPUs
  get rubber-banding light.
- **Plinko** (built 2026-10-11, `plinko` in partmg3): one shared board, trucks in plastic balls, 3 drops summed, steer + hop, sliding x3 sign. Ideas left: a power peg / gate a player can trigger, bumpers.
- **Plinko Sabotage** (2026-10-14: each board a full Plinko board at 60% scale; traps on diagonal lines and on pegs too, never the bottom row, no wall-per-row limit; flipper and mine sit on pegs (the mine blows its pegs away), gravity flip replaced reverse. 2026-10-13: boards get the full Plinko layout each round (gates, split, flippers, bumpers, TNT); glue dropped, the x½ gate became a fake x2 decoy. Built 2026-10-12 as `sabo`, branch plinko-sabotage; 2v2 later): every player has their own Plinko board (same base layout from the seed, ~5 slots so 4 fit side by side on the TV). Saboteur ring (A→B→C→D→A, nobody sabotaged twice; 2 players = each other). Each of 3 rounds: 60 s planning (since 2026-10-13 on the 3D board: the phone frames your target's board, drag and lift to place; on the TV everyone's cursor and traps show live and the phone is a trackpad; a trap tray with a coin budget, e.g. 100 coins, traps 20–40; at most one wall per row, a path down must stay open, nothing in the top row; the TV shows ? boards + a timer), then play: traps are hidden on the TV too and pop into view (saboteur's colour) when hit; saboteurs score per trap hit (+ phone buzz); after the round all traps are revealed. Traps: wall between pegs, x0.5 gate, extra flipper, trampoline, stun gate (no steering for a few s), sticky peg, magnet peg, reverse gate (◀ ▶ swapped), slot swap (500 ↔ 50, expensive), portal (up 2–3 rows), ice peg, mini TNT. Free-for-all first; 2v2 later (sabotage the other team, team score summed, teammates see each other's planning).
- **Bomberman** (grid arena): trucks drop dynamite (reuse Hot Load's bundle), destructible crates hide power-ups
  (range, extra bomb, speed); last truck standing. Stick + DROP button; works in one shared TV view.
- **Chaos destruction mode** (user wants: lots of weapons blowing up terrain and enemies, maybe 3rd person; rethinking
  the Worms idea, see the options discussed 2026-10-11). Plinko after Crate Drop, but interactive, not pure RNG.
- **Worms-like** on a destructible 2.5D map (longer than usual, maybe 3-5 min): turns, aim + power, a few weapons,
  wind; terrain as a heightmap / voxel slab that craters. Turn-based fits TV well (everyone watches one shot). Needs
  a bigger build: destructible terrain mesh, projectile sim on the host, turn timer.

## Minigames picked (to build)
- Team game ideas: Paint the Lot: Teams (2v2, cheapest), Getaway (1v3: armoured cash truck, reverse Mash), Tow Rope Tug-of-War (2v2), Relay Delivery (2v2), Wrecking Ball (1v3 on the Mud Bowl), Traffic Cop (1v3). 1v2 needs spaceSplit to allow 3 trucks.
- Done: Hot Load (`hotload`, partmg3), Paint the Lot (`paint`, partmg3), team mode + Monster Mash (`mash`, partmg3, 1v3), Getaway (`getaway`, partmg3, 1v3 highway chase, 2026-10-14).
- **Magnet Mike's Crane** (1v3): the solo player works a scrapyard magnet crane and lifts the others out of the arena.
- **Truck Soccer**: built (`soccer`, partsoccer.js, 2v2, a Rocket League style arena, 2026-10-16). JUMP button added 2026-10-16 (hop, flip in the air, BOOST in the air = aerial). Next ideas: boost pads on the pitch, overtime instead of a draw, 2v2 minigame music.
- Team mode is in (`spaceSplit` in partgame). 2v2 splits now play Truck Soccer (the only 2v2 game so far). Monster Mash follow-up: boss intro (camera swoop + name card during the countdown). Done: monster versions of all 12 trucks (`buildTruck(i, "monster")`), FIRE/POUND buttons (also on TV controllers), dusk stadium look.

## Volcano Quarry bridge ideas
- Crumbling bridge: each crossing cracks it; the 4th collapses a section (truck drops to the crater floor, loses a shard); the eruption rebuilds it.
- Lava serpent under the bridge: bubbles warn a round ahead; trucks stopped there get flung off.
- Drawbridge with a lever space on the rim; whoever lowers it takes a fee from crossers that round.
- Conveyors follow the lava cycle: slow at low lava, fast while rising, reversed during the eruption.
- Duel space mid-bridge: two trucks stopped on the bridge play a 1v1 knock-off.
