/**
 * Viewer fullscreen para Cápsulas del Tiempo.
 * - Barra de progreso superior estilo IG/TikTok
 * - Tap derecha → siguiente, tap izquierda → anterior
 * - Swipe-down o backdrop click → cerrar
 * - 6 segundos por cápsula (auto-avanzar)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getAvatarUrl } from '../utils/imageHelpers';
import { CloseIcon, HourglassIcon, MapIcon, FeatherIcon } from './HistoricIcons';
import { yearToCentury } from '../utils/historicTime';
import haptic from '../utils/haptic';
import VisitaVirtualButton from './VisitaVirtualButton';
import useVisitaVirtual from '../hooks/useVisitaVirtual';

const DURATION_MS = 6000;
const TICK_MS = 50;

const CapsulaViewer = ({ capsulas, startIndex = 0, onClose, onMarkVisto }) => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const touchStartY = useRef(null);

  const current = capsulas[idx];

  const advance = useCallback(() => {
    setIdx(i => {
      if (i + 1 >= capsulas.length) {
        // Cerrar al final
        setTimeout(() => onClose && onClose(), 0);
        return i;
      }
      return i + 1;
    });
    setProgress(0);
  }, [capsulas.length, onClose]);

  const back = useCallback(() => {
    setIdx(i => Math.max(0, i - 1));
    setProgress(0);
  }, []);

  // Marcar visto al entrar a cada cápsula
  useEffect(() => {
    if (current && !current.visto && onMarkVisto) onMarkVisto(current._id);
  }, [current, onMarkVisto]);

  // Tick de progreso
  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setProgress(p => {
        const next = p + (TICK_MS / DURATION_MS) * 100;
        if (next >= 100) {
          advance();
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(timerRef.current);
  }, [paused, advance, idx]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose && onClose();
      if (e.key === 'ArrowRight') { haptic.light(); advance(); }
      if (e.key === 'ArrowLeft') { haptic.light(); back(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, back, onClose]);

  // Swipe down to close (mobile)
  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    setPaused(true);
  };
  const onTouchEnd = (e) => {
    setPaused(false);
    if (touchStartY.current === null) return;
    const dy = (e.changedTouches[0].clientY) - touchStartY.current;
    touchStartY.current = null;
    if (dy > 80) {
      haptic.medium();
      onClose && onClose();
    }
  };

  if (!current) return null;

  const isEfemeride = current.tipo === 'efemeride';
  const isCita = current.tipo === 'cita';
  const isCronista = current.tipo === 'cronista';
  const user = current.usuario_id;
  const century = yearToCentury(current.anio);

  // Consultamos si hay visita virtual disponible para esta cápsula
  // (solo para efemérides y cápsulas con lugar / coordenadas)
  /* eslint-disable react-hooks/rules-of-hooks */
  const { visita } = useVisitaVirtual(
    isCronista || isEfemeride
      ? { lugar: current.lugar, lat: current.lat, lng: current.lng }
      : {}
  );
  /* eslint-enable react-hooks/rules-of-hooks */

  const handleTapZone = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    haptic.light();
    if (x < rect.width / 3) back();
    else if (x > (rect.width * 2) / 3) advance();
    else setPaused(p => !p);
  };

  const goToMap = () => {
    if (current.lat !== null && current.lng !== null && current.lat !== undefined) {
      onClose && onClose();
      navigate(`/efemerides/mapa?lat=${current.lat}&lng=${current.lng}&z=6`);
    }
  };

  const container = typeof document !== 'undefined' ? document.body : null;
  if (!container) return null;

  return ReactDOM.createPortal(
    <div
      className="capsule-viewer"
      data-testid="capsule-viewer"
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <div
        className={`capsule-viewer-stage capsule-stage-${current.tipo}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Barras de progreso */}
        <div className="capsule-progress-bars" aria-hidden="true">
          {capsulas.map((_, i) => (
            <div key={i} className="capsule-progress-track">
              <div
                className="capsule-progress-fill"
                style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="capsule-viewer-header">
          <div className="capsule-viewer-author">
            {isCronista && user && (
              <>
                <span className="capsule-viewer-avatar">
                  <img src={getAvatarUrl(user)} alt={user?.nombre} />
                </span>
                <div>
                  <div className="capsule-viewer-name">{user.nombre}</div>
                  <div className="capsule-viewer-sub">@{user.usuario}</div>
                </div>
              </>
            )}
            {isEfemeride && (
              <>
                <span className="capsule-viewer-avatar capsule-system-avatar">
                  <HourglassIcon size={24} style={{ color: 'var(--gold-bright)' }} />
                </span>
                <div>
                  <div className="capsule-viewer-name">Efeméride del día</div>
                  <div className="capsule-viewer-sub">
                    {current.lugar}{current.anio !== null ? ` · ${current.anio}` : ''}
                  </div>
                </div>
              </>
            )}
            {isCita && (
              <>
                <span className="capsule-viewer-avatar capsule-system-avatar">
                  <FeatherIcon size={22} style={{ color: 'var(--gold-bright)' }} />
                </span>
                <div>
                  <div className="capsule-viewer-name">Cita del día</div>
                  <div className="capsule-viewer-sub">
                    {current.autor}{century ? ` · ${century}` : ''}
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            className="capsule-viewer-close"
            onClick={onClose}
            data-testid="capsule-viewer-close"
          >
            <CloseIcon size={22} />
          </button>
        </div>

        {/* Tap zones para nav */}
        <div className="capsule-viewer-tapzone" onClick={handleTapZone}>
          {current.imagen && (
            <img
              src={current.imagen}
              alt=""
              className="capsule-viewer-bg"
              aria-hidden="true"
            />
          )}

          <div className={`capsule-viewer-body ${current.imagen ? 'has-bg' : ''}`}>
            {isCita && (
              <div className="capsule-cita-mark" aria-hidden="true">“</div>
            )}
            <p className={`capsule-viewer-text ${isCita ? 'is-cita' : ''}`}>
              {current.texto}
            </p>
            {(century || current.lugar) && (
              <div className="capsule-viewer-tag">
                {[century, current.lugar].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        </div>

        {/* Acciones: Ver en mapa + Visitar en 360° */}
        {(isEfemeride || isCronista) && (current.lat !== null && current.lat !== undefined || visita) && (
          <div className="capsule-viewer-actions">
            {visita && (
              <VisitaVirtualButton visita={visita} variant="pill" />
            )}
            {isEfemeride && current.lat !== null && current.lat !== undefined && (
              <button
                type="button"
                className="capsule-action-btn"
                onClick={goToMap}
                data-testid="capsule-action-mapa"
              >
                <MapIcon size={16} /> Ver en el mapa
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CapsulaViewer;
