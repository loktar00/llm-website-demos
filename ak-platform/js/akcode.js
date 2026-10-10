// A fully code-modeled AK-47 (milled Type 3 receiver), to real dimensions. Proportions were measured
// from the reference photo (0.631 mm/px, butt to muzzle nut = 870 mm). Rifle space: +X muzzle,
// +Y up, +Z the rifle's right side, bore on y = 0, units authored in mm.
// Textures are tileable images generated on ComfyUI (Krea2) with normal and roughness maps derived
// from them; UVs are in metres so every part has the same texel density.
import * as THREE from 'three';

const mm = 0.001;
const TEX = {};
const texLoader = new THREE.TextureLoader();
function tex(name, srgb) {
  const key = name + (srgb ? ':s' : '');
  if (!TEX[key]) {
    const t = texLoader.load((window.__ASSET || './') + 'tex/' + name + '.webp');
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    TEX[key] = t;
  }
  return TEX[key];
}
// tile: metres covered by one texture repeat
function pbr(name, { tile = 0.1, color = 0xffffff, metal = 0, rough = 1, normal = 0.6, clearcoat = 0, ccRough = 0.3, envI = 1 } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    map: tex(name + '_albedo', true), normalMap: tex(name + '_normal'), roughnessMap: tex(name + '_rough'),
    color, metalness: metal, roughness: rough, clearcoat, clearcoatRoughness: ccRough, envMapIntensity: envI,
  });
  m.normalScale.set(normal, normal);
  // UVs are authored in metres: one repeat of each texture covers `tile` metres (set on the shared texture)
  for (const k of ['map', 'normalMap', 'roughnessMap']) m[k].repeat.set(1 / tile, 1 / tile);
  return clampBloom(m);
}
// varnish and polished steel can mirror the studio's HDR strip lights; keep surfaces below the bloom threshold
function clampBloom(m) {
  m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `outgoingLight = min(outgoingLight, vec3(1.5));
    #include <opaque_fragment>`); };
  m.customProgramCacheKey = () => 'akcode-clamp';
  return m;
}
let MAT = null;
function materials() {
  if (MAT) return MAT;
  MAT = {
    wood: pbr('walnut', { tile: 0.085, color: 0xf0c0a0, metal: 0, rough: 0.85, normal: 0.18, clearcoat: 1.0, ccRough: 0.12 }),
    blued: pbr('blued', { tile: 0.09, color: 0xc9d2e0, metal: 0.85, rough: 0.68, normal: 0.12, clearcoat: 0.25, ccRough: 0.35 }),
    park: pbr('park', { tile: 0.05, color: 0xd0d0d0, metal: 0.8, rough: 1, normal: 0.2 }),
    bright: pbr('park', { tile: 0.05, color: 0xf2f2f2, metal: 1, rough: 0.6, normal: 0.12 }),     // in-the-white carrier and bolt
    mag: pbr('magsteel', { tile: 0.09, color: 0xd0d0d0, metal: 0.75, rough: 0.95, normal: 0.15 }),
    dark: clampBloom(new THREE.MeshPhysicalMaterial({ color: 0x24262a, metalness: 0.9, roughness: 0.42 })),
    hole: new THREE.MeshBasicMaterial({ color: 0x0b0b0c }),
  };
  return MAT;
}

