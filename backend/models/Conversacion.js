const mongoose = require('mongoose');

/**
 * Conversación 1-on-1 entre dos cronistas (estilo "misiva").
 *
 * Diseño:
 *  - participantes: array exactamente de 2 user ids (siempre ordenados ascendentemente
 *    a través de IDs string para garantizar unicidad determinista)
 *  - ultimo_mensaje_en: para ordenar la lista
 *  - ultimo_mensaje_resumen: snippet denormalizado para la lista lateral
 *  - leido_por: Map<userId, Date> — última vez que ese usuario "abrió" la conversación.
 *    Si ultimo_mensaje_en > leido_por[userId], hay no leídos para ese user.
 */
const conversacionSchema = new mongoose.Schema({
  participantes: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    required: true,
    validate: v => Array.isArray(v) && v.length === 2
  },
  ultimo_mensaje_en: {
    type: Date,
    default: Date.now,
    index: true
  },
  ultimo_mensaje_resumen: {
    type: String,
    default: ''
  },
  ultimo_remitente_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  leido_por: {
    type: Map,
    of: Date,
    default: {}
  }
}, {
  timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }
});

// Garantiza una sola conversación 1-on-1 entre dos usuarios.
// La normalización (ordenar IDs) se aplica en el endpoint antes de crear/buscar.
conversacionSchema.index({ participantes: 1 });

module.exports = mongoose.model('Conversacion', conversacionSchema);
