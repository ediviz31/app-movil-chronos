/**
 * Hook reutilizable para consultar si un lugar histórico tiene visita virtual 360°.
 * Devuelve { visita, loading, disponible } y cachea la consulta en memoria.
 */
import { useEffect, useState } from 'react';
import api from '../services/api';

// Cache simple en memoria para evitar llamadas repetidas durante la misma sesión.
const cache = new Map();

const buildKey = ({ lugar, lat, lng }) => {
  const a = lugar ? lugar.trim().toLowerCase() : '';
  const b = lat !== null && lat !== undefined ? Number(lat).toFixed(3) : '';
  const c = lng !== null && lng !== undefined ? Number(lng).toFixed(3) : '';
  return `${a}|${b}|${c}`;
};

export default function useVisitaVirtual({ lugar, lat, lng } = {}) {
  const [state, setState] = useState({ loading: false, disponible: false, visita: null });

  useEffect(() => {
    const hasLugar = !!(lugar && lugar.trim());
    const hasCoords = lat !== null && lat !== undefined && lng !== null && lng !== undefined;
    if (!hasLugar && !hasCoords) {
      setState({ loading: false, disponible: false, visita: null });
      return;
    }

    const key = buildKey({ lugar, lat, lng });
    if (cache.has(key)) {
      setState({ loading: false, ...cache.get(key) });
      return;
    }

    let mounted = true;
    setState(s => ({ ...s, loading: true }));

    const params = new URLSearchParams();
    if (hasLugar) params.set('lugar', lugar);
    if (hasCoords) { params.set('lat', String(lat)); params.set('lng', String(lng)); }

    api.get(`/visitas/sugerir?${params.toString()}`)
      .then(res => {
        const result = {
          disponible: !!res.data?.disponible,
          visita: res.data?.visita || null
        };
        cache.set(key, result);
        if (mounted) setState({ loading: false, ...result });
      })
      .catch(() => {
        if (mounted) setState({ loading: false, disponible: false, visita: null });
      });

    return () => { mounted = false; };
  }, [lugar, lat, lng]);

  return state;
}
