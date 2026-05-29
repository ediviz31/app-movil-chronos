/**
 * Rutas para "Fragmentos del Tiempo" — Reels históricos.
 * Montadas en /api/fragmentos.
 *
 * GET    /              → feed paginado, ?categoria=&page=&limit=
 * GET    /:id           → fragmento individual
 * POST   /              → crear (multipart: video, titulo, descripcion, categoria, lugar?, anio?, fuente?)
 * POST   /:id/avalar    → toggle aval (like)
 * POST   /:id/archivar  → toggle archivar
 * POST   /:id/vista     → incrementa visualizaciones
 * DELETE /:id           → eliminar mi fragmento
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const Fragmento = require('../models/Fragmento');
const objStore = require('../utils/objectStore');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      const ok = /^video\//.test(file.mimetype);
      return cb(ok ? null : new Error('Video inválido'), ok);
    }
    cb(null, false);
  }
});

async function saveVideoToStore(file) {
  const ext = (file.originalname.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = 'frag-' + Date.now().toString(36) + '-' + crypto.randomBytes(8).toString('hex');
  const objectPath = objStore.buildPath('videos', `${id}.${ext}`);
  await objStore.putObject(objectPath, file.buffer, file.mimetype);
  return objStore.publicUrl(objectPath);
}

module.exports = function createFragmentosRouter({ auth, authOptional }) {
  const router = express.Router();

  /** GET /api/fragmentos — feed con filtros y paginación */
  router.get('/', authOptional, async (req, res) => {
    try {
      const { categoria, page = 1, limit = 10 } = req.query;
      const filter = {};
      if (categoria && ['historia_local', 'personajes', 'lugares', 'documentos'].includes(categoria)) {
        filter.categoria = categoria;
      }
      const p = Math.max(1, parseInt(page));
      const l = Math.min(20, Math.max(1, parseInt(limit)));
      const skip = (p - 1) * l;

      const [items, total] = await Promise.all([
        Fragmento.find(filter)
          .populate('usuario_id', 'nombre usuario avatar')
          .sort({ creado_en: -1 })
          .skip(skip)
          .limit(l)
          .lean(),
        Fragmento.countDocuments(filter)
      ]);

      const userId = req.userId ? String(req.userId) : null;
      const enriched = items.map(f => ({
        ...f,
        total_avales: (f.avales || []).length,
        usuario_avalo: userId ? (f.avales || []).some(id => String(id) === userId) : false,
        usuario_archivo: userId ? (f.archivado_por || []).some(id => String(id) === userId) : false,
        avales: undefined,
        archivado_por: undefined
      }));

      res.json({ items: enriched, total, page: p, pages: Math.ceil(total / l) });
    } catch (err) {
      console.error('Error GET /fragmentos:', err);
      res.status(500).json({ error: 'Error al obtener fragmentos' });
    }
  });

  /** GET /api/fragmentos/:id */
  router.get('/:id', authOptional, async (req, res) => {
    try {
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: 'ID inválido' });
      }
      const f = await Fragmento.findById(req.params.id)
        .populate('usuario_id', 'nombre usuario avatar')
        .lean();
      if (!f) return res.status(404).json({ error: 'No encontrado' });
      const userId = req.userId ? String(req.userId) : null;
      res.json({
        ...f,
        total_avales: (f.avales || []).length,
        usuario_avalo: userId ? (f.avales || []).some(id => String(id) === userId) : false,
        usuario_archivo: userId ? (f.archivado_por || []).some(id => String(id) === userId) : false,
        avales: undefined,
        archivado_por: undefined
      });
    } catch (err) {
      console.error('Error GET /fragmentos/:id:', err);
      res.status(500).json({ error: 'Error' });
    }
  });

  /** POST /api/fragmentos — crear */
  router.post('/', [auth, upload.single('video')], async (req, res) => {
    try {
      const { titulo, descripcion, categoria, lugar, anio, fuente } = req.body;
      if (!titulo?.trim()) return res.status(400).json({ error: 'El título es requerido' });
      if (!categoria) return res.status(400).json({ error: 'La categoría es requerida' });
      if (!req.file) return res.status(400).json({ error: 'Se requiere un video' });

      const videoPath = await saveVideoToStore(req.file);

      const nuevo = await Fragmento.create({
        usuario_id: req.userId,
        titulo: titulo.trim(),
        descripcion: (descripcion || '').trim(),
        categoria,
        lugar: lugar?.trim() || null,
        anio: anio ? Number(anio) : null,
        fuente: fuente?.trim() || null,
        video: videoPath
      });

      const populated = await Fragmento.findById(nuevo._id)
        .populate('usuario_id', 'nombre usuario avatar')
        .lean();

      res.status(201).json({
        ...populated,
        total_avales: 0,
        usuario_avalo: false,
        usuario_archivo: false,
        avales: undefined,
        archivado_por: undefined
      });
    } catch (err) {
      console.error('Error POST /fragmentos:', err);
      res.status(500).json({ error: err.message || 'Error al crear fragmento' });
    }
  });

  /** POST /api/fragmentos/:id/avalar */
  router.post('/:id/avalar', auth, async (req, res) => {
    try {
      const f = await Fragmento.findById(req.params.id);
      if (!f) return res.status(404).json({ error: 'No encontrado' });
      const idx = f.avales.findIndex(u => String(u) === String(req.userId));
      let avalo;
      if (idx >= 0) {
        f.avales.splice(idx, 1);
        avalo = false;
      } else {
        f.avales.push(req.userId);
        avalo = true;
      }
      await f.save();
      res.json({ ok: true, total_avales: f.avales.length, usuario_avalo: avalo });
    } catch (err) {
      console.error('Error /avalar:', err);
      res.status(500).json({ error: 'Error' });
    }
  });

  /** POST /api/fragmentos/:id/archivar */
  router.post('/:id/archivar', auth, async (req, res) => {
    try {
      const f = await Fragmento.findById(req.params.id);
      if (!f) return res.status(404).json({ error: 'No encontrado' });
      const idx = f.archivado_por.findIndex(u => String(u) === String(req.userId));
      let archivado;
      if (idx >= 0) {
        f.archivado_por.splice(idx, 1);
        archivado = false;
      } else {
        f.archivado_por.push(req.userId);
        archivado = true;
      }
      await f.save();
      res.json({ ok: true, usuario_archivo: archivado });
    } catch (err) {
      console.error('Error /archivar:', err);
      res.status(500).json({ error: 'Error' });
    }
  });

  /** POST /api/fragmentos/:id/vista */
  router.post('/:id/vista', authOptional, async (req, res) => {
    try {
      await Fragmento.updateOne({ _id: req.params.id }, { $inc: { total_visualizaciones: 1 } });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Error' });
    }
  });

  /** DELETE /api/fragmentos/:id */
  router.delete('/:id', auth, async (req, res) => {
    try {
      const f = await Fragmento.findById(req.params.id);
      if (!f) return res.status(404).json({ error: 'No encontrado' });
      if (String(f.usuario_id) !== String(req.userId)) {
        return res.status(403).json({ error: 'No autorizado' });
      }
      if (f.video && f.video.startsWith('/api/uploads/')) {
        const local = path.join(__dirname, '..', f.video.replace('/api/', ''));
        if (fs.existsSync(local)) { try { fs.unlinkSync(local); } catch (_) {} }
      }
      await Fragmento.findByIdAndDelete(f._id);
      res.json({ ok: true });
    } catch (err) {
      console.error('Error DELETE /fragmentos:', err);
      res.status(500).json({ error: 'Error' });
    }
  });

  return router;
};
