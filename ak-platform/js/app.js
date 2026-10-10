// AK platform showcase: landing carousel, rifle path, cartridge path. Every scroll-driven pose is a
// pure function of scroll progress, so each stage scrubs both ways.
import * as THREE from 'three';
import { Q, scene, camera, renderer, finish, quality, watchQuality, user, frame, render, shake, sweep, snapCamera, now } from './stage.js';
import { RIFLES, ORDER } from './rifles.js';
import { Rifle } from './rifle.js';
import { CARTRIDGES, LINEUP, CORE, BULLET_TYPES, buildCartridge, buildBullet, setOpacity } from './cartridge.js';
import { createAudio } from './audio.js';

const $ = id => document.getElementById(id);
const audio = createAudio((window.__ASSET || '') + 'sfx/');
window.__audio = audio;
$('snd').addEventListener('click', () => {
  const on = audio.toggle();
  $('sndx').style.display = on ? 'none' : ''; $('sndw').style.display = on ? '' : 'none';
  $('snd').setAttribute('aria-label', on ? 'Sound off' : 'Sound on');
});

/* ---------- routing ---------- */
const rifleId = RIFLES[Q.get('rifle')] ? Q.get('rifle') : null;
const cartId = CARTRIDGES[Q.get('cartridge')] ? Q.get('cartridge') : null;
const MODE = rifleId ? 'rifle' : cartId ? 'cartridge' : 'landing';
let landingTab = (Q.get('view') === 'cartridges' || location.hash === '#cartridges') ? 'cartridges' : 'rifles';
// TRELLIS or code-modeled geometry (?model=trellis|code); rifles without a code model always use TRELLIS
const DEFAULT_MODEL = 'hybrid';
const MODEL = ['hybrid', 'code', 'trellis'].includes(Q.get('model')) ? Q.get('model') : DEFAULT_MODEL;
const defFor = id => { const d = RIFLES[id], v = d[MODEL]; return v && MODEL !== 'trellis' ? Object.assign({}, d, v) : d; };
const href = (k, v) => '?' + k + '=' + v + (Q.get('model') ? '&model=' + MODEL : '');
const rifleLink = id => href('rifle', id), cartLink = id => href('cartridge', id);
window.__mode = MODE;
window.__scene = scene;

/* ---------- HUD helpers ---------- */
const nav = $('nav');
function navLink(text, url) { const a = document.createElement('a'); a.textContent = text; a.href = url; nav.appendChild(a); return a; }
// always-visible switcher: every rifle plus the cartridges, no URL typing needed
function rifleSwitcher(current) {
  const seg = document.createElement('span'); seg.className = 'seg'; nav.appendChild(seg);
  for (const id of ORDER) { const a = document.createElement('a'); a.textContent = RIFLES[id].name + (RIFLES[id].wip ? ' (WIP)' : ''); a.href = '?rifle=' + id; if (id === current) a.className = 'on'; seg.appendChild(a); }
  const c = document.createElement('a'); c.textContent = 'Cartridges'; c.href = './?view=cartridges'; if (current === 'cartridges') c.className = 'on'; seg.appendChild(c);
}
const bar = $('bar'), cap = $('cap');
let STAGES = [], shownStage = -2;
function setStages(list) { STAGES = list; bar.innerHTML = ''; list.forEach(() => bar.appendChild(document.createElement('i'))); shownStage = -2; }
function setStage(i) {
  if (i === shownStage) return; shownStage = i;
  cap.style.opacity = 0;
  setTimeout(() => {
    const s = STAGES[shownStage]; if (!s) return;
    $('cn').textContent = String(shownStage).padStart(2, '0'); $('ch').textContent = s.h; $('cd').textContent = s.d;
    cap.style.opacity = 1;
  }, 220);
  [...bar.children].forEach((d, k) => d.classList.toggle('on', k === i));
}
function stageAt(p) { let i = 0; STAGES.forEach((s, k) => { if (p >= s.p - 1e-4) i = k; }); return i; }