/* ---------- geometry helpers (all return BufferGeometry in metres with metre-scaled UVs) ---------- */
const V2 = (x, y) => new THREE.Vector2(x * mm, y * mm);
function shape(pts, holes = []) {
  const s = new THREE.Shape(pts.map(p => V2(p[0], p[1])));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(p => V2(p[0], p[1]))));
  return s;
}
// side-profile (x, y) shape extruded across z from z0 to z1 (mm), with an optional bevel
function sideExtrude(pts, z0, z1, bevel = 0, holes = [], curveSegs = 12) {
  const depth = (z1 - z0) - 2 * bevel;
  const g = new THREE.ExtrudeGeometry(shape(pts, holes), { depth: Math.max(0.0001, depth * mm), bevelEnabled: bevel > 0, bevelThickness: bevel * mm, bevelSize: bevel * mm, bevelSegments: bevel > 0 ? 3 : 0, curveSegments: curveSegs });
  g.translate(0, 0, (z0 + bevel) * mm);
  return g;
}
// cross-section (z, y) shape extruded along x from x0 to x1 (mm)
function axialExtrude(pts, x0, x1, holes = [], bevel = 0) {
  const depth = (x1 - x0) - 2 * bevel;
  const g = new THREE.ExtrudeGeometry(shape(pts, holes), { depth: Math.max(0.0001, depth * mm), bevelEnabled: bevel > 0, bevelThickness: bevel * mm, bevelSize: bevel * mm, bevelSegments: bevel > 0 ? 3 : 0, curveSegments: 24 });
  // shape plane (u = z, v = y), extrusion along +Z -> rotate so extrusion runs along +X and u maps to +Z
  g.rotateY(-Math.PI / 2); g.scale(-1, 1, 1); g.translate((x0 + bevel) * mm, 0, 0);
  fixWinding(g);
  return g;
}
// a mirror flips triangle winding; restore it so front faces point outward (the AO pass renders front faces)
function fixWinding(g) {
  const idx = g.index;
  if (idx) { const a = idx.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } idx.needsUpdate = true; }
  else {
    for (const name of Object.keys(g.attributes)) {
      const at = g.attributes[name], n = at.itemSize, arr = at.array;
      for (let i = 0; i < at.count; i += 3) for (let k = 0; k < n; k++) { const t = arr[(i + 1) * n + k]; arr[(i + 1) * n + k] = arr[(i + 2) * n + k]; arr[(i + 2) * n + k] = t; }
      at.needsUpdate = true;
    }
  }
  g.computeVertexNormals();
}
// cylinder along +X between x0 and x1 at (y, z), UVs unwrapped around and along it in metres
function cylX(r, x0, x1, y = 0, z = 0, seg = 28, r1 = null, open = false) {
  const len = (x1 - x0) * mm, ra = r * mm, rb = (r1 ?? r) * mm;
  const g = new THREE.CylinderGeometry(rb, ra, len, seg, 1, open);
  const uv = g.attributes.uv, circ = 2 * Math.PI * Math.max(ra, rb);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * len);
  g.rotateZ(-Math.PI / 2); g.translate((x0 + x1) / 2 * mm, y * mm, z * mm);
  return g;
}
// flip an index if most normals point inward
function orientOutward(g) {
  g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3()), p = g.attributes.position, n = g.attributes.normal;
  let s = 0; for (let i = 0; i < p.count; i += 7) s += (p.getX(i) - c.x) * n.getX(i) + (p.getY(i) - c.y) * n.getY(i) + (p.getZ(i) - c.z) * n.getZ(i);
  if (s < 0) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } g.index.needsUpdate = true; g.computeVertexNormals(); }
  return g;
}
function swapUV(g) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i)); return g; }
function mesh(g, m) { const o = new THREE.Mesh(g, m); o.layers.enable(1); return o; }
// round a rectangle's corners into a point list
function roundRect(x0, y0, x1, y1, r, n = 5) {
  const pts = [], c = [[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]];
  for (const [cx, cy, a0] of c) for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI / 2) * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
}
const circlePts = (cx, cy, r, n = 20) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(-i / n * 2 * Math.PI), cy + r * Math.sin(-i / n * 2 * Math.PI)]);
// taper an extruded part's thickness (z) as a function of x: f(x mm) -> scale
function taperZ(g, f, zc = 0) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / mm, z = p.getZ(i); p.setZ(i, zc * mm + (z - zc * mm) * f(x)); } g.computeVertexNormals(); return g; }

/* ---------- the parts ---------- */
const R = { rear: -204, front: 63, wallZ: 16, wallT: 2.4, top: 12, floor: -28, bottom: -41 };

