#!/usr/bin/env python3
"""
Generate truncated dodecahedron DAE files + texture atlas template images.

UV layout (atlas — each face occupies a unique slot in the texture):
  shape-outer-*:  12 decagonal faces  →  4-col × 3-row grid
  shape-inner-*:  20 triangular faces →  5-col × 4-row grid
"""
import math, itertools, os, struct, zlib
from collections import defaultdict

PHI = (1 + math.sqrt(5)) / 2
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
TIMESTAMP = "2016-03-22T13:09:17"

INNER_COLS, INNER_ROWS = 4, 3   # 12 decagon slots  (inner = decagons)
OUTER_COLS, OUTER_ROWS = 5, 4   # 20 triangle slots (outer = triangles)
IMG_SIZE = 2048

# ─── Math helpers ─────────────────────────────────────────────────────────────

def normalize(v):
    l = math.sqrt(sum(x*x for x in v))
    return tuple(x/l for x in v) if l > 1e-12 else v

def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])

def dot(a, b):
    return sum(x*y for x,y in zip(a,b))

def sub(a, b):
    return tuple(x-y for x,y in zip(a,b))

def add3(a, b):
    return tuple(x+y for x,y in zip(a,b))

def scale3(v, s):
    return tuple(x*s for x in v)

def dist3(a, b):
    return math.sqrt(sum((x-y)**2 for x,y in zip(a,b)))

def fmt(x):
    return f"{x:.7g}"

# ─── Truncated dodecahedron geometry ─────────────────────────────────────────

def gen_vertices():
    verts = []
    seen = set()

    def add(v):
        key = tuple(round(x, 5) for x in v)
        if key not in seen:
            seen.add(key)
            verts.append(v)

    a, b = 1/PHI, 2+PHI
    for s1, s2 in itertools.product([1,-1], [1,-1]):
        add((0.0, s1*a, s2*b)); add((s2*b, 0.0, s1*a)); add((s1*a, s2*b, 0.0))

    a, b, c = 1/PHI, PHI, 2*PHI
    for s1,s2,s3 in itertools.product([1,-1], repeat=3):
        add((s1*a,s2*b,s3*c)); add((s3*c,s1*a,s2*b)); add((s2*b,s3*c,s1*a))

    a, b, c = PHI, 2.0, PHI+1
    for s1,s2,s3 in itertools.product([1,-1], repeat=3):
        add((s1*a,s2*b,s3*c)); add((s3*c,s1*a,s2*b)); add((s2*b,s3*c,s1*a))

    return verts

def find_edges(verts):
    el = 2/PHI
    tol = el * 0.02
    n = len(verts)
    edges = []
    for i in range(n):
        for j in range(i+1, n):
            if abs(dist3(verts[i], verts[j]) - el) < tol:
                edges.append((i, j))
    return edges

def find_faces(verts, edges):
    adj = defaultdict(list)
    for i, j in edges:
        adj[i].append(j); adj[j].append(i)

    def next_vert(prev_i, curr_i):
        out = normalize(verts[curr_i])
        back = normalize(sub(verts[prev_i], verts[curr_i]))
        bp = sub(back, scale3(out, dot(back, out)))
        l = math.sqrt(dot(bp, bp))
        if l < 1e-10:
            bp = (1,0,0) if abs(out[0]) < 0.9 else (0,1,0)
            bp = sub(bp, scale3(out, dot(bp, out)))
            l = math.sqrt(dot(bp, bp))
        bp = scale3(bp, 1.0/l)
        perp = cross(out, bp)
        best_angle, best_nb = 4*math.pi, None
        for nb in adj[curr_i]:
            if nb == prev_i: continue
            e = sub(verts[nb], verts[curr_i])
            ep = sub(e, scale3(out, dot(e, out)))
            l2 = math.sqrt(dot(ep, ep))
            if l2 < 1e-10: continue
            ep = scale3(ep, 1.0/l2)
            angle = math.atan2(dot(ep, perp), max(-1.0, min(1.0, dot(ep, bp))))
            if angle <= 1e-9: angle += 2*math.pi
            if angle < best_angle: best_angle, best_nb = angle, nb
        return best_nb

    visited, faces = set(), []
    for i, j in edges:
        for u, v in [(i,j),(j,i)]:
            if (u,v) in visited: continue
            face = [u]; visited.add((u,v)); prev, curr = u, v
            for _ in range(15):
                face.append(curr)
                nxt = next_vert(prev, curr)
                if nxt is None: break
                visited.add((curr, nxt))
                if nxt == u: break
                prev, curr = curr, nxt
            if len(face) >= 3: faces.append(face)
    return faces

