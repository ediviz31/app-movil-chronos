/**
 * Página Fragmentos del Tiempo — Reels históricos.
 * Filtros por categoría arriba, feed scroll vertical de FragmentoCards.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PageShell from '../components/PageShell';
import FragmentoCard from '../components/FragmentoCard';
import CreateFragmentoModal from '../components/CreateFragmentoModal';

const FILTROS = [
  { id: 'all', label: 'Todos', ico: '◈' },
  { id: 'historia_local', label: 'Historia local', ico: '▣' },
  { id: 'personajes', label: 'Personajes', ico: '☼' },
  { id: 'lugares', label: 'Lugares', ico: '◉' },
  { id: 'documentos', label: 'Documentos', ico: '⌑' }
];

const Fragmentos = () => {
  const { user } = useAuth();
  const location = useLocation();
  const myId = user?._id || user?.id;
  const [filtro, setFiltro] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState(null);

  // Soporte para ?nuevo=1 (abre el modal de creación al entrar)
  // y ?focus=<id> (hace scroll al fragmento específico)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('nuevo') === '1') setCreateOpen(true);
    const focusId = params.get('focus');
    if (focusId) {
      // Esperamos al primer render con datos
      const t = setTimeout(() => {
        const el = document.querySelector(`[data-testid="fragmento-${focusId}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 800);
      return () => clearTimeout(t);
    }
  }, [location.search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filtro !== 'all' ? `?categoria=${filtro}` : '';
      const res = await api.get(`/fragmentos${params}`);
      const list = (res.data?.items || []).map(f => ({
        ...f,
        es_mio: String(f.usuario_id?._id || f.usuario_id) === String(myId)
      }));
      setItems(list);
    } catch (e) {
      console.error('Error fetch fragmentos:', e);
      setError('No se pudieron cargar los fragmentos. Toca para reintentar.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filtro, myId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreated = (nuevo) => {
    setItems(prev => [{ ...nuevo, es_mio: true }, ...prev]);
    setCreateOpen(false);
  };
  const handleDeleted = (id) => {
    setItems(prev => prev.filter(f => f._id !== id));
  };

  return (
    <PageShell activeRail="fragmentos" showFab={false}>
      <main className="fragmentos-page" data-testid="fragmentos-page">
        <header className="fragmentos-header">
          <div className="fragmentos-kicker">◆ Chronos ◆</div>
          <h1 className="fragmentos-title">Fragmentos del Tiempo</h1>
          <p className="fragmentos-sub">Memorias en movimiento · entra con respeto</p>
        </header>

        {/* Filtros */}
        <div className="fragmentos-filters" role="tablist">
          {FILTROS.map(f => (
            <button
              key={f.id}
              type="button"
              className={`fragmentos-filter ${filtro === f.id ? 'is-active' : ''}`}
              onClick={() => setFiltro(f.id)}
              data-testid={`fragmentos-filter-${f.id}`}
            >
              <span aria-hidden="true">{f.ico}</span> {f.label}
            </button>
          ))}
        </div>

        {/* Botón Crear */}
        {user && (
          <button
            type="button"
            className="fragmentos-create-cta"
            onClick={() => setCreateOpen(true)}
            data-testid="fragmentos-create-cta"
          >
            <span className="fragmentos-create-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                  d="M14.5 3.5 L20.5 9.5 L9 21 L3 21 L3 15 Z"
                  fill="none" stroke="currentColor" strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path d="M13 5 L19 11" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </span>
            <span className="fragmentos-create-text">
              <strong>Preservar un fragmento</strong>
              <small>graba o sube un video histórico</small>
            </span>
            <span className="fragmentos-create-arrow" aria-hidden="true">›</span>
          </button>
        )}

        {/* Feed */}
        {loading ? (
          <div className="fragmentos-empty">
            <p>Cargando fragmentos…</p>
          </div>
        ) : error ? (
          <div className="fragmentos-empty" data-testid="fragmentos-error">
            <div className="fragmentos-empty-ico" aria-hidden="true">⚠</div>
            <h3>{error}</h3>
            <button
              type="button"
              className="fragmentos-create-cta"
              style={{ marginTop: 16 }}
              onClick={fetchData}
              data-testid="fragmentos-retry"
            >
              <span className="fragmentos-create-ico" aria-hidden="true">↻</span>
              <span className="fragmentos-create-text">
                <strong>Reintentar</strong>
                <small>cargar fragmentos</small>
              </span>
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="fragmentos-empty" data-testid="fragmentos-empty">
            <div className="fragmentos-empty-ico" aria-hidden="true">⌛</div>
            <h3>Aún no hay fragmentos en esta categoría</h3>
            <p>Sé el primero en preservar un fragmento del tiempo.</p>
          </div>
        ) : (
          <div className="fragmentos-feed">
            {items.map(f => (
              <FragmentoCard
                key={f._id}
                fragmento={f}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}

        <div className="fragmentos-foot">
          <span className="fragmentos-foot-quill" aria-hidden="true">✎</span>
          Recordar es conservar. Compartir es preservar.
          <span className="fragmentos-foot-quill" aria-hidden="true">✎</span>
        </div>

        <CreateFragmentoModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      </main>
    </PageShell>
  );
};

export default Fragmentos;
