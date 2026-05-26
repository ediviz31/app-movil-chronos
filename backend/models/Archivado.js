const mongoose = require('mongoose');

const archivadoSchema = new mongoose.Schema({
  publicacion_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Publicacion',
    required: true
  },
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { createdAt: 'creado_en', updatedAt: false }
});

// Índice único para evitar archivados duplicados
archivadoSchema.index({ publicacion_id: 1, usuario_id: 1 }, { unique: true });

module.exports = mongoose.model('Archivado', archivadoSchema);