function receiverGroup(M) {
  const g = new THREE.Group();
  // side walls: outer skin with the Type 3 lightening cut, inner skin solid; the right wall has the ejection port and handle slot
  const wall = [[R.rear, R.bottom + 2], [R.front, R.bottom + 2], [R.front, R.top], [R.rear + 3, R.top], [R.rear, R.top - 3]];
  const lightCut = [[-52, -24], [16, -24], [16, -9], [-52, -9]];
  const portWall = [[R.rear, R.bottom + 2], [R.front, R.bottom + 2], [R.front, R.top], [37, R.top], [37, -4], [-40, -4], [-40, 4.2], [-96, 4.2], [-96, R.top], [R.rear + 3, R.top], [R.rear, R.top - 3]];
  // right (z +): inner skin follows the port outline, outer skin adds the lightening cut
  g.add(mesh(sideExtrude(portWall, R.wallZ - R.wallT, R.wallZ - 1.0, 0), M.blued));
  g.add(mesh(sideExtrude(portWall, R.wallZ - 1.0, R.wallZ, 0.35, [lightCut]), M.blued));
  // left (z -)
  g.add(mesh(sideExtrude(wall, -R.wallZ + 1.0, -R.wallZ + R.wallT, 0), M.blued));
  g.add(mesh(sideExtrude(wall, -R.wallZ, -R.wallZ + 1.0, 0.35, [lightCut]), M.blued));
  // bottom with the magazine well
  const bot = [[R.rear, -R.wallZ + 0.5], [R.front, -R.wallZ + 0.5], [R.front, R.wallZ - 0.5], [R.rear, R.wallZ - 0.5]];
  const well = [[-56, -13.6], [17, -13.6], [17, 13.6], [-56, 13.6]];
  const bg = new THREE.ExtrudeGeometry(shape(bot, [well]), { depth: 13 * mm, bevelEnabled: false });
  bg.rotateX(Math.PI / 2); bg.translate(0, (R.floor) * mm, 0);
  g.add(mesh(bg, M.blued));
  // rails along the wall tops (the carrier rides under them)
  for (const s of [1, -1]) g.add(mesh(new THREE.BoxGeometry((R.front - R.rear - 8) * mm, 1.6 * mm, 2.2 * mm).translate((R.rear + R.front + 8) / 2 * mm, (R.top - 2.2) * mm, s * (R.wallZ - R.wallT - 1.0) * mm), M.blued));
  // rear trunnion block with the stock tang
  g.add(mesh(axialExtrude(roundRect(-R.wallZ + 0.3, R.bottom + 2, R.wallZ - 0.3, R.top - 1, 2), R.rear, R.rear + 12), M.blued));
  // front trunnion: bore for the bolt/barrel; solid up to the rails
  const tr = roundRect(-R.wallZ + 0.3, R.bottom + 2, R.wallZ - 0.3, 8, 2);
  g.add(mesh(axialExtrude(tr, 40, R.front, [circlePts(0, 0, 7.4)]), M.blued));
  // pins and rivet heads (milled receivers use pins, not a rivet grid)
  for (const [x, y] of [[-176, -16], [-150, -22], [-122, -30], [-96, -18], [45, -14], [56, -14], [45, -30]]) for (const s of [1, -1]) {
    const pin = new THREE.CylinderGeometry(2.2 * mm, 2.4 * mm, 1.2 * mm, 16); pin.rotateX(Math.PI / 2); pin.translate(x * mm, y * mm, s * (R.wallZ + 0.5) * mm);
    g.add(mesh(pin, M.dark));
  }
  return g;
}

function stockGroup(M) {
  const g = new THREE.Group();
  // side profile measured from the reference: butt top -3, comb hump, wrist dip, tang into the rear trunnion
  const prof = [[-431, -100], [-431, -5], [-426, -2.5], [-330, 0], [-300, 2.5], [-282, 1.5], [-262, -10], [-240, -6], [-214, 0], [-203, 2], [-203, -40], [-215, -44], [-405, -100], [-420, -104], [-428, -103]];
  const sg = sideExtrude(prof, -21, 21, 9);
  taperZ(sg, x => THREE.MathUtils.lerp(0.66, 1.0, THREE.MathUtils.clamp((-x - 210) / 200, 0, 1)));
  g.add(mesh(sg, M.wood));
  // steel buttplate
  const bp = [[-436, -104], [-430, -104], [-430, -2], [-436, -3]];
  g.add(mesh(sideExtrude(bp, -20, 20, 1.5), M.blued));
  // rear sling loop
  const loop = new THREE.TorusGeometry(7 * mm, 1.3 * mm, 8, 20); loop.rotateX(Math.PI / 2 * 0); loop.translate(-383 * mm, -98 * mm, 0);
  g.add(mesh(loop, M.dark));
  return g;
}

