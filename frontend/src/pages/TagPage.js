import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageShell from '../components/PageShell';
import SocialPost from '../components/SocialPost';
import { useAuth } from '../context/AuthContext';
import { FeatherIcon, HourglassIcon, ArrowRightIcon, OrnateStarIcon } from '../components/HistoricIcons';

const TagPage = () => {
  const { tag } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState({ tag: '', total: 0, relatos: [] });
  const [loading, setLoading] = useState(true);
  const currentUserId = user?._id || user?.id;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/tags/${encodeURIComponent(tag)}/relatos`);
        setData(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [tag]);

  return (
    <PageShell activeRail="">
      <main className="archive-listing-page" data-testid="tag-page">
        <header className="listing-header">
          <div className="listing-header-text">
            <button className="epoca-hero-back" onClick={() => navigate(-1)} style={{ marginBottom: 14 }}>
              <ArrowRightIcon size={12} style={{ transform: 'rotate(180deg)' }} /> Volver
            </button>
            <div className="listing-kicker">
              <FeatherIcon size={14} /> Hashtag del archivo
            </div>
            <h1 className="listing-title" data-testid="tag-title">#{decodeURIComponent(tag)}</h1>
            <p className="listing-subtitle">
              Todas las crónicas marcadas con este hashtag.
              <strong style={{ color: 'var(--gold-bright)', marginLeft: 6 }}>
                {data.total} relato{data.total !== 1 ? 's' : ''}
              </strong>
            </p>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
              <HourglassIcon size={36} />
            </div>
          </div>
        ) : data.relatos.length === 0 ? (
          <div className="listing-empty">
            <OrnateStarIcon size={42} style={{ color: 'var(--gold)' }} />
            <h3>Sin crónicas para este hashtag</h3>
            <p>Aún nadie ha marcado relatos con #{decodeURIComponent(tag)}.</p>
          </div>
        ) : (
          <div data-testid="tag-relatos-list">
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

export default TagPage;
