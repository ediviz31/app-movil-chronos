import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import {
  OrnateStarIcon, ChronicleIcon, CommunitiesIcon, ScrollIcon
} from './HistoricIcons';

/**
 * Sub-barra móvil que aparece debajo del topbar.
 * Contiene: buscador pill (full-width) + tabs de navegación principal.
 * Sólo visible en pantallas <= 900px (controlado por CSS).
 */
const MobileSubBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: '/',           label: 'Para ti',    Icon: OrnateStarIcon },
    { path: '/cronicas',   label: 'Crónicas',   Icon: ChronicleIcon  },
    { path: '/legados',    label: 'Legados',    Icon: CommunitiesIcon },
    { path: '/documentos', label: 'Documentos', Icon: ScrollIcon     }
  ];

  return (
    <div className="mobile-subbar" data-testid="mobile-subbar">
      <SearchBar />
      <nav className="mobile-tabs-nav" data-testid="mobile-tabs-nav">
        {tabs.map(t => {
          const Icon = t.Icon;
          const isActive = location.pathname === t.path;
          return (
            <a
              key={t.path}
              href={t.path}
              className={isActive ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); navigate(t.path); }}
              data-testid={`mobile-tab-${t.label.toLowerCase().replace(' ', '-')}`}
            >
              <Icon size={18} />
              <span>{t.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileSubBar;
