/**
 * Mapas de etiquetas y posiciones para el árbol genealógico.
 */

export const PARENTESCO_LABELS = {
  padre: 'Padre',
  madre: 'Madre',
  abuelo_paterno: 'Abuelo paterno',
  abuela_paterna: 'Abuela paterna',
  abuelo_materno: 'Abuelo materno',
  abuela_materna: 'Abuela materna',
  bisabuelo_pp: 'Bisabuelo paterno-paterno',
  bisabuela_pp: 'Bisabuela paterna-paterna',
  bisabuelo_pm: 'Bisabuelo paterno-materno',
  bisabuela_pm: 'Bisabuela paterna-materna',
  bisabuelo_mp: 'Bisabuelo materno-paterno',
  bisabuela_mp: 'Bisabuela materna-paterna',
  bisabuelo_mm: 'Bisabuelo materno-materno',
  bisabuela_mm: 'Bisabuela materna-materna',
  hermano: 'Hermano',
  hermana: 'Hermana',
  tio: 'Tío',
  tia: 'Tía',
  primo: 'Primo',
  prima: 'Prima',
  hijo: 'Hijo',
  hija: 'Hija',
  conyuge: 'Cónyuge',
  otro: 'Otro familiar'
};

export const PARENTESCO_OPTIONS = Object.entries(PARENTESCO_LABELS)
  .map(([value, label]) => ({ value, label }));

// Posiciones (col, row) en una grilla virtual del árbol
// Filas: 0 = bisabuelos, 1 = abuelos, 2 = padres, 3 = root, 4 = hijos
// Columnas: -3..+3 desde el centro
export const PARENTESCO_POSICION = {
  // Bisabuelos paternos
  bisabuelo_pp: { col: -3, row: 0, lado: 'paterno' },
  bisabuela_pp: { col: -2.3, row: 0, lado: 'paterno' },
  bisabuelo_pm: { col: -1.6, row: 0, lado: 'paterno' },
  bisabuela_pm: { col: -0.9, row: 0, lado: 'paterno' },
  // Bisabuelos maternos
  bisabuelo_mp: { col: 0.9, row: 0, lado: 'materno' },
  bisabuela_mp: { col: 1.6, row: 0, lado: 'materno' },
  bisabuelo_mm: { col: 2.3, row: 0, lado: 'materno' },
  bisabuela_mm: { col: 3, row: 0, lado: 'materno' },

  // Abuelos
  abuelo_paterno: { col: -2.5, row: 1, lado: 'paterno' },
  abuela_paterna: { col: -1.5, row: 1, lado: 'paterno' },
  abuelo_materno: { col: 1.5, row: 1, lado: 'materno' },
  abuela_materna: { col: 2.5, row: 1, lado: 'materno' },

  // Padres
  padre: { col: -1, row: 2 },
  madre: { col: 1, row: 2 },

  // Hermanos (a los lados del root, dinámico)
  hermano: { col: -2.2, row: 3 },
  hermana: { col: 2.2, row: 3 },

  // Tíos
  tio: { col: -3, row: 2 },
  tia: { col: 3, row: 2 },

  // Cónyuge
  conyuge: { col: 1.5, row: 3 },

  // Hijos
  hijo: { col: -1, row: 4 },
  hija: { col: 1, row: 4 },

  // Primos
  primo: { col: -3.5, row: 3 },
  prima: { col: 3.5, row: 3 },

  // Otros
  otro: { col: 0, row: 5 }
};

export const getParentescoLabel = (key) => PARENTESCO_LABELS[key] || 'Familiar';

export const getEpocaDeFecha = (fechaStr) => {
  // Devuelve la época histórica a la que pertenece la fecha
  if (!fechaStr) return null;
  const m = String(fechaStr).match(/^(-?\d{3,4})/);
  if (!m) return null;
  const year = parseInt(m[1]);
  if (year < 476) return 'Antigüedad';
  if (year < 1492) return 'Edad Media';
  if (year < 1789) return 'Edad Moderna';
  return 'Edad Contemporánea';
};

export const formatFechaCorta = (fechaStr) => {
  if (!fechaStr) return '';
  const m = String(fechaStr).match(/^(-?\d{3,4})(-(\d{2}))?(-(\d{2}))?/);
  if (!m) return fechaStr;
  return m[1];
};
