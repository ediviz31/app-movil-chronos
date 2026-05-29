/**
 * Micro-sonido "cinta proyectándose" cuando un Fragmento entra al viewport.
 * Generado en tiempo real con Web Audio API (sin archivos externos):
 *  - Click metálico inicial (transitorio agudo): proyector arrancando
 *  - Whoosh tenue de cinta avanzando (~700ms)
 *  - Pequeño "thump" grave al final
 *
 * Se reproduce UNA sola vez por fragmento por sesión.
 * Respeta el mute global de la pestaña (si user.silent media) y el setting
 * localStorage 'chronos_fragmento_proyector' === 'off'.
 */

let audioCtx = null;
let unlocked = false;
const playedSet = new Set();

const isEnabled = () => {
  try {
    return localStorage.getItem('chronos_fragmento_proyector') !== 'off';
  } catch (_) { return true; }
};

const ensureCtx = () => {
  if (!audioCtx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    } catch (_) { return null; }
  }
  return audioCtx;
};

// Desbloquea el AudioContext al primer gesto del usuario (autoplay policy)
const tryUnlock = () => {
  const ctx = ensureCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  unlocked = true;
};

// Instalamos listeners pasivos para "armar" el contexto al primer toque
if (typeof window !== 'undefined') {
  const armOnce = () => {
    tryUnlock();
    window.removeEventListener('pointerdown', armOnce);
    window.removeEventListener('touchstart', armOnce);
    window.removeEventListener('keydown', armOnce);
  };
  window.addEventListener('pointerdown', armOnce, { passive: true });
  window.addEventListener('touchstart', armOnce, { passive: true });
  window.addEventListener('keydown', armOnce, { passive: true });
}

/**
 * Reproduce el sonido para un fragmento dado. Sólo una vez por sesión por id.
 * @param {string} fragmentoId
 */
export function playProyectorOnce(fragmentoId) {
  if (!fragmentoId) return;
  if (playedSet.has(fragmentoId)) return;
  if (!isEnabled()) return;
  const ctx = ensureCtx();
  if (!ctx) return;
  if (!unlocked || ctx.state === 'suspended') {
    // No molestamos: el usuario aún no interactuó con la página.
    return;
  }
  playedSet.add(fragmentoId);

  const now = ctx.currentTime;

  // --- Master gain (volumen general suave) ---
  const master = ctx.createGain();
  master.gain.value = 0.18; // muy sutil
  master.connect(ctx.destination);

  // --- 1) Click metálico de arranque (transitorio agudo, 25ms) ---
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = 'square';
  clickOsc.frequency.setValueAtTime(2200, now);
  clickOsc.frequency.exponentialRampToValueAtTime(900, now + 0.025);
  clickGain.gain.setValueAtTime(0.0001, now);
  clickGain.gain.exponentialRampToValueAtTime(0.5, now + 0.005);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  clickOsc.connect(clickGain).connect(master);
  clickOsc.start(now);
  clickOsc.stop(now + 0.04);

  // --- 2) Whoosh de cinta (ruido blanco filtrado, 700ms) ---
  const noiseDuration = 0.75;
  const sampleRate = ctx.sampleRate;
  const noiseBuf = ctx.createBuffer(1, Math.floor(sampleRate * noiseDuration), sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * 0.7;
  }
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;

  // Pasa-banda barrido: simula la cinta avanzando con flutter
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(800, now + 0.02);
  bp.frequency.linearRampToValueAtTime(1800, now + 0.4);
  bp.frequency.exponentialRampToValueAtTime(600, now + noiseDuration);
  bp.Q.value = 1.2;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now + 0.02);
  noiseGain.gain.exponentialRampToValueAtTime(0.28, now + 0.18);
  noiseGain.gain.exponentialRampToValueAtTime(0.15, now + 0.5);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

  noiseSrc.connect(bp).connect(noiseGain).connect(master);
  noiseSrc.start(now + 0.02);
  noiseSrc.stop(now + noiseDuration + 0.05);

  // --- 3) Thump grave de cierre (proyector engancha la cinta) ---
  const thumpOsc = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thumpOsc.type = 'sine';
  thumpOsc.frequency.setValueAtTime(120, now + 0.55);
  thumpOsc.frequency.exponentialRampToValueAtTime(40, now + 0.85);
  thumpGain.gain.setValueAtTime(0.0001, now + 0.55);
  thumpGain.gain.exponentialRampToValueAtTime(0.4, now + 0.6);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
  thumpOsc.connect(thumpGain).connect(master);
  thumpOsc.start(now + 0.55);
  thumpOsc.stop(now + 1.0);
}

/** Permite al usuario silenciar o re-activar el sonido. */
export function setProyectorEnabled(on) {
  try {
    localStorage.setItem('chronos_fragmento_proyector', on ? 'on' : 'off');
  } catch (_) {}
}

export function isProyectorEnabled() {
  return isEnabled();
}
