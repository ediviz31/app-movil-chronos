/**
 * Página catálogo de Visitas Virtuales 360°.
 * Grid de tarjetas con thumbnail, lugar, época, año, descripción.
 * Filtros por época.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopbarArchive from '../components/TopbarArchive';
import api from '../services/api';
import { GlobeIcon, MapIcon } from '../components/HistoricIcons';
import VisitaVirtualButton from '../components/VisitaVirtualButton';
import { yearToCentury } from '../utils/historicTime';

const EPOCAS = ['Todas', 'Antigüedad', 'Grecia clásica', 'Roma imperial', 'Asia antigua', 'América precolombina', 'Edad Media', 'Edad Moderna', 'Edad Contemporánea'];

const Visitas = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Todas');

  useEffect(() => {
    setLoading(true);
    api.get('/visitas')
      .then(r => setItems(r.data?.items || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filtro === 'Todas'
    ? items
    : items.filter(v => v.epoca === filtro);

  return (
    <div className="visitas-page" data-testid="visitas-page">
      <TopbarArchive />
      <main className="visitas-main">
        <header className="visitas-header">
          <div className="visitas-header-kicker">
            <GlobeIcon size={14} /> Archivo Vivo
          </div>
          <h1>Visitas Virtuales 360°</h1>
          <p>Recorre los lugares emblemáticos del pasado sin salir del Archivo. Cada visita te conecta con una era.</p>
        </header>

        <div className="visitas-filtros" data-testid="visitas-filtros">
          {EPOCAS.map(e => (
            <button
              key={e}
              type="button"
              className={`visitas-filtro ${filtro === e ? 'is-active' : ''}`}
              onClick={() => setFiltro(e)}
              data-testid={`filtro-${e.replace(/\s+/g, '-')}`}
            >
              {e}
            </button>
          ))}
        </div>

        {loading && (
          <div className="visitas-loading">Recopilando lugares del archivo…</div>
        )}

        {!loading && (
          <div className="visitas-grid" data-testid="visitas-grid">
            {filtered.map(v => {
              const century = yearToCentury(v.anio_aprox);
              return (
                <article
                  key={v.slug}
                  className="visita-card"
                  data-testid={`visita-card-${v.slug}`}
                >
                  <div className="visita-card-thumb">
                    <img src={v.thumbnail} alt={v.lugar} loading="lazy" />
                    <span className="visita-card-globe">
                      <GlobeIcon size={18} />
                    </span>
                  </div>
                  <div className="visita-card-body">
                    <span className="visita-card-tag">
                      {[century, v.epoca].filter(Boolean).join(' · ')}
                    </span>
                    <h3>{v.lugar}</h3>
                    <p>{v.descripcion}</p>
                    <div className="visita-card-actions">
                      <VisitaVirtualButton visita={v} variant="card" />
                      <button
                        type="button"
                        className="visita-card-map-btn"
                        onClick={() => navigate(`/efemerides/mapa?lat=${v.lat}&lng=${v.lng}&z=6`)}
                        data-testid={`visita-card-map-${v.slug}`}
                        title="Ver en el mapa"
                      >
                        <MapIcon size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            {filtered.length === 0 && (
              <div className="visitas-loading">Aún no hay visitas para esta época.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Visitas;
