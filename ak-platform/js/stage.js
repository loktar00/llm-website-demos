// Shared studio: renderer, grey sweep, lightbox reflections, contact shadow, post chain,
// adaptive quality, orbit/zoom layered on a scripted camera that frames a box.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';

export const Q = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
let pixelRatio = Math.min(devicePixelRatio, 2);
renderer.setPixelRatio(pixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.debug.checkShaderErrors = false;   // production: skip program info logs (ANGLE prints harmless notes for GTAO)

export const scene = new THREE.Scene();
scene.background = (() => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
  const r = g.createRadialGradient(256, 215, 0, 256, 256, 380);
  r.addColorStop(0, '#d9d9d9'); r.addColorStop(0.5, '#c4c4c4'); r.addColorStop(1, '#9d9d9d');
  g.fillStyle = r; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

function lightbox() {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshBasicMaterial({ color: 0x404244, side: THREE.BackSide }));
  room.position.y = 2.5; s.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ color: 0x6a6a6a }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.4; s.add(floor);
  const panel = (w, h, x, y, z, ry, rx, k, col = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m);
  };
  panel(4.5, 1.6, -1.5, 5.5, 1.5, 0, Math.PI / 2, 14, 0xfff2e2);
  panel(0.35, 5, 5.8, 2.2, 0.5, -Math.PI / 2, 0, 18);
  panel(0.35, 5, -5.8, 2.2, -1.0, Math.PI / 2, 0, 9, 0xe2ecff);
  panel(6, 0.25, 0, 3.8, -5.8, 0, 0, 12);
  panel(3, 2.2, 0.5, 1.2, 5.8, Math.PI, 0, 4);
  return s;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(lightbox(), 0.015).texture;
scene.environmentIntensity = 0.75;

export const camera = new THREE.PerspectiveCamera(30, 1, 0.005, 30);
const key = new THREE.DirectionalLight(0xfff1e0, 2.2); key.position.set(-0.8, 2.2, 1.6); scene.add(key);
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.7); fill.position.set(2, 0.4, 1.2); scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 1.4); rim.position.set(0.4, 1.2, -2.2); scene.add(rim);
export const sweep = new THREE.SpotLight(0xffffff, 0, 6, 0.35, 0.8, 1); sweep.position.set(0, 1.5, 2.2); scene.add(sweep); scene.add(sweep.target);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 0.25));

/* ---------- Contact shadow: depth from below, blurred, on an invisible floor that follows the subject ---------- */
export const floor = { y: -0.3 };
const SH = { w: 2.6, h: 1.4, camH: 1.0, blur: 2.6 };
const shadowGroup = new THREE.Group(); scene.add(shadowGroup);
const shRT = new THREE.WebGLRenderTarget(512, 276); shRT.texture.generateMipmaps = false;
const shRTb = new THREE.WebGLRenderTarget(512, 276); shRTb.texture.generateMipmaps = false;
const shPlane = new THREE.Mesh(new THREE.PlaneGeometry(SH.w, SH.h).rotateX(Math.PI / 2),
  new THREE.MeshBasicMaterial({ map: shRT.texture, opacity: 0.75, transparent: true, depthWrite: false }));
