/**
 * Sección "Cronistas activos ahora" — sidebar derecho.
 * Polling cada 45s al endpoint /api/presencia/activos.
 * Solo se renderiza si hay 1+ cronista activo (excluyendo al solicitante).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getAvatarUrl } from '../utils/imageHelpers';
import { FlameIcon, ArrowRightIcon } from './HistoricIcons';

const POLL_MS = 45 * 1000;

const ActivosAhora = () => {
  const navigate = useNavigate();
  const [activos, setActivos] = useState([]);
  const [total, setTotal] = useState(0);

  const fetchActivos = useCallback(async () => {
    try {
      const res = await api.get('/presencia/activos');
      setActivos(res.data?.activos || []);
      setTotal(res.data?.total || 0);
    } catch (_) { /* silencio */ }
  }, []);

  useEffect(() => {
    fetchActivos();
    const id = setInterval(fetchActivos, POLL_MS);
    return () => clearInterval(id);
  }, [fetchActivos]);

  if (activos.length === 0) return null;

  return (
    <section className="sidebar-section activos-ahora-section" data-testid="activos-ahora-section">
      <div className="sidebar-section-head">
        <div className="sidebar-section-title">
          <span className="activos-ahora-pulse" aria-hidden="true">
            <span className="activos-ahora-pulse-dot" />
          </span>
          Cronistas activos ahora
        </div>
        <span className="activos-ahora-count" data-testid="activos-ahora-count">
          {total}
        </span>
      </div>

      <div className="activos-ahora-grid">
        {activos.slice(0, 6).map(u => (
          <button
            key={u._id}
            type="button"
            className="activos-ahora-card"
            onClick={() => navigate(`/perfil/${u._id}`)}
            data-testid={`activo-${u._id}`}
            title={`Ver perfil de ${u.nombre}`}
          >
            <span className="activos-ahora-avatar">
              <img src={getAvatarUrl(u)} alt={u.nombre} />
              <span className="activos-ahora-dot" />
            </span>
            <span className="activos-ahora-name">{u.nombre?.split(' ')[0] || 'Cronista'}</span>
          </button>
        ))}
      </div>

      {total > 6 && (
        <p style={{
          fontFamily: 'var(--font-elegant)',
          fontSize: 11,
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
          marginTop: 10,
          textAlign: 'center',
          textTransform: 'uppercase'
        }}>
          + {total - 6} más en la sala
        </p>
      )}
    </section>
  );
};

export default ActivosAhora;
