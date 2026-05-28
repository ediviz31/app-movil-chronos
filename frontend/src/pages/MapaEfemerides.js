import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageShell from '../components/PageShell';
import { useTheme } from '../context/ThemeContext';
import {
  HourglassIcon, TempleIcon, MapIcon, ArrowRightIcon, OrnateStarIcon
} from '../components/HistoricIcons';
import haptic from '../utils/haptic';

// Icono personalizado: punto dorado con halo
const goldIcon = L.divIcon({
  className: 'chronos-map-marker',
  html: '<div class="chronos-marker-dot"><div class="chronos-marker-pulse"></div></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});
const goldIconActive = L.divIcon({
  className: 'chronos-map-marker chronos-map-marker-active',
  html: '<div class="chronos-marker-dot chronos-marker-dot-active"><div class="chronos-marker-pulse"></div></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const EPOCAS = [
  { id: 'todas',                color: '#D4B878', label: 'Todas' },
  { id: 'Antigüedad',           color: '#C97818', label: 'Antigüedad' },
  { id: 'Roma imperial',        color: '#A12C2C', label: 'Roma imperial' },
  { id: 'Edad Media',           color: '#5B7A9B', label: 'Edad Media' },
  { id: 'Edad Moderna',         color: '#7B5C2A', label: 'Edad Moderna' },
  { id: 'Edad Contemporánea',   color: '#3D6E51', label: 'Edad Contemporánea' },
  { id: 'Egipto antiguo',       color: '#B89047', label: 'Egipto antiguo' }
];

// Componente para hacer fly-to cuando cambia el activo
const FlyTo = ({ evento }) => {
  const map = useMap();
  useEffect(() => {
    if (!evento) return;
    map.flyTo([evento.lat, evento.lng], 5, { duration: 1.2 });
  }, [evento, map]);
  return null;
};

const formatoAnio = (anio) => {
  if (anio < 0) return `${Math.abs(anio)} a.C.`;
  return `${anio} d.C.`;
};

const MapaEfemerides = () => {
  const navigate = useNavigate();
  const { effective } = useTheme();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todas');
  const [activo, setActivo] = useState(null);

  const tileUrl = effective === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  useEffect(() => {
    const fetchMapa = async () => {
      try {
        const res = await api.get('/efemerides/mapa');
        setEventos(res.data.eventos || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchMapa();
  }, []);

  const eventosFiltrados = useMemo(() => {
    if (filtro === 'todas') return eventos;
    return eventos.filter(e => e.epoca === filtro);
  }, [eventos, filtro]);

  const seleccionar = (ev) => {
    haptic.light();
    setActivo(ev);
  };

  return (
    <PageShell activeRail="efemerides" showFab={false} showMobileSubBar={false}>
      <main className="mapa-page" data-testid="mapa-page">
        <header className="mapa-header">
          <button className="mapa-back" onClick={() => navigate(-1)} data-testid="mapa-back">
            <ArrowRightIcon size={14} style={{ transform: 'rotate(180deg)' }} />
            Volver
          </button>
          <span className="mapa-kicker">
            <MapIcon size={12} /> CARTOGRAFÍA HISTÓRICA
          </span>
          <h1 className="mapa-title">El Atlas del Cronista</h1>
          <p className="mapa-subtitle">
            {loading
              ? 'Trazando rutas en el archivo…'
              : `${eventosFiltrados.length} efemérides geolocalizadas a través de los siglos.`}
          </p>
        </header>

        {/* Filtros por época */}
        <div className="mapa-filtros" data-testid="mapa-filtros">
          {EPOCAS.map(e => (
            <button
              key={e.id}
              className={`mapa-filtro ${filtro === e.id ? 'active' : ''}`}
              onClick={() => { haptic.light(); setFiltro(e.id); }}
              data-testid={`filtro-${e.id}`}
              style={filtro === e.id ? { borderColor: e.color, color: e.color } : undefined}
            >
              <span className="mapa-filtro-dot" style={{ background: e.color }} />
              {e.label}
            </button>
          ))}
        </div>

        {/* Mapa */}
        <div className="mapa-canvas-wrap" data-testid="mapa-canvas">
          {!loading && (
            <MapContainer
              center={[35, 10]}
              zoom={3}
              minZoom={2}
              maxZoom={8}
              scrollWheelZoom={true}
              worldCopyJump={true}
              className="mapa-canvas"
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                key={effective}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://carto.com/attributions">CARTO</a>'
                url={tileUrl}
                subdomains="abcd"
              />
              <FlyTo evento={activo} />
              {eventosFiltrados.map(ev => (
                <Marker
                  key={ev.id}
                  position={[ev.lat, ev.lng]}
                  icon={activo?.id === ev.id ? goldIconActive : goldIcon}
                  eventHandlers={{
                    click: () => seleccionar(ev)
                  }}
                >
                  <Popup className="chronos-popup">
                    <div className="chronos-popup-content">
                      <span className="chronos-popup-anio">{formatoAnio(ev.anio)}</span>
                      <h3>{ev.evento}</h3>
                      <p className="chronos-popup-lugar">
                        <MapIcon size={11} /> {ev.lugar}
                      </p>
                      <span className="chronos-popup-epoca">{ev.epoca}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Línea de tiempo horizontal abajo */}
        {!loading && eventosFiltrados.length > 0 && (
          <div className="mapa-timeline" data-testid="mapa-timeline">
            <div className="mapa-timeline-track">
              {eventosFiltrados.map(ev => (
                <button
                  key={ev.id}
                  className={`mapa-timeline-event ${activo?.id === ev.id ? 'active' : ''}`}
                  onClick={() => seleccionar(ev)}
                  data-testid={`timeline-event-${ev.id}`}
                >
                  <span className="mapa-timeline-anio">{formatoAnio(ev.anio)}</span>
                  <span className="mapa-timeline-lugar">{ev.lugar?.split(',')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </PageShell>
  );
};

export default MapaEfemerides;