# ─── UV atlas layout ──────────────────────────────────────────────────────────

def atlas_slot(face_idx, ncols):
    col = face_idx % ncols
    row = face_idx // ncols
    return col, row

def atlas_cell_center(face_idx, ncols, nrows):
    col, row = atlas_slot(face_idx, ncols)
    cx = (col + 0.5) / ncols
    # Collada/OpenGL: V=0 at bottom, but image Y=0 at top → flip V so
    # atlas row 0 maps to the top of the image and V near 1.0 (OpenGL top).
    cy = 1.0 - (row + 0.5) / nrows
    return cx, cy

def atlas_radius(ncols, nrows, margin=0.82):
    """Polygon circumradius in UV units, fitting within the cell."""
    return min(0.5/ncols, 0.5/nrows) * margin

def atlas_vertex_uv(face_idx, n_gon, ncols, nrows, vert_idx):
    cx, cy = atlas_cell_center(face_idx, ncols, nrows)
    r = atlas_radius(ncols, nrows)
    ang = 2*math.pi*vert_idx/n_gon - math.pi/2
    return (cx + r*math.cos(ang), cy + r*math.sin(ang))

def atlas_face_corner_uvs(face_idx, ncols, nrows, n_gon, fan_k):
    """UVs for fan triangle k (v0, v_{k+1}, v_{k+2}) of an n-gon."""
    def uv(i):
        return atlas_vertex_uv(face_idx, n_gon, ncols, nrows, i)
    return [uv(0), uv(fan_k+1), uv(fan_k+2)]

# ─── PNG writer ───────────────────────────────────────────────────────────────

def write_png_buf(path, width, height, buf):
    """Write RGBA PNG from flat bytearray (row-major, 4 bytes/pixel)."""
    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    raw = bytearray(height * (1 + width*4))
    for y in range(height):
        raw[y*(1+width*4)] = 0
        rs = y*width*4
        raw[y*(1+width*4)+1 : y*(1+width*4)+1+width*4] = buf[rs:rs+width*4]
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', zlib.compress(bytes(raw), 6)))
        f.write(chunk(b'IEND', b''))

def scanline_fill(buf, width, height, poly_px, rgba):
    """Fill polygon interior using scanline, with slice writes."""
    n = len(poly_px)
    min_y = max(0, int(min(p[1] for p in poly_px)))
    max_y = min(height-1, int(max(p[1] for p in poly_px)))
    pixel = bytes([rgba[0], rgba[1], rgba[2], rgba[3]])
    for y in range(min_y, max_y+1):
        xs = []
        j = n-1
        for i in range(n):
            xi, yi = poly_px[i]; xj, yj = poly_px[j]
            if (yi <= y+0.5 < yj) or (yj <= y+0.5 < yi):
                xs.append(xi + (y+0.5-yi)*(xj-xi)/(yj-yi))
            j = i
        xs.sort()
        for k in range(0, len(xs)-1, 2):
            x0 = max(0, int(math.ceil(xs[k])))
            x1 = min(width, int(xs[k+1]))
            if x1 > x0:
                idx = (y*width+x0)*4
                buf[idx:idx+(x1-x0)*4] = pixel*(x1-x0)

def draw_thick_line(buf, width, height, x0, y0, x1, y1, thick, rgba):
    """Draw a thick line segment with flat bytearray writes."""
    dx, dy = x1-x0, y1-y0
    length = math.sqrt(dx*dx+dy*dy)
    if length < 1: return
    nx, ny = -dy/length, dx/length
    r, g, b, a = rgba
    steps = max(int(length*2), 2)
    for t in range(steps+1):
        cx = x0 + dx*t/steps
        cy = y0 + dy*t/steps
        for w in range(-thick, thick+1):
            px = int(round(cx + nx*w))
            py = int(round(cy + ny*w))
            if 0 <= px < width and 0 <= py < height:
                idx = (py*width+px)*4
                buf[idx]=r; buf[idx+1]=g; buf[idx+2]=b; buf[idx+3]=a

