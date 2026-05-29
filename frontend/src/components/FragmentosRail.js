/**
 * FragmentosRail — Mini-carrusel horizontal en el feed principal.
 * Muestra los Fragmentos más recientes como "tiles" verticales tipo reel,
 * con un tile inicial para crear uno nuevo. Click → /fragmentos.
 *
 * Estética alineada con la marca "metraje recuperado":
 * los videos en miniatura mantienen el grano cinematográfico.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getImageUrl } from '../utils/imageHelpers';
import haptic from '../utils/haptic';

const FragmentosRail = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get('/fragmentos?limit=8');
      setItems(res.data?.items || []);
    } catch (_) {
      // Silencioso: si falla, el rail simplemente no se muestra
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Mientras carga, ocupamos altura mínima para no saltar el layout
  if (loading) {
    return (
      <div className="fragmentos-rail-wrap" data-testid="fragmentos-rail-skeleton" aria-hidden="true">
        <div className="fragmentos-rail-head">
          <h2 className="fragmentos-rail-title">
            <small>Bóveda</small>
            Fragmentos del tiempo
          </h2>
        </div>
        <div className="fragmentos-rail">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="fragmento-tile" style={{ opacity: 0.35 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) return null; // No mostrar si no hay fragmentos

  return (
    <section className="fragmentos-rail-wrap" data-testid="fragmentos-rail">
      <div className="fragmentos-rail-head">
        <h2 className="fragmentos-rail-title">
          <small>Bóveda</small>
          Fragmentos del tiempo
        </h2>
        <button
          type="button"
          className="fragmentos-rail-more"
          onClick={() => { haptic.light(); navigate('/fragmentos'); }}
          data-testid="fragmentos-rail-ver-todos"
        >
          Ver todos
        </button>
      </div>

      <div className="fragmentos-rail">
        <div
          className="fragmento-tile fragmento-tile-create"
          onClick={() => { haptic.light(); navigate('/fragmentos?nuevo=1'); }}
          data-testid="fragmentos-rail-crear"
          role="button"
          tabIndex={0}
        >
          <div className="fragmento-tile-create-ico">+</div>
          <div className="fragmento-tile-create-label">Crear<br/>fragmento</div>
        </div>

        {items.map(f => (
          <FragmentoTile key={f._id} fragmento={f} onClick={() => { haptic.light(); navigate(`/fragmentos?focus=${f._id}`); }} />
        ))}
      </div>
    </section>
  );
};

/** Tile individual con preview de video (sin sonido, sin autoplay constante) */
const FragmentoTile = ({ fragmento, onClick }) => {
  const videoRef = useRef(null);
  const [hover, setHover] = useState(false);

  // Hover en desktop → play; touch en móvil → click navega
  const handleEnter = () => {
    setHover(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };
  const handleLeave = () => {
    setHover(false);
    if (videoRef.current) videoRef.current.pause();
  };

  return (
    <div
      className="fragmento-tile"
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      data-testid={`fragmento-tile-${fragmento._id}`}
      role="button"
      tabIndex={0}
    >
      {fragmento.miniatura ? (
        <img src={getImageUrl(fragmento.miniatura)} alt={fragmento.titulo} loading="lazy" />
      ) : (
        <video
          ref={videoRef}
          src={getImageUrl(fragmento.video)}
          muted
          playsInline
          loop
          preload="metadata"
        />
      )}
      <div className="fragmento-tile-play" aria-hidden="true">▶</div>
      <div className="fragmento-tile-overlay">
        <p className="fragmento-tile-title">{fragmento.titulo}</p>
        <div className="fragmento-tile-meta">
          {fragmento.anio !== null && fragmento.anio !== undefined && (
            <span>{fragmento.anio}</span>
          )}
          {fragmento.lugar && fragmento.anio ? <span> · </span> : null}
          {fragmento.lugar && <span>{fragmento.lugar}</span>}
        </div>
      </div>
    </div>
  );
};

export default FragmentosRail;
