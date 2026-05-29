require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
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
const Conversacion = require('./models/Conversacion');
const Mensaje = require('./models/Mensaje');
const { getEfemeridesPorFecha, getEfemerideCercana, getCalendarioDelMes } = require('./data/efemerides');
const { parseGedcomToFamiliares } = require('./utils/gedcomParser');
const { Resvg } = require('@resvg/resvg-js');
const webpush = require('web-push');
const PushSubscription = require('./models/PushSubscription');

// Configurar Web Push (VAPID)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@chronos.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('⚠️  VAPID keys no configuradas — web push deshabilitado');
}

/**
 * Envía una notificación push a TODOS los dispositivos suscritos
 * de un usuario. Limpia subscripciones inválidas (410 Gone).
 *
 * payload: { title, body, url, tag }
 */
async function enviarPushAUsuario(usuarioId, payload) {
  try {
    const subs = await PushSubscription.find({ usuario_id: usuarioId });
    if (subs.length === 0) return;
    const data = JSON.stringify({
      title: payload.title || 'Chronos',
      body: payload.body || '',
      url: payload.url || '/',
      tag: payload.tag || 'chronos-' + Date.now(),
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png'
    });
    const resultados = await Promise.allSettled(subs.map(s =>
      webpush.sendNotification({
        endpoint: s.endpoint,
        keys: s.keys
      }, data)
    ));
    // Borrar suscripciones que devolvieron 410/404 (expiradas)
    for (let i = 0; i < resultados.length; i++) {
      const r = resultados[i];
      if (r.status === 'rejected') {
        const status = r.reason?.statusCode;
        if (status === 410 || status === 404) {
          await PushSubscription.deleteOne({ _id: subs[i]._id });
        }
      }
    }
  } catch (err) {
    console.error('Error enviando push:', err.message);
  }
}

