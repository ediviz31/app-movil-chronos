const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema({
  // Destinatario (a quién le llega la notificación)
  destinatario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Actor (quien provocó la notificación)
  actor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Tipo de aviso
  tipo: {
    type: String,
    enum: ['eco', 'comentario', 'respuesta', 'seguidor', 'archivo'],
    required: true
  },
  // Referencia opcional al relato relacionado
  publicacion_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Publicacion'
  },
  // Referencia opcional al comentario relacionado
  comentario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comentario'
  },
  // Texto resumido (denormalizado para velocidad)
  resumen: {
    type: String,
    default: ''
  },
  leida: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }
});

notificacionSchema.index({ destinatario_id: 1, creado_en: -1 });

module.exports = mongoose.model('Notificacion', notificacionSchema);
