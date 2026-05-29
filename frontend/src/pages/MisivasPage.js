import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PageShell from '../components/PageShell';
import PresenceBadge from '../components/PresenceBadge';
import haptic from '../utils/haptic';
import { getAvatarUrl } from '../utils/imageHelpers';
import {
  DoveScrollIcon, HourglassIcon, ScrollIcon, ArrowRightIcon,
  FeatherIcon, OrnateStarIcon, FleurDivider
} from '../components/HistoricIcons';

const POLL_MS = 10000;

const formatHora = (iso) => {
  const d = new Date(iso);
  const ahora = new Date();
  const mismoDia = d.toDateString() === ahora.toDateString();
  if (mismoDia) {
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
};

const formatFechaLarga = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const MisivasPage = () => {
  const { conversacionId: routeConvId, userIdToOpen } = useParams();
  const [searchParams] = useSearchParams();
  const compartirRelatoId = searchParams.get('compartir');
  const navigate = useNavigate();
  const { user } = useAuth();
  const myId = user?._id || user?.id;

  const [conversaciones, setConversaciones] = useState([]);
  const [convActiva, setConvActiva] = useState(null); // {_id, otro, mensajes}
  const [loadingList, setLoadingList] = useState(true);
  const [loadingConv, setLoadingConv] = useState(false);
  const [sending, setSending] = useState(false);
  const [texto, setTexto] = useState('');
  const [precarga, setPrecarga] = useState(false); // flag para no sobreescribir si el user empieza a editar
  const hiloRef = useRef(null);

  const fetchLista = useCallback(async () => {
    try {
      const res = await api.get('/misivas');
      setConversaciones(res.data);
    } catch (err) { console.error(err); }
    finally { setLoadingList(false); }
  }, []);

  const fetchConversacion = useCallback(async (convId) => {
    if (!convId) return;
    setLoadingConv(true);
    try {
      const res = await api.get(`/misivas/${convId}/mensajes`);
      setConvActiva(res.data);
      // Marcar leído en backend
      await api.post(`/misivas/${convId}/leer`);
      // Refrescar lista para quitar el indicador no_leido
      fetchLista();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403 || err.response?.status === 404) {
        navigate('/misivas');
      }
    } finally { setLoadingConv(false); }
  }, [navigate, fetchLista]);

  // Carga inicial
  useEffect(() => { fetchLista(); }, [fetchLista]);

  // Abrir por userId via /misivas/abrir/:userId (con posible ?compartir=<relatoId>)
  useEffect(() => {
    if (userIdToOpen) {
      (async () => {
        try {
          const res = await api.post(`/misivas/abrir/${userIdToOpen}`);
          const target = compartirRelatoId
            ? `/misivas/${res.data._id}?compartir=${compartirRelatoId}`
            : `/misivas/${res.data._id}`;
          navigate(target, { replace: true });
        } catch (err) {
          console.error(err);
          navigate('/misivas', { replace: true });
        }
      })();
    }
  }, [userIdToOpen, navigate, compartirRelatoId]);

  // Cargar conversación cuando cambia la ruta
  useEffect(() => {
    if (routeConvId) fetchConversacion(routeConvId);
    else setConvActiva(null);
  }, [routeConvId, fetchConversacion]);

  // Pre-cargar composer si venimos con ?compartir=<relatoId>
  useEffect(() => {
    if (!compartirRelatoId || !routeConvId || precarga) return;
    (async () => {
      try {
        const res = await api.get(`/relatos/${compartirRelatoId}`);
        const r = res.data;
        const fragmento = (r.contenido || '').replace(/\s+/g, ' ').slice(0, 180);
        const enlace = `${window.location.origin}/api/og/relato/${r._id}`;
        const autor = r.usuario_id?.nombre || 'un cronista';
        const plantilla =
`Te comparto una crónica del archivo que pensé que te interesaría:

"${r.titulo}" — ${autor}

«${fragmento}${(r.contenido || '').length > 180 ? '...' : ''}»

${enlace}

`;
        setTexto(plantilla);
        setPrecarga(true);
      } catch (err) {
        console.error('No se pudo precargar la crónica', err);
      }
    })();
  }, [compartirRelatoId, routeConvId, precarga]);

  // Polling lista + conversación activa
  useEffect(() => {
    const id = setInterval(() => {
      fetchLista();
      if (routeConvId) {
        // Refresh silencioso de la conv activa
        api.get(`/misivas/${routeConvId}/mensajes`).then(res => {
          setConvActiva(prev => {
            if (!prev) return res.data;
            const prevLen = Array.isArray(prev.mensajes) ? prev.mensajes.length : 0;
            const newLen = Array.isArray(res.data?.mensajes) ? res.data.mensajes.length : 0;
            // Solo actualizar si hay nuevos mensajes
            if (newLen !== prevLen) return res.data;
            return prev;
          });
        }).catch(() => {});
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [routeConvId, fetchLista]);

  // Auto-scroll al final cuando llegan mensajes
  useEffect(() => {
    if (hiloRef.current) {
      hiloRef.current.scrollTop = hiloRef.current.scrollHeight;
    }
  }, [convActiva?.mensajes?.length]);

  const handleEnviar = async (e) => {
    e?.preventDefault();
    if (!texto.trim() || !convActiva || sending) return;
    setSending(true);
    const contenidoLocal = texto.trim();
    setTexto('');
    try {
      const res = await api.post(`/misivas/${convActiva._id}/mensajes`, {
        contenido: contenidoLocal
      });
      // Append optimista (defensivo: si por alguna razón mensajes no es array)
      setConvActiva(prev => {
        if (!prev) return prev;
        const prevMensajes = Array.isArray(prev.mensajes) ? prev.mensajes : [];
        return { ...prev, mensajes: [...prevMensajes, res.data] };
      });
      haptic.success();   // 💌 vibración al enviar misiva
      fetchLista();
    } catch (err) {
      console.error(err);
      setTexto(contenidoLocal); // Restaurar
      alert(err.response?.data?.error || 'Error al enviar la misiva');
    } finally { setSending(false); }
  };

  return (
    <PageShell activeRail="misivas" showFab={false}>
      <main className="archive-listing-page misivas-page" data-testid="misivas-page">
        <header className="listing-header">
          <div className="listing-header-text">
            <div className="listing-kicker">
              <DoveScrollIcon size={14} /> Escritorio del cronista
            </div>
            <h1 className="listing-title">Misivas</h1>
            <p className="listing-subtitle">
              Cartas selladas entre cronistas. Aquí se conserva tu correspondencia personal,
              lejos del archivo público.
            </p>
          </div>
        </header>

        <div className="misivas-layout">
          {/* COLUMNA IZQ: lista de conversaciones */}
          <aside className="misivas-sidebar" data-testid="misivas-sidebar">
            <div className="misivas-sidebar-head">
              <span className="misivas-sidebar-kicker">
                <ScrollIcon size={12} /> Hilos de correspondencia
              </span>
            </div>

            {loadingList ? (
              <div className="misivas-empty"><HourglassIcon size={24} /></div>
            ) : conversaciones.length === 0 ? (
              <div className="misivas-empty" data-testid="misivas-empty">
                <FeatherIcon size={28} style={{ color: 'var(--gold)' }} />
                <p>Aún no has intercambiado misivas con ningún cronista.</p>
                <p style={{ fontSize: 12 }}>
                  Visita el perfil de otro cronista y pulsa "Enviar misiva" para abrir un hilo.
                </p>
              </div>
            ) : (
              <ul className="misivas-thread-list">
                {conversaciones.map(c => (
                  <li key={c._id}>
                    <button
                      className={`misivas-thread ${routeConvId === c._id ? 'active' : ''}`}
                      onClick={() => navigate(`/misivas/${c._id}`)}
                      data-testid={`misivas-thread-${c._id}`}
                    >
                      <span style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                        <img
                          className="misivas-thread-avatar"
                          src={getAvatarUrl(c.otro)}
                          alt={c.otro?.nombre}
                        />
                        {c.otro?._id && <PresenceBadge userId={c.otro._id} variant="dot" />}
                      </span>
                      <div className="misivas-thread-info">
                        <div className="misivas-thread-top">
                          <span className="misivas-thread-name">
                            {c.otro?.nombre || 'Cronista'}
                          </span>
                          <span className="misivas-thread-time">
                            {formatHora(c.ultimo_mensaje_en)}
                          </span>
                        </div>
                        <div className="misivas-thread-bottom">
                          <span className="misivas-thread-preview">
                            {c.ultimo_mensaje_resumen || 'Hilo recién abierto'}
                          </span>
                          {c.no_leido && (
                            <span
                              className="misivas-thread-dot"
                              data-testid={`misivas-unread-${c._id}`}
                              aria-label="No leído"
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* COLUMNA DER: hilo activo */}
          <section className="misivas-thread-view" data-testid="misivas-thread-view">
            {!convActiva ? (
              <div className="misivas-placeholder">
                <OrnateStarIcon size={40} style={{ color: 'var(--gold)' }} />
                <h3>Escoge una correspondencia</h3>
                <p>
                  Selecciona un hilo a la izquierda o inicia uno nuevo desde el perfil
                  de cualquier cronista.
                </p>
              </div>
            ) : (
              <>
                <header className="misivas-thread-header">
                  <button
                    className="misivas-back-btn"
                    onClick={() => navigate('/misivas')}
                    data-testid="misivas-back-btn"
                  >
                    <ArrowRightIcon size={12} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                  <span style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      className="misivas-thread-header-avatar"
                      src={getAvatarUrl(convActiva.otro)}
                      alt={convActiva.otro?.nombre}
                      onClick={() => navigate(`/perfil/${convActiva.otro._id}`)}
                      style={{ cursor: 'pointer' }}
                    />
                    {convActiva.otro?._id && <PresenceBadge userId={convActiva.otro._id} variant="dot" />}
                  </span>
                  <div>
                    <div className="misivas-thread-header-name" data-testid="misivas-thread-otro-nombre">
                      {convActiva.otro?.nombre}
                      {convActiva.otro?._id && (
                        <PresenceBadge userId={convActiva.otro._id} variant="torch" size={12} showLabel />
                      )}
                    </div>
                    <div className="misivas-thread-header-handle">
                      @{convActiva.otro?.usuario}
                      {convActiva.otro?.tema_favorito && (
                        <span> · {convActiva.otro.tema_favorito}</span>
                      )}
                    </div>
                  </div>
                </header>

                <FleurDivider style={{ color: 'var(--gold-soft)', margin: '0 0 8px' }} />

                <div className="misivas-hilo" ref={hiloRef} data-testid="misivas-hilo">
                  {loadingConv ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
                        <HourglassIcon size={28} />
                      </div>
                    </div>
                  ) : (convActiva.mensajes || []).length === 0 ? (
                    <div className="misivas-empty-hilo">
                      <p>Aún no hay misivas en este hilo.</p>
                      <p style={{ fontStyle: 'italic', fontSize: 13 }}>
                        Sé el primero en escribir.
                      </p>
                    </div>
                  ) : (
                    (convActiva.mensajes || []).map(m => {
                      const esMio = String(m.remitente_id) === String(myId);
                      return (
                        <article
                          key={m._id}
                          className={`misiva-carta ${esMio ? 'mia' : 'recibida'}`}
                          data-testid={`misiva-${m._id}`}
                        >
                          <div className="misiva-carta-meta">
                            <span className="misiva-carta-remitente">
                              {esMio ? 'Tú' : convActiva.otro?.nombre}
                            </span>
                            <span className="misiva-carta-fecha">
                              {formatFechaLarga(m.creado_en)}
                            </span>
                          </div>
                          <p className="misiva-carta-contenido">{m.contenido}</p>
                          <span className="misiva-carta-sello" aria-hidden>
                            <OrnateStarIcon size={14} />
                          </span>
                        </article>
                      );
                    })
                  )}
                </div>

                <form
                  className="misivas-composer"
                  onSubmit={handleEnviar}
                  data-testid="misivas-composer"
                >
                  <textarea
                    className="misivas-composer-input"
                    placeholder={`Escribe tu misiva a ${convActiva.otro?.nombre || 'el cronista'}...`}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    maxLength={4000}
                    rows={3}
                    data-testid="misivas-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEnviar(e);
                    }}
                  />
                  <button
                    type="submit"
                    className="misivas-send-btn"
                    disabled={!texto.trim() || sending}
                    data-testid="misivas-send-btn"
                  >
                    {sending ? 'Sellando...' : (<><FeatherIcon size={14} /> Sellar y enviar</>)}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </main>
    </PageShell>
  );
};

export default MisivasPage;