// Middleware
const auth = require('./middleware/auth');
const authOptional = require('./middleware/authOptional');
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
// Confiar en el ingress/proxy para obtener IP real vía x-forwarded-for
// (necesario para anti-flood del contador de visitas y rate-limits futuros)
app.set('trust proxy', true);
// CORS: cuando credentials=true no se puede usar '*'. Reflejamos el origen del request
// y permitimos cualquier subdominio de emergent + localhost para desarrollo.
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (apps móviles, curl, mismo origen)
    if (!origin) return callback(null, true);
    // Permitir cualquier dominio en producción + localhost
    return callback(null, true);
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Servir uploads desde /api/uploads para que pase por el routing del ingress
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Asegurar que las carpetas de uploads existan al arranque (multer no las crea)
['relatos', 'avatares', 'portadas', 'familiares', 'videos', 'audio', 'capsulas'].forEach(dir => {
  const full = path.join(__dirname, 'uploads', dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URL, { dbName: process.env.DB_NAME || 'historia-connect-chronos' })
  .then(() => console.log('✅ Conectado a MongoDB - Chronos DB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Helpers para manejo de tokens
const setAuthCookie = (res, token) => {
  res.cookie('chronos_token', token, {
    httpOnly: true,
    secure: true, // Siempre HTTPS en producción
    sameSite: 'none', // 'none' es obligatorio para cookies cross-site con credentials
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
    // Disparar push notification en segundo plano (no bloquea)
    setImmediate(async () => {
      try {
        const titulos = {
          eco: 'Resuena un eco en tu crónica',
          comentario: 'Nuevo comentario en tu crónica',
          seguidor: 'Tienes un nuevo legado',
          mencion: 'Te mencionaron en una crónica'
        };
        const url = publicacion_id
          ? `/relato/${publicacion_id}`
          : (tipo === 'seguidor' ? `/perfil/${actor_id}` : '/avisos');
        await enviarPushAUsuario(destinatario_id, {
          title: titulos[tipo] || 'Aviso del archivo',
          body: resumen || 'Visita Chronos para ver el detalle',
          url,
          tag: `chronos-${tipo}-${publicacion_id || actor_id}`
        });
      } catch (_) { /* silencioso */ }
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

// Multer para crear relato: acepta imagen (5MB) + video (50MB)
const relatoMediaUpload = require('multer')({
  storage: require('multer').diskStorage({
    destination: (req, file, cb) => {
      const folder = file.mimetype.startsWith('video/') ? 'uploads/videos' : 'uploads/relatos';
      cb(null, folder);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + require('path').extname(file.originalname));
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max (videos)
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'imagen') {
      const ok = /^image\/(jpeg|jpg|png|gif|webp)$/.test(file.mimetype);
      return cb(ok ? null : new Error('Imagen inválida'), ok);
    }
    if (file.fieldname === 'video') {
      const ok = /^video\//.test(file.mimetype);
      return cb(ok ? null : new Error('Video inválido'), ok);
    }
    cb(null, false);
  }
}).fields([{ name: 'imagen', maxCount: 1 }, { name: 'video', maxCount: 1 }]);

// Crear relato
app.post('/api/relatos', [auth, relatoMediaUpload], [
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
    const imagenFile = req.files?.imagen?.[0];
    const videoFile = req.files?.video?.[0];
    const imagen = imagenFile ? `/api/uploads/relatos/${imagenFile.filename}` : null;
    const videoPath = videoFile ? `/api/uploads/videos/${videoFile.filename}` : null;
    const tags = Publicacion.extractTags(`${titulo} ${contenido}`);

    // Indicador temporal opcional (siglo + lugar)
    const historiaAnioRaw = req.body.historia_anio;
    const historia_anio = historiaAnioRaw !== undefined && historiaAnioRaw !== ''
      ? Number(historiaAnioRaw)
      : null;
    const historia_lugar = (req.body.historia_lugar || '').toString().trim() || null;

    const nuevoRelato = new Publicacion({
      usuario_id: req.userId,
      titulo,
      categoria,
      contenido,
      imagen,
      video_path: videoPath,
      tags,
      historia_anio: Number.isFinite(historia_anio) ? historia_anio : null,
      historia_lugar
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
app.get('/api/relatos/:id', authOptional, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID inválido' });
    }
    const relato = await Publicacion.findById(req.params.id)
      .populate('usuario_id', 'nombre usuario avatar tema_favorito bio');

    if (!relato) {
      return res.status(404).json({ error: 'Relato no encontrado' });
    }

    // Stats públicos siempre. Estado personal (mi eco/archivado) solo si autenticado.
    const baseStatsPromises = [
      Eco.countDocuments({ publicacion_id: relato._id }),
      Comentario.countDocuments({ publicacion_id: relato._id }),
      Archivado.countDocuments({ publicacion_id: relato._id })
    ];
    const personalStatsPromises = req.userId ? [
      Eco.countDocuments({ publicacion_id: relato._id, usuario_id: req.userId }),
      Archivado.countDocuments({ publicacion_id: relato._id, usuario_id: req.userId })
    ] : [Promise.resolve(0), Promise.resolve(0)];

    const [total_ecos, total_comentarios, total_archivos, usuario_dio_eco, usuario_archivado] =
      await Promise.all([...baseStatsPromises, ...personalStatsPromises]);

    res.json({
      ...relato.toObject(),
      total_ecos,
      total_comentarios,
      total_archivos,
      usuario_dio_eco: usuario_dio_eco > 0,
      usuario_archivado: usuario_archivado > 0,
      es_publico: !req.userId // hint para que el frontend sepa que el lector es anónimo
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
    // Re-extraer tags si cambia el contenido o título
    if (titulo || contenido) {
      relato.tags = Publicacion.extractTags(`${relato.titulo} ${relato.contenido}`);
    }

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
app.get('/api/comentarios/:publicacionId', authOptional, async (req, res) => {
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
// RUTAS DE PRESENCIA / ACTIVIDAD
// (icono antorcha encendida + "escribiendo...")
// ============================================

// Heartbeat: el cliente lo llama cada 60s mientras la app está en foreground.
// Marca al usuario como "activo ahora" (activo si ultimo_visto < 2min).
app.post('/api/presencia/heartbeat', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { ultimo_visto: new Date() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error heartbeat' });
  }
});

// Consulta: dado un set de userIds, devolver cuáles están activos ahora
// (ultimo_visto en los últimos 2 minutos).
app.post('/api/presencia/consultar', auth, async (req, res) => {
  try {
    const { ids = [] } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) return res.json({ activos: [] });
    const threshold = new Date(Date.now() - 2 * 60 * 1000);
    const activos = await User.find(
      { _id: { $in: ids.slice(0, 200) }, ultimo_visto: { $gte: threshold } },
      { _id: 1, ultimo_visto: 1 }
    ).lean();
    res.json({ activos: activos.map(u => ({ _id: u._id, ultimo_visto: u.ultimo_visto })) });
  } catch (err) {
    res.status(500).json({ error: 'Error consulta presencia' });
  }
});

// "Escribiendo..." en comentarios: cache en memoria, TTL 4s.
// Usuario X notifica que está escribiendo un comentario en relato Y.
const typingMap = new Map(); // key: relato_id, value: Map<userId, { until, nombre }>

app.post('/api/presencia/escribiendo/:relatoId', auth, async (req, res) => {
  try {
    const { relatoId } = req.params;
    const user = await User.findById(req.userId, { nombre: 1 }).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    let bucket = typingMap.get(relatoId);
    if (!bucket) { bucket = new Map(); typingMap.set(relatoId, bucket); }
    bucket.set(req.userId.toString(), {
      until: Date.now() + 4000,
      nombre: user.nombre.split(' ')[0]
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error typing' });
  }
});

// Consulta quién está escribiendo (excluyendo al solicitante)
app.get('/api/presencia/escribiendo/:relatoId', auth, async (req, res) => {
  try {
    const { relatoId } = req.params;
    const bucket = typingMap.get(relatoId);
    if (!bucket) return res.json({ escribiendo: [] });
    const now = Date.now();
    const requesterId = req.userId.toString();
    const escribiendo = [];
    for (const [uid, info] of bucket.entries()) {
      if (info.until < now) { bucket.delete(uid); continue; }
      if (uid === requesterId) continue;
      escribiendo.push({ _id: uid, nombre: info.nombre });
    }
    res.json({ escribiendo });
  } catch (err) {
    res.status(500).json({ error: 'Error consulta typing' });
  }
});

// Limpieza periódica del typingMap (cada 30s)
setInterval(() => {
  const now = Date.now();
  for (const [relatoId, bucket] of typingMap.entries()) {
    for (const [uid, info] of bucket.entries()) {
      if (info.until < now) bucket.delete(uid);
    }
    if (bucket.size === 0) typingMap.delete(relatoId);
  }
}, 30000);

// Cronistas activos ahora (últimos 2 min) — para la sección del sidebar.
// Excluye al usuario solicitante. Limita a 12.
app.get('/api/presencia/activos', auth, async (req, res) => {
  try {
    const threshold = new Date(Date.now() - 2 * 60 * 1000);
    const activos = await User.find(
      { _id: { $ne: req.userId }, ultimo_visto: { $gte: threshold } },
      { _id: 1, nombre: 1, usuario: 1, avatar: 1, ultimo_visto: 1 }
    )
      .sort({ ultimo_visto: -1 })
      .limit(12)
      .lean();
    res.json({ activos, total: activos.length });
  } catch (err) {
    console.error('Error /presencia/activos:', err);
    res.status(500).json({ error: 'Error al consultar activos' });
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

// Mapa: todas las efemérides geolocalizadas (lat/lng disponibles)
app.get('/api/efemerides/mapa', auth, async (req, res) => {
  try {
    const { EFEMERIDES } = require('./data/efemerides');
    const eventos = [];
    for (const [fecha, lista] of Object.entries(EFEMERIDES)) {
      const [mm, dd] = fecha.split('-').map(Number);
      lista.forEach((ev, idx) => {
        if (typeof ev.lat !== 'number' || typeof ev.lng !== 'number') return;
        eventos.push({
          id: `${fecha}-${idx}`,
          fecha, mes: mm, dia: dd,
          anio: ev.anio,
          evento: ev.evento,
          epoca: ev.epoca,
          lugar: ev.lugar,
          lat: ev.lat,
          lng: ev.lng
        });
      });
    }
    // Ordenar cronológicamente por año
    eventos.sort((a, b) => a.anio - b.anio);
    res.json({ total: eventos.length, eventos });
  } catch (error) {
    console.error('Error mapa efemérides:', error);
    res.status(500).json({ error: 'Error al obtener mapa' });
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
    const PARENTESCOS = ['padre', 'madre',
      'abuelo_paterno', 'abuela_paterna', 'abuelo_materno', 'abuela_materna',
      'bisabuelo_pp', 'bisabuela_pp', 'bisabuelo_pm', 'bisabuela_pm',
      'bisabuelo_mp', 'bisabuela_mp', 'bisabuelo_mm', 'bisabuela_mm',
      'hermano', 'hermana', 'tio', 'tia', 'primo', 'prima',
      'hijo', 'hija', 'conyuge', 'otro'];

    const { nombre, apellido, genero, fecha_nacimiento, fecha_defuncion,
            lugar_nacimiento, ocupacion, bio, foto, parentesco, vinculado_a_usuario } = req.body;

    if (!nombre || !parentesco) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Nombre y parentesco son requeridos' });
    }
    if (!PARENTESCOS.includes(parentesco)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Parentesco inválido' });
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
// RUTAS DE TAGS / HASHTAGS
// ============================================

// Tags más populares (agregado)
app.get('/api/tags/populares', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const populares = await Publicacion.aggregate([
      { $match: { tags: { $exists: true, $ne: [] } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: limit }
    ]);
    res.json(populares.map(t => ({ tag: t._id, total: t.total })));
  } catch (error) {
    console.error('Error tags populares:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener tags populares' });
  }
});

// Relatos por tag
app.get('/api/tags/:tag/relatos', auth, async (req, res) => {
  try {
    const tag = String(req.params.tag).toLowerCase().slice(0, 30);
    const relatos = await Publicacion.find({ tags: tag })
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
        total_ecos, total_comentarios, total_archivos,
        usuario_dio_eco: usuario_dio_eco > 0,
        usuario_archivado: usuario_archivado > 0
      };
    }));
    res.json({ tag, total: relatosConStats.length, relatos: relatosConStats });
  } catch (error) {
    console.error('Error relatos por tag:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener relatos' });
  }
});

// ============================================
// RUTA DE TRENDING REAL (últimos 7 días)
// ============================================
app.get('/api/trending', auth, async (req, res) => {
  try {
    const dias = Math.min(parseInt(req.query.dias) || 7, 30);
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    // Agregar score = ecos*2 + comentarios*3 + archivados*4 (últimos N días)
    const ecos = await Eco.aggregate([
      { $match: { creado_en: { $gte: desde } } },
      { $group: { _id: '$publicacion_id', total: { $sum: 1 } } }
    ]);
    const coms = await Comentario.aggregate([
      { $match: { creado_en: { $gte: desde } } },
      { $group: { _id: '$publicacion_id', total: { $sum: 1 } } }
    ]);
    const archs = await Archivado.aggregate([
      { $match: { creado_en: { $gte: desde } } },
      { $group: { _id: '$publicacion_id', total: { $sum: 1 } } }
    ]);

    const scoreMap = {};
    ecos.forEach(e => { scoreMap[e._id] = (scoreMap[e._id] || 0) + e.total * 2; });
    coms.forEach(c => { scoreMap[c._id] = (scoreMap[c._id] || 0) + c.total * 3; });
    archs.forEach(a => { scoreMap[a._id] = (scoreMap[a._id] || 0) + a.total * 4; });

    const ids = Object.keys(scoreMap)
      .sort((a, b) => scoreMap[b] - scoreMap[a])
      .slice(0, Math.min(parseInt(req.query.limit) || 10, 30));

    if (ids.length === 0) return res.json({ dias, relatos: [] });

    const relatos = await Publicacion.find({ _id: { $in: ids } })
      .populate('usuario_id', 'nombre usuario avatar tema_favorito');

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
        total_ecos, total_comentarios, total_archivos,
        score: scoreMap[relato._id.toString()] || 0,
        usuario_dio_eco: usuario_dio_eco > 0,
        usuario_archivado: usuario_archivado > 0
      };
    }));
    // Reordenar por score
    relatosConStats.sort((a, b) => b.score - a.score);
    res.json({ dias, relatos: relatosConStats });
  } catch (error) {
    console.error('Error trending:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al calcular trending' });
  }
});

// ============================================
// RUTA DE EXPLORAR (combinado: trending + tags + sugerencias)
// ============================================
app.get('/api/explorar', auth, async (req, res) => {
  try {
    const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Trending top 5
    const ecos = await Eco.aggregate([
      { $match: { creado_en: { $gte: desde } } },
      { $group: { _id: '$publicacion_id', total: { $sum: 1 } } }
    ]);
    const coms = await Comentario.aggregate([
      { $match: { creado_en: { $gte: desde } } },
      { $group: { _id: '$publicacion_id', total: { $sum: 1 } } }
    ]);
    const archs = await Archivado.aggregate([
      { $match: { creado_en: { $gte: desde } } },
      { $group: { _id: '$publicacion_id', total: { $sum: 1 } } }
    ]);
    const scoreMap = {};
    ecos.forEach(e => { scoreMap[e._id] = (scoreMap[e._id] || 0) + e.total * 2; });
    coms.forEach(c => { scoreMap[c._id] = (scoreMap[c._id] || 0) + c.total * 3; });
    archs.forEach(a => { scoreMap[a._id] = (scoreMap[a._id] || 0) + a.total * 4; });
    const topIds = Object.keys(scoreMap)
      .sort((a, b) => scoreMap[b] - scoreMap[a]).slice(0, 5);

    let trending = [];
    if (topIds.length > 0) {
      const t = await Publicacion.find({ _id: { $in: topIds } })
        .populate('usuario_id', 'nombre usuario avatar tema_favorito');
      trending = t.map(r => ({ ...r.toObject(), score: scoreMap[r._id.toString()] || 0 }));
      trending.sort((a, b) => b.score - a.score);
    }

    // Tags populares top 10
    const tagsPopulares = await Publicacion.aggregate([
      { $match: { tags: { $exists: true, $ne: [] } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);

    // Cronistas sugeridos (que aún no sigues, ordenados por nº de relatos)
    const yaSigo = await Seguidor.find({ seguidor_id: req.userId }).select('seguido_id');
    const yaSigoIds = yaSigo.map(s => s.seguido_id);
    const cronistasSugeridos = await User.aggregate([
      { $match: { _id: { $nin: [...yaSigoIds, new mongoose.Types.ObjectId(req.userId)] } } },
      {
        $lookup: {
          from: 'publicacions',
          localField: '_id',
          foreignField: 'usuario_id',
          as: 'relatos'
        }
      },
      { $addFields: { total_relatos: { $size: '$relatos' } } },
      { $match: { total_relatos: { $gt: 0 } } },
      { $sort: { total_relatos: -1 } },
      { $limit: 6 },
      { $project: { nombre: 1, usuario: 1, avatar: 1, bio: 1, tema_favorito: 1, total_relatos: 1 } }
    ]);

    // Épocas con más actividad
    const epocas = await Publicacion.aggregate([
      { $match: { categoria: { $exists: true, $ne: '' } } },
      { $group: { _id: '$categoria', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 6 }
    ]);

    res.json({
      trending,
      tags_populares: tagsPopulares.map(t => ({ tag: t._id, total: t.total })),
      cronistas: cronistasSugeridos,
      epocas: epocas.map(e => ({ categoria: e._id, total: e.total }))
    });
  } catch (error) {
    console.error('Error explorar:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al cargar exploración' });
  }
});

// ============================================
// RUTAS DE MISIVAS (Mensajería directa 1-on-1)
// ============================================

// Helper: normaliza el par de participantes (ordena por ID ascendente)
const normalizarParticipantes = (userIdA, userIdB) => {
  const a = String(userIdA);
  const b = String(userIdB);
  return a < b ? [userIdA, userIdB] : [userIdB, userIdA];
};

// GET /api/misivas/contactos-sugeridos — para el modal de "Compartir crónica"
// Devuelve cronistas que sigo + los que me siguen, deduplicados, sin yo mismo
app.get('/api/misivas/contactos-sugeridos', auth, async (req, res) => {
  try {
    const sigoA = await Seguidor.find({ seguidor_id: req.userId }).select('seguido_id');
    const meSiguen = await Seguidor.find({ seguido_id: req.userId }).select('seguidor_id');
    const ids = new Set();
    sigoA.forEach(s => ids.add(String(s.seguido_id)));
    meSiguen.forEach(s => ids.add(String(s.seguidor_id)));
    ids.delete(String(req.userId));
    if (ids.size === 0) return res.json([]);
    const users = await User.find({ _id: { $in: Array.from(ids) } })
      .select('nombre usuario avatar tema_favorito bio')
      .limit(30);
    res.json(users);
  } catch (error) {
    console.error('Error contactos sugeridos:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al cargar contactos' });
  }
});

// GET /api/misivas — lista de conversaciones del usuario actual
app.get('/api/misivas', auth, async (req, res) => {
  try {
    const convs = await Conversacion.find({ participantes: req.userId })
      .sort({ ultimo_mensaje_en: -1 })
      .populate('participantes', 'nombre usuario avatar tema_favorito')
      .lean();

    // Mapear: añadir 'otro' (el participante que no soy yo) y flag no_leidos
    const resultado = convs.map(c => {
      const otro = c.participantes.find(p => String(p._id) !== String(req.userId));
      const meLeido = c.leido_por?.[req.userId] ? new Date(c.leido_por[req.userId]) : null;
      const noLeidos = !meLeido || (c.ultimo_mensaje_en && new Date(c.ultimo_mensaje_en) > meLeido);
      // No marcar no_leido si yo soy el último remitente
      const yoFuiElUltimo = String(c.ultimo_remitente_id) === String(req.userId);
      return {
        _id: c._id,
        otro,
        ultimo_mensaje_en: c.ultimo_mensaje_en,
        ultimo_mensaje_resumen: c.ultimo_mensaje_resumen,
        no_leido: noLeidos && !yoFuiElUltimo
      };
    });
    res.json(resultado);
  } catch (error) {
    console.error('Error listando misivas:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al cargar misivas' });
  }
});

// GET /api/misivas/no-leidas — count para badge
app.get('/api/misivas/no-leidas', auth, async (req, res) => {
  try {
    const convs = await Conversacion.find({ participantes: req.userId }).lean();
    let total = 0;
    for (const c of convs) {
      const meLeido = c.leido_por?.[req.userId] ? new Date(c.leido_por[req.userId]) : null;
      const yoFuiElUltimo = String(c.ultimo_remitente_id) === String(req.userId);
      if (yoFuiElUltimo) continue;
      if (!meLeido || (c.ultimo_mensaje_en && new Date(c.ultimo_mensaje_en) > meLeido)) {
        total++;
      }
    }
    res.json({ total });
  } catch (error) {
    console.error('Error misivas no leídas:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al contar misivas' });
  }
});

// POST /api/misivas/abrir/:userId — abre o crea conversación con otro usuario
app.post('/api/misivas/abrir/:userId', auth, async (req, res) => {
  try {
    const otroId = req.params.userId;
    if (String(otroId) === String(req.userId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'No puedes escribirte a ti mismo' });
    }
    const otro = await User.findById(otroId).select('nombre usuario avatar tema_favorito');
    if (!otro) return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Cronista no encontrado' });

    const participantes = normalizarParticipantes(req.userId, otroId);
    let conv = await Conversacion.findOne({
      participantes: { $all: participantes, $size: 2 }
    });
    if (!conv) {
      conv = await Conversacion.create({
        participantes,
        ultimo_mensaje_en: new Date(),
        ultimo_mensaje_resumen: ''
      });
    }
    res.json({ _id: conv._id, otro });
  } catch (error) {
    console.error('Error abriendo misiva:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al abrir misiva' });
  }
});

// GET /api/misivas/:conversacionId/mensajes — historial
app.get('/api/misivas/:conversacionId/mensajes', auth, async (req, res) => {
  try {
    const conv = await Conversacion.findById(req.params.conversacionId);
    if (!conv) return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Misiva no encontrada' });
    if (!conv.participantes.map(String).includes(String(req.userId))) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'No tienes acceso a esta misiva' });
    }
    const mensajes = await Mensaje.find({ conversacion_id: conv._id })
      .sort({ creado_en: 1 })
      .lean();
    const otro = await User.findById(
      conv.participantes.find(p => String(p) !== String(req.userId))
    ).select('nombre usuario avatar tema_favorito bio');
    res.json({ _id: conv._id, otro, mensajes });
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al obtener misiva' });
  }
});

// POST /api/misivas/:conversacionId/mensajes — enviar
app.post('/api/misivas/:conversacionId/mensajes',
  auth,
  [body('contenido').trim().isLength({ min: 1, max: 4000 }).withMessage('Contenido entre 1 y 4000 caracteres')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ errors: errors.array() });
      }
      const conv = await Conversacion.findById(req.params.conversacionId);
      if (!conv) return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Misiva no encontrada' });
      if (!conv.participantes.map(String).includes(String(req.userId))) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'No tienes acceso a esta misiva' });
      }
      const { contenido } = req.body;
      const msg = await Mensaje.create({
        conversacion_id: conv._id,
        remitente_id: req.userId,
        contenido
      });
      conv.ultimo_mensaje_en = msg.creado_en;
      conv.ultimo_mensaje_resumen = contenido.slice(0, 140);
      conv.ultimo_remitente_id = req.userId;
      // Marcar como leído para el remitente
      conv.leido_por.set(String(req.userId), msg.creado_en);
      await conv.save();

      // Push notification al otro participante
      const otroId = conv.participantes.find(p => String(p) !== String(req.userId));
      const remitente = await User.findById(req.userId).select('nombre');
      setImmediate(() => enviarPushAUsuario(otroId, {
        title: `Misiva de ${remitente?.nombre || 'un cronista'}`,
        body: contenido.slice(0, 120),
        url: `/misivas/${conv._id}`,
        tag: `chronos-misiva-${conv._id}`
      }).catch(() => {}));

      res.status(HTTP_STATUS.CREATED).json(msg);
    } catch (error) {
      console.error('Error enviando misiva:', error);
      res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al enviar misiva' });
    }
  }
);

