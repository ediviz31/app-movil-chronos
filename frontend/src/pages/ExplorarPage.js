import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/imageHelpers';
import {
  TelescopeIcon, HourglassIcon, ArrowRightIcon, OrnateStarIcon,
  TempleIcon, CoinLaurelIcon, FeatherIcon, CommunitiesIcon
} from '../components/HistoricIcons';

const ExplorarPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState({ trending: [], tags_populares: [], cronistas: [], epocas: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/explorar');
        setData(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <PageShell activeRail="explorar">
      <main className="archive-listing-page explorar-page" data-testid="explorar-page">
        <header className="listing-header">
          <div className="listing-header-text">
            <div className="listing-kicker">
              <TelescopeIcon size={14} /> Explorar Chronos
            </div>
            <h1 className="listing-title">Descubre el archivo</h1>
            <p className="listing-subtitle">
              Lo que resuena esta semana, los cronistas más activos, las épocas
              con mayor actividad y los hashtags que circulan por el archivo.
            </p>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
              <HourglassIcon size={36} />
            </div>
          </div>
        ) : (
          <div className="explorar-grid">
            {/* TRENDING — relatos resonantes 7 días */}
            <section className="explore-section explore-trending" data-testid="explore-trending">
              <h2 className="explore-section-title">
                <CoinLaurelIcon size={16} /> Resonando esta semana
              </h2>
              {data.trending.length === 0 ? (
                <p className="explore-empty">Aún no hay relatos resonando. Sé el primero.</p>
              ) : (
                <div className="trending-list">
                  {data.trending.map((r, idx) => (
                    <button
                      key={r._id}
                      className="trending-row"
                      onClick={() => navigate(`/relato/${r._id}`)}
                      data-testid={`trending-${r._id}`}
                    >
                      <span className="trending-rank">{idx + 1}</span>
                      <div className="trending-info">
                        <div className="trending-title">{r.titulo}</div>
                        <div className="trending-meta">
                          <img className="trending-avatar" src={getAvatarUrl(r.usuario_id)} alt="" />
                          <span>{r.usuario_id?.nombre}</span>
                          <span className="trending-dot">·</span>
                          <span className="trending-score">{r.score} eco{r.score !== 1 ? 's' : ''} y más</span>
                        </div>
                      </div>
                      <ArrowRightIcon size={14} className="trending-arrow" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* CRONISTAS DESTACADOS */}
            <section className="explore-section" data-testid="explore-cronistas">
              <h2 className="explore-section-title">
                <CommunitiesIcon size={16} /> Cronistas para seguir
              </h2>
              {data.cronistas.length === 0 ? (
                <p className="explore-empty">Vuelve más tarde con nuevos cronistas.</p>
              ) : (
                <div className="explore-cronistas-list">
                  {data.cronistas.map(c => (
                    <button
                      key={c._id}
                      className="explore-cronista-row"
                      onClick={() => navigate(`/perfil/${c._id}`)}
                      data-testid={`cronista-${c._id}`}
                    >
                      <img className="explore-cronista-avatar" src={getAvatarUrl(c)} alt={c.nombre} />
                      <div className="explore-cronista-info">
                        <div className="explore-cronista-name">{c.nombre}</div>
                        <div className="explore-cronista-meta">
                          @{c.usuario} · {c.total_relatos} crónica{c.total_relatos !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* TAGS POPULARES */}
            <section className="explore-section explore-tags" data-testid="explore-tags">
              <h2 className="explore-section-title">
                <FeatherIcon size={16} /> Hashtags del archivo
              </h2>
              {data.tags_populares.length === 0 ? (
                <p className="explore-empty">Aún no hay hashtags. Usa #tema en tus crónicas.</p>
              ) : (
                <div className="tags-cloud">
                  {data.tags_populares.map(t => (
                    <button
                      key={t.tag}
                      className="tag-chip"
                      onClick={() => navigate(`/tags/${encodeURIComponent(t.tag)}`)}
                      data-testid={`tag-chip-${t.tag}`}
                    >
                      #{t.tag} <span className="tag-chip-count">{t.total}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* ÉPOCAS DESTACADAS */}
            <section className="explore-section" data-testid="explore-epocas">
              <h2 className="explore-section-title">
                <TempleIcon size={16} /> Épocas con más actividad
              </h2>
              {data.epocas.length === 0 ? (
                <p className="explore-empty">No hay épocas pobladas todavía.</p>
              ) : (
                <div className="explore-epocas-list">
                  {data.epocas.map(e => (
                    <button
                      key={e.categoria}
                      className="explore-epoca-row"
                      onClick={() => navigate(`/epocas/${encodeURIComponent(e.categoria)}`)}
                      data-testid={`epoca-${e.categoria}`}
                    >
                      <span className="explore-epoca-name">{e.categoria}</span>
                      <span className="explore-epoca-count">{e.total} relato{e.total !== 1 ? 's' : ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </PageShell>
  );
};

export default ExplorarPage;
