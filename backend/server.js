require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Modelos
const User = require('./models/User');
const Publicacion = require('./models/Publicacion');
const Eco = require('./models/Eco');
const Comentario = require('./models/Comentario');
const Archivado = require('./models/Archivado');
const Seguidor = require('./models/Seguidor');

// Middleware
const auth = require('./middleware/auth');
const upload = require('./middleware/upload');

const app = express();
const PORT = process.env.PORT || 8001;

// HTTP Status Constants
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS || '*',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Servir uploads desde /api/uploads para que pase por el routing del ingress
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Crear carpetas de uploads si no existen
const fs = require('fs');
['uploads', 'uploads/avatares', 'uploads/portadas', 'uploads/relatos'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('✅ Conectado a MongoDB - Chronos DB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Helpers para manejo de tokens
const setAuthCookie = (res, token) => {
  res.cookie('chronos_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie('chronos_token');
};

// ============================================
// RUTAS DE AUTENTICACIÓN
// ============================================

// Registro
app.post('/api/auth/registro', [
  body('nombre').trim().isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
  body('usuario').trim().isLength({ min: 3 }).withMessage('El usuario debe tener al menos 3 caracteres'),
  body('correo').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ errors: errors.array() });
    }

    const { nombre, usuario, correo, password, bio, interes, tema_favorito } = req.body;

    // Verificar si el usuario ya existe
    const existeUsuario = await User.findOne({ $or: [{ correo }, { usuario }] });
    if (existeUsuario) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'El usuario o correo ya existe' });
    }

    // Crear nuevo usuario
    const nuevoUsuario = new User({
      nombre,
      usuario: usuario.toLowerCase(),
      correo: correo.toLowerCase(),
      password,
      bio: bio || 'Explorador de historias',
      interes: interes || 'Historia',
      tema_favorito: tema_favorito || 'Civilizaciones'
    });

    await nuevoUsuario.save();

    // Generar token y establecer cookie
    const token = jwt.sign({ userId: nuevoUsuario._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token);

    res.status(HTTP_STATUS.CREATED).json({
      mensaje: 'Usuario registrado exitosamente',
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        usuario: nuevoUsuario.usuario,
        correo: nuevoUsuario.correo,
        avatar: nuevoUsuario.avatar,
        rol: nuevoUsuario.rol
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al registrar usuario' });
  }
});

// Login
app.post('/api/auth/login', [
  body('correo').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ errors: errors.array() });
    }

    const { correo, password } = req.body;

    // Buscar usuario
    const usuario = await User.findOne({ correo: correo.toLowerCase() });
    if (!usuario) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const esValida = await usuario.comparePassword(password);
    if (!esValida) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Credenciales inválidas' });
    }

    // Generar token y establecer cookie
    const token = jwt.sign({ userId: usuario._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token);

    res.json({
      mensaje: 'Login exitoso',
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        usuario: usuario.usuario,
        correo: usuario.correo,
        avatar: usuario.avatar,
        portada: usuario.portada,
        bio: usuario.bio,
        tema_favorito: usuario.tema_favorito,
        rol: usuario.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al iniciar sesión' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ mensaje: 'Sesión cerrada exitosamente' });
});

// Obtener usuario actual
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const usuario = await User.findById(req.userId).select('-password');
    res.json(usuario);
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener usuario' });
  }
});

// ============================================
// RUTAS DE PUBLICACIONES/RELATOS
// ============================================

// Obtener feed de relatos
app.get('/api/relatos', auth, async (req, res) => {
  try {
    const { vista = 'todos', limit = 25 } = req.query;
    let query = {};

    // Si es vista "siguiendo", filtrar por usuarios que sigo
    if (vista === 'siguiendo') {
      const seguidores = await Seguidor.find({ seguidor_id: req.userId });
      const siguiendoIds = seguidores.map(s => s.seguido_id);
      query.usuario_id = { $in: siguiendoIds };
    }

    const relatos = await Publicacion.find(query)
      .populate('usuario_id', 'nombre usuario avatar tema_favorito interes')
      .sort({ creado_en: -1 })
      .limit(parseInt(limit));

    // Obtener estadísticas para cada relato
    const relatosConStats = await Promise.all(relatos.map(async (relato) => {
      const [total_ecos, total_comentarios, total_archivos, usuario_dio_eco, usuario_archivado] = await Promise.all([
        Eco.countDocuments({ publicacion_id: relato._id }),
        Comentario.countDocuments({ publicacion_id: relato._id }),
        Archivado.countDocuments({ publicacion_id: relato._id }),
        Eco.countDocuments({ publicacion_id: relato._id, usuario_id: req.userId }),
        Archivado.countDocuments({ publicacion_id: relato._id, usuario_id: req.userId })
      ]);

      return {
        ...relato.toObject(),
        total_ecos,
        total_comentarios,
        total_archivos,
        usuario_dio_eco: usuario_dio_eco > 0,
        usuario_archivado: usuario_archivado > 0
      };
    }));

    res.json(relatosConStats);
  } catch (error) {
    console.error('Error al obtener relatos:', error);
    res.status(500).json({ error: 'Error al obtener relatos' });
  }
});