// POST /api/misivas/:conversacionId/leer — marca conv como leída
app.post('/api/misivas/:conversacionId/leer', auth, async (req, res) => {
  try {
    const conv = await Conversacion.findById(req.params.conversacionId);
    if (!conv) return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Misiva no encontrada' });
    if (!conv.participantes.map(String).includes(String(req.userId))) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'No tienes acceso a esta misiva' });
    }
    conv.leido_por.set(String(req.userId), new Date());
    await conv.save();
    res.json({ ok: true });
  } catch (error) {
    console.error('Error marcando leído:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al marcar leído' });
  }
});

// ============================================
// PUSH NOTIFICATIONS (VAPID Web Push)
// ============================================

// GET /api/push/public-key — clave pública VAPID para el frontend
app.get('/api/push/public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || '' });
});

// POST /api/push/suscribir — guarda la subscripción del navegador del usuario
app.post('/api/push/suscribir', auth, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Subscripción inválida' });
    }
    // Upsert: si ya existía esa endpoint, actualizamos el usuario_id (por si cambió)
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        usuario_id: req.userId,
        endpoint,
        keys,
        user_agent: req.headers['user-agent'] || ''
      },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Error suscribir push:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al suscribir' });
  }
});

// POST /api/push/desuscribir — borra una subscripción por endpoint
app.post('/api/push/desuscribir', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Endpoint requerido' });
    await PushSubscription.deleteOne({ endpoint, usuario_id: req.userId });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error desuscribir push:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al desuscribir' });
  }
});

