import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/imageHelpers';
import {
  OrnateStarIcon, TempleIcon, MapIcon,
  FeatherIcon, ChronicleIcon, LibraryIcon, CommunitiesIcon,
  LogoutIcon, TelescopeIcon, DoveScrollIcon
} from './HistoricIcons';

const SideRail = ({ activeItem = 'inicio', onLogout }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // mobile: 5 ítems visibles en bottom tab bar (orden idéntico al mockup)
  // desktop: todos visibles en side rail
  const items = [
    { id: 'inicio',     label: 'Inicio',     icon: OrnateStarIcon, path: '/',           mobile: true  },
    { id: 'explorar',   label: 'Explorar',   icon: TelescopeIcon,  path: '/explorar',   mobile: true  },
    { id: 'cronicas',   label: 'Crónicas',   icon: ChronicleIcon,  path: '/cronicas',   mobile: true  },
    { id: 'biblioteca', label: 'Biblioteca', icon: LibraryIcon,    path: '/documentos', mobile: true  },
    { id: 'mi-legado',  label: 'Mi legado',  icon: FeatherIcon,    path: '/mi-legado',  mobile: true  },
    // desktop-only
    { id: 'epocas',     label: 'Épocas',     icon: TempleIcon,     path: '/epocas',     mobile: false },
    { id: 'efemerides', label: 'Efemérides', icon: MapIcon,        path: '/efemerides', mobile: false },
    { id: 'legados',    label: 'Legados',    icon: CommunitiesIcon,path: '/legados',    mobile: false },
    { id: 'misivas',    label: 'Misivas',    icon: DoveScrollIcon, path: '/misivas',    mobile: false }
  ];

  const handleClick = (item) => {
    navigate(item.path);
  };

  return (
    <aside className="side-rail" data-testid="side-rail">
      {items.map(item => {
        const IconComp = item.icon;
        return (
          <button
            key={item.id}
            className={`rail-item ${activeItem === item.id ? 'active' : ''} ${item.mobile ? 'mobile-tab' : 'desktop-only'}`}
            onClick={() => handleClick(item)}
            data-testid={`rail-${item.id}`}
          >
            <IconComp size={22} />
            <span>{item.label}</span>
          </button>
        );
      })}

      <div className="rail-spacer"></div>

      <div className="rail-divider"></div>

      <button
        className="rail-item desktop-only"
        onClick={onLogout}
        data-testid="rail-logout"
        title="Cerrar sesión"
      >
        <LogoutIcon size={20} />
        <span>Salir</span>
      </button>

      <div
        className="rail-user desktop-only"
        data-testid="rail-user-avatar"
        onClick={() => user && navigate(`/perfil/${user._id || user.id}`)}
        style={{ cursor: 'pointer' }}
        title="Mi perfil"
      >
        <img src={getAvatarUrl(user)} alt={user?.nombre} />
      </div>
    </aside>
  );
};

export default SideRail;
