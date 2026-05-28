/**
 * Catálogo curado de Visitas Virtuales 360° (Chronos).
 *
 * Fuentes:
 *   - AirPano (https://www.airpano.com) — abre en nueva pestaña (X-Frame-Options: DENY)
 *   - Google Arts & Culture — backup
 *
 * Cada entrada incluye:
 *   slug, lugar (display), aliases (para matching), epoca, anio_aprox,
 *   lat, lng, descripcion, thumbnail, url (visita 360°), fuente.
 *
 * El matching se hace por aliases (case-insensitive) y por cercanía geográfica (<60 km).
 */

const VISITAS_VIRTUALES = [
  {
    slug: 'coliseo-romano',
    lugar: 'Coliseo Romano',
    aliases: ['coliseo', 'coliseo romano', 'colosseum', 'roma', 'rome'],
    epoca: 'Roma imperial',
    anio_aprox: 80,
    lat: 41.8902,
    lng: 12.4922,
    descripcion: 'Anfiteatro flavio inaugurado por Tito en el año 80 d.C. Albergó combates de gladiadores y espectáculos para 50.000 espectadores.',
    thumbnail: 'https://images.unsplash.com/photo-1552432552-06c0b0a94dda?w=600&q=80',
    url: 'https://www.airpano.com/360photo/italy-rome-colosseum/',
    fuente: 'AirPano'
  },
  {
    slug: 'piramides-giza',
    lugar: 'Pirámides de Giza',
    aliases: ['piramides', 'piramides de giza', 'piramide de keops', 'giza', 'egipto', 'el cairo'],
    epoca: 'Antigüedad',
    anio_aprox: -2560,
    lat: 29.9792,
    lng: 31.1342,
    descripcion: 'Necrópolis del Antiguo Egipto con las tres pirámides de Keops, Kefrén y Micerinos, custodiadas por la Esfinge.',
    thumbnail: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Pyramids-Egypt/',
    fuente: 'AirPano'
  },
  {
    slug: 'acropolis-atenas',
    lugar: 'Acrópolis de Atenas',
    aliases: ['acropolis', 'partenon', 'atenas', 'athens', 'grecia clasica'],
    epoca: 'Grecia clásica',
    anio_aprox: -447,
    lat: 37.9715,
    lng: 23.7267,
    descripcion: 'Ciudadela sagrada de Atenas con el Partenón, templo dedicado a Atenea Parthenos, símbolo de la democracia ateniense.',
    thumbnail: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Acropolis-Athens-Greece/',
    fuente: 'AirPano'
  },
  {
    slug: 'machu-picchu',
    lugar: 'Machu Picchu',
    aliases: ['machu picchu', 'machu pichu', 'inca', 'cusco', 'peru'],
    epoca: 'América precolombina',
    anio_aprox: 1450,
    lat: -13.1631,
    lng: -72.5450,
    descripcion: 'Ciudad sagrada inca del siglo XV construida por Pachacútec, oculta entre las montañas de los Andes peruanos.',
    thumbnail: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Machu-Picchu-Peru/',
    fuente: 'AirPano'
  },
  {
    slug: 'petra',
    lugar: 'Petra',
    aliases: ['petra', 'nabateos', 'jordania', 'jordan', 'al-khazneh'],
    epoca: 'Antigüedad',
    anio_aprox: -300,
    lat: 30.3285,
    lng: 35.4444,
    descripcion: 'Ciudad nabatea esculpida en la roca rosa del desierto de Jordania, capital del reino nabateo desde el siglo IV a.C.',
    thumbnail: 'https://images.unsplash.com/photo-1579606037885-4ff8b89fac84?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Petra-Jordan/',
    fuente: 'AirPano'
  },
  {
    slug: 'angkor-wat',
    lugar: 'Angkor Wat',
    aliases: ['angkor', 'angkor wat', 'camboya', 'cambodia', 'jemer'],
    epoca: 'Edad Media',
    anio_aprox: 1150,
    lat: 13.4125,
    lng: 103.8670,
    descripcion: 'Templo hindú-budista del Imperio Jemer construido por Suryavarman II, el monumento religioso más grande del mundo.',
    thumbnail: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Angkor-Wat-Cambodia/',
    fuente: 'AirPano'
  },
  {
    slug: 'taj-mahal',
    lugar: 'Taj Mahal',
    aliases: ['taj mahal', 'tajmahal', 'agra', 'india', 'mughal'],
    epoca: 'Edad Moderna',
    anio_aprox: 1648,
    lat: 27.1751,
    lng: 78.0421,
    descripcion: 'Mausoleo de mármol blanco encargado por el emperador Shah Jahan en memoria de su esposa Mumtaz Mahal.',
    thumbnail: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Taj-Mahal-India/',
    fuente: 'AirPano'
  },
  {
    slug: 'gran-muralla-china',
    lugar: 'Gran Muralla China',
    aliases: ['gran muralla', 'muralla china', 'great wall', 'china', 'pekin'],
    epoca: 'Asia antigua',
    anio_aprox: -220,
    lat: 40.4319,
    lng: 116.5704,
    descripcion: 'Sistema de fortificaciones de más de 21.000 km construido a lo largo de las dinastías chinas para defender el imperio.',
    thumbnail: 'https://images.unsplash.com/photo-1508804052814-cd3ba865a116?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Great-Wall-China/',
    fuente: 'AirPano'
  },
  {
    slug: 'stonehenge',
    lugar: 'Stonehenge',
    aliases: ['stonehenge', 'salisbury', 'inglaterra prehistorica'],
    epoca: 'Antigüedad',
    anio_aprox: -2500,
    lat: 51.1789,
    lng: -1.8262,
    descripcion: 'Monumento megalítico neolítico en la llanura de Salisbury, construido entre el 3000 y el 2000 a.C.',
    thumbnail: 'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Stonehenge-England-United-Kingdom/',
    fuente: 'AirPano'
  },
  {
    slug: 'hagia-sofia',
    lugar: 'Santa Sofía (Hagia Sophia)',
    aliases: ['hagia sofia', 'santa sofia', 'estambul', 'istanbul', 'constantinopla', 'bizancio'],
    epoca: 'Edad Media',
    anio_aprox: 537,
    lat: 41.0086,
    lng: 28.9802,
    descripcion: 'Catedral bizantina mandada construir por Justiniano I, convertida en mezquita tras la caída de Constantinopla en 1453.',
    thumbnail: 'https://images.unsplash.com/photo-1541432101876-d4f0a5d1c89f?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Aya-Sofia-Istanbul-Turkey/',
    fuente: 'AirPano'
  },
  {
    slug: 'chichen-itza',
    lugar: 'Chichén Itzá',
    aliases: ['chichen itza', 'chichen-itza', 'maya', 'kukulcan', 'yucatan'],
    epoca: 'América precolombina',
    anio_aprox: 900,
    lat: 20.6843,
    lng: -88.5678,
    descripcion: 'Ciudad maya en Yucatán con la pirámide de Kukulcán, donde el equinoccio dibuja una serpiente de luz en sus escalones.',
    thumbnail: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Chichen-Itza-Mexico/',
    fuente: 'AirPano'
  },
  {
    slug: 'tenochtitlan-templo-mayor',
    lugar: 'Templo Mayor (Tenochtitlán)',
    aliases: ['templo mayor', 'tenochtitlan', 'azteca', 'mexica', 'ciudad de mexico'],
    epoca: 'América precolombina',
    anio_aprox: 1487,
    lat: 19.4351,
    lng: -99.1318,
    descripcion: 'Centro ceremonial mexica de Tenochtitlán dedicado a Huitzilopochtli y Tláloc, descubierto bajo el Zócalo de Ciudad de México.',
    thumbnail: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=600&q=80',
    url: 'https://artsandculture.google.com/streetview/templo-mayor/',
    fuente: 'Google Arts & Culture'
  },
  {
    slug: 'pompeya',
    lugar: 'Pompeya',
    aliases: ['pompeya', 'pompeii', 'vesubio', 'napoles', 'naples'],
    epoca: 'Roma imperial',
    anio_aprox: 79,
    lat: 40.7497,
    lng: 14.4869,
    descripcion: 'Ciudad romana sepultada por la erupción del Vesubio en el año 79 d.C., conservada bajo cenizas durante 1.700 años.',
    thumbnail: 'https://images.unsplash.com/photo-1552432552-06c0b0a94dda?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Pompeii-Italy/',
    fuente: 'AirPano'
  },
  {
    slug: 'persepolis',
    lugar: 'Persépolis',
    aliases: ['persepolis', 'persia', 'iran', 'aqueménida', 'dario'],
    epoca: 'Antigüedad',
    anio_aprox: -515,
    lat: 29.9354,
    lng: 52.8916,
    descripcion: 'Capital ceremonial del Imperio Aqueménida fundada por Darío I, destruida por Alejandro Magno en el 330 a.C.',
    thumbnail: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Persepolis-Iran/',
    fuente: 'AirPano'
  },
  {
    slug: 'mont-saint-michel',
    lugar: 'Mont Saint-Michel',
    aliases: ['mont saint michel', 'mont-saint-michel', 'normandia', 'francia medieval'],
    epoca: 'Edad Media',
    anio_aprox: 1023,
    lat: 48.6361,
    lng: -1.5115,
    descripcion: 'Abadía benedictina construida sobre una isla rocosa en Normandía, faro espiritual del Occidente medieval.',
    thumbnail: 'https://images.unsplash.com/photo-1591289009723-aef022e6e02b?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Mont-Saint-Michel-France/',
    fuente: 'AirPano'
  },
  {
    slug: 'alhambra-granada',
    lugar: 'Alhambra de Granada',
    aliases: ['alhambra', 'granada', 'al-andalus', 'andalus', 'nazari'],
    epoca: 'Edad Media',
    anio_aprox: 1238,
    lat: 37.1761,
    lng: -3.5881,
    descripcion: 'Complejo palaciego nazarí en Granada, último bastión de Al-Ándalus hasta su rendición a los Reyes Católicos en 1492.',
    thumbnail: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Alhambra-Spain/',
    fuente: 'AirPano'
  },
  {
    slug: 'versalles',
    lugar: 'Palacio de Versalles',
    aliases: ['versalles', 'versailles', 'luis xiv', 'rey sol', 'francia moderna'],
    epoca: 'Edad Moderna',
    anio_aprox: 1682,
    lat: 48.8049,
    lng: 2.1204,
    descripcion: 'Residencia real construida por Luis XIV, símbolo del absolutismo y escenario del Tratado de Versalles de 1919.',
    thumbnail: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=600&q=80',
    url: 'https://artsandculture.google.com/streetview/palace-of-versailles/',
    fuente: 'Google Arts & Culture'
  },
  {
    slug: 'notre-dame-paris',
    lugar: 'Notre-Dame de París',
    aliases: ['notre dame', 'notre-dame', 'paris', 'catedral parisina'],
    epoca: 'Edad Media',
    anio_aprox: 1345,
    lat: 48.8530,
    lng: 2.3499,
    descripcion: 'Catedral gótica de París iniciada en 1163, coronación de Napoleón en 1804, restaurada tras el incendio de 2019.',
    thumbnail: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Notre-Dame-Paris-France/',
    fuente: 'AirPano'
  },
  {
    slug: 'cartago',
    lugar: 'Cartago',
    aliases: ['cartago', 'carthage', 'fenicios', 'tunez', 'guerras punicas'],
    epoca: 'Antigüedad',
    anio_aprox: -814,
    lat: 36.8525,
    lng: 10.3236,
    descripcion: 'Ciudad fenicia fundada por Dido, capital del imperio cartaginés derrotado por Roma en las guerras púnicas.',
    thumbnail: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Carthage-Tunisia/',
    fuente: 'AirPano'
  },
  {
    slug: 'foro-romano',
    lugar: 'Foro Romano',
    aliases: ['foro romano', 'foro', 'roma antigua', 'palatino'],
    epoca: 'Roma imperial',
    anio_aprox: -50,
    lat: 41.8925,
    lng: 12.4853,
    descripcion: 'Centro político, religioso y comercial de la antigua Roma, donde se asesinó a Julio César y se forjó la república.',
    thumbnail: 'https://images.unsplash.com/photo-1552432552-06c0b0a94dda?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Roman-Forum-Italy/',
    fuente: 'AirPano'
  },
  {
    slug: 'ciudad-prohibida',
    lugar: 'Ciudad Prohibida',
    aliases: ['ciudad prohibida', 'forbidden city', 'beijing', 'pekin', 'ming', 'qing'],
    epoca: 'Edad Moderna',
    anio_aprox: 1420,
    lat: 39.9163,
    lng: 116.3972,
    descripcion: 'Palacio imperial de las dinastías Ming y Qing en Pekín, residencia de 24 emperadores durante casi 500 años.',
    thumbnail: 'https://images.unsplash.com/photo-1508804052814-cd3ba865a116?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Forbidden-City-Beijing-China/',
    fuente: 'AirPano'
  },
  {
    slug: 'palacio-knossos',
    lugar: 'Palacio de Cnosos',
    aliases: ['cnosos', 'knossos', 'creta', 'minoicos', 'minotauro'],
    epoca: 'Antigüedad',
    anio_aprox: -1700,
    lat: 35.2980,
    lng: 25.1633,
    descripcion: 'Palacio minoico de Creta excavado por Arthur Evans, cuna del mito del Minotauro y el laberinto de Dédalo.',
    thumbnail: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=600&q=80',
    url: 'https://artsandculture.google.com/streetview/knossos/',
    fuente: 'Google Arts & Culture'
  },
  {
    slug: 'capilla-sixtina',
    lugar: 'Capilla Sixtina',
    aliases: ['capilla sixtina', 'sixtina', 'vaticano', 'miguel angel', 'michelangelo'],
    epoca: 'Edad Moderna',
    anio_aprox: 1512,
    lat: 41.9029,
    lng: 12.4545,
    descripcion: 'Capilla del Vaticano donde Miguel Ángel pintó la bóveda (1508-1512) y el Juicio Final (1541).',
    thumbnail: 'https://images.unsplash.com/photo-1552432552-06c0b0a94dda?w=600&q=80',
    url: 'https://www.vatican.va/various/cappelle/sistina_vr/index.html',
    fuente: 'Vaticano oficial'
  },
  {
    slug: 'teotihuacan',
    lugar: 'Teotihuacán',
    aliases: ['teotihuacan', 'piramide del sol', 'piramide de la luna', 'mexico antiguo'],
    epoca: 'América precolombina',
    anio_aprox: 200,
    lat: 19.6925,
    lng: -98.8438,
    descripcion: 'La "ciudad de los dioses", metrópolis mesoamericana con las Pirámides del Sol y la Luna, anterior a los aztecas.',
    thumbnail: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Teotihuacan-Mexico/',
    fuente: 'AirPano'
  },
  {
    slug: 'tikal',
    lugar: 'Tikal',
    aliases: ['tikal', 'guatemala', 'maya clasico'],
    epoca: 'América precolombina',
    anio_aprox: 750,
    lat: 17.2220,
    lng: -89.6237,
    descripcion: 'Capital del reino maya de Mutul en la selva guatemalteca, con pirámides templo que sobresalen del dosel forestal.',
    thumbnail: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Tikal-Guatemala/',
    fuente: 'AirPano'
  },
  {
    slug: 'ephesus',
    lugar: 'Éfeso (Biblioteca de Celso)',
    aliases: ['efeso', 'ephesus', 'turquia', 'biblioteca celso', 'jonia'],
    epoca: 'Roma imperial',
    anio_aprox: 117,
    lat: 37.9415,
    lng: 27.3417,
    descripcion: 'Ciudad griega-romana en la costa de Anatolia, hogar del Templo de Artemisa y la Biblioteca de Celso.',
    thumbnail: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Ephesus-Turkey/',
    fuente: 'AirPano'
  },
  {
    slug: 'cuevas-lascaux',
    lugar: 'Cuevas de Lascaux',
    aliases: ['lascaux', 'cuevas', 'paleolitico', 'dordoña', 'francia prehistorica'],
    epoca: 'Antigüedad',
    anio_aprox: -17000,
    lat: 45.0535,
    lng: 1.1683,
    descripcion: 'Cueva paleolítica con pinturas rupestres de hace 17.000 años, descubierta en 1940 por cuatro adolescentes.',
    thumbnail: 'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=600&q=80',
    url: 'https://archeologie.culture.gouv.fr/lascaux/en/visit-cave',
    fuente: 'Ministerio de Cultura de Francia'
  },
  {
    slug: 'gobekli-tepe',
    lugar: 'Göbekli Tepe',
    aliases: ['gobekli', 'gobekli tepe', 'göbekli tepe', 'neolitico', 'turquia prehistoria'],
    epoca: 'Antigüedad',
    anio_aprox: -9500,
    lat: 37.2236,
    lng: 38.9225,
    descripcion: 'El templo más antiguo conocido (9500 a.C.), reescribiendo la historia de la civilización humana.',
    thumbnail: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Gobekli-Tepe-Turkey/',
    fuente: 'AirPano'
  },
  {
    slug: 'pirámide-sakkara',
    lugar: 'Pirámide escalonada de Saqqara',
    aliases: ['saqqara', 'sakkara', 'djoser', 'imhotep', 'egipto antiguo'],
    epoca: 'Antigüedad',
    anio_aprox: -2630,
    lat: 29.8713,
    lng: 31.2164,
    descripcion: 'La pirámide más antigua de Egipto, diseñada por Imhotep para el faraón Djoser, inicio de la era de las pirámides.',
    thumbnail: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Saqqara-Egypt/',
    fuente: 'AirPano'
  },
  {
    slug: 'monte-rushmore',
    lugar: 'Monte Rushmore',
    aliases: ['rushmore', 'monte rushmore', 'mount rushmore', 'eeuu', 'estados unidos'],
    epoca: 'Edad Contemporánea',
    anio_aprox: 1941,
    lat: 43.8791,
    lng: -103.4591,
    descripcion: 'Esculturas de 18 m de cuatro presidentes estadounidenses talladas en el Monte Rushmore entre 1927 y 1941.',
    thumbnail: 'https://images.unsplash.com/photo-1568736333610-eae6e0ab9206?w=600&q=80',
    url: 'https://www.airpano.com/360photo/Mount-Rushmore-USA/',
    fuente: 'AirPano'
  }
];

