import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageShell from '../components/PageShell';
import SocialPost from '../components/SocialPost';
import { useAuth } from '../context/AuthContext';
import { ChronicleIcon, HourglassIcon, OrnateStarIcon, FeatherIcon } from '../components/HistoricIcons';

const CronicasPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [relatos, setRelatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('recientes'); // recientes | populares

  const currentUserId = user?._id || user?.id;

  const fetchRelatos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/relatos?vista=todos&limit=50');
      let list = res.data;
      if (filter === 'populares') {
        list = [...list].sort((a, b) =>
          (b.total_ecos + b.total_comentarios) - (a.total_ecos + a.total_comentarios)
        );
      }
      setRelatos(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchRelatos(); }, [fetchRelatos]);

  return (
    <PageShell activeRail="cronicas">
      <main className="archive-listing-page" data-testid="cronicas-page">
        <header className="listing-header">
          <div className="listing-header-text">
            <div className="listing-kicker">
              <ChronicleIcon size={14} /> Archivo de Crónicas
            </div>
            <h1 className="listing-title">Todas las crónicas</h1>
            <p className="listing-subtitle">
              Cada relato es un fragmento del tiempo preservado. Explora el archivo completo
              de historias compartidas por los cronistas de Chronos.
            </p>
          </div>
          <span className="listing-stat-pill" data-testid="cronicas-count">
            <FeatherIcon size={12} /> {relatos.length} relatos
          </span>
        </header>

        {/* Filtros */}
        <div className="archive-tabs" style={{ marginBottom: 24 }} data-testid="cronicas-filters">
          <button
            className={`archive-tab ${filter === 'recientes' ? 'active' : ''}`}
            onClick={() => setFilter('recientes')}
            data-testid="filter-recientes"
          >Más recientes</button>
          <button
            className={`archive-tab ${filter === 'populares' ? 'active' : ''}`}
            onClick={() => setFilter('populares')}
            data-testid="filter-populares"
          >Más resonantes</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
              <HourglassIcon size={36} />
            </div>
            <p style={{ marginTop: 14, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--text-muted)' }}>
              Recopilando crónicas...
            </p>
          </div>
        ) : relatos.length === 0 ? (
          <div className="listing-empty">
            <OrnateStarIcon size={42} style={{ color: 'var(--gold)' }} />
            <h3>El archivo aún está vacío</h3>
            <p>Sé el primero en compartir una crónica del pasado.</p>
          </div>
        ) : (
          <div data-testid="cronicas-list">
            {relatos.map(r => (
              <SocialPost
                key={r._id}
                relato={r}
                currentUserId={currentUserId}
                onDelete={(id) => setRelatos(rs => rs.filter(x => x._id !== id))}
              />
            ))}
          </div>
        )}
      </main>
    </PageShell>
  );
};

export default CronicasPage;
