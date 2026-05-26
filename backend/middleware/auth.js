const jwt = require('jsonwebtoken');
const User = require('../models/User');

// HTTP Status Constants
const HTTP_STATUS = {
  UNAUTHORIZED: 401
};

const auth = async (req, res, next) => {
  try {
    // Buscar token en cookies primero, luego en header Authorization
    let token = req.cookies.chronos_token;
    
    if (!token) {
      const authHeader = req.header('Authorization');
      if (authHeader) {
        token = authHeader.replace('Bearer ', '');
      }
    }
    
    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Por favor autentícate' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Usuario no encontrado' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Por favor autentícate' });
  }
};

module.exports = auth;