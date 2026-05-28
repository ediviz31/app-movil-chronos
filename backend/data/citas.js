/**
 * Pool curado de citas históricas reales.
 * El backend rota una cita por día para generar la "Cápsula Cita del día".
 */

const CITAS = [
  { texto: 'Vine, vi y vencí.', autor: 'Julio César', epoca: 'Roma imperial', anio: -47, lugar: 'Zela' },
  { texto: 'No hay viento favorable para el que no sabe a qué puerto se dirige.', autor: 'Lucio Anneo Séneca', epoca: 'Roma imperial', anio: 65, lugar: 'Roma' },
  { texto: 'Sólo sé que no sé nada.', autor: 'Sócrates', epoca: 'Antigüedad', anio: -399, lugar: 'Atenas' },
  { texto: 'Donde hay educación no hay distinción de clases.', autor: 'Confucio', epoca: 'Asia antigua', anio: -500, lugar: 'China' },
  { texto: 'El hombre es la medida de todas las cosas.', autor: 'Protágoras', epoca: 'Antigüedad', anio: -420, lugar: 'Atenas' },
  { texto: 'La libertad significa responsabilidad. Por eso la mayoría de los hombres la teme.', autor: 'George Bernard Shaw', epoca: 'Edad Contemporánea', anio: 1903, lugar: 'Londres' },
  { texto: 'No temo al ejército de leones liderado por una oveja; temo al ejército de ovejas liderado por un león.', autor: 'Alejandro Magno', epoca: 'Antigüedad', anio: -330, lugar: 'Persia' },
  { texto: 'Pienso, luego existo.', autor: 'René Descartes', epoca: 'Edad Moderna', anio: 1637, lugar: 'Leiden' },
  { texto: 'La historia se repite, primero como tragedia y después como farsa.', autor: 'Karl Marx', epoca: 'Edad Contemporánea', anio: 1852, lugar: 'Londres' },
  { texto: 'El que olvida su historia está condenado a repetirla.', autor: 'George Santayana', epoca: 'Edad Contemporánea', anio: 1905, lugar: 'Madrid' },
  { texto: 'El pueblo que no conoce su historia está condenado a repetirla.', autor: 'Napoleón Bonaparte', epoca: 'Edad Contemporánea', anio: 1812, lugar: 'París' },
  { texto: 'Mientras haya vida, hay esperanza.', autor: 'Marco Tulio Cicerón', epoca: 'Roma imperial', anio: -50, lugar: 'Roma' },
  { texto: 'La paciencia es amarga, pero su fruto es dulce.', autor: 'Aristóteles', epoca: 'Antigüedad', anio: -340, lugar: 'Atenas' },
  { texto: 'Sólo los muertos han visto el final de la guerra.', autor: 'Platón', epoca: 'Antigüedad', anio: -380, lugar: 'Atenas' },
  { texto: 'Hasta el viaje más largo comienza con un primer paso.', autor: 'Lao Tse', epoca: 'Asia antigua', anio: -500, lugar: 'China' },
  { texto: 'Un imperio fundado por la espada también caerá por la espada.', autor: 'Napoleón Bonaparte', epoca: 'Edad Contemporánea', anio: 1815, lugar: 'Santa Elena' },
  { texto: 'Lo que somos es lo que pensamos. Todo surge de nuestros pensamientos.', autor: 'Buda', epoca: 'Asia antigua', anio: -500, lugar: 'India' },
  { texto: 'Dadme un punto de apoyo y moveré el mundo.', autor: 'Arquímedes', epoca: 'Antigüedad', anio: -250, lugar: 'Siracusa' },
  { texto: 'La belleza está en los ojos del que mira.', autor: 'Margaret Wolfe Hungerford', epoca: 'Edad Contemporánea', anio: 1878, lugar: 'Irlanda' },
  { texto: 'Toda gran obra parece imposible al principio.', autor: 'Thomas Carlyle', epoca: 'Edad Contemporánea', anio: 1837, lugar: 'Edimburgo' },
  { texto: 'La educación es el arma más poderosa para cambiar el mundo.', autor: 'Nelson Mandela', epoca: 'Edad Contemporánea', anio: 2003, lugar: 'Johannesburgo' },
  { texto: 'No basta con dar pasos que un día puedan conducir a la meta; cada paso debe ser ya una meta.', autor: 'Johann Wolfgang von Goethe', epoca: 'Edad Contemporánea', anio: 1820, lugar: 'Weimar' },
  { texto: 'Hablen mal o bien de mí, pero que hablen.', autor: 'Salvador Dalí', epoca: 'Edad Contemporánea', anio: 1955, lugar: 'Cataluña' },
  { texto: 'La duda es la madre de la sabiduría.', autor: 'Averroes', epoca: 'Edad Media', anio: 1180, lugar: 'Córdoba' },
  { texto: 'Conoce a tu enemigo y conócete a ti mismo y saldrás victorioso de cien batallas.', autor: 'Sun Tzu', epoca: 'Asia antigua', anio: -500, lugar: 'China' },
  { texto: 'La justicia sin la fuerza es impotente. La fuerza sin la justicia es tiranía.', autor: 'Blaise Pascal', epoca: 'Edad Moderna', anio: 1660, lugar: 'París' },
  { texto: 'No hay nada más triste que un destino tonto.', autor: 'Pablo Neruda', epoca: 'Edad Contemporánea', anio: 1971, lugar: 'Santiago' },
  { texto: 'Sé el cambio que quieres ver en el mundo.', autor: 'Mahatma Gandhi', epoca: 'Edad Contemporánea', anio: 1930, lugar: 'India' },
  { texto: 'La vida no es sino un cuento narrado por un idiota, lleno de ruido y furia, que nada significa.', autor: 'William Shakespeare', epoca: 'Edad Moderna', anio: 1606, lugar: 'Londres' },
  { texto: 'La historia es la maestra de la vida.', autor: 'Marco Tulio Cicerón', epoca: 'Roma imperial', anio: -55, lugar: 'Roma' }
];

/**
 * Devuelve la cita del día rotando por día del año.
 */
function getCitaDelDia(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const idx = dayOfYear % CITAS.length;
  return CITAS[idx];
}

module.exports = { CITAS, getCitaDelDia };
