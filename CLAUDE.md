# Big Rig Rumble

A Mario Party-style 3D board game with trucks, built as a single self-contained HTML page.
three.js r128 (UMD from cdnjs) + ConvexHull/ConvexGeometry (jsdelivr), no build tools, no framework.

## Build
- `sh build.sh` concatenates `src/` parts into `dist/index.html` (web version, PeerJS multiplayer, the host's browser is the hub). Deploy: `npx wrangler deploy` (worker `bigrigrumble`, serves `dist/`).
- All parts go into ONE `<script>`: `part1.html` opens it, the `.js` parts continue it, `partend.html` closes it.
- Always edit `src/`, then rebuild. Syntax-check the built script after every build (e.g. `new Function(<script contents>)` in node).
- JS parts are formatted with Prettier (`.prettierrc`: tabs, width 120). Run `prettier --write "src/*.js"` after editing JS. CSS in part1 stays one rule per line.
- PR descriptions start with a test link for the branch build (the user tests on an iPhone): `https://raw.githack.com/Simpen99/bigrigrumble/<branch>/dist/index.html`. Commit the rebuilt `dist/` so the link works.
- `.ignore` keeps Grep out of `dist/` and `src/partart.js` (huge one-line files).

## Source map (src/)
- `part1.html`: head, all CSS, CDN script tags.
- `part2.js`: constants, `TRUCKS` (12 trucks + dice), classic board layout, GFX core (renderer, `M()` materials, `mesh()`, `B()` box, `Cy()` cylinder, lights, ground, showroom, podium, dice, camera, frame loop).
- `partart.js`: artwork as data URIs, generated from `art/` (regenerate, don't hand-edit). `MIKE_ART` = Magnet Mike portrait.
- `parttruck.js`: `buildTruck(i)`, `animTruck`, `chamferBox` / `chamferBoxSq`.
- `partmap.js`: maps as graphs in `MAPS` (`classic`, `junk` Junkyard Jumble, `volcano` Volcano Quarry), board 3D builder, tokens, camera controls, keyboard. Also tile faces, battery factories (`FAC_MODELS`), refineries (`geoRefinery`), `signBoard(txt, {style,...})` for 3D title signs (prefer it over `textSprite`), editor params `ED_PARAMS`.
- `partfx.js`: sky, colour variation, particles (`burst`), synth sound (`sfx`), board effects, stickers (`showEvent` / `showSticker` / `showMike` via the `stickerShow()` queue).
- `partnet.js`: PeerJS adapter imitating the Claude room API.
- `part3.js`: identity, host engine core (`push()` broadcasts `HG`), joining by code / QR `?join=CODE`, views (home, join, lobby, HUD).
- `partgame.js`: rules (turns, dice, shop, upgrades, duels, teams, forks, Magnet Mike), shard economy constants, CPU routing (`botDist`), board UI panels, test mode (`testHTML`), practice menu.
- `part4a.js`: 3D minigame engine (`start3D`, `stepMG`, arena physics, ramming, minigame networking, HUD, ready screen, tap controls), board→minigame transition (`enterMg`), TV-mode minigames (`openTvCtl` / `openTvSplit` / `tvsFrame`), light/effects panel (`wireLightPanel`, `renderMG`).
- `part4b.js`: the 12 original minigames (`MG`). Old ids, new games: `hill` Fire Brigade, `light` Red Light Green Light, `hop` Rush Hour, `park` Dump Run, `tiles` Concrete Crumble, `bumper` Mud Brawl, `rocks` crane slab. Shared `grandstands()` / `crowdMeshes()` / `crowdStep()`, `engineSnd()`.
- `partmg2.js`: truck-special minigames (Scoop Stack, Sort It Out, Taco Tower, Tow Rescue, Drift King `drift`) and Drift Race (`race`, spline `PTS [x,z,y]`). Shared `driftPhys()`; ram tuning `ramK` / `ramSelf` / `ramSlide` / `ramKeep` / `canRam(e)`.
- `partmg3.js`: newer minigames. Hot Load (`hotload`): dynamite passed by touching; rounds/fuses from the seed (`W.R`), the holder's device decides passes via `e.f.gv = [round, seq, key]` (highest seq wins), no passing in the last `LOCK` s.
- `partscene.js`: shared minigame scenery. Cached tiling textures `asphaltTex` / `grassTex` / `pavingTex` / `concreteTex` / `cobbleTex` / `treadTex` (keep them subtle: faint `grit()`, few faint blobs; the user dislikes rough or busy textures) (+ `texBox(w,h,d,tex,tileMetres,x,y,z)`, `groundMat`), `roadWear(..., density, crackOp)` (instanced oil stains and cracks), `kerbs(..., "race"|"city")`, `vergeScatter` (grass tufts, flowers, pebbles), `autoTracks(W, col, y)` = tyre tracks from position changes for games that move trucks themselves (stepMG calls `autoTrkStep`). `laneWorld` uses all of these; `mgEnv` grass uses `grassTex`. Use them when dressing up a minigame; props go within a few metres of the play area so phones see them.
- `partedit.js`: PC map editor (`GFX.mode = "edit"`). Edits `{p, n, o}` live in localStorage `trp_mapedit`; `applyMapEdits(map)` merges `map.bake` + localStorage. To bake the user's "Copy edits" JSON, set `MAPS.<id>.bake = {p, n, o}` in partmap.
- `part4c.js`: click handlers, boot.

## Architecture
- Host-authoritative: host holds `HG` and broadcasts it as presence `game`. Clients send presence `act` (`{t, seq, id, ...}`), handled in `handleAct`. `G` = state being viewed (host: `G === HG`).
- Minigames: each device simulates its own truck; the host simulates CPUs and sends their scores in one `act({t:"mg", bots})`. Defs: `kind` (`arena` | `lane` | `station`), `ctrl` (`stick` | `tap` | `custom`), `dur`, `build/spawn/rules/bot/render/cam/tick/final/prompt/botScore`, custom controls via `ctlHTML()` + `wire()` + `onKey()`. Optional hooks: `phys`, `cam`, `ramLabel` / `ramCd` / `ramReady`, `stop`, `donePrompt`; env flags `bare`, `night`, `storm`, `dusk`, `water:false`, `sun`, `fallY` (read in `mgEnv`).
- Random values that must match across devices: `W.rng()` or a pure function of `W.t`. `Math.random()` only for cosmetics.
- Practice mode: `HG.practice = true`, never broadcast or saved.
- TV mode: `HG.tv = true`, host has no player; body class `tv` on the host, `ctl` on phones. Stick arena games run as one simulation on the TV (`W.tv`); all others run as one world per human on the TV (`mg.tv = "split"`, `TVS`). The background-tab fallback interval in part4c must call `tvsFrame` when `TVS` is set.
- `HG.hold` / `HG.intro` block rolls and items (and make CPUs wait) while a sticker or the intro flyover plays.
- Routes: trucks may take any road at a crossing except straight back (`travelOpts(i, p.from)`). Distances via `routeDist` / `playerDist`.
- Performance: static board parts are merged (`mergeStatic`, tag `userData.st`, skip `userData.dyn`). Board shadows only re-render when `shadowCheck` sees a caster move: add new moving shadow casters there. Phones (`GFX.touch`) use no log depth buffer and a 1024 shadow map.
- Volcano map: lava cycle (`lavaRound`, `eruption`), space types `OB` `SD` `MC` `MR` `GY`, shards → refinery (`n.ref`, `HG.grind`) → dust → battery at the factory (`resolveBuy`). Loose shards `HG.loose`. Map props `dice`, `lava`, `shards`, `rules`, `size`, `camY`.

## Gotchas (don't repeat)
- **Z-fighting**: never put two surfaces within ~0.02 of each other. Decals: `depthWrite:false` + `polygonOffset`. Stripes on bevelled bodies stick out ≥0.025 per side. Things on a tile's top sit above y .50.
- **`.visible` must be a real boolean** (`!!`): three.js only hides on `=== false`.
- **Minigame entity fields**: `e.k` is the player key. Never reuse `k`, `i`, `p`, `sc`, `d`, `al`, `c`, `f` for game data.
- **Never put a `//` comment mid-line**: it comments out the rest of the line.
- `obj.add(x)` returns `obj`, not `x`.
- Tile symbol holes (`symHoles`) must never touch each other.
- Frame-rate independence: use real time (`performance.now()`, physics substeps).
- Reduced motion: infinite CSS animations also need `animation-iteration-count:1`.
- On Windows use node for scripts, not `python`.

## Testing
Headless Chromium + Playwright with `--use-gl=swiftshader`. Route the CDN three.js / ConvexHull / ConvexGeometry URLs to local copies from `npm i three@0.128.0`. Console hooks: `startPractice("taco")`, `W` (minigame world), `HG` (host state).

Backlog ideas live in `IDEAS.md`.
