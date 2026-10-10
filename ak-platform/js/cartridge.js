// Cartridges built in code from published case and bullet dimensions (mm), to scale.
// Every component is a closed region in the (r, z) plane, revolved in two halves with flat caps:
// with both halves together it reads as a whole round; sliding the front half away leaves a
// reference-book half section (case wall, primer, powder, jacket, core, penetrator).
import * as THREE from 'three';

/* Dimensions after CIP/SAAMI drawings, rounded to 0.1 mm where the drawings vary.
   z is measured from the case head. */
export const CARTRIDGES = {
  '50bmg':  { name: '.50 BMG', full: '12.7×99 mm NATO', L: 99.3, rimD: 20.4, rimT: 2.1, grooveD: 17.6, baseD: 20.4, shoulderD: 18.1, shoulderZ: 78.0, neckZ: 84.0, neckD: 14.2, bulletD: 12.95, oal: 138.4, bulletLen: 58.0, nose: 31, boat: 6, metal: 'brass', primer: 'large', web: 6 },
  '762x54r':{ name: '7.62×54R', full: '7.62×54 mm rimmed', L: 53.7, rimD: 14.48, rimT: 1.6, rimmed: true, baseD: 12.37, shoulderD: 11.61, shoulderZ: 41.8, neckZ: 45.2, neckD: 8.53, bulletD: 7.92, oal: 77.2, bulletLen: 32.3, nose: 17, boat: 3.2, metal: 'steel', primer: 'large', web: 4 },
  '762x51': { name: '7.62×51', full: '7.62×51 mm NATO (.308)', L: 51.2, rimD: 12.01, rimT: 1.37, grooveD: 10.39, baseD: 11.96, shoulderD: 11.53, shoulderZ: 39.6, neckZ: 43.4, neckD: 8.77, bulletD: 7.82, oal: 71.1, bulletLen: 29.0, nose: 16, boat: 3.5, metal: 'brass', primer: 'large', web: 4 },
  '762x39': { name: '7.62×39', full: '7.62×39 mm M43', L: 38.7, rimD: 11.35, rimT: 1.5, grooveD: 9.6, baseD: 11.35, shoulderD: 10.07, shoulderZ: 30.5, neckZ: 32.7, neckD: 8.6, bulletD: 7.92, oal: 56.0, bulletLen: 26.8, nose: 14, boat: 3.0, metal: 'steel', primer: 'large', web: 3.6 },
  '556x45': { name: '5.56×45', full: '5.56×45 mm NATO', L: 44.7, rimD: 9.6, rimT: 1.14, grooveD: 8.4, baseD: 9.6, shoulderD: 9.0, shoulderZ: 36.5, neckZ: 39.5, neckD: 6.43, bulletD: 5.70, oal: 57.4, bulletLen: 23.0, nose: 12.5, boat: 2.2, metal: 'brass', primer: 'small', web: 3.2 },
  '545x39': { name: '5.45×39', full: '5.45×39 mm 7N6', L: 39.8, rimD: 10.0, rimT: 1.5, grooveD: 8.6, baseD: 10.0, shoulderD: 9.25, shoulderZ: 30.6, neckZ: 33.6, neckD: 6.29, bulletD: 5.60, oal: 57.0, bulletLen: 25.5, nose: 13, boat: 2.4, metal: 'steel', primer: 'small', web: 3.2 },
  '45acp':  { name: '.45 ACP', full: '.45 Auto (11.43×23 mm)', L: 22.8, rimD: 12.19, rimT: 1.24, grooveD: 10.2, baseD: 12.09, neckD: 12.01, straight: true, bulletD: 11.48, oal: 32.4, bulletLen: 16.8, nose: 7.5, boat: 0, metal: 'brass', primer: 'large', web: 3.0, pistol: true },
  '9mm':    { name: '9×19 mm', full: '9×19 mm Parabellum', L: 19.15, rimD: 9.96, rimT: 1.27, grooveD: 7.8, baseD: 9.93, neckD: 9.65, straight: true, bulletD: 9.02, oal: 29.7, bulletLen: 15.5, nose: 6.2, boat: 0, metal: 'brass', primer: 'small', web: 2.6, pistol: true },
};
export const LINEUP = ['50bmg', '762x54r', '762x51', '762x39', '556x45', '545x39', '45acp', '9mm'];
export const CORE = ['762x39', '762x54r'];           // the two calibres with a cartridge path and bullet types
export const BULLET_TYPES = [
  { id: 'fmj', name: 'Full metal jacket', sub: 'jacket over a lead core, closed nose' },
  { id: 'hp',  name: 'Hollow point', sub: 'open nose with a cavity, expands on impact' },
  { id: 'sp',  name: 'Soft point', sub: 'jacket stops short, exposed lead nose' },
  { id: 'ap',  name: 'Armor piercing', sub: 'hardened steel penetrator in a lead sleeve' },
];

