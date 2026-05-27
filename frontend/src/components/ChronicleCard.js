import React, { useState } from 'react';
import api from '../services/api';
import { getImageUrl, getAvatarUrl } from '../utils/imageHelpers';
import { EchoIcon, ValueIcon, ShareIcon, PreserveIcon } from './HistoricIcons';

const formatFecha = (fecha) => {
  const date = new Date(fecha);
  const now = new Date();
  const diffMs = now - date;
  const diffDias = Math.floor(diffMs / 86400000);
  if (diffDias < 1) return 'Hoy';
  if (diffDias < 7) return `Hace ${diffDias} día${diffDias > 1 ? 's' : ''}`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getYear = (fecha) => {
  return new Date(fecha).getFullYear();
};

const ChronicleCard = ({ relato, currentUserId, onDelete, variant = 'default' }) => {
  const [dioEco, setDioEco] = useState(relato.usuario_dio_eco);
  const [totalEcos, setTotalEcos] = useState(relato.total_ecos);
  const [archivado, setArchivado] = useState(relato.usuario_archivado);
  const [totalArchivos, setTotalArchivos] = useState(relato.total_archivos || 0);

  const handleEco = async (e) => {
    e.stopPropagation();
    try {
      await api.post(`/ecos/${relato._id}`);
      setDioEco(!dioEco);
      setTotalEcos(dioEco ? totalEcos - 1 : totalEcos + 1);
    } catch (error) { console.error(error); }
  };

  const handleArchivar = async (e) => {
    e.stopPropagation();
    try {
      await api.post(`/archivados/${relato._id}`);
      setArchivado(!archivado);
      setTotalArchivos(archivado ? totalArchivos - 1 : totalArchivos + 1);
    } catch (error) { console.error(error); }
  };

  const handleEliminar = async (e) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar esta crónica?')) return;
    try {
      await api.delete(`/relatos/${relato._id}`);
      if (onDelete) onDelete(relato._id);
    } catch (error) { console.error(error); }
  };

  const usuario = relato.usuario_id;
  const avatarSrc = getAvatarUrl(usuario);
  const imagenSrc = getImageUrl(relato.imagen);
  const esMiRelato = currentUserId && usuario?._id === currentUserId;

  return (
    <article className={`chronicle-card ${variant}`} data-testid={`chronicle-${relato._id}`}>
      {imagenSrc && variant !== 'parchment' && (
        <div className="chronicle-card-image">
          <img src={imagenSrc} alt={relato.titulo} onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
        </div>
      )}

      <div className="chronicle-card-body">
        <div className="chronicle-card-meta">
          <span className="chronicle-category">{relato.categoria}</span>
        </div>

        <h3>{relato.titulo}</h3>

        <p>{relato.contenido}</p>

        <div className="chronicle-author">
          <div className="author-avatar">
            <img src={avatarSrc} alt={usuario?.nombre} />
          </div>
          <div className="author-info">
            <div className="author-name">{usuario?.nombre}</div>
            <div className="author-date">{formatFecha(relato.creado_en)}</div>
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button
          onClick={handleEco}
          className={`card-action ${dioEco ? 'active' : ''}`}
          data-testid={`btn-eco-${relato._id}`}
        >
          <EchoIcon size={14} />
          <span>Eco {totalEcos}</span>
        </button>
        <button className="card-action" data-testid={`btn-valorar-${relato._id}`}>
          <ValueIcon size={14} />
          <span>Valorar {relato.total_comentarios || 0}</span>
        </button>
        <button className="card-action" data-testid={`btn-difundir-${relato._id}`}>
          <ShareIcon size={14} />
          <span>Difundir</span>
        </button>
        <span className="card-action-spacer"></span>
        <button
          onClick={handleArchivar}
          className={`card-action ${archivado ? 'active' : ''}`}
          data-testid={`btn-preservar-${relato._id}`}
        >
          <PreserveIcon size={14} fill={archivado ? 'currentColor' : 'none'} />
        </button>
        {esMiRelato && (
          <button
            onClick={handleEliminar}
            className="card-action"
            data-testid={`btn-eliminar-${relato._id}`}
            style={{ color: '#E57373' }}
            title="Eliminar"
          >
            ✕
          </button>
        )}
      </div>
    </article>
  );
};

export { formatFecha, getYear };
export default ChronicleCard;
