import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import haptic from '../utils/haptic';
import { getAvatarUrl } from '../utils/imageHelpers';
import { CloseIcon, FeatherIcon, FleurDivider, ParchmentIcon } from './HistoricIcons';

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
 * Bottom-sheet de comentarios (Resonancias) estilo TikTok pero con estética Chronos.
 *  - Sube desde abajo con drag handle dorado
 *  - Backdrop translúcido (cierra al tap fuera)
 *  - Lista scrollable con avatares grandes, padding generoso, separación visible
 *  - Input sticky inferior con avatar pequeño + placeholder serif
 *  - Botón Enviar dorado pill, deshabilitado si vacío
 *  - Swipe-down sobre la cabecera cierra el sheet
 */
const CommentsSheet = ({ relato, isOpen, onClose, onCommentAdded, currentUserAvatar, currentUserName }) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const sheetRef = useRef(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/comentarios/${relato._id}`);
      setComments(r.data || []);
    } catch (e) { /* silencio */ }
    finally { setLoading(false); }
  }, [relato._id]);

  // Cargar al abrir + bloquear scroll del body
  useEffect(() => {
    if (!isOpen) return;
    fetchComments();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, fetchComments]);

  // Swipe-to-close sobre el header
  useEffect(() => {
    if (!isOpen) return;
    const handleEl = sheetRef.current?.querySelector('.comments-sheet-handle-area');
    if (!handleEl) return;
    let startY = 0;
    let tracking = false;
    const onStart = (e) => { startY = e.touches[0].clientY; tracking = true; sheetRef.current.style.transition = 'none'; };
    const onMove = (e) => {
      if (!tracking) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0) sheetRef.current.style.transform = `translateY(${dy}px)`;
    };
    const onEnd = (e) => {
      if (!tracking) return;
      tracking = false;
      sheetRef.current.style.transition = '';
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 100) { onClose(); }
      sheetRef.current.style.transform = '';
    };
    handleEl.addEventListener('touchstart', onStart, { passive: true });
    handleEl.addEventListener('touchmove', onMove, { passive: true });
    handleEl.addEventListener('touchend', onEnd);
    return () => {
      handleEl.removeEventListener('touchstart', onStart);
      handleEl.removeEventListener('touchmove', onMove);
      handleEl.removeEventListener('touchend', onEnd);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text || posting) return;
    setPosting(true);
    // Optimistic
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
      // Scroll al final
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      // Revertir optimistic
      setComments(prev => prev.filter(c => c._id !== tempId));
      setNewComment(text);
    } finally {
      setPosting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="comments-sheet-backdrop" onClick={onClose} data-testid="comments-sheet-backdrop">
      <div
        ref={sheetRef}
        className="comments-sheet"
        onClick={(e) => e.stopPropagation()}
        data-testid="comments-sheet"
      >
        {/* Cabecera con drag handle */}
        <div className="comments-sheet-handle-area">
          <div className="comments-sheet-handle" />
          <header className="comments-sheet-head">
            <span className="comments-sheet-kicker">
              <ParchmentIcon size={12} /> Sala Chronos
            </span>
            <h2 className="comments-sheet-title">Resonancias</h2>
            <button
              className="comments-sheet-close"
              onClick={onClose}
              data-testid="comments-sheet-close"
              aria-label="Cerrar"
            >
              <CloseIcon size={18} />
            </button>
          </header>
          <FleurDivider style={{ width: 60, opacity: 0.5, margin: '4px auto 0' }} />
        </div>

        {/* Lista de comentarios */}
        <div className="comments-sheet-list" ref={listRef} data-testid="comments-sheet-list">
          {loading && (
            <div className="comments-sheet-loading">Recopilando voces…</div>
          )}
          {!loading && comments.length === 0 && (
            <div className="comments-sheet-empty">
              <ParchmentIcon size={36} style={{ color: 'var(--gold)', opacity: 0.6 }} />
              <p>Sé el primero en valorar esta crónica.</p>
            </div>
          )}
          {comments.map(c => {
            const u = c.usuario_id;
            return (
              <div className="comments-sheet-item" key={c._id} data-testid={`comment-${c._id}`}>
                <button
                  className="comments-sheet-avatar"
                  onClick={() => u?._id && u._id !== 'me' && navigate(`/perfil/${u._id}`)}
                  aria-label={u?.nombre}
                >
                  <img src={getAvatarUrl(u)} alt={u?.nombre} />
                </button>
                <div className="comments-sheet-body">
                  <div className="comments-sheet-meta">
                    <strong>{u?.nombre || 'Cronista'}</strong>
                    <span className="comments-sheet-time">· {formatFechaRelativa(c.creado_en)}</span>
                  </div>
                  <div className="comments-sheet-text">{c.contenido}</div>
                </div>
              </div>
            );
          })}
          <div className="comments-sheet-bottom-spacer" />
        </div>

        {/* Form sticky de respuesta */}
        <form className="comments-sheet-form" onSubmit={handleSubmit}>
          <div className="comments-sheet-form-avatar">
            <img src={currentUserAvatar} alt={currentUserName} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Comparte tu valoración…"
            className="comments-sheet-form-input"
            data-testid="comments-sheet-input"
            maxLength={500}
          />
          <button
            type="submit"
            className="comments-sheet-form-send"
            disabled={posting || !newComment.trim()}
            data-testid="comments-sheet-send"
            aria-label="Enviar"
          >
            <FeatherIcon size={16} />
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CommentsSheet;
