const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  usuario: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  correo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  bio: {
    type: String,
    default: 'Explorador de historias'
  },
  interes: {
    type: String,
    default: 'Historia'
  },
  tema_favorito: {
    type: String,
    default: 'Civilizaciones'
  },
  avatar: {
    type: String,
    default: '/assets/img/avatar.svg'
  },
  portada: {
    type: String,
    default: '/assets/img/cover.svg'
  },
  rol: {
    type: String,
    enum: ['usuario', 'admin'],
    default: 'usuario'
  },
  perfil_completo: {
    type: Boolean,
    default: false
  },
  codigo_legado_aceptado: {
    type: Boolean,
    default: false
  },
  codigo_legado_aceptado_en: {
    type: Date
  },

  // Preferencias de Chronos (sonido de avisos + privacidad del árbol)
  preferencias: {
    sonido_aviso: {
      type: String,
      enum: ['cuerno', 'lira', 'campana', 'silencio'],
      default: 'cuerno'
    },
    arbol_publico: {
      type: Boolean,
      default: false  // Privado por defecto
    }
  },

  // Presencia / actividad (para el icono de antorcha encendida)
  // Se actualiza con un beacon cada 60s desde el cliente.
  ultimo_visto: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: { createdAt: 'creado_en', updatedAt: 'actualizado_en' }
});

// Hash password antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);