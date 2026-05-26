import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getAvatarUrl } from '../utils/imageHelpers';
import {
  IconScroll, IconCompass, IconColumn, IconImage, IconArchive,
  IconUsers, IconEcho, IconBookmark, IconStar, IconLogout, IconQuill
} from './Icons';

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

  const avatarSrc = getAvatarUrl(user);

  return (
    <aside className="sidebar" data-testid="sidebar">
      <section className="profile-card">
        <div className="cover"></div>
        <div className="profile-main">
          <img className="avatar" src={avatarSrc} alt="Avatar" data-testid="sidebar-avatar" />
          <h2 data-testid="sidebar-username">{user?.nombre || 'Explorador'}</h2>
          <p>@{user?.usuario || 'usuario'} · {user?.tema_favorito || 'Historia'}</p>
          <span className="badge">Beta Visual</span>
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
            <IconScroll width={18} height={18} /> Línea del tiempo
          </Link>
          <Link to="/explorar" data-testid="side-explorar">
            <IconCompass width={18} height={18} /> Explorar
          </Link>
          <Link to="/civilizaciones" data-testid="side-civilizaciones">
            <IconColumn width={18} height={18} /> Civilizaciones
          </Link>
          <Link to="/imagenes" data-testid="side-imagenes">
            <IconImage width={18} height={18} /> Imágenes históricas
          </Link>
          <Link to="/archivo" data-testid="side-archivo">
            <IconArchive width={18} height={18} /> Archivo
          </Link>
        </nav>

        <div className="nav-title">Comunidad</div>
        <nav className="side-nav">
          <Link to="/legados" data-testid="side-legados">
            <IconUsers width={18} height={18} /> Comunidades
          </Link>
          <Link to="/notificaciones" data-testid="side-notificaciones">
            <IconEcho width={18} height={18} /> Ecos
          </Link>
          <Link to="/guardados" data-testid="side-guardados">
            <IconBookmark width={18} height={18} /> Guardados
          </Link>
          <Link to="/perfil" data-testid="side-mi-legado">
            <IconStar width={18} height={18} /> Mi legado
          </Link>
          <button onClick={logout} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }} data-testid="btn-logout">
            <IconLogout width={18} height={18} /> Cerrar sesión
          </button>
        </nav>

        <button onClick={onCreateRelato} className="create-side" data-testid="btn-crear-relato-side" style={{ width: 'calc(100% - 32px)', border: 'none', cursor: 'pointer' }}>
          <IconQuill width={16} height={16} /> Crear Relato
        </button>
      </section>
    </aside>
  );
};

export default Sidebar;
