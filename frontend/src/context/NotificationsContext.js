/**
 * NotificationsContext — polling global de misivas + avisos no leídos.
 *
 * Funciona desde CUALQUIER página de la app (no solo cuando MisivasPage está abierta).
 * Al detectar un INCREMENTO en el contador respecto al ciclo anterior:
 *   - Reproduce sonido de cuerno/lira (chronosSound.js)
 *   - Vibra con patrón notify [80, 60, 120, 60, 80]
 *   - Lanza un toast clickeable que navega al sitio correspondiente
 *
 * El primer ciclo (después del login) NO dispara notificación: usa el conteo
 * inicial como baseline para no spamear con mensajes "ya leídos virtualmente".
 */
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { playChronosAlert, primeAudio } from '../utils/chronosSound';
import haptic from '../utils/haptic';

const POLL_MS = 20000;

const NotificationsContext = createContext({
  misivasCount: 0,
  avisosCount: 0,
  refresh: () => {}
});

export const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [misivasCount, setMisivasCount] = useState(0);
  const [avisosCount, setAvisosCount] = useState(0);

  // Baselines (primer fetch tras login): no disparar notificación
  const prevMisivasRef = useRef(null);
  const prevAvisosRef = useRef(null);
  const initializedRef = useRef(false);

  // Cola para mostrar toast simple sin librerías externas.
  // Usamos un <div> portal-render aparte ya gestionado por GlobalToaster.
  const enqueueToast = useCallback((payload) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('chronos:toast', { detail: payload }));
  }, []);

  // Desbloquea audio en cualquier interacción
  useEffect(() => {
    const unlock = () => {
      primeAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    try {
      const [misivasRes, avisosRes] = await Promise.all([
        api.get('/misivas/no-leidas').catch(() => ({ data: { total: 0 } })),
        api.get('/avisos/no-leidos/count').catch(() => ({ data: { total: 0 } }))
      ]);
      const m = misivasRes.data?.total || 0;
      const a = avisosRes.data?.total || 0;

      // Detectar incremento (solo después del baseline)
      if (initializedRef.current) {
        const inMisivasPath = /^\/misivas/.test(location.pathname);
        const inAvisosPath = /^\/avisos/.test(location.pathname);

        if (m > prevMisivasRef.current && !inMisivasPath) {
          // Sonido cuerno (recio) + vibración fuerte — solo para misivas.
          // (Avisos los maneja AvisosBadge.js)
          playChronosAlert('cuerno').catch(() => {});
          haptic.notify();
          enqueueToast({
            type: 'misiva',
            title: 'Nueva misiva',
            description: m === 1 ? 'Tienes 1 nueva misiva sin leer' : `Tienes ${m} misivas sin leer`,
            href: '/misivas'
          });
        }
        if (a > prevAvisosRef.current && !inAvisosPath) {
          // Solo toast visual (sonido lo maneja AvisosBadge para no duplicar)
          enqueueToast({
            type: 'aviso',
            title: 'Nuevo aviso del archivo',
            description: a === 1 ? 'Un nuevo aviso te aguarda' : `${a} nuevos avisos te aguardan`,
            href: '/avisos'
          });
        }
      } else {
        initializedRef.current = true;
      }

      prevMisivasRef.current = m;
      prevAvisosRef.current = a;
      setMisivasCount(m);
      setAvisosCount(a);
    } catch (_) { /* silencio */ }
  }, [user, location.pathname, enqueueToast]);

  useEffect(() => {
    if (!user) {
      // Reset al desloguear
      initializedRef.current = false;
      prevMisivasRef.current = null;
      prevAvisosRef.current = null;
      setMisivasCount(0);
      setAvisosCount(0);
      return;
    }
    fetchCounts();
    const id = setInterval(fetchCounts, POLL_MS);
    // Refrescar cuando la tab vuelve al foreground
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchCounts();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, fetchCounts]);

  const refresh = useCallback(() => fetchCounts(), [fetchCounts]);

  return (
    <NotificationsContext.Provider value={{ misivasCount, avisosCount, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);

export default NotificationsContext;