/* ---------- Materials ---------- */
const M = {};
function mats() {
  if (M.brass) return M;
  M.brass = new THREE.MeshPhysicalMaterial({ color: 0xc9973f, metalness: 1, roughness: 0.26, side: THREE.DoubleSide });
  M.steel = new THREE.MeshPhysicalMaterial({ color: 0x6b6d5c, metalness: 0.55, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35, side: THREE.DoubleSide }); // lacquered steel case
  M.jacket = new THREE.MeshPhysicalMaterial({ color: 0xbd6b3e, metalness: 1, roughness: 0.3, side: THREE.DoubleSide });       // copper / gilding metal
  M.lead = new THREE.MeshPhysicalMaterial({ color: 0x4f535a, metalness: 0.3, roughness: 0.5, side: THREE.DoubleSide });
  M.pen = new THREE.MeshPhysicalMaterial({ color: 0xc4cad2, metalness: 1, roughness: 0.22, side: THREE.DoubleSide });          // hardened steel penetrator
  M.primer = new THREE.MeshPhysicalMaterial({ color: 0xb87a46, metalness: 1, roughness: 0.32, side: THREE.DoubleSide });
  M.powder = new THREE.MeshPhysicalMaterial({ color: 0x2e3133, metalness: 0.25, roughness: 0.38 });
  M.cavity = new THREE.MeshPhysicalMaterial({ color: 0x3c3f44, metalness: 0.3, roughness: 0.6, side: THREE.DoubleSide });
  for (const k in M) M[k].userData.fade = true;
  return M;
}
export function cartridgeMaterials() { return mats(); }

