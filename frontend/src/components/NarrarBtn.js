import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import haptic from '../utils/haptic';
import { HourglassIcon, OrnateStarIcon } from './HistoricIcons';

/**
 * Botón "Escuchar narración" — pide la narración TTS al backend.
 * Si ya existe (audio_path), reproduce sin regenerar.
 * Si no, llama POST /api/relatos/:id/narrar (puede tardar ~10-30s).
 *
 * Se renderiza dentro del SocialPost y en RelatoDetail.
 */
const NarrarBtn = ({ relatoId, initialAudioPath, voz = 'onyx', compact = false }) => {
  const [audioPath, setAudioPath] = useState(initialAudioPath || null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  // Sync con cambios externos del audio_path (cuando relato se recarga)
  useEffect(() => {
    setAudioPath(initialAudioPath || null);
  }, [initialAudioPath]);

  const backendUrl = (() => {
    try { return process.env.REACT_APP_BACKEND_URL || ''; } catch (_) { return ''; }
  })();
  const audioSrc = audioPath ? `${backendUrl}${audioPath}` : null;

  const handlePlay = async () => {
    haptic.light();
    // Si no hay audio aún → generar primero
    if (!audioPath) {
      setLoading(true);
      try {
        const res = await api.post(`/relatos/${relatoId}/narrar`, { voz });
        setAudioPath(res.data.audio_path);
        // Esperar próximo render para que el <audio> tenga src
        setTimeout(() => audioRef.current?.play().then(() => setPlaying(true)).catch(() => {}), 200);
      } catch (e) {
        console.error('Error al narrar', e);
      } finally {
        setLoading(false);
      }
      return;
    }
    // Toggle play/pause
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (a && a.duration) setProgress((a.currentTime / a.duration) * 100);
  };
  const onEnded = () => { setPlaying(false); setProgress(0); };
  const onPause = () => setPlaying(false);
  const onPlay = () => setPlaying(true);

  return (
    <div className={`narrar-btn-wrap ${compact ? 'narrar-compact' : ''}`} data-testid={`narrar-${relatoId}`}>
      <button
        type="button"
        className={`narrar-btn ${playing ? 'narrar-playing' : ''}`}
        onClick={handlePlay}
        disabled={loading}
        data-testid={`narrar-btn-${relatoId}`}
        aria-label={playing ? 'Pausar narración' : 'Escuchar narración'}
      >
        {loading ? (
          <>
            <span className="narrar-spin"><HourglassIcon size={14} /></span>
            <span className="narrar-label">Narrando…</span>
          </>
        ) : playing ? (
          <>
            <span className="narrar-pause">
              <span /><span />
            </span>
            <span className="narrar-label">Pausar</span>
            <span className="narrar-progress" style={{ width: `${progress}%` }} />
          </>
        ) : (
          <>
            <OrnateStarIcon size={14} />
            <span className="narrar-label">{audioPath ? 'Escuchar' : 'Escuchar narración'}</span>
          </>
        )}
      </button>
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          onPause={onPause}
          onPlay={onPlay}
          data-testid={`audio-${relatoId}`}
        />
      )}
    </div>
  );
};

export default NarrarBtn;
