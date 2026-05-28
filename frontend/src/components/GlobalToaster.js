/**
 * GlobalToaster — toaster simple con estética Chronos (pergamino dorado).
 * Escucha el evento `chronos:toast` y muestra el último toast 6 segundos.
 * Click en el toast → navega al href correspondiente.
 *
 * No usa librerías externas para mantener todo bajo control y consistente.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { DoveScrollIcon, FlameIcon, CloseIcon } from './HistoricIcons';
import haptic from '../utils/haptic';

const DURATION_MS = 6000;

const GlobalToaster = () => {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {};
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts(prev => [...prev.slice(-2), { id, ...detail }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    };
    window.addEventListener('chronos:toast', handler);
    return () => window.removeEventListener('chronos:toast', handler);
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="chronos-toaster" data-testid="chronos-toaster">
      {toasts.map(t => {
        const Icon = t.type === 'misiva' ? DoveScrollIcon : FlameIcon;
        const onClick = () => {
          haptic.light();
          if (t.href) navigate(t.href);
          dismiss(t.id);
        };
        return (
          <button
            key={t.id}
            type="button"
            className={`chronos-toast chronos-toast-${t.type || 'info'}`}
            data-testid={`chronos-toast-${t.type}`}
            onClick={onClick}
          >
            <span className="chronos-toast-icon">
              <Icon size={20} />
            </span>
            <span className="chronos-toast-body">
              <strong className="chronos-toast-title">{t.title}</strong>
              {t.description && <span className="chronos-toast-desc">{t.description}</span>}
            </span>
            <span
              role="button"
              tabIndex={0}
              className="chronos-toast-dismiss"
              aria-label="Cerrar"
              onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); dismiss(t.id); } }}
            >
              <CloseIcon size={14} />
            </span>
          </button>
        );
      })}
    </div>,
    document.body
  );
};

export default GlobalToaster;
