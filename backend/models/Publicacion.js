const mongoose = require('mongoose');

const publicacionSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  categoria: {
    type: String,
    required: true,
    trim: true
  },
  contenido: {
    type: String,
    required: true
  },
  imagen: {
    type: String,
    default: null
  },
  // Hashtags extraídos del contenido (#palabra) — útiles para búsqueda
  tags: {
    type: [String],
    default: [],
    index: true
  },
  // Contador de lecturas (visitas únicas con anti-flooding)
  visitas: {
    type: Number,
    default: 0
  },
  // Narración TTS generada bajo demanda (path relativo a /uploads/audio/)
  audio_path: {
    type: String,
    default: null
  },
  audio_voz: {
    type: String,
    default: null   // onyx | echo | sage | shimmer | fable
  },
  // Video adjunto (sitio histórico explorado por el cronista)
  video_path: {
    type: String,
    default: null
  },
  // ─── Indicador de tiempo histórico (opcional, refuerza identidad temporal) ───
  // Año del evento histórico narrado (ej. 1453). Acepta negativos para a.C.
  historia_anio: {
    type: Number,
    default: null
  },
  // Lugar histórico narrado (ej. "Constantinopla", "Tenochtitlán")
  historia_lugar: {
    type: String,
    default: null,
    trim: true
  }
}, {
  timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }
});

// Índices para mejor rendimiento
publicacionSchema.index({ usuario_id: 1, creado_en: -1 });
publicacionSchema.index({ categoria: 1 });
publicacionSchema.index({ tags: 1, creado_en: -1 });

// Helper estático: extrae #hashtags de un texto
publicacionSchema.statics.extractTags = function(texto) {
  if (!texto) return [];
  const matches = String(texto).match(/#([\p{L}\p{N}_]{2,30})/gu) || [];
  // Quitar # y deduplicar en minúsculas
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
};

module.exports = mongoose.model('Publicacion', publicacionSchema);