/**
 * Normaliza un texto para matching (lowercase, sin tildes, sin signos).
 */
function normalize(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Distancia haversine en km entre dos puntos lat/lng.
 */
function distanciaKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some(v => v === null || v === undefined || isNaN(v))) return Infinity;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Devuelve la visita virtual que coincide con un lugar (string) y/o coordenadas.
 * Prioridad: match exacto de alias > match parcial > cercanía geográfica <60km.
 */
function buscarVisita({ lugar, lat, lng }) {
  const target = normalize(lugar);

  // 1. Match exacto por alias
  if (target) {
    for (const v of VISITAS_VIRTUALES) {
      if (v.aliases.some(a => normalize(a) === target)) return v;
    }
    // 2. Match parcial: alias contenido o que contiene
    for (const v of VISITAS_VIRTUALES) {
      if (v.aliases.some(a => {
        const na = normalize(a);
        return na.length >= 4 && (target.includes(na) || na.includes(target));
      })) return v;
    }
  }

  // 3. Match geográfico (<60km)
  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
    let best = null;
    let bestDist = Infinity;
    for (const v of VISITAS_VIRTUALES) {
      const d = distanciaKm(Number(lat), Number(lng), v.lat, v.lng);
      if (d < bestDist && d <= 60) { best = v; bestDist = d; }
    }
    if (best) return best;
  }

  return null;
}

module.exports = { VISITAS_VIRTUALES, buscarVisita, normalize, distanciaKm };
