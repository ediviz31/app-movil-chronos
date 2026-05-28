/**
 * Visita360Viewer — modal fullscreen con Pannellum embebido.
 * Funciona sin salir de Chronos. Si la visita no tiene panorama 360 interno,
 * cae a un fallback que ofrece abrir el enlace original en nueva pestaña.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CloseIcon, MapIcon, GlobeIcon, FeatherIcon } from './HistoricIcons';
import { yearToCentury } from '../utils/historicTime';
import haptic from '../utils/haptic';

const Visita360Viewer = ({ visita, isOpen, onClose, onInspirarCronica }) => {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !visita) return;
    setError(null);

    // Si no tiene panorama 360 interno, no inicializamos Pannellum
    if (!visita.panorama_360) return;

    const tryInit = () => {
      if (!window.pannellum) {
        setTimeout(tryInit, 200);
        return;
      }
      if (!containerRef.current) return;
      try {
        viewerRef.current = window.pannellum.viewer(containerRef.current, {
          type: 'equirectangular',
          panorama: visita.panorama_360,
          autoLoad: true,
          autoRotate: -2,
          compass: true,
          showZoomCtrl: true,
          showFullscreenCtrl: false,
          showControls: true,
          hfov: 100,
          minHfov: 50,
          maxHfov: 120,
          backgroundColor: [0.04, 0.06, 0.09]
        });
      } catch (e) {
        console.error('Pannellum init error:', e);
        setError('No se pudo cargar el panorama. Intenta abrir el enlace externo.');
      }
    };
    tryInit();

    return () => {
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch (_) {}
        viewerRef.current = null;
      }
    };
  }, [isOpen, visita]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !visita) return null;

  const century = yearToCentury(visita.anio_aprox);
  const hasPanorama = !!visita.panorama_360;

  const goToMap = () => {
    haptic.medium();
    onClose && onClose();
    navigate(`/efemerides/mapa?lat=${visita.lat}&lng=${visita.lng}&z=6`);
  };

  const inspirar = () => {
    haptic.medium();
    onClose && onClose();
    onInspirarCronica && onInspirarCronica(visita);
  };

  const openExternal = () => {
    haptic.light();
    window.open(visita.url, '_blank', 'noopener,noreferrer');
  };

  return createPortal(
    <div className="visita360-backdrop" data-testid="visita360-viewer">
      <div className="visita360-header">
        <div className="visita360-meta">
          <span className="visita360-kicker">
            <GlobeIcon size={12} /> Visita 360°
          </span>
          <h2 className="visita360-title">{visita.lugar}</h2>
          <p className="visita360-sub">
            {[century, visita.epoca].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button
          type="button"
          className="visita360-close"
          onClick={onClose}
          data-testid="visita360-close"
          aria-label="Cerrar"
        >
          <CloseIcon size={22} />
        </button>
      </div>

      {hasPanorama ? (
        <div
          ref={containerRef}
          className="visita360-pano"
          data-testid="visita360-pano"
        />
      ) : (
        <div className="visita360-fallback">
          <GlobeIcon size={56} style={{ color: 'var(--gold)', opacity: 0.7 }} />
          <h3>Visita externa disponible</h3>
          <p>
            Esta visita aún no está disponible en el viewer interno de Chronos.
            Puedes abrirla en una nueva pestaña para experimentarla en 360°.
          </p>
          <button
            type="button"
            className="capsule-action-btn"
            onClick={openExternal}
            data-testid="visita360-open-external"
            style={{ marginTop: 8 }}
          >
            <GlobeIcon size={16} /> Abrir en nueva pestaña
          </button>
        </div>
      )}

      {error && (
        <div className="visita360-error">{error}</div>
      )}

      <div className="visita360-description">
        <p>{visita.descripcion}</p>
      </div>

      <div className="visita360-actions">
        {onInspirarCronica && (
          <button
            type="button"
            className="capsule-action-btn"
            onClick={inspirar}
            data-testid="visita360-inspirar"
          >
            <FeatherIcon size={14} /> Inspirar crónica
          </button>
        )}
        <button
          type="button"
          className="capsule-action-btn"
          onClick={goToMap}
          data-testid="visita360-mapa"
        >
          <MapIcon size={14} /> Ver en el mapa
        </button>
      </div>
    </div>,
    document.body
  );
};

export default Visita360Viewer;
