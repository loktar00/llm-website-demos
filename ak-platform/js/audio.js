// Sound: real recordings, muted until the toggle is pressed (see README for credits).
// sfx-shot: AK-47 single shot, Beeld en Geluid via Wikimedia Commons, CC BY-SA 3.0 (trimmed).
// sfx-bolt: "Equipment Clicks III" by LFA, OpenGameArt, CC0 (trimmed).
// sfx-brass0-2: short dry tinks synthesized for this site, CC0.
export function createAudio(base) {
  let ctx = null, master = null, on = false, pings = 0;
  const buf = {};
  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.002; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(comp); comp.connect(ctx.destination);
    for (const n of ['shot', 'bolt', 'brass0', 'brass1', 'brass2'])
      fetch(base + 'sfx-' + n + '.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
        .then(a => ctx.decodeAudioData(a)).then(b => { buf[n] = b; }).catch(() => {});
  }
  function play(b, gain, rate, lp) {
    const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = gain;
    if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; s.connect(f); f.connect(g); } else s.connect(g);
    g.connect(master); s.start(); return s;
  }
  return {
    toggle() { if (!ctx) init(); on = !on; if (on) ctx.resume(); return on; },
    get on() { return on; },
    // tone: { rate, gain, lp } per rifle; the PSL's 7.62x54R plays the same recording slower, darker and louder
    shot(tone = {}) { if (!on || !buf.shot) return;
      play(buf.shot, (tone.gain || 0.8) * (0.9 + Math.random() * 0.2), (tone.rate || 1) * (0.95 + Math.random() * 0.08), tone.lp); },
    bolt(tone = {}) { if (!on || !buf.bolt) return; play(buf.bolt, 0.28 + Math.random() * 0.08, (tone.boltRate || 1.15) * (0.95 + Math.random() * 0.1)); },
    ping(v) { if (!on || pings >= 2) return;                       // tiny dry tink, well under the shot, never more than two at once
      const b = buf['brass' + Math.floor(Math.random() * 3)]; if (!b) return;
      pings++; const s = play(b, (0.13 + Math.random() * 0.06) * v, 0.9 + Math.random() * 0.25); s.onended = () => pings--; },
  };
}
