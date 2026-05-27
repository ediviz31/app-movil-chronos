import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getAvatarUrl } from '../utils/imageHelpers';
import { SearchIcon, FeatherIcon, CloseIcon } from './HistoricIcons';

const SearchBar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ usuarios: [], relatos: [] });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('chronos_recent_search') || '[]');
    } catch { return []; }
  });
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Búsqueda con debounce
  const fetchResults = useCallback(async (term) => {
    if (!term || term.trim().length < 1) {
      setResults({ usuarios: [], relatos: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/buscar?q=${encodeURIComponent(term)}&limit=8`);
      setResults(res.data);
    } catch (err) {
      console.error('Error buscando:', err);
      setResults({ usuarios: [], relatos: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, fetchResults]);

  // Cerrar al click fuera
  useEffect(() => {
    const handle = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const saveRecent = (item) => {
    const next = [item, ...recent.filter(r => r.id !== item.id)].slice(0, 6);
    setRecent(next);
    localStorage.setItem('chronos_recent_search', JSON.stringify(next));
  };

  const clearRecent = () => {
    setRecent([]);
    localStorage.setItem('chronos_recent_search', '[]');
  };

  const removeRecent = (id, e) => {
    e.stopPropagation();
    const next = recent.filter(r => r.id !== id);
    setRecent(next);
    localStorage.setItem('chronos_recent_search', JSON.stringify(next));
  };

  const handleUserClick = (u) => {
    saveRecent({ id: u._id, kind: 'user', label: u.nombre, sub: `@${u.usuario}`, avatar: u.avatar, nombre: u.nombre });
    setIsOpen(false);
    setQuery('');
    navigate(`/perfil/${u._id}`);
  };

  const handleRelatoClick = (r) => {
    saveRecent({ id: r._id, kind: 'relato', label: r.titulo, sub: r.categoria });
    setIsOpen(false);
    setQuery('');
    // Por ahora navegamos al perfil del autor del relato
    if (r.usuario_id?._id) {
      navigate(`/perfil/${r.usuario_id._id}`);
    } else {
      navigate('/');
    }
  };

  const handleRecentClick = (item) => {
    setIsOpen(false);
    setQuery('');
    if (item.kind === 'user') {
      navigate(`/perfil/${item.id}`);
    } else if (item.kind === 'relato') {
      navigate('/');
    }
  };

  const showDropdown = isOpen;
  const hasResults = results.usuarios.length > 0 || results.relatos.length > 0;
  const hasQuery = query.trim().length > 0;

  return (
    <div className="search-wrapper" ref={wrapperRef} data-testid="search-wrapper">
      <div className={`archive-search ${isOpen ? 'is-open' : ''}`} data-testid="archive-search">
        <SearchIcon size={16} style={{ color: 'var(--gold)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar cronistas, crónicas, épocas..."
          data-testid="search-input"
        />
        {query && (
          <button
            className="search-clear-btn"
            onClick={() => { setQuery(''); setResults({ usuarios: [], relatos: [] }); }}
            data-testid="search-clear-btn"
            aria-label="Limpiar búsqueda"
          >
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="search-dropdown" data-testid="search-dropdown">
          {/* Si no hay query, mostrar recientes */}
          {!hasQuery && recent.length > 0 && (
            <div className="search-section">
              <div className="search-section-head">
                <span className="search-section-title">Búsquedas recientes</span>
                <button className="search-clear-link" onClick={clearRecent} data-testid="search-clear-recent">
                  Limpiar
                </button>
              </div>
              {recent.map((item) => (
                <button
                  key={`${item.kind}-${item.id}`}
                  className="search-result-row"
                  onClick={() => handleRecentClick(item)}
                  data-testid={`recent-${item.id}`}
                >
                  {item.kind === 'user' ? (
                    <div className="search-result-avatar">
                      <img src={getAvatarUrl({ nombre: item.nombre, avatar: item.avatar })} alt={item.label} />
                    </div>
                  ) : (
                    <div className="search-result-icon">
                      <FeatherIcon size={16} />
                    </div>
                  )}
                  <div className="search-result-text">
                    <div className="search-result-label">{item.label}</div>
                    <div className="search-result-sub">{item.sub}</div>
                  </div>
                  <button
                    className="search-result-remove"
                    onClick={(e) => removeRecent(item.id, e)}
                    aria-label="Quitar"
                  >
                    <CloseIcon size={12} />
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* Si no hay query y no hay recientes */}
          {!hasQuery && recent.length === 0 && (
            <div className="search-empty">
              <SearchIcon size={28} style={{ color: 'var(--gold)', opacity: 0.5 }} />
              <p>Comienza a escribir para buscar cronistas y crónicas</p>
            </div>
          )}

          {/* Loading */}
          {hasQuery && loading && (
            <div className="search-loading">
              <span className="search-dot"></span>
              <span className="search-dot"></span>
              <span className="search-dot"></span>
            </div>
          )}

          {/* Sin resultados */}
          {hasQuery && !loading && !hasResults && (
            <div className="search-empty">
              <p>No encontramos nada con "<strong>{query}</strong>"</p>
              <span className="search-empty-tip">Prueba con otro término</span>
            </div>
          )}

          {/* Resultados de USUARIOS */}
          {hasQuery && !loading && results.usuarios.length > 0 && (
            <div className="search-section">
              <div className="search-section-head">
                <span className="search-section-title">Cronistas</span>
                <span className="search-section-count">{results.usuarios.length}</span>
              </div>
              {results.usuarios.map((u) => (
                <button
                  key={u._id}
                  className="search-result-row"
                  onClick={() => handleUserClick(u)}
                  data-testid={`search-user-${u._id}`}
                >
                  <div className="search-result-avatar">
                    <img src={getAvatarUrl(u)} alt={u.nombre} />
                  </div>
                  <div className="search-result-text">
                    <div className="search-result-label">{highlightMatch(u.nombre, query)}</div>
                    <div className="search-result-sub">
                      @{u.usuario}{u.tema_favorito ? ` · ${u.tema_favorito}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Resultados de RELATOS */}
          {hasQuery && !loading && results.relatos.length > 0 && (
            <div className="search-section">
              <div className="search-section-head">
                <span className="search-section-title">Crónicas</span>
                <span className="search-section-count">{results.relatos.length}</span>
              </div>
              {results.relatos.map((r) => (
                <button
                  key={r._id}
                  className="search-result-row"
                  onClick={() => handleRelatoClick(r)}
                  data-testid={`search-relato-${r._id}`}
                >
                  <div className="search-result-icon">
                    <FeatherIcon size={16} />
                  </div>
                  <div className="search-result-text">
                    <div className="search-result-label">{highlightMatch(r.titulo, query)}</div>
                    <div className="search-result-sub">
                      {r.categoria}{r.usuario_id?.nombre ? ` · por ${r.usuario_id.nombre}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Resalta la coincidencia dentro del texto
function highlightMatch(text, query) {
  if (!text) return text;
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default SearchBar;
