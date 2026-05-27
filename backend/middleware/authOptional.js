const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware de autenticación OPCIONAL.
 * Si hay token válido → adjunta req.user / req.userId
 * Si NO hay token o es inválido → continúa sin user (no devuelve 401)
 *
 * Útil para endpoints públicos que muestran extras al usuario autenticado
 * (ej: estado de eco/archivado en relato público).
 */
const authOptional = async (req, res, next) => {
  try {
    let token = req.cookies?.chronos_token;
    if (!token) {
      const authHeader = req.header('Authorization');
      if (authHeader) token = authHeader.replace('Bearer ', '');
    }
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (user) {
      req.user = user;
      req.userId = user._id.toString();
    }
  } catch (_) {
    // Token inválido/expirado: continuar como anónimo
  }
  next();
};

module.exports = authOptional;
