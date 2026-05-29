/**
 * Middleware requireAdmin — sólo permite continuar si el usuario
 * autenticado tiene rol === 'admin'.
 * Asume que el middleware `auth` ya validó la cookie/JWT y dejó req.userId.
 */
const User = require('../models/User');

module.exports = async function requireAdmin(req, res, next) {
  try {
    if (!req.userId) return res.status(401).json({ error: 'No autenticado' });
    const user = await User.findById(req.userId).select('rol');
    if (!user || user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso restringido al maestro del archivo' });
    }
    next();
  } catch (err) {
    console.error('[requireAdmin] error:', err.message);
    res.status(500).json({ error: 'Error de autorización' });
  }
};