function gripGroup(M) {
  const g = new THREE.Group();
  const prof = [[-183, -40], [-126, -40], [-128, -52], [-142, -98], [-148, -128], [-152, -142], [-163, -146], [-192, -145], [-200, -136], [-197, -110], [-186, -60]];
  const gg = sideExtrude(prof, -14, 14, 6.5);
  g.add(mesh(gg, M.wood));
  // trigger guard (a bent steel strip) and trigger
  const path = new THREE.CatmullRomCurve3([[-123, -40], [-120, -52], [-112, -57], [-72, -57], [-64, -50], [-61, -41]].map(p => new THREE.Vector3(p[0] * mm, p[1] * mm, 0)));
  const tg = new THREE.TubeGeometry(path, 40, 2.2 * mm, 8, false);
  g.add(mesh(tg, M.blued));
  const trig = [[-96, -41], [-90, -41], [-92, -52], [-97, -60], [-101, -62], [-100, -56], [-97, -50]];
  g.add(mesh(sideExtrude(trig, -2.5, 2.5, 0.8), M.blued));
  // magazine catch lever behind the well
  const cat = [[-61, -41], [-55, -41], [-55, -64], [-59, -70], [-63, -66], [-61, -50]];
  g.add(mesh(sideExtrude(cat, -5, 5, 1), M.blued));
  // safety/selector lever on the right side
  const sel = [[-146, 6.5], [-140, 9.6], [-40, 3.5], [-34, 6], [-30, -2], [-40, -2.5], [-140, 0]];
  g.add(mesh(sideExtrude(sel, R.wallZ + 0.2, R.wallZ + 1.8, 0.5), M.blued));
  return g;
}

function frontGroup(M) {
  const g = new THREE.Group();
  // barrel, slightly tapered, and the muzzle nut
  g.add(mesh(cylX(7.9, R.front - 2, 330, 0, 0, 32, 7.3), M.blued));
  g.add(mesh(cylX(7.3, 330, 418, 0, 0, 32), M.blued));
  const nut = cylX(8.2, 416, 435, 0, 0, 32); g.add(mesh(nut, M.blued));
  // rear sight block: cross-section with bores for the barrel and the gas piston, sight leaf on top
  const rsb = [[-12, -10], [12, -10], [13, 24], [9, 33], [-9, 33], [-13, 24]];
  g.add(mesh(axialExtrude(rsb, 42, 107, [circlePts(0, 0, 8.0), circlePts(0, 22, 5.6)], 1), M.blued));
  const lever = [[96, 20], [104, 18], [106, 26], [99, 30]];
  g.add(mesh(sideExtrude(lever, 13.0, 15.0, 0.4), M.blued));
  const leaf = [[52, 33], [100, 37], [101, 41], [53, 37.5]];
  g.add(mesh(sideExtrude(leaf, -5, 5, 0.6), M.blued));
  const notch = [[50, 33], [56, 33], [56, 44], [53, 46], [50, 44]];
  g.add(mesh(sideExtrude(notch, -6, 6, 0.6), M.blued));
  // gas block: socket for the gas tube, sloping down onto the barrel; sling loop on the left
  const gb = [[283, -8.5], [321, -8.5], [321, 6], [306, 31], [283, 31.5]];
  g.add(mesh(sideExtrude(gb, -9.5, 9.5, 1.5), M.blued));
  const sl = new THREE.TorusGeometry(6.5 * mm, 1.2 * mm, 8, 20); sl.rotateY(Math.PI / 2); sl.translate(300 * mm, -14 * mm, -10 * mm); g.add(mesh(sl, M.dark));
  // front sight base: ring around the barrel, protective ears, the post, bayonet lug underneath
  const fsb = [[381, -9], [416, -9], [416, 9], [408, 14], [389, 14], [381, 9]];
  g.add(mesh(sideExtrude(fsb, -9, 9, 1.2), M.blued));
  const ear = [[393, 13], [409, 13], [408, 50], [404, 54], [399, 54], [394, 44]];
  for (const s of [1, -1]) g.add(mesh(sideExtrude(ear, s > 0 ? 5 : -7, s > 0 ? 7 : -5, 0.5), M.blued));
  g.add(mesh(cylX(1.2, 399.5, 401.5, 0, 0, 8).rotateZ(0), M.dark));
  const post = new THREE.CylinderGeometry(1.1 * mm, 1.3 * mm, 34 * mm, 10); post.translate(401 * mm, 31 * mm, 0); g.add(mesh(post, M.blued));
  const lug = [[396, -9], [416, -9], [416, -17], [399, -17]];
  g.add(mesh(sideExtrude(lug, -4, 4, 0.8), M.blued));
  // cleaning rod under the barrel, from the lower handguard into the front sight base
  g.add(mesh(cylX(3, 222, 414, -13, 0, 14), M.blued));
  g.add(mesh(cylX(4.2, 404, 414, -13, 0, 14), M.blued));
  // lower handguard: a wooden U around the barrel, deeper at the rear, finger grooves on the sides
  const lh = [[-12, -20.5], [-6, -22], [6, -22], [12, -20.5], [16, -15], [17.5, -6], [17, 4], [13, 9], [9.5, 9], [9.5, -3], [7, -9], [-7, -9], [-9.5, -3], [-9.5, 9], [-13, 9], [-17, 4], [-17.5, -6], [-16, -15]];
  const lg = swapUV(axialExtrude(lh, 66, 220, [], 2.5));
  { const p = lg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / mm, y = p.getY(i) / mm;
      if (y < -12) { const k = THREE.MathUtils.clamp((110 - x) / 40, 0, 1); p.setY(i, (y - 6 * k) * mm); }        // rear swell
      const zz = p.getZ(i) / mm; if (Math.abs(zz) > 15 && y < 0 && y > -16) { const gk = Math.exp(-Math.pow((x - 150) / 9, 2)) + Math.exp(-Math.pow((x - 185) / 9, 2)); p.setZ(i, (zz - Math.sign(zz) * 1.6 * gk) * mm); } }
    lg.computeVertexNormals(); }
  g.add(mesh(lg, M.wood));
  // handguard retainer and front ferrule
  g.add(mesh(axialExtrude(roundRect(-17.5, -21, 17.5, 9.5, 3), 60, 67), M.blued));
  g.add(mesh(axialExtrude(roundRect(-17.5, -21, 17.5, 9.5, 3), 219, 225), M.blued));
  return g;
}

