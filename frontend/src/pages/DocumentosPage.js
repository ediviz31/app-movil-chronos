/**
 * Biblioteca / Archivo personal — vista tipo galería Pinterest (masonry).
 * Muestra las crónicas que el cronista archivó, ordenadas en columnas
 * con alturas variables según el contenido (imagen + título). Al tocar
 * una tarjeta, abre el detalle de la crónica.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageShell from '../components/PageShell';
import { ChestIcon, HourglassIcon } from '../components/HistoricIcons';
import { getImageUrl, getAvatarUrl } from '../utils/imageHelpers';
import haptic from '../utils/haptic';

const DocumentosPage = () => {
  const navigate = useNavigate();
  const [relatos, setRelatos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/archivados');
        const list = (res.data || []).filter(Boolean);
        setRelatos(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleQuitar = async (e, id) => {
    e.stopPropagation();
    haptic.light();
    try {
      await api.post(`/archivados/${id}`); // toggle quita
      setRelatos(rs => rs.filter(r => r._id !== id));
    } catch (_) { /* silencioso */ }
  };

  return (
    <PageShell activeRail="biblioteca" showMobileSubBar={false}>
      <main className="biblioteca-page" data-testid="documentos-page">
        <header className="biblioteca-header">
          <div className="biblioteca-kicker">
            <ChestIcon size={12} /> Mi archivo personal
          </div>
          <h1 className="biblioteca-title">Biblioteca</h1>
          <p className="biblioteca-sub">
            Las crónicas que has guardado para volver a ellas
            {relatos.length > 0 && <> · <strong>{relatos.length} preservadas</strong></>}
          </p>
        </header>

        {loading ? (
          <div className="biblioteca-loading">
            <span className="spin" style={{ color: 'var(--gold)' }}><HourglassIcon size={32} /></span>
            <p>Abriendo el cofre…</p>
          </div>
        ) : relatos.length === 0 ? (
          <div className="biblioteca-empty">
            <ChestIcon size={42} style={{ color: 'var(--gold)' }} />
            <h3>Tu cofre está vacío</h3>
            <p>Cuando archives una crónica, aparecerá aquí esperándote.</p>
          </div>
        ) : (
          <div className="biblioteca-masonry" data-testid="biblioteca-grid">
            {relatos.map(r => (
              <BibliotecaTile
                key={r._id}
                relato={r}
                onOpen={() => { haptic.light(); navigate(`/relato/${r._id}`); }}
                onQuitar={(e) => handleQuitar(e, r._id)}
              />
            ))}
          </div>
        )}
      </main>
    </PageShell>
  );
};

/** Tile masonry: imagen (si tiene) + título + autor. Alturas variables. */
const BibliotecaTile = ({ relato, onOpen, onQuitar }) => {
  const tieneImagen = !!relato.imagen;
  const tieneVideo = !!relato.video_path;
  const autorNombre = relato.usuario?.nombre || relato.autor_nombre || 'Cronista';
  const fecha = relato.creado_en
    ? new Date(relato.creado_en).toLocaleDateString('es-ES', { year:'numeric', month:'short' })
    : '';

  return (
    <article
      className={`biblio-tile ${tieneImagen ? 'has-img' : 'text-only'}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
      data-testid={`biblio-tile-${relato._id}`}
    >
      {tieneImagen && (
        <div className="biblio-tile-media">
          <img
            src={getImageUrl(relato.imagen)}
            alt={relato.titulo}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          {tieneVideo && (
            <span className="biblio-tile-vidbadge" aria-hidden="true">▶</span>
          )}
        </div>
      )}
      <div className="biblio-tile-body">
        {relato.categoria && (
          <span className="biblio-tile-cat">{relato.categoria}</span>
        )}
        <h3 className="biblio-tile-title">{relato.titulo}</h3>
        {!tieneImagen && relato.contenido && (
          <p className="biblio-tile-preview">
            {relato.contenido.slice(0, 140)}{relato.contenido.length > 140 ? '…' : ''}
          </p>
        )}
        <div className="biblio-tile-foot">
          <div className="biblio-tile-author">
            {relato.usuario?.avatar ? (
              <img
                src={getAvatarUrl(relato.usuario)}
                alt={autorNombre}
                className="biblio-tile-avatar"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <span className="biblio-tile-avatar biblio-tile-avatar-letter">
                {autorNombre[0]?.toUpperCase() || '·'}
              </span>
            )}
            <span className="biblio-tile-author-name">{autorNombre}</span>
          </div>
          {fecha && <span className="biblio-tile-date">{fecha}</span>}
        </div>
      </div>
      <button
        type="button"
        className="biblio-tile-quitar"
        onClick={onQuitar}
        aria-label="Quitar del archivo"
        title="Quitar del archivo"
        data-testid={`biblio-quitar-${relato._id}`}
      >
        <ChestIcon size={13} />
      </button>
    </article>
  );
};

export default DocumentosPage;
