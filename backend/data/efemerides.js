/**
 * Dataset curado de efemérides históricas reales.
 * Indexado por "MM-DD" (mes-día, sin año).
 * Cada efeméride es un evento real documentado.
 *
 * Si no hay efeméride para una fecha, AvisosArchivo selecciona la más cercana.
 */

const EFEMERIDES = {
  '01-01': [
    { anio: 1801, evento: 'Reino Unido entra en vigor con la unión del Reino de Gran Bretaña e Irlanda.', epoca: 'Edad Contemporánea' },
    { anio: 45, evento: 'Entra en vigor el calendario juliano, reforma de Julio César.', epoca: 'Roma imperial' }
  ],
  '01-04': [
    { anio: 1493, evento: 'Cristóbal Colón inicia el regreso a España tras su primer viaje a América.', epoca: 'Edad Moderna' }
  ],
  '01-08': [
    { anio: 1297, evento: 'François Grimaldi captura Mónaco vestido de monje, fundando la dinastía Grimaldi.', epoca: 'Edad Media' }
  ],
  '01-15': [
    { anio: 1559, evento: 'Isabel I es coronada reina de Inglaterra en la Abadía de Westminster.', epoca: 'Edad Moderna' }
  ],
  '01-21': [
    { anio: 1793, evento: 'Luis XVI es ejecutado en la guillotina en plena Revolución Francesa.', epoca: 'Edad Contemporánea' }
  ],
  '01-27': [
    { anio: 98, evento: 'Trajano se convierte en emperador romano, iniciando la edad de oro del Imperio.', epoca: 'Roma imperial' }
  ],
  '02-02': [
    { anio: 1536, evento: 'Pedro de Mendoza funda la ciudad de Buenos Aires.', epoca: 'Edad Moderna' }
  ],
  '02-08': [
    { anio: 1587, evento: 'María Estuardo, reina de Escocia, es ejecutada por orden de Isabel I.', epoca: 'Edad Moderna' }
  ],
  '02-15': [
    { anio: -399, evento: 'Sócrates es condenado a beber cicuta por la asamblea ateniense.', epoca: 'Antigüedad' }
  ],
  '02-22': [
    { anio: 1819, evento: 'España cede Florida a Estados Unidos por el Tratado de Adams-Onís.', epoca: 'Edad Contemporánea' }
  ],
  '02-27': [
    { anio: 380, evento: 'El Edicto de Tesalónica establece el cristianismo como religión oficial del Imperio Romano.', epoca: 'Roma imperial' }
  ],
  '03-04': [
    { anio: 1492, evento: 'Los Reyes Católicos firman el Edicto de Granada, ordenando la expulsión de los judíos de España.', epoca: 'Edad Moderna' }
  ],
  '03-15': [
    { anio: -44, evento: 'Julio César es asesinado en los Idus de marzo en el Senado de Roma por un grupo liderado por Bruto y Casio.', epoca: 'Roma imperial' }
  ],
  '03-21': [
    { anio: 1413, evento: 'Enrique V se convierte en rey de Inglaterra.', epoca: 'Edad Media' }
  ],
  '03-28': [
    { anio: 193, evento: 'El emperador romano Pertinax es asesinado por su propia Guardia Pretoriana.', epoca: 'Roma imperial' }
  ],
  '04-06': [
    { anio: 1199, evento: 'Ricardo Corazón de León muere por una herida de ballesta en el sitio de Châlus.', epoca: 'Edad Media' }
  ],
  '04-14': [
    { anio: 1865, evento: 'Abraham Lincoln es asesinado en el Teatro Ford de Washington.', epoca: 'Edad Contemporánea' }
  ],
  '04-21': [
    { anio: -753, evento: 'Fundación legendaria de Roma por Rómulo, según la tradición.', epoca: 'Roma imperial' }
  ],
  '04-30': [
    { anio: 1789, evento: 'George Washington jura como primer presidente de Estados Unidos en Nueva York.', epoca: 'Edad Contemporánea' }
  ],
  '05-05': [
    { anio: 1821, evento: 'Napoleón Bonaparte muere en su exilio en la isla de Santa Elena.', epoca: 'Edad Contemporánea' }
  ],
  '05-14': [
    { anio: 1610, evento: 'Enrique IV de Francia es asesinado por François Ravaillac en París.', epoca: 'Edad Moderna' }
  ],
  '05-20': [
    { anio: 1498, evento: 'Vasco da Gama llega a Calicut, India, completando la primera ruta marítima de Europa a la India.', epoca: 'Edad Moderna' }
  ],
  '05-29': [
    { anio: 1453, evento: 'Constantinopla cae ante los otomanos liderados por Mehmed II, marcando el fin del Imperio Bizantino.', epoca: 'Edad Media' }
  ],
  '06-06': [
    { anio: 1944, evento: 'Día D: las fuerzas aliadas desembarcan en las playas de Normandía.', epoca: 'Edad Contemporánea' }
  ],
  '06-15': [
    { anio: 1215, evento: 'El rey Juan de Inglaterra firma la Carta Magna en Runnymede.', epoca: 'Edad Media' }
  ],
  '06-18': [
    { anio: 1815, evento: 'Napoleón es derrotado en la batalla de Waterloo por las tropas anglo-prusianas.', epoca: 'Edad Contemporánea' }
  ],
  '06-28': [
    { anio: 1914, evento: 'Asesinato del archiduque Francisco Fernando en Sarajevo, detonante de la Primera Guerra Mundial.', epoca: 'Edad Contemporánea' }
  ],
  '07-04': [
    { anio: 1776, evento: 'Se firma la Declaración de Independencia de Estados Unidos.', epoca: 'Edad Contemporánea' }
  ],
  '07-14': [
    { anio: 1789, evento: 'Toma de la Bastilla, inicio simbólico de la Revolución Francesa.', epoca: 'Edad Contemporánea' }
  ],
  '07-19': [
    { anio: 64, evento: 'Comienza el Gran Incendio de Roma, durante el reinado de Nerón. Arde durante seis días.', epoca: 'Roma imperial' }
  ],
  '07-23': [
    { anio: -30, evento: 'Marco Antonio se suicida en Alejandría tras la victoria de Octavio en Actium.', epoca: 'Roma imperial' }
  ],
  '08-09': [
    { anio: 48, evento: 'Cae Pompeyo Magno en la batalla de Farsalia ante Julio César.', epoca: 'Roma imperial' }
  ],
  '08-19': [
    { anio: 14, evento: 'Muere César Augusto, primer emperador de Roma, en Nola.', epoca: 'Roma imperial' }
  ],
  '08-24': [
    { anio: 79, evento: 'El Vesubio entra en erupción sepultando Pompeya y Herculano.', epoca: 'Roma imperial' },
    { anio: 410, evento: 'Saqueo de Roma por los visigodos de Alarico, marcando el principio del fin del Imperio Romano de Occidente.', epoca: 'Roma imperial' }
  ],
  '09-02': [
    { anio: 31, evento: 'Octavio vence a Marco Antonio y Cleopatra en la batalla naval de Actium.', epoca: 'Roma imperial' }
  ],
  '09-11': [
    { anio: 1297, evento: 'William Wallace derrota a los ingleses en la batalla del puente de Stirling.', epoca: 'Edad Media' }
  ],
  '09-22': [
    { anio: -480, evento: 'Batalla de Salamina: la flota griega derrota a la persa de Jerjes I.', epoca: 'Antigüedad' }
  ],
  '10-12': [
    { anio: 1492, evento: 'Cristóbal Colón avista tierra en el Caribe; primer encuentro europeo con América.', epoca: 'Edad Moderna' }
  ],
  '10-14': [
    { anio: 1066, evento: 'Batalla de Hastings: Guillermo el Conquistador derrota a Harold II de Inglaterra.', epoca: 'Edad Media' }
  ],
  '10-19': [
    { anio: 202, evento: 'Escipión Africano derrota a Aníbal en la batalla de Zama, sellando la victoria romana en la Segunda Guerra Púnica.', epoca: 'Roma imperial' }
  ],
  '10-28': [
    { anio: 312, evento: 'Constantino vence a Majencio en el Puente Milvio; visión de la cruz que llevará al cristianismo al poder.', epoca: 'Roma imperial' }
  ],
  '10-31': [
    { anio: 1517, evento: 'Martín Lutero clava sus 95 tesis en Wittenberg, iniciando la Reforma Protestante.', epoca: 'Edad Moderna' }
  ],
  '11-09': [
    { anio: 1989, evento: 'Cae el Muro de Berlín, símbolo del fin de la Guerra Fría.', epoca: 'Edad Contemporánea' }
  ],
  '11-19': [
    { anio: 1863, evento: 'Abraham Lincoln pronuncia el Discurso de Gettysburg.', epoca: 'Edad Contemporánea' }
  ],
  '11-22': [
    { anio: 1963, evento: 'Asesinato de John F. Kennedy en Dallas, Texas.', epoca: 'Edad Contemporánea' }
  ],
  '11-26': [
    { anio: 1922, evento: 'Howard Carter abre la tumba de Tutankamón en el Valle de los Reyes.', epoca: 'Egipto antiguo' }
  ],
  '12-07': [
    { anio: 1941, evento: 'Ataque japonés a Pearl Harbor; Estados Unidos entra en la Segunda Guerra Mundial.', epoca: 'Edad Contemporánea' }
  ],
  '12-21': [
    { anio: 1620, evento: 'Los Peregrinos del Mayflower desembarcan en Plymouth, Massachusetts.', epoca: 'Edad Moderna' }
  ],
  '12-25': [
    { anio: 800, evento: 'Carlomagno es coronado emperador del Sacro Imperio Romano Germánico por el Papa León III en Roma.', epoca: 'Edad Media' },
    { anio: 336, evento: 'Primera celebración registrada del 25 de diciembre como Natividad de Cristo en Roma.', epoca: 'Roma imperial' }
  ],
  '12-30': [
    { anio: 1922, evento: 'Se proclama formalmente la creación de la Unión Soviética (URSS).', epoca: 'Edad Contemporánea' }
  ]
};

