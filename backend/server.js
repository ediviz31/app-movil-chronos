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
const Notificacion = require('./models/Notificacion');
const MiembroFamiliar = require('./models/MiembroFamiliar');
const { getEfemeridesPorFecha, getEfemerideCercana, getCalendarioDelMes } = require('./data/efemerides');
const { parseGedcomToFamiliares } = require('./utils/gedcomParser');

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
    secure: true, // Siempre HTTPS en producción
    sameSite: 'lax', // Lax para mejor compatibilidad con preview
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie('chronos_token');
};

// Helper: crea una notificación evitando self-notify
async function crearAviso({ destinatario_id, actor_id, tipo, publicacion_id, comentario_id, resumen }) {
  try {
    // No notificar al usuario sobre sus propias acciones
    if (destinatario_id?.toString() === actor_id?.toString()) return null;
    const aviso = await Notificacion.create({
      destinatario_id,
      actor_id,
      tipo,
      publicacion_id: publicacion_id || undefined,
      comentario_id: comentario_id || undefined,
      resumen: resumen || ''
    });
    return aviso;
  } catch (e) {
    console.error('Error creando aviso:', e);
    return null;
  }
}

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
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID inválido' });
    }
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
      // Aviso al autor del relato
      const relato = await Publicacion.findById(publicacionId).select('usuario_id titulo');
      if (relato) {
        await crearAviso({
          destinatario_id: relato.usuario_id,
          actor_id: req.userId,
          tipo: 'eco',
          publicacion_id: publicacionId,
          resumen: relato.titulo
        });
      }
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

    // Avisos: al autor del relato (comentario raíz) o al autor del comentario padre (respuesta)
    try {
      if (parent_id) {
        // Es una respuesta → avisar al dueño del comentario padre
        const parentComment = await Comentario.findById(parent_id).select('usuario_id contenido');
        if (parentComment) {
          await crearAviso({
            destinatario_id: parentComment.usuario_id,
            actor_id: req.userId,
            tipo: 'respuesta',
            publicacion_id,
            comentario_id: nuevoComentario._id,
            resumen: (parentComment.contenido || '').slice(0, 80)
          });
        }
      } else {
        // Es comentario raíz → avisar al autor del relato
        const relato = await Publicacion.findById(publicacion_id).select('usuario_id titulo');
        if (relato) {
          await crearAviso({
            destinatario_id: relato.usuario_id,
            actor_id: req.userId,
            tipo: 'comentario',
            publicacion_id,
            comentario_id: nuevoComentario._id,
            resumen: relato.titulo
          });
        }
      }
    } catch (avisoErr) {
      console.error('Error creando aviso de comentario:', avisoErr);
    }

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
      // Aviso al usuario seguido
      await crearAviso({
        destinatario_id: usuarioId,
        actor_id: req.userId,
        tipo: 'seguidor'
      });
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

// Obtener usuarios sugeridos (DEBE IR ANTES de /api/usuarios/:id)
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
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener usuarios sugeridos' });
  }
});

// Actualizar perfil (DEBE IR ANTES de /api/usuarios/:id)
app.put('/api/usuarios/perfil', auth, async (req, res) => {
  try {
    const { nombre, bio, interes, tema_favorito } = req.body;
    const usuario = await User.findById(req.userId);

    if (nombre !== undefined) usuario.nombre = String(nombre).trim().slice(0, 80);
    if (bio !== undefined) usuario.bio = String(bio).trim().slice(0, 220);
    if (interes !== undefined) usuario.interes = String(interes).trim().slice(0, 60);
    if (tema_favorito !== undefined) usuario.tema_favorito = String(tema_favorito).trim().slice(0, 60);

    // Validación mínima: nombre no puede quedar vacío
    if (!usuario.nombre || usuario.nombre.length < 1) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'El nombre no puede estar vacío' });
    }

    await usuario.save();
    
    const usuarioActualizado = await User.findById(req.userId).select('-password');
    res.json({ mensaje: 'Perfil actualizado', usuario: usuarioActualizado });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al actualizar perfil' });
  }
});

