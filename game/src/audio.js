// All sound is synthesized with the Web Audio API: short oscillator and noise
// blips composed into a gobble, a jump whoosh, a pickup chirp and a fanfare.
// No audio files, no network, nothing to load.
export function makeAudio() {
  let context = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (context) return context;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    context = new AC();
    master = context.createGain();
    master.gain.value = 0.35;
    master.connect(context.destination);
    return context;
  }

  function tone(freq, seconds, type, volume, when = 0, slideTo = null) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + seconds);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  function noise(seconds, volume, when = 0, lowpass = 1200) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t0);
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    jump() {
      tone(280, 0.16, 'sine', 0.25, 0, 620);
      noise(0.12, 0.08, 0, 2400);
    },
    doubleJump() {
      tone(420, 0.14, 'sine', 0.22, 0, 880);
    },
    slide() {
      noise(0.18, 0.12, 0, 900);
    },
    corn() {
      tone(880, 0.09, 'triangle', 0.28);
      tone(1320, 0.12, 'triangle', 0.22, 0.07);
    },
    feather() {
      [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.12, 'triangle', 0.22, i * 0.06));
    },
    pie() {
      [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'sine', 0.25, i * 0.08));
    },
    dodge() {
      tone(520, 0.07, 'square', 0.1, 0, 760);
    },
    hit() {
      tone(160, 0.25, 'sawtooth', 0.3, 0, 60);
      noise(0.2, 0.25, 0, 500);
    },
    gobble() {
      // The turkey's own call: a burst of low clucks, rising at the end.
      [0, 0.09, 0.18, 0.27, 0.4].forEach((when, i) => {
        tone(i === 4 ? 420 : 300, 0.08, 'square', 0.16, when, i === 4 ? 640 : 220);
      });
    },
    caught() {
      [392, 370, 349, 311].forEach((f, i) => tone(f, 0.32, 'triangle', 0.25, i * 0.3));
    },
    escaped() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.26, i * 0.11));
      [784, 1047].forEach((f, i) => tone(f, 0.4, 'sine', 0.18, 0.6 + i * 0.12));
    },
    click() {
      tone(700, 0.05, 'square', 0.12);
    },
  };
}
