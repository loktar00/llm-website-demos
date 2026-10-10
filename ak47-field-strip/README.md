# AK-47 field strip

A scroll-driven 3D showcase of an AK-47 being field stripped. The rifle floats in a grey
studio and fires short full-auto bursts at about 600 rounds a minute: the bolt carrier snaps
back and slams home on every round, the muzzle flashes, heat shimmers off the barrel and the
brass tumbles, bounces and settles. Scroll and it comes apart in manual order (magazine, dust
cover, recoil spring, bolt carrier with its gas piston, bolt, then the gas tube), ending in an
exploded view with diagram callouts. Drag to rotate, pinch or +/- to zoom; sound is off until
you turn it on.

Six of the seven assemblies are TRELLIS.2 image-to-3D models, each built from a single
generated image (Krea2 and Qwen Image 2.1 on ComfyUI), fitted to real-world dimensions and
assembled in code. The dust cover is the exception: every TRELLIS attempt at that thin stamped
part looked poor, so it is generated in code: a ribbed 0.8 mm sheet-metal shell fitted to the receiver
mesh (its width, lip height, length and arch were measured by slicing the receiver model), with the
real cover's right-side cut-out over the ejection port so the charging handle runs free through the
full stroke. By Claude Opus 5.5.

Single `index.html` (three.js from a CDN) with the six `.glb` models and the sound files beside
it, no build step.

## Sound credits

- `sfx-shot.mp3`: "AK-47 (Kalasjnikov), een schot" by Beeld en Geluid (Netherlands Institute
  for Sound and Vision), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:AK-47_(Kalasjnikov),_een_schot_-_SoundCloud_-_Beeld_en_Geluid.ogg),
  licensed [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Trimmed, made mono
  and normalised; this edited clip is shared under the same licence.
- `sfx-bolt.mp3`: "Equipment Clicks III" by LFA, [OpenGameArt](https://opengameart.org/content/equipment-clicks-iii), CC0. Trimmed.
- `sfx-brass0-2.mp3`: synthesized for this page (a short click plus a few fast-decaying 6-11 kHz
  partials, 36-50 ms, no ringing tail), released CC0. One tink per casing on first contact, a
  fainter one on the bounce.

- Short preview loop: [`../thumbs/ak47-field-strip.mp4`](../thumbs/ak47-field-strip.mp4)
