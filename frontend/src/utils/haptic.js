/**
 * Haptic feedback (vibración) para PWA en móviles.
 * Falla silenciosamente en navegadores sin soporte (iOS Safari, desktops).
 *
 * Patrones predefinidos:
 *  - light:    15ms — tap sutil (botones, pull-to-refresh start)
 *  - medium:   25ms — confirmación (enviar misiva, eco, archivar)
 *  - success: [10, 40, 10] — patrón corto positivo (publicar crónica)
 *  - notify:  [20, 60, 20] — aviso entrante (nuevo aviso/misiva)
 *  - warn:    [40, 30, 40] — error/aviso fuerte
 */
const isSupported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const haptic = {
  light:   () => isSupported && navigator.vibrate(15),
  medium:  () => isSupported && navigator.vibrate(25),
  success: () => isSupported && navigator.vibrate([10, 40, 10]),
  notify:  () => isSupported && navigator.vibrate([20, 60, 20]),
  warn:    () => isSupported && navigator.vibrate([40, 30, 40])
};

export default haptic;
