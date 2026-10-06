# Ideas queued

- Mixie has no truck special (Concrete Pour dropped: too close to Concrete Crumble). Dumpy's is Dump Run, Zoomer's is Drift King.
- Coin Rush is on hold (too similar to Cone Smash); proposed theme: casino rooftop car park at dusk.
- Concrete Crumble (`tiles`) CPUs still fall early; bot pathing could be smarter.
- Possibly swap to real Kenney assets (CC0) now that files can live in the project.

## Minigame visual upgrade (one PR each)
1. Lane races (Drag Race, Green Light, Rush Hour, Ramp Jump, Crate Drop): done, shared `partscene.js`.
2. Arenas: Cone Smash, Fire Brigade, Rock Fall: done.
3. Coin Rush retheme (casino rooftop car park at dusk).
4. Touch-ups: Dump Run and the rest.
5. Detailed models (partmodels.js kits) instead of plain boxes: houses and traffic cars done (Rush Hour); next candidates: Green Light city blocks and shop fronts, Fire Brigade shops and fire station, Coin Rush / Cone Smash buildings, Crate Drop containers and ship.

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
