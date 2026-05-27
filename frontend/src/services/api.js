import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

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

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Importante para enviar cookies
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
      // No redirigir si estamos en una ruta pública (login/registro/relato público)
      // ni si el endpoint que falló es /auth/me (verificación pasiva al cargar)
      const currentPath = window.location.pathname;
      const isPublicPath =
        currentPath === '/login' ||
        currentPath === '/registro' ||
        currentPath.startsWith('/relato/');
      const failedUrl = error.config?.url || '';
      const isAuthMeCheck = failedUrl.includes('/auth/me');
      if (!isPublicPath && !isAuthMeCheck) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { HTTP_STATUS };