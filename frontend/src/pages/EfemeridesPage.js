import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageShell from '../components/PageShell';
import {
  CalendarIcon, HourglassIcon, ArrowRightIcon, OrnateStarIcon, TempleIcon
} from '../components/HistoricIcons';

const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const formatAnio = (anio) => anio < 0 ? `${Math.abs(anio)} a.C.` : `${anio}`;

const EfemeridesPage = () => {
  const navigate = useNavigate();
  const hoy = new Date();
  const [year, setYear] = useState(hoy.getFullYear());
  const [month, setMonth] = useState(hoy.getMonth() + 1);
  const [calendario, setCalendario] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy.getDate());
  const [eventosDia, setEventosDia] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendario = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/efemerides/calendario/${year}/${month}`);
      setCalendario(res.data.dias);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [year, month]);

  const fetchEventosDia = useCallback(async (dia) => {
    try {
      const mm = String(month).padStart(2, '0');
      const dd = String(dia).padStart(2, '0');
      const res = await api.get(`/efemerides/fecha/${mm}-${dd}`);
      setEventosDia(res.data.eventos);
    } catch (err) { console.error(err); }
  }, [month]);

  useEffect(() => { fetchCalendario(); }, [fetchCalendario]);
  useEffect(() => { fetchEventosDia(diaSeleccionado); }, [diaSeleccionado, fetchEventosDia]);

  const cambiarMes = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
    setDiaSeleccionado(1);
  };

  // Calcular el día de la semana del primer día (0=Lun, 6=Dom estilo europeo)
  const primerDiaSemana = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const totalDias = calendario.length;

  const esHoy = (dia) =>
    dia === hoy.getDate() && month === hoy.getMonth() + 1 && year === hoy.getFullYear();

  return (
    <PageShell activeRail="">
      <main className="archive-listing-page efemerides-page" data-testid="efemerides-page">
        <header className="listing-header">
          <div className="listing-header-text">
            <div className="listing-kicker">
              <CalendarIcon size={14} /> Calendario del Archivo
            </div>
            <h1 className="listing-title">Efemérides</h1>
            <p className="listing-subtitle">
              Un viaje por las fechas que cambiaron el mundo. Navega los meses y
              descubre qué ocurrió cada día de la historia documentada.
            </p>
          </div>
        </header>

        <div className="efemerides-layout">
          {/* CALENDARIO */}
          <div className="calendar-wrap" data-testid="calendar-wrap">
            <div className="calendar-head">
              <button className="calendar-nav-btn" onClick={() => cambiarMes(-1)} data-testid="cal-prev">
                <ArrowRightIcon size={14} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <div className="calendar-title">
                <div className="calendar-month">{MESES[month]}</div>
                <div className="calendar-year">{year}</div>
              </div>
              <button className="calendar-nav-btn" onClick={() => cambiarMes(1)} data-testid="cal-next">
                <ArrowRightIcon size={14} />
              </button>
            </div>

            <div className="calendar-weekdays">
              {DIAS_SEMANA.map(d => <div key={d}>{d}</div>)}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--gold)' }}>
                <HourglassIcon size={28} className="spin" />
              </div>
            ) : (
              <div className="calendar-grid">
                {Array.from({ length: primerDiaSemana }).map((_, i) => (
                  <div key={`empty-${i}`} className="calendar-cell empty"></div>
                ))}
                {calendario.map(d => {
                  const tieneEventos = d.eventos.length > 0;
                  const seleccionado = d.dia === diaSeleccionado;
                  return (
                    <button
                      key={d.dia}
                      className={`calendar-cell ${tieneEventos ? 'has-event' : ''} ${seleccionado ? 'selected' : ''} ${esHoy(d.dia) ? 'today' : ''}`}
                      onClick={() => setDiaSeleccionado(d.dia)}
                      data-testid={`cal-day-${d.dia}`}
                    >
                      <span className="calendar-day-num">{d.dia}</span>
                      {tieneEventos && <span className="calendar-day-dot"></span>}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="calendar-legend">
              <span className="legend-item"><span className="legend-dot"></span> Con efeméride</span>
              <span className="legend-item"><span className="legend-dot today"></span> Hoy</span>
            </div>
          </div>

          {/* PANEL DE EVENTOS */}
          <div className="events-panel" data-testid="events-panel">
            <div className="events-panel-head">
              <div className="events-panel-day">{diaSeleccionado}</div>
              <div className="events-panel-month">{MESES[month]} {year}</div>
            </div>

            {eventosDia.length === 0 ? (
              <div className="events-empty">
                <OrnateStarIcon size={32} style={{ color: 'var(--gold)', opacity: 0.5 }} />
                <p>El archivo guarda silencio sobre este día.</p>
                <small>Selecciona otro día del calendario para descubrir hechos históricos.</small>
              </div>
            ) : (
              <div className="events-list">
                {eventosDia.map((ev, idx) => (
                  <article key={idx} className="event-card" data-testid={`event-${idx}`}>
                    <div className="event-card-year">
                      {formatAnio(ev.anio)}
                    </div>
                    <div className="event-card-body">
                      <button
                        className="event-card-epoca"
                        onClick={() => navigate(`/epocas/${encodeURIComponent(ev.epoca)}`)}
                      >
                        <TempleIcon size={12} /> {ev.epoca}
                      </button>
                      <p className="event-card-text">{ev.evento}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </PageShell>
  );
};

export default EfemeridesPage;
