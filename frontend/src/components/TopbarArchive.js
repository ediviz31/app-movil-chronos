import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/imageHelpers';
import { SearchIcon, FeatherIcon, BellIcon } from './HistoricIcons';

const TopbarArchive = ({ onCreate }) => {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Para ti', icon: '✦' },
    { path: '/cronicas', label: 'Crónicas', icon: '◈' },
    { path: '/legados', label: 'Legados', icon: '⊙' },
    { path: '/documentos', label: 'Documentos', icon: '⬚' }
  ];

  return (
    <header className="archive-topbar" data-testid="archive-topbar">
      <div className="archive-search" data-testid="archive-search">
        <SearchIcon size={18} style={{ color: 'var(--gold)' }} />
        <input
          type="text"
          placeholder="Buscar personas, épocas, lugares o documentos..."
        />
      </div>

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
            <span style={{ fontSize: 10, color: 'var(--gold)' }}>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="archive-topbar-actions">
        <button className="icon-btn" onClick={onCreate} data-testid="topbar-create-btn" title="Crear crónica">
          <FeatherIcon size={20} />
        </button>
        <button className="icon-btn" data-testid="topbar-notif-btn" title="Notificaciones">
          <BellIcon size={20} />
        </button>
        <div className="user-avatar-small" data-testid="topbar-user-avatar">
          <img src={getAvatarUrl(user)} alt={user?.nombre} />
        </div>
      </div>
    </header>
  );
};

export default TopbarArchive;
