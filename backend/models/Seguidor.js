const mongoose = require('mongoose');

const seguidorSchema = new mongoose.Schema({
  seguidor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seguido_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { createdAt: 'creado_en', updatedAt: false }
});

// Índice único para evitar seguimientos duplicados
seguidorSchema.index({ seguidor_id: 1, seguido_id: 1 }, { unique: true });

module.exports = mongoose.model('Seguidor', seguidorSchema);