/**
 * chronosSound.js
 *
 * Genera los 3 sonidos custom de Chronos para avisos usando Web Audio API.
 * Variantes:
 *  - 'cuerno'   → Cuerno de heraldo (G3 → C4 + chime)
 *  - 'lira'     → Lira griega (arpegio C-E-G suave)
 *  - 'campana'  → Campana de monasterio (B4 con armónicos largos)
 *  - 'silencio' → No reproduce nada
 *
 * Sin archivos externos. Únicos y propios de Chronos.
 */

let audioCtxSingleton = null;

const getCtx = () => {
  if (audioCtxSingleton) return audioCtxSingleton;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioCtxSingleton = new Ctx();
  return audioCtxSingleton;
};

// ─── CUERNO DE HERALDO ─────────────────────────────────────────
const playHornNote = (ctx, freq, startTime, duration = 0.5, volume = 0.18) => {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startTime);
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 0.5, startTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(volume * 0.5, startTime + duration * 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  filter.Q.value = 1.2;
  osc.connect(filter); osc2.connect(filter);
  filter.connect(gain); gain.connect(ctx.destination);
  osc.start(startTime); osc2.start(startTime);
  osc.stop(startTime + duration + 0.05);
  osc2.stop(startTime + duration + 0.05);
};

// ─── CHIME (compartido) ────────────────────────────────────────
const playChime = (ctx, freq, startTime, duration = 0.6, volume = 0.06) => {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2.01, startTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, startTime);
  gain2.gain.linearRampToValueAtTime(volume * 0.5, startTime + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.8);
  osc.connect(gain); osc2.connect(gain2);
  gain.connect(ctx.destination); gain2.connect(ctx.destination);
  osc.start(startTime); osc2.start(startTime);
  osc.stop(startTime + duration + 0.05);
  osc2.stop(startTime + duration + 0.05);
};

// ─── LIRA GRIEGA (pluck) ───────────────────────────────────────
const playLiraNote = (ctx, freq, startTime, duration = 0.6, volume = 0.12) => {
  // Sonido tipo cuerda pulsada: combinación seno + sawtooth con decay rápido
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, startTime);
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, startTime); // octava superior
  const gain = ctx.createGain();
  // Attack muy rápido + decay exponencial (pluck)
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(volume * 0.3, startTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2500, startTime);
  filter.frequency.exponentialRampToValueAtTime(800, startTime + duration);
  filter.Q.value = 0.7;
  osc.connect(filter); osc2.connect(filter);
  filter.connect(gain); gain.connect(ctx.destination);
  osc.start(startTime); osc2.start(startTime);
  osc.stop(startTime + duration + 0.05);
  osc2.stop(startTime + duration + 0.05);
};

// ─── CAMPANA DE MONASTERIO ─────────────────────────────────────
const playMonasteryBell = (ctx, freq, startTime, duration = 2.5, volume = 0.18) => {
  // Frecuencia fundamental + parciales no armónicos típicos de campana
  const fundamentals = [
    { mult: 1.0, vol: 1.0 },
    { mult: 2.0, vol: 0.5 },
    { mult: 2.4, vol: 0.4 },   // tierce minor (característica de campana)
    { mult: 3.0, vol: 0.3 },
    { mult: 4.5, vol: 0.2 }
  ];
  for (const p of fundamentals) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * p.mult, startTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume * p.vol, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * (1 - p.mult * 0.05));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
  }
};

// ─── FANFARES POR TIPO ─────────────────────────────────────────
// Volúmenes ~2.2x más altos para que se sientan más resonantes/recios.
const playCuerno = (ctx, now) => {
  // Cuerno principal: G3 → C4 (más fuerte y largo)
  playHornNote(ctx, 196.0, now, 0.38, 0.38);
  playHornNote(ctx, 261.63, now + 0.18, 0.55, 0.42);
  // Eco/resonancia: segundo cuerno una octava abajo, suave (efecto cavernoso)
  playHornNote(ctx, 130.81, now + 0.10, 0.6, 0.18);
  // Chime brillante encima
  playChime(ctx, 659.25, now + 0.55, 0.9, 0.18);
  playChime(ctx, 880.00, now + 0.70, 0.8, 0.12);
};

