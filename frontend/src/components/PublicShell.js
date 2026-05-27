import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HourglassIcon, FeatherIcon } from './HistoricIcons';

/**
 * Cascarón liviano para vistas públicas (sin auth).
 * Topbar minimal con branding + CTA Únete / Entrar.
 */
const PublicShell = ({ children }) => {
  const navigate = useNavigate();

  return (
    <div className="public-layout" data-testid="public-layout">
      <header className="public-topbar" data-testid="public-topbar">
        <div className="public-topbar-inner">
          <div
            className="public-brand"
            onClick={() => navigate('/login')}
            data-testid="public-brand"
            style={{ cursor: 'pointer' }}
          >
            <div className="public-brand-icon">
              <HourglassIcon size={28} />
            </div>
            <div className="public-brand-text">
              <span className="public-brand-name">CHRONOS</span>
              <span className="public-brand-tag">archivo vivo de la historia</span>
            </div>
          </div>

          <div className="public-topbar-actions">
            <button
              className="public-link-btn"
              onClick={() => navigate('/login')}
              data-testid="public-login-btn"
            >
              Entrar
            </button>
            <button
              className="public-cta-btn"
              onClick={() => navigate('/registro')}
              data-testid="public-register-btn"
            >
              <FeatherIcon size={14} /> Únete a Chronos
            </button>
          </div>
        </div>
      </header>

      <div className="public-main">{children}</div>

      <footer className="public-footer" data-testid="public-footer">
        <span className="public-footer-text">
          · Chronos · archivo vivo de la historia ·
        </span>
        <button
          className="public-footer-link"
          onClick={() => navigate('/registro')}
        >
          Únete y escribe tu propia crónica
        </button>
      </footer>
    </div>
  );
};

export default PublicShell;