/* ---------- Profiles ---------- */
const mm = 0.001;
// outer case profile from the head up (r, z), counter-clockwise region with the inside
function caseRegion(c) {
  const rimR = c.rimD / 2, baseR = c.baseD / 2, neckR = c.neckD / 2, tN = Math.max(0.28, (c.neckD - c.bulletD) / 2);
  const pocketR = c.primer === 'large' ? 2.72 : 2.24, pocketD = c.pistol ? 2.9 : 3.1, flashR = 0.55;
  const out = [];
  out.push([pocketR, 0], [rimR - 0.35, 0], [rimR, 0.35], [rimR, c.rimT - 0.25], [rimR - 0.25, c.rimT]);
  if (c.rimmed) out.push([baseR, c.rimT], [baseR, c.rimT + 0.4]);
  else { const gR = c.grooveD / 2; out.push([gR, c.rimT + 0.2], [gR, c.rimT + 0.9], [baseR, c.rimT + 1.8]); }
  if (c.straight) { out.push([neckR, c.L]); }
  else out.push([c.shoulderD / 2, c.shoulderZ], [neckR, c.neckZ], [neckR, c.L]);
  // inner wall, back down to the web and the flash hole
  const wallBody = c.pistol ? 0.42 : 0.5;
  out.push([neckR - tN, c.L]);
  if (c.straight) out.push([neckR - tN - 0.05, c.web + 3.5]);
  else out.push([neckR - tN, c.neckZ + 0.2], [c.shoulderD / 2 - wallBody, c.shoulderZ + 0.2], [baseR - wallBody - 0.4, c.web + 4]);
  out.push([baseR - wallBody - 1.0, c.web + 0.8], [baseR - wallBody - 1.8, c.web], [flashR, c.web], [flashR, pocketD], [pocketR, pocketD]);
  return { pts: out, inner: { tN, wallBody, flashR, pocketR, pocketD } };
}
// inner radius of the case at height z (for powder)
function caseInnerR(c, z) {
  const reg = caseRegion(c), I = reg.pts.slice(reg.pts.findIndex(p => p[1] === c.L && p[0] < c.neckD / 2)); // inner wall, top down
  for (let i = 0; i < I.length - 1; i++) {
    const a = I[i], b = I[i + 1];
    if ((z <= a[1] && z >= b[1]) || (z >= a[1] && z <= b[1])) { const f = (z - a[1]) / (b[1] - a[1] || 1); return a[0] + (b[0] - a[0]) * f; }
  }
  return 0;
}
// bullet outer radius at height z from its base: boat tail, bearing surface, tangent ogive nose
function bulletR(c, z) {
  const R = c.bulletD / 2, Lt = c.bulletLen, Lo = c.nose, rho = (R * R + Lo * Lo) / (2 * R);
  if (z < c.boat) return R - (c.boat - z) * Math.tan(THREE.MathUtils.degToRad(c.pistol ? 0 : 8));
  if (z <= Lt - Lo) return R;
  const x = Lt - z; return Math.max(0, Math.sqrt(Math.max(0, rho * rho - (Lo - x) * (Lo - x))) + R - rho);
}
function bulletOutline(c, z0 = 0, z1 = c.bulletLen, n = 40) {
  const pts = []; for (let i = 0; i <= n; i++) { const z = z0 + (z1 - z0) * i / n; pts.push([bulletR(c, z), z]); } return pts;
}
// solve where the outline offset inward by t reaches the axis
function offsetTop(c, t) { let z = c.bulletLen; while (z > 0 && bulletR(c, z) - t <= 0.05) z -= 0.02; return z; }