/* SVG labels: leader line from a world point to text */
const svg = $('labels'), SVGNS = 'http://www.w3.org/2000/svg';
const labelPool = [];
function labelEl(i) {
  while (labelPool.length <= i) {
    const g = document.createElementNS(SVGNS, 'g'), line = document.createElementNS(SVGNS, 'polyline'), dot = document.createElementNS(SVGNS, 'circle');
    dot.setAttribute('r', 2);
    const t1 = document.createElementNS(SVGNS, 'text'), t2 = document.createElementNS(SVGNS, 'text'); t2.setAttribute('class', 'sub');
    g.append(line, dot, t1, t2); svg.appendChild(g); labelPool.push({ g, line, dot, t1, t2 });
  }
  return labelPool[i];
}
const pj = new THREE.Vector3();
function drawLabels(list) {
  const W = innerWidth, H = innerHeight, small = W < 640, len = small ? 22 : 46;
  list.forEach((L, i) => {
    const e = labelEl(i); e.g.style.display = ''; e.g.style.opacity = L.a ?? 1;
    pj.copy(L.p).project(camera);
    const x = (pj.x * 0.5 + 0.5) * W, y = (-pj.y * 0.5 + 0.5) * H, d = L.dir || [1, -0.6];
    const ex = x + d[0] * len * 0.55, ey = y + d[1] * len * 0.55, vert = d[0] === 0, tx = vert ? ex : ex + Math.sign(d[0] || 1) * len * 0.6;
    e.line.setAttribute('points', vert ? `${x},${y} ${ex},${ey}` : `${x},${y} ${ex},${ey} ${tx},${ey}`);
    e.dot.setAttribute('cx', x); e.dot.setAttribute('cy', y);
    const anchor = vert ? 'middle' : d[0] < 0 ? 'end' : 'start', off = vert ? 0 : d[0] < 0 ? -4 : 4;
    // keep text on screen: estimate its width and slide it inside the viewport edge
    const wEst = Math.max(L.text.length * (small ? 6.2 : 8.2), (L.sub || '').length * (small ? 0 : 5));
    let txx = tx + off;
    if (anchor === 'start') txx = Math.min(txx, W - 6 - wEst); else if (anchor === 'end') txx = Math.max(txx, 6 + wEst);
    else txx = THREE.MathUtils.clamp(txx, 6 + wEst / 2, W - 6 - wEst / 2);
    for (const t of [e.t1, e.t2]) { t.setAttribute('x', txx); t.setAttribute('text-anchor', anchor); }
    e.t1.textContent = L.text; e.t2.textContent = L.sub || '';
    e.t1.setAttribute('class', L.big ? 'big' : '');
    if (vert) { e.t1.setAttribute('y', ey - 16); e.t2.setAttribute('y', ey - 5); } else { e.t1.setAttribute('y', ey - 3); e.t2.setAttribute('y', ey + 10); }
  });
  for (let i = list.length; i < labelPool.length; i++) labelPool[i].g.style.display = 'none';
}

/* ---------- scroll ---------- */
let scrollP = 0, smoothP = 0;
const fixedP = Q.has('p') ? parseFloat(Q.get('p')) : null;
function readScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  scrollP = max > 0 ? THREE.MathUtils.clamp(scrollY / max, 0, 1) : 0;
}
addEventListener('scroll', readScroll, { passive: true });
const sm = (x, a, b) => THREE.MathUtils.smoothstep(x, a, b);
const seg = (p, a, b) => THREE.MathUtils.clamp((p - a) / (b - a), 0, 1);

/* ---------- shared objects ---------- */
const LINE = new THREE.Vector3(0, -0.62, 0);                 // the cartridge lineup sits below the rifle
const lineup = {};                                            // id -> { obj, slot }
let lineupBuilt = false;
function buildLineup() {
  if (lineupBuilt) return; lineupBuilt = true;
  const gap = 0.013; let x = 0; const xs = [];
  for (const id of LINEUP) { const c = CARTRIDGES[id]; x += c.rimD / 2000; xs.push(x); x += c.rimD / 2000 + gap; }
  const w = x - gap;
  LINEUP.forEach((id, i) => {
    const obj = buildCartridge(id, { powder: CORE.includes(id) }); scene.add(obj.group);
    lineup[id] = { obj, slot: new THREE.Vector3(LINE.x - w / 2 + xs[i], LINE.y, LINE.z) };
    obj.group.position.copy(lineup[id].slot);
  });
}
function lineupBox(out, ids = LINEUP) {
  out.makeEmpty();
  for (const id of ids) { const o = lineup[id]; out.expandByPoint(o.slot); out.expandByPoint(v3.copy(o.slot).add(new THREE.Vector3(0, o.obj.len, 0))); }
  out.expandByScalar(0.004); return out;
}
const v3 = new THREE.Vector3(), boxA = new THREE.Box3(), boxB = new THREE.Box3(), boxT = new THREE.Box3();
// centre moves linearly, size interpolates geometrically, so a rifle-to-cartridge zoom never dives through the rifle
const _ca = new THREE.Vector3(), _cb = new THREE.Vector3(), _sa = new THREE.Vector3(), _sb = new THREE.Vector3();
function lerpBox(out, a, b, t) {
  if (t <= 0) return out.copy(a); if (t >= 1) return out.copy(b);
  a.getCenter(_ca); b.getCenter(_cb); a.getSize(_sa); b.getSize(_sb);
  const k = (x, y) => Math.exp(Math.log(Math.max(x, 1e-4)) * (1 - t) + Math.log(Math.max(y, 1e-4)) * t);
  const ma = Math.max(_sa.x, _sa.y), mb = Math.max(_sb.x, _sb.y), mt = k(ma, mb);
  const tc = THREE.MathUtils.clamp((mt - ma) / ((mb - ma) || 1e-6), 0, 1);   // centre follows the zoom: pull back first, then pan
  _ca.lerp(_cb, tc); _sa.set(k(_sa.x, _sb.x), k(_sa.y, _sb.y), k(_sa.z, _sb.z)).multiplyScalar(0.5);
  out.min.copy(_ca).sub(_sa); out.max.copy(_ca).add(_sa); return out;
}

const rifles = {};
window.__rifles = rifles;
function getRifle(id) {
  if (!rifles[id]) rifles[id] = new Rifle(defFor(id), scene, audio);
  return rifles[id];
}

/* bullet types column for one calibre */
const bulletSets = {};
function bulletSet(cal) {
  if (bulletSets[cal]) return bulletSets[cal];
  const c = CARTRIDGES[cal], items = BULLET_TYPES.map((t, i) => {
    const b = buildBullet(cal, t.id); b.group.rotation.z = -Math.PI / 2; scene.add(b.group); b.group.visible = false;
    return { t, b };
  });
  return (bulletSets[cal] = { c, items });
}

