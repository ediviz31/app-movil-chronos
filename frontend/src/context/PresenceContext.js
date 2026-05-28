import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

/**
 * PresenceContext: mantiene un Set de userIds activos ahora.
 *
 * - Acepta registrar IDs a observar vía `track(ids)` (se acumulan)
 * - Cada 30s consulta /api/presencia/consultar con los IDs acumulados
 * - Expone `isOnline(id)` para que cualquier componente lo use
 */
const PresenceCtx = createContext(null);

const POLL_MS = 30 * 1000;

export const PresenceProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [activos, setActivos] = useState(new Set());
  const trackedRef = useRef(new Set()); // IDs a observar
  const pollTimerRef = useRef(null);

  // Consulta el backend
  const consultar = useCallback(async () => {
    if (!isAuthenticated) return;
    const ids = Array.from(trackedRef.current);
    if (ids.length === 0) return;
    try {
      const res = await api.post('/presencia/consultar', { ids });
      const setNew = new Set(res.data?.activos?.map(a => String(a._id)) || []);
      setActivos(setNew);
    } catch (_) { /* silencioso */ }
  }, [isAuthenticated]);

  // Polling cada 30s mientras autenticado y hay IDs observados
  useEffect(() => {
    if (!isAuthenticated) {
      setActivos(new Set());
      return;
    }
    consultar();
    pollTimerRef.current = setInterval(consultar, POLL_MS);
    return () => clearInterval(pollTimerRef.current);
  }, [isAuthenticated, consultar]);

  // Registrar IDs a observar (acumulativo)
  const track = useCallback((ids) => {
    if (!ids || ids.length === 0) return;
    let dirty = false;
    ids.forEach(id => {
      const s = String(id);
      if (!trackedRef.current.has(s)) { trackedRef.current.add(s); dirty = true; }
    });
    if (dirty && isAuthenticated) {
      // Re-consultar inmediatamente al añadir IDs nuevos
      consultar();
    }
  }, [consultar, isAuthenticated]);

  const isOnline = useCallback((id) => activos.has(String(id)), [activos]);

  return (
    <PresenceCtx.Provider value={{ track, isOnline }}>
      {children}
    </PresenceCtx.Provider>
  );
};

export const usePresence = () => {
  const ctx = useContext(PresenceCtx);
  // Fallback no-op por si se renderiza fuera del provider (e.g., vista pública)
  if (!ctx) return { track: () => {}, isOnline: () => false };
  return ctx;
};
