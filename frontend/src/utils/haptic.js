/**
 * Haptic feedback (vibración) para PWA en móviles.
 * Falla silenciosamente en navegadores sin soporte (iOS Safari, desktops).
 *
 * Patrones predefinidos:
 *  - light:    15ms — tap sutil (botones, pull-to-refresh start)
 *  - medium:   25ms — confirmación (enviar misiva, eco, archivar)
 *  - success: [10, 40, 10] — patrón corto positivo (publicar crónica)
 *  - notify:  [80, 60, 120, 60, 80] — aviso fuerte y resonante (nuevo aviso/misiva)
 *  - warn:    [40, 30, 40] — error/aviso fuerte
 */
const isSupported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const haptic = {
  light:   () => isSupported && navigator.vibrate(15),
  medium:  () => isSupported && navigator.vibrate(25),
  success: () => isSupported && navigator.vibrate([10, 40, 10]),
  // Patrón resonante: 3 pulsos progresivos para que "se sienta" como una campana
  notify:  () => isSupported && navigator.vibrate([80, 60, 120, 60, 80]),
  warn:    () => isSupported && navigator.vibrate([40, 30, 40])
};

export default haptic;
