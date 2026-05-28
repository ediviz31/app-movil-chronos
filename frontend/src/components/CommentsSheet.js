import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import haptic from '../utils/haptic';
import { getAvatarUrl } from '../utils/imageHelpers';
import PresenceBadge from './PresenceBadge';
import { usePresence } from '../context/PresenceContext';
import { CloseIcon, FeatherIcon, ParchmentIcon } from './HistoricIcons';

const formatFechaRelativa = (fecha) => {
  const date = new Date(fecha);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  if (diffHrs < 24) return `hace ${diffHrs}h`;
  if (diffDias < 7) return `hace ${diffDias}d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

/**
 * Resonancias en formato PERGAMINO que se despliega.
 * - Rodillos dorados arriba y abajo (SVG)
 * - Fondo papel envejecido con grano y manchas de tinta
 * - Ornamentos en las 4 esquinas
 * - Tinta sepia, tipografía serif elegante
 * - Cada comentario aparece desde arriba, secuencialmente
 * - Indicador "en línea" con pulso animado junto al nombre
 */
const CommentsSheet = ({ relato, isOpen, onClose, onCommentAdded, currentUserAvatar, currentUserName, currentUserId }) => {
  const navigate = useNavigate();
  const { isOnline } = usePresence();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState([]);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const sheetRef = useRef(null);
  const lastTypingPingRef = useRef(0);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/comentarios/${relato._id}`);
      setComments(r.data || []);
    } catch (e) { /* silencio */ }
    finally { setLoading(false); }
  }, [relato._id]);

  useEffect(() => {
    if (!isOpen) return;
    fetchComments();
    document.body.style.overflow = 'hidden';
    const pollTyping = async () => {
      try {
        const r = await api.get(`/presencia/escribiendo/${relato._id}`);
        setTyping(r.data?.escribiendo || []);
      } catch (_) {}
    };
    pollTyping();
    const typingInterval = setInterval(pollTyping, 3000);
    const commentsInterval = setInterval(fetchComments, 8000);
    return () => {
      document.body.style.overflow = '';
      clearInterval(typingInterval);
      clearInterval(commentsInterval);
    };
  }, [isOpen, fetchComments, relato._id]);

  const handleInputChange = (e) => {
    setNewComment(e.target.value);
    const now = Date.now();
    if (e.target.value.trim() && now - lastTypingPingRef.current > 2500) {
      lastTypingPingRef.current = now;
      api.post(`/presencia/escribiendo/${relato._id}`).catch(() => {});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text || posting) return;
    setPosting(true);
    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      _id: tempId,
      contenido: text,
      creado_en: new Date().toISOString(),
      usuario_id: { nombre: currentUserName, avatar: currentUserAvatar, _id: 'me' }
    };
    setComments(prev => [...prev, optimistic]);
    setNewComment('');
    try {
      await api.post('/comentarios', { publicacion_id: relato._id, contenido: text });
      haptic.light();
      onCommentAdded && onCommentAdded();
      fetchComments();
      setTimeout(() => {
        listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setComments(prev => prev.filter(c => c._id !== tempId));
      setNewComment(text);
    } finally {
      setPosting(false);
    }
  };

  if (!isOpen) return null;

  // Comentarios en orden cronológico: más recientes ARRIBA (estilo pergamino)
  const sortedComments = [...comments].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));

  return createPortal(
    <div className="pergamino-backdrop" onClick={onClose} data-testid="comments-sheet-backdrop">
      <div
        ref={sheetRef}
        className="pergamino-wrap"
        onClick={(e) => e.stopPropagation()}
        data-testid="comments-sheet"
      >
        {/* Rodillo superior */}
        <div className="pergamino-roller pergamino-roller-top" aria-hidden="true">
          <svg viewBox="0 0 400 28" preserveAspectRatio="none" width="100%" height="100%">
            <defs>
              <linearGradient id="rollerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8a6628" />
                <stop offset="40%" stopColor="#e8c97e" />
                <stop offset="60%" stopColor="#d4b878" />
                <stop offset="100%" stopColor="#6b4a18" />
              </linearGradient>
            </defs>
            <rect x="0" y="6" width="400" height="16" fill="url(#rollerGrad)" />
            <circle cx="14" cy="14" r="13" fill="#6b4a18" stroke="#e8c97e" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="5" fill="#3d2a0e" />
            <circle cx="386" cy="14" r="13" fill="#6b4a18" stroke="#e8c97e" strokeWidth="1.5" />
            <circle cx="386" cy="14" r="5" fill="#3d2a0e" />
          </svg>
        </div>

        {/* Pergamino cuerpo */}
        <div className="pergamino-body">
          {/* Ornamentos esquinas */}
          <span className="pergamino-corner pergamino-corner-tl" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M2 14 Q2 2 14 2 M2 14 Q6 6 14 6" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            </svg>
          </span>
          <span className="pergamino-corner pergamino-corner-tr" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M38 14 Q38 2 26 2 M38 14 Q34 6 26 6" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="32" cy="8" r="1.5" fill="currentColor" />
            </svg>
          </span>
          <span className="pergamino-corner pergamino-corner-bl" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M2 26 Q2 38 14 38 M2 26 Q6 34 14 34" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="8" cy="32" r="1.5" fill="currentColor" />
            </svg>
          </span>
          <span className="pergamino-corner pergamino-corner-br" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M38 26 Q38 38 26 38 M38 26 Q34 34 26 34" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="32" cy="32" r="1.5" fill="currentColor" />
            </svg>
          </span>

          {/* Cabecera */}
          <div className="pergamino-head">
            <span className="pergamino-kicker">
              <ParchmentIcon size={12} /> Sala Chronos · Resonancias
            </span>
            <h2 className="pergamino-title">Resonancias del archivo</h2>
            <p className="pergamino-subtitle">
              {comments.length === 0
                ? 'Aún sin ecos en este pergamino'
                : `${comments.length} ${comments.length === 1 ? 'voz se ha alzado' : 'voces se han alzado'} aquí`}
            </p>
            <button
              className="pergamino-close"
              onClick={onClose}
              data-testid="comments-sheet-close"
              aria-label="Enrollar pergamino"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* Divisor flor */}
          <div className="pergamino-divider" aria-hidden="true">
            <span className="pergamino-divider-line" />
            <span className="pergamino-divider-mark">✦</span>
            <span className="pergamino-divider-line" />
          </div>

          {/* Lista (orden inverso: nuevos arriba) */}
          <div className="pergamino-list" ref={listRef} data-testid="comments-sheet-list">
            {/* Typing indicator arriba (lo más reciente) */}
            {typing.length > 0 && (
              <div className="pergamino-typing" data-testid="typing-indicator">
                <span className="pergamino-typing-dots">
                  <span></span><span></span><span></span>
                </span>
                <span className="pergamino-typing-name">
                  {typing.length === 1
                    ? `${typing[0].nombre} traza su pluma…`
                    : `${typing[0].nombre} y ${typing.length - 1} más trazan sus plumas…`}
                </span>
              </div>
            )}

            {loading && comments.length === 0 && (
              <div className="pergamino-loading">Recopilando voces del archivo…</div>
            )}

            {!loading && comments.length === 0 && (
              <div className="pergamino-empty">
                <ParchmentIcon size={42} style={{ color: 'var(--sepia-deep, #6b4a18)', opacity: 0.5 }} />
                <p>Sé la primera pluma en resonar.</p>
                <p style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  Escribe abajo y verás tu aporte ascender en el pergamino.
                </p>
              </div>
            )}

            {sortedComments.map((c, idx) => {
              const u = c.usuario_id;
              const isSelf = u?._id && (u._id === 'me' || (currentUserId && String(u._id) === String(currentUserId)));
              const online = !isSelf && u?._id && isOnline(u._id);
              return (
                <article
                  className={`pergamino-entry ${idx === 0 ? 'pergamino-entry-new' : ''}`}
                  key={c._id}
                  data-testid={`comment-${c._id}`}
                >
                  <span className="pergamino-quill" aria-hidden="true">
                    <FeatherIcon size={14} />
                  </span>
                  <div className="pergamino-entry-body">
                    <div className="pergamino-entry-head">
                      <button
                        className="pergamino-entry-avatar"
                        onClick={() => u?._id && !isSelf && navigate(`/perfil/${u._id}`)}
                        aria-label={u?.nombre}
                        type="button"
                      >
                        <img src={getAvatarUrl(u)} alt={u?.nombre} />
                        {!isSelf && u?._id && <PresenceBadge userId={u._id} variant="dot" />}
                      </button>
                      <div className="pergamino-entry-meta">
                        <strong className="pergamino-entry-name">
                          {u?.nombre || 'Cronista'}
                          {online && (
                            <span className="pergamino-online" data-testid={`pergamino-online-${u._id}`}>
                              <span className="pergamino-online-dot" />
                              <span className="pergamino-online-text">en línea</span>
                            </span>
                          )}
                        </strong>
                        <span className="pergamino-entry-time">{formatFechaRelativa(c.creado_en)}</span>
                      </div>
                    </div>
                    <p className="pergamino-entry-text">{c.contenido}</p>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Form sticky de respuesta */}
          <form className="pergamino-form" onSubmit={handleSubmit}>
            <div className="pergamino-form-avatar">
              <img src={currentUserAvatar} alt={currentUserName} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={handleInputChange}
              placeholder="Escribe tu aporte con pluma…"
              className="pergamino-form-input"
              data-testid="comments-sheet-input"
              maxLength={500}
            />
            <button
              type="submit"
              className="pergamino-form-send"
              disabled={posting || !newComment.trim()}
              data-testid="comments-sheet-send"
              aria-label="Sellar resonancia"
              title="Sellar resonancia"
            >
              <FeatherIcon size={16} />
            </button>
          </form>
        </div>

        {/* Rodillo inferior */}
        <div className="pergamino-roller pergamino-roller-bottom" aria-hidden="true">
          <svg viewBox="0 0 400 28" preserveAspectRatio="none" width="100%" height="100%">
            <rect x="0" y="6" width="400" height="16" fill="url(#rollerGrad)" />
            <circle cx="14" cy="14" r="13" fill="#6b4a18" stroke="#e8c97e" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="5" fill="#3d2a0e" />
            <circle cx="386" cy="14" r="13" fill="#6b4a18" stroke="#e8c97e" strokeWidth="1.5" />
            <circle cx="386" cy="14" r="5" fill="#3d2a0e" />
          </svg>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CommentsSheet;