def draw_polygon_on_buf(buf, width, height, poly_px, fill_rgba, outline_rgba, outline_px):
    """Draw filled polygon with outline onto bytearray."""
    scanline_fill(buf, width, height, poly_px, fill_rgba)
    n = len(poly_px)
    for i in range(n):
        x0,y0 = poly_px[i]; x1,y1 = poly_px[(i+1)%n]
        draw_thick_line(buf, width, height, x0, y0, x1, y1, outline_px, outline_rgba)

# ─── Placeholder image generation ─────────────────────────────────────────────

def _make_atlas_png(path, n_faces, n_gon, ncols, nrows, size,
                    bg_rgba, fill_rgba, outline_rgba, outline_px, bleed_px=8):
    """
    bleed_px: expand fill this many pixels beyond the UV polygon boundary.
    Prevents sub-pixel gaps and white nubs at polygon vertices when the
    texture is sampled by the GPU exactly at the UV edge.
    Outline is drawn at the exact UV boundary for artist reference.
    Because atlas_cell_center flips V (row 0 → top of image in OpenGL coords),
    the image is drawn upside-down relative to UV rows so that row 0 in the
    atlas appears at the top of the PNG (matching OpenGL V=1 = top of image).
    """
    buf = bytearray([bg_rgba[0], bg_rgba[1], bg_rgba[2], bg_rgba[3]] * (size*size))
    r_uv_px  = atlas_radius(ncols, nrows) * size
    r_fill_px = r_uv_px + bleed_px

    for fi in range(n_faces):
        cx_uv, cy_uv = atlas_cell_center(fi, ncols, nrows)
        cx_px = cx_uv * size
        # atlas_cell_center flips V so V=1 is at top; convert back to image Y
        # (image Y=0 at top corresponds to V=1 in OpenGL).
        cy_px = (1.0 - cy_uv) * size

        def make_poly(r):
            return [
                (cx_px + r*math.cos(2*math.pi*k/n_gon - math.pi/2),
                 cy_px + r*math.sin(2*math.pi*k/n_gon - math.pi/2))
                for k in range(n_gon)
            ]

        # Fill with bleed so coverage reaches every UV boundary pixel
        scanline_fill(buf, size, size, make_poly(r_fill_px), fill_rgba)
        # Outline drawn at the exact UV polygon edge (artist reference)
        outline_poly = make_poly(r_uv_px)
        n = len(outline_poly)
        for i in range(n):
            x0, y0 = outline_poly[i]
            x1, y1 = outline_poly[(i+1) % n]
            draw_thick_line(buf, size, size, x0, y0, x1, y1, outline_px, outline_rgba)

    write_png_buf(path, size, size, buf)
    print(f"  Written: {path}  ({os.path.getsize(path):,} bytes)")

def generate_placeholder_images(size=IMG_SIZE):
    print("  shape-inner-texture.png  (12 decagonal face slots, 4×3 grid)...")
    _make_atlas_png(
        os.path.join(OUT_DIR, 'shape-inner-texture.png'),
        n_faces=12, n_gon=10, ncols=INNER_COLS, nrows=INNER_ROWS, size=size,
        bg_rgba   =(245, 245, 245, 255),
        fill_rgba =(185, 215, 235, 255),   # pale blue fill
        outline_rgba=(40,  90, 160, 255),  # dark blue outline
        outline_px=5,
    )
    print("  shape-inner-alpha.png ...")
    _make_atlas_png(
        os.path.join(OUT_DIR, 'shape-inner-alpha.png'),
        n_faces=12, n_gon=10, ncols=INNER_COLS, nrows=INNER_ROWS, size=size,
        bg_rgba   =(0,   0,   0,   255),
        fill_rgba =(255, 255, 255, 255),
        outline_rgba=(255,255,255,255),
        outline_px=1,
    )
    print("  shape-outer-texture.png  (20 triangular face slots, 5×4 grid)...")
    _make_atlas_png(
        os.path.join(OUT_DIR, 'shape-outer-texture.png'),
        n_faces=20, n_gon=3, ncols=OUTER_COLS, nrows=OUTER_ROWS, size=size,
        bg_rgba   =(245, 245, 245, 255),
        fill_rgba =(240, 210, 170, 255),   # pale amber fill
        outline_rgba=(160, 80,  10, 255),  # dark amber outline
        outline_px=5,
    )
    print("  shape-outer-alpha.png ...")
    _make_atlas_png(
        os.path.join(OUT_DIR, 'shape-outer-alpha.png'),
        n_faces=20, n_gon=3, ncols=OUTER_COLS, nrows=OUTER_ROWS, size=size,
        bg_rgba   =(0,   0,   0,   255),
        fill_rgba =(255, 255, 255, 255),
        outline_rgba=(255,255,255,255),
        outline_px=1,
    )

