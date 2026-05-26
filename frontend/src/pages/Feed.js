import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import Rightbar from '../components/Rightbar';
import Post from '../components/Post';
import CreateRelatoModal from '../components/CreateRelatoModal';
import api from '../services/api';

const Feed = () => {
  const { user } = useAuth();
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
      console.error('Error al cargar relatos:', error);
    } finally {
      setLoading(false);
    }
  }, [vista]);

  useEffect(() => {
    fetchRelatos();
  }, [fetchRelatos]);

  const handleNewRelato = (nuevoRelato) => {
    const relatoConStats = {
      ...nuevoRelato,
      total_ecos: 0,
      total_comentarios: 0,
      total_archivos: 0,
      usuario_dio_eco: false,
      usuario_archivado: false
    };
    setRelatos([relatoConStats, ...relatos]);
  };

  const handleDeleteRelato = (relatoId) => {
    setRelatos(relatos.filter(r => r._id !== relatoId));
  };

  const avatarSrc = user?.avatar?.startsWith('/uploads')
    ? `${process.env.REACT_APP_BACKEND_URL}${user.avatar}`
    : `https://api.dicebear.com/7.x/initials/svg?seed=${user?.nombre || 'U'}&backgroundColor=C6A75E`;

  return (
    <>
      <Topbar />
      <main className="shell">
        <Sidebar onCreateRelato={() => setModalOpen(true)} />

        <section className="feed" data-testid="feed-main">
          <div className="feed-head">
            <div>
              <span className="kicker"><i className="ri-quill-pen-line"></i> Sala Chronos</span>
              <h1>Línea del tiempo</h1>
              <p>Relatos, hallazgos y fragmentos del pasado compartidos por la comunidad.</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="head-btn"
              data-testid="btn-crear-relato-head"
              style={{ border: '1px solid var(--gold-primary)', background: 'rgba(198, 167, 94, 0.1)', cursor: 'pointer' }}
            >
              <i className="ri-quill-pen-line"></i> Crear relato
            </button>
          </div>

          <section className="composer composer-chronos" data-testid="composer">
            <button
              onClick={() => setModalOpen(true)}
              className="composer-entry"
              data-testid="composer-button"
              style={{ width: '100%', border: '1px solid var(--border-subtle)', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
            >
              <img className="mini-avatar" src={avatarSrc} alt="" />
              <span className="composer-copy">
                <span className="composer-label">Nuevo legado</span>
                <strong>¿Qué historia quieres compartir hoy?</strong>
                <small>Escribe un relato, agrega una imagen y compártelo en la línea del tiempo.</small>
              </span>
              <span className="composer-cta">
                <i className="ri-quill-pen-line"></i> Crear relato
              </span>
            </button>
          </section>

          <nav className="feed-tabs-v136" aria-label="Vista de la línea del tiempo" data-testid="feed-tabs">
            <a
              href="#todos"
              onClick={(e) => { e.preventDefault(); setVista('todos'); }}
              className={vista === 'todos' ? 'active' : ''}
              data-testid="tab-todos"
            >
              <i className="ri-global-line"></i> Todos los relatos
            </a>
            <a
              href="#siguiendo"
              onClick={(e) => { e.preventDefault(); setVista('siguiendo'); }}
              className={vista === 'siguiendo' ? 'active' : ''}
              data-testid="tab-siguiendo"
            >
              <i className="ri-user-follow-line"></i> Legados que sigues
            </a>
          </nav>

          {loading ? (
            <div className="panel" style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <i className="ri-loader-4-line ri-spin" style={{ fontSize: '32px', color: 'var(--gold-primary)' }}></i>
              <p style={{ marginTop: '16px' }}>Cargando relatos...</p>
            </div>
          ) : relatos.length > 0 ? (
            <>
              {relatos.map(relato => (
                <Post
                  key={relato._id}
                  relato={relato}
                  currentUserId={user?._id || user?.id}
                  onDelete={handleDeleteRelato}
                />
              ))}
            </>
          ) : (
            <section className="empty-feed-state panel" data-testid="empty-state">
              <span className="kicker">
                <i className="ri-book-open-line"></i> {vista === 'siguiendo' ? 'Sin relatos' : 'Primer legado'}
              </span>
              <h3>{vista === 'siguiendo' ? 'Aún no hay relatos de los legados que sigues' : 'Aún no hay relatos publicados'}</h3>
              <p>
                {vista === 'siguiendo'
                  ? 'Cuando los autores que sigues publiquen nuevas historias, aparecerán aquí.'
                  : 'Cuando la comunidad empiece a compartir historias, aparecerán aquí. Puedes iniciar la línea del tiempo con tu primer relato.'}
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="head-btn"
                data-testid="btn-empty-crear"
                style={{ display: 'inline-flex', margin: '12px auto 0', cursor: 'pointer' }}
              >
                <i className="ri-quill-pen-line"></i> Crear primer relato
              </button>
            </section>
          )}
        </section>

        <Rightbar />
      </main>

      <CreateRelatoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleNewRelato}
      />
    </>
  );
};

export default Feed;
