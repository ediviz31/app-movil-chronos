/**
 * FragmentoCard — Tarjeta visual de un Fragmento del Tiempo (reel histórico).
 * Diseño inspirado en el mockup del usuario: chips de categoría, video,
 * título serif, descripción, fuente, y barra de acciones lateral.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getImageUrl, getAvatarUrl } from '../utils/imageHelpers';
import haptic from '../utils/haptic';

const CATEGORIA_LABEL = {
  historia_local: 'Historia local',
  personajes: 'Personajes',
  lugares: 'Lugares',
  documentos: 'Documentos'
};

const FragmentoCard = ({ fragmento, onChanged, onDeleted, autoplay = true }) => {
  const navigate = useNavigate();
  const [data, setData] = useState(fragmento);
  const [playing, setPlaying] = useState(autoplay);
  const [muted, setMuted] = useState(true);
  const [pendingAval, setPendingAval] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);
  const viewedRef = useRef(false);

  useEffect(() => { setData(fragmento); }, [fragmento]);

  // IntersectionObserver: autoplay cuando entra al viewport
  useEffect(() => {
    if (!videoRef.current) return;
    const el = videoRef.current;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setPlaying(true);
          el.play().catch(() => {});
          // Marcar visualización (una vez)
          if (!viewedRef.current && data?._id) {
            viewedRef.current = true;
            api.post(`/fragmentos/${data._id}/vista`).catch(() => {});
          }
        } else {
          setPlaying(false);
          el.pause();
        }
      });
    }, { threshold: 0.55 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [data?._id]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    setMuted(m => !m);
    if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
  };

  const handleAvalar = async (e) => {
    e?.stopPropagation();
    if (pendingAval) return;
    setPendingAval(true);
    haptic.light();
    try {
      const res = await api.post(`/fragmentos/${data._id}/avalar`);
      setData(d => ({ ...d, usuario_avalo: res.data.usuario_avalo, total_avales: res.data.total_avales }));
      onChanged && onChanged({ ...data, ...res.data });
    } catch (e) { /* silent */ }
    finally { setPendingAval(false); }
  };

  const handleAportar = (e) => {
    e?.stopPropagation();
    navigate(`/perfil/${data.usuario_id?._id}`);
  };

  const handleDifundir = async (e) => {
    e?.stopPropagation();
    haptic.light();
    const shareUrl = `${window.location.origin}/fragmentos/${data._id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: data.titulo,
          text: data.titulo + (data.lugar ? ` · ${data.lugar}` : ''),
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Enlace copiado al portapapeles');
      }
    } catch (_) {}
  };

  const handleDelete = async (e) => {
    e?.stopPropagation();
    if (!window.confirm('¿Eliminar este Fragmento? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/fragmentos/${data._id}`);
      onDeleted && onDeleted(data._id);
    } catch (e) {
      alert('No se pudo eliminar');
    }
  };

  const author = data.usuario_id;
  const catLabel = CATEGORIA_LABEL[data.categoria] || data.categoria;

  return (
    <article className="fragmento-card" data-testid={`fragmento-${data._id}`}>
      {/* Chips superiores */}
      <div className="fragmento-chips">
        <span className="fragmento-chip">
          <span className="fragmento-chip-ico" aria-hidden="true">▣</span>
          {catLabel}
        </span>
        {data.lugar && (
          <span className="fragmento-chip">
            <span className="fragmento-chip-ico" aria-hidden="true">◉</span>
            {data.lugar}
          </span>
        )}
        {data.anio !== null && data.anio !== undefined && (
          <span className="fragmento-chip">
            <span className="fragmento-chip-ico" aria-hidden="true">⌛</span>
            {data.anio}
          </span>
        )}
      </div>

      {/* Stage: video */}
      <div className="fragmento-stage" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={getImageUrl(data.video)}
          poster={data.miniatura ? getImageUrl(data.miniatura) : undefined}
          className="fragmento-video"
          loop
          playsInline
          muted={muted}
          onError={() => setVideoError(true)}
          data-testid={`fragmento-video-${data._id}`}
        />
        {videoError && (
          <div className="fragmento-video-error" data-testid={`fragmento-video-error-${data._id}`}>
            <div className="fragmento-video-error-ico" aria-hidden="true">⌛</div>
            <p>Este video ya no está disponible.</p>
            <small>El archivo se perdió al reiniciar el servidor.</small>
          </div>
        )}
        {!playing && !videoError && (
          <button type="button" className="fragmento-play-btn" aria-label="Reproducir">
            <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="fragmento-mute-btn"
          onClick={toggleMute}
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          data-testid={`fragmento-mute-${data._id}`}
        >
          {muted ? '🔇' : '🔊'}
        </button>

        {/* Acciones laterales */}
        <div className="fragmento-actions">
          <button
            type="button"
            className={`fragmento-action ${data.usuario_avalo ? 'is-active' : ''}`}
            onClick={handleAvalar}
            disabled={pendingAval}
            data-testid={`fragmento-avalar-${data._id}`}
            aria-label="Eco"
          >
            <span className="fragmento-action-ico" aria-hidden="true">✦</span>
            <span className="fragmento-action-count">{data.total_avales || 0}</span>
            <span className="fragmento-action-label">Eco</span>
          </button>
          <button
            type="button"
            className="fragmento-action"
            onClick={handleAportar}
            data-testid={`fragmento-aportar-${data._id}`}
            aria-label="Aportar"
          >
            <span className="fragmento-action-ico" aria-hidden="true">✒</span>
            <span className="fragmento-action-count">{data.total_resonancias || 0}</span>
            <span className="fragmento-action-label">Aportar</span>
          </button>
          <button
            type="button"
            className="fragmento-action"
            onClick={handleDifundir}
            data-testid={`fragmento-difundir-${data._id}`}
            aria-label="Difundir"
          >
            <span className="fragmento-action-ico" aria-hidden="true">⌁</span>
            <span className="fragmento-action-label">Difundir</span>
          </button>
        </div>
      </div>

      {/* Cuerpo: título, descripción, fuente */}
      <div className="fragmento-body">
        <h3 className="fragmento-titulo">{data.titulo}</h3>
        {data.descripcion && (
          <p className="fragmento-desc">{data.descripcion}</p>
        )}
        {data.fuente && (
          <div className="fragmento-fuente">
            <span className="fragmento-fuente-ico" aria-hidden="true">⌑</span>
            <div>
              <div className="fragmento-fuente-label">Fuente</div>
              <div className="fragmento-fuente-text">{data.fuente}</div>
            </div>
          </div>
        )}
        <div className="fragmento-footer">
          {author && (
            <button
              className="fragmento-author"
              onClick={() => navigate(`/perfil/${author._id}`)}
              data-testid={`fragmento-author-${data._id}`}
            >
              <img src={getAvatarUrl(author)} alt={author.nombre} />
              <span>{author.nombre}</span>
            </button>
          )}
          <div className="fragmento-footer-right">
            <span className="fragmento-views">{data.total_visualizaciones || 0} vistas</span>
            {data.es_mio && (
              <button
                className="fragmento-delete"
                onClick={handleDelete}
                data-testid={`fragmento-delete-${data._id}`}
                aria-label="Eliminar"
              >
                🗑
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default FragmentoCard;
