/**
 * Parser GEDCOM simplificado.
 *
 * GEDCOM 5.5 es el formato estándar de archivos genealógicos exportados por
 * Ancestry, MyHeritage, FamilySearch, Geni, Geneanet, etc.
 *
 * Estructura simplificada:
 *   0 @I1@ INDI
 *   1 NAME John /Doe/
 *   1 SEX M
 *   1 BIRT
 *   2 DATE 12 JUN 1900
 *   2 PLAC London, England
 *   1 DEAT
 *   2 DATE 1970
 *   1 OCCU Engineer
 *   1 FAMC @F1@   (familia donde es hijo)
 *   1 FAMS @F2@   (familia donde es cónyuge)
 *
 * 0 @F1@ FAM
 *   1 HUSB @I2@
 *   1 WIFE @I3@
 *   1 CHIL @I1@
 *
 * Este parser:
 * - Extrae individuos con nombre, fechas, lugar nacimiento, ocupación
 * - Determina parentesco RAÍZ usando la primera persona como referencia
 * - Mapea relaciones básicas (padre, madre, abuelos, hermanos, hijos, cónyuge)
 * - Cualquier relación no mapeable queda como 'otro'
 *
 * IMPORTANTE: para árboles complejos sólo importamos los individuos detectados;
 * el usuario después puede ajustar parentescos desde la UI.
 */

const PARENTESCOS_VALIDOS = [
  'padre', 'madre',
  'abuelo_paterno', 'abuela_paterna', 'abuelo_materno', 'abuela_materna',
  'bisabuelo_pp', 'bisabuela_pp', 'bisabuelo_pm', 'bisabuela_pm',
  'bisabuelo_mp', 'bisabuela_mp', 'bisabuelo_mm', 'bisabuela_mm',
  'hermano', 'hermana',
  'tio', 'tia',
  'primo', 'prima',
  'hijo', 'hija',
  'conyuge', 'otro'
];

// Parser GEDCOM básico
function parseGedcom(content) {
  const lines = content.split(/\r?\n/);
  const records = {};   // id -> { level0_tag, fields }
  let current = null;
  let currentSubTag = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(/^(\d+)\s+(@[^@]+@)?\s*([A-Z]+)\s*(.*)$/);
    if (!match) continue;
    const [, levelStr, id, tag, value] = match;
    const level = parseInt(levelStr);

    if (level === 0 && id) {
      current = { id, type: tag, fields: {}, _events: {} };
      records[id] = current;
      currentSubTag = null;
    } else if (level === 1 && current) {
      currentSubTag = tag;
      if (['BIRT', 'DEAT', 'MARR', 'BURI'].includes(tag)) {
        current._events[tag] = {};
      } else if (tag === 'HUSB' || tag === 'WIFE' || tag === 'CHIL') {
        // múltiples valores: acumular
        if (!current.fields[tag]) current.fields[tag] = [];
        current.fields[tag].push(value.trim());
      } else if (tag === 'FAMC' || tag === 'FAMS') {
        if (!current.fields[tag]) current.fields[tag] = [];
        current.fields[tag].push(value.trim());
      } else {
        current.fields[tag] = value.trim();
      }
    } else if (level === 2 && current && currentSubTag) {
      if (current._events[currentSubTag] && (tag === 'DATE' || tag === 'PLAC')) {
        current._events[currentSubTag][tag] = value.trim();
      }
    }
  }
  return records;
}

// Convierte "12 JUN 1900" o "1900" o "JUN 1900" a YYYY o YYYY-MM-DD
function normalizeDate(str) {
  if (!str) return '';
  const meses = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
                  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
  const s = str.trim().toUpperCase();
  // Solo año "1900"
  let m = s.match(/^\d{3,4}$/);
  if (m) return m[0];
  // "JUN 1900"
  m = s.match(/^([A-Z]{3})\s+(\d{3,4})$/);
  if (m && meses[m[1]]) return `${m[2]}-${meses[m[1]]}`;
  // "12 JUN 1900"
  m = s.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{3,4})$/);
  if (m && meses[m[2]]) return `${m[3]}-${meses[m[2]]}-${m[1].padStart(2, '0')}`;
  return s.slice(0, 30);
}

// Parsea nombre tipo "John /Doe/" → { nombre: "John", apellido: "Doe" }
function parseName(raw) {
  if (!raw) return { nombre: '', apellido: '' };
  const m = raw.match(/^(.*?)\/(.*?)\/?(.*)$/);
  if (m) {
    return { nombre: (m[1] + ' ' + (m[3] || '')).trim(), apellido: m[2].trim() };
  }
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 1) return { nombre: parts[0], apellido: '' };
  return { nombre: parts.slice(0, -1).join(' '), apellido: parts.slice(-1)[0] };
}

