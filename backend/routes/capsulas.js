/**
 * Cápsulas del Tiempo — equivalente histórico a stories de Instagram.
 *
 * Tipos:
 *   - 'cronista'  : creada por un usuario (vida 24h)
 *   - 'efemeride' : auto-generada del data/efemerides.js (rotación diaria)
 *   - 'cita'      : auto-generada del data/citas.js (rotación diaria)
 *
 * Endpoints (montados en /api/capsulas):
 *   GET    /            → lista de cápsulas vigentes (incluye auto-creadas del sistema)
 *   POST   /            → crear cápsula del cronista (multipart: texto, epoca?, lugar?, anio?, imagen?)
 *   POST   /:id/visto   → marca cápsula como vista por el usuario actual
 *   DELETE /:id         → eliminar mi propia cápsula
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Capsula = require('../models/Capsula');
const objStore = require('../utils/objectStore');
const crypto = require('crypto');
const { getEfemerideCercana } = require('../data/efemerides');
const { getCitaDelDia } = require('../data/citas');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB max (videos cortos de stories)
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'imagen') {
      const ok = /^image\/(jpeg|jpg|png|gif|webp)$/.test(file.mimetype);
      return cb(ok ? null : new Error('Imagen inválida'), ok);
    }
    if (file.fieldname === 'video') {
      const ok = /^video\//.test(file.mimetype);
      return cb(ok ? null : new Error('Video inválido'), ok);
    }
    cb(null, false);
  }
});

async function saveToStore(folder, file) {
  const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = Date.now().toString(36) + '-' + crypto.randomBytes(8).toString('hex');
  const objectPath = objStore.buildPath(folder, `${id}.${ext}`);
  await objStore.putObject(objectPath, file.buffer, file.mimetype);
  return objStore.publicUrl(objectPath);
}

/**
 * Asegura que las cápsulas auto-generadas (efeméride y cita) del día existan.
 * Se ejecuta perezosamente en cada GET (idempotente).
 */
async function ensureDailySystemCapsules() {
  const now = new Date();
  // Fecha "día" usando UTC para evitar drift por timezone
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const dayKey = `${yyyy}-${mm}-${dd}`;
  // Expira al final del día UTC
  const endOfDay = new Date(Date.UTC(yyyy, now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));

  // 1. EFEMÉRIDE del día
  const efKey = `efemeride-${dayKey}`;
  const efExists = await Capsula.findOne({ tipo: 'efemeride', texto: { $regex: `^\\[${efKey}\\]` } });
  if (!efExists) {
    // getEfemerideCercana(Date) -> { fecha, mes, dia, distancia_dias, eventos: [...] }
    const efRes = getEfemerideCercana(now);
    const efem = efRes && efRes.eventos && efRes.eventos[0];
    if (efem) {
      await Capsula.create({
        tipo: 'efemeride',
        usuario_id: null,
        // Incluimos un marcador [efemeride-YYYY-MM-DD] para idempotencia diaria
        texto: `[${efKey}] ${efem.evento}`,
        epoca: efem.epoca,
        lugar: efem.lugar,
        lat: efem.lat || null,
        lng: efem.lng || null,
        anio: efem.anio,
        expira_en: endOfDay
      });
    }
  }

  // 2. CITA del día
  const citaKey = `cita-${dayKey}`;
  const citaExists = await Capsula.findOne({ tipo: 'cita', texto: { $regex: `^\\[${citaKey}\\]` } });
  if (!citaExists) {
    const c = getCitaDelDia(now);
    await Capsula.create({
      tipo: 'cita',
      usuario_id: null,
      texto: `[${citaKey}] ${c.texto}`,
      epoca: c.epoca,
      lugar: c.lugar,
      anio: c.anio,
      autor: c.autor,
      expira_en: endOfDay
    });
  }
}

/**
 * Limpia el marcador [tipo-YYYY-MM-DD] del texto para la respuesta al cliente.
 */
function clean(c) {
  const obj = c.toObject ? c.toObject() : c;
  obj.texto = String(obj.texto || '').replace(/^\[(efemeride|cita)-\d{4}-\d{2}-\d{2}\]\s*/, '');
  obj.visto = false; // se asigna luego según el usuario
  return obj;
}

