# SPEC: Truncated Dodecahedron `.dae` Models (Faces + Skeleton)

## 1. Goal

Produce two new Collada (`.dae`) files for a **truncated dodecahedron** that mirror
the structure, conventions, and overall scale of two existing reference files for
a truncated octahedron:

| Role     | Reference file (input)  | New file (output)                    |
|----------|--------------------------|----------------------------------------|
| Faces    | `shape-faces.dae`        | truncated dodecahedron, solid faces    |
| Skeleton | `shape-skeleton.dae`     | truncated dodecahedron, edges as tubes |

The new files should be as close as possible in **format** (XML/Collada
structure, element ordering, metadata conventions) and **size** (physical scale,
bounding box, vertex/triangle density) to their respective reference files —
adjusted only for the change in polyhedron.

## 2. Reference file analysis

Both reference files were exported from **Blender 2.76.0** via its built-in
Collada exporter and share the same scaffolding:

- `<?xml version="1.0" encoding="utf-8"?>`, `COLLADA` root,
  `xmlns="http://www.collada.org/2005/11/COLLADASchema"`, `version="1.4.1"`
- `<asset>` block: `<contributor><author>Blender User</author>
  <authoring_tool>Blender 2.76.0 commit date:2015-11-03, commit time:10:56,
  hash:f337fea</authoring_tool></contributor>`, `<created>`/`<modified>`
  timestamps, `<unit name="meter" meter="1"/>`, `<up_axis>Z_UP</up_axis>`
- Empty `<library_images/>`
- One `<geometry>` inside `<library_geometries>`, containing one `<mesh>`
- Empty `<library_controllers/>`
- One `<visual_scene id="Scene">` in `<library_visual_scenes>` with a single
  `<node>` holding a `<matrix sid="transform">` and one `<instance_geometry>`
- `<scene><instance_visual_scene url="#Scene"/></scene>`

### 2.1 `shape-faces.dae` (truncated octahedron, solid faces)

- One `<source>` for **positions**: 24 vertices (72 floats), one **normals**
  source (33 normals), and one **UV** source `mesh-map-0` (132 texcoord pairs).
- `<polylist count="44">` — every polygon is a triangle (`vcount` is all `3`s).
  A truncated octahedron has 8 hexagon faces + 6 square faces; fan-triangulated
  that is `8×4 + 6×2 = 44` triangles, matching the file exactly.
- Inputs on the polylist: `VERTEX` (offset 0), `NORMAL` (offset 1),
  `TEXCOORD` (offset 2, `set="0"`) — i.e. positions + normals + UVs, per corner.
- Node transform is a **uniform scale matrix**:
  `0.9709648 0 0 0 / 0 0.9709648 0 0 / 0 0 0.9709648 0 / 0 0 0 1`.
- Raw (pre-transform) mesh is the canonical truncated octahedron built from
  permutations of `(0, ±1/3, ±2/3)`-style coordinates: edge length **1/3**,
  circumradius **≈0.5270**. After the `0.9709648` scale is applied, the
  effective circumradius is **≈0.5117** and edge length **≈0.3236**.
- File size: **8,216 bytes**; 70 lines.

### 2.2 `shape-skeleton.dae` (truncated octahedron, edges as a solid "shell")

- This is **not** a wireframe curve/line export. It's a single watertight
  triangle mesh where every edge of the octahedron has been thickened into a
  rounded tube and all tubes are joined into one continuous "shelled" solid
  (consistent with Blender's Skin/Solidify-style workflow, then applied and
  exported as a static mesh).
- One `<source>` for **positions**: 35,037 vertices (105,111 floats) and one
  **normals** source (69,279 normals — no UV source at all).
- `<polylist count="70122">` — again all triangles (`vcount` all `3`s).
  Inputs are only `VERTEX` (offset 0) and `NORMAL` (offset 1); no `TEXCOORD`.
- Node transform is the **identity matrix** — the mesh's own coordinates are
  already at final scale.
- Overall bounding box is `[-0.4960, 0.4960]` × `[-0.4960, 0.4960]` ×
  `[-0.4714, 0.4714]`; circumradius range **≈0.4943–0.5182** — matching the
  same physical scale as the (scaled) faces file above.
- File size: **≈5.84 MB**; 60 (very long) lines — nearly all size lives in
  three giant lines: the positions array, the normals array, and the polylist
  `<p>` index array.
