const mongoose = require('mongoose');

const comentarioSchema = new mongoose.Schema({
  publicacion_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Publicacion',
    required: true
  },
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comentario',
    default: null
  },
  contenido: {
    type: String,
    required: true
  }
}, {
  timestamps: { createdAt: 'creado_en', updatedAt: false }
});

// Índices
comentarioSchema.index({ publicacion_id: 1, creado_en: -1 });
comentarioSchema.index({ usuario_id: 1 });

module.exports = mongoose.model('Comentario', comentarioSchema);