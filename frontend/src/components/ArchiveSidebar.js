import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { getAvatarUrl } from '../utils/imageHelpers';
import {
  CalendarIcon, TempleIcon, FlameIcon, PlusOrnateIcon, ArrowRightIcon
} from './HistoricIcons';

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
  const [rutasPopulares, setRutasPopulares] = useState([]);
  const [usuariosSugeridos, setUsuariosSugeridos] = useState([]);
  const [loadingFollow, setLoadingFollow] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const [rutasRes, usuariosRes] = await Promise.all([
        api.get('/rutas/populares'),
        api.get('/usuarios/sugeridos')
      ]);
      setRutasPopulares(rutasRes.data);
      setUsuariosSugeridos(usuariosRes.data);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSeguir = async (id) => {
    setLoadingFollow({ ...loadingFollow, [id]: true });
    try {
      await api.post(`/seguir/${id}`);
      setUsuariosSugeridos(usuariosSugeridos.filter(u => u._id !== id));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingFollow({ ...loadingFollow, [id]: false });
    }
  };

  // Efeméride del día (mock con datos curados)
  const today = new Date();
  const ephemerides = [
    { day: today.getDate(), month: today.toLocaleString('es-ES', { month: 'long' }).toUpperCase(), year: '1822', title: 'Nace Agustín de Iturbide', desc: 'Militar y político que jugó un papel clave en la Independencia de México y fue su primer emperador.', img: 'https://images.unsplash.com/photo-1552432552-06c0b0a94dda?w=80&q=80' },
  ];
  const efemeride = ephemerides[0];

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
          <div className="ephemeris-date">
            <div className="ephemeris-day">{efemeride.day}</div>
            <div className="ephemeris-month">{efemeride.month.substring(0,5)}</div>
            <div className="ephemeris-year">{efemeride.year}</div>
          </div>
          <div className="ephemeris-divider"></div>
          <div className="ephemeris-body">
            <p>{efemeride.title}</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>{efemeride.desc}</p>
            <a href="#" className="sidebar-link">
              Explorar efemérides <ArrowRightIcon size={12} />
            </a>
          </div>
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
            <div key={ruta.categoria} className="epoch-row" data-testid={`epoch-${ruta.categoria}`}>
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
                {loadingFollow[usuario._id] ? '...' : 'Seguir'}
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
