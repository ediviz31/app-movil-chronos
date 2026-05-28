/**
 * Helpers para etiquetar tiempo histórico en cards.
 */

/**
 * Convierte un año (puede ser negativo a.C.) a un siglo en romano.
 *   1453 → "siglo XV"
 *    -44 → "siglo I a.C."
 *      0 → null (año 0 no existe en el calendario histórico)
 *    100 → "siglo I"      (año 100 cierra el siglo I)
 *    101 → "siglo II"
 */
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII'];

export function yearToCentury(year) {
  if (year === null || year === undefined || year === '' || isNaN(year)) return null;
  const y = Number(year);
  if (y === 0) return null;
  // Año X en siglo ceil(|X| / 100), con marcador a.C. si negativo
  const abs = Math.abs(y);
  const century = Math.ceil(abs / 100);
  const roman = ROMAN[century] || `${century}`;
  return y < 0 ? `siglo ${roman} a.C.` : `siglo ${roman}`;
}

/**
 * Construye la etiqueta "siglo XV · Constantinopla" para mostrar bajo el avatar.
 * Devuelve null si no hay nada que mostrar.
 */
export function buildHistoricTag({ anio, lugar }) {
  const century = yearToCentury(anio);
  const place = (lugar || '').trim();
  if (!century && !place) return null;
  if (century && place) return `${century} · ${place}`;
  return century || place;
}