# ─── Faces DAE ────────────────────────────────────────────────────────────────

def face_normal(verts, face):
    v0, v1, v2 = verts[face[0]], verts[face[1]], verts[face[2]]
    n = cross(sub(v1,v0), sub(v2,v0))
    centroid = tuple(sum(verts[fi][k] for fi in face)/len(face) for k in range(3))
    if dot(n, centroid) < 0: n = scale3(n, -1)
    return normalize(n)

def _build_polylist(faces, verts, fn_map, uv_list, n_gon, ncols, nrows):
    """Fan-triangulate faces, appending UVs from the atlas layout."""
    p_parts, vcounts = [], []
    for fi, face in enumerate(faces):
        fn = face_normal(verts, face)
        ni = fn_map[tuple(round(x,5) for x in fn)]
        n = len(face)
        for k in range(n-2):
            uvs = atlas_face_corner_uvs(fi, ncols, nrows, n_gon, k)
            for ci, vi in enumerate([face[0], face[k+1], face[k+2]]):
                uv_idx = len(uv_list)
                uv_list.append(uvs[ci])
                p_parts.extend([vi, ni, uv_idx])
            vcounts.append(3)
    return p_parts, vcounts

def _effect_xml(name):
    return f"""\
    <effect id="{name}-effect">
      <profile_COMMON>
        <newparam sid="{name}-tex-surface">
          <surface type="2D"><init_from>img-{name}-texture</init_from></surface>
        </newparam>
        <newparam sid="{name}-tex-sampler">
          <sampler2D><source>{name}-tex-surface</source></sampler2D>
        </newparam>
        <newparam sid="{name}-alpha-surface">
          <surface type="2D"><init_from>img-{name}-alpha</init_from></surface>
        </newparam>
        <newparam sid="{name}-alpha-sampler">
          <sampler2D><source>{name}-alpha-surface</source></sampler2D>
        </newparam>
        <technique sid="common">
          <lambert>
            <diffuse>
              <texture texture="{name}-tex-sampler" texcoord="UVMap"/>
            </diffuse>
            <transparent opaque="A_ONE">
              <texture texture="{name}-alpha-sampler" texcoord="UVMap"/>
            </transparent>
          </lambert>
        </technique>
      </profile_COMMON>
    </effect>"""

