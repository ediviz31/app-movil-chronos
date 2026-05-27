const mongoose = require('mongoose');

/**
 * Subscripciones de Web Push.
 * Cada navegador/dispositivo del usuario que aceptó notificaciones
 * crea una entrada con su endpoint único.
 */
const pushSubscriptionSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  user_agent: { type: String, default: '' }
}, {
  timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }
});

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
