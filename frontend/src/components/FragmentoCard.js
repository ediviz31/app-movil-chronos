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
import { playProyectorOnce } from '../utils/fragmentoSound';

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
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const videoRef = useRef(null);
  const viewedRef = useRef(false);

  useEffect(() => { setData(fragmento); }, [fragmento]);

  // IntersectionObserver: sólo precargar y reproducir el video visible.
  // Esto mejora muchísimo la velocidad del feed (antes precargaba TODOS
  // los videos a metadata, ahora sólo el que está en pantalla).
  useEffect(() => {
    if (!videoRef.current) return;
    const el = videoRef.current;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Al entrar al viewport: preload + play
          if (el.preload === 'none') el.preload = 'metadata';
          setPlaying(true);
          el.play().catch(() => {});
          // Marcar visualización (una vez)
          if (!viewedRef.current && data?._id) {
            viewedRef.current = true;
            api.post(`/fragmentos/${data._id}/vista`).catch(() => {});
            // Micro-sonido: cinta proyectándose al abrir la bóveda
            try { playProyectorOnce(data._id); } catch (_) {}
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

  // Tap en el stage → abre el reel a pantalla completa (como Reels/TikTok)
  const openFullscreen = (e) => {
    e?.stopPropagation();
    if (videoError) return;
    haptic.light();
    // Pausamos el video en miniatura para que el del fullscreen tenga
    // control exclusivo y no haya dos copias sonando.
    if (videoRef.current) videoRef.current.pause();
    setPlaying(false);
    setFullscreenOpen(true);
  };

  const togglePlay = (e) => {
    // En FragmentoCard ahora el tap abre el fullscreen. Sólo cambiamos
    // play/pause si el usuario tocó muy rápido y queremos un fallback.
    if (e) openFullscreen(e);
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
      {/* Chips superiores: sólo categoría (lugar+año van como badge cinematográfico sobre el video) */}
      <div className="fragmento-chips">
        <span className="fragmento-chip">
          <span className="fragmento-chip-ico" aria-hidden="true">▣</span>
          {catLabel}
        </span>
      </div>

      {/* Stage: video */}
      <div className="fragmento-stage" onClick={togglePlay}>
        {/* Marca de "metraje recuperado" — sólo si el video carga bien.
            Si falla (fragmentos viejos pre-Object Store), se oculta para
            que el mensaje de error se vea limpio. */}
        {!videoError && (data.lugar || (data.anio !== null && data.anio !== undefined)) && (
          <div className="fragmento-archive-mark" data-testid={`fragmento-archmark-${data._id}`} aria-hidden="true">
            <div className="fragmento-archive-corner fragmento-archive-corner-tl" />
            <div className="fragmento-archive-corner fragmento-archive-corner-br" />
            <div className="fragmento-archive-mark-row fragmento-archive-mark-tag">
              <span className="fragmento-archive-mark-dot" />
              Fragmento recuperado
              <span className="fragmento-archive-mark-dot" />
            </div>
            {data.anio !== null && data.anio !== undefined && (
              <div className="fragmento-archive-mark-year">
                <span className="fragmento-archive-mark-prefix">ANNO</span>
                {data.anio}
              </div>
            )}
            {data.lugar && (
              <div className="fragmento-archive-mark-place">{data.lugar}</div>
            )}
            <div className="fragmento-archive-mark-ref">
              ARCH · {(data._id || '').slice(-6).toUpperCase() || '——'}
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          src={getImageUrl(data.video)}
          poster={data.miniatura ? getImageUrl(data.miniatura) : undefined}
          className="fragmento-video"
          loop
          playsInline
          muted={muted}
          preload="none"
          controls={false}
          onError={() => setVideoError(true)}
          onLoadedData={() => setVideoError(false)}
          data-testid={`fragmento-video-${data._id}`}
        />
        {videoError && (
          <div className="fragmento-video-error" data-testid={`fragmento-video-error-${data._id}`}>
            <div className="fragmento-video-error-ico" aria-hidden="true">⌛</div>
            <p>Este fragmento no está disponible</p>
            <small>Fue subido antes de la migración del archivo. Sube uno nuevo y se conservará.</small>
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

      {fullscreenOpen && (
        <FragmentoFullscreen
          data={data}
          author={author}
          muted={muted}
          onClose={() => setFullscreenOpen(false)}
          onAvalar={handleAvalar}
          onAportar={handleAportar}
          onDifundir={handleDifundir}
          pendingAval={pendingAval}
          onChanged={(d) => setData(prev => ({ ...prev, ...d }))}
        />
      )}
    </article>
  );
};

/**
 * Vista a pantalla completa del Fragmento, estilo Reels.
 * Video centrado vertical, acciones a la derecha, info abajo, cerrar arriba.
 */
const FragmentoFullscreen = ({ data, author, muted: initialMuted, onClose, onAvalar, onAportar, onDifundir, pendingAval }) => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(initialMuted);
  const [progress, setProgress] = useState(0);

  // Bloquear scroll del body mientras está abierto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ESC para cerrar
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Autoplay al abrir
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => {});
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = (e) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
  };

  return (
    <div
      className="fr-fs-overlay"
      data-testid={`fr-fs-${data._id}`}
      role="dialog"
      aria-modal="true"
      style={data.miniatura ? { '--fr-fs-bg': `url(${getImageUrl(data.miniatura)})` } : undefined}
    >
      {/* Botón cerrar */}
      <button className="fr-fs-close" onClick={onClose} aria-label="Cerrar" data-testid="fr-fs-close">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none"/>
        </svg>
      </button>

      {/* Video centrado */}
      <div className="fr-fs-stage" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={getImageUrl(data.video)}
          poster={data.miniatura ? getImageUrl(data.miniatura) : undefined}
          className="fr-fs-video"
          loop
          playsInline
          muted={muted}
          preload="auto"
          onTimeUpdate={onTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          data-testid={`fr-fs-video-${data._id}`}
        />
        {/* Tap overlay play indicator (sólo cuando está pausado) */}
        {!playing && (
          <button type="button" className="fr-fs-play" aria-label="Reproducir">
            <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
              <path d="M14 10 L38 24 L14 38 Z" fill="currentColor"/>
            </svg>
          </button>
        )}
      </div>

      {/* Acciones laterales (Reel-style) */}
      <aside className="fr-fs-actions" aria-label="Acciones del fragmento">
        <button
          className={`fr-fs-action ${data.usuario_avalo ? 'is-active' : ''}`}
          onClick={onAvalar}
          disabled={pendingAval}
          data-testid="fr-fs-eco"
        >
          <span className="fr-fs-action-ico" aria-hidden="true">◆</span>
          <span className="fr-fs-action-n">{data.total_avales || 0}</span>
          <span className="fr-fs-action-lab">Eco</span>
        </button>
        <button className="fr-fs-action" onClick={onAportar} data-testid="fr-fs-aportar">
          <span className="fr-fs-action-ico" aria-hidden="true">✎</span>
          <span className="fr-fs-action-n">{data.total_aportes || 0}</span>
          <span className="fr-fs-action-lab">Aportar</span>
        </button>
        <button className="fr-fs-action" onClick={onDifundir} data-testid="fr-fs-difundir">
          <span className="fr-fs-action-ico" aria-hidden="true">↗</span>
          <span className="fr-fs-action-lab">Difundir</span>
        </button>
        <button className="fr-fs-action fr-fs-action-mute" onClick={toggleMute} data-testid="fr-fs-mute" aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
          <span className="fr-fs-action-ico" aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
        </button>
      </aside>

      {/* Info inferior */}
      <div className="fr-fs-info">
        {author && (
          <button className="fr-fs-author" onClick={() => navigate(`/perfil/${author._id}`)}>
            <img src={getAvatarUrl(author)} alt={author.nombre} />
            <span>{author.nombre}</span>
          </button>
        )}
        <h2 className="fr-fs-title">{data.titulo}</h2>
        {(data.lugar || data.anio) && (
          <div className="fr-fs-meta">
            {data.lugar && <span>◉ {data.lugar}</span>}
            {data.anio && <span>· ⌛ {data.anio}</span>}
          </div>
        )}
        {data.descripcion && (
          <p className="fr-fs-desc">{data.descripcion}</p>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="fr-fs-progress" aria-hidden="true">
        <div className="fr-fs-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export default FragmentoCard;