shPlane.renderOrder = 1; shPlane.scale.y = -1; shPlane.userData.noAO = true; shadowGroup.add(shPlane);
const shBlurPlane = new THREE.Mesh(new THREE.PlaneGeometry(SH.w, SH.h).rotateX(Math.PI / 2)); shBlurPlane.visible = false; shBlurPlane.layers.set(1); shadowGroup.add(shBlurPlane);
const shCam = new THREE.OrthographicCamera(-SH.w / 2, SH.w / 2, SH.h / 2, -SH.h / 2, 0, SH.camH);
shCam.rotation.x = Math.PI / 2; shCam.layers.set(1); shadowGroup.add(shCam);
const shDepth = new THREE.MeshDepthMaterial();
shDepth.userData.darkness = { value: 1.4 };
shDepth.onBeforeCompile = sh => {
  sh.uniforms.darkness = shDepth.userData.darkness;
  sh.fragmentShader = 'uniform float darkness;\n' + sh.fragmentShader.replace(
    'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );');
};
shDepth.depthTest = false; shDepth.depthWrite = false;
const hBlur = new THREE.ShaderMaterial(HorizontalBlurShader); hBlur.depthTest = false;
const vBlur = new THREE.ShaderMaterial(VerticalBlurShader); vBlur.depthTest = false;
function blurShadow(amount) {
  shBlurPlane.visible = true;
  shBlurPlane.material = hBlur; hBlur.uniforms.tDiffuse.value = shRT.texture; hBlur.uniforms.h.value = amount / 256;
  renderer.setRenderTarget(shRTb); renderer.render(shBlurPlane, shCam);
  shBlurPlane.material = vBlur; vBlur.uniforms.tDiffuse.value = shRTb.texture; vBlur.uniforms.v.value = amount / 256;
  renderer.setRenderTarget(shRT); renderer.render(shBlurPlane, shCam);
  shBlurPlane.visible = false;
}
let shFrame = 0;
function renderContactShadow(center, scale) {
  shadowGroup.position.set(center.x, floor.y, center.z * 0);
  shadowGroup.scale.setScalar(scale);
  if (shFrame++ % 2) return;
  const bg = scene.background; scene.background = null;
  scene.overrideMaterial = shDepth;
  const cc = renderer.getClearAlpha(); renderer.setClearAlpha(0);
  renderer.setRenderTarget(shRT); renderer.clear(); renderer.render(scene, shCam);
  scene.overrideMaterial = null;
  blurShadow(SH.blur); blurShadow(SH.blur * 0.4);
  renderer.setRenderTarget(null); renderer.setClearAlpha(cc); scene.background = bg;
}

