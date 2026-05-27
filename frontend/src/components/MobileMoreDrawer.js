import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/imageHelpers';
import {
  TempleIcon, MapIcon, ChronicleIcon, LibraryIcon, CommunitiesIcon,
  LogoutIcon, SearchIcon, CloseIcon, OrnateStarIcon, ArrowRightIcon
} from './HistoricIcons';

/**
 * Drawer móvil "Más" que da acceso a las secciones secundarias
 * (Épocas, Efemérides, Crónicas, Biblioteca, Legados, Búsqueda, Salir).
 * Se activa con un botón ☰ que sólo aparece en mobile (en topbar).
 */
const MobileMoreDrawer = ({ open, onClose, onLogout }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const go = (path) => { navigate(path); onClose(); };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (q) go(`/explorar?q=${encodeURIComponent(q)}`);
  };

  const sections = [
    { id: 'epocas',    label: 'Épocas',     icon: TempleIcon,       path: '/epocas',     desc: 'Explora las eras' },
    { id: 'efemerides',label: 'Efemérides', icon: MapIcon,          path: '/efemerides', desc: 'Hoy en la historia' },
    { id: 'cronicas',  label: 'Crónicas',   icon: ChronicleIcon,    path: '/cronicas',   desc: 'Todos los relatos' },
    { id: 'documentos',label: 'Biblioteca', icon: LibraryIcon,      path: '/documentos', desc: 'Documentos visuales' },
    { id: 'legados',   label: 'Legados',    icon: CommunitiesIcon,  path: '/legados',    desc: 'Otros cronistas' }
  ];

  return (
    <div className="mobile-drawer-backdrop" onClick={onClose} data-testid="mobile-drawer-backdrop">
      <aside
        className="mobile-drawer"
        onClick={(e) => e.stopPropagation()}
        data-testid="mobile-drawer"
      >
        <div className="mobile-drawer-handle" />
        <header className="mobile-drawer-head">
          <div
            className="mobile-drawer-user"
            onClick={() => go(`/perfil/${user?._id || user?.id}`)}
          >
            <img src={getAvatarUrl(user)} alt={user?.nombre} className="mobile-drawer-avatar" />
            <div>
              <strong>{user?.nombre || 'Cronista'}</strong>
              <span>@{user?.usuario || ''}</span>
            </div>
            <ArrowRightIcon size={14} className="mobile-drawer-user-chevron" />
          </div>
          <button className="mobile-drawer-close" onClick={onClose} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </header>

        <form className="mobile-drawer-search" onSubmit={handleSearch}>
          <SearchIcon size={14} />
          <input
            type="search"
            placeholder="Buscar cronistas o crónicas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="mobile-drawer-search-input"
          />
        </form>

        <div className="mobile-drawer-section-label">
          <OrnateStarIcon size={10} /> Más del archivo
        </div>

        <nav className="mobile-drawer-nav">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                className="mobile-drawer-item"
                onClick={() => go(s.path)}
                data-testid={`mobile-drawer-${s.id}`}
              >
                <Icon size={22} />
                <div className="mobile-drawer-item-text">
                  <strong>{s.label}</strong>
                  <span>{s.desc}</span>
                </div>
                <ArrowRightIcon size={12} className="mobile-drawer-item-arrow" />
              </button>
            );
          })}
        </nav>

        <div className="mobile-drawer-footer">
          <button
            className="mobile-drawer-logout"
            onClick={() => { onLogout && onLogout(); onClose(); }}
            data-testid="mobile-drawer-logout"
          >
            <LogoutIcon size={16} /> Cerrar sesión
          </button>
          <span className="mobile-drawer-version">Chronos · archivo vivo</span>
        </div>
      </aside>
    </div>
  );
};

export default MobileMoreDrawer;