def write_faces_dae(verts, faces, path):
    R_raw = math.sqrt(sum(x*x for x in verts[0]))
    pre = 0.527 / R_raw
    sv = [scale3(v, pre) for v in verts]
    node_scale = 0.5 / 0.527

    inner_faces = [f for f in faces if len(f) == 10]   # decagons  → inner atlas
    outer_faces = [f for f in faces if len(f) == 3]    # triangles → outer atlas

    # Unique flat normals
    fn_map, fn_list = {}, []
    for face in faces:
        fn = face_normal(verts, face)
        key = tuple(round(x,5) for x in fn)
        if key not in fn_map:
            fn_map[key] = len(fn_list)
            fn_list.append(fn)

    # Build UV list and per-material polylist indices
    uv_list = []
    inner_p, inner_vc = _build_polylist(inner_faces, verts, fn_map, uv_list,
                                         n_gon=10, ncols=INNER_COLS, nrows=INNER_ROWS)
    outer_p, outer_vc = _build_polylist(outer_faces, verts, fn_map, uv_list,
                                         n_gon=3,  ncols=OUTER_COLS, nrows=OUTER_ROWS)

    pos_arr  = ' '.join(fmt(x) for v in sv for x in v)
    norm_arr = ' '.join(fmt(x) for n in fn_list for x in n)
    uv_arr   = ' '.join(fmt(c) for uv in uv_list for c in uv)
    op_str   = ' '.join(str(x) for x in outer_p)
    ovc_str  = ' '.join(str(x) for x in outer_vc)
    ip_str   = ' '.join(str(x) for x in inner_p)
    ivc_str  = ' '.join(str(x) for x in inner_vc)

    PFX = "Plain_Truncated_Dodecahedron"
    MID = f"{PFX}-mesh"
    ns  = fmt(node_scale)
    nv  = len(sv)

    xml = f"""<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset>
    <contributor>
      <author>Blender User</author>
      <authoring_tool>Blender 2.76.0 commit date:2015-11-03, commit time:10:56, hash:f337fea</authoring_tool>
    </contributor>
    <created>{TIMESTAMP}</created>
    <modified>{TIMESTAMP}</modified>
    <unit name="meter" meter="1"/>
    <up_axis>Z_UP</up_axis>
  </asset>
  <library_images>
    <image id="img-outer-texture" name="shape-outer-texture">
      <init_from>shape-outer-texture.png</init_from>
    </image>
    <image id="img-outer-alpha" name="shape-outer-alpha">
      <init_from>shape-outer-alpha.png</init_from>
    </image>
    <image id="img-inner-texture" name="shape-inner-texture">
      <init_from>shape-inner-texture.png</init_from>
    </image>
    <image id="img-inner-alpha" name="shape-inner-alpha">
      <init_from>shape-inner-alpha.png</init_from>
    </image>
  </library_images>
  <library_effects>
{_effect_xml('outer')}
{_effect_xml('inner')}
  </library_effects>
  <library_materials>
    <material id="outer-material" name="outer">
      <instance_effect url="#outer-effect"/>
    </material>
    <material id="inner-material" name="inner">
      <instance_effect url="#inner-effect"/>
    </material>
  </library_materials>
  <library_geometries>
    <geometry id="{MID}" name="Plain Truncated Dodecahedron">
      <mesh>
        <source id="{MID}-positions">
          <float_array id="{MID}-positions-array" count="{nv*3}">{pos_arr}</float_array>
          <technique_common>
            <accessor source="#{MID}-positions-array" count="{nv}" stride="3">
              <param name="X" type="float"/>
              <param name="Y" type="float"/>
              <param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <source id="{MID}-normals">
          <float_array id="{MID}-normals-array" count="{len(fn_list)*3}">{norm_arr}</float_array>
          <technique_common>
            <accessor source="#{MID}-normals-array" count="{len(fn_list)}" stride="3">
              <param name="X" type="float"/>
              <param name="Y" type="float"/>
              <param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <source id="{MID}-map-0">
          <float_array id="{MID}-map-0-array" count="{len(uv_list)*2}">{uv_arr}</float_array>
          <technique_common>
            <accessor source="#{MID}-map-0-array" count="{len(uv_list)}" stride="2">
              <param name="S" type="float"/>
              <param name="T" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <vertices id="{MID}-vertices">
          <input semantic="POSITION" source="#{MID}-positions"/>
        </vertices>
        <polylist count="{len(outer_vc)}" material="outer">
          <input semantic="VERTEX"   source="#{MID}-vertices" offset="0"/>
          <input semantic="NORMAL"   source="#{MID}-normals"  offset="1"/>
          <input semantic="TEXCOORD" source="#{MID}-map-0"    offset="2" set="0"/>
          <vcount>{ovc_str}</vcount>
          <p>{op_str}</p>
        </polylist>
        <polylist count="{len(inner_vc)}" material="inner">
          <input semantic="VERTEX"   source="#{MID}-vertices" offset="0"/>
          <input semantic="NORMAL"   source="#{MID}-normals"  offset="1"/>
          <input semantic="TEXCOORD" source="#{MID}-map-0"    offset="2" set="0"/>
          <vcount>{ivc_str}</vcount>
          <p>{ip_str}</p>
        </polylist>
      </mesh>
    </geometry>
  </library_geometries>
  <library_controllers/>
  <library_visual_scenes>
    <visual_scene id="Scene" name="Scene">
      <node id="{PFX}" name="{PFX}" type="NODE">
        <matrix sid="transform">{ns} 0 0 0 0 {ns} 0 0 0 0 {ns} 0 0 0 0 1</matrix>
        <instance_geometry url="#{MID}" name="{PFX}">
          <bind_material>
            <technique_common>
              <instance_material symbol="outer" target="#outer-material">
                <bind_vertex_input semantic="UVMap" input_semantic="TEXCOORD" input_set="0"/>
              </instance_material>
              <instance_material symbol="inner" target="#inner-material">
                <bind_vertex_input semantic="UVMap" input_semantic="TEXCOORD" input_set="0"/>
              </instance_material>
            </technique_common>
          </bind_material>
        </instance_geometry>
      </node>
    </visual_scene>
  </library_visual_scenes>
  <scene>
    <instance_visual_scene url="#Scene"/>
  </scene>
</COLLADA>"""

    with open(path, 'w') as f:
        f.write(xml)
    print(f"  {nv} verts, {len(inner_vc)} inner polys (decagons), {len(outer_vc)} outer polys (triangles)")
    print(f"  Scale: {node_scale:.7f}  eff. circumradius: {0.527*node_scale:.4f}")
    print(f"  Written: {path}  ({os.path.getsize(path):,} bytes)")