/* ---------- cartridge sequence: lineup -> hero horizontal + breakdown + cutaway -> bullet types ---------- */
const PRESENT = new THREE.Vector3(0, -0.6, 0.0);
function heroPose(o, u) {
  // u 0..1: from its lineup slot (upright) to horizontal at the presentation spot
  const k = sm(u, 0, 1), slot = lineup[o.id].slot;
  o.group.position.lerpVectors(slot, v3.copy(PRESENT).add(new THREE.Vector3(-o.len / 2, 0.012, 0.0)), k);
  o.group.rotation.set(0, 0, -Math.PI / 2 * k);
}
function breakdown(o, u, cut) {
  // separate the components along the axis (local +Y = toward the bullet tip)
  const s = sm(u, 0, 1), P = o.parts, L = o.len;
  for (const h of ['back', 'front']) {
    P.bullet[h].position.y = o.seat + s * L * 0.42;
    if (P.powder) P.powder[h].position.y = s * L * 0.22;
    P.primer[h].position.y = -s * L * 0.16;
  }
  // cutaway: the front half slides toward the camera and fades
  o.front.position.z = cut * 0.03;
  setOpacity(o.front, 1 - sm(cut, 0.15, 0.85));
}
function partLabels(o, a) {
  const c = o.c, L = o.len, P = o.parts, list = [], g = o.group;
  g.updateMatrixWorld(true);
  const at = (y, r, obj) => v3.set(0, y, 0).applyMatrix4(obj.matrixWorld).clone();
  const caseTxt = c.metal === 'steel' ? 'lacquered steel' : 'drawn brass';
  list.push({ p: at(c.L * 0.0005, 0, P.case.back), text: 'Case', sub: caseTxt, dir: [-0.4, -1.4], a });
  list.push({ p: at(0.0015, 0, P.primer.back), text: 'Primer', sub: c.metal === 'steel' ? 'Berdan, two flash holes' : 'Boxer, central flash hole', dir: [-0.6, 1.3], a });
  if (P.powder) list.push({ p: at((c.web + c.L) * 0.0005, 0, P.powder.back), text: 'Powder', sub: c.pistol ? 'flake propellant' : 'stick propellant', dir: [0.2, 1.5], a });
  list.push({ p: at(c.bulletLen * 0.0006, 0, P.bullet.back), text: 'Bullet', sub: (c.bulletD).toFixed(2) + ' mm', dir: [0.5, -1.4], a });
  return list;
}

/* ---------- landing ---------- */
let car = { i: Math.max(0, ORDER.indexOf(Q.get('slide') || 'ak47')), t0: now(), lastUser: -1e9 };
function slide(d) { car.i = (car.i + d + ORDER.length) % ORDER.length; car.t0 = now(); car.lastUser = now(); updateCarousel(); }
function updateCarousel() {
  const def = RIFLES[ORDER[car.i]];
  $('cname').textContent = def.name + (def.wip ? ' · work in progress' : ''); $('ccal').textContent = def.cal + ' · ' + def.blurb;
  const go = $('cgo'); go.href = rifleLink(def.id); go.textContent = def.ready ? 'Explore the ' + def.name + ' →' : 'In the workshop'; go.classList.toggle('off', !def.ready);
  [...$('cards').children].forEach(a => a.classList.toggle('on', a.dataset.id === def.id));
  [...$('cdots').children].forEach((d, k) => d.classList.toggle('on', k === car.i));
  for (const id of ORDER) if (rifles[id]) rifles[id].setVisible(false);
  if (def.ready) {
    const r = getRifle(def.id); r.root.visible = false; r.load(updLoad).then(() => { if (ORDER[car.i] === def.id) { r.root.visible = true; snapCamera(); } });
    const nx = RIFLES[ORDER[(car.i + 1) % ORDER.length]]; if (nx.ready) setTimeout(() => getRifle(nx.id).load(), 1500);   // prefetch the next slide
  }
}
function updLoad(f) { $('lp').textContent = Math.round(f * 100); $('load').style.opacity = f < 1 ? 1 : 0; }

