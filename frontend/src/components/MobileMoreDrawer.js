import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/imageHelpers';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import haptic from '../utils/haptic';
import {
  TempleIcon, MapIcon, ChronicleIcon, LibraryIcon, CommunitiesIcon,
  LogoutIcon, SearchIcon, CloseIcon, OrnateStarIcon, ArrowRightIcon,
  HourglassIcon, SunIcon, MoonIcon, AutoThemeIcon
} from './HistoricIcons';

/**
 * Drawer móvil "Más" que da acceso a:
 *  - Búsqueda completa (cronistas + crónicas) con resultados inline
 *  - Secciones secundarias (Épocas, Efemérides, Crónicas, Biblioteca, Legados)
 *  - Cerrar sesión
 * Se activa con el botón ☰ o la lupa del topbar (sólo mobile).
 */
const MobileMoreDrawer = ({ open, onClose, onLogout }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pref: themePref, cyclePref } = useTheme();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState({ usuarios: [], relatos: [] });
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const themeIcon = themePref === 'light' ? SunIcon : (themePref === 'dark' ? MoonIcon : AutoThemeIcon);
  const themeLabel = themePref === 'light' ? 'Tema claro' : (themePref === 'dark' ? 'Tema oscuro' : 'Automático');
  const themeDesc = themePref === 'light' ? 'Pergamino · pulsa para cambiar'
                  : themePref === 'dark' ? 'Tinta · pulsa para cambiar'
                  : 'Cambia con la hora del día';
  const ThemeIcon = themeIcon;
  const handleThemeToggle = () => { haptic.light(); cyclePref(); };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => searchRef.current?.focus(), 320);
    } else {
      document.body.style.overflow = '';
      setSearch('');
      setResults({ usuarios: [], relatos: [] });
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Swipe-to-close: si el usuario desliza hacia la derecha sobre el drawer, cerramos
  useEffect(() => {
    if (!open) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    const drawerEl = document.querySelector('.mobile-drawer');
    if (!drawerEl) return;

    const onStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
      drawerEl.style.transition = 'none';
    };
    const onMove = (e) => {
      if (!tracking) return;
      const dx = e.touches[0].clientX - startX;
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > 0 && dy < 60) {
        drawerEl.style.transform = `translateX(${dx}px)`;
      }
    };
    const onEnd = (e) => {
      if (!tracking) return;
      tracking = false;
      drawerEl.style.transition = '';
      const dx = (e.changedTouches[0].clientX - startX);
      const dy = Math.abs(e.changedTouches[0].clientY - startY);
      if (dx > 80 && dy < 60) {
        drawerEl.style.transform = 'translateX(100%)';
        setTimeout(() => { onClose(); drawerEl.style.transform = ''; }, 180);
      } else {
        drawerEl.style.transform = '';
      }
    };

    drawerEl.addEventListener('touchstart', onStart, { passive: true });
    drawerEl.addEventListener('touchmove', onMove, { passive: true });
    drawerEl.addEventListener('touchend', onEnd);
    return () => {
      drawerEl.removeEventListener('touchstart', onStart);
      drawerEl.removeEventListener('touchmove', onMove);
      drawerEl.removeEventListener('touchend', onEnd);
    };
  }, [open, onClose]);

  // Búsqueda con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim() || search.trim().length < 2) {
      setResults({ usuarios: [], relatos: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/buscar?q=${encodeURIComponent(search.trim())}&limit=6`);
        setResults(res.data || { usuarios: [], relatos: [] });
      } catch (_) { /* silencioso */ }
      finally { setLoading(false); }
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [search]);

  if (!open) return null;

  const go = (path) => { navigate(path); onClose(); };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (q) go(`/explorar?q=${encodeURIComponent(q)}`);
  };
  const sections = [
    { id: 'misivas',   label: 'Misivas',    icon: CommunitiesIcon,  path: '/misivas',    desc: 'Mensajes privados' },
    { id: 'avisos',    label: 'Avisos',     icon: OrnateStarIcon,   path: '/avisos',     desc: 'Notificaciones' },
    { id: 'epocas',    label: 'Épocas',     icon: TempleIcon,       path: '/epocas',     desc: 'Explora las eras' },
    { id: 'efemerides',label: 'Efemérides', icon: MapIcon,          path: '/efemerides', desc: 'Hoy en la historia' },
    { id: 'legados',   label: 'Legados',    icon: LibraryIcon,      path: '/legados',    desc: 'Otros cronistas' }
  ];

  return createPortal(
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
            ref={searchRef}
            type="search"
            placeholder="Buscar cronistas o crónicas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="mobile-drawer-search-input"
          />
          {loading && <HourglassIcon size={14} className="spin" />}
        </form>

        {/* Resultados de búsqueda inline */}
        {search.trim().length >= 2 && (
          <div className="mobile-drawer-results" data-testid="mobile-drawer-results">
            {!loading && results.usuarios?.length === 0 && results.relatos?.length === 0 && (
              <div className="mobile-drawer-empty">Sin resultados para "{search}"</div>
            )}
            {results.usuarios?.length > 0 && (
              <>
                <div className="mobile-drawer-section-label">
                  <CommunitiesIcon size={10} /> Cronistas
                </div>
                {results.usuarios.map(u => (
                  <button
                    key={u._id}
                    className="mobile-drawer-result-row"
                    onClick={() => go(`/perfil/${u._id}`)}
                    data-testid={`mobile-search-user-${u._id}`}
                  >
                    <img src={getAvatarUrl(u)} alt={u.nombre} className="mobile-drawer-result-avatar" />
                    <div>
                      <strong>{u.nombre}</strong>
                      <span>@{u.usuario}</span>
                    </div>
                  </button>
                ))}
              </>
            )}
            {results.relatos?.length > 0 && (
              <>
                <div className="mobile-drawer-section-label">
                  <ChronicleIcon size={10} /> Crónicas
                </div>
                {results.relatos.map(r => (
                  <button
                    key={r._id}
                    className="mobile-drawer-result-row"
                    onClick={() => go(`/relato/${r._id}`)}
                    data-testid={`mobile-search-relato-${r._id}`}
                  >
                    <div className="mobile-drawer-result-relato-dot" />
                    <div>
                      <strong>{r.titulo}</strong>
                      <span>{r.categoria || 'Crónica histórica'}</span>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

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
            className="mobile-drawer-theme-toggle"
            onClick={handleThemeToggle}
            data-testid="mobile-drawer-theme-toggle"
            aria-label="Cambiar tema"
          >
            <ThemeIcon size={20} />
            <div className="mobile-drawer-theme-text">
              <strong>{themeLabel}</strong>
              <span>{themeDesc}</span>
            </div>
          </button>
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
    </div>,
    document.body
  );
};

export default MobileMoreDrawer;
