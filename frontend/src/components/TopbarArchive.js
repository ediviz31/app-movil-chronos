import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/imageHelpers';
import haptic from '../utils/haptic';
import useScrollDirection from '../utils/useScrollDirection';
import SearchBar from './SearchBar';
import AvisosBadge from './AvisosBadge';
import MisivasBadge from './MisivasBadge';
import MobileMoreDrawer from './MobileMoreDrawer';
import {
  FeatherIcon, HourglassIcon,
  OrnateStarIcon, ChronicleIcon, CommunitiesIcon, ScrollIcon
} from './HistoricIcons';

const TopbarArchive = ({ onCreate }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollDir = useScrollDirection();
  const isHidden = scrollDir === 'down';

  const navItems = [
    { path: '/', label: 'Para ti', Icon: OrnateStarIcon },
    { path: '/cronicas', label: 'Crónicas', Icon: ChronicleIcon },
    { path: '/legados', label: 'Legados', Icon: CommunitiesIcon },
    { path: '/documentos', label: 'Documentos', Icon: ScrollIcon }
  ];

  // ─── Swipe-to-open desde el borde izquierdo (mobile) ───
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (e) => {
      if (drawerOpen) return;
      if (window.innerWidth > 900) return;
      const x = e.touches[0].clientX;
      // sólo activamos si toca cerca del borde izquierdo (primeros 24px)
      if (x > 24) return;
      startX = x;
      startY = e.touches[0].clientY;
      tracking = true;
    };

    const onMove = (e) => {
      if (!tracking) return;
      const dx = e.touches[0].clientX - startX;
      const dy = Math.abs(e.touches[0].clientY - startY);
      // Sólo abrir si el gesto es claramente horizontal y supera 60px
      if (dx > 60 && dy < 50) {
        haptic.light();   // 🤚 vibración al abrir drawer con swipe
        setDrawerOpen(true);
        tracking = false;
      }
    };

    const onEnd = () => { tracking = false; };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [drawerOpen]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 900;

  return (
    <header
      className={`archive-topbar ${isHidden ? 'topbar-auto-hide' : ''}`}
      data-testid="archive-topbar"
    >
      <div className="topbar-inner">
        {/* IZQUIERDA (desktop): Logo + Buscador */}
        <div className="topbar-section-left">
          <div className="topbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} data-testid="topbar-brand">
            <div className="topbar-brand-icon">
              <HourglassIcon size={26} />
            </div>
            <div className="topbar-brand-text">
              <span className="brand-name">CHRONOS</span>
              <span className="brand-tag">Archivo Vivo</span>
            </div>
          </div>
          <div className="topbar-search-wrap">
            <SearchBar />
          </div>
        </div>

        {/* CENTRO (desktop): Navegación */}
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

        {/* DERECHA: Acciones (desktop) + avatar (siempre) */}
        <div className="topbar-section-right">
          <div className="archive-topbar-actions">
            <button className="icon-btn desktop-only-inline" onClick={onCreate} data-testid="topbar-create-btn" title="Crear crónica">
              <FeatherIcon size={20} />
            </button>
            <AvisosBadge />
            <MisivasBadge />
            <div
              className="user-avatar-small"
              data-testid="topbar-user-avatar"
              onClick={() => {
                if (isMobile) setDrawerOpen(true);
                else if (user) navigate(`/perfil/${user._id || user.id}`);
              }}
              style={{ cursor: 'pointer' }}
              title={isMobile ? 'Menú' : 'Mi perfil'}
            >
              <img src={getAvatarUrl(user)} alt={user?.nombre} />
            </div>
          </div>
        </div>
      </div>
      <MobileMoreDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={logout}
      />
    </header>
  );
};

export default TopbarArchive;