// Subir avatar
app.post('/api/usuarios/avatar', auth, upload.avatares.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Falta el archivo' });
    }
    const avatarUrl = `/api/uploads/avatares/${req.file.filename}`;
    const usuario = await User.findByIdAndUpdate(
      req.userId,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');
    res.json({ mensaje: 'Avatar actualizado', usuario, avatar: avatarUrl });
  } catch (error) {
    console.error('Error subiendo avatar:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al subir avatar' });
  }
});

// Subir portada
app.post('/api/usuarios/portada', auth, upload.portadas.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Falta el archivo' });
    }
    const portadaUrl = `/api/uploads/portadas/${req.file.filename}`;
    const usuario = await User.findByIdAndUpdate(
      req.userId,
      { portada: portadaUrl },
      { new: true }
    ).select('-password');
    res.json({ mensaje: 'Portada actualizada', usuario, portada: portadaUrl });
  } catch (error) {
    console.error('Error subiendo portada:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al subir portada' });
  }
});

// Obtener relatos de un usuario específico
app.get('/api/usuarios/:id/relatos', auth, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID inválido' });
    }
    const relatos = await Publicacion.find({ usuario_id: req.params.id })
      .populate('usuario_id', 'nombre usuario avatar tema_favorito interes')
      .sort({ creado_en: -1 });

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
    console.error('Error al obtener relatos del usuario:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener relatos' });
  }
});

// Obtener perfil de usuario por ID
app.get('/api/usuarios/:id', auth, async (req, res) => {
  try {
    // Validar que el ID sea un ObjectId válido
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID de usuario inválido' });
    }
    
    const usuario = await User.findById(req.params.id).select('-password');
    
    if (!usuario) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Usuario no encontrado' });
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
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener perfil' });
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

// Obtener TODAS las épocas/categorías con conteo
app.get('/api/epocas', auth, async (req, res) => {
  try {
    const epocas = await Publicacion.aggregate([
      { $match: { categoria: { $exists: true, $ne: '' } } },
      { $group: { _id: '$categoria', total: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    res.json(epocas.map(e => ({ categoria: e._id, total: e.total })));
  } catch (error) {
    console.error('Error al obtener épocas:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener épocas' });
  }
});

// Listar relatos de una época / categoría específica
app.get('/api/epocas/:nombre/relatos', auth, async (req, res) => {
  try {
    const nombre = decodeURIComponent(req.params.nombre);
    const relatos = await Publicacion.find({ categoria: nombre })
      .populate('usuario_id', 'nombre usuario avatar tema_favorito interes')
      .sort({ creado_en: -1 });

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

    res.json({ categoria: nombre, total: relatosConStats.length, relatos: relatosConStats });
  } catch (error) {
    console.error('Error al obtener relatos por época:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener relatos' });
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
// RUTA DE BÚSQUEDA AVANZADA
// ============================================

// Búsqueda global de usuarios y relatos
app.get('/api/buscar', auth, async (req, res) => {
  try {
    const { q = '', tipo = 'todo', limit = 10 } = req.query;
    const termino = q.trim();

    if (termino.length < 1) {
      return res.json({ usuarios: [], relatos: [] });
    }

    // Crear regex insensible a acentos y case
    // Reemplaza cada vocal por su clase con acentos
    const escapado = termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const accentInsensitive = escapado
      .replace(/[aáàäâãAÁÀÄÂÃ]/gi, '[aáàäâã]')
      .replace(/[eéèëêEÉÈËÊ]/gi, '[eéèëê]')
      .replace(/[iíìïîIÍÌÏÎ]/gi, '[iíìïî]')
      .replace(/[oóòöôõOÓÒÖÔÕ]/gi, '[oóòöôõ]')
      .replace(/[uúùüûUÚÙÜÛ]/gi, '[uúùüû]')
      .replace(/[nñNÑ]/gi, '[nñ]')
      .replace(/[cçCÇ]/gi, '[cç]');
    const regex = new RegExp(accentInsensitive, 'i');

    const lim = Math.min(parseInt(limit) || 10, 25);

    let usuarios = [];
    let relatos = [];

    if (tipo === 'todo' || tipo === 'usuarios') {
      usuarios = await User.find({
        $or: [
          { nombre: regex },
          { usuario: regex },
          { bio: regex }
        ]
      })
        .select('nombre usuario avatar bio tema_favorito')
        .limit(lim);
    }

    if (tipo === 'todo' || tipo === 'relatos') {
      relatos = await Publicacion.find({
        $or: [
          { titulo: regex },
          { contenido: regex },
          { categoria: regex }
        ]
      })
        .populate('usuario_id', 'nombre usuario avatar')
        .sort({ creado_en: -1 })
        .limit(lim);
    }

    res.json({ usuarios, relatos, total: usuarios.length + relatos.length });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al buscar' });
  }
});

// ============================================
// RUTAS DE AVISOS (NOTIFICACIONES)
// ============================================

// Listar mis avisos (más recientes primero)
app.get('/api/avisos', auth, async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const avisos = await Notificacion.find({ destinatario_id: req.userId })
      .populate('actor_id', 'nombre usuario avatar')
      .populate('publicacion_id', 'titulo categoria')
      .sort({ creado_en: -1 })
      .limit(Math.min(parseInt(limit) || 30, 100));
    res.json(avisos);
  } catch (error) {
    console.error('Error al obtener avisos:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener avisos' });
  }
});

// Contar no leídos
app.get('/api/avisos/no-leidos/count', auth, async (req, res) => {
  try {
    const total = await Notificacion.countDocuments({
      destinatario_id: req.userId,
      leida: false
    });
    res.json({ total });
  } catch (error) {
    console.error('Error contando no leídos:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al contar' });
  }
});

// Marcar todos como leídos
app.post('/api/avisos/marcar-leidos', auth, async (req, res) => {
  try {
    await Notificacion.updateMany(
      { destinatario_id: req.userId, leida: false },
      { $set: { leida: true } }
    );
    res.json({ mensaje: 'Avisos marcados como leídos' });
  } catch (error) {
    console.error('Error marcando leídos:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al marcar' });
  }
});

// Marcar un aviso específico como leído
app.post('/api/avisos/:id/leido', auth, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID inválido' });
    }
    await Notificacion.updateOne(
      { _id: req.params.id, destinatario_id: req.userId },
      { $set: { leida: true } }
    );
    res.json({ mensaje: 'Aviso marcado como leído' });
  } catch (error) {
    console.error('Error marcando aviso:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al marcar' });
  }
});

