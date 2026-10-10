// One rifle: TRELLIS assemblies fitted to real dimensions, code-built parts, firing loop, field strip.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { caseGeometry, caseMaterial } from './cartridge.js';
import { floor } from './stage.js';

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const glbCache = new Map();
function loadGLB(url, onProg) {
  if (!glbCache.has(url)) glbCache.set(url, new Promise((res, rej) => loader.load(url, res, e => onProg && e.lengthComputable && onProg(e.loaded / e.total), rej)));
  return glbCache.get(url).then(g => ({ scene: g.scene.clone(true) }));
}

/* Keep TRELLIS's albedo and metal/rough maps, re-graded: wood (clearly redder) vs blued steel. */
function grade(mat, P) {
  const m = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 1, clearcoat: 1, clearcoatRoughness: 0.3 });
  for (const k of ['map', 'metalnessMap', 'roughnessMap', 'normalMap']) if (mat[k]) m[k] = mat[k];
  const u = { uTint: { value: new THREE.Vector3(...P.tint) }, uMetal: { value: P.metal }, uRough: { value: P.rough } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = 'uniform vec3 uTint; uniform float uMetal; uniform float uRough;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float woodM = smoothstep(0.05, 0.16, diffuseColor.r - max(diffuseColor.g, diffuseColor.b));
        diffuseColor.rgb = mix(diffuseColor.rgb * uTint, diffuseColor.rgb * vec3(1.0, 0.93, 0.88), woodM);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(clamp(roughnessFactor * uRough, 0.32, 0.78), 0.5, woodM);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mix(clamp(metalnessFactor * 0.5 + uMetal * 0.5, 0.0, 1.0), 0.0, woodM);`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        #ifdef USE_CLEARCOAT
          material.clearcoat *= woodM * 0.55;
        #endif`)
      // TRELLIS meshes carry a few bad-normal facets that mirror the lightbox's HDR strips; keep surfaces below the bloom threshold
      .replace('#include <opaque_fragment>', `outgoingLight = min(outgoingLight, vec3(1.8));
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'ak-grade';
  return m;
}

function steelTexture() {
  const W = 512, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#5d6168'; g.fillRect(0, 0, W, H);
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * W, y = rnd() * H, r = 2 + rnd() * 10;
    g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '20,24,32' : '70,74,80') + ',' + (0.05 + rnd() * 0.06) + ')';
    g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
  }
  for (let i = 0; i < 260; i++) {
    const y = rnd() * H; g.strokeStyle = 'rgba(150,155,160,' + (0.03 + rnd() * 0.05) + ')';
    g.lineWidth = 0.6; g.beginPath(); g.moveTo(rnd() * W, y); g.lineTo(rnd() * W, y + (rnd() - 0.5) * 2); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
let steelTex = null;
const darkSteel = () => new THREE.MeshPhysicalMaterial({ color: 0x2f3135, metalness: 0.9, roughness: 0.38 });

/* ---------- shared effect textures ---------- */
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
let FX = null;
function fxTextures() {
  if (FX) return FX;
  FX = {
    flash: canvasTex(256, 256, (g, S) => {
      g.translate(S / 2, S / 2); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        g.save(); g.rotate(i / 9 * Math.PI * 2 + (i % 3) * 0.1);
        const gr = g.createLinearGradient(0, 0, S * 0.48, 0);
        gr.addColorStop(0, 'rgba(255,240,200,0.9)'); gr.addColorStop(0.5, 'rgba(255,170,60,0.45)'); gr.addColorStop(1, 'rgba(255,90,10,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, -S * 0.035); g.lineTo(S * 0.48, 0); g.lineTo(0, S * 0.035); g.fill(); g.restore();
      }
      const r = g.createRadialGradient(0, 0, 0, 0, 0, S * 0.22);
      r.addColorStop(0, 'rgba(255,255,235,1)'); r.addColorStop(0.4, 'rgba(255,200,90,0.8)'); r.addColorStop(1, 'rgba(255,120,20,0)');
      g.fillStyle = r; g.fillRect(-S / 2, -S / 2, S, S);
    }),
    cone: canvasTex(256, 64, (g, W, H) => {
      const gr = g.createLinearGradient(0, 0, W, 0);
      gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.35, 'rgba(255,190,80,0.75)'); gr.addColorStop(1, 'rgba(255,90,10,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, H * 0.38); g.quadraticCurveTo(W * 0.5, 0, W, H / 2); g.quadraticCurveTo(W * 0.5, H, 0, H * 0.62); g.fill();
    }),
    smoke: canvasTex(128, 128, (g, S) => {
      const r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      r.addColorStop(0, 'rgba(120,118,115,0.7)'); r.addColorStop(0.45, 'rgba(135,133,130,0.3)'); r.addColorStop(1, 'rgba(150,150,150,0)');
      g.fillStyle = r; g.fillRect(0, 0, S, S);
    }),
  };
  return FX;
}

function fireCurve(t) {
  if (t < 0) return 0;
  if (t < 0.035) { const k = t / 0.035; return 1 - (1 - k) * (1 - k); }
  if (t < 0.042) return 1;
  if (t < 0.092) { const k = (t - 0.042) / 0.05; return 1 - k * k; }
  return 0;
}
function kickCurve(t) { if (t < 0) return 0; if (t < 0.012) return t / 0.012; return Math.exp(-(t - 0.012) * 22) * Math.cos((t - 0.012) * 30); }
const v3 = new THREE.Vector3(), ZAXIS = new THREE.Vector3(0, 0, 1);
function samplePath(path, u, outPos, outRot) {
  let i = 0; while (i < path.length - 2 && u > path[i + 1][0]) i++;
  const a = path[i], b = path[i + 1];
  const t = THREE.MathUtils.smootherstep(u, a[0], b[0]);
  outPos.set(...a[1]).lerp(v3.set(...b[1]), t);
  outRot.set(...[0, 1, 2].map(k => THREE.MathUtils.degToRad(a[2][k] + (b[2][k] - a[2][k]) * t)));
}

export class Rifle {
  constructor(def, scene, audio) {
    this.def = def; this.scene = scene; this.audio = audio;
    const I = def.img; this.K = def.length / (I.px1 - I.px0); this.PXC = (I.px0 + I.px1) / 2;
    this.root = new THREE.Group(); this.rig = new THREE.Group(); this.recoil = new THREE.Group();
    this.root.add(this.rig); this.rig.add(this.recoil); scene.add(this.root);
    this.nodes = {}; this.progress = {}; this.ready = false;
    this.shotSim = -10; this.nextShot = 0.8; this.burstLeft = 0; this.recoilBuild = 0; this.heat = 0; this.ejected = true;
  }
  wx(px) { return (px - this.PXC) * this.K; }
  wy(py) { return (this.def.img.bore - py) * this.K; }

  load(onProgress) {
    if (this._loading) return this._loading;
    const P = this.def.parts, names = Object.keys(P).filter(k => !P[k].code);
    if (this.def.build === 'hybrid') {
      const glbs = names.filter(n => P[n].file);
      const upd2 = () => onProgress && onProgress(glbs.reduce((a, k) => a + (this.progress[k] || 0), 0) / glbs.length);
      this._loading = Promise.all([import('./akcode.js'), ...glbs.map(n => loadGLB((window.__ASSET || '') + P[n].file, f => { this.progress[n] = f; upd2(); }).then(g => [n, g]))])
        .then(([m, ...list]) => {
          list.forEach(([n, g]) => this.fit(n, g));
          this.trimBaked(); this.addLiners();  // TRELLIS-only trims first, so they never cut the code parts added next
          if (this.def.hybridParts) m.addHybrid(this, this.def.hybridParts); else m.addHybridAK47(this);
          this.addRod(); this.buildCover(); this.addHandle(); this.buildFx();
          this.ready = true; return this;
        });
      return this._loading;
    }
    if (this.def.build === 'code') {
      this._loading = import('./akcode.js').then(m => {
        m.buildCodeAK47(this); this.buildCover(); this.addHandle(); this.buildFx();
        onProgress && onProgress(1); this.ready = true; return this;
      });
      return this._loading;
    }
    const upd = () => onProgress && onProgress(names.reduce((a, k) => a + (this.progress[k] || 0), 0) / names.length);
    this._loading = Promise.all(names.map(n => loadGLB((window.__ASSET || '') + P[n].file, f => { this.progress[n] = f; upd(); }).then(g => [n, g])))
      .then(list => {
        list.forEach(([n, g]) => this.fit(n, g));
        this.trimBaked(); this.addLiners(); this.addRod(); this.buildCover(); this.addHandle(); this.buildFx();
        this.ready = true; return this;
      });
    return this._loading;
  }

  fit(name, gltf) {
    const P = this.def.parts[name], K = this.K, model = gltf.scene;
    model.traverse(o => { if (o.isMesh) { o.layers.enable(1); if (o.material) o.material = grade(o.material, P.mat); } });
    const inner = new THREE.Group(); inner.add(model);
    inner.rotation.set(...P.rot.map(THREE.MathUtils.degToRad)); inner.updateMatrixWorld(true);
    // precise: vertex bounds, so off-axis rotations (the upright magazine) fit their box exactly
    const b = new THREE.Box3().setFromObject(inner, true), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    inner.position.sub(c);
    const scaler = new THREE.Group(); scaler.add(inner);
    // box: body-image px; wbox: metres in rifle space (for parts shared between rifles)
    const [x0, x1, y0, y1] = P.wbox ? P.wbox.map(v => v / K) : P.box, L = (x1 - x0) * K, H = (y1 - y0) * K;
    const sx = L / s.x, sy = H / s.y, sz = P.depth ? P.depth / s.z : (sx + sy) / 2;
    scaler.scale.set(sx, sy, sz);
    const pivot = new THREE.Group(); pivot.add(scaler);
    const base = P.wbox ? new THREE.Vector3((P.wbox[0] + P.wbox[1]) / 2, (P.wbox[2] + P.wbox[3]) / 2, P.z || 0) : new THREE.Vector3(this.wx((x0 + x1) / 2), this.wy((y0 + y1) / 2), P.z || 0);
    pivot.position.copy(base); this.recoil.add(pivot);
    this.nodes[name] = { pivot, base, half: new THREE.Vector3(L / 2, H / 2, (P.depth || s.z * sz) / 2) };
    if (P.rock) this.nodes[name].rock = new THREE.Vector3(...P.rock);      // removal rocks about this point (front lug)
  }

  /* TRELLIS can bake a static copy of a moving part into the body (it is in the source image): cut it out */
  trimBaked() { this.trimNode(this.nodes.body, this.def.trim); for (const k in this.def.parts) if (this.def.parts[k].trim) this.trimNode(this.nodes[k], this.def.parts[k].trim); }
  // remove triangles with any vertex inside one of the boxes ([lo, hi] in rifle-space metres, at the assembled pose)
  trimNode(n, T) {
    if (!n || !T) return;
    this.recoil.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(this.recoil.matrixWorld).invert(), M4 = new THREE.Matrix4(), p = new THREE.Vector3();
    const boxes = Array.isArray(T[0][0]) ? T : [T];
    if (n.trimmed) return; n.trimmed = true;
    n.pivot.traverse(o => {
      if (!o.isMesh || !o.geometry.index) return;
      M4.multiplyMatrices(inv, o.matrixWorld);
      const g = o.geometry, P = g.attributes.position, src = g.index.array, keep = [];
      for (let i = 0; i < src.length; i += 3) {
        let hit = false;
        for (let k = 0; k < 3 && !hit; k++) {
          p.fromBufferAttribute(P, src[i + k]).applyMatrix4(M4);
          hit = boxes.some(([lo, hi]) => p.x > lo[0] && p.x < hi[0] && p.y > lo[1] && p.y < hi[1] && p.z > lo[2] && p.z < hi[2]);
        }
        if (!hit) keep.push(src[i], src[i + 1], src[i + 2]);
      }
      g.setIndex(keep);
    });
  }

  // thin plates inside the receiver walls where the TRELLIS mesh left an opening (the magazine-well dimple)
  addLiners() {
    const L = this.def.liners; if (!L || !this.nodes.body) return;
    const m = new THREE.MeshPhysicalMaterial({ color: 0x0d0e10, metalness: 0.6, roughness: 0.8 });
    for (const [x0, x1, y0, y1, z0, z1] of L) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      b.layers.enable(1); this.nodes.body.pivot.attach(b);
    }
  }
  addRod() {
    const R = this.def.rod; if (!R || !this.nodes.body) return;
    const steel = darkSteel();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, R.x1 - R.x0, 12), steel);
    rod.rotation.z = Math.PI / 2; rod.position.set((R.x0 + R.x1) / 2, R.y, R.z);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.008, 14), steel);
    head.rotation.z = Math.PI / 2; head.position.set(R.x1 - 0.004, R.y, R.z);
    for (const m of [rod, head]) { m.layers.enable(1); this.nodes.body.pivot.attach(m); }
  }

  /* Dust cover fitted to the receiver: a 0.8 mm ribbed U-arch shell resting on the side-wall lip,
     the crown rounding down onto the rear tab, and the right-side cut-out over the ejection port
     sized from the charging handle's swept travel (see README: zero intersections over the stroke). */
  coverSection(xmm, N) {
    const C = this.def.cover, H = this.def.handle, hm = C.hwi + C.t / 2;
    const cutX0 = (H.x - H.stroke - 0.0075) * 1000 - 4, cutY = (this.wy(H.py) + 0.0035) * 1000 + 3;
    const archY = u => C.ys + (C.ci + C.t / 2 - C.ys) * Math.pow(1 - Math.pow(Math.min(1, Math.abs(u) / hm), C.n), 1 / C.n);
    const rt = THREE.MathUtils.clamp((xmm - C.xr) / C.rearRound, 0, 1);
    const f = C.rearMin + (1 - C.rearMin) * Math.sqrt(1 - (1 - rt) * (1 - rt));
    const ybR = C.yb + (cutY - C.yb) * THREE.MathUtils.smoothstep(xmm, cutX0 - 2, cutX0 + 2);
    const raw = [];
    for (let i = 0; i <= 8; i++) raw.push([-hm, C.yb + (C.ys - C.yb) * i / 8]);
    for (let i = 1; i < 60; i++) { const a = Math.PI * (1 - i / 60), u = hm * Math.cos(a); raw.push([u, archY(u)]); }
    for (let i = 0; i <= 8; i++) raw.push([hm, C.ys + (C.yb - C.ys) * i / 8]);
    for (const p of raw) p[1] = C.yb + (p[1] - C.yb) * f;
    let e = raw.length - 1;
    while (e > 0 && raw[e][0] > 0 && raw[e][1] < ybR) e--;
    const pts = raw.slice(0, e + 1);
    if (e < raw.length - 1) { const a = raw[e], b = raw[e + 1], q = (a[1] - ybR) / (a[1] - b[1] || 1); pts.push([a[0] + (b[0] - a[0]) * q, ybR]); }
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const out = [];
    for (let j = 0; j <= N; j++) {
      const d = cum[cum.length - 1] * j / N; let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
      const q = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      out.push([C.zc + pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * q, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * q]);
    }
    this._cut = { cutX0, cutY };
    return out;
  }
  buildCover() {
    const C = this.def.cover; if (!C || !this.def.parts.cover) return;
    const M = 180, N = 80, L = (C.xf - C.xr) / 1000, pos = [], uv = [], idx = [];
    for (let i = 0; i <= M; i++) {
      const s = i / M, xmm = C.xr + (C.xf - C.xr) * s, prof = this.coverSection(xmm, N);
      const rib = C.ribs.reduce((a, r) => a + Math.exp(-Math.pow((s - r) * L / 0.0028, 2)), 0);
      for (let j = 0; j <= N; j++) {
        const [z, y] = prof[j], a = prof[Math.max(0, j - 1)], b = prof[Math.min(N, j + 1)];
        let nz = b[1] - a[1], ny = -(b[0] - a[0]); const l = Math.hypot(nz, ny) || 1; nz /= l; ny /= l;
        if (nz * (z - C.zc) + ny * (y - C.yb - 2) < 0) { nz = -nz; ny = -ny; }
        const d = 1.3 * rib * THREE.MathUtils.smoothstep(y, C.yb + 3, C.ys + 4);
        pos.push(xmm / 1000, (y + ny * d) / 1000, (z + nz * d) / 1000); uv.push(s, j / N);
      }
    }
    for (let i = 0; i < M; i++) for (let j = 0; j < N; j++) { const a = i * (N + 1) + j, b = a + N + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    steelTex = steelTex || steelTexture();
    const mat = this.coverMat || new THREE.MeshPhysicalMaterial({ map: steelTex, color: 0x8f949c, metalness: 0.85, roughness: 0.5, side: THREE.DoubleSide, clearcoat: 0.15, clearcoatRoughness: 0.45 });
    const group = new THREE.Group(); group.add(new THREE.Mesh(geo, mat));
    const rear = this.coverSection(C.xr, N).filter(p => p[1] >= C.plateY);
    if (rear.length > 2) {
      const sh = new THREE.Shape(); sh.moveTo(rear[0][0] / 1000, C.plateY / 1000);
      rear.forEach(p => sh.lineTo(p[0] / 1000, p[1] / 1000)); sh.lineTo(rear[rear.length - 1][0] / 1000, C.plateY / 1000); sh.closePath();
      const plateGeo = new THREE.ShapeGeometry(sh, 6);
      plateGeo.rotateY(-Math.PI / 2); plateGeo.translate(C.xr / 1000 + 0.0004, 0, 0);   // shape (z, y) -> rear end plane, normal facing rearward
      group.add(new THREE.Mesh(plateGeo, mat));
    }
    const hm = C.hwi + C.t / 2;
    const lip = (x0, x1, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, (x1 - x0) / 1000, 8), mat);
      m.rotation.z = Math.PI / 2; m.position.set((x0 + x1) / 2000, (C.yb + 0.5) / 1000, z / 1000); group.add(m); };
    lip(C.xr, C.xf, C.zc - hm); lip(C.xr, this._cut.cutX0 - 2, C.zc + hm);
    group.traverse(o => { if (o.isMesh) o.layers.enable(1); });
    const ctr = new THREE.Vector3((C.xr + C.xf) / 2000, (C.yb + C.ci) / 2000, C.zc / 1000);
    group.position.copy(ctr).negate();
    const pivot = new THREE.Group(); pivot.add(group); pivot.position.copy(ctr); this.recoil.add(pivot);
    this.nodes.cover = { pivot, base: ctr.clone(), half: new THREE.Vector3(L / 2, (C.ci + C.t - C.yb) / 2000, (hm + C.t / 2) / 1000) };
  }

  addHandle() {
    const n = this.nodes.carrier, H = this.def.handle; if (!n || !H) return;
    const steel = new THREE.MeshPhysicalMaterial({ color: 0x2b2c30, metalness: 0.9, roughness: 0.35 });
    const g = new THREE.Group();
    // short flat stem out through the slot, rounded knob: it stands ~15 mm proud of the receiver side
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.0062, 0.017), steel); stem.position.z = 0.0105;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.0058, 18, 12), steel); knob.scale.set(1.15, 0.85, 0.75); knob.position.z = 0.021;
    g.add(stem, knob); g.traverse(o => { if (o.isMesh) o.layers.enable(1); });
    g.position.set(H.x - n.base.x, this.wy(H.py) - n.base.y, H.z);
    n.pivot.add(g);
  }

  /* ---------- effects ---------- */
  buildFx() {
    const T = fxTextures(), fx = new THREE.Group(); this.recoil.add(fx); this.fx = fx;
    this.MUZZLE = new THREE.Vector3(this.wx(this.def.muzzlePx), 0, 0);
    this.PORT = new THREE.Vector3(...this.def.port);
    const addMat = map => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(4, 4, 4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.flashStar = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.flash, color: new THREE.Color(5, 5, 5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.flashStar.position.copy(this.MUZZLE).add(new THREE.Vector3(0.02, 0, 0)); this.flashStar.scale.setScalar(0.11); fx.add(this.flashStar);
    this.plumes = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), addMat(T.cone));
      m.position.copy(this.MUZZLE).add(new THREE.Vector3(0.1, 0, 0)); m.rotation.x = i * Math.PI / 3; fx.add(m); this.plumes.push(m);
    }
    this.jets = [];
    for (const dir of [[0.2, 1, 0.4], [0.2, 0.8, -0.5], [0.3, 0.3, 1]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.02), addMat(T.cone)), d = new THREE.Vector3(...dir).normalize();
      m.position.copy(this.MUZZLE).add(new THREE.Vector3(-0.015, 0, 0)).addScaledVector(d, 0.035);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d); fx.add(m); this.jets.push(m);
    }
    fx.traverse(o => { o.userData.noAO = true; });
    this.flashLight = new THREE.PointLight(0xffa040, 0, 1.2, 2); this.flashLight.position.copy(this.MUZZLE).add(new THREE.Vector3(0.05, 0.02, 0.05)); fx.add(this.flashLight);
    this.portLight = new THREE.PointLight(0xffb060, 0, 0.6, 2); this.portLight.position.copy(this.PORT).add(new THREE.Vector3(0, 0.03, 0.06)); fx.add(this.portLight);
    this.setFlash(0, 0);
    this.smoke = [];
    for (let i = 0; i < 48; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.smoke, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false; s.userData.noAO = true; this.scene.add(s); this.smoke.push({ s, life: 0, max: 1, v: new THREE.Vector3(), g: 0 });
    }
    this.smokeIx = 0;
    const cg = caseGeometry(this.def.cartridge), cm = caseMaterial(this.def.cartridge);
    this.caseR = (cg.boundingBox || (cg.computeBoundingBox(), cg.boundingBox)).max.y;
    this.casings = [];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(cg, cm); m.visible = false; m.layers.enable(1); this.scene.add(m);
      this.casings.push({ m, life: 0, v: new THREE.Vector3(), w: new THREE.Vector3(), rest: false, bounces: 0 });
    }
    this.caseIx = 0;
  }
  setFlash(v, port) {
    this.flashStar.material.opacity = v; this.flashStar.visible = v > 0.01;
    this.plumes.forEach(m => { m.material.opacity = v; m.visible = v > 0.01; m.scale.set(0.7 + v * 0.5, 1, 1); });
    this.jets.forEach(m => { m.material.opacity = v * 0.8; m.visible = v > 0.01; });
    this.flashLight.intensity = v * 1.1; this.portLight.intensity = port * 0.6;
  }
  puff(at, n) {
    for (let i = 0; i < n; i++) {
      const p = this.smoke[this.smokeIx++ % this.smoke.length];
      p.s.position.copy(at).add(v3.set(Math.random() * 0.03, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02));
      p.v.set(0.12 + Math.random() * 0.25, 0.03 + Math.random() * 0.08, (Math.random() - 0.5) * 0.08);
      p.life = 0; p.max = 1.2 + Math.random() * 1.0; p.g = 0.03 + Math.random() * 0.03; p.s.visible = true; p.s.material.rotation = Math.random() * 6.28;
    }
  }
  eject(at) {
    const c = this.casings[this.caseIx++ % this.casings.length], q = this.root.getWorldQuaternion(new THREE.Quaternion());
    c.m.position.copy(at); c.m.quaternion.copy(q); c.m.visible = true; c.m.scale.setScalar(1);
    c.life = 0; c.rest = false; c.bounces = 0;
    c.v.set(0.34 + Math.random() * 0.08, 1.15 + Math.random() * 0.15, 0.13 + Math.random() * 0.06).applyQuaternion(q);
    c.w.set(6 + Math.random() * 6, 20 + Math.random() * 8, 8 + Math.random() * 4);
  }
  stepCasing(c, dt) {
    c.life += dt;
    if (c.life > 7) { c.m.scale.multiplyScalar(Math.exp(-dt * 6)); if (c.m.scale.x < 0.05) c.m.visible = false; }
    if (c.rest) return;
    c.v.y -= 9.8 * dt; c.m.position.addScaledVector(c.v, dt);
    c.m.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(c.w.x * dt, c.w.y * dt, c.w.z * dt)));
    const fy = floor.y + this.caseR;
    if (c.m.position.y < fy) {
      c.m.position.y = fy;
      const impact = -c.v.y;
      if (impact > 0) {
        c.v.y = impact * 0.36; c.v.x *= 0.62; c.v.z *= 0.62; c.w.multiplyScalar(0.55); c.bounces++;
        if (c.bounces <= 2 && impact > 0.2) this.audio.ping(c.bounces === 1 ? 1 : 0.35);   // one tink on contact, a faint one on the bounce
      }
      if (impact < 0.35 && c.bounces > 1) {
        c.rest = true; c.v.set(0, 0, 0);
        const ax = new THREE.Vector3(1, 0, 0).applyQuaternion(c.m.quaternion); ax.y = 0; ax.normalize();
        c.m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), ax.lengthSq() > 0 ? ax : new THREE.Vector3(1, 0, 0));
      }
    }
  }
  clearCasings() { if (!this.casings) return; for (const c of this.casings) c.m.visible = false; for (const p of this.smoke) p.s.visible = false; }

  /* Advance firing + strip. firing: loop active. strip: field-strip progress 0..1. */
  update(dt, simT, { firing = false, strip = 0, freeze = null } = {}) {
    const F = this.def.fire;
    if (freeze != null) { this.shotSim = simT - freeze; this.nextShot = simT + 99; this.ejected = true; }
    else if (firing && !document.hidden) {
      if (simT - this.nextShot > 0.3) this.nextShot = simT;
      if (simT >= this.nextShot) {
        this.shotSim = simT; this.ejected = false;
        this.recoilBuild = Math.min(1.6, this.recoilBuild + (F.mode === 'auto' ? 0.32 : 0.9)); this.heat = Math.min(1, this.heat + 0.22);
        this.flashStar.material.rotation = Math.random() * 6.283;
        this.recoil.updateMatrixWorld(true);
        this.puff(this.MUZZLE.clone().applyMatrix4(this.recoil.matrixWorld), F.mode === 'auto' ? 4 : 7);
        this.audio.shot(this.def.tone); setTimeout(() => this.audio.bolt(this.def.tone), 75);
        if (F.mode === 'auto') {
          if (this.burstLeft <= 0) this.burstLeft = F.burst[0] + Math.floor(Math.random() * (F.burst[1] - F.burst[0] + 1));
          this.burstLeft--;
          this.nextShot = this.burstLeft > 0 ? this.nextShot + F.rpmDt : simT + F.pause + Math.random() * 0.4;
        } else this.nextShot = simT + F.interval + Math.random() * 0.3;
      }
    } else this.nextShot = Math.max(this.nextShot, simT + 0.8);
    this.recoilBuild *= Math.exp(-dt * 2.2); this.heat *= Math.exp(-dt * 0.55);
    const ts = simT - this.shotSim;
    if (ts > 0.03 && !this.ejected) { this.ejected = true; this.recoil.updateMatrixWorld(true); this.eject(this.PORT.clone().applyMatrix4(this.recoil.matrixWorld)); }
    const flash = ts >= 0 && ts < 0.035 ? (1 - ts / 0.035) * (0.8 + Math.random() * 0.2) : 0;
    this.setFlash(flash, ts >= 0 && ts < 0.015 ? 1 : 0);
    const semi = F.mode !== 'auto', kick = kickCurve(ts);
    this.recoil.position.x = -(semi ? 0.016 : 0.009) * kick - 0.007 * this.recoilBuild;
    this.recoil.rotation.z = (semi ? 0.03 : 0.016) * Math.max(0, kick) + 0.02 * this.recoilBuild;

    // field strip
    const S = this.def.strip, n = S.length, span = 1 / n, tmpP = new THREE.Vector3(), tmpR = new THREE.Euler();
    this.stripU = S.map((s, i) => THREE.MathUtils.clamp((strip - i * span) / (span * 0.82), 0, 1));
    S.forEach((s, i) => {
      const node = this.nodes[s.part], path = this.def.paths[s.part]; if (!node || !path) return;
      samplePath(path, this.stripU[i], tmpP, tmpR);
      node.pivot.position.copy(node.base).add(tmpP); node.pivot.rotation.copy(tmpR);
      if (node.rock) {                     // rotate about the rock point (the magazine's front lug), not the part's centre
        const d = v3.copy(node.base).sub(node.rock), d0 = d.clone();
        d.applyAxisAngle(ZAXIS, tmpR.z); node.pivot.position.add(d.sub(d0));
      }
    });
    const cN = this.nodes.carrier, bN = this.nodes.bolt;
    if (cN) cN.pivot.position.x -= fireCurve(ts) * this.def.handle.stroke;
    if (cN && bN) bN.pivot.position.add(v3.copy(cN.pivot.position).sub(cN.base));
    // code model: the recoil spring compresses as the carrier comes back (only while it is in the rifle)
    const sN = this.nodes.spring;
    if (sN && sN.coil && cN) { const iS = S.findIndex(s => s.part === 'spring'), d = this.stripU[iS] > 0 ? 0 : (cN.pivot.position.x - cN.base.x) / 1;
      sN.coil.scale.x = THREE.MathUtils.clamp((sN.coilL + d) / sN.coilL, 0.3, 1); }
    for (const q of this.smoke) if (q.s.visible) {
      q.life += dt; const k = q.life / q.max;
      if (k >= 1) { q.s.visible = false; continue; }
      q.v.multiplyScalar(Math.exp(-dt * 1.6)); q.v.y += q.g * dt; q.s.position.addScaledVector(q.v, dt);
      q.s.scale.setScalar(0.03 + k * 0.16); q.s.material.opacity = Math.sin(Math.min(1, k * 4) * Math.PI / 2) * (1 - k) * 0.7;
    }
    for (const c of this.casings) if (c.m.visible) for (let i = 0; i < 3; i++) this.stepCasing(c, dt / 3);
    return ts;
  }

  /* world-space box of all assemblies (half-extents boxes, cheap) */
  box(out) {
    out.makeEmpty(); this.recoil.updateMatrixWorld(true);
    const corner = new THREE.Vector3();
    for (const name in this.nodes) {
      const n = this.nodes[name]; if (!n.pivot.visible) continue;
      for (let k = 0; k < 8; k++) {
        corner.set(k & 1 ? n.half.x : -n.half.x, k & 2 ? n.half.y : -n.half.y, k & 4 ? n.half.z : -n.half.z);
        corner.applyEuler(n.pivot.rotation).add(n.pivot.position).applyMatrix4(this.recoil.matrixWorld);
        out.expandByPoint(corner);
      }
    }
    return out;
  }
  muzzleWorld(out) { return out.copy(this.MUZZLE).applyMatrix4(this.recoil.matrixWorld); }
  portWorld(out) { return out.copy(this.PORT).applyMatrix4(this.recoil.matrixWorld); }
  setVisible(v) { this.root.visible = v; if (!v) this.clearCasings(); }
}