function gasTubeGroup(M) {
  const g = new THREE.Group();
  // gas tube with vent holes at the front, under a wooden upper handguard with ferrules; lock lever at the rear
  g.add(mesh(cylX(9.2, 106, 284, 22, 0, 32, null, true), M.blued));
  for (let i = 0; i < 4; i++) for (const s of [1, -1]) {
    const h = new THREE.CircleGeometry(2.1 * mm, 14); h.rotateY(s > 0 ? 0 : Math.PI); h.translate((232 + i * 13) * mm, 22 * mm, s * 9.25 * mm);
    g.add(mesh(h, M.hole));
  }
  const uh = [[-13.5, 9], [13.5, 9], [15.5, 18], [15, 26], [12.5, 32], [8, 36], [0, 37.6], [-8, 36], [-12.5, 32], [-15, 26], [-15.5, 18]];
  g.add(mesh(swapUV(axialExtrude(uh, 111, 214, [circlePts(0, 22, 9.4)], 2)), M.wood));
  for (const [a, b] of [[107, 111.5], [213, 218]]) g.add(mesh(axialExtrude(roundRect(-15.3, 8.5, 15.3, 37.6, 6), a, b, [circlePts(0, 22, 9.4)]), M.blued));
  return g;
}

function magazineGroup(M) {
  // curved 30-round magazine swept along its centre line; ribs pressed into the sides; floor plate; feed lips
  const g = new THREE.Group();
  const P0 = new THREE.Vector2(-25, -30), P1 = new THREE.Vector2(-18, -120), P2 = new THREE.Vector2(56, -196);   // rear of the top meets the catch
  const at = t => new THREE.Vector2().addScaledVector(P0, (1 - t) * (1 - t)).addScaledVector(P1, 2 * t * (1 - t)).addScaledVector(P2, t * t);
  const tan = t => new THREE.Vector2().addScaledVector(P1.clone().sub(P0), 2 * (1 - t)).addScaledVector(P2.clone().sub(P1), 2 * t).normalize();
  const NS = 60, NR = 32, HZ = 13.5;
  const pos = [], uv = [], idx = [];
  let arc = 0, prev = at(0);
  for (let i = 0; i <= NS; i++) {
    const t = i / NS, c = at(t), tg = tan(t), n = new THREE.Vector2(-tg.y, tg.x);       // n points forward-ish
    if (i) arc += c.distanceTo(prev); prev = c;
    const half = THREE.MathUtils.lerp(29, 26, t);
    // cross-section ring: rounded rectangle (front-back = 2*half along n, width 2*HZ in z)
    const ring = roundRect(-half, -HZ, half, HZ, 3.5, 4);
    for (let j = 0; j <= ring.length; j++) {
      const [a, b] = ring[j % ring.length];
      // pressed ribs: three shallow channels on each side face, following the curve
      let zz = b; if (Math.abs(b) > HZ - 0.5) { const rib = [-16, -4, 8].reduce((s, r0) => s + Math.exp(-Math.pow((a - r0) / 2.2, 2)), 0); zz = b - Math.sign(b) * 1.7 * rib * THREE.MathUtils.smoothstep(t, 0.04, 0.12) * (1 - THREE.MathUtils.smoothstep(t, 0.9, 0.97)); }
      pos.push((c.x + n.x * a) * mm, (c.y + n.y * a) * mm, zz * mm); uv.push(arc * mm, (j / ring.length) * 0.11);
    }
  }
  const W = 20;
  for (let i = 0; i < NS; i++) for (let j = 0; j < W; j++) { const a = i * (W + 1) + j, b = a + W + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const body = new THREE.BufferGeometry();
  body.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); body.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  body.setIndex(idx); body.computeVertexNormals(); orientOutward(body);
  g.add(mesh(body, M.mag));
  // floor plate at the bottom, oriented to the curve's end
  const tE = tan(1), cE = at(1), fp = new THREE.BoxGeometry(62 * mm, 4 * mm, 30 * mm);
  const fpm = mesh(fp, M.mag); fpm.position.set((cE.x - tE.x * 1.5) * mm, (cE.y - tE.y * 1.5) * mm, 0); fpm.rotation.z = Math.atan2(tE.y, tE.x) + Math.PI / 2; g.add(fpm);
  // feed lips / top cap
  const top = new THREE.BoxGeometry(54 * mm, 3 * mm, 22 * mm); const tm = mesh(top, M.mag); tm.position.set(-25 * mm, -29 * mm, 0); tm.rotation.z = Math.atan2(tan(0).y, tan(0).x) + Math.PI / 2; g.add(tm);
  return g;
}

