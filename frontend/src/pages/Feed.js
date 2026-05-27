import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import SideRail from '../components/SideRail';
import TopbarArchive from '../components/TopbarArchive';
import ArchiveSidebar from '../components/ArchiveSidebar';
import ChronicleHero from '../components/ChronicleHero';
import ChronicleCard, { getYear } from '../components/ChronicleCard';
import CreateChronicleModal from '../components/CreateChronicleModal';
import { HourglassIcon, FleurDivider, FeatherIcon, OrnateStarIcon } from '../components/HistoricIcons';
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

  // Separar hero del resto
  const [hero, ...resto] = relatos;
  const currentUserId = user?._id || user?.id;

  // Asignar variantes a las tarjetas (pergamino cada 3era con contenido largo)
  const getVariant = (relato, idx) => {
    if (idx % 5 === 1 && relato.contenido.length > 100 && !relato.imagen) return 'parchment';
    return 'default';
  };

  return (
    <div className="archive-layout">
      <SideRail activeItem="inicio" onLogout={logout} />

      <div className="main-area">
        <TopbarArchive onCreate={() => setModalOpen(true)} />

        <main className="archive-feed" data-testid="archive-feed">
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
            >Legados que sigues</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
              <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
                <HourglassIcon size={40} />
              </div>
              <p style={{ marginTop: 16, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16 }}>
                Recopilando crónicas del archivo...
              </p>
            </div>
          ) : relatos.length === 0 ? (
            <div className="empty-archive" data-testid="empty-state">
              <FeatherIcon size={48} style={{ color: 'var(--gold)', margin: '0 auto' }} />
              <h3>{vista === 'siguiendo' ? 'Aún no sigues a ningún cronista' : 'El archivo aguarda tu primera crónica'}</h3>
              <p>
                {vista === 'siguiendo'
                  ? 'Sigue a otros cronistas para ver sus crónicas aquí.'
                  : 'Inicia el viaje a través del tiempo compartiendo tu primer relato histórico.'}
              </p>
              <button className="empty-archive-btn" onClick={() => setModalOpen(true)} data-testid="btn-empty-crear">
                <FeatherIcon size={14} /> Crear primera crónica
              </button>
            </div>
          ) : (
            <>
              {/* HERO */}
              {hero && (
                <div className="timeline-marker" data-testid="hero-timeline-item">
                  <div className="timeline-rail"></div>
                  <div className="timeline-year">
                    <div className="timeline-year-num">{getYear(hero.creado_en)}</div>
                    <div className="timeline-year-label">Hoy</div>
                  </div>
                  <div className="timeline-dot"></div>
                  <ChronicleHero relato={hero} />
                </div>
              )}

              {/* Grid de tarjetas con timeline */}
              {resto.length > 0 && (
                <>
                  {/* Primera fila de 3 */}
                  {resto.slice(0, 3).length > 0 && (
                    <div className="timeline-marker">
                      <div className="timeline-rail" style={{ left: 30 }}></div>
                      <div className="timeline-year">
                        <div className="timeline-year-num">{getYear(resto[0].creado_en)}</div>
                        <div className="timeline-year-label">Recientes</div>
                      </div>
                      <div className="timeline-dot"></div>
                      <div className="chronicles-grid">
                        {resto.slice(0, 3).map((relato, idx) => (
                          <ChronicleCard
                            key={relato._id}
                            relato={relato}
                            currentUserId={currentUserId}
                            onDelete={handleDeleteRelato}
                            variant={getVariant(relato, idx)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Segunda fila de 3 si hay más */}
                  {resto.slice(3, 6).length > 0 && (
                    <div className="timeline-marker">
                      <div className="timeline-year">
                        <div className="timeline-year-num">{getYear(resto[3].creado_en)}</div>
                        <div className="timeline-year-label">Archivo</div>
                      </div>
                      <div className="timeline-dot"></div>
                      <div className="chronicles-grid">
                        {resto.slice(3, 6).map((relato, idx) => (
                          <ChronicleCard
                            key={relato._id}
                            relato={relato}
                            currentUserId={currentUserId}
                            onDelete={handleDeleteRelato}
                            variant={getVariant(relato, idx + 3)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Footer ornamental */}
              <div className="archive-timeline-bar">
                <FleurDivider />
              </div>

              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button onClick={() => setModalOpen(true)} className="empty-archive-btn" data-testid="btn-crear-fab">
                  <FeatherIcon size={14} /> Crear nueva crónica
                </button>
              </div>
            </>
          )}
        </main>

        <ArchiveSidebar />
      </div>

      <CreateChronicleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleNewRelato}
      />
    </div>
  );
};

export default Feed;