# ─── Skeleton DAE ─────────────────────────────────────────────────────────────

def tube_mesh(p0, p1, radius, n_circle, n_len):
    d = sub(p1, p0)
    length = math.sqrt(dot(d,d))
    if length < 1e-10: return [], []
    d_hat = scale3(d, 1.0/length)
    ref = (1,0,0) if abs(d_hat[0]) < 0.9 else (0,1,0)
    u_hat = normalize(cross(d_hat, ref))
    v_hat = cross(d_hat, u_hat)
    rings = []
    for seg in range(n_len+1):
        t = seg/n_len
        ctr = add3(scale3(p0,1-t), scale3(p1,t))
        rings.append([
            add3(add3(ctr, scale3(u_hat, radius*math.cos(2*math.pi*k/n_circle))),
                        scale3(v_hat, radius*math.sin(2*math.pi*k/n_circle)))
            for k in range(n_circle)])
    verts = [pt for r in rings for pt in r]
    tris = []
    for seg in range(n_len):
        for k in range(n_circle):
            k1=(k+1)%n_circle
            a=seg*n_circle+k; b=seg*n_circle+k1
            c=(seg+1)*n_circle+k; di=(seg+1)*n_circle+k1
            tris.append((a,c,b)); tris.append((b,c,di))
    return verts, tris

def sphere_mesh(center, radius, n_lat, n_lon):
    verts = [add3(center,(0,0,radius))]
    for i in range(1,n_lat):
        phi=math.pi*i/n_lat; z=math.cos(phi)*radius; r=math.sin(phi)*radius
        for j in range(n_lon):
            theta=2*math.pi*j/n_lon
            verts.append(add3(center,(r*math.cos(theta),r*math.sin(theta),z)))
    south=len(verts); verts.append(add3(center,(0,0,-radius)))
    tris=[]
    for j in range(n_lon): tris.append((0,1+j,1+(j+1)%n_lon))
    for i in range(n_lat-2):
        for j in range(n_lon):
            j1=(j+1)%n_lon
            a=1+i*n_lon+j; b=1+i*n_lon+j1; c=1+(i+1)*n_lon+j; d=1+(i+1)*n_lon+j1
            tris.append((a,c,b)); tris.append((b,c,d))
    base=1+(n_lat-2)*n_lon
    for j in range(n_lon): tris.append((base+j,south,base+(j+1)%n_lon))
    return verts, tris

def compute_smooth_normals(verts, tris):
    normals = [[0.0,0.0,0.0] for _ in verts]
    for i,j,k in tris:
        e1=sub(verts[j],verts[i]); e2=sub(verts[k],verts[i])
        n=cross(e1,e2)
        for vi in (i,j,k):
            normals[vi][0]+=n[0]; normals[vi][1]+=n[1]; normals[vi][2]+=n[2]
    return [normalize(tuple(n)) for n in normals]

