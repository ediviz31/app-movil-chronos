import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageShell from '../components/PageShell';
import { getAvatarUrl } from '../utils/imageHelpers';
import { playChronosTestChime } from '../utils/chronosSound';
import {
  HornHeraldIcon, HourglassIcon, OrnateStarIcon,
  CoinLaurelIcon, ParchmentIcon, ChestIcon, CommunitiesIcon
} from '../components/HistoricIcons';

const formatRel = (fecha) => {
  const d = new Date(fecha);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86400) return `hace ${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const ICON_BY_TIPO = {
  eco: CoinLaurelIcon,
  comentario: ParchmentIcon,
  respuesta: ParchmentIcon,
  seguidor: CommunitiesIcon,
  archivo: ChestIcon
};

const TEXT_BY_TIPO = {
  eco: 'dio eco a tu crónica',
  comentario: 'comentó tu crónica',
  respuesta: 'respondió tu comentario',
  seguidor: 'es ahora parte de tu legado',
  archivo: 'archivó tu crónica'
};

const AvisosPage = () => {
  const navigate = useNavigate();
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos'); // todos | no-leidos

  const fetchAvisos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/avisos?limit=60');
      setAvisos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvisos();
    // Al entrar a la página, marcar todo como leído tras 1.5s
    const timer = setTimeout(async () => {
      try {
        await api.post('/avisos/marcar-leidos');
        setAvisos(prev => prev.map(a => ({ ...a, leida: true })));
      } catch (err) { /* silent */ }
    }, 1500);
    return () => clearTimeout(timer);
  }, [fetchAvisos]);

  const handleAvisoClick = async (aviso) => {
    // Marcar como leído individualmente y navegar
    try {
      if (!aviso.leida) {
        await api.post(`/avisos/${aviso._id}/leido`);
        setAvisos(prev => prev.map(a => a._id === aviso._id ? { ...a, leida: true } : a));
      }
    } catch (err) { /* silent */ }

    // Navegación según tipo
    if (aviso.tipo === 'seguidor') {
      navigate(`/perfil/${aviso.actor_id._id}`);
    } else if (aviso.publicacion_id?._id) {
      navigate(`/relato/${aviso.publicacion_id._id}`);
    }
  };

  const visibles = filter === 'no-leidos'
    ? avisos.filter(a => !a.leida)
    : avisos;

  return (
    <PageShell activeRail="">
      <main className="archive-listing-page avisos-page" data-testid="avisos-page">
        <header className="listing-header">
          <div className="listing-header-text">
            <div className="listing-kicker">
              <HornHeraldIcon size={14} /> Heraldo del Archivo
            </div>
            <h1 className="listing-title">Avisos</h1>
            <p className="listing-subtitle">
              El cuerno del heraldo resuena cuando algo nuevo ocurre en tu legado.
              Aquí descansan los mensajes que merecen tu atención.
            </p>
          </div>
          <button
            className="listing-stat-pill"
            onClick={playChronosTestChime}
            data-testid="test-sound-btn"
            style={{ cursor: 'pointer', border: '1px solid var(--gold-soft)' }}
            title="Escuchar el sonido del aviso"
          >
            <HornHeraldIcon size={14} /> Probar sonido
          </button>
        </header>

        <div className="archive-tabs" style={{ marginBottom: 24 }}>
          <button
            className={`archive-tab ${filter === 'todos' ? 'active' : ''}`}
            onClick={() => setFilter('todos')}
            data-testid="avisos-filter-todos"
          >Todos</button>
          <button
            className={`archive-tab ${filter === 'no-leidos' ? 'active' : ''}`}
            onClick={() => setFilter('no-leidos')}
            data-testid="avisos-filter-no-leidos"
          >No leídos</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
              <HourglassIcon size={36} />
            </div>
          </div>
        ) : visibles.length === 0 ? (
          <div className="listing-empty">
            <HornHeraldIcon size={48} style={{ color: 'var(--gold)' }} />
            <h3>
              {filter === 'no-leidos'
                ? 'Estás al día con todos los avisos'
                : 'El cuerno aún no ha sonado'}
            </h3>
            <p>
              {filter === 'no-leidos'
                ? 'No quedan avisos sin leer en tu archivo.'
                : 'Cuando un cronista interactúe con tu legado, te avisaremos aquí.'}
            </p>
          </div>
        ) : (
          <div className="avisos-list" data-testid="avisos-list">
            {visibles.map(aviso => {
              const Icon = ICON_BY_TIPO[aviso.tipo] || OrnateStarIcon;
              const verboTexto = TEXT_BY_TIPO[aviso.tipo] || 'interactuó';
              return (
                <button
                  key={aviso._id}
                  className={`aviso-row ${aviso.leida ? '' : 'unread'}`}
                  onClick={() => handleAvisoClick(aviso)}
                  data-testid={`aviso-${aviso._id}`}
                >
                  <div className="aviso-avatar">
                    <img src={getAvatarUrl(aviso.actor_id)} alt={aviso.actor_id?.nombre} />
                    <div className="aviso-tipo-icon">
                      <Icon size={12} />
                    </div>
                  </div>
                  <div className="aviso-body">
                    <div className="aviso-text">
                      <strong>{aviso.actor_id?.nombre || 'Un cronista'}</strong>{' '}
                      <span>{verboTexto}</span>
                      {aviso.resumen && (
                        <>{' '}
                          <em className="aviso-snippet">«{aviso.resumen.slice(0, 60)}{aviso.resumen.length > 60 ? '…' : ''}»</em>
                        </>
                      )}
                    </div>
                    <div className="aviso-time">{formatRel(aviso.creado_en)}</div>
                  </div>
                  {!aviso.leida && <span className="aviso-dot" data-testid={`aviso-dot-${aviso._id}`}></span>}
                </button>
              );
            })}
          </div>
        )}
      </main>
    </PageShell>
  );
};

export default AvisosPage;
