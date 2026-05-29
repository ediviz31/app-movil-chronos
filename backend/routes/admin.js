/**
 * Rutas de administración — sólo admin.
 * Montadas en /api/admin.
 *
 *  GET /stats          — métricas para el dashboard (usuarios, activos, contenido)
 *  GET /usuarios       — listado de usuarios con búsqueda y paginación
 *  PATCH /usuarios/:id — promover/degradar admin, bloquear, etc.
 */
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Publicacion = require('../models/Publicacion');
const Fragmento = require('../models/Fragmento');
const Capsula = require('../models/Capsula');
const Comentario = require('../models/Comentario');
const Reporte = require('../models/Reporte');

module.exports = function createAdminRouter({ auth, requireAdmin }) {
  const router = express.Router();
  router.use(auth, requireAdmin);

  /** GET /api/admin/stats — métricas del archivo */
  router.get('/stats', async (req, res) => {
    try {
      const now = new Date();
      const min5 = new Date(now.getTime() - 5 * 60 * 1000);
      const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
      const startWeek = new Date(now); startWeek.setDate(startWeek.getDate() - 7);
      const startMonth = new Date(now); startMonth.setDate(startMonth.getDate() - 30);

      const [
        totalUsuarios,
        activosAhora,
        activos24h,
        activos7d,
        nuevosHoy,
        nuevosSemana,
        nuevosMes,
        totalRelatos,
        totalFragmentos,
        totalCapsulas,
        totalComentarios,
        reportesPendientes
      ] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ ultimo_visto: { $gte: min5 } }),
        User.countDocuments({ ultimo_visto: { $gte: h24 } }),
        User.countDocuments({ ultimo_visto: { $gte: d7 } }),
        User.countDocuments({ creado_en: { $gte: startToday } }),
        User.countDocuments({ creado_en: { $gte: startWeek } }),
        User.countDocuments({ creado_en: { $gte: startMonth } }),
        Publicacion.countDocuments({}),
        Fragmento.countDocuments({}),
        Capsula.countDocuments({}),
        Comentario.countDocuments({}),
        Reporte.countDocuments({ estado: 'pendiente' })
      ]);

      // Serie diaria de últimos 14 días para gráfico
      const start14 = new Date(now); start14.setDate(start14.getDate() - 13); start14.setHours(0, 0, 0, 0);
      const serieUsuarios = await User.aggregate([
        { $match: { creado_en: { $gte: start14 } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$creado_en' } },
            n: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      // Rellenar días sin registros con 0
      const serie = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(start14); d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        const found = serieUsuarios.find(s => s._id === key);
        serie.push({ fecha: key, n: found ? found.n : 0 });
      }

      res.json({
        usuarios: {
          total: totalUsuarios,
          activos_ahora: activosAhora,
          activos_24h: activos24h,
          activos_7d: activos7d,
          nuevos_hoy: nuevosHoy,
          nuevos_semana: nuevosSemana,
          nuevos_mes: nuevosMes
        },
        contenido: {
          relatos: totalRelatos,
          fragmentos: totalFragmentos,
          capsulas: totalCapsulas,
          comentarios: totalComentarios
        },
        moderacion: {
          reportes_pendientes: reportesPendientes
        },
        serie_registros_14d: serie
      });
    } catch (err) {
      console.error('[GET /admin/stats] error:', err.message);
      res.status(500).json({ error: 'Error obteniendo métricas' });
    }
  });

  /** GET /api/admin/usuarios — listado con búsqueda */
  router.get('/usuarios', async (req, res) => {
    try {
      const { q = '', page = 1, limit = 25 } = req.query;
      const filter = {};
      if (q.trim()) {
        const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ nombre: rx }, { usuario: rx }, { correo: rx }];
      }
      const p = Math.max(1, parseInt(page));
      const l = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (p - 1) * l;

      const [items, total] = await Promise.all([
        User.find(filter)
          .select('nombre usuario correo avatar rol ultimo_visto creado_en')
          .sort({ creado_en: -1 })
          .skip(skip)
          .limit(l)
          .lean(),
        User.countDocuments(filter)
      ]);

      res.json({ items, total, page: p, pages: Math.ceil(total / l) });
    } catch (err) {
      console.error('[GET /admin/usuarios] error:', err.message);
      res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
  });

  /** PATCH /api/admin/usuarios/:id — promover/degradar admin */
  router.patch('/usuarios/:id', async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }
      const { rol } = req.body || {};
      if (!['usuario', 'admin'].includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }
      // Prevenir que un admin se auto-degrade dejando 0 admins
      if (rol === 'usuario') {
        const adminsRestantes = await User.countDocuments({ rol: 'admin', _id: { $ne: req.params.id } });
        if (adminsRestantes === 0) {
          return res.status(400).json({ error: 'No puedes degradar al último admin del archivo' });
        }
      }
      const u = await User.findByIdAndUpdate(
        req.params.id,
        { rol },
        { new: true, select: 'nombre usuario correo rol' }
      );
      if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json({ ok: true, usuario: u });
    } catch (err) {
      console.error('[PATCH /admin/usuarios/:id] error:', err.message);
      res.status(500).json({ error: 'Error actualizando usuario' });
    }
  });

  return router;
};
