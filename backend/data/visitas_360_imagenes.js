/**
 * Mapeo slug → URL equirectangular 360° (dominio público o licencia libre).
 * Usado por el viewer interno Pannellum (sin salir de Chronos).
 *
 * Fuentes: Wikimedia Commons, Flickr CC, NASA.
 * Si un slug no está aquí, se cae al modo "abrir en pestaña externa".
 *
 * Para añadir más:
 *   1. Buscar en Wikimedia Commons: "Category:360° panoramas" + nombre del lugar
 *   2. Verificar que la imagen sea equirectangular (proporción 2:1)
 *   3. Usar la URL directa al archivo .jpg
 */
module.exports = {
  'coliseo-romano':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Inside_the_Colosseum_-_panoramic_360_view.jpg/2048px-Inside_the_Colosseum_-_panoramic_360_view.jpg',
  'piramides-giza':
    'https://upload.wikimedia.org/wikipedia/commons/3/3c/Giza_Plateau_-_360_panorama.jpg',
  'acropolis-atenas':
    'https://upload.wikimedia.org/wikipedia/commons/6/65/Athens_-_Acropolis_-_panorama.jpg',
  'machu-picchu':
    'https://upload.wikimedia.org/wikipedia/commons/4/4e/Machu_Picchu_-_360_panorama.jpg',
  'petra':
    'https://upload.wikimedia.org/wikipedia/commons/2/29/Petra_Treasury_360_panorama.jpg',
  'stonehenge':
    'https://upload.wikimedia.org/wikipedia/commons/0/01/Stonehenge_-_panorama.jpg',
  'hagia-sofia':
    'https://upload.wikimedia.org/wikipedia/commons/5/52/Hagia_Sophia_interior_panorama.jpg',
  'angkor-wat':
    'https://upload.wikimedia.org/wikipedia/commons/c/c8/Angkor_Wat_-_panorama.jpg',
  'pompeya':
    'https://upload.wikimedia.org/wikipedia/commons/d/d1/Pompeii_-_panorama.jpg',
  'taj-mahal':
    'https://upload.wikimedia.org/wikipedia/commons/8/89/Taj_Mahal_panorama.jpg'
};
