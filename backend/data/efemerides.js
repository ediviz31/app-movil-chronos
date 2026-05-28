/**
 * Dataset curado de efemérides históricas reales.
 * Indexado por "MM-DD" (mes-día, sin año).
 * Cada efeméride es un evento real documentado.
 *
 * Si no hay efeméride para una fecha, AvisosArchivo selecciona la más cercana.
 */

const EFEMERIDES = {
  '01-01': [
    { anio: 1801, evento: 'Reino Unido entra en vigor con la unión del Reino de Gran Bretaña e Irlanda.', epoca: 'Edad Contemporánea', lugar: 'Londres, Reino Unido', lat: 51.5074, lng: -0.1278 },
    { anio: 45, evento: 'Entra en vigor el calendario juliano, reforma de Julio César.', epoca: 'Roma imperial', lugar: 'Roma, Italia', lat: 41.9028, lng: 12.4964 }
  ],
  '01-04': [
    { anio: 1493, evento: 'Cristóbal Colón inicia el regreso a España tras su primer viaje a América.', epoca: 'Edad Moderna', lugar: 'La Española (Haití)', lat: 19.0, lng: -70.0 }
  ],
  '01-08': [
    { anio: 1297, evento: 'François Grimaldi captura Mónaco vestido de monje, fundando la dinastía Grimaldi.', epoca: 'Edad Media', lugar: 'Mónaco', lat: 43.7384, lng: 7.4246 }
  ],
  '01-15': [
    { anio: 1559, evento: 'Isabel I es coronada reina de Inglaterra en la Abadía de Westminster.', epoca: 'Edad Moderna', lugar: 'Westminster, Londres', lat: 51.4994, lng: -0.1273 }
  ],
  '01-21': [
    { anio: 1793, evento: 'Luis XVI es ejecutado en la guillotina en plena Revolución Francesa.', epoca: 'Edad Contemporánea', lugar: 'París, Francia', lat: 48.8566, lng: 2.3522 }
  ],
  '01-27': [
    { anio: 98, evento: 'Trajano se convierte en emperador romano, iniciando la edad de oro del Imperio.', epoca: 'Roma imperial', lugar: 'Roma, Italia', lat: 41.9028, lng: 12.4964 }
  ],
  '02-02': [
    { anio: 1536, evento: 'Pedro de Mendoza funda la ciudad de Buenos Aires.', epoca: 'Edad Moderna', lugar: 'Buenos Aires, Argentina', lat: -34.6037, lng: -58.3816 }
  ],
  '02-08': [
    { anio: 1587, evento: 'María Estuardo, reina de Escocia, es ejecutada por orden de Isabel I.', epoca: 'Edad Moderna', lugar: 'Fotheringhay, Inglaterra', lat: 52.5275, lng: -0.4244 }
  ],
  '02-15': [
    { anio: -399, evento: 'Sócrates es condenado a beber cicuta por la asamblea ateniense.', epoca: 'Antigüedad', lugar: 'Atenas, Grecia', lat: 37.9838, lng: 23.7275 }
  ],
  '02-22': [
    { anio: 1819, evento: 'España cede Florida a Estados Unidos por el Tratado de Adams-Onís.', epoca: 'Edad Contemporánea', lugar: 'Washington, EEUU', lat: 38.9072, lng: -77.0369 }
  ],
  '02-27': [
    { anio: 380, evento: 'El Edicto de Tesalónica establece el cristianismo como religión oficial del Imperio Romano.', epoca: 'Roma imperial', lugar: 'Tesalónica, Grecia', lat: 40.6401, lng: 22.9444 }
  ],
  '03-04': [
    { anio: 1492, evento: 'Los Reyes Católicos firman el Edicto de Granada, ordenando la expulsión de los judíos de España.', epoca: 'Edad Moderna', lugar: 'Granada, España', lat: 37.1773, lng: -3.5986 }
  ],
  '03-15': [
    { anio: -44, evento: 'Julio César es asesinado en los Idus de marzo en el Senado de Roma por un grupo liderado por Bruto y Casio.', epoca: 'Roma imperial', lugar: 'Roma, Italia', lat: 41.9028, lng: 12.4964 }
  ],
  '03-21': [
    { anio: 1413, evento: 'Enrique V se convierte en rey de Inglaterra.', epoca: 'Edad Media', lugar: 'Londres, Reino Unido', lat: 51.5074, lng: -0.1278 }
  ],
  '03-28': [
    { anio: 193, evento: 'El emperador romano Pertinax es asesinado por su propia Guardia Pretoriana.', epoca: 'Roma imperial', lugar: 'Roma, Italia', lat: 41.9028, lng: 12.4964 }
  ],
  '04-06': [
    { anio: 1199, evento: 'Ricardo Corazón de León muere por una herida de ballesta en el sitio de Châlus.', epoca: 'Edad Media', lugar: 'Châlus, Francia', lat: 45.6529, lng: 0.9858 }
  ],
  '04-14': [
    { anio: 1865, evento: 'Abraham Lincoln es asesinado en el Teatro Ford de Washington.', epoca: 'Edad Contemporánea', lugar: 'Washington, EEUU', lat: 38.8959, lng: -77.0263 }
  ],
  '04-21': [
    { anio: -753, evento: 'Fundación legendaria de Roma por Rómulo, según la tradición.', epoca: 'Roma imperial', lugar: 'Roma, Italia', lat: 41.8919, lng: 12.4823 }
  ],
  '04-30': [
    { anio: 1789, evento: 'George Washington jura como primer presidente de Estados Unidos en Nueva York.', epoca: 'Edad Contemporánea', lugar: 'Nueva York, EEUU', lat: 40.7128, lng: -74.006 }
  ],
  '05-05': [
    { anio: 1821, evento: 'Napoleón Bonaparte muere en su exilio en la isla de Santa Elena.', epoca: 'Edad Contemporánea', lugar: 'Santa Elena', lat: -15.965, lng: -5.7089 }
  ],
  '05-14': [
    { anio: 1610, evento: 'Enrique IV de Francia es asesinado por François Ravaillac en París.', epoca: 'Edad Moderna', lugar: 'París, Francia', lat: 48.8566, lng: 2.3522 }
  ],
  '05-20': [
    { anio: 1498, evento: 'Vasco da Gama llega a Calicut, India, completando la primera ruta marítima de Europa a la India.', epoca: 'Edad Moderna', lugar: 'Calicut, India', lat: 11.2588, lng: 75.7804 }
  ],
  '05-29': [
    { anio: 1453, evento: 'Constantinopla cae ante los otomanos liderados por Mehmed II, marcando el fin del Imperio Bizantino.', epoca: 'Edad Media', lugar: 'Estambul, Turquía', lat: 41.0082, lng: 28.9784 }
  ],
  '06-06': [
    { anio: 1944, evento: 'Día D: las fuerzas aliadas desembarcan en las playas de Normandía.', epoca: 'Edad Contemporánea', lugar: 'Normandía, Francia', lat: 49.3, lng: -0.5 }
  ],
  '06-15': [
    { anio: 1215, evento: 'El rey Juan de Inglaterra firma la Carta Magna en Runnymede.', epoca: 'Edad Media', lugar: 'Runnymede, Reino Unido', lat: 51.4445, lng: -0.568 }
  ],
  '06-18': [
    { anio: 1815, evento: 'Napoleón es derrotado en la batalla de Waterloo por las tropas anglo-prusianas.', epoca: 'Edad Contemporánea', lugar: 'Waterloo, Bélgica', lat: 50.6804, lng: 4.4007 }
  ],
  '06-28': [
    { anio: 1914, evento: 'Asesinato del archiduque Francisco Fernando en Sarajevo, detonante de la Primera Guerra Mundial.', epoca: 'Edad Contemporánea', lugar: 'Sarajevo, Bosnia', lat: 43.8563, lng: 18.4131 }
  ],
  '07-04': [
    { anio: 1776, evento: 'Se firma la Declaración de Independencia de Estados Unidos.', epoca: 'Edad Contemporánea', lugar: 'Filadelfia, EEUU', lat: 39.9526, lng: -75.1652 }
  ],
  '07-14': [
    { anio: 1789, evento: 'Toma de la Bastilla, inicio simbólico de la Revolución Francesa.', epoca: 'Edad Contemporánea', lugar: 'París, Francia', lat: 48.8532, lng: 2.3692 }
  ],
  '07-19': [
    { anio: 64, evento: 'Comienza el Gran Incendio de Roma, durante el reinado de Nerón. Arde durante seis días.', epoca: 'Roma imperial', lugar: 'Roma, Italia', lat: 41.8919, lng: 12.4823 }
  ],
  '07-23': [
    { anio: -30, evento: 'Marco Antonio se suicida en Alejandría tras la victoria de Octavio en Actium.', epoca: 'Roma imperial', lugar: 'Alejandría, Egipto', lat: 31.2001, lng: 29.9187 }
  ],
  '08-09': [
    { anio: 48, evento: 'Cae Pompeyo Magno en la batalla de Farsalia ante Julio César.', epoca: 'Roma imperial', lugar: 'Farsalia, Grecia', lat: 39.2997, lng: 22.3789 }
  ],
  '08-19': [
    { anio: 14, evento: 'Muere César Augusto, primer emperador de Roma, en Nola.', epoca: 'Roma imperial', lugar: 'Nola, Italia', lat: 40.9269, lng: 14.5258 }
  ],
  '08-24': [
    { anio: 79, evento: 'El Vesubio entra en erupción sepultando Pompeya y Herculano.', epoca: 'Roma imperial', lugar: 'Pompeya, Italia', lat: 40.7497, lng: 14.4869 },
    { anio: 410, evento: 'Saqueo de Roma por los visigodos de Alarico, marcando el principio del fin del Imperio Romano de Occidente.', epoca: 'Roma imperial', lugar: 'Roma, Italia', lat: 41.9028, lng: 12.4964 }
  ],
  '09-02': [
    { anio: 31, evento: 'Octavio vence a Marco Antonio y Cleopatra en la batalla naval de Actium.', epoca: 'Roma imperial', lugar: 'Actium, Grecia', lat: 38.9333, lng: 20.7333 }
  ],
  '09-11': [
    { anio: 1297, evento: 'William Wallace derrota a los ingleses en la batalla del puente de Stirling.', epoca: 'Edad Media', lugar: 'Stirling, Escocia', lat: 56.1167, lng: -3.9333 }
  ],
  '09-22': [
    { anio: -480, evento: 'Batalla de Salamina: la flota griega derrota a la persa de Jerjes I.', epoca: 'Antigüedad', lugar: 'Salamina, Grecia', lat: 37.9667, lng: 23.5 }
  ],
  '10-12': [
    { anio: 1492, evento: 'Cristóbal Colón avista tierra en el Caribe; primer encuentro europeo con América.', epoca: 'Edad Moderna', lugar: 'San Salvador, Bahamas', lat: 24.05, lng: -74.4833 }
  ],
  '10-14': [
    { anio: 1066, evento: 'Batalla de Hastings: Guillermo el Conquistador derrota a Harold II de Inglaterra.', epoca: 'Edad Media', lugar: 'Hastings, Inglaterra', lat: 50.8543, lng: 0.5732 }
  ],
  '10-19': [
    { anio: 202, evento: 'Escipión Africano derrota a Aníbal en la batalla de Zama, sellando la victoria romana en la Segunda Guerra Púnica.', epoca: 'Roma imperial', lugar: 'Zama, Túnez', lat: 36.3, lng: 9.5 }
  ],
  '10-28': [
    { anio: 312, evento: 'Constantino vence a Majencio en el Puente Milvio; visión de la cruz que llevará al cristianismo al poder.', epoca: 'Roma imperial', lugar: 'Roma, Italia', lat: 41.9282, lng: 12.4646 }
  ],
  '10-31': [
    { anio: 1517, evento: 'Martín Lutero clava sus 95 tesis en Wittenberg, iniciando la Reforma Protestante.', epoca: 'Edad Moderna', lugar: 'Wittenberg, Alemania', lat: 51.8667, lng: 12.65 }
  ],
  '11-09': [
    { anio: 1989, evento: 'Cae el Muro de Berlín, símbolo del fin de la Guerra Fría.', epoca: 'Edad Contemporánea', lugar: 'Berlín, Alemania', lat: 52.5163, lng: 13.3777 }
  ],
  '11-19': [
    { anio: 1863, evento: 'Abraham Lincoln pronuncia el Discurso de Gettysburg.', epoca: 'Edad Contemporánea', lugar: 'Gettysburg, EEUU', lat: 39.8309, lng: -77.2311 }
  ],
  '11-22': [
    { anio: 1963, evento: 'Asesinato de John F. Kennedy en Dallas, Texas.', epoca: 'Edad Contemporánea', lugar: 'Dallas, EEUU', lat: 32.7767, lng: -96.797 }
  ],
  '11-26': [
    { anio: 1922, evento: 'Howard Carter abre la tumba de Tutankamón en el Valle de los Reyes.', epoca: 'Egipto antiguo', lugar: 'Valle de los Reyes, Egipto', lat: 25.7402, lng: 32.6014 }
  ],
  '12-07': [
    { anio: 1941, evento: 'Ataque japonés a Pearl Harbor; Estados Unidos entra en la Segunda Guerra Mundial.', epoca: 'Edad Contemporánea', lugar: 'Pearl Harbor, Hawaii', lat: 21.3649, lng: -157.9507 }
  ],
  '12-21': [
    { anio: 1620, evento: 'Los Peregrinos del Mayflower desembarcan en Plymouth, Massachusetts.', epoca: 'Edad Moderna', lugar: 'Plymouth, EEUU', lat: 41.9584, lng: -70.6677 }
  ],
  '12-25': [
    { anio: 800, evento: 'Carlomagno es coronado emperador del Sacro Imperio Romano Germánico por el Papa León III en Roma.', epoca: 'Edad Media', lugar: 'Roma, Italia', lat: 41.9022, lng: 12.4533 },
    { anio: 336, evento: 'Primera celebración registrada del 25 de diciembre como Natividad de Cristo en Roma.', epoca: 'Roma imperial', lugar: 'Roma, Italia', lat: 41.9028, lng: 12.4964 }
  ],
  '12-30': [
    { anio: 1922, evento: 'Se proclama formalmente la creación de la Unión Soviética (URSS).', epoca: 'Edad Contemporánea', lugar: 'Moscú, Rusia', lat: 55.7558, lng: 37.6173 }
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
