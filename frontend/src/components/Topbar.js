import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/imageHelpers';
import { IconSearch, IconHome, IconCompass, IconUsers, IconBell } from './Icons';

const Topbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const avatarSrc = getAvatarUrl(user);

  return (
    <header className="topbar" data-testid="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" data-testid="brand-logo">
          <div className="brand-mark">C</div>
          <div>
            <strong>CHRONOS</strong>
            <small>· Red de Historia ·</small>
          </div>
        </Link>

        <div className="global-search" data-testid="global-search">
          <IconSearch width={18} height={18} style={{ color: 'var(--gold-primary)' }} />
          <input type="text" placeholder="Buscar épocas, relatos o cronistas..." />
        </div>

        <nav className="topnav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''} data-testid="nav-inicio">
            <IconHome width={16} height={16} /> Inicio
          </Link>
          <Link to="/explorar" className={location.pathname === '/explorar' ? 'active' : ''} data-testid="nav-explorar">
            <IconCompass width={16} height={16} /> Explorar
          </Link>
          <Link to="/comunidades" className={location.pathname === '/comunidades' ? 'active' : ''} data-testid="nav-comunidades">
            <IconUsers width={16} height={16} /> Comunidades
          </Link>
          <Link to="/notificaciones" className={location.pathname === '/notificaciones' ? 'active' : ''} data-testid="nav-notificaciones">
            <IconBell width={16} height={16} /> Notificaciones
          </Link>
        </nav>

        <Link to="/perfil" className="top-user" data-testid="top-user-link">
          <img src={avatarSrc} alt="Avatar" />
          <div>
            <strong>{user?.nombre || 'Cronista'}</strong>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Topbar;
