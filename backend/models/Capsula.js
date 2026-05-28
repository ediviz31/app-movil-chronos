const mongoose = require('mongoose');

/**
 * Cápsulas del Tiempo (Chronos)
 * Equivalente histórico a las "stories" de Instagram.
 *
 * Tipos:
 *   - 'cronista'  : creada por un usuario. Vida: 24h.
 *   - 'efemeride' : auto-generada del sistema (data/efemerides.js). Vida: 24h (rotación diaria).
 *   - 'cita'      : auto-generada del sistema (data/citas.js). Vida: 24h.
 */
const capsulaSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['cronista', 'efemeride', 'cita'],
    required: true,
    index: true
  },
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,        // null = cápsula del sistema
    index: true
  },
  texto: {
    type: String,
    required: true,
    maxlength: 320,
    trim: true
  },
  epoca: {
    type: String,
    default: null,
    trim: true
  },
  lugar: {
    type: String,
    default: null,
    trim: true
  },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  anio: { type: Number, default: null },   // año histórico (puede ser negativo a.C.)
  imagen: { type: String, default: null }, // /api/uploads/capsulas/xxx.jpg
  // autor: persona histórica para 'cita' (ej. "Marco Aurelio")
  autor: { type: String, default: null, trim: true },
  // Quiénes ya vieron la cápsula (para indicador "ya vista")
  visto_por: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
    ref: 'User'
  },
  // Fecha en la que expira (TTL: 24h por defecto)
  expira_en: {
    type: Date,
    required: true
  }
}, {
  timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }
});

// TTL index: MongoDB borra automáticamente cápsulas vencidas
capsulaSchema.index({ expira_en: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Capsula', capsulaSchema);
