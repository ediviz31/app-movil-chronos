import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageShell from '../components/PageShell';
import {
  TempleIcon, HourglassIcon, ArrowRightIcon, OrnateStarIcon
} from '../components/HistoricIcons';

// Descripciones curadas por época
const DESCRIPCIONES = {
  'Antigüedad': 'Los albores de la civilización. Sumeria, Egipto, Grecia, Persia y la Roma temprana.',
  'Edad Media': 'Mil años entre Roma y el Renacimiento: castillos, monasterios y nuevas fronteras.',
  'Edad Moderna': 'Del descubrimiento de América a la Revolución Francesa: humanismo y exploración.',
  'Edad Contemporánea': 'De la Revolución Industrial al presente: cambios acelerados que aún nos definen.',
  'Roma imperial': 'César, los emperadores y la Pax Romana: un imperio que dio forma al mundo.',
  'Egipto antiguo': 'Faraones, pirámides y el Nilo: tres milenios sobre la arena.',
  'Medievo': 'La era de caballeros, peste, catedrales y rutas de las especias.',
  'Civilizaciones': 'Pueblos que florecieron y dejaron huella en el mundo.',
  'Civilizaciones Antiguas': 'Pueblos que florecieron y dejaron huella en el mundo.',
  'Leyendas': 'Mitos que cruzaron las generaciones y siguen vivos en nuestra imaginación.',
  'Exploraciones': 'Navegantes y descubridores que ampliaron el mapa de lo conocido.'
};

const EpocasPage = () => {
  const navigate = useNavigate();
  const [epocas, setEpocas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/epocas');
        setEpocas(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PageShell activeRail="epocas">
      <main className="archive-listing-page" data-testid="epocas-page">
        <header className="listing-header">
          <div className="listing-header-text">
            <div className="listing-kicker">
              <TempleIcon size={14} /> Salas del Tiempo
            </div>
            <h1 className="listing-title">Épocas</h1>
            <p className="listing-subtitle">
              El archivo está organizado por épocas. Cada sala custodia los relatos
              de un tiempo distinto. Elige una para entrar.
            </p>
          </div>
          <span className="listing-stat-pill">{epocas.length} épocas</span>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
              <HourglassIcon size={36} />
            </div>
          </div>
        ) : epocas.length === 0 ? (
          <div className="listing-empty">
            <TempleIcon size={42} style={{ color: 'var(--gold)' }} />
            <h3>Aún no hay épocas pobladas</h3>
            <p>Cuando los cronistas publiquen crónicas, sus épocas aparecerán aquí.</p>
          </div>
        ) : (
          <div className="listing-grid" data-testid="epocas-list">
            {epocas.map(e => (
              <div
                key={e.categoria}
                className="epoch-card"
                onClick={() => navigate(`/epocas/${encodeURIComponent(e.categoria)}`)}
                data-testid={`epoca-card-${e.categoria}`}
              >
                <div className="epoch-card-icon">
                  <TempleIcon size={24} />
                </div>
                <div className="epoch-card-title">{e.categoria}</div>
                <div className="epoch-card-desc">
                  {DESCRIPCIONES[e.categoria] || 'Relatos de esta época preservados por los cronistas.'}
                </div>
                <div className="epoch-card-footer">
                  <span className="epoch-card-count">
                    {e.total} relato{e.total !== 1 ? 's' : ''}
                  </span>
                  <ArrowRightIcon size={14} className="epoch-card-arrow" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </PageShell>
  );
};

export default EpocasPage;