- Vertex/triangle density relative to topology: 36 edges → 35,037 vertices
  (~973 vertices/edge) and 70,122 triangles (~1,948 triangles/edge). This
  density is a function of the tube's bevel-segment/subdivision settings used
  when it was modeled, not a fixed constant — see §5.

## 3. Target geometry: truncated dodecahedron

| Property         | Truncated octahedron (reference) | Truncated dodecahedron (target) |
|-------------------|-----------------------------------|-----------------------------------|
| Vertices           | 24                                 | 60                                 |
| Edges              | 36                                  | 90                                  |
| Faces              | 14 (6 squares + 8 hexagons)         | 32 (20 triangles + 12 decagons)      |
| Triangulated faces | 44 (`6×2 + 8×4`)                    | 116 (`20×1 + 12×8`)                   |

Fan-triangulation rule used by the reference file: an *n*-gon becomes
`n − 2` triangles. Applied to the truncated dodecahedron: triangles
contribute `20 × 1 = 20`, decagons contribute `12 × 8 = 96`, total **116**.

## 4. Requirements for the new files

### 4.1 `truncated-dodecahedron-faces.dae`
- Same Collada scaffolding as §2 (namespace, version, asset block, empty
  `library_images`/`library_controllers`, single geometry/mesh, single
  visual-scene node, `<scene>` block).
- Positions source: 60 vertices (180 floats).
- Normals + UV (`mesh-map-0`) sources generated the same way Blender's
  exporter produces them (flat/per-face-corner shading with a UV unwrap) —
  exact normal/UV counts are exporter-driven and don't need to be hand-matched,
  only the *presence and role* of both sources.
- `<polylist count="116">`, all triangles, with `VERTEX`/`NORMAL`/`TEXCOORD`
  inputs at offsets 0/1/2 in that order.
- Node transform: a uniform scale matrix (same 4×4 layout as the reference),
  chosen so the model's **effective circumradius lands close to ≈0.51–0.52**
  units — i.e. matching the physical size of the reference pair (see §5).
- Geometry/node IDs should follow the same naming pattern as the reference
  (Blender object name + `-mesh` suffix), e.g.
  `Plain_Truncated_Dodecahedron-mesh` / `Plain_Truncated_Dodecahedron`.

### 4.2 `truncated-dodecahedron-skeleton.dae`
- Same scaffolding as §2, single mesh, positions + normals only (no UV
  source, no TEXCOORD input on the polylist) — matching the reference's
  edges-as-tubes approach.
- All-triangle `<polylist>`.
- Node transform: identity matrix (bake the scale into the vertex data, same
  as the reference).
- Same modeling technique as the reference (edges thickened into tubes,
  joined into one continuous shelled solid), applied to the truncated
  dodecahedron's 90 edges instead of the octahedron's 36.
- Target density: scale up from the reference's ~973 vertices/edge and
  ~1,948 triangles/edge proportionally to the edge-length and tube-radius
  actually used, tuning as needed (see §5) rather than hard-locking to
  `973 × 90` — joints where 3 edges meet add extra non-linear geometry, so a
  straight edge-count multiplier will only be approximate.
- Expect a large file, plausibly in the multi-MB range given the ~2.5×
  increase in edge count vs. the reference (90 vs. 36 edges); exact byte size
  is not a hard target, just a sanity check.

## 5. Size-matching guidance

The two reference files agree on scale: after its scale matrix is applied,
`shape-faces.dae` has circumradius ≈0.5117; `shape-skeleton.dae` (identity
matrix) has circumradius range ≈0.4943–0.5182. Both truncated-dodecahedron
outputs should target the **same circumradius (≈0.5)** so the new pair is
internally consistent and comparable in size to the original pair. Concretely:

1. Build the truncated dodecahedron at its standard canonical coordinates.
2. Compute its natural circumradius.
3. Either bake a uniform scale into the skeleton mesh's raw vertex data (as
   the reference skeleton does), or apply an equivalent uniform scale via the
   faces file's node `<matrix>` (as the reference faces file does), so that
   the final circumradius of each output is ≈0.5, matching the reference
   pair's scale.
4. Keep the tube radius (skeleton) and any bevel/segment settings
   proportioned to the new edge length so the "look" (tube thickness relative
   to face size) reads the same as the reference pair.

## 6. Open assumptions to confirm

