import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import haptic from '../utils/haptic';
import { getImageUrl, getAvatarUrl } from '../utils/imageHelpers';
import { CoinLaurelIcon, ParchmentIcon, DoveScrollIcon, ChestIcon, TabletDaggerIcon } from './HistoricIcons';
import HashtagText from './HashtagText';
import ShareChronicleModal from './ShareChronicleModal';

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

const SocialPost = ({ relato, currentUserId, onDelete }) => {
  const navigate = useNavigate();
  const [dioEco, setDioEco] = useState(relato.usuario_dio_eco);
  const [totalEcos, setTotalEcos] = useState(relato.total_ecos);
  const [archivado, setArchivado] = useState(relato.usuario_archivado);
  const [totalComentarios, setTotalComentarios] = useState(relato.total_comentarios || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const handleEco = async () => {
    try {
      await api.post(`/ecos/${relato._id}`);
      haptic.light();   // ✨ vibración al hacer eco
      setDioEco(!dioEco);
      setTotalEcos(dioEco ? totalEcos - 1 : totalEcos + 1);
    } catch (e) { console.error(e); }
  };

  const handleArchivar = async () => {
    try {
      await api.post(`/archivados/${relato._id}`);
      haptic.light();   // 📜 vibración al archivar
      setArchivado(!archivado);
    } catch (e) { console.error(e); }
  };

  const handleEliminar = async () => {
    if (!window.confirm('¿Eliminar esta crónica?')) return;
    try {
      await api.delete(`/relatos/${relato._id}`);
      if (onDelete) onDelete(relato._id);
    } catch (e) { console.error(e); }
  };

  const fetchComments = useCallback(async () => {
    try {
      const response = await api.get(`/comentarios/${relato._id}`);
      setComments(response.data);
    } catch (e) { console.error(e); }
  }, [relato._id]);

  const toggleComments = () => {
    if (!showComments) fetchComments();
    setShowComments(!showComments);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await api.post('/comentarios', {
        publicacion_id: relato._id,
        contenido: newComment.trim()
      });
      setNewComment('');
      setTotalComentarios(totalComentarios + 1);
      fetchComments();
    } catch (e) {
      console.error(e);
    } finally {
      setPosting(false);
    }
  };

  const usuario = relato.usuario_id;
  const avatarSrc = getAvatarUrl(usuario);
  const imagenSrc = getImageUrl(relato.imagen);
  const esMiRelato = currentUserId && usuario?._id === currentUserId;

  return (
    <article className="social-post" data-testid={`social-post-${relato._id}`}>
      {/* Header */}
      <div className="social-post-header">
        <div
          className="social-post-avatar"
          onClick={() => usuario?._id && navigate(`/perfil/${usuario._id}`)}
          style={{ cursor: usuario?._id ? 'pointer' : 'default' }}
        >
          <img src={avatarSrc} alt={usuario?.nombre} />
        </div>
        <div className="social-post-meta">
          <div
            className="social-post-author"
            onClick={() => usuario?._id && navigate(`/perfil/${usuario._id}`)}
            style={{ cursor: usuario?._id ? 'pointer' : 'default' }}
          >
            {usuario?.nombre}
            <span className="epoch-tag">{relato.categoria}</span>
          </div>
          <div className="social-post-info">
            <span>@{usuario?.usuario}</span>
            <span className="dot-sep"></span>
            <span>{formatFechaRelativa(relato.creado_en)}</span>
          </div>
        </div>
        {esMiRelato && (
          <button
            className="social-post-menu"
            onClick={handleEliminar}
            data-testid={`btn-eliminar-${relato._id}`}
            title="Romper esta tablilla"
          >
            <TabletDaggerIcon size={18} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="social-post-body">
        <h3
          className="social-post-title"
          data-testid={`title-${relato._id}`}
          onClick={() => navigate(`/relato/${relato._id}`)}
          style={{ cursor: 'pointer' }}
          title="Ver crónica completa"
        >
          {relato.titulo}
        </h3>
        <p className="social-post-content">
          <HashtagText text={relato.contenido} />
        </p>
      </div>

      {/* Imagen */}
      {imagenSrc && (
        <div
          className="social-post-image"
          onClick={() => navigate(`/relato/${relato._id}`)}
          style={{ cursor: 'pointer' }}
        >
          <img src={imagenSrc} alt={relato.titulo} onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
        </div>
      )}

      {/* Stats counter */}
      {(totalEcos > 0 || totalComentarios > 0) && (
        <div className="social-post-stats">
          {totalEcos > 0 && (
            <span className="social-post-stat">
              <strong>{totalEcos}</strong> ecos
            </span>
          )}
          {totalComentarios > 0 && (
            <span className="social-post-stat" onClick={toggleComments} style={{ cursor: 'pointer' }}>
              <strong>{totalComentarios}</strong> comentarios
            </span>
          )}
        </div>
      )}

      {/* Acciones - Iconografía oficial Chronos */}
      <div className="social-post-actions">
        <button
          onClick={handleEco}
          className={`social-action-btn ${dioEco ? 'active' : ''}`}
          data-testid={`btn-eco-${relato._id}`}
          title="Dar eco a este relato"
        >
          <CoinLaurelIcon size={20} />
          <span>Eco</span>
        </button>
        <button
          onClick={toggleComments}
          className={`social-action-btn ${showComments ? 'active' : ''}`}
          data-testid={`btn-valorar-${relato._id}`}
          title="Comentar"
        >
          <ParchmentIcon size={20} />
          <span>Comentar</span>
        </button>
        <button
          className="social-action-btn"
          data-testid={`btn-difundir-${relato._id}`}
          onClick={() => setShareOpen(true)}
          title="Compartir crónica"
        >
          <DoveScrollIcon size={20} />
          <span>Compartir</span>
        </button>
        <button
          onClick={handleArchivar}
          className={`social-action-btn ${archivado ? 'active' : ''}`}
          data-testid={`btn-preservar-${relato._id}`}
          title="Guardar en mi archivo"
        >
          <ChestIcon size={20} />
          <span>Archivar</span>
        </button>
      </div>

      {/* Comentarios */}
      {showComments && (
        <div className="comments-section" data-testid={`comments-${relato._id}`}>
          {comments.length > 0 && (
            <div className="comments-list">
              {comments.map(c => (
                <div key={c._id} className="comment-item">
                  <div className="comment-avatar">
                    <img src={getAvatarUrl(c.usuario_id)} alt={c.usuario_id?.nombre} />
                  </div>
                  <div className="comment-bubble">
                    <div className="comment-author">{c.usuario_id?.nombre}</div>
                    <div className="comment-text">{c.contenido}</div>
                    <div className="comment-date">{formatFechaRelativa(c.creado_en)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form className="comment-form" onSubmit={handleAddComment}>
            <input
              type="text"
              className="comment-form-input"
              placeholder="Comparte tu valoración..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              data-testid={`comment-input-${relato._id}`}
            />
            <button
              type="submit"
              className="comment-form-btn"
              disabled={posting || !newComment.trim()}
              data-testid={`comment-submit-${relato._id}`}
            >
              {posting ? '...' : 'Enviar'}
            </button>
          </form>
        </div>
      )}

      <ShareChronicleModal
        relato={relato}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </article>
  );
};

export default SocialPost;
