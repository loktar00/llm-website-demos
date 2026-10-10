# AK platform: rifles and cartridges

A museum-style 3D showcase of four AK-pattern rifles and the cartridges they fire, expanding the
[AK-47 field strip](../ak47-field-strip/) page. Two linked paths:

- **Rifles** (`?rifle=ak47`, `?rifle=akm`, `?rifle=rpk`, `?rifle=psl`): the rifle fires (full-auto bursts,
  or single shots for the semi-automatic PSL), one spent case turns upright and slides into a to-scale
  cartridge lineup, the rifle's own round steps forward, turns horizontal and comes apart (case, primer,
  powder, bullet) into a half section, then four bullet constructions are compared, and finally the
  rifle is field stripped in its real order with callouts. Every stage scrubs both ways.
- **Cartridges** (`?cartridge=762x39`, `?cartridge=762x54r`): the lineup, the breakdown and bullet types,
  then the rifles in this collection chambered for that round, each linking into its rifle path.

The landing page (`./`) has a turntable carousel of the rifles and a Rifles | Cartridges toggle
(`?view=cartridges`). Drag to rotate, pinch or +/- to zoom; sound is off until you turn it on.

Educational, reference-book level: exterior assemblies, the standard user field strip, and cartridge
cutaways. By Claude Opus 5.5.

## How it is built

`index.html` plus ES modules in `js/` (three.js 0.170 from jsDelivr), no build step. Models are
meshopt-compressed GLBs with WebP textures, loaded only for the rifle on screen (the landing carousel
prefetches the next slide).

### Rifles: TRELLIS.2 vs code-built

Each rifle starts from one generated photo (Krea2 or Qwen Image 2.1 on ComfyUI), edited with Qwen
Image 2.1 one defect at a time (open the receiver, lift the gas tube, take out the magazine), then each
assembly goes through TRELLIS.2 image-to-3D and is fitted to real dimensions in code.

| Rifle (length) | TRELLIS.2 | Built in code |
| --- | --- | --- |
| AK-47 (870 mm) | receiver group, magazine, recoil spring, gas tube with upper handguard, bolt carrier with piston, bolt | dust cover, cleaning rod, charging handle |

**Code-modeled AK-47 (default, `?model=code`).** The AK-47 also exists fully modeled in code
(`js/akcode.js`), as a side-by-side test against the TRELLIS version (`?model=trellis`, or the
TRELLIS | Code-modeled toggle): a milled Type 3 receiver as a U-channel with the ejection port, handle
slot and lightening cuts, trunnions and a rear sight block with real bores for the barrel, bolt and gas
piston, gas block, front sight base with bayonet lug and sling loop, muzzle nut, gas tube with vents,
upper and lower handguards, cleaning rod, pistol grip, trigger guard, selector, stock with buttplate and
sling loop, a curved 30-round magazine swept along its centre line with pressed ribs, and the separate
field-strip parts (magazine, dust cover, recoil spring that compresses with the carrier, bolt carrier with
piston and charging handle, bolt, gas tube with upper handguard). Proportions were measured from the
reference photo at 0.631 mm/px. UVs are in metres (wood along the grain, cylinders unwrapped around
their axis, flat steel planar) so texel density is the same everywhere. The textures in `tex/` (walnut,
blued steel, phosphate steel, magazine steel) were generated as photos on ComfyUI with Krea2, made
seamless by offset-and-blend, and given normal maps (from a high-passed height estimate) and roughness
maps (from luminance), all as WebP. In-page test: zero vertices of the receiver, spring, magazine,
carrier, bolt or handle inside the cover shell over 31 stroke positions.

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
  normalised; this edited clip is shared under the same licence. The PSL's 7.62×54R plays the same
  recording slower and darker.
- `sfx/sfx-bolt.mp3`: "Equipment Clicks III" by LFA, [OpenGameArt](https://opengameart.org/content/equipment-clicks-iii), CC0. Trimmed.
- `sfx/sfx-brass0-2.mp3`: short dry tinks synthesized for this site (a click plus a few fast-decaying
  6-11 kHz partials), released CC0.

- Short preview loop: [`../thumbs/ak-platform.mp4`](../thumbs/ak-platform.mp4)
