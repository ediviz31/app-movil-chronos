const mongoose = require('mongoose');

const miembroFamiliarSchema = new mongoose.Schema({
  // Dueño del árbol genealógico (cronista raíz)
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Datos personales del familiar
  nombre: { type: String, required: true, trim: true, maxlength: 80 },
  apellido: { type: String, trim: true, maxlength: 80, default: '' },

  // Género (afecta el nombre del parentesco mostrado)
  genero: {
    type: String,
    enum: ['masculino', 'femenino', 'otro', ''],
    default: ''
  },

  // Fechas (ISO strings opcionales; mantenemos flexibles para fechas históricas inciertas)
  fecha_nacimiento: { type: String, default: '' }, // YYYY-MM-DD o YYYY o ''
  fecha_defuncion: { type: String, default: '' },
  lugar_nacimiento: { type: String, default: '', maxlength: 120 },

  // Ocupación / oficio
  ocupacion: { type: String, default: '', maxlength: 80 },

  // Biografía / historia personal
  bio: { type: String, default: '', maxlength: 1500 },

  // Foto del familiar (URL relativa)
  foto: { type: String, default: '' },

  // Parentesco con el cronista raíz
  // Valores comunes: 'padre', 'madre', 'abuelo_paterno', 'abuela_paterna',
  //   'abuelo_materno', 'abuela_materna', 'bisabuelo_paterno_paterno', etc.
  //   'hermano', 'hermana', 'tio', 'tia', 'primo', 'prima', 'hijo', 'hija',
  //   'conyuge', 'otro'
  parentesco: {
    type: String,
    required: true,
    enum: [
      'padre', 'madre',
      'abuelo_paterno', 'abuela_paterna', 'abuelo_materno', 'abuela_materna',
      'bisabuelo_pp', 'bisabuela_pp', 'bisabuelo_pm', 'bisabuela_pm',
      'bisabuelo_mp', 'bisabuela_mp', 'bisabuelo_mm', 'bisabuela_mm',
      'hermano', 'hermana',
      'tio', 'tia',
      'primo', 'prima',
      'hijo', 'hija',
      'conyuge',
      'otro'
    ]
  },

  // Si este familiar también es un cronista de Chronos, se enlaza
  vinculado_a_usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Historias / anécdotas inline (mini-relatos sobre esta persona)
  // Cada elemento: { titulo, contenido, fecha_creacion }
  historias: [{
    titulo: { type: String, maxlength: 120 },
    contenido: { type: String, maxlength: 2000 },
    fecha_creacion: { type: Date, default: Date.now }
  }]
}, {
  timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }
});

miembroFamiliarSchema.index({ usuario_id: 1, parentesco: 1 });

module.exports = mongoose.model('MiembroFamiliar', miembroFamiliarSchema);