/* ---------- mode setup ---------- */
const scrollEl = $('scroll');
let rifle = null;
function setup() {
  if (MODE === 'landing') {
    scrollEl.style.height = '100vh';
    const segEl = document.createElement('span'); segEl.className = 'seg'; nav.appendChild(segEl);
    for (const [k, t] of [['rifles', 'Rifles'], ['cartridges', 'Cartridges']]) {
      const b = document.createElement('button'); b.textContent = t; b.dataset.k = k;
      b.addEventListener('click', () => { landingTab = k; history.replaceState(null, '', k === 'cartridges' ? '?view=cartridges' : location.pathname); applyTab(); });
      segEl.appendChild(b);
    }
    ORDER.forEach((id, k) => { const d = document.createElement('i'); d.addEventListener('click', () => slide(k - car.i)); $('cdots').appendChild(d); });
    $('cprev').addEventListener('click', () => slide(-1)); $('cnext').addEventListener('click', () => slide(1));
    $('hint').style.display = 'none';
    applyTab();
  } else if (MODE === 'rifle') {
    const def = defFor(rifleId);
    document.title = def.name + ' · AK Platform';
    if (RIFLES[rifleId].code || RIFLES[rifleId].hybrid) modelToggle();
    $('t1').textContent = def.name.replace('-', '‑'); $('t2').textContent = def.cal + ' · ' + def.blurb;
    navLink('← All rifles', './').classList.add('home'); rifleSwitcher(rifleId); navLink(CARTRIDGES[def.cartridge].name + ' →', cartLink(def.cartridge));
    scrollEl.style.height = '1600vh';
    $('credit').textContent = (def.credit || '') + ' · cartridges built in code';
    const c = CARTRIDGES[def.cartridge], n = def.strip.length;
    const fireTxt = def.fire.mode === 'auto' ? 'Full-auto, about 600 rounds a minute, fired in short bursts.' : 'Semi-automatic only: one round per trigger pull.';
    const list = [
      { p: 0, h: 'Firing', d: fireTxt },
      { p: R.B0, h: 'The cartridge', d: 'A spent case turns upright and joins the lineup, largest to smallest.' },
      { p: R.C0, h: c.name, d: 'Case, primer, powder and bullet, then a half section through the round.' },
      { p: R.C0 + (R.D0 - R.C0) * 0.55, h: 'Bullet types', d: 'Four constructions in ' + c.name + ', each cut in half.' },
    ];
    def.strip.forEach((s, i) => list.push({ p: R.S0 + (0.975 - R.S0) * i / n, h: s.h, d: s.d }));
    list.push({ p: 0.985, h: 'Field stripped', d: 'Every assembly laid out. Scroll back up to put it together.' });
    setStages(list);
    rifle = getRifle(rifleId);
    rifle.load(updLoad).then(() => { ready = true; readScroll(); updLoad(1); window.__ready = true; })
      .catch(e => { $('load').textContent = 'COULD NOT LOAD MODELS'; console.error(e); });
    buildLineup();
  } else {
    const c = CARTRIDGES[cartId];
    document.title = c.name + ' · AK Platform';
    $('t1').textContent = c.name; $('t2').textContent = c.full;
    navLink('← All cartridges', './?view=cartridges').classList.add('home'); rifleSwitcher('cartridges');
    scrollEl.style.height = '1000vh';
    $('credit').textContent = 'Cartridges built in code from published case and bullet dimensions';
    const core = CORE.includes(cartId);
    setStages([
      { p: 0, h: 'The lineup', d: 'Eight cartridges to scale, largest to smallest.' },
      { p: CP.B0, h: c.name, d: 'Case, primer, powder and bullet, then a half section through the round.' },
      ...(core ? [{ p: CP.B0 + (CP.C0 - CP.B0) * 0.55, h: 'Bullet types', d: 'Four constructions in ' + c.name + ', each cut in half.' }] : []),
      { p: CP.C0, h: 'Chambered in', d: 'Rifles in this collection that fire the ' + c.name + '.' },
    ]);
    buildLineup(); ready = true; window.__ready = true; updLoad(1);
    const chambered = ORDER.filter(id => RIFLES[id].cartridge === cartId);
    const cards = $('cards');
    for (const id of chambered) { const a = document.createElement('a'); a.href = rifleLink(id); a.textContent = RIFLES[id].name + (RIFLES[id].ready ? ' →' : ' (soon)'); if (!RIFLES[id].ready) a.style.opacity = 0.55; cards.appendChild(a); }
    if (!chambered.length) { const s = document.createElement('a'); s.textContent = 'None in this collection'; s.style.pointerEvents = 'none'; cards.appendChild(s); }
    cartState.chambered = chambered.filter(id => RIFLES[id].ready);
    if (cartState.chambered.length) setTimeout(() => cartState.chambered.forEach(id => getRifle(id).load()), 2500);   // lazy prefetch
  }
  addEventListener('scroll', () => { if (introT < INTRO) introSkip = true; }, { passive: true });
}
function modelToggle() {
  const segEl = document.createElement('span'); segEl.className = 'seg'; nav.appendChild(segEl);
  for (const [k, t] of [['hybrid', 'Hybrid'], ['trellis', 'TRELLIS'], ['code', 'Code']]) {
    const b = document.createElement('button'); b.textContent = t; b.classList.toggle('on', MODEL === k);
    b.addEventListener('click', () => { if (k === MODEL) return; const q = new URLSearchParams(location.search); q.set('model', k); q.delete('p'); location.search = q.toString(); });
    segEl.appendChild(b);
  }
}
function applyTab() {
  [...nav.querySelectorAll('.seg button')].forEach(b => b.classList.toggle('on', b.dataset.k === landingTab));
  const rifTab = landingTab === 'rifles';
  for (const id in lineup) lineup[id].obj.group.visible = !rifTab;
  $('carousel').style.display = rifTab ? 'flex' : 'none';
  $('cards').style.display = 'flex'; document.body.classList.toggle('rifletab', rifTab);
  $('t2').textContent = rifTab ? 'Four rifles · field strip · cartridges' : 'Cartridges to scale';
  if (rifTab) {
    const cards = $('cards'); cards.innerHTML = '';
    for (const id of ORDER) { const a = document.createElement('a'); a.dataset.id = id; a.href = rifleLink(id); a.className = 'big';
      a.innerHTML = '<b>' + RIFLES[id].name + '</b><span>' + RIFLES[id].cal + (RIFLES[id].wip ? ' · work in progress' : '') + '</span>';
      a.addEventListener('mouseenter', () => { slide(ORDER.indexOf(id) - car.i); }); cards.appendChild(a); }
    updateCarousel(); setStages([]); snapCamera();
  }
  else {
    for (const id of ORDER) if (rifles[id]) rifles[id].setVisible(false);
    $('load').style.opacity = 0;
    buildLineup(); snapCamera();
    const cards = $('cards'); cards.innerHTML = '';
    for (const id of CORE) { const a = document.createElement('a'); a.href = cartLink(id); a.textContent = CARTRIDGES[id].name + ' →'; cards.appendChild(a); }
  }
  ready = true; window.__ready = true;
}

