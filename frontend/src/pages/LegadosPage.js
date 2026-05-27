import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageShell from '../components/PageShell';
import { getAvatarUrl } from '../utils/imageHelpers';
import {
  CommunitiesIcon, HourglassIcon, OrnateStarIcon
} from '../components/HistoricIcons';

const LegadosPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingState, setFollowingState] = useState({});

  useEffect(() => {
    (async () => {
      try {
        // Usamos /buscar?q=&limit=25 con un carácter vacío no devuelve nada
        // Llamamos al endpoint sugeridos con limit alto (devuelve hasta 5)
        // Mejor: usar buscar con un patrón abierto
        const res = await api.get('/buscar?q=a&limit=25');
        // Si pocos resultados, también traemos sugeridos
        let list = res.data.usuarios || [];
        if (list.length < 5) {
          const sug = await api.get('/usuarios/sugeridos');
          // Mezclar sin duplicados
          const ids = new Set(list.map(u => u._id));
          for (const s of sug.data) if (!ids.has(s._id)) list.push(s);
        }
        setUsers(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleFollow = async (id, e) => {
    e.stopPropagation();
    setFollowingState(prev => ({ ...prev, [id]: 'loading' }));
    try {
      const res = await api.post(`/seguir/${id}`);
      setFollowingState(prev => ({ ...prev, [id]: res.data.accion === 'seguir' ? 'siguiendo' : 'no' }));
    } catch (err) {
      console.error(err);
      setFollowingState(prev => ({ ...prev, [id]: 'no' }));
    }
  };

  return (
    <PageShell activeRail="legados">
      <main className="archive-listing-page" data-testid="legados-page">
        <header className="listing-header">
          <div className="listing-header-text">
            <div className="listing-kicker">
              <CommunitiesIcon size={14} /> Legados
            </div>
            <h1 className="listing-title">Cronistas del archivo</h1>
            <p className="listing-subtitle">
              Cada usuario es un legado vivo. Descubre a quienes preservan la memoria
              colectiva y sigue a los cronistas cuyas voces resuenan contigo.
            </p>
          </div>
          <span className="listing-stat-pill" data-testid="legados-count">
            {users.length} cronistas
          </span>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
              <HourglassIcon size={36} />
            </div>
            <p style={{ marginTop: 14, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--text-muted)' }}>
              Convocando cronistas...
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="listing-empty">
            <OrnateStarIcon size={42} style={{ color: 'var(--gold)' }} />
            <h3>No hay cronistas aún</h3>
            <p>El archivo es joven. Comparte Chronos para llenar este salón de voces.</p>
          </div>
        ) : (
          <div className="listing-grid" data-testid="legados-list">
            {users.map(u => {
              const state = followingState[u._id];
              return (
                <div
                  key={u._id}
                  className="user-card"
                  onClick={() => navigate(`/perfil/${u._id}`)}
                  data-testid={`user-card-${u._id}`}
                >
                  <div className="user-card-avatar">
                    <img src={getAvatarUrl(u)} alt={u.nombre} />
                  </div>
                  <div className="user-card-info">
                    <div className="user-card-name">{u.nombre}</div>
                    <div className="user-card-handle">@{u.usuario}</div>
                    {u.bio && <div className="user-card-bio">{u.bio}</div>}
                    {u.tema_favorito && (
                      <span className="user-card-badge">{u.tema_favorito}</span>
                    )}
                    <div style={{ marginTop: 12 }}>
                      <button
                        className="profile-action-btn secondary"
                        style={{ fontSize: 10, padding: '6px 14px' }}
                        onClick={(e) => toggleFollow(u._id, e)}
                        disabled={state === 'loading'}
                        data-testid={`follow-btn-${u._id}`}
                      >
                        {state === 'loading' ? '...' : state === 'siguiendo' ? 'Siguiendo' : 'Seguir'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </PageShell>
  );
};

export default LegadosPage;