function carrierGroup(M, { rear = -76 } = {}) {
  // bolt carrier (in the white) with the gas piston; it rides under the rails, above the bolt
  const g = new THREE.Group();
  const body = [[-11, 7], [11, 7], [11, 19], [8, 23], [-8, 23], [-11, 19]];
  g.add(mesh(swapUV(axialExtrude(body, rear, 22, [], 1.2)), M.bright));
  const neck = [[-8, 9], [8, 9], [8, 24], [5, 27], [-5, 27], [-8, 24]];
  g.add(mesh(swapUV(axialExtrude(neck, 20, 40, [], 1)), M.bright));
  g.add(mesh(cylX(4.2, 39, 270, 22, 0, 20), M.bright));                        // piston rod
  g.add(mesh(cylX(7.6, 268, 282, 22, 0, 28), M.bright));                       // piston head
  for (let i = 0; i < 3; i++) g.add(mesh(cylX(7.75, 271 + i * 4, 272 + i * 4, 22, 0, 28), M.dark));   // gas rings grooves
  return g;
}
function boltGroup(M) {
  const g = new THREE.Group();
  g.add(mesh(cylX(6.4, 6, 54, 0, 0, 28), M.bright));
  g.add(mesh(cylX(5.2, 54, 62, 0, 0, 28), M.bright));
  for (const s of [1, -1]) { const lug = new THREE.BoxGeometry(7 * mm, 4 * mm, 2.8 * mm); lug.translate(57 * mm, 0, s * 5.6 * mm); g.add(mesh(lug, M.bright)); }
  const cam = new THREE.BoxGeometry(6 * mm, 4.5 * mm, 4 * mm); cam.translate(30 * mm, 7.5 * mm, 2 * mm); g.add(mesh(cam, M.bright));
  return g;
}
function springGroup(M) {
  // recoil spring on its guide rod, the rear of the guide forms the cover latch
  const g = new THREE.Group(), coil = new THREE.Group();
  const L = 114, turns = 34, r = 4.2;
  const pts = []; for (let i = 0; i <= turns * 24; i++) { const a = i / 24 * Math.PI * 2; pts.push(new THREE.Vector3((i / (turns * 24)) * L * mm, r * Math.cos(a) * mm, r * Math.sin(a) * mm)); }
  const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, 0.65 * mm, 6, false);
  coil.add(mesh(tg, M.bright)); coil.position.set(-192 * mm, 14 * mm, 0);
  g.add(coil);
  g.add(mesh(cylX(1.6, -194, -84, 14, 0, 10), M.blued));
  g.add(mesh(axialExtrude(roundRect(-9, 8, 9, 20, 2), -198, -192), M.blued));
  g.userData.coil = coil; g.userData.coilL = L * mm;
  return g;
}

