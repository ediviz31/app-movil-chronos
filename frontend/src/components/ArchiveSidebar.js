import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { getAvatarUrl } from '../utils/imageHelpers';
import {
  CalendarIcon, TempleIcon, FlameIcon, PlusOrnateIcon, ArrowRightIcon
} from './HistoricIcons';
import ActivosAhora from './ActivosAhora';

// Datos curados de épocas con imágenes
const EPOCAS_DATA = {
  'Antigüedad': { period: 'Hasta el 476 d.C.', img: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=200&q=80' },
  'Edad Media': { period: '476 – 1492', img: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=200&q=80' },
  'Edad Moderna': { period: '1492 – 1789', img: 'https://images.unsplash.com/photo-1552432552-06c0b0a94dda?w=200&q=80' },
  'Edad Contemporánea': { period: '1789 – Hoy', img: 'https://images.unsplash.com/photo-1568736333610-eae6e0ab9206?w=200&q=80' },
  'Roma imperial': { period: '27 a.C. – 476 d.C.', img: 'https://images.unsplash.com/photo-1552432552-06c0b0a94dda?w=200&q=80' },
  'Egipto antiguo': { period: '3100 – 30 a.C.', img: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=200&q=80' },
  'Medievo': { period: '476 – 1492', img: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=200&q=80' },
  'Civilizaciones': { period: 'Diversas épocas', img: 'https://images.unsplash.com/photo-1568736333610-eae6e0ab9206?w=200&q=80' },
  'Leyendas': { period: 'Mitos atemporales', img: 'https://images.unsplash.com/photo-1568736333610-eae6e0ab9206?w=200&q=80' },
  'Exploraciones': { period: 'Siglos XV-XIX', img: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=200&q=80' }
};

const ArchiveSidebar = () => {
  const navigate = useNavigate();
  const [rutasPopulares, setRutasPopulares] = useState([]);
  const [usuariosSugeridos, setUsuariosSugeridos] = useState([]);
  const [loadingFollow, setLoadingFollow] = useState({});
  const [efemeride, setEfemeride] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [rutasRes, usuariosRes, efemRes] = await Promise.all([
        api.get('/rutas/populares'),
        api.get('/usuarios/sugeridos'),
        api.get('/efemerides/hoy')
      ]);
      setRutasPopulares(rutasRes.data);
      setUsuariosSugeridos(usuariosRes.data);
      setEfemeride(efemRes.data);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSeguir = async (id) => {
    setLoadingFollow(prev => ({ ...prev, [id]: true }));
    try {
      await api.post(`/seguir/${id}`);
      setUsuariosSugeridos(prev => prev.filter(u => u._id !== id));
    } catch (error) {
      console.error('Error seguir:', error);
    } finally {
      setLoadingFollow(prev => ({ ...prev, [id]: false }));
    }
  };

  // Toma el primer evento de la efeméride
  const evento = efemeride?.eventos?.[0];
  const MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const epocasMostradas = rutasPopulares.length > 0
    ? rutasPopulares.slice(0, 4)
    : [
      { categoria: 'Antigüedad', total: 0 },
      { categoria: 'Edad Media', total: 0 },
      { categoria: 'Edad Moderna', total: 0 },
      { categoria: 'Edad Contemporánea', total: 0 }
    ];

  return (
    <aside className="archive-sidebar" data-testid="archive-sidebar">
      {/* CRONISTAS ACTIVOS AHORA (solo aparece si hay 1+ activo) */}
      <ActivosAhora />

      {/* EFEMÉRIDE DEL DÍA */}
      <section className="sidebar-section" data-testid="efemeride-section">
        <div className="sidebar-section-head">
          <div className="sidebar-section-title">
            <CalendarIcon size={16} />
            Efeméride del Día
          </div>
          <button className="sidebar-section-icon-btn">
            <PlusOrnateIcon size={14} />
          </button>
        </div>
        <div className="ephemeris-content">
          {evento ? (
            <>
              <div className="ephemeris-date">
                <div className="ephemeris-day">{efemeride.dia}</div>
                <div className="ephemeris-month">{MESES[efemeride.mes]?.substring(0,3).toUpperCase()}</div>
                <div className="ephemeris-year">
                  {evento.anio < 0 ? `${Math.abs(evento.anio)} a.C.` : evento.anio}
                </div>
              </div>
              <div className="ephemeris-divider"></div>
              <div className="ephemeris-body">
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--text-bright)', marginBottom: 6, fontWeight: 500 }}>
                  {evento.epoca}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, fontStyle: 'italic', lineHeight: 1.4 }}>
                  {evento.evento}
                </p>
                {!efemeride.es_hoy && (
                  <p style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 10, fontFamily: 'var(--font-elegant)', letterSpacing: '0.1em' }}>
                    Fecha cercana
                  </p>
                )}
                <a
                  href="/efemerides"
                  className="sidebar-link"
                  onClick={(e) => { e.preventDefault(); navigate('/efemerides'); }}
                  data-testid="ephemeris-link"
                >
                  Explorar efemérides <ArrowRightIcon size={12} />
                </a>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontStyle: 'italic', padding: 8 }}>
              Consultando el archivo...
            </p>
          )}
        </div>
      </section>

      {/* ÉPOCAS DESTACADAS */}
      <section className="sidebar-section" data-testid="epocas-section">
        <div className="sidebar-section-head">
          <div className="sidebar-section-title">
            <TempleIcon size={16} />
            Épocas Destacadas
          </div>
          <button className="sidebar-section-icon-btn">
            <TempleIcon size={14} />
          </button>
        </div>
        {epocasMostradas.map(ruta => {
          const data = EPOCAS_DATA[ruta.categoria] || { period: 'Diversa', img: 'https://images.unsplash.com/photo-1568736333610-eae6e0ab9206?w=200&q=80' };
          return (
            <div
              key={ruta.categoria}
              className="epoch-row"
              data-testid={`epoch-${ruta.categoria}`}
              onClick={() => navigate(`/epocas/${encodeURIComponent(ruta.categoria)}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="epoch-avatar">
                <img src={data.img} alt={ruta.categoria} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="epoch-name">{ruta.categoria}</div>
                <div className="epoch-period">{data.period}</div>
              </div>
              {ruta.total > 0 && (
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--gold)', fontWeight: 500 }}>
                  {ruta.total}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* TEMAS DEL MOMENTO */}
      <section className="sidebar-section" data-testid="temas-section">
        <div className="sidebar-section-head">
          <div className="sidebar-section-title">
            <FlameIcon size={16} />
            Temas del Momento
          </div>
          <button className="sidebar-section-icon-btn">
            <FlameIcon size={14} />
          </button>
        </div>
        {usuariosSugeridos.length > 0 ? (
          usuariosSugeridos.slice(0, 5).map(usuario => (
            <div key={usuario._id} className="topic-row" data-testid={`cronista-${usuario._id}`}>
              <div className="topic-icon-circle">
                <img src={getAvatarUrl(usuario)} alt={usuario.nombre} />
              </div>
              <div className="topic-name">{usuario.nombre}</div>
              <button
                onClick={() => handleSeguir(usuario._id)}
                disabled={loadingFollow[usuario._id]}
                style={{
                  fontFamily: 'var(--font-elegant)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  color: 'var(--gold)',
                  padding: '4px 10px',
                  border: '1px solid var(--border-mid)',
                  borderRadius: 3,
                  textTransform: 'uppercase',
                  background: 'transparent'
                }}
                data-testid={`seguir-${usuario._id}`}
              >
                {loadingFollow[usuario._id] ? 'Sellando…' : 'Seguir legado'}
              </button>
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>
            Pronto aparecerán cronistas para seguir...
          </p>
        )}
        <a href="#" className="sidebar-link" style={{ marginTop: 14 }}>
          Explorar temas <ArrowRightIcon size={12} />
        </a>
      </section>

      {/* CITA INSPIRACIONAL */}
      <section className="sidebar-section" data-testid="cita-section">
        <div className="archive-quote">
          "Somos el resultado de todas las historias que nos precedieron."
          <span className="archive-quote-author">— Chronos</span>
        </div>
      </section>
    </aside>
  );
};

export default ArchiveSidebar;
