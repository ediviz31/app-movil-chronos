import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Topbar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const avatarSrc = user?.avatar?.startsWith('/uploads')
    ? `${process.env.REACT_APP_BACKEND_URL}${user.avatar}`
    : `https://api.dicebear.com/7.x/initials/svg?seed=${user?.nombre || 'U'}&backgroundColor=C6A75E`;

  return (
    <header className="topbar" data-testid="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" data-testid="brand-logo">
          <div className="brand-mark">C</div>
          <div>
            <strong>CHRONOS</strong>
            <small>Red de Historia</small>
          </div>
        </Link>

        <div className="global-search" data-testid="global-search">
          <i className="ri-search-line"></i>
          <input type="text" placeholder="Buscar épocas, relatos o usuarios" />
        </div>

        <nav className="topnav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''} data-testid="nav-inicio">
            <i className="ri-home-5-line"></i> Inicio
          </Link>
          <Link to="/explorar" className={location.pathname === '/explorar' ? 'active' : ''} data-testid="nav-explorar">
            <i className="ri-compass-3-line"></i> Explorar
          </Link>
          <Link to="/comunidades" className={location.pathname === '/comunidades' ? 'active' : ''} data-testid="nav-comunidades">
            <i className="ri-team-line"></i> Comunidades
          </Link>
          <Link to="/notificaciones" className={location.pathname === '/notificaciones' ? 'active' : ''} data-testid="nav-notificaciones">
            <i className="ri-notification-3-line"></i> Notificaciones
          </Link>
        </nav>

        <Link to="/perfil" className="top-user" data-testid="top-user-link">
          <img src={avatarSrc} alt="Avatar" />
          <div>
            <strong>{user?.nombre || 'Usuario'}</strong>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Topbar;
