import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getImageUrl, getAvatarUrl } from '../utils/imageHelpers';
import {
  IconEcho, IconChat, IconEye, IconBookmark, IconDelete, IconCompass
} from './Icons';

// Esquina ornamental SVG
const CornerOrnament = ({ position }) => (
  <svg
    className={`post-corner-${position}`}
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    style={{ color: 'var(--gold-primary)' }}
  >
    <path d="M2 2 L10 2 M2 2 L2 10" />
    <path d="M2 14 Q2 8 8 6" strokeDasharray="1 2" opacity="0.6" />
    <circle cx="2" cy="2" r="1.5" fill="currentColor" />
  </svg>
);

const Post = ({ relato, currentUserId, onDelete }) => {
  const [dioEco, setDioEco] = useState(relato.usuario_dio_eco);
  const [totalEcos, setTotalEcos] = useState(relato.total_ecos);
  const [archivado, setArchivado] = useState(relato.usuario_archivado);

  const handleEco = async () => {
    try {
      await api.post(`/ecos/${relato._id}`);
      setDioEco(!dioEco);
      setTotalEcos(dioEco ? totalEcos - 1 : totalEcos + 1);
    } catch (error) {
      console.error('Error al dar eco:', error);
    }
  };

  const handleArchivar = async () => {
    try {
      await api.post(`/archivados/${relato._id}`);
      setArchivado(!archivado);
    } catch (error) {
      console.error('Error al archivar:', error);
    }
  };

  const handleEliminar = async () => {
    if (!window.confirm('¿Estás seguro de eliminar este relato?')) return;
    try {
      await api.delete(`/relatos/${relato._id}`);
      if (onDelete) onDelete(relato._id);
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };

  const formatFecha = (fecha) => {
    const date = new Date(fecha);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHrs < 24) return `Hace ${diffHrs} h`;
    if (diffDias < 7) return `Hace ${diffDias} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const usuario = relato.usuario_id;
  const avatarSrc = getAvatarUrl(usuario);
  const imagenSrc = getImageUrl(relato.imagen);
  const esMiRelato = currentUserId && usuario?._id === currentUserId;

  return (
    <article className="post real-post" data-testid={`post-${relato._id}`}>
      <CornerOrnament position="tl" />
      <CornerOrnament position="tr" />
      <CornerOrnament position="bl" />
      <CornerOrnament position="br" />

      <div className="post-head">
        <Link to={`/perfil/${usuario?._id}`} className="author-mini-link">
          <img className="post-user-img" src={avatarSrc} alt={usuario?.nombre} />
        </Link>
        <div style={{ flex: 1 }}>
          <strong>
            <Link to={`/perfil/${usuario?._id}`} className="author-name-link">
              {usuario?.nombre}
            </Link>
            <Link to={`/rutas?categoria=${encodeURIComponent(relato.categoria)}`} className="route-chip-link">
              <IconCompass width={12} height={12} />{relato.categoria}
            </Link>
          </strong>
          <small>@{usuario?.usuario} · {formatFecha(relato.creado_en)}</small>
        </div>
        <div className="post-menu" style={{ cursor: 'pointer', userSelect: 'none' }}>⋯</div>
      </div>

      <h2>
        <Link to={`/relato/${relato._id}`} className="story-title-link">
          {relato.titulo}
        </Link>
      </h2>

      <p>{relato.contenido.length > 460 ? relato.contenido.substring(0, 460) + '...' : relato.contenido}</p>

      {imagenSrc && (
        <Link to={`/relato/${relato._id}`} className="post-img" data-testid={`post-imagen-${relato._id}`}>
          <img src={imagenSrc} alt="Imagen del relato" onError={(e) => { e.target.style.display = 'none'; }} />
        </Link>
      )}

      <div className="post-actions story-actions">
        <button
          onClick={handleEco}
          className={dioEco ? 'active-action' : ''}
          data-testid={`btn-eco-${relato._id}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <IconEcho width={16} height={16} />
          {totalEcos} ecos
        </button>
        <Link to={`/relato/${relato._id}#comentarios`} data-testid={`btn-comentarios-${relato._id}`}>
          <IconChat width={16} height={16} />
          {relato.total_comentarios} comentarios
        </Link>
        <Link to={`/relato/${relato._id}`} data-testid={`btn-ver-${relato._id}`}>
          <IconEye width={16} height={16} /> Ver completo
        </Link>
        <button
          onClick={handleArchivar}
          className={archivado ? 'active-action' : ''}
          data-testid={`btn-archivar-${relato._id}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <IconBookmark width={16} height={16} fill={archivado ? 'currentColor' : 'none'} />
          {archivado ? 'Archivado' : 'Archivo'}
        </button>
        {esMiRelato && (
          <button
            onClick={handleEliminar}
            className="danger-link"
            data-testid={`btn-eliminar-${relato._id}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <IconDelete width={16} height={16} /> Eliminar
          </button>
        )}
      </div>
    </article>
  );
};

export default Post;
