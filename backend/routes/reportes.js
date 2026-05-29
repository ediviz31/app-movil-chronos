/**
 * Rutas de Reportes Comunitarios.
 * Montadas en /api/reportes.
 *
 *  POST   /              Cualquier cronista autenticado puede reportar.
 *  GET    /              Sólo admin: listar reportes con filtros.
 *  PATCH  /:id           Sólo admin: cambiar estado + acción tomada.
 *  GET    /mios          Cronista: ver sus propios reportes y su estado.
 */
const express = require('express');
const mongoose = require('mongoose');
const Reporte = require('../models/Reporte');
const Publicacion = require('../models/Publicacion');
const Comentario = require('../models/Comentario');
const Fragmento = require('../models/Fragmento');
const Capsula = require('../models/Capsula');
const User = require('../models/User');

const MOTIVOS = ['spam', 'odio', 'desinformacion', 'violencia', 'desnudez', 'plagio', 'acoso', 'otro'];
const TIPOS = ['relato', 'comentario', 'fragmento', 'capsula', 'usuario'];

async function obtenerSnapshot(tipo, id) {
  try {
    const oid = new mongoose.Types.ObjectId(id);
    if (tipo === 'relato') {
      const r = await Publicacion.findById(oid).select('titulo contenido').lean();
      return { snapshot_titulo: r?.titulo || '', snapshot_texto: (r?.contenido || '').slice(0, 400) };
    }
    if (tipo === 'comentario') {
      const c = await Comentario.findById(oid).select('contenido').lean();
      return { snapshot_titulo: 'Comentario', snapshot_texto: (c?.contenido || '').slice(0, 400) };
    }
    if (tipo === 'fragmento') {
      const f = await Fragmento.findById(oid).select('titulo descripcion').lean();
      return { snapshot_titulo: f?.titulo || '', snapshot_texto: (f?.descripcion || '').slice(0, 400) };
    }
    if (tipo === 'capsula') {
      const c = await Capsula.findById(oid).select('texto autor').lean();
      return { snapshot_titulo: c?.autor || 'Cápsula', snapshot_texto: (c?.texto || '').slice(0, 400) };
    }
    if (tipo === 'usuario') {
      const u = await User.findById(oid).select('nombre usuario bio').lean();
      return { snapshot_titulo: u?.nombre || '', snapshot_texto: (u?.bio || '').slice(0, 400) };
    }
  } catch (_) { /* silencioso */ }
  return { snapshot_titulo: '', snapshot_texto: '' };
}

