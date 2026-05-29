const mongoose = require('mongoose');

/**
 * Fragmento del Tiempo
 * Reels históricos: video corto (≤90s) sobre un lugar, personaje o momento histórico.
 * Permanente (no expira como las cápsulas).
 */
const fragmentoSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  titulo: {
    type: String,
    required: true,
    maxlength: 140,
    trim: true
  },
  descripcion: {
    type: String,
    default: '',
    maxlength: 600,
    trim: true
  },
  categoria: {
    type: String,
    enum: ['historia_local', 'personajes', 'lugares', 'documentos'],
    required: true,
    index: true
  },
  lugar: { type: String, default: null, trim: true },
  anio: { type: Number, default: null },
  fuente: { type: String, default: null, trim: true, maxlength: 220 },
  video: { type: String, required: true }, // /api/uploads/videos/xxx.mp4
  miniatura: { type: String, default: null }, // poster image (opcional)
  duracion_seg: { type: Number, default: 0 },
  // Avales (like) y archivado
  avales: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
    ref: 'User'
  },
  archivado_por: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
    ref: 'User'
  },
  total_visualizaciones: { type: Number, default: 0 },
  total_resonancias: { type: Number, default: 0 }
}, {
  timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }
});

fragmentoSchema.index({ creado_en: -1 });
fragmentoSchema.index({ categoria: 1, creado_en: -1 });

module.exports = mongoose.model('Fragmento', fragmentoSchema);