// ============================================
// RUTAS DE EFEMÉRIDES (CALENDARIO HISTÓRICO REAL)
// ============================================

// Efemérides de hoy (o fecha más cercana si no hay para hoy)
app.get('/api/efemerides/hoy', auth, async (req, res) => {
  try {
    const hoy = new Date();
    const eventosHoy = getEfemeridesPorFecha(hoy);
    if (eventosHoy.length > 0) {
      return res.json({
        fecha: `${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`,
        dia: hoy.getDate(),
        mes: hoy.getMonth() + 1,
        es_hoy: true,
        eventos: eventosHoy
      });
    }
    // No hay para hoy: la más cercana
    const cercana = getEfemerideCercana(hoy);
    if (!cercana) return res.json({ eventos: [] });
    res.json({
      ...cercana,
      es_hoy: false,
      distancia_dias: cercana.distancia_dias
    });
  } catch (error) {
    console.error('Error efemérides hoy:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener efemérides' });
  }
});

// Efemérides de una fecha específica MM-DD
app.get('/api/efemerides/fecha/:fecha', auth, async (req, res) => {
  try {
    const fecha = req.params.fecha;
    if (!/^\d{2}-\d{2}$/.test(fecha)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Formato inválido. Use MM-DD' });
    }
    const eventos = getEfemeridesPorFecha(fecha);
    const [mm, dd] = fecha.split('-').map(Number);
    res.json({ fecha, mes: mm, dia: dd, eventos });
  } catch (error) {
    console.error('Error efemérides fecha:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener efemérides' });
  }
});

// Calendario del mes: año/mes con conteo de eventos por día
app.get('/api/efemerides/calendario/:year/:month', auth, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Año/mes inválido' });
    }
    const dias = getCalendarioDelMes(year, month);
    res.json({ year, month, dias });
  } catch (error) {
    console.error('Error calendario:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener calendario' });
  }
});