module.exports = function createReportesRouter({ auth, requireAdmin }) {
  const router = express.Router();

  /** POST /api/reportes — crear reporte */
  router.post('/', auth, async (req, res) => {
    try {
      const { tipo_objetivo, objetivo_id, motivo, detalle } = req.body || {};
      if (!TIPOS.includes(tipo_objetivo)) {
        return res.status(400).json({ error: 'tipo_objetivo inválido' });
      }
      if (!objetivo_id || !mongoose.Types.ObjectId.isValid(objetivo_id)) {
        return res.status(400).json({ error: 'objetivo_id inválido' });
      }
      if (!MOTIVOS.includes(motivo)) {
        return res.status(400).json({ error: 'motivo inválido' });
      }
      if (detalle && detalle.length > 600) {
        return res.status(400).json({ error: 'Detalle demasiado largo (máx 600)' });
      }

      const snapshot = await obtenerSnapshot(tipo_objetivo, objetivo_id);

      try {
        const r = await Reporte.create({
          reportador_id: req.userId,
          tipo_objetivo,
          objetivo_id,
          motivo,
          detalle: detalle || '',
          ...snapshot
        });
        return res.status(201).json({ ok: true, id: r._id });
      } catch (e) {
        if (e.code === 11000) {
          return res.status(409).json({ error: 'Ya reportaste este contenido' });
        }
        throw e;
      }
    } catch (err) {
      console.error('[POST /reportes] error:', err.message);
      res.status(500).json({ error: 'No se pudo registrar el reporte' });
    }
  });

  /** GET /api/reportes/mios — mis propios reportes (cualquier autenticado) */
  router.get('/mios', auth, async (req, res) => {
    try {
      const items = await Reporte.find({ reportador_id: req.userId })
        .sort({ creado_en: -1 })
        .limit(50)
        .lean();
      res.json({ items });
    } catch (err) {
      console.error('[GET /reportes/mios] error:', err.message);
      res.status(500).json({ error: 'Error obteniendo tus reportes' });
    }
  });

  /** GET /api/reportes — listar (solo admin) */
  router.get('/', auth, requireAdmin, async (req, res) => {
    try {
      const { estado, tipo, page = 1, limit = 30 } = req.query;
      const filter = {};
      if (estado && ['pendiente', 'revisado', 'desestimado'].includes(estado)) {
        filter.estado = estado;
      }
      if (tipo && TIPOS.includes(tipo)) {
        filter.tipo_objetivo = tipo;
      }
      const p = Math.max(1, parseInt(page));
      const l = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (p - 1) * l;

      const [items, total] = await Promise.all([
        Reporte.find(filter)
          .populate('reportador_id', 'nombre usuario avatar')
          .populate('revisado_por', 'nombre usuario')
          .sort({ creado_en: -1 })
          .skip(skip)
          .limit(l)
          .lean(),
        Reporte.countDocuments(filter)
      ]);

      // Conteos rápidos por estado para el header del panel
      const counts = await Reporte.aggregate([
        { $group: { _id: '$estado', n: { $sum: 1 } } }
      ]);
      const counters = { pendiente: 0, revisado: 0, desestimado: 0 };
      counts.forEach(c => { counters[c._id] = c.n; });

      res.json({ items, total, page: p, pages: Math.ceil(total / l), counters });
    } catch (err) {
      console.error('[GET /reportes] error:', err.message);
      res.status(500).json({ error: 'Error obteniendo reportes' });
    }
  });

  /** PATCH /api/reportes/:id — cambiar estado/acción (solo admin) */
  router.patch('/:id', auth, requireAdmin, async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }
      const { estado, accion_tomada, nota_admin } = req.body || {};

      const r = await Reporte.findById(req.params.id);
      if (!r) return res.status(404).json({ error: 'No encontrado' });

      if (estado && ['pendiente', 'revisado', 'desestimado'].includes(estado)) {
        r.estado = estado;
        r.revisado_por = req.userId;
        r.revisado_en = new Date();
      }
      if (accion_tomada && ['ninguna', 'contenido_eliminado', 'usuario_advertido', 'usuario_bloqueado'].includes(accion_tomada)) {
        r.accion_tomada = accion_tomada;
      }
      if (typeof nota_admin === 'string') {
        r.nota_admin = nota_admin.slice(0, 600);
      }
      await r.save();

      // Si la acción es eliminar contenido, lo hacemos físicamente
      if (accion_tomada === 'contenido_eliminado') {
        try {
          if (r.tipo_objetivo === 'relato') await Publicacion.findByIdAndDelete(r.objetivo_id);
          else if (r.tipo_objetivo === 'comentario') await Comentario.findByIdAndDelete(r.objetivo_id);
          else if (r.tipo_objetivo === 'fragmento') await Fragmento.findByIdAndDelete(r.objetivo_id);
          else if (r.tipo_objetivo === 'capsula') await Capsula.findByIdAndDelete(r.objetivo_id);
        } catch (e) { console.error('Error eliminando contenido reportado:', e.message); }
      }

      res.json({ ok: true, reporte: r });
    } catch (err) {
      console.error('[PATCH /reportes/:id] error:', err.message);
      res.status(500).json({ error: 'Error actualizando reporte' });
    }
  });

  return router;
};