/* Regions of one bullet type: list of { pts (CCW region), mat }. */
function bulletRegions(c, type) {
  const R = c.bulletD / 2, Lt = c.bulletLen, tj = c.pistol ? 0.45 : 0.6, m = mats();
  const regs = [];
  const innerTop = offsetTop(c, tj);
  const inner = (z0, z1, t = tj, n = 30) => { const p = []; for (let i = 0; i <= n; i++) { const z = z0 + (z1 - z0) * i / n; p.push([Math.max(0.02, bulletR(c, z) - t), z]); } return p; };
  if (type === 'fmj' || type === 'ap') {
    // jacket: closed nose, open base (the core shows at the base)
    const outer = bulletOutline(c, 0, Lt); outer[outer.length - 1] = [0, Lt];
    const inn = inner(0, innerTop).reverse(); inn[0] = [0, innerTop - 0.35];
    regs.push({ pts: [[R - tj, 0], ...outer.slice(0), ...inn], mat: m.jacket, name: 'jacket' });
    if (type === 'fmj') {
      const core = inner(0, innerTop - 0.35); core.push([0, innerTop - 0.35]);
      regs.push({ pts: [[0, 0], ...core], mat: m.lead, name: 'core' });
    } else {
      // lead sleeve around a pointed hardened-steel penetrator
      const sl = 0.75, pr = R - tj - sl, pz0 = 2.2, pTop = innerTop - 1.6, pNose = Math.min(pTop - pz0 - 1, c.nose * 0.9);
      const pen = [[0, pz0], [pr, pz0], [pr, pTop - pNose]];
      for (let i = 1; i <= 16; i++) { const k = i / 16; pen.push([pr * Math.sqrt(1 - k * k), pTop - pNose + pNose * k]); }
      regs.push({ pts: pen, mat: m.pen, name: 'penetrator' });
      const sleeve = inner(0, innerTop - 0.35); sleeve.push([0, innerTop - 0.35], [0, pTop + 0.05]);
      for (let i = 16; i >= 0; i--) { const k = i / 16; sleeve.push([pr * Math.sqrt(1 - k * k) + 0.02, pTop - pNose + pNose * k]); }
      sleeve.push([pr + 0.02, pz0 - 0.02], [0, pz0 - 0.02]);
      regs.push({ pts: [[0, 0], ...sleeve], mat: m.lead, name: 'core' });
    }
  } else if (type === 'hp') {
    // jacket folded into an open nose; core with a conical cavity
    const zm = Lt - c.nose * 0.16, rm = Math.max(1.2, bulletR(c, zm)), cav = Math.min(c.nose * 0.6, 9), cavR = Math.max(0.8, rm - tj);
    const outer = bulletOutline(c, 0, zm); outer.push([rm - tj * 0.7, Lt - 0.3]);
    const inn = inner(0, zm - 0.2).reverse();
    regs.push({ pts: [[R - tj, 0], ...outer, ...inn], mat: m.jacket, name: 'jacket' });
    const core = inner(0, zm - 0.25); core.push([cavR, zm - 0.25], [0.25, zm - 0.25 - cav], [0, zm - 0.25 - cav]);
    regs.push({ pts: [[0, 0], ...core], mat: m.lead, name: 'core' });
  } else if (type === 'sp') {
    // jacket stops short of the nose; the lead core forms the exposed tip
    const zj = Lt - c.nose * 0.38;
    const outer = bulletOutline(c, 0, zj);
    const inn = inner(0, zj - 0.1).reverse();
    regs.push({ pts: [[R - tj, 0], ...outer, [Math.max(0.3, bulletR(c, zj) - tj), zj], ...inn.slice(1)], mat: m.jacket, name: 'jacket' });
    const core = inner(0, zj); for (const p of bulletOutline(c, zj, Lt * 0.995, 18)) core.push([Math.max(0.05, p[0] * 0.985), p[1]]);
    core.push([0, Lt * 0.995]);
    regs.push({ pts: [[0, 0], ...core], mat: m.lead, name: 'core' });
  }
  return regs;
}

/* ---------- Geometry: half lathes with caps ---------- */
function halfLathe(pts, back, segs = 28) {
  const v = pts.map(p => new THREE.Vector2(Math.max(0, p[0]) * mm, p[1] * mm));
  v.push(v[0].clone());
  const start = back ? Math.PI / 2 : -Math.PI / 2;
  const g = new THREE.LatheGeometry(v, segs, start, Math.PI);
  // caps in the section plane (local z = 0); ShapeGeometry always faces +Z
  const cap = sgn => {
    const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo : s.moveTo).call(s, sgn * Math.max(0, p[0]) * mm, p[1] * mm));
    const sg = new THREE.ShapeGeometry(s, 2); if (!back) sg.rotateY(Math.PI); return sg;
  };
  return [g, cap(1), cap(-1)];
}
function regionMeshes(reg, back) {
  const grp = new THREE.Group();
  for (const geo of halfLathe(reg.pts, back)) { const m = new THREE.Mesh(geo, reg.mat); m.layers.enable(1); grp.add(m); }
  return grp;
}

