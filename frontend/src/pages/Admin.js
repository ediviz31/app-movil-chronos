/**
 * Panel del Maestro del Archivo — sólo accesible si user.rol === 'admin'.
 * Muestra:
 *  - Métricas: total usuarios, activos ahora / 24h / 7d, nuevos hoy/semana/mes
 *  - Conteo de contenido: relatos, fragmentos, cápsulas, comentarios
 *  - Cola de reportes pendientes con acciones de moderación
 *  - Listado de usuarios con búsqueda
 *  - Mini-gráfico de registros últimos 14 días
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PageShell from '../components/PageShell';
import { HourglassIcon, OrnateStarIcon, ChestIcon, ParchmentIcon } from '../components/HistoricIcons';

const ESTADOS = [
  { id: 'pendiente',  label: 'Pendientes' },
  { id: 'revisado',   label: 'Revisados'  },
  { id: 'desestimado',label: 'Desestimados' }
];

const MOTIVO_LABEL = {
  spam: 'Spam',
  odio: 'Odio',
  desinformacion: 'Desinformación',
  violencia: 'Violencia',
  desnudez: 'Desnudez',
  plagio: 'Plagio',
  acoso: 'Acoso',
  otro: 'Otro'
};

const TIPO_LABEL = {
  relato: 'Relato',
  comentario: 'Comentario',
  fragmento: 'Fragmento',
  capsula: 'Cápsula',
  usuario: 'Usuario'
};

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('overview'); // overview | reportes | usuarios
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  // Reportes
  const [reportes, setReportes] = useState([]);
  const [reportEstado, setReportEstado] = useState('pendiente');
  const [reportCounters, setReportCounters] = useState({ pendiente: 0, revisado: 0, desestimado: 0 });
  const [updatingId, setUpdatingId] = useState(null);

  // Usuarios
  const [usuarios, setUsuarios] = useState([]);
  const [qUsuarios, setQUsuarios] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (e) {
      if (e.response?.status === 403) setDenied(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReportes = useCallback(async (estado = reportEstado) => {
    try {
      const res = await api.get(`/reportes?estado=${estado}`);
      setReportes(res.data?.items || []);
      setReportCounters(res.data?.counters || { pendiente: 0, revisado: 0, desestimado: 0 });
    } catch (_) { setReportes([]); }
  }, [reportEstado]);

  const fetchUsuarios = useCallback(async (q = qUsuarios) => {
    try {
      const res = await api.get(`/admin/usuarios?q=${encodeURIComponent(q)}`);
      setUsuarios(res.data?.items || []);
    } catch (_) { setUsuarios([]); }
  }, [qUsuarios]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (tab === 'reportes') fetchReportes(reportEstado); }, [tab, reportEstado, fetchReportes]);
  useEffect(() => { if (tab === 'usuarios') fetchUsuarios(qUsuarios); }, [tab, fetchUsuarios, qUsuarios]);

  const handleReportAction = async (id, payload) => {
    setUpdatingId(id);
    try {
      await api.patch(`/reportes/${id}`, payload);
      setReportes(prev => prev.filter(r => r._id !== id));
      fetchStats();
      // Refrescar contadores
      setReportCounters(c => ({
        ...c,
        pendiente: payload.estado === 'pendiente' ? c.pendiente : Math.max(0, c.pendiente - 1),
        revisado: payload.estado === 'revisado' ? c.revisado + 1 : c.revisado,
        desestimado: payload.estado === 'desestimado' ? c.desestimado + 1 : c.desestimado
      }));
    } catch (_) { /* silencio */ } finally { setUpdatingId(null); }
  };

  if (loading) {
    return (
      <PageShell activeRail="" showMobileSubBar={false}>
        <div className="admin-loading" data-testid="admin-loading">
          <span className="spin" style={{ color: 'var(--gold)' }}><HourglassIcon size={32} /></span>
          <p>Abriendo el archivo secreto…</p>
        </div>
      </PageShell>
    );
  }

  if (denied) {
    return (
      <PageShell activeRail="" showMobileSubBar={false}>
        <div className="admin-denied" data-testid="admin-denied">
          <ChestIcon size={48} style={{ color: 'var(--gold)' }} />
          <h2>Bóveda sellada</h2>
          <p>Sólo el maestro del archivo puede entrar aquí.</p>
          <button className="admin-back-btn" onClick={() => navigate('/')}>Volver al feed</button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell activeRail="" showMobileSubBar={false}>
      <main className="admin-page" data-testid="admin-page">
        <header className="admin-header">
          <div className="admin-header-kicker">
            <OrnateStarIcon size={11} /> Bóveda del maestro
          </div>
          <h1 className="admin-header-title">El archivo en cifras</h1>
          <p className="admin-header-sub">
            Hola, {user?.nombre?.split(' ')[0] || 'maestro'}. Esto es lo que sucede en Chronos.
          </p>
        </header>

        {/* Tabs */}
        <nav className="admin-tabs" role="tablist">
          <button
            className={`admin-tab ${tab === 'overview' ? 'is-active' : ''}`}
            onClick={() => setTab('overview')}
            data-testid="admin-tab-overview"
          >Métricas</button>
          <button
            className={`admin-tab ${tab === 'reportes' ? 'is-active' : ''}`}
            onClick={() => setTab('reportes')}
            data-testid="admin-tab-reportes"
          >
            Reportes
            {stats?.moderacion?.reportes_pendientes > 0 && (
              <span className="admin-tab-badge">{stats.moderacion.reportes_pendientes}</span>
            )}
          </button>
          <button
            className={`admin-tab ${tab === 'usuarios' ? 'is-active' : ''}`}
            onClick={() => setTab('usuarios')}
            data-testid="admin-tab-usuarios"
          >Cronistas</button>
        </nav>

        {/* OVERVIEW */}
        {tab === 'overview' && stats && (
          <div className="admin-overview">
            <section className="admin-section">
              <h2 className="admin-section-title">Cronistas</h2>
              <div className="admin-cards">
                <Card label="Registrados" value={stats.usuarios.total} accent />
                <Card label="Activos ahora" value={stats.usuarios.activos_ahora} pulse />
                <Card label="Activos 24 h" value={stats.usuarios.activos_24h} />
                <Card label="Activos 7 días" value={stats.usuarios.activos_7d} />
                <Card label="Nuevos hoy" value={stats.usuarios.nuevos_hoy} small />
                <Card label="Nuevos semana" value={stats.usuarios.nuevos_semana} small />
                <Card label="Nuevos mes" value={stats.usuarios.nuevos_mes} small />
              </div>
            </section>

            <section className="admin-section">
              <h2 className="admin-section-title">Contenido del archivo</h2>
              <div className="admin-cards">
                <Card label="Crónicas" value={stats.contenido.relatos} />
                <Card label="Fragmentos" value={stats.contenido.fragmentos} />
                <Card label="Cápsulas" value={stats.contenido.capsulas} />
                <Card label="Comentarios" value={stats.contenido.comentarios} />
              </div>
            </section>

            <section className="admin-section">
              <h2 className="admin-section-title">Registros últimos 14 días</h2>
              <Chart serie={stats.serie_registros_14d} />
            </section>
          </div>
        )}

        {/* REPORTES */}
        {tab === 'reportes' && (
          <div className="admin-reportes">
            <div className="admin-filters">
              {ESTADOS.map(e => (
                <button
                  key={e.id}
                  className={`admin-filter ${reportEstado === e.id ? 'is-active' : ''}`}
                  onClick={() => setReportEstado(e.id)}
                  data-testid={`admin-filter-${e.id}`}
                >
                  {e.label} <span className="admin-filter-n">{reportCounters[e.id]}</span>
                </button>
              ))}
            </div>

            {reportes.length === 0 ? (
              <div className="admin-empty">
                <ParchmentIcon size={32} style={{ color: 'var(--gold)', opacity: 0.7 }} />
                <p>No hay reportes {reportEstado === 'pendiente' ? 'pendientes' : reportEstado === 'revisado' ? 'revisados' : 'desestimados'}.</p>
              </div>
            ) : (
              <div className="admin-report-list">
                {reportes.map(r => (
                  <article key={r._id} className="admin-report-card" data-testid={`admin-report-${r._id}`}>
                    <header className="admin-report-head">
                      <div>
                        <span className="admin-report-tipo">{TIPO_LABEL[r.tipo_objetivo]}</span>
                        <span className="admin-report-motivo">{MOTIVO_LABEL[r.motivo]}</span>
                      </div>
                      <time className="admin-report-time">
                        {new Date(r.creado_en).toLocaleString('es-ES', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </time>
                    </header>
                    {r.snapshot_titulo && (
                      <div className="admin-report-title">{r.snapshot_titulo}</div>
                    )}
                    {r.snapshot_texto && (
                      <p className="admin-report-snapshot">{r.snapshot_texto}</p>
                    )}
                    {r.detalle && (
                      <p className="admin-report-detalle"><strong>Reporta:</strong> {r.detalle}</p>
                    )}
                    <div className="admin-report-meta">
                      Por <strong>{r.reportador_id?.nombre || 'Anónimo'}</strong>
                      {r.reportador_id?.usuario && <> · @{r.reportador_id.usuario}</>}
                    </div>
                    {reportEstado === 'pendiente' && (
                      <div className="admin-report-actions">
                        <button
                          className="admin-action-btn admin-action-danger"
                          disabled={updatingId === r._id}
                          onClick={() => handleReportAction(r._id, { estado: 'revisado', accion_tomada: 'contenido_eliminado' })}
                          data-testid={`admin-action-eliminar-${r._id}`}
                        >Eliminar contenido</button>
                        <button
                          className="admin-action-btn"
                          disabled={updatingId === r._id}
                          onClick={() => handleReportAction(r._id, { estado: 'revisado', accion_tomada: 'usuario_advertido' })}
                          data-testid={`admin-action-advertir-${r._id}`}
                        >Advertir autor</button>
                        <button
                          className="admin-action-btn admin-action-ghost"
                          disabled={updatingId === r._id}
                          onClick={() => handleReportAction(r._id, { estado: 'desestimado', accion_tomada: 'ninguna' })}
                          data-testid={`admin-action-desestimar-${r._id}`}
                        >Desestimar</button>
                      </div>
                    )}
                    {reportEstado !== 'pendiente' && r.accion_tomada && r.accion_tomada !== 'ninguna' && (
                      <div className="admin-report-resolution">
                        Acción tomada: <strong>{r.accion_tomada.replace(/_/g, ' ')}</strong>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* USUARIOS */}
        {tab === 'usuarios' && (
          <div className="admin-usuarios">
            <div className="admin-search-row">
              <input
                type="search"
                placeholder="Buscar por nombre, usuario o correo…"
                value={qUsuarios}
                onChange={(e) => setQUsuarios(e.target.value)}
                className="admin-search-input"
                data-testid="admin-search-input"
              />
            </div>
            {usuarios.length === 0 ? (
              <div className="admin-empty"><p>Sin resultados.</p></div>
            ) : (
              <div className="admin-user-list">
                {usuarios.map(u => (
                  <div key={u._id} className="admin-user-row" data-testid={`admin-user-${u._id}`}>
                    <div className="admin-user-id">
                      <strong>{u.nombre}</strong>
                      <span>@{u.usuario} · {u.correo}</span>
                    </div>
                    <div className="admin-user-meta">
                      {u.rol === 'admin' && <span className="admin-user-badge">Admin</span>}
                      <span className="admin-user-time">
                        Visto: {u.ultimo_visto ? new Date(u.ultimo_visto).toLocaleDateString('es-ES') : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </PageShell>
  );
};

/* Tarjeta de métrica con animación cuando es "activos ahora" */
const Card = ({ label, value, accent, pulse, small }) => (
  <div className={`admin-card ${accent ? 'is-accent' : ''} ${pulse ? 'is-pulse' : ''} ${small ? 'is-small' : ''}`}>
    <div className="admin-card-value">{Number(value || 0).toLocaleString('es-ES')}</div>
    <div className="admin-card-label">{label}</div>
    {pulse && value > 0 && <span className="admin-card-pulse" aria-hidden="true" />}
  </div>
);

/* Mini-gráfico SVG */
const Chart = ({ serie }) => {
  if (!serie?.length) return null;
  const max = Math.max(1, ...serie.map(s => s.n));
  const w = 100; // viewBox width
  const h = 32;
  const step = w / serie.length;
  const points = serie.map((s, i) => `${i * step + step/2},${h - (s.n / max) * h}`).join(' ');
  return (
    <div className="admin-chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="admin-chart-svg">
        <polyline fill="none" stroke="var(--gold)" strokeWidth="0.6" points={points} />
        {serie.map((s, i) => (
          <circle key={i} cx={i*step + step/2} cy={h - (s.n/max)*h} r="0.7" fill="var(--gold-bright)" />
        ))}
      </svg>
      <div className="admin-chart-labels">
        <span>{serie[0]?.fecha?.slice(5)}</span>
        <span>{serie[serie.length-1]?.fecha?.slice(5)}</span>
      </div>
    </div>
  );
};

export default Admin;
