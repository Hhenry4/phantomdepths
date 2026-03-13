// Simple Web Audio sound effects engine
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function resumeAudio() {
  if (audioCtx?.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1, detune: number = 0) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playNoise(duration: number, volume: number = 0.05) {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {}
}

export function playHarpoonSound() {
  playTone(200, 0.15, 'sawtooth', 0.08);
  playTone(400, 0.08, 'square', 0.03);
}

export function playTorpedoSound() {
  playTone(80, 0.4, 'sawtooth', 0.1);
  playNoise(0.15, 0.06);
}

export function playPlasmaSound() {
  playTone(1200, 0.06, 'sine', 0.04, 50);
}

export function playShockSound() {
  playTone(600, 0.3, 'square', 0.06);
  playTone(800, 0.2, 'square', 0.04);
}

export function playFlakSound() {
  playNoise(0.1, 0.08);
  playTone(300, 0.1, 'sawtooth', 0.05);
}

export function playCryoSound() {
  playTone(2000, 0.2, 'sine', 0.04);
  playTone(2500, 0.15, 'sine', 0.03);
}

export function playRailgunSound() {
  playTone(100, 0.5, 'sawtooth', 0.12);
  playTone(50, 0.3, 'square', 0.08);
  playNoise(0.1, 0.1);
}

export function playVortexSound() {
  playTone(60, 0.8, 'sine', 0.1);
  playTone(90, 0.6, 'sine', 0.06);
}

export function playSonarPing() {
  playTone(1000, 0.3, 'sine', 0.08);
  setTimeout(() => playTone(800, 0.2, 'sine', 0.04), 150);
}

export function playHitSound() {
  playNoise(0.08, 0.1);
  playTone(150, 0.1, 'square', 0.06);
}

export function playKillSound() {
  playTone(500, 0.15, 'sine', 0.06);
  playTone(700, 0.1, 'sine', 0.04);
  playTone(900, 0.08, 'sine', 0.03);
}

export function playDamageSound() {
  playNoise(0.12, 0.08);
  playTone(100, 0.15, 'sawtooth', 0.08);
}

export function playChestSound() {
  playTone(600, 0.1, 'sine', 0.06);
  playTone(800, 0.1, 'sine', 0.05);
  playTone(1000, 0.15, 'sine', 0.04);
}

export function playExplosionSound() {
  playNoise(0.3, 0.12);
  playTone(60, 0.4, 'sawtooth', 0.1);
}

export function playReloadSound() {
  playTone(300, 0.1, 'square', 0.04);
  setTimeout(() => playTone(400, 0.1, 'square', 0.04), 100);
}

// Ambient engine hum - call periodically
let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;

export function updateEngineHum(intensity: number) {
  try {
    const ctx = getCtx();
    if (!engineOsc) {
      engineOsc = ctx.createOscillator();
      engineGain = ctx.createGain();
      engineOsc.type = 'sine';
      engineOsc.frequency.value = 40;
      engineGain!.gain.value = 0;
      engineOsc.connect(engineGain!);
      engineGain!.connect(ctx.destination);
      engineOsc.start();
    }
    if (engineGain) {
      engineGain.gain.setTargetAtTime(intensity * 0.02, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(35 + intensity * 20, ctx.currentTime, 0.1);
    }
  } catch {}
}

export function stopEngine() {
  try {
    if (engineOsc) {
      engineOsc.stop();
      engineOsc = null;
      engineGain = null;
    }
  } catch {}
}
