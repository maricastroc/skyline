let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let lastAt = 0;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  audio();
}

export function setMuted(m: boolean) {
  muted = m;
}

function noiseBuffer(a: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.max(1, Math.floor(a.sampleRate * seconds));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = last * 0.92 + (Math.random() * 2 - 1) * 0.35;
    d[i] = last * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export function collapseSound(power: number, spread: number) {
  const a = audio();
  if (!a || !master || muted) return;
  const now = a.currentTime;
  if (performance.now() - lastAt < 40) return;
  lastAt = performance.now();

  const o = a.createOscillator();
  const og = a.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(95 + 40 * (1 - power), now);
  o.frequency.exponentialRampToValueAtTime(32, now + 0.35 + power * 0.4);
  og.gain.setValueAtTime(0.0001, now);
  og.gain.exponentialRampToValueAtTime(0.35 + power * 0.55, now + 0.012);
  og.gain.exponentialRampToValueAtTime(0.0001, now + 0.5 + power * 0.6);
  o.connect(og).connect(master);
  o.start(now);
  o.stop(now + 1.3);

  const dur = 0.6 + spread * 1.1 + power * 1.2;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, dur, 1.6);
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(500 + power * 900, now);
  lp.frequency.exponentialRampToValueAtTime(160, now + dur);
  const ng = a.createGain();
  ng.gain.value = 0.5 + power * 0.9;
  src.connect(lp).connect(ng).connect(master);
  src.start(now + 0.02);

  const clicks = 3 + Math.round(power * 10);
  for (let i = 0; i < clicks; i++) {
    const t = now + 0.15 + Math.random() * (0.3 + spread);
    const c = a.createBufferSource();
    c.buffer = noiseBuffer(a, 0.04, 3);
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900 + Math.random() * 2600;
    bp.Q.value = 3;
    const cg = a.createGain();
    cg.gain.value = 0.12 + Math.random() * 0.12;
    c.connect(bp).connect(cg).connect(master);
    c.start(t);
  }
}

export function tick(high = false) {
  const a = audio();
  if (!a || !master || muted) return;
  const now = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(high ? 1320 : 880, now);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.06, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  o.connect(g).connect(master);
  o.start(now);
  o.stop(now + 0.1);
}
