import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import TopbarArchive from './TopbarArchive';
import MobileSubBar from './MobileSubBar';
import SideRail from './SideRail';
import CreateChronicleModal from './CreateChronicleModal';
import PushOptInBanner from './PushOptInBanner';
import { FeatherIcon } from './HistoricIcons';

/**
 * Cascarón de layout común para todas las páginas internas.
 * Renderiza: topbar + sub-bar mobile (search+tabs) + bottom nav + área principal (children) + FAB.
 *
 * Props:
 *  - activeRail: id del item del SideRail a marcar activo
 *  - children: contenido de la página
 *  - onChronicleCreated?: callback opcional cuando se crea una crónica nueva
 *  - showFab?: boolean (default true)
 *  - showMobileSubBar?: boolean (default true) — oculta la sub-bar en mobile (útil en /misivas, /mi-legado donde queda redundante)
 */
const PageShell = ({
  activeRail = '',
  children,
  onChronicleCreated,
  showFab = true,
  showMobileSubBar = true
}) => {
  const { logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="archive-layout">
      <TopbarArchive onCreate={() => setModalOpen(true)} />
      {showMobileSubBar && <MobileSubBar />}
      <SideRail activeItem={activeRail} onLogout={logout} />

      <div className="main-area">
        {children}
      </div>

      {showFab && (
        <button
          className="floating-create"
          onClick={() => setModalOpen(true)}
          data-testid="fab-create"
          title="Crear crónica"
        >
          <FeatherIcon size={24} />
        </button>
      )}

      <CreateChronicleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(nuevo) => {
          setModalOpen(false);
          onChronicleCreated && onChronicleCreated(nuevo);
        }}
      />

      <PushOptInBanner />
    </div>
  );
};

export default PageShell;
