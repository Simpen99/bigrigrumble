# Ideas queued

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
- Ambient occlusion: baked per-vertex AO in `bakeKit` (`KIT_AO`) is in. Only props built as kits get it; board pieces and
  minigame-only meshes (not baked) don't yet.

## Minigame intro camera
- Mario Party style opening for every minigame: start high / tilted down over the whole arena (showing props like Dump Run's dirt piles behind the excavators), then sweep down to the game camera during the ready screen or countdown.

## Minigames picked (to build)
- Done: Hot Load (`hotload`, partmg3).
- **Paint the Lot** (free-for-all or teams, arena): trucks leave a trail in their colour; most of the car park covered wins.
- **Monster Mash** (1v3): the solo truck is a giant monster truck; the others must survive 30 s.
- **Magnet Mike's Crane** (1v3): the solo player works a scrapyard magnet crane and lifts the others out of the arena.
- **Truck Soccer** (2v2 / 4v4, arena): giant tyre ball, ramming physics. Needs a shared ball (host-simulated, like CPU trucks).
- 1v3 / team games need a team-split minigame mode first (Mario Party style: teams from the colour of the space each truck landed on, a "1 vs 3!" reveal, shared payouts).

## Volcano Quarry bridge ideas
- Crumbling bridge: each crossing cracks it; the 4th collapses a section (truck drops to the crater floor, loses a shard); the eruption rebuilds it.
- Lava serpent under the bridge: bubbles warn a round ahead; trucks stopped there get flung off.
- Drawbridge with a lever space on the rim; whoever lowers it takes a fee from crossers that round.
- Conveyors follow the lava cycle: slow at low lava, fast while rising, reversed during the eruption.
- Duel space mid-bridge: two trucks stopped on the bridge play a 1v1 knock-off.
