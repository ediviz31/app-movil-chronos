import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/imageHelpers';
import {
  HourglassIcon, OrnateStarIcon, TempleIcon, MapIcon,
  FeatherIcon, ChronicleIcon, LibraryIcon, CommunitiesIcon,
  LogoutIcon
} from './HistoricIcons';

const SideRail = ({ activeItem = 'inicio', onLogout }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const items = [
    { id: 'inicio', label: 'Inicio', icon: OrnateStarIcon },
    { id: 'epocas', label: 'Épocas', icon: TempleIcon },
    { id: 'rutas', label: 'Rutas', icon: MapIcon },
    { id: 'relatos', label: 'Relatos', icon: FeatherIcon },
    { id: 'cronicas', label: 'Crónicas', icon: ChronicleIcon },
    { id: 'biblioteca', label: 'Biblioteca', icon: LibraryIcon },
    { id: 'comunidades', label: 'Legados', icon: CommunitiesIcon }
  ];

  const handleClick = (id) => {
    if (id === 'inicio') navigate('/');
  };

  return (
    <aside className="side-rail" data-testid="side-rail">
      <div className="rail-logo" data-testid="rail-logo" onClick={() => navigate('/')}>
        <HourglassIcon size={42} />
      </div>
      <div className="rail-sublabel">ARCHIVO VIVO</div>
      <div className="rail-divider"></div>

      {items.map(item => {
        const IconComp = item.icon;
        return (
          <button
            key={item.id}
            className={`rail-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => handleClick(item.id)}
            data-testid={`rail-${item.id}`}
          >
            <IconComp size={26} />
            <span>{item.label}</span>
          </button>
        );
      })}

      <div className="rail-spacer"></div>

      <div className="rail-divider"></div>

      <button
        className="rail-item"
        onClick={onLogout}
        data-testid="rail-logout"
        title="Cerrar sesión"
      >
        <LogoutIcon size={20} />
        <span>Salir</span>
      </button>

      <div className="rail-user" data-testid="rail-user-avatar">
        <img src={getAvatarUrl(user)} alt={user?.nombre} />
      </div>
      <div className="rail-user-label">Mi legado</div>
    </aside>
  );
};

export default SideRail;