module.exports = function createCapsulasRouter({ auth, authOptional }) {
  const router = express.Router();

  /** GET /api/capsulas — lista vigentes */
  router.get('/', authOptional, async (req, res) => {
    try {
      await ensureDailySystemCapsules();

      const now = new Date();
      const capsulas = await Capsula.find({ expira_en: { $gt: now } })
        .populate('usuario_id', 'nombre usuario avatar')
        .sort({ creado_en: -1 })
        .lean();

      // Orden: 1) efeméride 2) cita 3) cronistas (no vistas primero) por fecha desc
      const userId = req.userId ? String(req.userId) : null;
      const enriched = capsulas.map(c => {
        const out = { ...c };
        out.texto = String(out.texto || '').replace(/^\[(efemeride|cita)-\d{4}-\d{2}-\d{2}\]\s*/, '');
        out.visto = userId ? (out.visto_por || []).some(uid => String(uid) === userId) : false;
        // No exponer la lista completa de visto_por al cliente
        delete out.visto_por;
        return out;
      });

      enriched.sort((a, b) => {
        const order = { 'efemeride': 0, 'cita': 1, 'cronista': 2 };
        if (order[a.tipo] !== order[b.tipo]) return order[a.tipo] - order[b.tipo];
        // dentro de cronistas: no-vistas primero
        if (a.tipo === 'cronista' && b.tipo === 'cronista') {
          if (a.visto !== b.visto) return a.visto ? 1 : -1;
        }
        return new Date(b.creado_en) - new Date(a.creado_en);
      });

      res.json(enriched);
    } catch (err) {
      console.error('Error GET /capsulas:', err);
      res.status(500).json({ error: 'Error al obtener cápsulas' });
    }
  });

  /** POST /api/capsulas — crear cápsula del cronista */
  router.post('/', [auth, upload.fields([
    { name: 'imagen', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ])], async (req, res) => {
    try {
      const { texto, epoca, lugar, anio } = req.body;
      if (!texto || !texto.trim()) {
        return res.status(400).json({ error: 'El texto es requerido' });
      }
      if (texto.length > 320) {
        return res.status(400).json({ error: 'Máximo 320 caracteres' });
      }
      const imagenFile = req.files?.imagen?.[0];
      const videoFile = req.files?.video?.[0];
      const imagenPath = imagenFile ? await saveToStore('capsulas', imagenFile) : null;
      const videoPath = videoFile ? await saveToStore('videos', videoFile) : null;

      // Vida 24h
      const expira = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const nueva = await Capsula.create({
        tipo: 'cronista',
        usuario_id: req.userId,
        texto: texto.trim(),
        epoca: epoca?.trim() || null,
        lugar: lugar?.trim() || null,
        anio: anio ? Number(anio) : null,
        imagen: imagenPath,
        video: videoPath,
        expira_en: expira
      });

      const populated = await Capsula.findById(nueva._id)
        .populate('usuario_id', 'nombre usuario avatar')
        .lean();

      res.status(201).json({ ...populated, visto: false });
    } catch (err) {
      console.error('Error POST /capsulas:', err);
      res.status(500).json({ error: err.message || 'Error al crear cápsula' });
    }
  });

  /** POST /api/capsulas/:id/visto — marcar como vista */
  router.post('/:id/visto', auth, async (req, res) => {
    try {
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: 'ID inválido' });
      }
      await Capsula.updateOne(
        { _id: req.params.id },
        { $addToSet: { visto_por: req.userId } }
      );
      res.json({ ok: true });
    } catch (err) {
      console.error('Error /capsulas/:id/visto:', err);
      res.status(500).json({ error: 'Error al marcar visto' });
    }
  });

  /** DELETE /api/capsulas/:id — eliminar mi cápsula */
  router.delete('/:id', auth, async (req, res) => {
    try {
      const c = await Capsula.findById(req.params.id);
      if (!c) return res.status(404).json({ error: 'No encontrada' });
      if (c.tipo !== 'cronista' || String(c.usuario_id) !== String(req.userId)) {
        return res.status(403).json({ error: 'No autorizado' });
      }
      // Limpieza de disco (compat con archivos antiguos en /app/backend/uploads/)
      // Los nuevos en Object Store no se borran aquí (futuro: API delete del store)
      if (c.imagen && c.imagen.startsWith('/api/uploads/')) {
        const local = path.join(__dirname, '..', c.imagen.replace('/api/', ''));
        if (fs.existsSync(local)) { try { fs.unlinkSync(local); } catch (_) {} }
      }
      if (c.video && c.video.startsWith('/api/uploads/')) {
        const local = path.join(__dirname, '..', c.video.replace('/api/', ''));
        if (fs.existsSync(local)) { try { fs.unlinkSync(local); } catch (_) {} }
      }
      await Capsula.findByIdAndDelete(c._id);
      res.json({ ok: true });
    } catch (err) {
      console.error('Error DELETE /capsulas/:id:', err);
      res.status(500).json({ error: 'Error al eliminar' });
    }
  });

  /** GET /api/capsulas/archivo/:usuarioId — "Mi Pasado en Cápsulas"
   *  Devuelve cápsulas del cronista cuya vida activa (24h) ya venció.
   *  Estas se conservan como archivo permanente del cronista.
   */
  router.get('/archivo/:usuarioId', authOptional, async (req, res) => {
    try {
      if (!req.params.usuarioId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: 'ID inválido' });
      }
      const now = new Date();
      const archivadas = await Capsula.find({
        tipo: 'cronista',
        usuario_id: req.params.usuarioId,
        expira_en: { $lte: now }
      })
        .populate('usuario_id', 'nombre usuario avatar')
        .sort({ creado_en: -1 })
        .limit(120)
        .lean();
      res.json(archivadas.map(c => ({ ...c, visto: true, archivada: true })));
    } catch (err) {
      console.error('Error GET /capsulas/archivo:', err);
      res.status(500).json({ error: 'Error al obtener archivo' });
    }
  });

  return router;
};
