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

/** Tile masonry: imagen (si tiene) o primer frame del video o poster procedural. */
const BibliotecaTile = ({ relato, onOpen, onQuitar }) => {
  const tieneImagen = !!relato.imagen;
  const tieneVideo = !!relato.video_path;
  const autorNombre = relato.usuario?.nombre || relato.autor_nombre || 'Cronista';
  const fecha = relato.creado_en
    ? new Date(relato.creado_en).toLocaleDateString('es-ES', { year:'numeric', month:'short' })
    : '';

  // Determinar qué mostrar como portada visual:
  //  1) Imagen propia → es lo ideal
  //  2) Si tiene video pero no imagen → usar el primer frame del video
  //  3) Si no tiene ni imagen ni video → poster procedural con año/lugar
  const usarVideoComoPortada = !tieneImagen && tieneVideo;
  const usarPosterProcedural = !tieneImagen && !tieneVideo;

  // Color de fondo del poster procedural (determinístico)
  const seed = (relato.categoria || relato.titulo || 'chronos').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const posterPalettes = [
    ['#3a1f10', '#1a0d05'],
    ['#1a2438', '#0a1020'],
    ['#2a1838', '#100820'],
    ['#1f2e1f', '#0a1410'],
    ['#3a2a14', '#1a1208'],
    ['#2a1410', '#180806']
  ];
  const [c1, c2] = posterPalettes[seed % posterPalettes.length];

  return (
    <article
      className={`biblio-tile ${tieneImagen ? 'has-img' : (usarVideoComoPortada ? 'has-video' : 'has-poster')}`}
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

      {usarVideoComoPortada && (
        <div className="biblio-tile-media biblio-tile-media-video">
          {/* Mostramos el primer frame del video como portada. Lo precargamos
              sólo a metadata para no cargar todo el video. */}
          <video
            src={getImageUrl(relato.video_path)}
            muted
            playsInline
            preload="metadata"
            disablePictureInPicture
            tabIndex={-1}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            aria-hidden="true"
          />
          <span className="biblio-tile-vidbadge" aria-hidden="true">▶</span>
        </div>
      )}

      {usarPosterProcedural && (
        <div
          className="biblio-tile-poster"
          style={{ background: `linear-gradient(155deg, ${c1} 0%, ${c2} 100%)` }}
        >
          <div className="biblio-tile-poster-ornament" aria-hidden="true">◆</div>
          {relato.historia_anio && (
            <div className="biblio-tile-poster-year">{relato.historia_anio}</div>
          )}
          {relato.historia_lugar && (
            <div className="biblio-tile-poster-place">{relato.historia_lugar}</div>
          )}
          {!relato.historia_anio && !relato.historia_lugar && (
            <div className="biblio-tile-poster-mono">
              {(relato.titulo || 'C').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      <div className="biblio-tile-body">
        {relato.categoria && (
          <span className="biblio-tile-cat">{relato.categoria}</span>
        )}
        <h3 className="biblio-tile-title">{relato.titulo}</h3>
        {usarPosterProcedural && relato.contenido && (
          <p className="biblio-tile-preview">
            {relato.contenido.slice(0, 100)}{relato.contenido.length > 100 ? '…' : ''}
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
