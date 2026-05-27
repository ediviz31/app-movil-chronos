import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageShell from '../components/PageShell';
import SocialPost from '../components/SocialPost';
import { useAuth } from '../context/AuthContext';
import { TempleIcon, HourglassIcon, ArrowRightIcon } from '../components/HistoricIcons';

const EpocaDetailPage = () => {
  const { nombre } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState({ categoria: '', total: 0, relatos: [] });
  const [loading, setLoading] = useState(true);
  const currentUserId = user?._id || user?.id;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/epocas/${encodeURIComponent(nombre)}/relatos`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [nombre]);

  return (
    <PageShell activeRail="epocas">
      <main className="epoca-page" data-testid="epoca-detail-page">
        <section className="epoca-hero">
          <div className="epoca-hero-content">
            <button className="epoca-hero-back" onClick={() => navigate('/epocas')} data-testid="epoca-back">
              <ArrowRightIcon size={12} style={{ transform: 'rotate(180deg)' }} /> Todas las épocas
            </button>
            <div className="listing-kicker">
              <TempleIcon size={14} /> Sala del tiempo
            </div>
            <h1 className="listing-title" data-testid="epoca-title">{decodeURIComponent(nombre)}</h1>
            <p className="listing-subtitle">
              Crónicas preservadas en esta sala del archivo.
              <strong style={{ color: 'var(--gold-bright)', marginLeft: 6 }}>
                {data.total} relato{data.total !== 1 ? 's' : ''}
              </strong>
            </p>
          </div>
        </section>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
              <HourglassIcon size={36} />
            </div>
          </div>
        ) : data.relatos.length === 0 ? (
          <div className="listing-empty">
            <TempleIcon size={42} style={{ color: 'var(--gold)' }} />
            <h3>Esta sala aún está silenciosa</h3>
            <p>Ningún cronista ha publicado relatos en esta época todavía.</p>
          </div>
        ) : (
          <div data-testid="epoca-relatos-list">
            {data.relatos.map(r => (
              <SocialPost
                key={r._id}
                relato={r}
                currentUserId={currentUserId}
                onDelete={(id) => setData(d => ({ ...d, relatos: d.relatos.filter(x => x._id !== id), total: d.total - 1 }))}
              />
            ))}
          </div>
        )}
      </main>
    </PageShell>
  );
};

export default EpocaDetailPage;
