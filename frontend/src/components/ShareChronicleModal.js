import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getAvatarUrl } from '../utils/imageHelpers';
import {
  DoveScrollIcon, SearchIcon, HourglassIcon,
  CloseIcon, ArrowRightIcon, FeatherIcon
} from './HistoricIcons';

/**
 * Modal "Compartir crónica" — dos vías:
 *  1) Enviar como misiva privada a un cronista (búsqueda)
 *  2) Copiar el enlace al portapapeles
 *
 * Al elegir un destinatario, navega a /misivas/abrir/:userId?compartir=<relatoId>
 * para que MisivasPage pre-rellene el composer.
 */
const ShareChronicleModal = ({ relato, isOpen, onClose }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [sugeridos, setSugeridos] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const [loadingBuscar, setLoadingBuscar] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const enlace = typeof window !== 'undefined'
    ? `${window.location.origin}/relato/${relato?._id}`
    : '';

  // Cargar contactos sugeridos al abrir
  useEffect(() => {
    if (!isOpen) return;
    setQ('');
    setResultados([]);
    setCopiado(false);
    setLoadingSug(true);
    api.get('/misivas/contactos-sugeridos')
      .then(res => setSugeridos(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoadingSug(false));
  }, [isOpen]);

  // Búsqueda con debounce
  const buscar = useCallback(async (term) => {
    if (!term || term.trim().length < 2) {
      setResultados([]);
      return;
    }
    setLoadingBuscar(true);
    try {
      const res = await api.get(`/buscar?q=${encodeURIComponent(term)}&tipo=usuarios&limit=10`);
      setResultados(res.data.usuarios || []);
    } catch (err) {
      console.error(err);
    } finally { setLoadingBuscar(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscar(q), 250);
    return () => clearTimeout(t);
  }, [q, buscar]);

  const handleSeleccionar = (userId) => {
    navigate(`/misivas/abrir/${userId}?compartir=${relato._id}`);
    onClose();
  };

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) { console.error(err); }
  };

  if (!isOpen || !relato) return null;

  const listaMostrada = q.trim().length >= 2 ? resultados : sugeridos;
  const cargandoLista = q.trim().length >= 2 ? loadingBuscar : loadingSug;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      data-testid="share-chronicle-modal"
    >
      <div
        className="modal-content share-chronicle-modal"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>
            <DoveScrollIcon size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Compartir crónica
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="share-chronicle-relato" data-testid="share-relato-preview">
          <span className="share-chronicle-kicker">Crónica</span>
          <h3 className="share-chronicle-title">{relato.titulo}</h3>
          {relato.usuario_id?.nombre && (
            <span className="share-chronicle-author">
              de {relato.usuario_id.nombre}
            </span>
          )}
        </div>

        {/* COPIAR ENLACE */}
        <div className="share-chronicle-link-row">
          <input
            type="text"
            value={enlace}
            readOnly
            className="share-chronicle-link"
            data-testid="share-relato-link"
          />
          <button
            className="share-chronicle-copy-btn"
            onClick={handleCopiar}
            data-testid="share-copy-link-btn"
          >
            {copiado ? '✓ Copiado' : 'Copiar enlace'}
          </button>
        </div>

        <div className="share-chronicle-divider">
          <span>o envíala como misiva</span>
        </div>

        {/* BÚSQUEDA */}
        <div className="share-chronicle-search">
          <SearchIcon size={14} />
          <input
            type="text"
            placeholder="Busca un cronista por nombre o usuario..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="share-search-input"
            autoFocus
          />
        </div>

        {/* LISTA */}
        <div className="share-chronicle-list" data-testid="share-list">
          {cargandoLista ? (
            <div className="share-chronicle-empty">
              <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
                <HourglassIcon size={24} />
              </div>
            </div>
          ) : listaMostrada.length === 0 ? (
            <div className="share-chronicle-empty">
              {q.trim().length >= 2
                ? <p>No se encontraron cronistas con ese nombre.</p>
                : <p>Sigue a otros cronistas para verlos aquí, o busca por nombre arriba.</p>}
            </div>
          ) : (
            <>
              {q.trim().length < 2 && (
                <div className="share-chronicle-section-title">
                  <FeatherIcon size={11} /> Tus cronistas
                </div>
              )}
              {listaMostrada.map(u => (
                <button
                  key={u._id}
                  className="share-chronicle-row"
                  onClick={() => handleSeleccionar(u._id)}
                  data-testid={`share-to-${u._id}`}
                >
                  <img
                    className="share-chronicle-avatar"
                    src={getAvatarUrl(u)}
                    alt={u.nombre}
                  />
                  <div className="share-chronicle-info">
                    <span className="share-chronicle-name">{u.nombre}</span>
                    <span className="share-chronicle-meta">
                      @{u.usuario}
                      {u.tema_favorito && ` · ${u.tema_favorito}`}
                    </span>
                  </div>
                  <ArrowRightIcon size={12} className="share-chronicle-arrow" />
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareChronicleModal;
