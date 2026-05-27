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

// Interceptor para manejar errores de autenticación.
// Política: solo redirigir a /login cuando una acción ACTIVA del usuario
// (POST/PUT/DELETE o GET de páginas que requieren auth) recibe 401.
// El check pasivo /auth/me al cargar la app NUNCA debe redirigir — es
// esperado que un anónimo en una ruta pública reciba 401 y simplemente
// continúe como visitante.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
      const failedUrl = error.config?.url || '';
      const isAuthMeCheck = failedUrl.includes('/auth/me');
      const currentPath = window.location.pathname;
      // Páginas que pueden mostrarse a anónimos: no forzar redirect
      const isPublicPath =
        currentPath === '/login' ||
        currentPath === '/registro' ||
        currentPath.startsWith('/relato/');
      if (!isAuthMeCheck && !isPublicPath) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { HTTP_STATUS };