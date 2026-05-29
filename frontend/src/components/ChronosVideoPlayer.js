/**
 * ChronosVideoPlayer — Reproductor de video custom con estética Chronos.
 *
 * Sustituye los controles nativos del navegador por una experiencia más
 * cinematográfica y coherente con la app: botón de play dorado, barra de
 * progreso dorada, tiempo, mute y fullscreen propios.
 *
 * Uso: <ChronosVideoPlayer src={url} poster={miniatura} />
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import '../styles/chronos-video.css';

const fmt = (s) => {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
};

const ChronosVideoPlayer = ({
  src,
  poster = null,
  className = '',
  testId = 'chronos-video',
  autoPlay = false,
  loop = false,
  initiallyMuted = false,
  onPlay,
  onEnded
}) => {
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(initiallyMuted);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [error, setError] = useState(false);
  const hideTimerRef = useRef(null);

  const showControls = useCallback(() => {
    setHovering(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setHovering(false);
    }, 2400);
  }, []);

  useEffect(() => () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    // Si hay error, no intentamos reproducir (mostramos el aviso)
    if (error || v.error) {
      setError(true);
      return;
    }
    if (v.paused) {
      // Primera reproducción puede fallar por autoplay policy; aseguramos
      // que el play() sea sincrónico al gesto del usuario.
      v.muted = muted; // respeta el toggle actual
      const p = v.play();
      if (p && typeof p.then === 'function') {
        p.then(() => { setPlaying(true); onPlay && onPlay(); })
         .catch((err) => {
           // Si falla por NotSupportedError o el src es 404, marcamos error
           if (err?.name === 'NotSupportedError' || err?.name === 'NotAllowedError') {
             // NotAllowedError = autoplay sin gesto: intenta otra vez muted
             v.muted = true;
             setMuted(true);
             v.play().then(() => { setPlaying(true); onPlay && onPlay(); }).catch(() => {});
           }
         });
      }
    } else {
      v.pause();
      setPlaying(false);
    }
    showControls();
  };

  const toggleMute = (e) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const onTimeUpdate = () => {
    if (!videoRef.current || seeking) return;
    setCurrent(videoRef.current.currentTime || 0);
  };

  const onLoadedMeta = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
  };

  const handleSeek = (e) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    v.currentTime = pct * duration;
    setCurrent(v.currentTime);
  };

  const handleFullscreen = (e) => {
    e?.stopPropagation();
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
    }
  };

  const progressPct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      className={`chronos-video ${className} ${playing ? 'is-playing' : ''} ${hovering || !playing ? 'show-ui' : ''}`}
      onMouseMove={showControls}
      onMouseLeave={() => { if (playing) setHovering(false); }}
      data-testid={testId}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMeta}
        onLoadedData={() => setError(false)}
        onError={() => setError(true)}
        onEnded={() => { setPlaying(false); onEnded && onEnded(); }}
        onPlay={() => { setPlaying(true); onPlay && onPlay(); }}
        onPause={() => setPlaying(false)}
        data-testid={`${testId}-el`}
      />

      {/* Overlay ornamental superior (esquinas) */}
      <div className="chronos-video-ornaments" aria-hidden="true">
        <span className="cv-corner cv-tl">◆</span>
        <span className="cv-corner cv-tr">◆</span>
      </div>

      {/* Overlay de error si el video no se puede reproducir
          (típicamente: archivos antiguos perdidos antes de la migración). */}
      {error && (
        <div className="chronos-video-error" data-testid={`${testId}-error`}>
          <div className="chronos-video-error-ico" aria-hidden="true">⌛</div>
          <p className="chronos-video-error-title">Este video no está disponible</p>
          <p className="chronos-video-error-sub">Fue subido antes de la migración del archivo. Sube uno nuevo y se conservará para siempre.</p>
        </div>
      )}

      {/* Botón play central (solo si está pausado y sin error) */}
      {!playing && !error && (
        <button
          type="button"
          className="chronos-video-play"
          onClick={togglePlay}
          aria-label="Reproducir"
          data-testid={`${testId}-play`}
        >
          <svg viewBox="0 0 36 36" width="32" height="32" aria-hidden="true">
            <path d="M11 8 L29 18 L11 28 Z" fill="currentColor" />
          </svg>
        </button>
      )}

      {/* Controles inferiores custom */}
      <div className="chronos-video-bar" onClick={(e) => e.stopPropagation()}>
        {/* Barra de progreso "filigrana dorada" */}
        <div
          className="chronos-video-track"
          onClick={handleSeek}
          onTouchStart={() => setSeeking(true)}
          onTouchMove={handleSeek}
          onTouchEnd={() => setSeeking(false)}
          data-testid={`${testId}-track`}
        >
          <div className="chronos-video-track-fill" style={{ width: `${progressPct}%` }} />
          <div className="chronos-video-track-thumb" style={{ left: `${progressPct}%` }} aria-hidden="true" />
        </div>

        <div className="chronos-video-controls">
          <button
            type="button"
            className="chronos-video-ctl chronos-video-toggle"
            onClick={togglePlay}
            aria-label={playing ? 'Pausar' : 'Reproducir'}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M7 5 L19 12 L7 19 Z" fill="currentColor" />
              </svg>
            )}
          </button>

          <span className="chronos-video-time" data-testid={`${testId}-time`}>
            {fmt(current)} <span className="chronos-video-time-sep">·</span> {fmt(duration)}
          </span>

          <div className="chronos-video-spacer" />

          <button
            type="button"
            className="chronos-video-ctl"
            onClick={toggleMute}
            aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          >
            {muted ? (
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3L20 8.5 18.5 7 15 10.5 11.5 7 10 8.5 13.5 12 10 15.5 11.5 17 15 13.5 18.5 17 20 15.5z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M3 9v6h4l5 4V5L7 9H3zM16 12c0-1.7-1-3.1-2.5-3.7v7.4C15 15.1 16 13.7 16 12z" fill="currentColor" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="chronos-video-ctl"
            onClick={handleFullscreen}
            aria-label="Pantalla completa"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M5 5h5v2H7v3H5V5zm9 0h5v5h-2V7h-3V5zm5 9v5h-5v-2h3v-3h2zM10 19H5v-5h2v3h3v2z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChronosVideoPlayer;
