# AK platform: rifles and cartridges

A showroom-style 3D presentation of the AK-47 and its cartridge, expanding the
[AK-47 field strip](../ak47-field-strip/) page. The rifle sits in a dark studio on a polished floor,
with a slow light sweep on load and a spec sheet beside it. Scrolling tells the story:

- **Firing**: the rifle opens on its hero framing and starts firing short full-auto bursts after two seconds.
- **History**: a short chapter and timeline, from the 1945-47 design and 1949 adoption through the milled
  Type 2/3 receivers, the AKM (1959) and the AK-74 (1974), to roughly 100 million Kalashnikov-pattern rifles.
- **Cartridge**: one spent case turns upright and slides into a to-scale cartridge lineup, the 7.62&times;39 round
  steps forward, turns horizontal and comes apart (case, primer, powder, bullet) into a half section, then four
  bullet constructions are compared.
- **Field strip**: the rifle is field stripped in its real order with callouts. Every stage scrubs both ways.

The 7.62&times;39 chip and **Cartridges** (`?cartridge=762x39`, `?cartridge=762x54r`) open the lineup, the
breakdown and bullet types, then the rifle chambered for that round. Drag to rotate, pinch or +/- to zoom;
sound is off until you turn it on. Other AK-pattern rifles (AKM, RPK, PSL) were started and are paused.

Educational, reference-book level: exterior assemblies, the standard user field strip, and cartridge
cutaways. By Claude Opus 5.5.

## How it is built

`index.html` plus ES modules in `js/` (three.js 0.170 from jsDelivr), no build step. Models are
meshopt-compressed GLBs with WebP textures, loaded only for what is on screen. The floor is a three.js `Reflector`
faded out in its own shader; it switches off on slow devices.

### Rifles: TRELLIS.2 vs code-built

Each rifle starts from one generated photo (Krea2 or Qwen Image 2.1 on ComfyUI), edited with Qwen
Image 2.1 one defect at a time (open the receiver, lift the gas tube, take out the magazine), then each
assembly goes through TRELLIS.2 image-to-3D and is fitted to real dimensions in code.

| Rifle (length) | TRELLIS.2 | Built in code |
| --- | --- | --- |
| AK-47 (870 mm), default hybrid | receiver group (stock, grip, barrel, sights), magazine (a second TRELLIS magazine isolated from the hero photo) | dust cover, bolt carrier with piston, charging handle, recoil spring, bolt, gas tube with upper handguard, gas block, trigger guard and catch, cleaning rod |

TRELLIS rebuilt the open receiver tops as extra internal shapes (a central fork, side blobs above the wall tops);
those are trimmed under the cover. The rifle loads in its hero framing and starts firing after two seconds.

The code-built parts come from `js/akcode.js`, which also holds a fully code-modeled AK-47 that was built as a
side-by-side test against TRELLIS. The page always shows the hybrid; the all-TRELLIS and all-code versions are no
longer published. Code-part UVs are in metres (wood along the grain, cylinders unwrapped around their axis, flat
steel planar). The textures in `tex/` (walnut, blued steel, phosphate steel, magazine steel) were generated as photos
on ComfyUI with Krea2, made seamless by offset-and-blend, and given normal maps (from a high-passed height estimate)
and roughness maps (from luminance), all as WebP.

The dust cover is code-built on every rifle: thin stamped sheet metal never came out of TRELLIS
usable. It is a 0.8 mm ribbed U-arch shell fitted to the receiver mesh (width, lip height, length and
arch measured by slicing the receiver model and checked against the reference photo), with the real
cover's right-side cut-out over the ejection port; the charging handle and carrier were tested at 31
positions over the full stroke with zero intersections.

### Cartridges: all built in code

`.50 BMG`, `7.62×54R`, `7.62×51`, `7.62×39`, `5.56×45`, `5.45×39`, `.45 ACP` and `9×19 mm` are revolved
(lathe) profiles from published CIP/SAAMI case and bullet dimensions, to scale, in brass or lacquered
steel. Each component (case, primer, powder granules, jacket, lead core, steel penetrator) is a closed
region of the profile revolved in two halves, so the front half can slide away to leave a half section.
Bullet types for the two AK cartridges: full metal jacket, hollow point, soft point and armor piercing
(steel penetrator in a lead sleeve).

## Sound credits

- `sfx/sfx-shot.mp3`: "AK-47 (Kalasjnikov), een schot" by Beeld en Geluid (Netherlands Institute
  for Sound and Vision), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:AK-47_(Kalasjnikov),_een_schot_-_SoundCloud_-_Beeld_en_Geluid.ogg),
  licensed [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Trimmed, made mono and
  normalised; this edited clip is shared under the same licence.
- `sfx/sfx-bolt.mp3`: "Equipment Clicks III" by LFA, [OpenGameArt](https://opengameart.org/content/equipment-clicks-iii), CC0. Trimmed.
- `sfx/sfx-brass0-2.mp3`: short dry tinks synthesized for this site (a click plus a few fast-decaying
  6-11 kHz partials), released CC0.

- Short preview loop: [`../thumbs/ak-platform.mp4`](../thumbs/ak-platform.mp4)