// POST /api/push/test — el usuario se envía un push de prueba a sí mismo
app.post('/api/push/test', auth, async (req, res) => {
  try {
    await enviarPushAUsuario(req.userId, {
      title: 'Chronos',
      body: 'Tu archivo de notificaciones está activo. Recibirás avisos cuando otros cronistas resuenen con tus crónicas.',
      url: '/avisos'
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al enviar prueba' });
  }
});

// ============================================
// CONTADOR DE VISITAS (auth opcional + anti-flooding)
// ============================================

// Cache en memoria para evitar inflar el contador con refrescos
// Clave: `${userIdOrIP}:${relatoId}` → timestamp
// TTL: 30 minutos (misma sesión cuenta una sola visita)
const visitasCache = new Map();
const VISITA_TTL = 30 * 60 * 1000;

// Limpieza periódica
setInterval(() => {
  const ahora = Date.now();
  for (const [key, ts] of visitasCache.entries()) {
    if (ahora - ts > VISITA_TTL) visitasCache.delete(key);
  }
}, 10 * 60 * 1000).unref();

// POST /api/relatos/:id/visita — incrementa visitas si pasó el TTL
app.post('/api/relatos/:id/visita', authOptional, async (req, res) => {
  try {
    const relatoId = req.params.id;
    if (!relatoId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID inválido' });
    }

    // Identificador: userId si está logueado, sino IP (con proxy headers)
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim()
      || req.ip
      || req.connection?.remoteAddress
      || 'anon';
    const visitorId = req.userId || `ip:${ip}`;
    const cacheKey = `${visitorId}:${relatoId}`;
    const ahora = Date.now();
    const ultimo = visitasCache.get(cacheKey);

    // Si NO está autenticado y es el autor, igual cuenta.
    // Si está autenticado y es el autor, NO contar (no inflar las propias visitas).
    const relato = await Publicacion.findById(relatoId).select('usuario_id visitas');
    if (!relato) return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Relato no encontrado' });

    const esAutor = req.userId && String(relato.usuario_id) === String(req.userId);

    if (esAutor) {
      // No incrementar, pero devolver el total actual
      return res.json({ visitas: relato.visitas || 0, contado: false, razon: 'autor' });
    }

    if (ultimo && (ahora - ultimo) < VISITA_TTL) {
      return res.json({ visitas: relato.visitas || 0, contado: false, razon: 'reciente' });
    }

    // Incrementar de forma atómica
    const actualizado = await Publicacion.findByIdAndUpdate(
      relatoId,
      { $inc: { visitas: 1 } },
      { new: true, select: 'visitas' }
    );

    visitasCache.set(cacheKey, ahora);
    res.json({ visitas: actualizado.visitas, contado: true });
  } catch (error) {
    console.error('Error registrando visita:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ error: 'Error al registrar visita' });
  }
});

// ============================================
// RUTAS OPEN GRAPH (vista previa en redes externas)
// ============================================

// Helpers para escape de HTML / XML
const escapeHtml = (s = '') => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const escapeXml = escapeHtml;

// Trunca un texto manteniendo palabras completas, hasta maxLen, con ellipsis si recorta
const truncar = (texto, maxLen) => {
  const t = String(texto || '').trim();
  if (t.length <= maxLen) return t;
  const cortado = t.slice(0, maxLen);
  const ultimo = cortado.lastIndexOf(' ');
  return (ultimo > maxLen * 0.6 ? cortado.slice(0, ultimo) : cortado) + '…';
};

// Construye SVG ornamental tipo pergamino con título, autor y época
const buildOgSvg = ({ titulo, autor, epoca, fragmento }) => {
  const t = escapeXml(truncar(titulo, 80));
  const a = escapeXml(autor || 'Cronista anónimo');
  const e = escapeXml(epoca || 'Crónica histórica');
  const f = escapeXml(truncar(fragmento || '', 100));
  // 1200x630 — proporción OG estándar
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a1228"/>
      <stop offset="1" stop-color="#050a18"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="0%" r="80%">
      <stop offset="0" stop-color="#d4b878" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#d4b878" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Fondo -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Marco ornamentado -->
  <rect x="30" y="30" width="1140" height="570" fill="none" stroke="#d4b878" stroke-width="1" opacity="0.5"/>
  <rect x="42" y="42" width="1116" height="546" fill="none" stroke="#d4b878" stroke-width="0.5" opacity="0.35"/>

  <!-- Esquinas decorativas (flor de lis simplificada) -->
  <g fill="#d4b878" opacity="0.8">
    <circle cx="30" cy="30" r="4"/>
    <circle cx="1170" cy="30" r="4"/>
    <circle cx="30" cy="600" r="4"/>
    <circle cx="1170" cy="600" r="4"/>
  </g>

  <!-- Reloj de arena monograma -->
  <g transform="translate(95, 95)" fill="none" stroke="#d4b878" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 0 L40 0 M0 56 L40 56"/>
    <path d="M4 0 L4 8 Q4 16 12 20 L28 28 Q36 32 36 40 L36 56"/>
    <path d="M36 0 L36 8 Q36 16 28 20 L12 28 Q4 32 4 40 L4 56"/>
    <path d="M8 4 L32 4 L28 14 Q20 18 12 14 Z" fill="#d4b878" stroke="none" opacity="0.55"/>
  </g>

  <!-- Marca "CHRONOS" -->
  <text x="170" y="105" font-family="'Marcellus','Cinzel','Times New Roman',serif" font-size="22" fill="#d4b878" letter-spacing="6">CHRONOS</text>
  <text x="170" y="130" font-family="'Cormorant Garamond','Garamond','Times New Roman',serif" font-style="italic" font-size="16" fill="#a6a98c">archivo vivo de la historia</text>

  <!-- Kicker de época -->
  <text x="600" y="240" text-anchor="middle" font-family="'Marcellus','Cinzel','Times New Roman',serif" font-size="18" fill="#d4b878" letter-spacing="6" text-transform="uppercase">${e.toUpperCase()}</text>

  <!-- Divisor flor de lis -->
  <g transform="translate(600, 260)" fill="#d4b878" opacity="0.6">
    <line x1="-150" y1="0" x2="-25" y2="0" stroke="#d4b878" stroke-width="0.5"/>
    <line x1="25" y1="0" x2="150" y2="0" stroke="#d4b878" stroke-width="0.5"/>
    <circle cx="0" cy="0" r="3"/>
    <path d="M-12 -8 Q0 -14 12 -8 M-12 8 Q0 14 12 8" fill="none" stroke="#d4b878" stroke-width="0.8"/>
  </g>

  <!-- TÍTULO (con wrap manual hasta 2 líneas) -->
  ${(() => {
    // Wrap manual sencillo en 2 líneas máximo
    const words = t.split(/\s+/);
    const lines = [[]];
    const maxChars = 38;
    for (const w of words) {
      const tentative = [...lines[lines.length - 1], w].join(' ');
      if (tentative.length > maxChars && lines[lines.length - 1].length > 0) {
        if (lines.length < 2) lines.push([w]);
        else { lines[lines.length - 1].push('…'); break; }
      } else {
        lines[lines.length - 1].push(w);
      }
    }
    const renderedLines = lines.map(l => l.join(' '));
    return renderedLines.map((line, i) =>
      `<text x="600" y="${340 + i * 64}" text-anchor="middle" font-family="'Cormorant Garamond','Garamond','Times New Roman',serif" font-size="54" fill="#f3e7c5" font-weight="500">${line}</text>`
    ).join('\n');
  })()}

  <!-- Fragmento -->
  ${f ? `<text x="600" y="475" text-anchor="middle" font-family="'Cormorant Garamond','Garamond','Times New Roman',serif" font-style="italic" font-size="20" fill="#a6a98c">«${f}»</text>` : ''}

  <!-- Autor -->
  <text x="600" y="540" text-anchor="middle" font-family="'Cormorant Garamond','Garamond','Times New Roman',serif" font-style="italic" font-size="22" fill="#d4b878">— ${a}</text>
</svg>`;
};

// GET /api/og/relato/:id/imagen — PNG dinámico para OG cards
app.get('/api/og/relato/:id/imagen', async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).send('ID inválido');
    }
    const relato = await Publicacion.findById(req.params.id)
      .populate('usuario_id', 'nombre usuario');
    if (!relato) return res.status(HTTP_STATUS.NOT_FOUND).send('Relato no encontrado');

    const svg = buildOgSvg({
      titulo: relato.titulo,
      autor: relato.usuario_id?.nombre,
      epoca: relato.categoria,
      fragmento: relato.contenido
    });

    const resvg = new Resvg(svg, { background: '#0a1228', fitTo: { mode: 'width', value: 1200 } });
    const png = resvg.render().asPng();

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.send(Buffer.from(png));
  } catch (error) {
    console.error('Error generando OG image:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).send('Error');
  }
});

// GET /api/og/relato/:id — HTML con meta tags Open Graph + redirect a /relato/:id
app.get('/api/og/relato/:id', async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).send('ID inválido');
    }
    const relato = await Publicacion.findById(req.params.id)
      .populate('usuario_id', 'nombre usuario');
    if (!relato) return res.status(HTTP_STATUS.NOT_FOUND).send('Relato no encontrado');

    // URL pública del relato (en la app React)
    const proto = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('x-forwarded-host') || req.get('host');
    const base = `${proto}://${host}`;
    const urlRelato = `${base}/relato/${relato._id}`;
    const urlImagen = `${base}/api/og/relato/${relato._id}/imagen`;

    const titulo = escapeHtml(relato.titulo);
    const autor = escapeHtml(relato.usuario_id?.nombre || 'Cronista anónimo');
    const epoca = escapeHtml(relato.categoria || 'Crónica histórica');
    const descripcion = escapeHtml(
      truncar(relato.contenido || `Una crónica del archivo de Chronos por ${autor}.`, 200)
    );

    // Detección de bots vs humanos para servir el redirect correcto
    const ua = (req.get('user-agent') || '').toLowerCase();
    const esBot = /bot|crawl|spider|whatsapp|facebookexternalhit|twitterbot|discord|telegram|slackbot|skypeuripreview|preview|embed/i.test(ua);

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=600, s-maxage=600');
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${titulo} — Chronos</title>
<meta name="description" content="${descripcion}">

<!-- Open Graph -->
<meta property="og:type" content="article">
<meta property="og:site_name" content="Chronos · Archivo vivo de la historia">
<meta property="og:title" content="${titulo}">
<meta property="og:description" content="${descripcion}">
<meta property="og:url" content="${urlRelato}">
<meta property="og:image" content="${urlImagen}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${titulo} — ${autor}">
<meta property="article:author" content="${autor}">
<meta property="article:section" content="${epoca}">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${titulo}">
<meta name="twitter:description" content="${descripcion}">
<meta name="twitter:image" content="${urlImagen}">

<!-- Para humanos: redirigir a la app React -->
${esBot ? '' : `<meta http-equiv="refresh" content="0;url=${urlRelato}">`}
</head>
<body style="background:#0a1228;color:#d4b878;font-family:serif;text-align:center;padding:60px 20px;">
<p style="font-style:italic;">Abriendo el archivo…</p>
<p><a href="${urlRelato}" style="color:#d4b878;">Continuar a la crónica</a></p>
${esBot ? '' : `<script>setTimeout(function(){location.href='${urlRelato}'},50);</script>`}
</body>
</html>`);
  } catch (error) {
    console.error('Error OG relato:', error);
    res.status(HTTP_STATUS.SERVER_ERROR).send('Error');
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

// ============================================
// CÁPSULAS DEL TIEMPO (Stories históricas)
// ============================================
const capsulasRouter = require('./routes/capsulas')({ auth, authOptional });
app.use('/api/capsulas', capsulasRouter);

// ============================================
// FRAGMENTOS DEL TIEMPO (Reels históricos)
// ============================================
const fragmentosRouter = require('./routes/fragmentos')({ auth, authOptional });
app.use('/api/fragmentos', fragmentosRouter);

// ============================================
// VISITAS VIRTUALES 360° (catálogo curado)
// ============================================
const visitasRouter = require('./routes/visitas')();
app.use('/api/visitas', visitasRouter);

// ============================================
// GENERACIÓN DE IMAGEN CON IA (Gemini Nano Banana)
// ============================================
const relatoUploadDirImg = path.join(__dirname, 'uploads', 'relatos');
if (!fs.existsSync(relatoUploadDirImg)) fs.mkdirSync(relatoUploadDirImg, { recursive: true });

app.post('/api/ia/imagen', auth, async (req, res) => {
  try {
    const { prompt, estilo } = req.body || {};
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: 'Se requiere una descripción' });
    }
    if (String(prompt).length > 500) {
      return res.status(400).json({ error: 'Descripción demasiado larga (máx 500)' });
    }

    const fileName = `ia-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
    const outputPath = path.join(relatoUploadDirImg, fileName);
    const scriptPath = path.join(__dirname, 'scripts', 'generate_image.py');
    const { findPython: findPy } = require('./utils/pythonHelper');
    const { spawn: spawnPy } = require('child_process');
    const pyExec = process.env.PYTHON_BIN || findPy();
    const py = spawnPy(pyExec, [scriptPath, outputPath, String(prompt).trim(), estilo || 'pergamino'], { env: process.env });

    let stderr = '';
    py.stderr.on('data', d => { stderr += d.toString(); });

    // Timeout 60s
    const timeout = setTimeout(() => { try { py.kill('SIGKILL'); } catch (_) {} }, 60000);

    py.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        console.error('[generate_image] stderr:', stderr);
        // Detectar errores específicos para dar mensaje claro al usuario
        if (stderr.includes('Budget has been exceeded') || stderr.includes('budget_exceeded')) {
          return res.status(402).json({
            error: 'Saldo agotado',
            detail: 'Tu clave de IA se quedó sin saldo. Ve a tu Perfil → Universal Key → Añadir balance para seguir generando imágenes.'
          });
        }
        if (stderr.includes('Invalid API key') || stderr.includes('Unauthorized')) {
          return res.status(401).json({
            error: 'Clave de IA inválida',
            detail: 'La clave EMERGENT_LLM_KEY parece inválida o expiró.'
          });
        }
        if (stderr.includes('Rate limit')) {
          return res.status(429).json({
            error: 'Demasiadas peticiones',
            detail: 'Intenta de nuevo en unos segundos.'
          });
        }
        return res.status(500).json({ error: 'No se pudo generar la imagen', detail: stderr.slice(0, 200) });
      }
      if (!fs.existsSync(outputPath)) {
        return res.status(500).json({ error: 'Imagen no creada' });
      }
      res.json({ image_path: `/api/uploads/relatos/${fileName}` });
    });
  } catch (err) {
    console.error('[ia/imagen] error:', err);
    res.status(500).json({ error: 'Error generando imagen' });
  }
});

