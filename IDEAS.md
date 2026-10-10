# Ideas queued

## NEXT: in-world feedback pass (agreed 2026-10-10, start in a new session)
The rule is in STYLE.md "In-game feedback and text (TV first)". Build on branch `mg-rework` (PR #39, stacked on
PR #38; check with `gh pr list` whether they are merged and branch from main if so). One PR, test link first.

How messages work today: every game's text goes through ONE centre banner `#m3msg` (part4a, the HUD update near
`lsMsg` / `dropMsg`): `def.prompt(W, me)`, `def.donePrompt`, `e.msg` + `e.msgT` (most games), plus engine
texts ("Done! Watch the others…", "Knocked out! Watch the others…", ram drops "Hit from behind! You dropped 3
coins", "Waiting for results…"). The TV's shared arena view shows no prompts at all (`W.tv` → ""), and TV split
cards show them small (`#mg.tvshared .tvv .m3msg`), so in-world feedback is the only thing that reaches the TV.

1. **Helpers** (partscene.js or part4a): 
   - `popText(W, x, y, z, text, col)`: a small sprite (cached canvas texture per string, player colour outline),
     floats ~1 m up and fades in ~0.8 s, depthTest off, renderOrder high; a few alive at once, pooled.
   - `inputHint(W, e, label, mode)`: a mini copy of the phone button (same colours/label as `.ram` / `#tapall`)
     floating by the truck, acting out the action: mode "mash" (hammered down repeatedly), "hold" (held down),
     "tap". Hidden when not needed. One per truck, reused.
   - `stamp(W, e, text)`: a short bold stamp over the truck ("OUT", "P2", "1 LIFE"), scales in, holds ~1.2 s.
   - Show rule: on the TV (`W.tv` or `W.split`) for every truck, in phone mode only for `e.isMe`. Remote trucks'
     events need a counter in `e.f` (like Drag's `e.f.sh`) so the TV sees them.
2. **Remove** (obvious or repeats controls): Tow "Tow it to the X garage" / "Hooked! Tow it to…"; Ramp "Tap when
   the power is high!", "Hold = nose up…"; Drift King "Swing the stick to drift!"; Drift Race "Get ready…"; Dump
   Run "Brake near the edge!"; Paint "Drive out of your paint, loop round…", "Get back to your paint…"; Fire
   Brigade "On target! Keep the water on it", "Filling up…"; Hot Load "X has the Hot Load. Keep away!", "You've
   got the Hot Load! Bump someone!", "Next load incoming…", "Too late! Brace yourself!" (the flashing dynamite on
   the roof already says it: add NOTHING); Monster Mash "Tap FIRE for tyres…", "Drive the TNT into the monster!";
   Green Light "GREEN: hold to drive!", "YELLOW: let go!"; engine "Watch the others…".
3. **Input hints**: Monster Mash grabbed by the magnet → mini DASH button being hammered by the truck (replaces
   "Tap DASH to break free!"). Look for other "press X now" moments while converting.
4. **Symbols at the spot**: Fire Brigade empty tank → flashing tank icon over the truck (replaces "Tank empty!
   Refill at a hydrant"); Monster Mash "Too close! The magnet is coming!" → flashing ⚠ on the magnet. Scoop Stack's
   fish ⚠ (`W.warn`) is the reference look.
5. **Pop-ups** (`popText` at the spot): Drag shift grades + start reaction (above the dial); Ramp landing grades,
   "Max power"; Scoop Perfect / +25 / Missed / Served +N / Tower full; Fire Brigade "Fire out! +1" (at the fire);
   Dump Run "In the pit! +N", "Over the edge! −20"; Taco "Wrong ingredient! −5", "Taco done! +N", "Way too much!";
   Crate Drop "Tipped off!"; Drift King "Combo lost"; Tow "Lost the car"; Coin Rush / Cone Smash ram drops → "−3"
   over the truck; Paint "Trail washed away"; Hot Load none.
6. **Stamps** (round-changing): knocked out → "OUT"; finished → place ("P2") or "DONE"; Monster Mash lives
   ("1 LIFE"), KO / win lines; Green Light "Caught on red!"; Drag crash → "CRASH 120 km/h" pop. The centre banner
   keeps only "Results coming up…" / "Waiting for results…".
7. **Intro texts**: trim every `how` to at most two short sentences (longest now: Scoop Stack, Monster Mash, Drift
   Race, Paint the Lot, Cone Smash, Fire Brigade); controls stay in `tvHint` / `tapHint` / `stickHint`.
8. **Test**: `node tools/run.mjs all` (no page errors), `node tools/tvtest.mjs <game>` on a few of each kind
   (arena shared view, lane shared view, station grid), `watch.mjs` where a game's logic changed. Headless runs one
   at a time. The user checks visuals themselves (no screenshot loops). Ask for playtest notes on the PR #39 games
   (Drag Race shifting, Ramp Jump bounces, Scoop Stack catching) too.

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

## Minigames picked (to build)
- Team game ideas: Paint the Lot: Teams (2v2, cheapest), Getaway (1v3: armoured cash truck, reverse Mash), Tow Rope Tug-of-War (2v2), Relay Delivery (2v2), Wrecking Ball (1v3 on the Mud Bowl), Traffic Cop (1v3). 1v2 needs spaceSplit to allow 3 trucks.
- Done: Hot Load (`hotload`, partmg3), Paint the Lot (`paint`, partmg3), team mode + Monster Mash (`mash`, partmg3, 1v3).
- **Magnet Mike's Crane** (1v3): the solo player works a scrapyard magnet crane and lifts the others out of the arena.
- **Truck Soccer** (2v2 / 4v4, arena): giant tyre ball, ramming physics. Needs a shared ball (host-simulated, like CPU trucks).
- Team mode is in (`spaceSplit` in partgame). 2v2 splits play free-for-all until a 2v2 game exists (Truck Soccer). Monster Mash follow-up: boss intro (camera swoop + name card during the countdown). Done: monster versions of all 12 trucks (`buildTruck(i, "monster")`), FIRE/POUND buttons (also on TV controllers), dusk stadium look.

## Volcano Quarry bridge ideas
- Crumbling bridge: each crossing cracks it; the 4th collapses a section (truck drops to the crater floor, loses a shard); the eruption rebuilds it.
- Lava serpent under the bridge: bubbles warn a round ahead; trucks stopped there get flung off.
- Drawbridge with a lever space on the rim; whoever lowers it takes a fee from crossers that round.
- Conveyors follow the lava cycle: slow at low lava, fast while rising, reversed during the eruption.
- Duel space mid-bridge: two trucks stopped on the bridge play a 1v1 knock-off.