// rifle path segments: A fire | B case -> lineup | C breakdown + bullet types | D field strip
const R = { B0: 0.08, C0: 0.27, D0: 0.56, S0: 0.62 };
// cartridge path: A lineup | B breakdown + types | C rifles chambered
const CP = { B0: 0.26, C0: 0.74 };
const cartState = { chambered: [] };

/* ---------- intro turntable (rifle path), skippable ---------- */
const INTRO = 2.0;                                           // hold before the first burst
let introT = (Q.has('p') || Q.has('freeze') || Q.has('nointro') || MODE !== 'rifle') ? INTRO : 0, introSkip = false;
user.onTouch = () => { car.lastUser = now(); };
addEventListener('keydown', () => { if (introT < INTRO) introSkip = true; });

/* ---------- main loop ---------- */
let ready = false, simT = 0;
const clock = new THREE.Clock();
const CAPTURE = Q.has('capture');
let capT = 0, capP = null;
const ctr = new THREE.Vector3(), scr = new THREE.Vector3();

function tick() {
  const dt = CAPTURE ? 1 / 60 : Math.min(clock.getDelta(), 0.05);
  const t = CAPTURE ? (capT += dt) : clock.elapsedTime;
  simT += dt;
  if (ready) watchQuality(dt);
  if (capP != null) smoothP = capP;
  else smoothP += ((fixedP ?? scrollP) - smoothP) * (fixedP != null ? 1 : 1 - Math.exp(-dt * 7));
  const p = smoothP;
  let labels = [], heat = 0, shadowS = 1, ts = 99, blur = 0;
  const box = boxT.makeEmpty();
  let opts = { azim: 0.3, elev: 0.12 };

  if (MODE === 'landing') {
    if (landingTab === 'rifles') {
      if (now() - car.t0 > 8 && now() - car.lastUser > 12) slide(1);
      const def = RIFLES[ORDER[car.i]], r = rifles[def.id];
      if (r && r.ready && r.root.visible) {
        r.root.rotation.y = window.__rotY ?? t * 0.35; r.root.position.set(0, 0, 0);
        r.update(dt, simT, { firing: false, strip: 0 });
        const L = def.length; box.set(v3.set(-L / 2, -0.2 * L, -0.04), new THREE.Vector3(L / 2, 0.16 * L, 0.04));
        ctr.set(0, 0, 0);
      } else box.set(v3.set(-0.45, -0.18, -0.04), new THREE.Vector3(0.45, 0.14, 0.04));
      opts = { azim: 0.0, elev: 0.1, lift: 0.0 };
      setStage(-1); cap.style.opacity = 0;
    } else {
      // cartridge lineup: all labelled; the two with a cartridge path get a stronger label
      lineupBox(box); box.max.y += 0.03; opts = { azim: 0.25, elev: 0.14, margin: 1.2 };
      LINEUP.forEach((id, i) => {
        const o = lineup[id]; o.obj.group.rotation.y = Math.sin(t * 0.4 + i) * 0.25; o.obj.group.position.copy(o.slot);
        labels.push({ p: v3.copy(o.slot).add(new THREE.Vector3(0, o.obj.len + 0.002, 0)).clone(), text: CARTRIDGES[id].name, sub: CORE.includes(id) ? 'explore below' : '', dir: [0, -(0.5 + (i % 3) * 0.75)], big: CORE.includes(id) });
      });
      ctr.copy(LINE);
    }
  }

  if (MODE === 'rifle' && ready) {
    const def = rifle.def, cal = def.cartridge, hero = lineup[cal].obj;
    // no turntable: the rifle appears in its hero framing, holds ~2 s, then the firing loop starts
    const introYaw = 0;
    if (introT < INTRO) introT += dt;
    const introDone = true, fireReady = introT >= INTRO;
    const si = stageAt(p);
    setStage(introDone ? si : -1); if (!introDone) cap.style.opacity = 0;

    // A: fire. B: case to lineup. C: breakdown + types. D: field strip
    const uB = seg(p, R.B0, R.C0), uC = seg(p, R.C0, R.D0), uD = seg(p, R.D0, 1), strip = seg(p, R.S0, 0.975);
    const firing = p < R.B0 * 0.8 && fireReady && !Q.has('nofire');
    const sway = (1 - 0.75 * Math.min(1, strip * 4)) * (user.dragging ? 0 : 1);
    rifle.rig.rotation.y = Math.sin(t * 0.32) * 0.2 * sway * (introDone ? 1 : 0) * (1 - sm(p, R.B0 * 0.6, R.B0)) + introYaw;
    rifle.rig.rotation.x = 0.03 + Math.sin(t * 0.21) * 0.025 * sway;
    rifle.rig.position.y = Math.sin(t * 0.8) * 0.006;
    if (window.__still) { rifle.rig.rotation.set(0, 0, 0); rifle.rig.position.y = 0; }
    if (p > R.B0 + 0.03) rifle.clearCasings();
    ts = rifle.update(dt, simT, { firing, strip, freeze: Q.has('freeze') && p < R.B0 ? parseFloat(Q.get('freeze')) : null });
    heat = Q.has('freeze') ? 0.8 : rifle.heat;

    // weights: camera on the rifle (A, D) vs the cartridges (B, C)
    const wCart = sm(uB, 0.08, 0.55) * (1 - sm(uD, 0.0, 0.14));
    rifle.box(boxA);

    // B: hero case flight from the ejection port into its lineup slot
    const slot = lineup[cal].slot, others = LINEUP.filter(id => id !== cal);
    const reveal = sm(uB, 0.3, 0.62) * (1 - sm(uC, 0.0, 0.1));
    for (const id of others) { const o = lineup[id].obj; o.group.position.copy(lineup[id].slot); o.group.rotation.set(0, 0, 0); o.group.scale.setScalar(Math.max(1e-4, reveal)); o.group.visible = reveal > 0.002; }
    const hp = hero.parts;
    if (p < R.C0) {
      hero.group.scale.setScalar(1);
      const f = sm(uB, 0.02, 0.6);
      rifle.portWorld(v3);
      const start = v3.clone(), apex = start.clone().add(new THREE.Vector3(0.18, 0.22, 0.12)), end = slot.clone();
      const pre = end.clone().add(new THREE.Vector3(0, 0.12, 0.02));
      const b = (a, c, d, e, k) => a.clone().multiplyScalar((1 - k) ** 3).add(c.clone().multiplyScalar(3 * (1 - k) ** 2 * k)).add(d.clone().multiplyScalar(3 * (1 - k) * k * k)).add(e.clone().multiplyScalar(k ** 3));
      hero.group.position.copy(b(start, apex, pre, end, f));
      const tumble = (1 - f) ** 2 * 11, q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2 * (1 - sm(f, 0.55, 1))));
      hero.group.quaternion.copy(q0).multiply(new THREE.Quaternion().setFromAxisAngle(v3.set(0.3, 1, 0.5).normalize(), tumble));
      const vis = uB > 0.015; setOpacity(hero.group, vis ? 1 : 0);
      // a spent case flies: the bullet and powder are not there until it lands, then a fresh bullet seats
      const seatK = sm(uB, 0.62, 0.78);
      for (const h of ['back', 'front']) { hp.bullet[h].visible = seatK > 0.01; hp.bullet[h].position.y = hero.seat + (1 - seatK) * 0.05; if (hp.powder) { hp.powder[h].visible = seatK > 0.5; hp.powder[h].position.y = 0; } hp.primer[h].position.y = 0; }
      if (seatK > 0.01 && seatK < 0.999) setOpacity(hp.bullet.back, seatK), setOpacity(hp.bullet.front, seatK);
      hero.front.position.z = 0;
      hero.group.position.z += sm(uB, 0.8, 0.96) * 0.03;                   // steps forward
      const la = sm(uB, 0.62, 0.72) * (1 - sm(uB, 0.98, 1));
      if (la > 0.01) {
        const first = lineup[LINEUP[0]], last = lineup[LINEUP[LINEUP.length - 1]];
        labels.push({ p: first.slot.clone().add(new THREE.Vector3(0, first.obj.len, 0)), text: CARTRIDGES[LINEUP[0]].name, sub: 'largest', dir: [-0.6, -1], a: la });
        labels.push({ p: last.slot.clone().add(new THREE.Vector3(0, last.obj.len, 0)), text: CARTRIDGES[LINEUP[LINEUP.length - 1]].name, sub: 'smallest', dir: [0.6, -1], a: la });
        labels.push({ p: hero.group.position.clone().add(new THREE.Vector3(0, hero.len, 0)), text: CARTRIDGES[cal].name, sub: 'fired by the ' + def.name, dir: [0.4, -1.6], a: la * sm(uB, 0.8, 0.9), big: true });
      }
      lineupBox(boxB);
    } else {
      for (const h of ['back', 'front']) { hp.bullet[h].visible = true; if (hp.powder) hp.powder[h].visible = true; }
      setOpacity(hero.group, 1); hero.group.scale.setScalar(Math.max(1e-4, 1 - sm(uC, 0.48, 0.56))); hero.group.visible = uC < 0.56;
      heroPose(hero, sm(uC, 0.06, 0.2));
      const cut = sm(uC, 0.3, 0.42);
      breakdown(hero, sm(uC, 0.17, 0.3), cut);
      if (uC < 0.52) { const la = sm(uC, 0.22, 0.3) * (1 - sm(uC, 0.46, 0.52)); if (la > 0.01) labels.push(...partLabels(hero, la)); }
      hero.group.updateMatrixWorld(true); boxB.setFromObject(hero.group, false); boxB.expandByScalar(0.006);
      if (uC < 0.2) lerpBox(boxB, lineupBox(new THREE.Box3()), boxB.clone(), sm(uC, 0.0, 0.2));   // continuous hand-off from the lineup
      // bullet types
      const BS = bulletSet(cal), bt = sm(uC, 0.5, 0.62) * (1 - sm(uD, 0.08, 0.14));
      if (bt > 0.001) {
        boxB.makeEmpty();
        BS.items.forEach((it, i) => {
          const g = it.b.group, y = PRESENT.y + 0.0225 - i * 0.015;
          g.visible = true; g.position.set(PRESENT.x - it.b.len / 2 + (1 - bt) * 0.03, y, PRESENT.z); g.scale.setScalar(Math.max(1e-4, bt));
          it.b.front.position.z = 0.02; setOpacity(it.b.front, 0);
          boxB.expandByObject(g);
          labels.push({ p: v3.set(PRESENT.x - it.b.len / 2 - 0.001, y, 0).clone(), text: it.t.name, sub: it.t.sub, dir: [-1, 0], a: sm(uC, 0.6, 0.68) * (1 - sm(uD, 0, 0.04)) });
        });
        boxB.expandByScalar(0.002); boxB.min.x -= 0.012;
      } else for (const id in bulletSets) bulletSets[id].items.forEach(it => { it.b.group.visible = false; });
    }
    if (p < R.C0) for (const id in bulletSets) bulletSets[id].items.forEach(it => { it.b.group.visible = false; });
    hero.group.visible = hero.group.visible && (p < R.D0 + 0.02);

    // rifle -> (rifle + cartridges) -> cartridges, so the camera pulls back to show both on the way
    const boxU = boxT.clone().copy(boxA).union(boxB);
    if (wCart < 0.5) lerpBox(box, boxA, boxU, wCart * 2); else lerpBox(box, boxU, boxB, (wCart - 0.5) * 2);
    const cartView = p >= R.C0 && p < R.D0;
    opts = { azim: THREE.MathUtils.lerp(0.32, cartView ? 0.22 : 0.26, wCart) - 0.2 * strip, elev: THREE.MathUtils.lerp(0.1, 0.16, wCart) + 0.1 * strip, margin: cartView ? (uC > 0.5 ? 1.12 : 1.5) : null };
    if (strip > 0.98) labels.push(...rifleCallouts(rifle, sm(p, 0.97, 0.99)));
    // focus blur on the part being removed
    const n = def.strip.length, k = Math.min(n - 1, Math.floor(strip * n));
    if (strip > 0 && strip < 0.99 && quality.level < 2) {
      const node = rifle.nodes[def.strip[k].part];
      if (node) { scr.set(0, 0, 0).applyMatrix4(node.pivot.matrixWorld).project(camera); finish.uniforms.uFocus.value.set(scr.x * 0.5 + 0.5, scr.y * 0.5 + 0.5); finish.uniforms.uFocusR.value = 0.16;
        blur = Math.sin(Math.min(1, rifle.stripU[k]) * Math.PI) * 0.9 * (user.dragging ? 0 : 1); }
    }
    $('hint').style.opacity = p < 0.02 && introDone ? 1 : 0;
    box.getCenter(ctr);
    shadowS = THREE.MathUtils.lerp(1, 0.2, wCart);
  }

  if (MODE === 'cartridge' && ready) {
    const c = CARTRIDGES[cartId], hero = lineup[cartId].obj, core = CORE.includes(cartId);
    const uA = seg(p, 0, CP.B0), uB = seg(p, CP.B0, CP.C0), uC = seg(p, CP.C0, 1);
    for (const id of LINEUP) if (id !== cartId) { const o = lineup[id].obj, k = 1 - sm(uB, 0.0, 0.1); o.group.position.copy(lineup[id].slot); o.group.rotation.set(0, 0, 0); o.group.scale.setScalar(Math.max(1e-4, k)); o.group.visible = k > 0.002; }
    if (p < CP.B0) {
      hero.group.position.copy(lineup[cartId].slot); hero.group.rotation.set(0, 0, 0); hero.group.position.z += sm(uA, 0.25, 0.5) * 0.03;
      breakdown(hero, 0, 0); setOpacity(hero.group, 1); hero.group.scale.setScalar(1); hero.group.visible = true;
      const la = sm(uA, 0.1, 0.25);
      const first = lineup[LINEUP[0]], last = lineup[LINEUP[LINEUP.length - 1]];
      labels.push({ p: first.slot.clone().add(new THREE.Vector3(0, first.obj.len, 0)), text: CARTRIDGES[LINEUP[0]].name, sub: 'largest', dir: [-0.6, -1], a: la });
      labels.push({ p: last.slot.clone().add(new THREE.Vector3(0, last.obj.len, 0)), text: CARTRIDGES[LINEUP[LINEUP.length - 1]].name, sub: 'smallest', dir: [0.6, -1], a: la });
      labels.push({ p: hero.group.position.clone().add(new THREE.Vector3(0, hero.len, 0)), text: c.name, sub: c.full, dir: [0.4, -1.6], a: sm(uA, 0.3, 0.45), big: true });
      lineupBox(box); opts = { azim: 0.25, elev: 0.13, margin: 1.25 };
    } else {
      const typesEnd = core ? 0.98 : 0.6;
      const hs = 1 - (core ? sm(uB, 0.48, 0.56) : sm(uC, 0, 0.1));
      setOpacity(hero.group, 1); hero.group.scale.setScalar(Math.max(1e-4, hs)); hero.group.visible = hs > 0.002;
      heroPose(hero, sm(uB, 0.06, 0.2));
      breakdown(hero, sm(uB, 0.17, 0.3), sm(uB, 0.3, 0.42));
      const la = sm(uB, 0.22, 0.3) * (1 - (core ? sm(uB, 0.46, 0.52) : sm(uC, 0, 0.05)));
      if (la > 0.01) labels.push(...partLabels(hero, la));
      hero.group.updateMatrixWorld(true); box.setFromObject(hero.group, false); box.expandByScalar(0.006);
      if (uB < 0.2) lerpBox(box, lineupBox(new THREE.Box3()), box.clone(), sm(uB, 0.0, 0.2));
      opts = { azim: 0.22, elev: 0.16, margin: uB > 0.5 && core ? 1.12 : 1.5 };
      if (core) {
        const BS = bulletSet(cartId), bt = sm(uB, 0.5, 0.62) * (1 - sm(uC, 0.0, 0.08));
        BS.items.forEach((it, i) => { it.b.group.visible = bt > 0.001; });
        if (bt > 0.001) {
          box.makeEmpty();
          BS.items.forEach((it, i) => {
            const g = it.b.group, y = PRESENT.y + 0.0225 - i * 0.015;
            g.position.set(PRESENT.x - it.b.len / 2 + (1 - bt) * 0.03, y, PRESENT.z); g.scale.setScalar(Math.max(1e-4, bt));
            it.b.front.position.z = 0.02; setOpacity(it.b.front, 0); box.expandByObject(g);
            labels.push({ p: v3.set(PRESENT.x - it.b.len / 2 - 0.001, y, 0).clone(), text: it.t.name, sub: it.t.sub, dir: [-1, 0], a: sm(uB, 0.6, 0.68) * (1 - sm(uC, 0, 0.05)) });
          });
          box.expandByScalar(0.002); box.min.x -= 0.012;
        }
      }
      // C: rifles chambered in this round, one at a time on a turntable
      const wR = sm(uC, 0.04, 0.2);
      const ids = cartState.chambered;
      for (const id of ORDER) if (rifles[id] && !ids.includes(id)) rifles[id].setVisible(false);
      if (ids.length && wR > 0.001) {
        const k = Math.min(ids.length - 1, Math.floor(seg(uC, 0.1, 1) * ids.length * 0.9999));
        ids.forEach((id, j) => {
          const r = getRifle(id); if (!r.ready) { r.load(); return; }
          r.root.visible = j === k; r.root.position.set(0, 0, 0); r.root.rotation.y = t * 0.35;
          if (j === k) r.update(dt, simT, { firing: false, strip: 0 });
        });
        const L = RIFLES[ids[k]].length;
        boxA.set(v3.set(-L / 2, -0.2 * L, -0.04), new THREE.Vector3(L / 2, 0.16 * L, 0.04));
        lerpBox(box, box.clone(), boxA, wR);
        [...$('cards').children].forEach(a => a.classList.toggle('on', a.textContent.startsWith(RIFLES[ids[k]].name)));
        opts = { azim: THREE.MathUtils.lerp(opts.azim, 0, wR), elev: THREE.MathUtils.lerp(opts.elev, 0.1, wR), margin: wR > 0.5 ? null : 1.5, lift: 0 };
      } else for (const id of ids) if (rifles[id]) rifles[id].setVisible(false);
      $('cards').style.display = uC > 0.08 || !ids.length && uC > 0.05 ? 'flex' : 'none';
    }
    box.getCenter(ctr);
    shadowS = THREE.MathUtils.lerp(0.2, 1, sm(uC, 0.04, 0.2));
  }

  if (!box.isEmpty()) {
    const s = frame(box, dt, opts);
    if (MODE === 'landing') shadowS = landingTab === 'rifles' ? 1 : 0.25;
    if (ts >= 0 && ts < 0.4 && rifle) shake((0.0016 + 0.0012 * rifle.recoilBuild) * Math.exp(-ts * 20), t);
    // muzzle heat shimmer
    if (rifle && rifle.ready && heat > 0.001) { rifle.muzzleWorld(scr).project(camera); finish.uniforms.uHeatPos.value.set(scr.x * 0.5 + 0.5, scr.y * 0.5 + 0.5); finish.uniforms.uHeatScale.value = 0.06 / user.zoom; }
    finish.uniforms.uHeat.value = Q.has('noheat') ? 0 : heat;
    finish.uniforms.uTime.value = simT;
    finish.uniforms.uBlur.value += (blur - finish.uniforms.uBlur.value) * (1 - Math.exp(-dt * 6));
  }
  drawLabels(labels);
  render(dt, ctr, shadowS);
  window.__frames = (window.__frames || 0) + 1;
}

function rifleCallouts(r, a) {
  const out = [];
  for (const k in r.def.call) {
    const n = r.nodes[k], spec = r.def.call[k], lab = r.def.labels[k]; if (!n) continue;
    n.pivot.updateMatrixWorld(true);
    out.push({ p: v3.set(spec.a[0] * n.half.x, spec.a[1] * n.half.y, n.half.z).applyMatrix4(n.pivot.matrixWorld).clone(), text: lab[0], sub: lab[1], dir: spec.dir, a });
  }
  return out;
}

setup();
if (CAPTURE) window.__advance = (n, p) => { for (let i = 0; i < n; i++) { if (p) capP = p(capT); tick(); } };
else renderer.setAnimationLoop(tick);
window.__setP = v => { capP = v; };