// ============================================
// RUTAS DE PREFERENCIAS (sonido + árbol público)
// ============================================
app.put('/api/usuarios/preferencias', auth, async (req, res) => {
  try {
    const { sonido_aviso, arbol_publico } = req.body;
    const usuario = await User.findById(req.userId);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (!usuario.preferencias) usuario.preferencias = {};
    if (sonido_aviso !== undefined) {
      if (!['cuerno', 'lira', 'campana', 'silencio'].includes(sonido_aviso)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Sonido inválido' });
      }
      usuario.preferencias.sonido_aviso = sonido_aviso;
    }
    if (arbol_publico !== undefined) {
      usuario.preferencias.arbol_publico = Boolean(arbol_publico);
    }
    await usuario.save();
    const u = await User.findById(req.userId).select('-password');
    res.json({ mensaje: 'Preferencias actualizadas', usuario: u });
  } catch (error) {
    console.error('Error actualizando preferencias:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al actualizar preferencias' });
  }
});

// ============================================
// RUTAS DEL ÁRBOL GENEALÓGICO (Mi Legado Familiar)
// ============================================

// Listar familiares del usuario logueado (mi árbol)
app.get('/api/familiares/mios', auth, async (req, res) => {
  try {
    const familiares = await MiembroFamiliar.find({ usuario_id: req.userId })
      .populate('vinculado_a_usuario', 'nombre usuario avatar')
      .sort({ creado_en: 1 });
    res.json(familiares);
  } catch (error) {
    console.error('Error listando familiares:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener familiares' });
  }
});

// Listar familiares de OTRO usuario (solo si su árbol es público)
app.get('/api/familiares/usuario/:userId', auth, async (req, res) => {
  try {
    if (!req.params.userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID inválido' });
    }
    const dueño = await User.findById(req.params.userId).select('preferencias nombre usuario');
    if (!dueño) return res.status(404).json({ error: 'Usuario no encontrado' });

    const esMio = req.userId === req.params.userId;
    const esPublico = dueño.preferencias?.arbol_publico === true;
    if (!esMio && !esPublico) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Este legado familiar es privado' });
    }

    const familiares = await MiembroFamiliar.find({ usuario_id: req.params.userId })
      .populate('vinculado_a_usuario', 'nombre usuario avatar')
      .sort({ creado_en: 1 });
    res.json({ dueño: { _id: dueño._id, nombre: dueño.nombre, usuario: dueño.usuario }, familiares, es_publico: esPublico });
  } catch (error) {
    console.error('Error listando familiares de usuario:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener familiares' });
  }
});

// Crear familiar
app.post('/api/familiares', auth, async (req, res) => {
  try {
    const { nombre, apellido, genero, fecha_nacimiento, fecha_defuncion,
            lugar_nacimiento, ocupacion, bio, foto, parentesco, vinculado_a_usuario } = req.body;

    if (!nombre || !parentesco) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Nombre y parentesco son requeridos' });
    }

    const familiar = new MiembroFamiliar({
      usuario_id: req.userId,
      nombre: String(nombre).trim().slice(0, 80),
      apellido: apellido ? String(apellido).trim().slice(0, 80) : '',
      genero: genero || '',
      fecha_nacimiento: fecha_nacimiento || '',
      fecha_defuncion: fecha_defuncion || '',
      lugar_nacimiento: lugar_nacimiento ? String(lugar_nacimiento).slice(0, 120) : '',
      ocupacion: ocupacion ? String(ocupacion).slice(0, 80) : '',
      bio: bio ? String(bio).slice(0, 1500) : '',
      foto: foto || '',
      parentesco,
      vinculado_a_usuario: vinculado_a_usuario || null
    });
    await familiar.save();
    const populated = await MiembroFamiliar.findById(familiar._id)
      .populate('vinculado_a_usuario', 'nombre usuario avatar');
    res.status(201).json({ mensaje: 'Familiar agregado', familiar: populated });
  } catch (error) {
    console.error('Error creando familiar:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al crear familiar' });
  }
});

