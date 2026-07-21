# Debugging Log: Truncated Dodecahedron Dice Refactor (IP-259)

This is the retrospective, chronological companion to `SPEC.md`. `SPEC.md`
says what the `.dae` models and rendering pipeline *should* satisfy; this
document is the story of what actually broke while getting there, how each
issue was diagnosed, and what fixed it — so the next person (or agent)
touching this code doesn't have to rediscover any of it.

The work replaced an 8-sided truncated-octahedron "dice" (`shape-faces.dae` /
`shape-skeleton.dae`) with a 12-sided truncated dodecahedron
(`truncated-dodecahedron-faces.dae` / `truncated-dodecahedron-skeleton.dae`),
rendered in `App/resources/scripts/artic/views/ViewPolyhedron.js`.

## 1. `FACE_ANGLES` had to be recomputed for the new geometry

`ViewPolyhedron.js` hard-codes a `FACE_ANGLES` array — one entry per face used
for snapping the shape to face-on orientation — that isn't derived at
runtime from the model. Swapping the model meant this array (written for the
old 8-hex-face shape) was stale.

- Extracted the 12 decagon face normals directly from the new
  `truncated-dodecahedron-faces.dae` (grouping the fan-triangulated faces: 8
  triangles share one face normal each).
- Had to replicate `ColladaLoader.js`'s Z-up → Y-up axis conversion
  (`convertUpAxis: true`) by hand: `(x, y, z)_collada → (x, z, -y)_threejs`.
  Verified this conversion formula empirically against the *old*, known-good
  model's `FACE_ANGLES` values before trusting it on the new one.
- The per-face `turn` value (a texture-roll offset) turned out to have no
  closed-form derivation — it's tuned by eye. Left at `0` for all 12 faces.

## 2. Decagon faces only visible from the inside

**Symptom:** after the initial model swap, decagon faces rendered but looked
"inside-out" — visible from the wrong side.