// Crear relato
app.post('/api/relatos', [auth, upload.single('imagen')], [
  body('titulo').trim().notEmpty().withMessage('El título es requerido'),
  body('categoria').trim().notEmpty().withMessage('La categoría es requerida'),
  body('contenido').trim().notEmpty().withMessage('El contenido es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { titulo, categoria, contenido } = req.body;
    const imagen = req.file ? `/api/uploads/relatos/${req.file.filename}` : null;

    const nuevoRelato = new Publicacion({
      usuario_id: req.userId,
      titulo,
      categoria,
      contenido,
      imagen
    });

    await nuevoRelato.save();
    const relatoPopulado = await Publicacion.findById(nuevoRelato._id)
      .populate('usuario_id', 'nombre usuario avatar tema_favorito');

    res.status(201).json({
      mensaje: 'Relato creado exitosamente',
      relato: relatoPopulado
    });
  } catch (error) {
    console.error('Error al crear relato:', error);
    res.status(500).json({ error: 'Error al crear relato' });
  }
});

// Obtener un relato específico
app.get('/api/relatos/:id', auth, async (req, res) => {
  try {
    const relato = await Publicacion.findById(req.params.id)
      .populate('usuario_id', 'nombre usuario avatar tema_favorito bio');

    if (!relato) {
      return res.status(404).json({ error: 'Relato no encontrado' });
    }

    // Obtener estadísticas
    const [total_ecos, total_comentarios, total_archivos, usuario_dio_eco, usuario_archivado] = await Promise.all([
      Eco.countDocuments({ publicacion_id: relato._id }),
      Comentario.countDocuments({ publicacion_id: relato._id }),
      Archivado.countDocuments({ publicacion_id: relato._id }),
      Eco.countDocuments({ publicacion_id: relato._id, usuario_id: req.userId }),
      Archivado.countDocuments({ publicacion_id: relato._id, usuario_id: req.userId })
    ]);

    res.json({
      ...relato.toObject(),
      total_ecos,
      total_comentarios,
      total_archivos,
      usuario_dio_eco: usuario_dio_eco > 0,
      usuario_archivado: usuario_archivado > 0
    });
  } catch (error) {
    console.error('Error al obtener relato:', error);
    res.status(500).json({ error: 'Error al obtener relato' });
  }
});

// Actualizar relato
app.put('/api/relatos/:id', auth, async (req, res) => {
  try {
    const relato = await Publicacion.findById(req.params.id);
    
    if (!relato) {
      return res.status(404).json({ error: 'Relato no encontrado' });
    }

    if (relato.usuario_id.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'No tienes permiso para editar este relato' });
    }

    const { titulo, categoria, contenido } = req.body;
    
    if (titulo) relato.titulo = titulo;
    if (categoria) relato.categoria = categoria;
    if (contenido) relato.contenido = contenido;

    await relato.save();
    res.json({ mensaje: 'Relato actualizado', relato });
  } catch (error) {
    console.error('Error al actualizar relato:', error);
    res.status(500).json({ error: 'Error al actualizar relato' });
  }
});

