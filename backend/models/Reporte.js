const mongoose = require('mongoose');

/**
 * Reporte comunitario. Cualquier cronista puede reportar:
 *  - Una publicación (relato)
 *  - Un comentario
 *  - Un fragmento del tiempo
 *  - Una cápsula
 *  - Un usuario directamente
 *
 * Estado: 'pendiente' | 'revisado' | 'desestimado'.
 * Sólo admin (User.rol === 'admin') puede ver el listado y cambiar el estado.
 */
const reporteSchema = new mongoose.Schema({
  reportador_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tipo_objetivo: {
    type: String,
    enum: ['relato', 'comentario', 'fragmento', 'capsula', 'usuario'],
    required: true,
    index: true
  },
  objetivo_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  // Snapshot para que aunque borren el contenido, el moderador vea contexto
  snapshot_titulo: { type: String, default: '' },
  snapshot_texto: { type: String, default: '' },
  // Razón del reporte
  motivo: {
    type: String,
    enum: [
      'spam',
      'odio',
      'desinformacion',
      'violencia',
      'desnudez',
      'plagio',
      'acoso',
      'otro'
    ],
    required: true
  },
  detalle: { type: String, default: '', maxlength: 600 },

  // Moderación
  estado: {
    type: String,
    enum: ['pendiente', 'revisado', 'desestimado'],
    default: 'pendiente',
    index: true
  },
  revisado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  revisado_en: { type: Date, default: null },
  accion_tomada: {
    type: String,
    enum: ['ninguna', 'contenido_eliminado', 'usuario_advertido', 'usuario_bloqueado'],
    default: 'ninguna'
  },
  nota_admin: { type: String, default: '' }
}, {
  timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }
});

// Evitar reportes duplicados del mismo usuario sobre el mismo objeto
reporteSchema.index(
  { reportador_id: 1, tipo_objetivo: 1, objetivo_id: 1 },
  { unique: true }
);

module.exports = mongoose.model('Reporte', reporteSchema);
