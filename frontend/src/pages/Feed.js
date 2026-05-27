import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import SideRail from '../components/SideRail';
import TopbarArchive from '../components/TopbarArchive';
import ArchiveSidebar from '../components/ArchiveSidebar';
import SocialPost from '../components/SocialPost';
import CreateChronicleModal from '../components/CreateChronicleModal';
import { HourglassIcon, FeatherIcon, OrnateStarIcon, PlusOrnateIcon, ScrollIcon, MapIcon } from '../components/HistoricIcons';
import { getAvatarUrl } from '../utils/imageHelpers';
import api from '../services/api';

const Feed = () => {
  const { user, logout } = useAuth();
  const [relatos, setRelatos] = useState([]);
  const [vista, setVista] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchRelatos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/relatos?vista=${vista}`);
      setRelatos(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [vista]);

  useEffect(() => { fetchRelatos(); }, [fetchRelatos]);

  const handleNewRelato = (nuevo) => {
    setRelatos([{ ...nuevo, total_ecos: 0, total_comentarios: 0, total_archivos: 0, usuario_dio_eco: false, usuario_archivado: false }, ...relatos]);
  };

  const handleDeleteRelato = (id) => {
    setRelatos(relatos.filter(r => r._id !== id));
  };

  const currentUserId = user?._id || user?.id;
  const userAvatar = getAvatarUrl(user);
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buen día';
    if (hour < 19) return 'Buena tarde';
    return 'Buena noche';
  })();

  return (
    <div className="archive-layout">
      <SideRail activeItem="inicio" onLogout={logout} />

      <div className="main-area">
        <TopbarArchive onCreate={() => setModalOpen(true)} />

        <main className="archive-feed" data-testid="archive-feed">

          {/* Saludo / Header del feed */}
          <div className="feed-greeting" data-testid="feed-greeting">
            <div className="feed-greeting-kicker">
              <OrnateStarIcon size={12} />
              Sala Chronos
            </div>
            <h1>{greeting}, {user?.nombre?.split(' ')[0] || 'Cronista'}</h1>
            <p>Comparte un fragmento del pasado o descubre las historias de hoy</p>
          </div>

          {/* COMPOSER - Crear publicación */}
          <div className="social-composer" data-testid="social-composer">
            <div className="composer-row">
              <div className="composer-avatar">
                <img src={userAvatar} alt={user?.nombre} />
              </div>
              <button
                className="composer-input"
                onClick={() => setModalOpen(true)}
                data-testid="composer-input-btn"
              >
                ¿Qué historia quieres compartir hoy, {user?.nombre?.split(' ')[0]}?
              </button>
            </div>
            <div className="composer-actions">
              <div className="composer-quick-actions">
                <button className="composer-quick-btn" onClick={() => setModalOpen(true)} data-testid="quick-imagen">
                  <ScrollIcon size={16} /> Imagen
                </button>
                <button className="composer-quick-btn" onClick={() => setModalOpen(true)} data-testid="quick-epoca">
                  <MapIcon size={16} /> Época
                </button>
                <button className="composer-quick-btn" onClick={() => setModalOpen(true)} data-testid="quick-relato">
                  <FeatherIcon size={16} /> Relato
                </button>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="composer-publish-btn"
                data-testid="composer-publish-btn"
              >
                Publicar
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="archive-tabs" data-testid="archive-tabs">
            <button
              className={`archive-tab ${vista === 'todos' ? 'active' : ''}`}
              onClick={() => setVista('todos')}
              data-testid="tab-todos"
            >Para ti</button>
            <button
              className={`archive-tab ${vista === 'siguiendo' ? 'active' : ''}`}
              onClick={() => setVista('siguiendo')}
              data-testid="tab-siguiendo"
            >Siguiendo</button>
          </div>

          {/* Lista de posts */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
                <HourglassIcon size={36} />
              </div>
              <p style={{ marginTop: 14, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15 }}>
                Recopilando crónicas...
              </p>
            </div>
          ) : relatos.length === 0 ? (
            <div className="empty-archive" data-testid="empty-state">
              <FeatherIcon size={48} style={{ color: 'var(--gold)', margin: '0 auto' }} />
              <h3>{vista === 'siguiendo' ? 'Aún no sigues a ningún cronista' : 'El archivo aguarda tu primera crónica'}</h3>
              <p>
                {vista === 'siguiendo'
                  ? 'Sigue cronistas para ver sus crónicas aquí.'
                  : 'Comparte el primer relato y abre la línea del tiempo.'}
              </p>
              <button className="empty-archive-btn" onClick={() => setModalOpen(true)} data-testid="btn-empty-crear">
                <FeatherIcon size={14} /> Crear crónica
              </button>
            </div>
          ) : (
            <div data-testid="posts-list">
              {relatos.map(relato => (
                <SocialPost
                  key={relato._id}
                  relato={relato}
                  currentUserId={currentUserId}
                  onDelete={handleDeleteRelato}
                />
              ))}
            </div>
          )}
        </main>

        <ArchiveSidebar />
      </div>

      {/* FAB - Floating Action Button */}
      <button
        className="floating-create"
        onClick={() => setModalOpen(true)}
        data-testid="fab-create"
        title="Crear crónica"
      >
        <FeatherIcon size={24} />
      </button>

      <CreateChronicleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleNewRelato}
      />
    </div>
  );
};

export default Feed;
