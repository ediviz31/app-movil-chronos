import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/imageHelpers';
import { SearchIcon, FeatherIcon, BellIcon, HourglassIcon } from './HistoricIcons';

const TopbarArchive = ({ onCreate }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'Para ti', icon: '✦' },
    { path: '/cronicas', label: 'Crónicas', icon: '◈' },
    { path: '/legados', label: 'Legados', icon: '⊙' }
  ];

  return (
    <header className="archive-topbar" data-testid="archive-topbar">
      <div className="topbar-inner">
        {/* IZQUIERDA: Nav + Acciones */}
        <div className="topbar-section-left">
          <nav className="archive-nav">
            {navItems.map(item => (
              <a
                key={item.path}
                href={item.path}
                className={location.pathname === item.path ? 'active' : ''}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (item.path === '/') window.history.pushState({}, '', '/');
                }}
              >
                <span style={{ fontSize: 9, color: 'var(--gold)' }}>{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="archive-topbar-actions">
            <button className="icon-btn" onClick={onCreate} data-testid="topbar-create-btn" title="Crear crónica">
              <FeatherIcon size={18} />
            </button>
            <button className="icon-btn" data-testid="topbar-notif-btn" title="Notificaciones">
              <BellIcon size={18} />
            </button>
            <div className="user-avatar-small" data-testid="topbar-user-avatar">
              <img src={getAvatarUrl(user)} alt={user?.nombre} />
            </div>
          </div>
        </div>

        {/* CENTRO: Búsqueda */}
        <div className="topbar-section-center">
          <div className="archive-search" data-testid="archive-search">
            <SearchIcon size={16} style={{ color: 'var(--gold)' }} />
            <input
              type="text"
              placeholder="Buscar"
            />
          </div>
        </div>

        {/* DERECHA: Logo CHRONOS (alineado con sidebar de iconos) */}
        <div className="topbar-section-right">
          <div className="topbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} data-testid="topbar-brand">
            <div className="topbar-brand-text" style={{ textAlign: 'right' }}>
              <span className="brand-name">CHRONOS</span>
              <span className="brand-tag">ARCHIVO VIVO</span>
            </div>
            <div className="topbar-brand-icon">
              <HourglassIcon size={26} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopbarArchive;
