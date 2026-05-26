import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

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
  const avatarSrc = usuario?.avatar?.startsWith('/uploads')
    ? `${process.env.REACT_APP_BACKEND_URL}${usuario.avatar}`
    : `https://api.dicebear.com/7.x/initials/svg?seed=${usuario?.nombre || 'U'}&backgroundColor=C6A75E`;

  const imagenSrc = relato.imagen?.startsWith('/uploads')
    ? `${process.env.REACT_APP_BACKEND_URL}${relato.imagen}`
    : relato.imagen;

  const esMiRelato = currentUserId && usuario?._id === currentUserId;

  return (
    <article className="post real-post" data-testid={`post-${relato._id}`}>
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
              <i className="ri-compass-3-line"></i>{relato.categoria}
            </Link>
          </strong>
          <small>@{usuario?.usuario} · {formatFecha(relato.creado_en)}</small>
        </div>
        <div className="post-menu">⋯</div>
      </div>

      <h2>
        <Link to={`/relato/${relato._id}`} className="story-title-link">
          {relato.titulo}
        </Link>
      </h2>

      <p>{relato.contenido.length > 460 ? relato.contenido.substring(0, 460) + '...' : relato.contenido}</p>

      {imagenSrc && (
        <Link to={`/relato/${relato._id}`} className="post-img" data-testid={`post-imagen-${relato._id}`}>
          <img src={imagenSrc} alt="Imagen del relato" />
        </Link>
      )}

      <div className="post-actions story-actions">
        <button
          onClick={handleEco}
          className={dioEco ? 'active-action' : ''}
          data-testid={`btn-eco-${relato._id}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <i className={dioEco ? 'ri-flashlight-fill' : 'ri-flashlight-line'}></i>
          {totalEcos} ecos
        </button>
        <Link to={`/relato/${relato._id}#comentarios`} data-testid={`btn-comentarios-${relato._id}`}>
          <i className="ri-chat-3-line"></i>
          {relato.total_comentarios} comentarios
        </Link>
        <Link to={`/relato/${relato._id}`} data-testid={`btn-ver-${relato._id}`}>
          <i className="ri-eye-line"></i> Ver completo
        </Link>
        <button
          onClick={handleArchivar}
          className={archivado ? 'active-action' : ''}
          data-testid={`btn-archivar-${relato._id}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <i className={archivado ? 'ri-bookmark-fill' : 'ri-bookmark-line'}></i>
          {archivado ? 'Archivado' : 'Archivo'}
        </button>
        {esMiRelato && (
          <button
            onClick={handleEliminar}
            className="danger-link"
            data-testid={`btn-eliminar-${relato._id}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <i className="ri-delete-bin-line"></i> Eliminar
          </button>
        )}
      </div>
    </article>
  );
};

export default Post;
