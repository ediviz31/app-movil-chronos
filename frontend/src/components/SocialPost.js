import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import haptic from '../utils/haptic';
import { useAuth } from '../context/AuthContext';
import { getImageUrl, getAvatarUrl } from '../utils/imageHelpers';
import { CoinLaurelIcon, ParchmentIcon, DoveScrollIcon, ChestIcon, TabletDaggerIcon } from './HistoricIcons';
import HashtagText from './HashtagText';
import ShareChronicleModal from './ShareChronicleModal';
import CommentsSheet from './CommentsSheet';
import PresenceBadge from './PresenceBadge';
import NarrarBtn from './NarrarBtn';
import { buildHistoricTag } from '../utils/historicTime';

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
  const { user } = useAuth();
  const [dioEco, setDioEco] = useState(relato.usuario_dio_eco);
  const [totalEcos, setTotalEcos] = useState(relato.total_ecos);
  const [archivado, setArchivado] = useState(relato.usuario_archivado);
  const [totalComentarios, setTotalComentarios] = useState(relato.total_comentarios || 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [ecoBurst, setEcoBurst] = useState(false);

  const handleEco = async () => {
    const willActivate = !dioEco;
    // Optimistic UI + animación al instante
    setDioEco(willActivate);
    setTotalEcos(prev => willActivate ? prev + 1 : prev - 1);
    if (willActivate) {
      setEcoBurst(true);
      setTimeout(() => setEcoBurst(false), 900);
    }
    haptic.light();
    try {
      await api.post(`/ecos/${relato._id}`);
    } catch (e) {
      // Revertir si falla
      setDioEco(!willActivate);
      setTotalEcos(prev => willActivate ? prev - 1 : prev + 1);
      console.error(e);
    }
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
    // Mantenido por compatibilidad pero ya no se usa inline
    try {
      const response = await api.get(`/comentarios/${relato._id}`);
      return response.data;
    } catch (e) { return []; }
  }, [relato._id]);

  const toggleComments = () => {
    setCommentsOpen(true);
  };

  const handleCommentAdded = () => {
    setTotalComentarios(prev => prev + 1);
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
          {usuario?._id && <PresenceBadge userId={usuario._id} variant="dot" />}
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
          {(() => {
            const tag = buildHistoricTag({ anio: relato.historia_anio, lugar: relato.historia_lugar });
            return tag ? (
              <div className="social-post-historic-tag" data-testid={`historic-tag-${relato._id}`}>
                <span aria-hidden="true">◆</span> {tag}
              </div>
            ) : null;
          })()}
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

      {/* Video (exploración histórica) */}
      {relato.video_path && (
        <div className="social-post-video" data-testid={`video-${relato._id}`}>
          <video
            src={`${process.env.REACT_APP_BACKEND_URL || ''}${relato.video_path}`}
            controls
            preload="metadata"
            playsInline
            style={{ width: '100%', display: 'block', maxHeight: '420px', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Botón Escuchar narración (TTS) */}
      <div className="social-post-narrar-row">
        <NarrarBtn relatoId={relato._id} initialAudioPath={relato.audio_path} />
      </div>

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
          className={`social-action-btn ${dioEco ? 'active' : ''} ${ecoBurst ? 'eco-burst' : ''}`}
          data-testid={`btn-eco-${relato._id}`}
          title="Dar eco a este relato"
        >
          <CoinLaurelIcon size={20} />
          <span>Eco</span>
          {ecoBurst && (
            <span className="eco-stars" aria-hidden="true">
              <span className="eco-star eco-star-1">✦</span>
              <span className="eco-star eco-star-2">✧</span>
              <span className="eco-star eco-star-3">✦</span>
              <span className="eco-star eco-star-4">✧</span>
              <span className="eco-star eco-star-5">✦</span>
              <span className="eco-star eco-star-6">✧</span>
            </span>
          )}
        </button>
        <button
          onClick={toggleComments}
          className={`social-action-btn ${commentsOpen ? 'active' : ''}`}
          data-testid={`btn-valorar-${relato._id}`}
          title="Comentar"
        >
          <ParchmentIcon size={20} />
          <span>Aportar</span>
        </button>
        <button
          className="social-action-btn"
          data-testid={`btn-difundir-${relato._id}`}
          onClick={() => setShareOpen(true)}
          title="Compartir crónica"
        >
          <DoveScrollIcon size={20} />
          <span>Difundir</span>
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

      {/* Comentarios (bottom-sheet) */}
      <CommentsSheet
        relato={relato}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCommentAdded={handleCommentAdded}
        currentUserAvatar={getAvatarUrl(user)}
        currentUserName={user?.nombre || 'Cronista'}
        currentUserId={currentUserId}
      />

      <ShareChronicleModal
        relato={relato}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </article>
  );
};

export default SocialPost;
