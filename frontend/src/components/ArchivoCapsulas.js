/**
 * "Mi Pasado en Cápsulas" — archivo permanente de cápsulas vencidas (>24h)
 * Se muestra en el perfil del cronista. Estilo grid pergamino con relieve.
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { HourglassIcon, ChronicleIcon } from './HistoricIcons';
import { yearToCentury } from '../utils/historicTime';
import { getImageUrl } from '../utils/imageHelpers';

const formatFechaCapsula = (fecha) => {
  try {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch (_) { return ''; }
};

const ArchivoCapsulas = ({ usuarioId, esMiPerfil }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get(`/capsulas/archivo/${usuarioId}`)
      .then(res => { if (mounted) setItems(res.data || []); })
      .catch(e => console.error('Error archivo capsulas:', e))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [usuarioId]);

  if (loading) {
    return (
      <div className="archivo-capsulas-empty" data-testid="archivo-loading">
        <span className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
          <HourglassIcon size={28} />
        </span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="archivo-capsulas-empty" data-testid="archivo-empty">
        <ChronicleIcon size={42} style={{ color: 'var(--gold)', margin: '0 auto', opacity: 0.55 }} />
        <h3>
          {esMiPerfil
            ? 'Aún no tienes cápsulas selladas'
            : 'Este cronista no tiene cápsulas en su archivo'}
        </h3>
        <p>
          {esMiPerfil
            ? 'Las cápsulas que crees se sellarán aquí cuando pasen 24 horas. Tu legado breve, preservado para siempre.'
            : 'Las cápsulas del cronista aún están en su rail activo.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="archivo-capsulas-grid" data-testid="archivo-capsulas-grid">
        {items.map((c) => {
          const century = yearToCentury(c.anio);
          const subtitle = [century, c.lugar].filter(Boolean).join(' · ');
          return (
            <button
              type="button"
              key={c._id}
              className="archivo-capsula-card"
              onClick={() => setSelected(c)}
              data-testid={`archivo-capsula-${c._id}`}
            >
              {c.imagen ? (
                <img src={getImageUrl(c.imagen)} alt="" className="archivo-capsula-bg" />
              ) : (
                <div className="archivo-capsula-bg archivo-capsula-bg-empty">
                  <HourglassIcon size={28} style={{ color: 'var(--gold)', opacity: 0.45 }} />
                </div>
              )}
              <div className="archivo-capsula-overlay">
                <p className="archivo-capsula-text">{c.texto}</p>
                {subtitle && <div className="archivo-capsula-tag">{subtitle}</div>}
                <div className="archivo-capsula-date">{formatFechaCapsula(c.creado_en)}</div>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className="archivo-capsula-modal-backdrop"
          onClick={() => setSelected(null)}
          data-testid="archivo-capsula-modal"
        >
          <div className="archivo-capsula-modal" onClick={(e) => e.stopPropagation()}>
            {selected.imagen && (
              <img src={getImageUrl(selected.imagen)} alt="" className="archivo-capsula-modal-img" />
            )}
            <div className="archivo-capsula-modal-body">
              <div className="archivo-capsula-modal-kicker">
                <HourglassIcon size={12} /> Cápsula sellada · {formatFechaCapsula(selected.creado_en)}
              </div>
              <p className="archivo-capsula-modal-text">{selected.texto}</p>
              {(selected.anio || selected.lugar) && (
                <div className="archivo-capsula-modal-tag">
                  {[yearToCentury(selected.anio), selected.lugar].filter(Boolean).join(' · ')}
                </div>
              )}
              <button
                type="button"
                className="archivo-capsula-modal-close"
                onClick={() => setSelected(null)}
                data-testid="archivo-capsula-modal-close"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ArchivoCapsulas;