**Root cause:** `_meshInner`'s material used `side: THREE.BackSide`,
inherited from the old octahedron rendering setup. Three.js determines
front/back faces from **triangle winding order**, not the stored normal. Once
winding was correct (see #3), `BackSide` started rendering the mesh's far/
interior-facing side instead of the near one.

**Fix:** changed `_meshInner`'s material to `side: THREE.FrontSide`
(`ViewPolyhedron.js`, `makeShape()`).

## 3. Triangle winding was reversed on the new model

**Symptom:** the 20 triangle faces were invisible entirely (backface-culled).

**Diagnosis:** wrote a script to check, for every triangle, whether
`cross(v1-v0, v2-v0)` (using the file's own vertex order) points the same
direction as the triangle's stored `NORMAL`. Ran this against the *old*
reference `shape-faces.dae` first to confirm the check itself was valid (100%
match there), then against the new dodecahedron file — **100% of the 116
triangles had reversed winding**. This was an artifact of however the model
was exported/re-saved after the UV edits (§4), not something visible by eye
in Blender.

**Fix:** rewrote the `<p>` polylist index arrays in the `.dae`, swapping the
2nd/3rd vertex-loop entry of every triangle (reverses winding without
touching vertex/normal/UV data). Re-verified 0/116 mismatches afterward.

## 4. Triangle texture looked upside-down and didn't fit its outline

**Symptom:** the outer (triangle) texture atlas rendered rotated/offset
relative to the actual triangle faces, even after manually re-flipping UVs in
Blender.

**Diagnosis, in order of what turned out to be wrong:**
1. First assumed a `flipY` texture-loading convention mismatch (three.js's
   `TextureLoader` defaults to `flipY: true`, meaning UV `v=1` is the top of
   the file). Checked this against the *inner* (decagon) atlas UV, which
   turned out to already assume this convention correctly (verified by
   overlaying the UV-mapped fan triangulation directly onto the actual atlas
   PNG pixels — it lined up perfectly). So `flipY` wasn't the outer atlas's
   problem either, once double-checked.
2. Actually mis-read the outer atlas artwork's orientation on first look —
   assumed the triangles pointed "apex up" from a quick glance at the full
   2048×2048 grid image; a pixel-level scan of the alpha channel showed they
   actually point **apex down** (wide edge at top of each cell).
3. Once corrected, the real bug was a **padding/position mismatch**, not
   rotation: the UV data assumed a symmetric/centered triangle placement
   within each of the 5×4 grid cells, but the actual generated atlas has the
   triangle sitting asymmetrically high in its cell (top edge at 15.6% of
   cell height, apex at 66.8%, not centered).

**Fix:** measured the *actual* triangle pixel position in every one of the 20
grid cells directly from `truncated-dodecahedron-outer-alpha.png` (via a
per-cell pixel scan), then rewrote each triangle face's UV coordinates in the
`.dae` to match those measured positions exactly, rather than an assumed
centered layout. Verified by overlaying all 20 corrected UV triangles back
onto the atlas image — all 20 aligned pixel-perfect.

**Lesson:** "looks upside down" and "looks like a rotation/orientation bug"
can actually be a positioning/padding bug that just resembles one. Always
verify UV placement against the actual atlas pixels, not by reasoning about
rotation in the abstract.

## 5. Large triangle-shaped artifacts bled onto the decagon faces

**Symptom:** after fixing #2–#4, large orange triangle shapes appeared
overlaid on top of decagon faces (see `Screenshot 2026-07-17 at 5.16.40 PM`
in conversation history).

**Root cause:** `_meshOuter` and `_meshInner` were both full clones of the
*entire* merged geometry (all 116 triangles — 20 outer + 96 inner), relying
on each atlas's alpha channel being transparent wherever the *other* face
type's UV happened to land. This was the rendering approach inherited from
the old octahedron model. Overlaying the decagon faces' (shared, identical
across all 12 decagons) UV footprint onto the outer atlas showed it directly
overlapped the outer atlas's first triangle grid cell — so `_meshOuter`,
when rendering the decagon-shaped part of its own geometry, sampled and
displayed a chunk of the orange triangle atlas there.

**Fix:** stopped relying on alpha-masking two full clones. Instead, split the
loaded geometry by face-index range so each mesh only *contains* its own
faces: `_meshOuter` gets `geometry.faces[0..19]`, `_meshInner` gets
`geometry.faces[20..115]` (added `sliceFaceGeometry()` helper,
`OUTER_FACE_COUNT` constant in `ViewPolyhedron.js`). This requires the `.dae`
to have exactly two `<polylist>`s in a fixed order (`material="outer"` then
`material="inner"`) — verified this face-index split against the real
`ColladaLoader.js` parse output (not just assumptions from reading the XML),
using a Node + jsdom harness to run the actual vendored loader headlessly.

This eliminates the failure mode entirely regardless of how the two atlases'
UV layouts happen to overlap — see `SPEC.md` §7.1.

## 6. Skeleton model showed only isolated dots, no connecting edge lines

**Symptom:** the white rounded-corner "pips" at each vertex were visible, but
no tube/line geometry connected them (see `Screenshot 2026-07-17 at 7.06.12
PM`; desired look in `Screenshot 2026-07-17 at 7.09.17 PM`).

**Diagnosis:**
- Confirmed the mesh topology was fine on its own terms: extracted all
  92,760 vertices from `truncated-dodecahedron-skeleton.dae` and plotted
  them directly (bypassing the app/renderer entirely) — showed a complete,
  correctly-connected wireframe. Winding was also 100% correct.
- So the geometry was right but something about *rendering* it at that scale
  was broken. Vertex count (92,760) was the standout number: it exceeds
  65,536, the classic limit for 16-bit index buffers. The vendored three.js
  build only upgrades to 32-bit indices if the browser/WebView supports the
  `OES_element_index_uint` extension — inconsistent on the kind of embedded
  mobile WebView this app runs in. Large chunks of a mesh this size can
  silently fail to render while small, self-contained clusters (the 82-
  vertex joint spheres) are far more likely to survive intact — consistent
  with the symptom.
- Confirmed the old, known-working reference skeleton (`shape-skeleton.dae`)
  had 35,037 vertices — comfortably under the limit. The new file had ~2.6×
  that, consistent with naively scaling tube/joint tessellation density up
  proportionally to the edge-count increase (36 → 90 edges) without checking
  against the hard 65,536 ceiling.

**Fix:** regenerated the skeleton mesh procedurally from scratch — a rounded
tube per edge (90) and a rounded sphere per vertex (60), using the exact
vertex positions and edge topology extracted from
`truncated-dodecahedron-faces.dae` (so it lines up with the faces model),
scaled to match the existing `SKELETON_SCALE`/`FACES_SCALE` ratio in the JS.
Result: 16,320 vertices (down from 92,760), 24,000 triangles (down from
182,400), 1.79 MB (down from 12.6 MB). Verified by loading through the real
`ColladaLoader.js` (vertex/face counts as expected), checking all 24,000
triangles for correct winding, and rasterizing it directly to confirm the
visual — matched the reference screenshot.

**Note:** this is a fresh procedural mesh (tubes + spheres), not a re-export
of whatever Blender modeling technique produced the original file — visually
equivalent, but not the file to iterate from if someone wants to hand-tune
bevel smoothness in Blender later.

## 7. Made the outer triangle semi-transparent

Simple follow-up request: added `opacity: 0.5` to `_meshOuter`'s material
(it already had `transparent: true` for the alpha-mask cutout, so this just
required adding the opacity value). Tunable between 0–1.

## 8. Theme-info-card dice sizing — attempted, reverted

Tried increasing the vertical height of the dice's container and the dice's
own rendered size within the "select theme" info card
(`body.home-companion` mode specifically, confirmed active via
`config.auto.json`). Changes touched:
- `App/resources/less/home-companion.less`: `.change-theme` /
  `.theme-expanded` container heights, `#polyhedron` width/height,
  `#wrap-polyhedron` centering margin, and the `#wrap-anims` face-icon
  overlay (scaled proportionally to stay aligned with the larger dice).
- Mirrored the same value changes directly into the compiled
  `App/resources/css/style.css`, since the app loads the compiled CSS, not
  the `.less` source, and a local recompile with the available `less`
  version produced unrelated diffs (different color-function output, an
  unevaluated `px / 2` math expression) versus whatever originally built the
  checked-in CSS.

**This change was reverted** (both files are back to their committed state).
Revisit if the card sizing is still a priority — the specific values tried
were: `#polyhedron` 480×300 → 600×380, `.change-theme` 385px → 480px,
`.theme-expanded` 485px → 580px, all a uniform 25% scale-up. The `#wrap-anims`
overlay scaling in particular was never visually verified live and would
need a fresh look regardless of what numbers are tried next.

## Files touched this session

- `App/resources/scripts/artic/views/ViewPolyhedron.js` — `FACE_ANGLES`,
  `_meshInner` side, geometry-splitting (`sliceFaceGeometry`,
  `OUTER_FACE_COUNT`), outer material opacity.
- `App/resources/models/truncated-dodecahedron-faces.dae` — winding-order
  fix, triangle UV repositioning.
- `App/resources/models/truncated-dodecahedron-skeleton.dae` — full
  procedural regeneration at lower vertex density.
- `App/resources/less/home-companion.less` /
  `App/resources/css/style.css` — dice card sizing (reverted, see #8).

## Validation approach worth reusing

Several of these bugs were only conclusively diagnosed by *loading the real
`.dae` through the actual vendored `ColladaLoader.js`* in a headless Node +
jsdom harness, rather than trusting a hand-rolled XML parser or reasoning
about the file in the abstract. This caught real discrepancies (e.g. the
loader's own axis-conversion behavior, the true face-index ordering after
parsing) that would have been easy to get subtly wrong otherwise. Worth
reaching for this again for any future model or loader changes.

## Open follow-ups

- Theme-info-card dice sizing (§8) — not currently applied, needs a fresh
  attempt with `#wrap-anims` visually verified.
- `FACE_ANGLES[i].turn` values are all `0` — untuned, may look tilted on some
  faces at rest; needs visual spin-through in a running build.
- The regenerated skeleton is procedural, not Blender-authored — fine
  visually, but not something to hand-edit in Blender without regenerating
  from the same script/approach.