/**
 * Devuelve las efemérides de una fecha (Date o string MM-DD)
 */
function getEfemeridesPorFecha(fecha) {
  let key;
  if (fecha instanceof Date) {
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    key = `${mm}-${dd}`;
  } else if (typeof fecha === 'string') {
    key = fecha;
  } else {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    key = `${mm}-${dd}`;
  }
  return EFEMERIDES[key] || [];
}

/**
 * Si no hay efeméride para hoy, encuentra la fecha más cercana del calendario (ciclo anual).
 */
function getEfemerideCercana(fecha = new Date()) {
  const targetMM = fecha.getMonth() + 1;
  const targetDD = fecha.getDate();
  const targetOrdinal = targetMM * 100 + targetDD;

  let mejorKey = null;
  let mejorDist = Infinity;

  for (const key of Object.keys(EFEMERIDES)) {
    const [m, d] = key.split('-').map(Number);
    const ord = m * 100 + d;
    // Distancia cíclica anual (mínimo entre adelante/atrás)
    const distFwd = (ord - targetOrdinal + 1231) % 1231;
    const distBwd = (targetOrdinal - ord + 1231) % 1231;
    const dist = Math.min(distFwd, distBwd);
    if (dist < mejorDist) {
      mejorDist = dist;
      mejorKey = key;
    }
  }

  if (!mejorKey) return null;
  const eventos = EFEMERIDES[mejorKey];
  const [mm, dd] = mejorKey.split('-');
  return {
    fecha: mejorKey,
    mes: parseInt(mm),
    dia: parseInt(dd),
    distancia_dias: mejorDist,
    eventos
  };
}

/**
 * Calendario del mes: devuelve todos los días del mes con sus efemérides (si las hay).
 */
function getCalendarioDelMes(year, month /* 1-12 */) {
  const ultimoDia = new Date(year, month, 0).getDate();
  const dias = [];
  for (let d = 1; d <= ultimoDia; d++) {
    const mm = String(month).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const key = `${mm}-${dd}`;
    dias.push({
      dia: d,
      fecha: key,
      eventos: EFEMERIDES[key] || []
    });
  }
  return dias;
}

module.exports = {
  EFEMERIDES,
  getEfemeridesPorFecha,
  getEfemerideCercana,
  getCalendarioDelMes
};
