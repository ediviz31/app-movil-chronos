/**
 * NarrarBlock — Bloque ampliado para RelatoDetail.
 * Combina el botón "Escuchar narración" con un selector de voz TTS.
 * Cuando el usuario cambia de voz, se regenera el audio (POST /relatos/:id/narrar { voz, regenerar: true }).
 */
import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import haptic from '../utils/haptic';
import { HourglassIcon, OrnateStarIcon, FeatherIcon } from './HistoricIcons';

const VOCES = [
  { id: 'onyx',    nombre: 'Onyx',    desc: 'Voz grave, cronista mayor' },
  { id: 'echo',    nombre: 'Echo',    desc: 'Voz cálida, narrador clásico' },
  { id: 'sage',    nombre: 'Sage',    desc: 'Voz reflexiva, sabio antiguo' },
  { id: 'shimmer', nombre: 'Shimmer', desc: 'Voz luminosa, juglar femenina' },
  { id: 'nova',    nombre: 'Nova',    desc: 'Voz brillante, oradora joven' },
  { id: 'fable',   nombre: 'Fable',   desc: 'Voz británica, narrador de fábulas' },
  { id: 'alloy',   nombre: 'Alloy',   desc: 'Voz neutra, equilibrada' }
];

const NarrarBlock = ({ relatoId, initialAudioPath, initialVoz = 'onyx' }) => {
  const [audioPath, setAudioPath] = useState(initialAudioPath || null);
  const [voz, setVoz] = useState(initialVoz || 'onyx');
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => { setAudioPath(initialAudioPath || null); }, [initialAudioPath]);

  const backendUrl = (() => {
    try { return process.env.REACT_APP_BACKEND_URL || ''; } catch (_) { return ''; }
  })();
  const audioSrc = audioPath ? `${backendUrl}${audioPath}` : null;

  const generateAndPlay = async (vozFinal, forceRegen = false) => {
    setLoading(true);
    setError(null);
    haptic.light();
    try {
      const res = await api.post(`/relatos/${relatoId}/narrar`, {
        voz: vozFinal,
        regenerar: forceRegen
      });
      setAudioPath(res.data.audio_path);
      setVoz(res.data.voz || vozFinal);
      // Auto-play tras pintar el nuevo src
      setTimeout(() => {
        audioRef.current?.play().then(() => setPlaying(true)).catch(() => {});
      }, 250);
    } catch (e) {
      const msg = e.response?.data?.error || 'No se pudo generar la narración';
      const detail = e.response?.data?.detail || '';
      setError(detail || msg);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    haptic.light();
    if (!audioPath) {
      generateAndPlay(voz, false);
      return;
    }
    if (playing) audioRef.current?.pause();
    else audioRef.current?.play().then(() => setPlaying(true)).catch(() => {});
  };

  const handlePickVoice = (nuevaVoz) => {
    setVoiceMenuOpen(false);
    if (nuevaVoz === voz && audioPath) {
      // Misma voz: solo reproducir
      togglePlay();
      return;
    }
    // Voz distinta o sin audio: regenerar
    setVoz(nuevaVoz);
    generateAndPlay(nuevaVoz, true);
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (a && a.duration) setProgress((a.currentTime / a.duration) * 100);
  };

  const seek = (e) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    a.currentTime = pct * a.duration;
    setProgress(pct * 100);
  };

  const voceLabel = VOCES.find(v => v.id === voz)?.nombre || 'Onyx';

  return (
    <div className="narrar-block" data-testid={`narrar-block-${relatoId}`}>
      <div className="narrar-block-head">
        <span className="narrar-block-kicker">
          <OrnateStarIcon size={11} /> Narración
        </span>
        <div className="narrar-block-voice-picker">
          <button
            type="button"
            className="narrar-block-voice-btn"
            onClick={() => setVoiceMenuOpen(o => !o)}
            data-testid={`narrar-voz-picker-${relatoId}`}
            aria-haspopup="listbox"
            aria-expanded={voiceMenuOpen}
          >
            <FeatherIcon size={11} />
            <span>Voz · {voceLabel}</span>
            <span className="narrar-block-voice-caret" aria-hidden="true">▾</span>
          </button>
          {voiceMenuOpen && (
            <div className="narrar-block-voice-menu" role="listbox">
              {VOCES.map(v => (
                <button
                  key={v.id}
                  type="button"
                  className={`narrar-block-voice-opt ${v.id === voz ? 'is-active' : ''}`}
                  onClick={() => handlePickVoice(v.id)}
                  role="option"
                  aria-selected={v.id === voz}
                  data-testid={`narrar-voz-opt-${v.id}`}
                >
                  <span className="narrar-block-voice-opt-name">{v.nombre}</span>
                  <span className="narrar-block-voice-opt-desc">{v.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="narrar-block-body">
        <button
          type="button"
          className={`narrar-block-play ${playing ? 'is-playing' : ''}`}
          onClick={togglePlay}
          disabled={loading}
          data-testid={`narrar-play-${relatoId}`}
          aria-label={playing ? 'Pausar' : 'Reproducir narración'}
        >
          {loading ? (
            <span className="narrar-block-spin"><HourglassIcon size={20} /></span>
          ) : playing ? (
            <span className="narrar-block-pause-icon" aria-hidden="true">
              <span /><span />
            </span>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M7 5 L19 12 L7 19 Z" fill="currentColor" />
            </svg>
          )}
        </button>

        <div className="narrar-block-meter">
          <div className="narrar-block-meter-label">
            {loading
              ? 'Conjurando narración...'
              : audioPath
                ? (playing ? 'Reproduciendo' : 'Listo para escuchar')
                : 'Escuchar esta crónica'}
          </div>
          <div
            className="narrar-block-track"
            onClick={audioPath ? seek : undefined}
            data-testid={`narrar-track-${relatoId}`}
          >
            <div className="narrar-block-track-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {error && (
        <div className="narrar-block-error" data-testid={`narrar-error-${relatoId}`}>
          ⌛ {error}
        </div>
      )}

      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          onTimeUpdate={onTimeUpdate}
          onEnded={() => { setPlaying(false); setProgress(0); }}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          data-testid={`narrar-audio-${relatoId}`}
        />
      )}
    </div>
  );
};

export default NarrarBlock;