def write_skeleton_dae(verts_raw, edges, path):
    R_raw = math.sqrt(sum(x*x for x in verts_raw[0]))
    sc = 0.5/R_raw
    verts = [scale3(v,sc) for v in verts_raw]
    el = dist3(verts[edges[0][0]], verts[edges[0][1]])
    tube_r = el*0.072; sphere_r = tube_r*1.25
    N_CIRCLE,N_LEN,N_LAT,N_LON = 16,60,6,16
    all_verts=[]; all_tris=[]
    def merge(vv,tt):
        off=len(all_verts); all_verts.extend(vv)
        for t in tt: all_tris.append((t[0]+off,t[1]+off,t[2]+off))
    for i,j in edges: merge(*tube_mesh(verts[i],verts[j],tube_r,N_CIRCLE,N_LEN))
    for v in verts: merge(*sphere_mesh(v,sphere_r,N_LAT,N_LON))
    normals=compute_smooth_normals(all_verts,all_tris)
    pos_arr =' '.join(fmt(x) for v in all_verts for x in v)
    norm_arr=' '.join(fmt(x) for n in normals for x in n)
    p_parts=[]; vcounts=[]
    for t in all_tris:
        for vi in t: p_parts.extend([vi,vi])
        vcounts.append(3)
    p_str =' '.join(str(x) for x in p_parts)
    vc_str=' '.join(str(x) for x in vcounts)
    NV=len(all_verts); NT=len(all_tris)
    PFX="Truncated_Dodecahedron_skeleton"; MID=f"{PFX}-mesh"

    xml=f"""<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset>
    <contributor>
      <author>Blender User</author>
      <authoring_tool>Blender 2.76.0 commit date:2015-11-03, commit time:10:56, hash:f337fea</authoring_tool>
    </contributor>
    <created>{TIMESTAMP}</created>
    <modified>{TIMESTAMP}</modified>
    <unit name="meter" meter="1"/>
    <up_axis>Z_UP</up_axis>
  </asset>
  <library_images/>
  <library_geometries>
    <geometry id="{MID}" name="Truncated Dodecahedron skeleton">
      <mesh>
        <source id="{MID}-positions">
          <float_array id="{MID}-positions-array" count="{NV*3}">{pos_arr}</float_array>
          <technique_common>
            <accessor source="#{MID}-positions-array" count="{NV}" stride="3">
              <param name="X" type="float"/>
              <param name="Y" type="float"/>
              <param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <source id="{MID}-normals">
          <float_array id="{MID}-normals-array" count="{NV*3}">{norm_arr}</float_array>
          <technique_common>
            <accessor source="#{MID}-normals-array" count="{NV}" stride="3">
              <param name="X" type="float"/>
              <param name="Y" type="float"/>
              <param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <vertices id="{MID}-vertices">
          <input semantic="POSITION" source="#{MID}-positions"/>
        </vertices>
        <polylist count="{NT}">
          <input semantic="VERTEX" source="#{MID}-vertices" offset="0"/>
          <input semantic="NORMAL" source="#{MID}-normals"  offset="1"/>
          <vcount>{vc_str}</vcount>
          <p>{p_str}</p>
        </polylist>
      </mesh>
    </geometry>
  </library_geometries>
  <library_controllers/>
  <library_visual_scenes>
    <visual_scene id="Scene" name="Scene">
      <node id="{PFX}" name="{PFX}" type="NODE">
        <matrix sid="transform">1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1</matrix>
        <instance_geometry url="#{MID}" name="{PFX}"/>
      </node>
    </visual_scene>
  </library_visual_scenes>
  <scene>
    <instance_visual_scene url="#Scene"/>
  </scene>
</COLLADA>"""

    with open(path,'w') as f: f.write(xml)
    print(f"  Skeleton: {NV} vertices, {NT} triangles")
    print(f"  Written: {path}  ({os.path.getsize(path):,} bytes)")

# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("Generating geometry...")
    verts = gen_vertices(); assert len(verts) == 60
    edges = find_edges(verts); assert len(edges) == 90
    faces = find_faces(verts, edges)
    sc = {k:sum(1 for f in faces if len(f)==k) for k in set(len(f) for f in faces)}
    assert sc=={10:12,3:20} and sum(len(f)-2 for f in faces)==116
    print(f"  60 verts, 90 edges, 32 faces {sc}, 116 fan-triangles — OK")

    print("\nGenerating texture atlas template images (2048×2048)...")
    generate_placeholder_images()

    print("\nGenerating faces DAE (atlas UV)...")
    write_faces_dae(verts, faces,
        os.path.join(OUT_DIR, 'truncated-dodecahedron-faces.dae'))

    print("\nGenerating skeleton DAE...")
    write_skeleton_dae(verts, edges,
        os.path.join(OUT_DIR, 'truncated-dodecahedron-skeleton.dae'))

    print("\nDone.")
