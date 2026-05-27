import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/imageHelpers';
import SearchBar from './SearchBar';
import AvisosBadge from './AvisosBadge';
import {
  FeatherIcon, HourglassIcon,
  OrnateStarIcon, ChronicleIcon, CommunitiesIcon, ScrollIcon
} from './HistoricIcons';

const TopbarArchive = ({ onCreate }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'Para ti', Icon: OrnateStarIcon },
    { path: '/cronicas', label: 'Crónicas', Icon: ChronicleIcon },
    { path: '/legados', label: 'Legados', Icon: CommunitiesIcon },
    { path: '/documentos', label: 'Documentos', Icon: ScrollIcon }
  ];

  return (
    <header className="archive-topbar" data-testid="archive-topbar">
      <div className="topbar-inner">
        {/* IZQUIERDA: Logo + Buscador (estilo Facebook) */}
        <div className="topbar-section-left">
          <div className="topbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} data-testid="topbar-brand">
            <div className="topbar-brand-icon">
              <HourglassIcon size={28} />
            </div>
            <div className="topbar-brand-text">
              <span className="brand-name">CHRONOS</span>
              <span className="brand-tag">Archivo Vivo</span>
            </div>
          </div>
          <SearchBar />
        </div>

        {/* CENTRO: Navegación */}
        <div className="topbar-section-center">
          <nav className="archive-nav">
            {navItems.map(item => {
              const Icon = item.Icon;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={location.pathname === item.path ? 'active' : ''}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.path);
                  }}
                >
                  <Icon size={20} />
                  <span className="nav-label">{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        {/* DERECHA: Acciones */}
        <div className="topbar-section-right">
          <div className="archive-topbar-actions">
            <button className="icon-btn" onClick={onCreate} data-testid="topbar-create-btn" title="Crear crónica">
              <FeatherIcon size={20} />
            </button>
            <AvisosBadge />
            <div
              className="user-avatar-small"
              data-testid="topbar-user-avatar"
              onClick={() => user && navigate(`/perfil/${user._id || user.id}`)}
              style={{ cursor: 'pointer' }}
              title="Mi perfil"
            >
              <img src={getAvatarUrl(user)} alt={user?.nombre} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopbarArchive;
