import { useEffect } from 'react';
import api from '../services/api';

/**
 * Heartbeat de presencia.
 * Mientras la app está abierta y la pestaña visible, envía un POST cada 60s
 * a /api/presencia/heartbeat para marcar al usuario como "activo ahora".
 *
 * Se monta globalmente desde App.js (sólo si está autenticado).
 */
const HEARTBEAT_MS = 60 * 1000;

const PresenceHeartbeat = () => {
  useEffect(() => {
    let timer = null;

    const send = () => {
      // Sólo si la pestaña está visible (ahorra recursos del servidor)
      if (document.visibilityState !== 'visible') return;
      api.post('/presencia/heartbeat').catch(() => { /* silencioso */ });
    };

    // Primer beat inmediato
    send();
    timer = setInterval(send, HEARTBEAT_MS);

    // Beat al volver al foreground
    const onVisible = () => { if (document.visibilityState === 'visible') send(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
};

export default PresenceHeartbeat;
