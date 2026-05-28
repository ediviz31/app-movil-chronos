/**
 * VisitaVirtualButton — botón reutilizable que abre la visita 360° en una nueva pestaña.
 * Variantes: 'pill' (cápsula efeméride), 'icon' (junto al indicador histórico), 'card' (página /visitas).
 */
import React from 'react';
import haptic from '../utils/haptic';
import { GlobeIcon } from './HistoricIcons';

const VisitaVirtualButton = ({ visita, variant = 'pill', onOpen }) => {
  if (!visita || !visita.url) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    haptic.medium();
    onOpen && onOpen(visita);
    // Abrir SIEMPRE en nueva pestaña (AirPano envía X-Frame-Options: DENY)
    window.open(visita.url, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className="visita-virtual-icon-btn"
        onClick={handleClick}
        data-testid={`visita-virtual-icon-${visita.slug}`}
        title={`Visitar ${visita.lugar} en 360°`}
        aria-label={`Visitar ${visita.lugar} en 360°`}
      >
        <GlobeIcon size={14} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`visita-virtual-btn visita-virtual-${variant}`}
      onClick={handleClick}
      data-testid={`visita-virtual-btn-${visita.slug}`}
    >
      <GlobeIcon size={16} />
      <span>Visitar en 360°</span>
    </button>
  );
};

export default VisitaVirtualButton;