// Eliminar relato
app.delete('/api/relatos/:id', auth, async (req, res) => {
  try {
    const relato = await Publicacion.findById(req.params.id);
    
    if (!relato) {
      return res.status(404).json({ error: 'Relato no encontrado' });
    }

    if (relato.usuario_id.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este relato' });
    }

    await Publicacion.findByIdAndDelete(req.params.id);
    
    // Eliminar ecos, comentarios y archivados relacionados
    await Promise.all([
      Eco.deleteMany({ publicacion_id: req.params.id }),
      Comentario.deleteMany({ publicacion_id: req.params.id }),
      Archivado.deleteMany({ publicacion_id: req.params.id })
    ]);

    res.json({ mensaje: 'Relato eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar relato:', error);
    res.status(500).json({ error: 'Error al eliminar relato' });
  }
});

// ============================================
// RUTAS DE ECOS (LIKES)
// ============================================

// Toggle eco
app.post('/api/ecos/:publicacionId', auth, async (req, res) => {
  try {
    const { publicacionId } = req.params;

    // Verificar si ya existe el eco
    const ecoExistente = await Eco.findOne({
      publicacion_id: publicacionId,
      usuario_id: req.userId
    });

    if (ecoExistente) {
      // Eliminar eco
      await Eco.deleteOne({ _id: ecoExistente._id });
      return res.json({ mensaje: 'Eco eliminado', accion: 'eliminado' });
    } else {
      // Crear eco
      const nuevoEco = new Eco({
        publicacion_id: publicacionId,
        usuario_id: req.userId
      });
      await nuevoEco.save();
      return res.json({ mensaje: 'Eco dado', accion: 'creado' });
    }
  } catch (error) {
    console.error('Error en eco:', error);
    res.status(500).json({ error: 'Error al procesar eco' });
  }
});

// ============================================
// RUTAS DE COMENTARIOS
// ============================================

// Obtener comentarios de un relato
app.get('/api/comentarios/:publicacionId', auth, async (req, res) => {
  try {
    const comentarios = await Comentario.find({ publicacion_id: req.params.publicacionId, parent_id: null })
      .populate('usuario_id', 'nombre usuario avatar')
      .sort({ creado_en: -1 });

    // Obtener respuestas para cada comentario
    const comentariosConRespuestas = await Promise.all(comentarios.map(async (comentario) => {
      const respuestas = await Comentario.find({ parent_id: comentario._id })
        .populate('usuario_id', 'nombre usuario avatar')
        .sort({ creado_en: 1 });
      
      return {
        ...comentario.toObject(),
        respuestas
      };
    }));

    res.json(comentariosConRespuestas);
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

// Crear comentario
app.post('/api/comentarios', auth, [
  body('publicacion_id').notEmpty().withMessage('El ID de publicación es requerido'),
  body('contenido').trim().notEmpty().withMessage('El contenido es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { publicacion_id, contenido, parent_id } = req.body;

    const nuevoComentario = new Comentario({
      publicacion_id,
      usuario_id: req.userId,
      contenido,
      parent_id: parent_id || null
    });

    await nuevoComentario.save();
    const comentarioPopulado = await Comentario.findById(nuevoComentario._id)
      .populate('usuario_id', 'nombre usuario avatar');

    res.status(201).json({
      mensaje: 'Comentario creado',
      comentario: comentarioPopulado
    });
  } catch (error) {
    console.error('Error al crear comentario:', error);
    res.status(500).json({ error: 'Error al crear comentario' });
  }
});

// ============================================
// RUTAS DE ARCHIVADOS/GUARDADOS
// ============================================

// Toggle archivado
app.post('/api/archivados/:publicacionId', auth, async (req, res) => {
  try {
    const { publicacionId } = req.params;

    const archivadoExistente = await Archivado.findOne({
      publicacion_id: publicacionId,
      usuario_id: req.userId
    });

    if (archivadoExistente) {
      await Archivado.deleteOne({ _id: archivadoExistente._id });
      return res.json({ mensaje: 'Relato quitado del archivo', accion: 'quitado' });
    } else {
      const nuevoArchivado = new Archivado({
        publicacion_id: publicacionId,
        usuario_id: req.userId
      });
      await nuevoArchivado.save();
      return res.json({ mensaje: 'Relato archivado', accion: 'guardado' });
    }
  } catch (error) {
    console.error('Error en archivado:', error);
    res.status(500).json({ error: 'Error al archivar' });
  }
});

// Obtener relatos archivados
app.get('/api/archivados', auth, async (req, res) => {
  try {
    const archivados = await Archivado.find({ usuario_id: req.userId })
      .populate({
        path: 'publicacion_id',
        populate: { path: 'usuario_id', select: 'nombre usuario avatar tema_favorito' }
      })
      .sort({ creado_en: -1 });

    const relatosArchivados = archivados.map(a => a.publicacion_id);
    res.json(relatosArchivados);
  } catch (error) {
    console.error('Error al obtener archivados:', error);
    res.status(500).json({ error: 'Error al obtener archivados' });
  }
});

// ============================================
// RUTAS DE SEGUIMIENTO
// ============================================

// Toggle seguir usuario
app.post('/api/seguir/:usuarioId', auth, async (req, res) => {
  try {
    const { usuarioId } = req.params;

    if (usuarioId === req.userId.toString()) {
      return res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
    }

    const seguidorExistente = await Seguidor.findOne({
      seguidor_id: req.userId,
      seguido_id: usuarioId
    });

    if (seguidorExistente) {
      await Seguidor.deleteOne({ _id: seguidorExistente._id });
      return res.json({ mensaje: 'Dejaste de seguir al usuario', accion: 'deseguir' });
    } else {
      const nuevoSeguidor = new Seguidor({
        seguidor_id: req.userId,
        seguido_id: usuarioId
      });
      await nuevoSeguidor.save();
      return res.json({ mensaje: 'Ahora sigues a este usuario', accion: 'seguir' });
    }
  } catch (error) {
    console.error('Error en seguimiento:', error);
    res.status(500).json({ error: 'Error al seguir usuario' });
  }
});

// Obtener seguidores de un usuario
app.get('/api/seguidores/:usuarioId', auth, async (req, res) => {
  try {
    const seguidores = await Seguidor.find({ seguido_id: req.params.usuarioId })
      .populate('seguidor_id', 'nombre usuario avatar bio tema_favorito')
      .sort({ creado_en: -1 });

    res.json(seguidores.map(s => s.seguidor_id));
  } catch (error) {
    console.error('Error al obtener seguidores:', error);
    res.status(500).json({ error: 'Error al obtener seguidores' });
  }
});

// Obtener usuarios que sigo
app.get('/api/siguiendo/:usuarioId', auth, async (req, res) => {
  try {
    const siguiendo = await Seguidor.find({ seguidor_id: req.params.usuarioId })
      .populate('seguido_id', 'nombre usuario avatar bio tema_favorito')
      .sort({ creado_en: -1 });

    res.json(siguiendo.map(s => s.seguido_id));
  } catch (error) {
    console.error('Error al obtener siguiendo:', error);
    res.status(500).json({ error: 'Error al obtener siguiendo' });
  }
});

// ============================================
// RUTAS DE USUARIO/PERFIL
// ============================================

// Obtener perfil de usuario
app.get('/api/usuarios/:id', auth, async (req, res) => {
  try {
    const usuario = await User.findById(req.params.id).select('-password');
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Estadísticas
    const [totalRelatos, totalSeguidores, totalSiguiendo, esSeguido] = await Promise.all([
      Publicacion.countDocuments({ usuario_id: usuario._id }),
      Seguidor.countDocuments({ seguido_id: usuario._id }),
      Seguidor.countDocuments({ seguidor_id: usuario._id }),
      Seguidor.countDocuments({ seguidor_id: req.userId, seguido_id: usuario._id })
    ]);

    res.json({
      ...usuario.toObject(),
      estadisticas: {
        totalRelatos,
        totalSeguidores,
        totalSiguiendo,
        esSeguido: esSeguido > 0
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// Actualizar perfil
app.put('/api/usuarios/perfil', auth, async (req, res) => {
  try {
    const { nombre, bio, interes, tema_favorito } = req.body;
    const usuario = await User.findById(req.userId);

    if (nombre) usuario.nombre = nombre;
    if (bio) usuario.bio = bio;
    if (interes) usuario.interes = interes;
    if (tema_favorito) usuario.tema_favorito = tema_favorito;

    await usuario.save();
    
    const usuarioActualizado = await User.findById(req.userId).select('-password');
    res.json({ mensaje: 'Perfil actualizado', usuario: usuarioActualizado });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// Obtener usuarios sugeridos
app.get('/api/usuarios/sugeridos', auth, async (req, res) => {
  try {
    // Obtener usuarios que ya sigo
    const siguiendo = await Seguidor.find({ seguidor_id: req.userId });
    const siguiendoIds = siguiendo.map(s => s.seguido_id.toString());

    // Buscar usuarios que no sigo (excluyéndome a mí mismo)
    const usuariosSugeridos = await User.find({
      _id: { $nin: [...siguiendoIds, req.userId] }
    })
    .select('nombre usuario avatar bio tema_favorito')
    .limit(5);

    res.json(usuariosSugeridos);
  } catch (error) {
    console.error('Error al obtener sugeridos:', error);
    res.status(500).json({ error: 'Error al obtener usuarios sugeridos' });
  }
});

// ============================================
// RUTAS DE ESTADÍSTICAS Y EXPLORACIÓN
// ============================================

// Obtener rutas/categorías populares
app.get('/api/rutas/populares', auth, async (req, res) => {
  try {
    const rutasPopulares = await Publicacion.aggregate([
      { $match: { categoria: { $ne: '' } } },
      { $group: { _id: '$categoria', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    res.json(rutasPopulares.map(r => ({ categoria: r._id, total: r.total })));
  } catch (error) {
    console.error('Error al obtener rutas populares:', error);
    res.status(500).json({ error: 'Error al obtener rutas populares' });
  }
});

// Obtener estadísticas del usuario actual
app.get('/api/estadisticas/me', auth, async (req, res) => {
  try {
    const [totalRelatos, totalSeguidores, totalSiguiendo, totalArchivados] = await Promise.all([
      Publicacion.countDocuments({ usuario_id: req.userId }),
      Seguidor.countDocuments({ seguido_id: req.userId }),
      Seguidor.countDocuments({ seguidor_id: req.userId }),
      Archivado.countDocuments({ usuario_id: req.userId })
    ]);

    res.json({
      totalRelatos,
      totalSeguidores,
      totalSiguiendo,
      totalArchivados
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ============================================
// RUTA DE HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Chronos API funcionando correctamente' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Chronos corriendo en puerto ${PORT}`);
  console.log(`📚 Base de datos: ${process.env.MONGO_URL}`);
});
