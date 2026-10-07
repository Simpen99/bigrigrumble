# Big Rig Rumble tools

Headless helpers (Playwright + Chromium) that run against `dist/index.html`. Build first (`sh build.sh`).
Output images go to `tools/out/` (git-ignored).

```sh
cd tools && npm i            # once: playwright + three@0.128.0 (served instead of the CDN copies)
```

| Command | What it does |
|---|---|
| `node rig.mjs <models>` | Renders each model from front, back, side and 3/4 above, one row per model -> `out/rig.png` |
| `node check.mjs <models>` | Automatic model checks (z-fighting, overhanging panels, floating parts, buried parts); problem parts painted magenta -> `out/check.png`. Exit code 1 if anything is found |
| `node sheet.mjs <game ids>\|all [--landscape] [--t 5]` | Screenshots minigames at iPhone size, `t` seconds in, as one contact sheet -> `out/sheet.png` |
| `node scenecheck.mjs <game ids>\|all` | Renders one frozen frame with the merged scenery (`mergeScene`) and again with the originals, and compares the pixels |
| `node kitcheck.mjs` | Bakes every kit with and without the shared neutral materials and checks every vertex still matches |
| `node mergecheck.mjs` | Builds every truck with and without `mergeTruck` and checks every vertex still matches (position, colour, finish); look for non-zero `unmatched` |
| `node run.mjs <game ids>\|all` | Plays minigames to the end with CPUs and reports time, page errors and merged scenery the game still changed (NOT STATIC). Exit code 1 on any of them |

`<models>` are presets (`cars`, `taxi`, `houses`, `buildings`, `trucks`) or JS expressions evaluated in the game page that return a
`THREE.Object3D`, e.g. `'carModel("van", "#E5484D")'` or `'houseModel(2)'`. Models are expected to face -z; wrap ones
that face +x in `faceZ(...)` (the `trucks` preset does) and ones that face +z in `turn(...)` (`houses`, `buildings`).

Options: `--out name.png` for rig/check/sheet. Set `CHROMIUM=/path/to/chrome` if Playwright's own browser is not installed.
