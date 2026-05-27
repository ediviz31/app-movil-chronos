const mongoose = require('mongoose');

/**
 * Mensaje individual ("misiva") dentro de una conversación.
 * Contenido en texto plano. Sin attachments en v1.
 */
const mensajeSchema = new mongoose.Schema({
  conversacion_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversacion',
    required: true,
    index: true
  },
  remitente_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contenido: {
    type: String,
    required: true,
    trim: true,
    maxlength: 4000
  }
}, {
  timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }
});

mensajeSchema.index({ conversacion_id: 1, creado_en: 1 });

module.exports = mongoose.model('Mensaje', mensajeSchema);
