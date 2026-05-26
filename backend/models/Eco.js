const mongoose = require('mongoose');

const ecoSchema = new mongoose.Schema({
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

// Índice único para evitar ecos duplicados
ecoSchema.index({ publicacion_id: 1, usuario_id: 1 }, { unique: true });

module.exports = mongoose.model('Eco', ecoSchema);