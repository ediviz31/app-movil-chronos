/**
 * Endpoints de Visitas Virtuales 360°.
 *
 * GET  /api/visitas             → catálogo completo
 * GET  /api/visitas/sugerir     → match por ?lugar=&lat=&lng=
 * GET  /api/visitas/:slug       → ficha de una visita
 */

const express = require('express');
const { VISITAS_VIRTUALES, buscarVisita } = require('../data/visitas_virtuales');
const PANORAMAS_360 = require('../data/visitas_360_imagenes');

/**
 * Enriquece una visita con la URL panorámica 360° si la tenemos en el catálogo interno.
 * Devuelve { ...visita, panorama_360 } siempre que el slug esté mapeado.
 */
function enriquecer(v) {
  if (!v) return v;
  const panorama_360 = PANORAMAS_360[v.slug] || null;
  return { ...v, panorama_360, soporta_360_interno: !!panorama_360 };
}

module.exports = function createVisitasRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    const epoca = req.query.epoca;
    let items = VISITAS_VIRTUALES;
    if (epoca) {
      items = items.filter(v => v.epoca === epoca);
    }
    const enriched = items.map(enriquecer);
    res.json({ total: enriched.length, items: enriched });
  });

  router.get('/sugerir', (req, res) => {
    const { lugar, lat, lng } = req.query;
    const visita = buscarVisita({
      lugar,
      lat: lat !== undefined ? Number(lat) : null,
      lng: lng !== undefined ? Number(lng) : null
    });
    if (!visita) return res.json({ disponible: false });
    res.json({ disponible: true, visita: enriquecer(visita) });
  });

  router.get('/:slug', (req, res) => {
    const v = VISITAS_VIRTUALES.find(x => x.slug === req.params.slug);
    if (!v) return res.status(404).json({ error: 'Visita no encontrada' });
    res.json(enriquecer(v));
  });

  return router;
};