/* Powder: stick granules (rifle) or flakes (pistol) filling ~85% of the case volume */
function powderCharge(c, back, count) {
  const m = mats(), rifle = !c.pistol;
  const geo = rifle ? new THREE.CylinderGeometry(0.42 * mm, 0.42 * mm, 1.3 * mm, 6) : new THREE.CylinderGeometry(0.7 * mm, 0.7 * mm, 0.16 * mm, 7);
  const z0 = c.web + 0.3, z1 = Math.min(c.L - 1.0, c.oal - c.bulletLen - 0.3) * 0.98;
  const inst = new THREE.InstancedMesh(geo, m.powder, count);
  const o = new THREE.Object3D(); let n = 0, guard = 0, rnd = mulberry(c.L * 1000 + (back ? 1 : 2));
  while (n < count && guard++ < count * 40) {
    const z = z0 + (z1 - z0) * rnd(), rMax = caseInnerR(c, z) - 0.55; if (rMax <= 0.2) continue;
    const r = rMax * Math.sqrt(rnd()), a = (back ? Math.PI / 2 : -Math.PI / 2) + Math.PI * rnd();
    o.position.set(r * Math.sin(a) * mm, z * mm, r * Math.cos(a) * mm);
    if (back && o.position.z > -0.25 * mm) continue;                      // keep granules off the section plane
    if (!back && o.position.z < 0.25 * mm) continue;
    o.rotation.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28); o.updateMatrix(); inst.setMatrixAt(n++, o.matrix);
  }
  inst.count = n; inst.instanceMatrix.needsUpdate = true; inst.layers.enable(1);
  return inst;
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* A whole round: { group, front (the removable half), parts: case/primer/powder/bullet groups } */
export function buildCartridge(id, { bullet = 'fmj', powder = true } = {}) {
  const c = CARTRIDGES[id], m = mats(), cr = caseRegion(c);
  const group = new THREE.Group(), back = new THREE.Group(), front = new THREE.Group();
  group.add(back, front);
  const parts = {};
  const mk = (name, regsFn) => {
    const b = new THREE.Group(), f = new THREE.Group();
    for (const r of regsFn()) { b.add(regionMeshes(r, true)); f.add(regionMeshes(r, false)); }
    back.add(b); front.add(f); parts[name] = { back: b, front: f };
  };
  mk('case', () => [{ pts: cr.pts, mat: m[c.metal] }]);
  const pH = c.pistol ? 2.6 : 2.9, pR = cr.inner.pocketR - 0.02;
  mk('primer', () => [{ pts: [[0, 0.05], [pR, 0.05], [pR, pH], [0, pH]], mat: m.primer }]);
  const seat = c.oal - c.bulletLen;
  mk('bullet', () => bulletRegions(c, bullet));
  parts.bullet.back.position.y = parts.bullet.front.position.y = seat * mm;
  if (powder) {
    const pb = powderCharge(c, true, c.pistol ? 140 : Math.round(260 * Math.min(2.2, c.L / 40))), pf = powderCharge(c, false, 80);
    back.add(pb); front.add(pf); parts.powder = { back: pb, front: pf };
  }
  return { id, c, group, back, front, parts, seat: seat * mm, len: c.oal * mm, rad: c.rimD / 2 * mm };
}

/* A loose bullet of one type, base at y = 0 */
export function buildBullet(id, type) {
  const c = CARTRIDGES[id], group = new THREE.Group(), back = new THREE.Group(), front = new THREE.Group();
  for (const r of bulletRegions(c, type)) { back.add(regionMeshes(r, true)); front.add(regionMeshes(r, false)); }
  group.add(back, front);
  return { group, back, front, len: c.bulletLen * mm, rad: c.bulletD / 2 * mm };
}

/* A whole empty case as one cheap mesh (ejected brass), axis along +X */
const caseGeos = {};
export function caseGeometry(id) {
  if (caseGeos[id]) return caseGeos[id];
  const c = CARTRIDGES[id], pts = caseRegion(c).pts.map(p => new THREE.Vector2(p[0] * mm, p[1] * mm)); pts.push(pts[0].clone());
  const g = new THREE.LatheGeometry(pts, 18); g.translate(0, -c.L / 2 * mm, 0); g.rotateZ(-Math.PI / 2);
  return (caseGeos[id] = g);
}
export function caseMaterial(id) { return mats()[CARTRIDGES[id].metal]; }

/* fade a whole object (materials are shared, so fading uses per-object clones on demand) */
export function setOpacity(obj, a) {
  obj.traverse(o => {
    if (!o.material) return;
    if (!o.userData.ownMat) { o.material = o.material.clone(); o.userData.ownMat = true; }
    o.material.transparent = a < 0.999; o.material.opacity = a; o.material.depthWrite = a > 0.5;
    o.visible = a > 0.01;
  });
}