// Mapea individuos a estructura MiembroFamiliar
function parseGedcomToFamiliares(content, usuario_id) {
  const records = parseGedcom(content);
  const individuos = Object.values(records).filter(r => r.type === 'INDI');
  const familias = Object.values(records).filter(r => r.type === 'FAM');

  if (individuos.length === 0) return [];

  // Indexar familias por ID
  const famById = {};
  for (const f of familias) famById[f.id] = f;

  // Determinar persona ROOT (primera INDI o la única sin FAMC)
  // Estrategia: tomamos la primera y todos los demás se mapean en relación a ésta
  const root = individuos.find(i => !i.fields.FAMC) || individuos[0];

  // Map de relaciones desde root
  const familiares = [];

  // Helper para crear miembro
  const crear = (indi, parentesco) => {
    const name = parseName(indi.fields.NAME || '');
    const sexo = indi.fields.SEX === 'M' ? 'masculino' : indi.fields.SEX === 'F' ? 'femenino' : '';
    return {
      usuario_id,
      nombre: name.nombre || 'Sin nombre',
      apellido: name.apellido || '',
      genero: sexo,
      fecha_nacimiento: normalizeDate(indi._events.BIRT?.DATE),
      fecha_defuncion: normalizeDate(indi._events.DEAT?.DATE),
      lugar_nacimiento: (indi._events.BIRT?.PLAC || '').slice(0, 120),
      ocupacion: (indi.fields.OCCU || '').slice(0, 80),
      bio: '',
      parentesco: PARENTESCOS_VALIDOS.includes(parentesco) ? parentesco : 'otro',
      historias: []
    };
  };

  // Familia de origen del root (sus padres)
  const familiaRoot = root.fields.FAMC ? famById[root.fields.FAMC[0]] : null;
  const padreRoot = familiaRoot && familiaRoot.fields.HUSB ? records[familiaRoot.fields.HUSB[0]] : null;
  const madreRoot = familiaRoot && familiaRoot.fields.WIFE ? records[familiaRoot.fields.WIFE[0]] : null;

  if (padreRoot) familiares.push(crear(padreRoot, 'padre'));
  if (madreRoot) familiares.push(crear(madreRoot, 'madre'));

  // Hermanos del root
  if (familiaRoot && familiaRoot.fields.CHIL) {
    for (const childId of familiaRoot.fields.CHIL) {
      if (childId === root.id) continue;
      const child = records[childId];
      if (!child) continue;
      const par = child.fields.SEX === 'F' ? 'hermana' : 'hermano';
      familiares.push(crear(child, par));
    }
  }

  // Abuelos (padres del padre/madre)
  const buscarAbuelos = (progenitor, lado /* 'paterno' o 'materno' */) => {
    if (!progenitor || !progenitor.fields.FAMC) return;
    const famAbu = famById[progenitor.fields.FAMC[0]];
    if (!famAbu) return;
    const abuelo = famAbu.fields.HUSB ? records[famAbu.fields.HUSB[0]] : null;
    const abuela = famAbu.fields.WIFE ? records[famAbu.fields.WIFE[0]] : null;
    if (abuelo) familiares.push(crear(abuelo, lado === 'paterno' ? 'abuelo_paterno' : 'abuelo_materno'));
    if (abuela) familiares.push(crear(abuela, lado === 'paterno' ? 'abuela_paterna' : 'abuela_materna'));
  };
  buscarAbuelos(padreRoot, 'paterno');
  buscarAbuelos(madreRoot, 'materno');

  // Cónyuge e hijos del root (si tiene FAMS)
  if (root.fields.FAMS) {
    for (const famsId of root.fields.FAMS) {
      const familia = famById[famsId];
      if (!familia) continue;
      const conyugeId = familia.fields.HUSB?.[0] === root.id
        ? familia.fields.WIFE?.[0]
        : familia.fields.HUSB?.[0];
      const conyuge = conyugeId ? records[conyugeId] : null;
      if (conyuge) familiares.push(crear(conyuge, 'conyuge'));
      if (familia.fields.CHIL) {
        for (const childId of familia.fields.CHIL) {
          const child = records[childId];
          if (!child) continue;
          const par = child.fields.SEX === 'F' ? 'hija' : 'hijo';
          familiares.push(crear(child, par));
        }
      }
    }
  }

  // Filtrar duplicados (mismo nombre + parentesco)
  const seen = new Set();
  const unicos = familiares.filter(f => {
    const key = `${f.parentesco}-${f.nombre}-${f.apellido}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unicos;
}

module.exports = { parseGedcomToFamiliares, parseGedcom };