/* ---------- assemble into rifle nodes ---------- */
function addNode(rifle, name, group) {
  group.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(group), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
  const pivot = new THREE.Group(); pivot.position.copy(c); rifle.recoil.add(pivot);
  const off = new THREE.Group(); off.position.copy(c).negate(); off.add(group); pivot.add(off);   // part placement, relative to its centre
  rifle.nodes[name] = { pivot, base: c.clone(), half: s.multiplyScalar(0.5) };
  return rifle.nodes[name];
}
// place a code part: x' = x * sx + dx, y' = y + dy (mm)
function placed(group, dx, dy, sx = 1) { const w = new THREE.Group(); w.add(group); w.scale.x = sx; w.position.set(dx * mm, dy * mm, 0); return w; }

/* Hybrid AK-47: the TRELLIS receiver group and magazine stay; the moving and fitted parts are the code
   ones, placed in the TRELLIS rifle's layout (bore at y = 0, handle home x +8 mm, gas tube axis y +23.8 mm,
   rear sight block front x 110 mm, receiver rear x -212 mm). The carrier is 14 mm shorter at the rear so
   full recoil stays inside the receiver; the gas tube is stretched to reach a code gas block, which the
   TRELLIS receiver group lacks (it came off with the gas tube in the field-strip source image). */
export function addHybridAK47(rifle) {
  const M = materials();
  rifle.coverMat = Object.assign(M.blued.clone(), { side: THREE.DoubleSide });
  addNode(rifle, 'carrier', placed(carrierGroup(M, { rear: -62 }), -25, 1.8));
  addNode(rifle, 'bolt', placed(boltGroup(M), -25, 0));
  const sp = springGroup(M), sn = addNode(rifle, 'spring', placed(sp, -11, 5.7));
  sn.coil = sp.userData.coil; sn.coilL = sp.userData.coilL;
  addNode(rifle, 'gastube', placed(gasTubeGroup(M), 110 - 106 * 1.067, 1.8, 1.067));
  // gas block on the TRELLIS barrel (centre y -4.6 mm, radius 8.7 mm) up to the tube socket, with the front sling loop
  const gbg = new THREE.Group();
  gbg.add(mesh(sideExtrude([[300, -14], [334, -14], [334, 2], [318, 34.5], [300, 35]], -9.5, 9.5, 1.5), M.blued));
  const sl = new THREE.TorusGeometry(6.5 * mm, 1.2 * mm, 8, 20); sl.rotateY(Math.PI / 2); sl.translate(318 * mm, -19 * mm, -10 * mm); gbg.add(mesh(sl, M.dark));
  const bn = rifle.nodes.body;
  if (bn) { const off = new THREE.Group(); off.position.copy(bn.base).negate(); off.add(gbg); bn.pivot.add(off); } else rifle.recoil.add(gbg);
}

export function buildCodeAK47(rifle) {
  const M = materials();
  rifle.coverMat = Object.assign(M.blued.clone(), { side: THREE.DoubleSide });
  const add = (name, group) => addNode(rifle, name, group);
  const body = new THREE.Group();
  body.add(receiverGroup(M), stockGroup(M), gripGroup(M), frontGroup(M));
  add('body', body);
  add('magazine', magazineGroup(M));
  add('gastube', gasTubeGroup(M));
  add('carrier', carrierGroup(M));
  add('bolt', boltGroup(M));
  const sp = springGroup(M); const sn = add('spring', sp); sn.coil = sp.userData.coil; sn.coilL = sp.userData.coilL;
  sn.coilX0 = sp.userData.coil.position.x;
}
