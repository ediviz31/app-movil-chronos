import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Sidebar = ({ onCreateRelato }) => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ totalRelatos: 0, totalSeguidores: 0, totalSiguiendo: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/estadisticas/me');
      setStats(response.data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  }, []);

  useEffect(() => {
    if (user) fetchStats();
  }, [user, fetchStats]);

  const avatarSrc = user?.avatar?.startsWith('/uploads')
    ? `${process.env.REACT_APP_BACKEND_URL}${user.avatar}`
    : `https://api.dicebear.com/7.x/initials/svg?seed=${user?.nombre || 'U'}&backgroundColor=C6A75E`;

  return (
    <aside className="sidebar" data-testid="sidebar">
      <section className="profile-card">
        <div className="cover" style={{ background: 'linear-gradient(135deg, rgba(198, 167, 94, 0.4), rgba(86, 119, 180, 0.3))' }}></div>
        <div className="profile-main">
          <img className="avatar" src={avatarSrc} alt="Avatar" data-testid="sidebar-avatar" />
          <h2 data-testid="sidebar-username">{user?.nombre || 'Explorador'}</h2>
          <p>@{user?.usuario || 'usuario'} · {user?.tema_favorito || 'Historia'}</p>
          <span className="badge">Beta visual</span>
        </div>
        <div className="stats stats-links-v137">
          <Link to="/perfil" data-testid="stat-relatos">
            <strong>{stats.totalRelatos}</strong>
            <span>Relatos</span>
          </Link>
          <Link to="/perfil" data-testid="stat-seguidores">
            <strong>{stats.totalSeguidores}</strong>
            <span>Ecos</span>
          </Link>
          <Link to="/perfil" data-testid="stat-siguiendo">
            <strong>{stats.totalSiguiendo}</strong>
            <span>Legados</span>
          </Link>
        </div>

        <div className="nav-title">Navegación</div>
        <nav className="side-nav">
          <Link to="/" className="active" data-testid="side-linea-tiempo">
            <i className="ri-sparkling-2-line"></i> Línea del tiempo
          </Link>
          <Link to="/explorar" data-testid="side-explorar">
            <i className="ri-compass-3-line"></i> Explorar
          </Link>
          <Link to="/civilizaciones" data-testid="side-civilizaciones">
            <i className="ri-building-4-line"></i> Civilizaciones
          </Link>
          <Link to="/imagenes" data-testid="side-imagenes">
            <i className="ri-image-line"></i> Imágenes históricas
          </Link>
          <Link to="/archivo" data-testid="side-archivo">
            <i className="ri-archive-line"></i> Archivo
          </Link>
        </nav>

        <div className="nav-title">Comunidad</div>
        <nav className="side-nav">
          <Link to="/legados" data-testid="side-legados">
            <i className="ri-team-line"></i> Comunidades
          </Link>
          <Link to="/notificaciones" data-testid="side-notificaciones">
            <i className="ri-notification-line"></i> Ecos
          </Link>
          <Link to="/guardados" data-testid="side-guardados">
            <i className="ri-bookmark-line"></i> Guardados
          </Link>
          <Link to="/perfil" data-testid="side-mi-legado">
            <i className="ri-user-star-line"></i> Mi legado
          </Link>
          <button onClick={logout} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }} data-testid="btn-logout">
            <i className="ri-logout-circle-line"></i> Cerrar sesión
          </button>
        </nav>

        <button onClick={onCreateRelato} className="create-side" data-testid="btn-crear-relato-side" style={{ width: 'calc(100% - 32px)', border: 'none', cursor: 'pointer' }}>
          <i className="ri-quill-pen-line"></i> + Crear relato
        </button>
      </section>
    </aside>
  );
};

export default Sidebar;
