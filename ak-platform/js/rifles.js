// Rifle definitions. Placement is authored in the pixel space of each rifle's field-stripped
// body image (the body mesh maps linearly onto it); img.px0..px1 spans the real overall length.
// rot: euler degrees for the raw TRELLIS mesh so +X = muzzle, +Y = up, +Z = the rifle's right side.
// box: target extents in body-image px. depth: Z thickness in metres. Cover/handle values in mm or m as noted.
const AK_STEEL = { metal: 0.85, rough: 0.8, tint: [0.86, 0.9, 1.0] };

export const RIFLES = {
  ak47: {
    id: 'ak47', name: 'AK-47', cal: '7.62×39 mm', cartridge: '762x39', length: 0.87,
    blurb: 'Milled receiver, 1949', ready: true,
    img: { px0: 43, px1: 1323, bore: 287 },
    parts: {
      body:     { file: 'models/ak47/body.glb',     rot: [0, 0, 0],     box: [43, 1323, 208, 503], depth: null,  mat: AK_STEEL },
      magazine: { file: 'models/ak47/magazine.glb', rot: [-90, 0, 180], box: [564, 774, 300, 604], depth: 0.032, mat: { metal: 0.7, rough: 0.85, tint: [0.9, 0.92, 1.0] } },
      cover:    { code: true },
      spring:   { file: 'models/ak47/spring.glb',   rot: [0, 0, 0],     box: [404, 690, 244, 274], depth: 0.02,  mat: { metal: 1.0, rough: 0.55, tint: [1, 1, 1] } },
      gastube:  { file: 'models/ak47/gastube.glb',  rot: [0, 90, 0],    box: [834, 1160, 224, 280], depth: 0.04, mat: AK_STEEL },
      carrier:  { file: 'models/ak47/carrier.glb',  rot: [0, 180, 0],   box: [559, 1101, 244, 284], depth: 0.03,  mat: { metal: 1.0, rough: 0.65, tint: [0.9, 0.92, 1.0] } },
      bolt:     { file: 'models/ak47/bolt.glb',     rot: [0, -90, 0],   box: [731, 823, 258, 282], depth: 0.024, mat: { metal: 1.0, rough: 0.6, tint: [1, 1, 1] } },
    },
    // dust cover fitted to the receiver (mm, rifle space); measured from the mesh and the reference photo
    cover: { zc: -2.45, hwi: 21.2, t: 0.8, ys: 19.0, ci: 38.7, n: 2, xr: -208, xf: 17, yb: 16.3, rearRound: 27, rearMin: 0.42,
      ribs: [0.16, 0.3, 0.44, 0.58, 0.72, 0.86], plateY: 17.8 },
    handle: { x: 0.008, py: 258, z: 0.012, stroke: 0.115 },
    trim: [[-0.067, 0.024, 0.012], [-0.025, 1, 1]],          // baked duplicate handle cut out of the body
    rod: { x0: 0.200, x1: 0.427, y: -0.0179, z: -0.0026 },   // cleaning rod: from its seat under the lower handguard to the front sight base
    muzzlePx: 1328, port: [-0.03, 0.017, 0.03],
    fire: { mode: 'auto', rpmDt: 0.1, burst: [4, 6], pause: 2.0 }, tone: { rate: 1, gain: 0.8 },
    strip: [
      { part: 'magazine', h: 'Magazine',      d: 'Press the catch and drop it out of the magazine well.' },
      { part: 'cover',    h: 'Dust cover',    d: 'Press the recoil spring guide and lift the receiver cover away.' },
      { part: 'spring',   h: 'Recoil spring', d: 'The spring and its guide rod slide forward and out of the receiver.' },
      { part: 'carrier',  h: 'Bolt carrier',  d: 'Draw the carrier fully back and lift it; the gas piston slides out of the gas tube with it.' },
      { part: 'bolt',     h: 'Bolt',          d: 'Rotate the bolt and slide it out of the carrier.' },
      { part: 'gastube',  h: 'Gas tube',      d: 'Last, turn the lock lever up and lift the gas tube off with the upper handguard.' },
    ],
    paths: {
      magazine: [[0, [0, 0, 0], [0, 0, 0]], [0.45, [0, -0.13, 0], [0, 0, 0]], [1, [-0.36, -0.22, 0.0], [0, 0, 0]]],
      cover:    [[0, [0, 0, 0], [0, 0, 0]], [0.3, [-0.006, 0.03, 0], [0, 0, 4]], [0.6, [-0.03, 0.12, 0.0], [0, 0, 0]], [1, [-0.03, 0.17, 0], [0, 0, 0]]],
      spring:   [[0, [0, 0, 0], [0, 0, 0]], [0.2, [0.01, 0, 0], [0, 0, 0]], [0.45, [0.01, 0.07, 0], [0, 0, 8]], [1, [-0.03, 0.27, 0], [0, 0, 0]]],
      gastube:  [[0, [0, 0, 0], [0, 0, 0]], [0.3, [0, 0.02, 0], [0, 0, -5]], [0.6, [0.02, 0.1, 0], [0, 0, 0]], [1, [0.06, 0.17, 0], [0, 0, 0]]],
      carrier:  [[0, [0, 0, 0], [0, 0, 0]], [0.28, [-0.105, 0, 0], [0, 0, 0]], [0.42, [-0.115, 0.012, 0], [0, 0, -4]], [0.68, [-0.27, 0.03, 0], [0, 0, -6]], [0.78, [-0.3, 0.07, 0.03], [0, 0, -2]], [0.88, [-0.17, -0.09, 0.14], [0, 0, 0]], [1, [-0.08, -0.36, 0.0], [0, 0, 0]]],
      bolt:     [[0, [0, 0, 0], [0, 0, 0]], [0.22, [0, 0, 0], [35, 0, 0]], [0.45, [0.02, -0.05, 0.01], [35, 0, 0]], [1, [0.42, -0.012, 0], [0, 0, 0]]],
    },
    labels: {
      body: ['Receiver group', 'barrel, stock, lower handguard'], cover: ['Dust cover', 'receiver cover'],
      spring: ['Recoil spring', 'spring and guide rod'], gastube: ['Gas tube', 'with upper handguard'],
      carrier: ['Bolt carrier', 'with gas piston'], bolt: ['Bolt', 'rotating, two lugs'], magazine: ['Magazine', '30 rounds'],
    },
    call: {
      spring: { a: [0.85, 0.2], dir: [1, -0.6] }, cover: { a: [-0.85, 0.4], dir: [-1, -0.5] }, gastube: { a: [0.7, 0.4], dir: [1, -0.6] },
      body: { a: [-0.92, 0.55], dir: [-0.5, -1.6] }, magazine: { a: [-0.6, -0.4], dir: [-1, 0.5] },
      carrier: { a: [-0.6, -0.3], dir: [-0.4, 1] }, bolt: { a: [0.3, -0.5], dir: [0.6, 1] },
    },
    credit: 'Six TRELLIS.2 assemblies; dust cover and cleaning rod built in code',
    // hybrid (default): TRELLIS receiver group and magazine, code-built moving and fitted parts
    hybrid: {
      build: 'hybrid',
      parts: {
        body:     { file: 'models/ak47/body.glb',     rot: [0, 0, 0],     box: [43, 1323, 208, 503], depth: null,  mat: AK_STEEL },
        // a second TRELLIS magazine (Qwen 2.1 edit isolating it from the hero photo), stood upright and seated where the
        // code-built magazine sits: rear face against the catch at x -50 mm, feed lips 15 mm up inside the receiver
        magazine: { file: 'models/ak47/magazine2.glb', rot: [-90, 60, 180], wbox: [-0.0545, 0.1079, -0.218, -0.018], depth: 0.030,
          rock: [0.011, -0.022, 0], mat: { metal: 0.7, rough: 0.85, tint: [0.9, 0.92, 1.0] } },
        cover: { code: true }, spring: { code: true }, gastube: { code: true }, carrier: { code: true }, bolt: { code: true },
      },
      // baked handle copy, plus the TRELLIS trigger guard, trigger and catch (rebuilt in code where the magazine seats)
      trim: [[[-0.067, 0.024, 0.012], [-0.025, 1, 1]], [[-0.122, -0.082, -1], [-0.064, -0.0345, 1]]],
      paths: null,   // filled below: the AK-47 paths with the magazine rocking out about its front lug
      credit: 'Hybrid: TRELLIS.2 receiver group · magazine and moving parts in code',
    },
    // the same rifle modeled entirely in code (milled Type 3 receiver), textures generated on ComfyUI
    code: {
      build: 'code', img: { px0: -435, px1: 435, bore: 0 },            // authored in mm: 1 "px" = 1 mm
      parts: { body: { code: true }, magazine: { code: true }, cover: { code: true }, spring: { code: true }, gastube: { code: true }, carrier: { code: true }, bolt: { code: true } },
      cover: { zc: 0, hwi: 16.4, t: 0.8, ys: 19.8, ci: 35.8, n: 2, xr: -199.5, xf: 41.5, yb: 12, rearRound: 27, rearMin: 0.42,
        ribs: [0.16, 0.3, 0.44, 0.58, 0.72, 0.86], plateY: 17.8 },
      handle: { x: 0.033, py: -8, z: 0, stroke: 0.115 },
      trim: null, rod: null, muzzlePx: 435, port: [-0.01, 0.004, 0.017],
      credit: 'Code-modeled in three.js · textures generated on ComfyUI (Krea2)',
    },
  },
  akm:  { id: 'akm', name: 'AKM', cal: '7.62×39 mm', cartridge: '762x39', length: 0.88, blurb: 'Stamped receiver, slant brake, 1959', ready: false },
  rpk:  { id: 'rpk', name: 'RPK', cal: '7.62×39 mm', cartridge: '762x39', length: 1.04, blurb: 'Light machine gun: long heavy barrel, bipod', ready: false },
  psl:  { id: 'psl', name: 'PSL', cal: '7.62×54R', cartridge: '762x54r', length: 1.15, blurb: 'Romanian marksman rifle, semi-automatic', ready: false },
};
export const ORDER = ['ak47', 'akm', 'rpk', 'psl'];
// a real AK magazine comes out by rocking forward about its front lug, then drops
RIFLES.ak47.hybrid.paths = Object.assign({}, RIFLES.ak47.paths, {
  magazine: [[0, [0, 0, 0], [0, 0, 0]], [0.3, [0, 0, 0], [0, 0, 14]], [0.55, [0.01, -0.1, 0], [0, 0, 10]], [1, [-0.36, -0.24, 0], [0, 0, 0]]],
});
