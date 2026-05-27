import React from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl, getAvatarUrl } from '../utils/imageHelpers';
import { RibbonBookmark, SealIcon, ArrowRightIcon } from './HistoricIcons';

const ChronicleHero = ({ relato }) => {
  const usuario = relato.usuario_id;
  const imagenSrc = getImageUrl(relato.imagen);
  const avatarSrc = getAvatarUrl(usuario);
  const year = new Date(relato.creado_en).getFullYear();

  return (
    <article className="chronicle-hero" data-testid="chronicle-hero">
      <div className="chronicle-hero-content">
        <span className="chronicle-label">Crónica Destacada</span>
        <h2>{relato.titulo}</h2>
        <div className="chronicle-date">{year}</div>
        <p>{relato.contenido.length > 180 ? relato.contenido.substring(0, 180) + '...' : relato.contenido}</p>

        <Link to={`/relato/${relato._id}`} className="chronicle-cta">
          Explorar crónica <ArrowRightIcon size={14} />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border-thin)' }}>
          <div className="author-avatar" style={{ width: 32, height: 32 }}>
            <img src={avatarSrc} alt={usuario?.nombre} />
          </div>
          <div>
            <div className="author-name">{usuario?.nombre}</div>
            <div className="author-date">{new Date(relato.creado_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>
      </div>

      <div className="chronicle-hero-image">
        <div className="hero-ribbon">
          <RibbonBookmark size={32} />
        </div>
        {imagenSrc ? (
          <img src={imagenSrc} alt={relato.titulo} onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, var(--gold-ghost), transparent)' }}>
            <SealIcon size={120} />
          </div>
        )}
        <div className="hero-seal">
          <SealIcon size={72} />
        </div>
      </div>
    </article>
  );
};

export default ChronicleHero;
