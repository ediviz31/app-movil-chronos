/**
 * Utilidades para manejar URLs de imágenes y avatares
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * Convierte una ruta relativa de imagen en URL completa
 */
export const getImageUrl = (path) => {
  if (!path) return null;
  // Si ya es una URL completa (http://, https://, data:), devolverla tal cual
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  // Si empieza con /uploads/ o /api/uploads/, anteponer backend URL
  if (path.startsWith('/uploads/')) {
    return `${BACKEND_URL}/api${path}`;
  }
  if (path.startsWith('/api/uploads/')) {
    return `${BACKEND_URL}${path}`;
  }
  return path;
};

/**
 * Obtiene el avatar de un usuario o genera uno con sus iniciales
 */
export const getAvatarUrl = (usuario) => {
  if (usuario?.avatar && (usuario.avatar.startsWith('/uploads') || usuario.avatar.startsWith('/api/uploads'))) {
    return getImageUrl(usuario.avatar);
  }
  if (usuario?.avatar && usuario.avatar.startsWith('http')) {
    return usuario.avatar;
  }
  // Generar avatar con iniciales usando dicebear
  const nombre = usuario?.nombre || 'U';
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nombre)}&backgroundColor=C6A75E&textColor=0D0F12`;
};
