import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getAvatarUrl } from '../utils/imageHelpers';
import {
  CoinLaurelIcon, FleurDivider, ArrowRightIcon, FeatherIcon
} from './HistoricIcons';

/**
 * Tarjeta "Resonancia de la semana" para el Feed.
 *
 * Reutiliza GET /api/explorar y muestra:
 *  - El relato más resonante de los últimos 7 días (titulo, autor, score)
 *  - Un cronista destacado a seguir
 *  - 3 hashtags populares como chips
 *
 * Diseño: estilo "boletín del archivo" — sello dorado + divisor flor de lis.
 * No usa colores nuevos: aprovecha la paleta histórica existente.
 */
const WeeklyHighlight = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/explorar');
        if (cancelled) return;
        setData(res.data);
      } catch (err) {
        // Silencioso: si falla, simplemente no mostramos la tarjeta
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return null;

  const topRelato = data?.trending?.[0];
  const topCronista = data?.cronistas?.[0];
  const topTags = (data?.tags_populares || []).slice(0, 3);

  // Si no hay nada que mostrar, ocultamos la tarjeta
  if (!topRelato && !topCronista && topTags.length === 0) return null;

  return (
    <section className="weekly-highlight" data-testid="weekly-highlight">
      <div className="weekly-highlight-seal" aria-hidden>
        <CoinLaurelIcon size={26} />
      </div>

      <div className="weekly-highlight-head">
        <span className="weekly-highlight-kicker">
          Boletín del archivo · últimos 7 días
        </span>
        <h2 className="weekly-highlight-title">Resonancia de la semana</h2>
      </div>

      <FleurDivider className="weekly-highlight-divider" />

      <div className="weekly-highlight-body">
        {/* RELATO DESTACADO */}
        {topRelato && (
          <button
            className="weekly-highlight-relato"
            onClick={() => navigate(`/relato/${topRelato._id}`)}
            data-testid="weekly-top-relato"
          >
            <div className="weekly-highlight-relato-meta">
              <FeatherIcon size={12} />
              <span>Crónica más resonante</span>
            </div>
            <h3 className="weekly-highlight-relato-title">{topRelato.titulo}</h3>
            <div className="weekly-highlight-relato-foot">
              <img
                className="weekly-highlight-author-avatar"
                src={getAvatarUrl(topRelato.usuario_id)}
                alt=""
              />
              <span className="weekly-highlight-author-name">
                {topRelato.usuario_id?.nombre || 'Cronista'}
              </span>
              <span className="weekly-highlight-dot">·</span>
              <span className="weekly-highlight-score">
                {topRelato.score} eco{topRelato.score !== 1 ? 's' : ''} y más
              </span>
              <ArrowRightIcon size={12} className="weekly-highlight-arrow" />
            </div>
          </button>
        )}

        {/* CRONISTA + TAGS */}
        <div className="weekly-highlight-side">
          {topCronista && (
            <button
              className="weekly-highlight-cronista"
              onClick={() => navigate(`/perfil/${topCronista._id}`)}
              data-testid="weekly-top-cronista"
            >
              <img
                className="weekly-highlight-cronista-avatar"
                src={getAvatarUrl(topCronista)}
                alt={topCronista.nombre}
              />
              <div className="weekly-highlight-cronista-info">
                <span className="weekly-highlight-side-kicker">Cronista a seguir</span>
                <strong className="weekly-highlight-cronista-name">{topCronista.nombre}</strong>
                <span className="weekly-highlight-cronista-meta">
                  {topCronista.total_relatos} crónica{topCronista.total_relatos !== 1 ? 's' : ''}
                </span>
              </div>
            </button>
          )}

          {topTags.length > 0 && (
            <div className="weekly-highlight-tags" data-testid="weekly-top-tags">
              <span className="weekly-highlight-side-kicker">Hashtags del momento</span>
              <div className="weekly-highlight-tags-row">
                {topTags.map(t => (
                  <button
                    key={t.tag}
                    className="weekly-highlight-tag-chip"
                    onClick={() => navigate(`/tags/${encodeURIComponent(t.tag)}`)}
                    data-testid={`weekly-tag-${t.tag}`}
                  >
                    #{t.tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        className="weekly-highlight-cta"
        onClick={() => navigate('/explorar')}
        data-testid="weekly-cta-explorar"
      >
        Visitar el archivo de la semana <ArrowRightIcon size={12} />
      </button>
    </section>
  );
};

export default WeeklyHighlight;
