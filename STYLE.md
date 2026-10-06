# Big Rig Rumble art style

The look we aim for: modern stylised low-poly, like **Lonely Mountains: Downhill**, **Islanders** and **Lara Croft GO**
(also liked: Poly Skies, Impossible Pizza Delivery, Risk of Rain 2, and Pummel Party for the party-game feel; add
screenshots to `art/ref/` to pin them down).
A tidy diorama: chunky faceted shapes, clean flat colour, soft warm light with cool shadows, and depth from haze.
From Risk of Rain 2: every scene has its own colour-graded mood (fog colour, sky and light tint set together).
From Pummel Party: bright, toy-like and cheerful; shapes a bit oversized and friendly, never grim.

## Shapes
- **Silhouette first.** Every prop must read from the game camera (usually 40-60 degrees above, phone size). Exaggerate
  the one feature that identifies it: the trigger on a spray bottle, the curve of a banana, the jaw of a spanner.
  Lay long things on their side so the camera sees their outline, not their end.
- **Chunky, few parts, faceted.** Flat shading (`M()` does it). Cylinders and lathes 6-12 sides, spheres as
  icosahedrons. Round enough to read round, never smooth.
- **Detail is geometry, not texture.** Trim, bands, frames, ridges and lips that stick out (>= 0.025) give the
  detail; no painted-on noise. Real detail is cheap: `bakeKit` / `placeKits`.
- **No hair-thin parts.** At truck scale nothing thinner than ~0.04; drop details that would be under a pixel.
- Soft bevels only on big blocks (`chamferBox`); small models stay crisp boxes and prisms.
- Don't default to the simplest shape: a box is never a building, a ball is never an apple.

## Colour
- **One harmonious palette per scene**: 2-3 main hues, one accent (often the player colours), muted grounds so trucks pop.
- Clean flat colour per part; variation comes from `varyColors` (per-vertex tint) and large soft patches, never grit.
- Avoid pure black and white: darkest ~`#23272F`, lightest ~`#F4F6F9`.
- Ground textures stay faint (`partscene.js`): the user dislikes rough or busy surfaces.
- Warm lit sides, cool shadow sides (a bluish sky fill, a warm sun).

## Light and atmosphere
- Low-ish warm sun (35-50 degrees up) with long soft shadows; a cool hemisphere fill.
- Soft occlusion where things meet the ground or each other (contact shadows under every prop; AO where affordable).
- Distance haze tinted to the sky colour so backgrounds fade into layered silhouettes.
- Glow (bloom) only on things that emit light: lamps, signs, neon, lava.

## Composition
- The play area is a diorama: props framing its edges within a few metres (phones see them), simpler and
  hazier layers further out.
- Every scene gets a theme told by its props (a recycling plant, a quarry, a port), not just a coloured floor.