const playLira = (ctx, now) => {
  // Arpegio Do mayor: C4-E4-G4-C5 (volúmenes 2x)
  playLiraNote(ctx, 261.63, now, 0.85, 0.28);          // C4
  playLiraNote(ctx, 329.63, now + 0.12, 0.85, 0.26);   // E4
  playLiraNote(ctx, 392.00, now + 0.24, 0.85, 0.24);   // G4
  playLiraNote(ctx, 523.25, now + 0.36, 1.2, 0.28);    // C5
  // Re-pluck suave para resonancia
  playLiraNote(ctx, 523.25, now + 0.85, 0.7, 0.14);
};

const playCampana = (ctx, now) => {
  playMonasteryBell(ctx, 246.94, now, 3.2, 0.36);       // B3 grave fuerte
  // Eco a octava arriba (campana más distante)
  playMonasteryBell(ctx, 493.88, now + 0.35, 2.0, 0.12);
};

// ─── API PÚBLICA ───────────────────────────────────────────────
export const playChronosAlert = async (variante = 'cuerno') => {
  try {
    if (variante === 'silencio') return;
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();
    const now = ctx.currentTime + 0.02;
    if (variante === 'lira') return playLira(ctx, now);
    if (variante === 'campana') return playCampana(ctx, now);
    return playCuerno(ctx, now); // default
  } catch (e) {
    console.warn('No se pudo reproducir aviso:', e);
  }
};

// Variante corta para "Probar sonido"
export const playChronosTestChime = async (variante = 'cuerno') => {
  try {
    if (variante === 'silencio') return;
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();
    const now = ctx.currentTime + 0.02;
    if (variante === 'lira') return playLiraNote(ctx, 392.0, now, 0.7, 0.14);
    if (variante === 'campana') return playMonasteryBell(ctx, 392.0, now, 1.5, 0.15);
    return playChime(ctx, 659.25, now, 0.5, 0.1);
  } catch (e) {
    console.warn('No se pudo reproducir test:', e);
  }
};

export const primeAudio = () => {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
};

// ─── ANTORCHA ENCENDIÉNDOSE (inicio de upload) ─────────────────
// Chasquido + crepitar suave, como una antorcha que prende.
export const playTorchIgnite = async () => {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();
    const now = ctx.currentTime + 0.02;
    // Chasquido inicial (noise burst)
    const bufSize = ctx.sampleRate * 0.18;
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 1.8);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1400;
    noiseFilter.Q.value = 0.8;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination);
    noise.start(now); noise.stop(now + 0.2);
    // Pequeña "respiración" cálida que se eleva
    const warmth = ctx.createOscillator();
    warmth.type = 'sine';
    warmth.frequency.setValueAtTime(180, now);
    warmth.frequency.exponentialRampToValueAtTime(280, now + 0.35);
    const wGain = ctx.createGain();
    wGain.gain.setValueAtTime(0, now);
    wGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    wGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    warmth.connect(wGain); wGain.connect(ctx.destination);
    warmth.start(now); warmth.stop(now + 0.5);
  } catch (e) {
    console.warn('No se pudo reproducir antorcha:', e);
  }
};

// ─── CAMPANA DE LOGRO (upload completado) ──────────────────────
// Tono dorado breve y satisfactorio.
export const playUploadComplete = async () => {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();
    const now = ctx.currentTime + 0.02;
    // Dos notas ascendentes (Mi → Sol)
    playChime(ctx, 659.25, now, 0.4, 0.1);
    playChime(ctx, 783.99, now + 0.12, 0.65, 0.12);
  } catch (e) {
    console.warn('No se pudo reproducir campana:', e);
  }
};
