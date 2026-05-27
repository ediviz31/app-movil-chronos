/**
 * chronosSound.js
 *
 * Genera el sonido custom de Chronos para avisos usando Web Audio API.
 * Es un "cuerno de heraldo" sintetizado: dos notas en sucesión rápida
 * (fanfare corta de 2 tonos) con un chime metálico al final.
 *
 * No usa archivos externos. Único, propio y respeta el tema histórico.
 */

let audioCtxSingleton = null;

const getCtx = () => {
  if (audioCtxSingleton) return audioCtxSingleton;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioCtxSingleton = new Ctx();
  return audioCtxSingleton;
};

/**
 * Toca una sola "nota de cuerno" sintetizada (warm brass).
 */
const playHornNote = (ctx, freq, startTime, duration = 0.5, volume = 0.18) => {
  // Oscilador principal (triangular para warmth)
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startTime);

  // Detune subtle for organic feel
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 0.5, startTime); // octava inferior

  // Gain envelope (attack-decay-release de cuerno)
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(volume * 0.5, startTime + duration * 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  // Filtro pasabajos para suavizar (brass-like)
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  filter.Q.value = 1.2;

  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc2.start(startTime);
  osc.stop(startTime + duration + 0.05);
  osc2.stop(startTime + duration + 0.05);
};

/**
 * Toca un "chime" metálico breve (final del aviso).
 */
const playChime = (ctx, freq, startTime, duration = 0.6, volume = 0.06) => {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2.01, startTime); // ligero detune para campana

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, startTime);
  gain2.gain.linearRampToValueAtTime(volume * 0.5, startTime + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.8);

  osc.connect(gain);
  osc2.connect(gain2);
  gain.connect(ctx.destination);
  gain2.connect(ctx.destination);

  osc.start(startTime);
  osc2.start(startTime);
  osc.stop(startTime + duration + 0.05);
  osc2.stop(startTime + duration + 0.05);
};

/**
 * Reproduce el sonido oficial de aviso de Chronos:
 * Cuerno de heraldo (Sol-Do en succesión) + chime final.
 */
export const playChronosAlert = async () => {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    // Algunos navegadores requieren reanudar el contexto tras una interacción
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const now = ctx.currentTime + 0.02;
    // Fanfare: G3 (196 Hz) → C4 (261.63 Hz)
    playHornNote(ctx, 196.0, now, 0.32, 0.16);
    playHornNote(ctx, 261.63, now + 0.18, 0.45, 0.18);
    // Chime: E5 (659.25 Hz) — campanilla histórica
    playChime(ctx, 659.25, now + 0.55, 0.7, 0.08);
  } catch (e) {
    // Silencioso: si falla el audio no rompemos la app
    console.warn('No se pudo reproducir aviso:', e);
  }
};

/**
 * Reproduce un sonido de prueba más corto (para preview).
 */
export const playChronosTestChime = async () => {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();
    const now = ctx.currentTime + 0.02;
    playChime(ctx, 659.25, now, 0.5, 0.1);
  } catch (e) {
    console.warn('No se pudo reproducir test:', e);
  }
};

/**
 * Permite preinicializar el contexto tras una interacción (requerido por algunos navegadores).
 */
export const primeAudio = () => {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
};
