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
  }
}, {
  timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }
});

// Índices para mejor rendimiento
publicacionSchema.index({ usuario_id: 1, creado_en: -1 });
publicacionSchema.index({ categoria: 1 });

module.exports = mongoose.model('Publicacion', publicacionSchema);