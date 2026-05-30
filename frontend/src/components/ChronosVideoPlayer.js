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
    if (error || v.error) { setError(true); return; }
    if (v.paused) {
      v.muted = muted;
      const p = v.play();
      if (p && typeof p.then === 'function') {
        p.then(() => { setPlaying(true); onPlay && onPlay(); })
         .catch((err) => {
           if (err?.name === 'NotAllowedError') {
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

  const onTimeUpdate = () => {
    if (videoRef.current && !seeking) setCurrent(videoRef.current.currentTime);
  };

  const onLoadedMeta = () => {
    if (videoRef.current) setDuration(videoRef.current.duration || 0);
  };

  const toggleMute = (e) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
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

      {/* Overlay de error */}
      {error && (
        <div className="chronos-video-error" data-testid={`${testId}-error`}>
          <div className="chronos-video-error-ico" aria-hidden="true">⌛</div>
          <p className="chronos-video-error-title">Este video no está disponible</p>
          <p className="chronos-video-error-sub">Fue subido antes de la migración del archivo. Sube uno nuevo y se conservará para siempre.</p>
        </div>
      )}

      {/* Botón play central */}
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

      {/* Barra de controles inferior — layout horizontal estilo YouTube,
          siempre dentro del ancho del video con padding y fondo gradiente */}
      {!error && (
        <div className="chronos-video-bar">
          {/* Fila 1: track de progreso (ancho completo) */}
          <div
            className="chronos-video-track"
            onClick={handleSeek}
            data-testid={`${testId}-track`}
          >
            <div className="chronos-video-track-fill" style={{ width: `${progressPct}%` }} />
            <div className="chronos-video-track-thumb" style={{ left: `${progressPct}%` }} />
          </div>
          {/* Fila 2: controles horizontales */}
          <div className="chronos-video-controls">
            <button
              type="button"
              className="chronos-video-ctl chronos-video-toggle"
              onClick={togglePlay}
              aria-label={playing ? 'Pausar' : 'Reproducir'}
              data-testid={`${testId}-bar-play`}
            >
              {playing ? (
                <span className="chronos-video-pause-icon" aria-hidden="true">
                  <span /><span />
                </span>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path d="M7 5 L19 12 L7 19 Z" fill="currentColor" />
                </svg>
              )}
            </button>
            <span className="chronos-video-time">{fmt(current)} / {fmt(duration)}</span>
            <div className="chronos-video-spacer" />
            <button
              type="button"
              className="chronos-video-ctl"
              onClick={toggleMute}
              aria-label={muted ? 'Activar sonido' : 'Silenciar'}
              data-testid={`${testId}-mute`}
            >
              {muted ? (
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.59 3L20 8.41 18.59 7l-3.59 3.59L11.41 7 10 8.41 13.59 12 10 15.59 11.41 17 15 13.41 18.59 17 20 15.59 16.59 12z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm10 .5v5l3.5-2.5L13 9.5z"/>
                </svg>
              )}
            </button>
            <button
              type="button"
              className="chronos-video-ctl"
              onClick={handleFullscreen}
              aria-label="Pantalla completa"
              data-testid={`${testId}-fs`}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChronosVideoPlayer;