// ============================================
// AUDIO NARRACIÓN (TTS) — usa Emergent LLM key
// ============================================
const { spawn } = require('child_process');
const { findPython } = require('./utils/pythonHelper');

app.post('/api/relatos/:id/narrar', auth, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const { voz = 'onyx', regenerar = false } = req.body || {};
    const allowedVoices = new Set(['onyx', 'echo', 'fable', 'sage', 'shimmer', 'nova', 'alloy']);
    const finalVoice = allowedVoices.has(voz) ? voz : 'onyx';

    const relato = await Publicacion.findById(req.params.id);
    if (!relato) return res.status(404).json({ error: 'Relato no encontrado' });

    if (relato.audio_path && !regenerar && relato.audio_voz === finalVoice) {
      return res.json({ audio_path: relato.audio_path, voz: relato.audio_voz, cached: true });
    }

    const cleanContenido = String(relato.contenido || '')
      .replace(/#[\p{L}\p{N}_]+/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    const texto = `${relato.titulo}. ${cleanContenido}`;
    if (texto.length < 10) return res.status(400).json({ error: 'Texto demasiado corto' });

    const filename = `${relato._id}-${finalVoice}-${Date.now()}.mp3`;
    const outputPath = path.join(__dirname, 'uploads', 'audio', filename);
    // Auto-detecta python con los módulos correctos (preview venv o sistema)
    const pyExec = process.env.PYTHON_BIN || findPython();
    const script = path.join(__dirname, 'scripts', 'generate_tts.py');
    const child = spawn(pyExec, [script, outputPath, finalVoice], { env: process.env });

    child.stdin.write(texto, 'utf8');
    child.stdin.end();

    let stderrBuf = '';
    child.stderr.on('data', (d) => { stderrBuf += d.toString(); });

    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    if (exitCode !== 0) {
      console.error('TTS error:', stderrBuf);
      return res.status(500).json({ error: 'Error al generar narración' });
    }
    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({ error: 'Archivo de audio no generado' });
    }

    if (relato.audio_path) {
      const old = path.join(__dirname, relato.audio_path.replace('/api/', ''));
      if (fs.existsSync(old)) { try { fs.unlinkSync(old); } catch (_) {} }
    }

    const audioUrl = `/api/uploads/audio/${filename}`;
    relato.audio_path = audioUrl;
    relato.audio_voz = finalVoice;
    await relato.save();

    res.json({ audio_path: audioUrl, voz: finalVoice, cached: false });
  } catch (err) {
    console.error('Error narrar:', err);
    res.status(500).json({ error: 'Error al narrar' });
  }
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Chronos corriendo en puerto ${PORT}`);
  console.log(`📚 Base de datos: ${process.env.MONGO_URL}`);
  // Calentar python helper en background (no bloquea startup)
  setTimeout(() => {
    try { findPython(); } catch (e) { console.warn('[python] warm-up failed:', e.message); }
  }, 1000);
});
