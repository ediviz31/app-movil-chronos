import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { getParentescoLabel, formatFechaCorta, getEpocaDeFecha } from '../utils/parentescoMap';

/**
 * Vista cronológica del árbol genealógico.
 * Une los familiares con efemérides históricas en una sola línea de tiempo.
 * 
 * Estructura:
 * - Eje vertical = años (de menor a mayor)
 * - Lado izquierdo = familiares (cameos)
 * - Lado derecho = eventos del mundo (efemérides)
 * - Espina dorsal dorada al centro
 */

// Eventos históricos hito (anclas universales)
const HITOS_HISTORICOS = [
  { anio: 1492, evento: 'Cristóbal Colón llega a América' },
  { anio: 1517, evento: 'Reforma Protestante de Lutero' },
  { anio: 1789, evento: 'Revolución Francesa' },
  { anio: 1804, evento: 'Napoleón se corona emperador' },
  { anio: 1865, evento: 'Asesinato de Lincoln · Fin esclavitud EE.UU.' },
  { anio: 1869, evento: 'Inauguración del Canal de Suez' },
  { anio: 1885, evento: 'Carl Benz inventa el automóvil' },
  { anio: 1898, evento: 'Cuba se independiza de España' },
  { anio: 1914, evento: 'Estalla la Primera Guerra Mundial' },
  { anio: 1929, evento: 'Crack de la Bolsa de Nueva York' },
  { anio: 1939, evento: 'Comienza la Segunda Guerra Mundial' },
  { anio: 1945, evento: 'Fin de la Segunda Guerra Mundial' },
  { anio: 1953, evento: 'Descubrimiento estructura del ADN' },
  { anio: 1969, evento: 'El hombre llega a la Luna' },
  { anio: 1989, evento: 'Cae el Muro de Berlín' },
  { anio: 1991, evento: 'Disolución de la URSS' },
  { anio: 2001, evento: 'Atentados del 11 de septiembre' },
  { anio: 2007, evento: 'Lanzamiento del primer iPhone' },
  { anio: 2020, evento: 'Pandemia de COVID-19' }
];

const TimelineView = ({ familiares, currentUser, onSelectFamiliar }) => {
  // Extraer año numérico
  const parseAnio = (fecha) => {
    if (!fecha) return null;
    const m = String(fecha).match(/^(-?\d{3,4})/);
    return m ? parseInt(m[1]) : null;
  };

  // Familiares con año detectado
  const conAnio = useMemo(
    () => familiares
      .map(f => ({ ...f, _anio: parseAnio(f.fecha_nacimiento) }))
      .filter(f => f._anio !== null)
      .sort((a, b) => a._anio - b._anio),
    [familiares]
  );

  if (conAnio.length === 0) {
    return (
      <div className="timeline-empty">
        <p>
          Agrega fechas de nacimiento a tus familiares para ver la línea
          cronológica del legado.
        </p>
      </div>
    );
  }

  // Rango: el año más antiguo, hasta el actual
  const minYear = Math.min(...conAnio.map(f => f._anio)) - 5;
  const maxYear = new Date().getFullYear();
  const range = maxYear - minYear;

  // Filtrar hitos al rango
  const hitos = HITOS_HISTORICOS.filter(h => h.anio >= minYear && h.anio <= maxYear);

  // Convertir año → posición Y (px)
  const HEIGHT_PER_YEAR = 12; // 12px por año
  const yearToY = (year) => (year - minYear) * HEIGHT_PER_YEAR + 40;
  const totalHeight = range * HEIGHT_PER_YEAR + 80;

  // Décadas para etiquetar el eje
  const decadas = [];
  for (let y = Math.ceil(minYear / 10) * 10; y <= maxYear; y += 10) {
    decadas.push(y);
  }

  return (
    <div className="timeline-canvas-wrap" data-testid="timeline-canvas">
      <div className="timeline-canvas" style={{ height: totalHeight }}>
        {/* Eje central dorado */}
        <div className="timeline-spine"></div>

        {/* Marcas de décadas */}
        {decadas.map(year => (
          <div key={year} className="timeline-year-mark" style={{ top: yearToY(year) }}>
            <span className="timeline-year-label">{year}</span>
          </div>
        ))}

        {/* Hitos históricos (derecha) */}
        {hitos.map((h, i) => (
          <div
            key={`hito-${h.anio}-${i}`}
            className="timeline-hito"
            style={{ top: yearToY(h.anio) }}
            data-testid={`timeline-hito-${h.anio}`}
          >
            <div className="timeline-hito-dot"></div>
            <div className="timeline-hito-content">
              <span className="timeline-hito-year">{h.anio}</span>
              <span className="timeline-hito-text">{h.evento}</span>
            </div>
          </div>
        ))}

        {/* Familiares (izquierda) */}
        {conAnio.map(f => {
          const fotoUrl = f.foto
            ? (f.foto.startsWith('http') ? f.foto : process.env.REACT_APP_BACKEND_URL + f.foto)
            : null;
          return (
            <div
              key={f._id}
              className="timeline-familiar"
              style={{ top: yearToY(f._anio) }}
              onClick={() => onSelectFamiliar(f)}
              data-testid={`timeline-fam-${f._id}`}
            >
              <div className="timeline-familiar-content">
                <span className="timeline-familiar-relation">{getParentescoLabel(f.parentesco)}</span>
                <span className="timeline-familiar-name">{f.nombre} {f.apellido}</span>
                <span className="timeline-familiar-period">
                  {formatFechaCorta(f.fecha_nacimiento)}
                  {f.fecha_defuncion ? ` — ${formatFechaCorta(f.fecha_defuncion)}` : ''}
                </span>
                {f.ocupacion && <span className="timeline-familiar-job">{f.ocupacion}</span>}
              </div>
              <div className="timeline-familiar-cameo">
                {fotoUrl
                  ? <img src={fotoUrl} alt={f.nombre} />
                  : <span>{f.nombre[0]?.toUpperCase()}</span>
                }
              </div>
            </div>
          );
        })}

        {/* TÚ — punto del usuario actual en el año actual */}
        <div className="timeline-you" style={{ top: yearToY(maxYear) }}>
          <div className="timeline-you-cameo">
            <span>{currentUser?.nombre?.[0]?.toUpperCase() || 'T'}</span>
          </div>
          <div className="timeline-you-label">
            <strong>Hoy</strong>
            <span>{currentUser?.nombre || 'Tú'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