- **Output filenames**: this spec assumes
  `truncated-dodecahedron-faces.dae` / `truncated-dodecahedron-skeleton.dae`.
  Let me know if you'd rather reuse the exact names `shape-faces.dae` /
  `shape-skeleton.dae` (overwriting the pattern) or something else.
- **UV layout** for the faces file: the reference uses a specific manual/auto
  unwrap; unless you have a preferred layout for the dodecahedron, a
  reasonable automatic unwrap (e.g. Blender's Smart UV Project) will be used.
- **Tube radius / bevel resolution** for the skeleton file isn't derivable
  from first principles — it will be tuned by eye/measurement against the
  reference's ~973 vertices/edge density rather than an exact formula.

## 7. Rendering pipeline integration requirements (`ViewPolyhedron.js`)

This spec originally covered only the `.dae` geometry in isolation. In practice,
`truncated-dodecahedron-faces.dae` is consumed by a specific, somewhat unusual
rendering approach in `ViewPolyhedron.js`, and several real bugs came from the
model not satisfying assumptions that code makes but never validates. Any
future regeneration of these files (or of the reference octahedron pair) needs
to also satisfy the requirements below, not just the geometric ones in §3–§5.

### 7.1 The faces mesh must carry two `<polylist>` material groups

`makeShape()` renders the faces geometry **twice** — once as `_meshOuter`
(20 triangle faces, textured with `truncated-dodecahedron-outer-*.png`) and
once as `_meshInner` (12 decagon faces, textured with
`truncated-dodecahedron-inner-*.png`). The JS code identifies which faces
belong to which mesh **purely by face index range**, derived from `<polylist>`
order in the file:

- The `<mesh>` must contain exactly two `<polylist>` elements, in this order:
  1. `material="outer"` — the 20 triangle faces (`vcount` all `3`, count 20).
  2. `material="inner"` — the 96 decagon fan-triangles (`vcount` all `3`,
     count 96).
- `ViewPolyhedron.js` slices `geometry.faces[0..19]` into `_meshOuter` and
  `geometry.faces[20..115]` into `_meshInner` (see `sliceFaceGeometry()` /
  `onFacesModelLoad()`). If the polylist order or counts change, this index
  split must be updated to match (`OUTER_FACE_COUNT` constant).
- Do **not** rely on a single merged polylist + texture-atlas alpha-masking to
  distinguish faces (i.e. two full-mesh clones, each showing/hiding regions via
  a transparent alpha channel). That was the original (reference-file-derived)
  approach and it silently breaks the moment either atlas's texture-space
  layout happens to overlap the *other* face group's UV footprint — one mesh
  bleeds the wrong atlas's artwork onto the other's faces. Splitting the
  geometry by face index, so each mesh's geometry physically contains only its
  own faces, eliminates this failure mode entirely.

### 7.2 Triangle winding must match the stored per-vertex normal

Three.js determines front/back-facing per triangle from **vertex winding
order** in the `<p>` index list, not from the stored `NORMAL`. If the exporter
(or a manual UV edit / re-export) produces triangles wound opposite to their
normal, front-face culling silently inverts: `_meshOuter` (default
`THREE.FrontSide`) goes invisible, and anything using `THREE.BackSide` shows
its *far* side instead of the near one.

- For every triangle, `cross(v1-v0, v2-v0)` (using the triangle's own vertex
  order) must point in the same direction as its stored `NORMAL` — i.e.
  `dot(cross(...), normal) > 0`.
- Validate this by parsing the `<p>` array directly (don't trust visual
  inspection in Blender, which typically back-face-culls consistently with
  whatever the current viewport shading mode assumes and won't surface a
  mismatch). The reference `shape-faces.dae` is 100% consistent by this check
  — treat that as the pass bar for any regenerated file.
- If a re-export flips this (common after mirror/negative-scale operations,
  or "Recalculate Normals: Inside"), fix by swapping the 2nd/3rd vertex-loop
  entry of every triangle in the `<p>` array — this reverses winding without
  touching vertex/normal/UV data itself.

### 7.3 UV/texture-atlas conventions for the outer (triangle) atlas

`_meshOuter`'s material sets `map`/`alphaMap` from
`truncated-dodecahedron-outer-texture.png` / `-outer-alpha.png`, loaded via
`THREE.TextureLoader`, whose default `flipY = true` means UV `v=1` is the
**top** of the file as viewed normally (opposite of raw image row order).

- The 20 triangle faces' UV must be authored (or verified) against this
  convention — i.e. check where a face's UV actually samples in the real PNG
  (`row = (1 - v) * imageHeight`), not just against the raw file's pixel rows.
- The atlas here is a 5-column × 4-row grid of downward-pointing (apex-down)
  equilateral triangles. UV coordinates must match the *actual measured*
  triangle position within each grid cell (this project's atlas has the
  triangle sitting asymmetrically high in its cell — top edge at 15.625% of
  cell height, apex at 66.8% — not centered), not an assumed/idealized
  centered placement. A same-orientation-but-wrong-padding UV will look
  "upside down and not quite fitting" even though rotation is technically
  correct — verify by overlaying the UV triangle on the actual atlas pixels,
  not by eye.
- The 12 decagon faces (inner atlas) use a fan unwrap from a single hub vertex
  per face, identical UV across all 12 faces, and must independently satisfy
  the same flipY=true convention against `truncated-dodecahedron-inner-*.png`'s
  own (differently laid out) grid.
- Per §7.1, the outer and inner atlases' opaque regions no longer need to
  avoid each other's UV footprint (each mesh only samples its own atlas), but
  keep them non-overlapping anyway as a defense-in-depth measure.

### 7.4 `_meshInner` must render its near (outward-facing) side

`_meshInner`'s material uses `side: THREE.FrontSide` (not `BackSide`) so the
decagon faces show their true outer surface. `BackSide` was inherited from the
reference octahedron's shader setup, but combined with correct winding (§7.2)
it renders the far/interior-facing side of the mesh instead — decagons would
appear to face "inward." Keep both meshes on `FrontSide` unless the winding
convention changes.

### 7.5 `FACE_ANGLES` in `ViewPolyhedron.js` is a coupled, hand-maintained artifact

`ViewPolyhedron.js` hard-codes a `FACE_ANGLES` array (one entry per decagon
face: a normal vector + a texture-roll `turn` fraction) used to snap the shape
to a face-on orientation. This is **not derived at runtime** from the model —
it must be manually recomputed whenever the faces model's decagon geometry
changes:

- Extract the 12 decagon face normals from the `.dae` (group triangles by
  fan/normal, the 12 groups of 8 triangles each).
  Apply the same Z-up → Y-up axis conversion `ColladaLoader.js` performs at
  load time (`convertUpAxis: true`, `up_axis: Z_UP` → three.js `Y` up):
  `(x, y, z)_collada → (x, z, -y)_threejs`. Use the converted vectors as
  `FACE_ANGLES[i].norm`.
- The `turn` value is a visual roll offset with no closed-form derivation from
  geometry in this rendering setup — it requires visual tuning per face in a
  running build (spin to each face and check it doesn't look tilted/upside
  down at rest). Default to `0` and adjust by eye.

## 8. Acceptance checklist

- [ ] Both new files open cleanly and validate as Collada 1.4.1 XML.
- [ ] Faces file: 60 vertices, 116 triangles, has UV source, uniform scale
      node matrix, circumradius ≈0.5.
- [ ] Faces file has exactly two `<polylist>`s, `material="outer"` (20 tris)
      then `material="inner"` (96 tris), matching `OUTER_FACE_COUNT` in
      `ViewPolyhedron.js` (§7.1).
- [ ] Every triangle's winding matches its stored normal
      (`dot(cross(v1-v0, v2-v0), normal) > 0` for all 116 triangles) (§7.2).
- [ ] Outer-atlas UV for the 20 triangle faces verified against the actual
      atlas PNG pixels (not assumed padding), under `flipY=true` (§7.3).
- [ ] Skeleton file: single watertight triangle mesh, no UV source, identity
      node matrix, circumradius ≈0.5, density comparable (scaled for edge
      count) to the reference.
- [ ] Both files reuse the reference's asset/contributor/unit/up-axis
      conventions.
- [ ] Visual comparison in Blender: dodecahedron faces/skeleton pair reads at
      the same physical scale, proportion, and tube thickness as the
      reference octahedron pair.
- [ ] `FACE_ANGLES` in `ViewPolyhedron.js` regenerated from the current
      faces model's decagon normals (§7.5), and `turn` values re-checked
      visually.
- [ ] Rendered in-app: all 12 decagon faces show their outer texture with no
      triangle-atlas bleed-through, all 20 triangle faces show their artwork
      right-side up and flush with their edges, decagons render outward
      (not inside-out).