// Editar familiar
app.put('/api/familiares/:id', auth, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID inválido' });
    }
    const familiar = await MiembroFamiliar.findById(req.params.id);
    if (!familiar) return res.status(404).json({ error: 'Familiar no encontrado' });
    if (familiar.usuario_id.toString() !== req.userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'No autorizado' });
    }
    const fields = ['nombre', 'apellido', 'genero', 'fecha_nacimiento', 'fecha_defuncion',
                    'lugar_nacimiento', 'ocupacion', 'bio', 'foto', 'parentesco', 'vinculado_a_usuario'];
    for (const f of fields) {
      if (req.body[f] !== undefined) familiar[f] = req.body[f];
    }
    await familiar.save();
    const populated = await MiembroFamiliar.findById(familiar._id)
      .populate('vinculado_a_usuario', 'nombre usuario avatar');
    res.json({ mensaje: 'Familiar actualizado', familiar: populated });
  } catch (error) {
    console.error('Error editando familiar:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al editar familiar' });
  }
});

// Eliminar familiar
app.delete('/api/familiares/:id', auth, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID inválido' });
    }
    const familiar = await MiembroFamiliar.findById(req.params.id);
    if (!familiar) return res.status(404).json({ error: 'Familiar no encontrado' });
    if (familiar.usuario_id.toString() !== req.userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'No autorizado' });
    }
    await MiembroFamiliar.deleteOne({ _id: familiar._id });
    res.json({ mensaje: 'Familiar eliminado' });
  } catch (error) {
    console.error('Error eliminando familiar:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al eliminar familiar' });
  }
});

// Subir foto del familiar
app.post('/api/familiares/:id/foto', auth, upload.familiares.single('imagen'), async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID inválido' });
    }
    if (!req.file) return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Falta el archivo' });

    const familiar = await MiembroFamiliar.findById(req.params.id);
    if (!familiar) return res.status(404).json({ error: 'Familiar no encontrado' });
    if (familiar.usuario_id.toString() !== req.userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'No autorizado' });
    }
    familiar.foto = `/api/uploads/familiares/${req.file.filename}`;
    await familiar.save();
    res.json({ mensaje: 'Foto actualizada', foto: familiar.foto });
  } catch (error) {
    console.error('Error subiendo foto:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al subir foto' });
  }
});

// Agregar historia a un familiar
app.post('/api/familiares/:id/historias', auth, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID inválido' });
    }
    const { titulo, contenido } = req.body;
    if (!contenido || !contenido.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Contenido requerido' });
    }
    const familiar = await MiembroFamiliar.findById(req.params.id);
    if (!familiar) return res.status(404).json({ error: 'Familiar no encontrado' });
    if (familiar.usuario_id.toString() !== req.userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'No autorizado' });
    }
    familiar.historias.push({
      titulo: String(titulo || '').slice(0, 120),
      contenido: String(contenido).slice(0, 2000)
    });
    await familiar.save();
    res.json({ mensaje: 'Historia agregada', historias: familiar.historias });
  } catch (error) {
    console.error('Error agregando historia:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al agregar historia' });
  }
});

// Eliminar una historia de un familiar
app.delete('/api/familiares/:id/historias/:idxOrId', auth, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID inválido' });
    }
    const familiar = await MiembroFamiliar.findById(req.params.id);
    if (!familiar) return res.status(404).json({ error: 'Familiar no encontrado' });
    if (familiar.usuario_id.toString() !== req.userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'No autorizado' });
    }
    // Buscar por _id de subdocumento
    const historiaId = req.params.idxOrId;
    familiar.historias = familiar.historias.filter(h => h._id.toString() !== historiaId);
    await familiar.save();
    res.json({ mensaje: 'Historia eliminada', historias: familiar.historias });
  } catch (error) {
    console.error('Error eliminando historia:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al eliminar historia' });
  }
});

// IMPORT GEDCOM — recibe el contenido como texto plano
app.post('/api/familiares/importar-gedcom', auth, async (req, res) => {
  try {
    const { gedcom } = req.body;
    if (!gedcom || typeof gedcom !== 'string') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Contenido GEDCOM requerido' });
    }
    const importados = parseGedcomToFamiliares(gedcom, req.userId);
    if (importados.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'No se encontraron familiares válidos en el archivo GEDCOM' });
    }
    const result = await MiembroFamiliar.insertMany(importados);
    res.status(201).json({
      mensaje: `${result.length} familiares importados desde GEDCOM`,
      total: result.length
    });
  } catch (error) {
    console.error('Error importando GEDCOM:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al importar GEDCOM' });
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