/* ---------- Post ---------- */
export const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
export const gtao = new GTAOPass(scene, camera, 2, 2);
const AO = { radius: 0.06, thickness: 0.02 };
gtao.updateGtaoMaterial({ radius: AO.radius, distanceExponent: 1.5, thickness: AO.thickness, scale: 1.25, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
gtao.blendIntensity = 0.9;
{ // effects and the shadow card stay out of the AO g-buffer; the background texture would write near depth
  const ov = gtao.overrideVisibility.bind(gtao), rv = gtao.restoreVisibility.bind(gtao);
  let bgStash = null;
  gtao.overrideVisibility = function () { ov(); bgStash = scene.background; scene.background = null; scene.traverse(o => { if (o.userData.noAO) o.visible = false; }); };
  gtao.restoreVisibility = function () { rv(); scene.background = bgStash; };
}
composer.addPass(gtao);
export const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 2.4);
composer.addPass(bloom);
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
    uHeat: { value: 0 }, uHeatPos: { value: new THREE.Vector2(0.5, 0.5) }, uHeatScale: { value: 0.1 },
    uFocus: { value: new THREE.Vector2(0.5, 0.5) }, uFocusR: { value: 0.2 }, uBlur: { value: 0 }, uVig: { value: 0.32 }, uAspect: { value: 1 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime;
    uniform float uHeat; uniform vec2 uHeatPos; uniform float uHeatScale;
    uniform vec2 uFocus; uniform float uFocusR; uniform float uBlur; uniform float uVig; uniform float uAspect;
    varying vec2 vUv;
    float n2(vec2 p){ return sin(p.x) * sin(p.y); }
    void main(){
      vec2 uv = vUv;
      if (uHeat > 0.001) {
        vec2 d = (uv - uHeatPos) / uHeatScale; d.x *= uAspect;
        float above = smoothstep(-0.25, 0.4, d.y) * (1.0 - smoothstep(0.6, 2.6, d.y));
        float fall = exp(-dot(vec2(d.x * 0.7, (d.y - 0.6) * 0.45), vec2(d.x * 0.7, (d.y - 0.6) * 0.45)));
        float w = uHeat * above * fall;
        vec2 q = uv * vec2(90.0, 60.0) + vec2(0.0, -uTime * 7.0);
        uv += vec2(n2(q + vec2(1.7, 0.3)), n2(q.yx * 1.3 + 4.1)) * 0.0045 * w;
      }
      vec4 col = texture2D(tDiffuse, uv);
      if (uBlur > 0.001) {
        vec2 fd = uv - uFocus; fd.x *= uAspect;
        float amt = uBlur * smoothstep(uFocusR, uFocusR * 2.6, length(fd));
        if (amt > 0.01) {
          vec4 acc = col; float wsum = 1.0;
          for (int i = 0; i < 12; i++) {
            float a = float(i) * 2.39996; float r = sqrt(float(i) + 0.5) / 3.5;
            vec2 o = vec2(cos(a), sin(a)) * r * amt * 3.2 / uRes;
            acc += texture2D(tDiffuse, uv + o); wsum += 1.0;
          }
          col = acc / wsum;
        }
      }
      vec2 vd = vUv - 0.5; vd.x *= uAspect * 0.8;
      col.rgb *= 1.0 - uVig * smoothstep(0.35, 1.05, length(vd));
      gl_FragColor = col;
    }`,
};
export const finish = new ShaderPass(FinishShader);
composer.addPass(finish);
composer.addPass(new OutputPass());
if (Q.has('noao')) gtao.enabled = false;

/* adaptive quality: step heavy passes down if frame time climbs, never back up mid-session */
export const quality = { level: 0, ema: 1 / 60, t: 0 };
function applyQuality() {
  gtao.enabled = quality.level < 1 && !Q.has('noao');
  if (quality.level >= 2) finish.uniforms.uBlur.value = 0;
  if (quality.level >= 3) { pixelRatio = Math.min(pixelRatio, 1); resize(); }
  if (quality.level >= 4) { pixelRatio = 0.75; resize(); }
  window.__quality = quality.level;
}
export function watchQuality(dt) {
  quality.ema += (dt - quality.ema) * 0.05; quality.t += dt;
  if (quality.t > 2.5 && quality.ema > 1 / 48 && quality.level < 4) { quality.level++; quality.t = 0; applyQuality(); }
}
export function resetQualityTimer() { quality.t = 0; quality.ema = 1 / 60; }

export function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false);
  composer.setPixelRatio(pixelRatio); composer.setSize(w, h);
  bloom.resolution.set(w / 2, h / 2);
  finish.uniforms.uRes.value.set(w * pixelRatio, h * pixelRatio); finish.uniforms.uAspect.value = w / h;
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

/* ---------- User view: orbit + zoom over the scripted camera ---------- */
export const user = { yaw: 0, pitch: 0, zoom: 1, tYaw: 0, tPitch: 0, tZoom: 1, last: -1e9, dragging: false, onTouch: null };
const ZMIN = 0.35, ZMAX = 2.2;
export const now = () => performance.now() / 1000;
function touchUser() { user.last = now(); user.onTouch && user.onTouch(); }
function zoomBy(f) { user.tZoom = THREE.MathUtils.clamp(user.tZoom * f, ZMIN, ZMAX); touchUser(); }
function updateUser(dt) {
  if (now() - user.last > 6 && !user.dragging) {
    const k = Math.exp(-dt * 1.4);
    user.tYaw *= k; user.tPitch *= k; user.tZoom = 1 + (user.tZoom - 1) * k;
  }
  const a = 1 - Math.exp(-dt * 9);
  user.yaw += (user.tYaw - user.yaw) * a; user.pitch += (user.tPitch - user.pitch) * a; user.zoom += (user.tZoom - user.zoom) * a;
}
const pointers = new Map();
let pinch0 = 0, zoom0 = 1, dragStart = null;
const onUI = e => e.target.closest && e.target.closest('#view, #nav, #carousel, #cards, a, button');
addEventListener('pointerdown', e => {
  if (onUI(e) || (e.pointerType === 'mouse' && e.button !== 0)) return;
  user.onTouch && user.onTouch();
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) { dragStart = { x: e.clientX, y: e.clientY, decided: e.pointerType === 'mouse' }; if (dragStart.decided) beginDrag(); }
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = user.tZoom; beginDrag(); }
});
function beginDrag() { user.dragging = true; document.body.classList.add('grabbing'); touchUser(); }
function endDrag() { user.dragging = false; document.body.classList.remove('grabbing'); touchUser(); }
addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (pointers.size >= 2) {
    const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch0 > 0) { user.tZoom = THREE.MathUtils.clamp(zoom0 * pinch0 / d, ZMIN, ZMAX); touchUser(); }
    return;
  }
  if (dragStart && !dragStart.decided) {                       // touch: only a mostly-horizontal start orbits
    const tx = e.clientX - dragStart.x, ty = e.clientY - dragStart.y;
    if (Math.hypot(tx, ty) < 8) return;
    dragStart.decided = true;
    if (Math.abs(tx) > Math.abs(ty) * 1.2) beginDrag(); else { pointers.delete(e.pointerId); return; }
  }
  if (!user.dragging) return;
  const s = 5.5 / Math.max(innerWidth, 900);
  user.tYaw -= dx * s; user.tPitch = THREE.MathUtils.clamp(user.tPitch + dy * s, -0.16, 1.1);
  touchUser();
});
function release(e) {
  if (!pointers.delete(e.pointerId)) return;
  if (pointers.size < 2) pinch0 = 0;
  if (pointers.size === 0) { dragStart = null; if (user.dragging) endDrag(); }
}
addEventListener('pointerup', release); addEventListener('pointercancel', release);
addEventListener('wheel', e => {
  user.onTouch && user.onTouch();
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault(); zoomBy(Math.exp(e.deltaY * 0.0015));
}, { passive: false });
for (const ev of ['gesturestart', 'gesturechange']) addEventListener(ev, e => e.preventDefault());
document.getElementById('zin').addEventListener('click', () => zoomBy(0.8));
document.getElementById('zout').addEventListener('click', () => zoomBy(1.25));
document.getElementById('zreset').addEventListener('click', () => { user.tYaw = user.tPitch = 0; user.tZoom = 1; user.last = -1e9; });
window.__user = user;

/* ---------- Framing: ease the camera to keep a box in view from a given azimuth/elevation ---------- */
const look = new THREE.Vector3(0, 0, 0), size = new THREE.Vector3(), ctr = new THREE.Vector3(), v3 = new THREE.Vector3();
export const view = { dist: 1.6, look, sizeMax: 1 };
let snap = true;
export function snapCamera() { snap = true; }
export function frame(box, dt, { azim = 0.3, elev = 0.12, margin = null, lift = 0.035, rate = 3 } = {}) {
  box.getSize(size); box.getCenter(ctr);
  const vfov = THREE.MathUtils.degToRad(camera.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const m = margin ?? (innerWidth < 700 ? 1.18 : 1.36);
  const need = Math.max((size.y * m) / 2 / Math.tan(vfov / 2), (size.x * m) / 2 / Math.tan(hfov / 2)) + size.z * 0.6;
  const k = snap ? 1 : 1 - Math.exp(-dt * rate);
  view.dist += (need - view.dist) * k;
  ctr.y -= size.y * lift; look.lerp(ctr, k);
  snap = false;
  updateUser(dt);
  const e = THREE.MathUtils.clamp(elev + user.pitch, -0.3, 1.35), a = azim + user.yaw;
  camera.position.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).multiplyScalar(view.dist * user.zoom).add(look);
  if (window.__cam) camera.position.set(...window.__cam);
  camera.lookAt(window.__look ? v3.set(...window.__look) : look);
  view.sizeMax = Math.max(size.x, size.y, 1e-3);
  // AO, shadow and floor follow the subject's scale: millimetre cartridges vs metre rifles
  const s = THREE.MathUtils.clamp(view.dist / 1.6, 0.04, 2);
  gtao.updateGtaoMaterial({ radius: AO.radius * s, thickness: AO.thickness * s });
  floor.y += ((box.min.y - 0.07 * Math.min(1, s * 1.2)) - floor.y) * k;
  return s;
}
export function render(dt, center, shadowScale) {
  renderContactShadow(center, shadowScale);
  composer.render(dt);
}
export function shake(a, t) {
  camera.position.add(v3.set(Math.sin(t * 91) * a, Math.sin(t * 77 + 1) * a, 0).applyQuaternion(camera.quaternion));
}
