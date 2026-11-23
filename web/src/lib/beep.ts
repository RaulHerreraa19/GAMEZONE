let ctx: AudioContext | null = null;

/** Short tone for alerts (880 Hz warning, 440 Hz lock). Silent if the browser blocks audio. */
export function beep(freq: number) {
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio unavailable: the toast still shows.
  }
}
