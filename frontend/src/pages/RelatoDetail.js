import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getAvatarUrl, getImageUrl } from '../utils/imageHelpers';
import PageShell from '../components/PageShell';
import PublicShell from '../components/PublicShell';
import HashtagText from '../components/HashtagText';
import {
  HourglassIcon, ArrowRightIcon, OrnateStarIcon,
  CoinLaurelIcon, ParchmentIcon, DoveScrollIcon, ChestIcon, TabletDaggerIcon,
  FeatherIcon
} from '../components/HistoricIcons';

const formatFechaCompleta = (fecha) => {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatRel = (fecha) => {
  const d = new Date(fecha);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86400) return `hace ${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const RelatoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [relato, setRelato] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const currentUserId = user?._id || user?.id;
  // Helper para gating: si no está autenticado, redirige a registro
  const requireAuth = () => {
    if (!isAuthenticated) {
      navigate('/registro?redirect=' + encodeURIComponent(`/relato/${id}`));
      return true;
    }
    return false;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, cRes] = await Promise.all([
        api.get(`/relatos/${id}`),
        api.get(`/comentarios/${id}`)
      ]);
      setRelato(rRes.data);
      setComments(cRes.data);
    } catch (err) {
      console.error('Error cargando relato:', err);
      if (err.response?.status === 404) navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEco = async () => {
    if (!relato || requireAuth()) return;
    try {
      const res = await api.post(`/ecos/${relato._id}`);
      setRelato(r => ({
        ...r,
        usuario_dio_eco: res.data.accion === 'creado',
        total_ecos: r.total_ecos + (res.data.accion === 'creado' ? 1 : -1)
      }));
    } catch (err) { console.error(err); }
  };

  const handleArchivar = async () => {
    if (!relato || requireAuth()) return;
    try {
      const res = await api.post(`/archivados/${relato._id}`);
      setRelato(r => ({
        ...r,
        usuario_archivado: res.data.accion === 'guardado',
        total_archivos: r.total_archivos + (res.data.accion === 'guardado' ? 1 : -1)
      }));
    } catch (err) { console.error(err); }
  };

  const handleCompartir = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/api/og/relato/${relato._id}`);
      alert('Enlace al relato copiado al portapapeles');
    } catch { /* ignore */ }
  };

  const handleEliminar = async () => {
    if (!window.confirm('¿Romper esta tablilla? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/relatos/${relato._id}`);
      navigate('/');
    } catch (err) { console.error(err); }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || requireAuth()) return;
    setPosting(true);
    try {
      const res = await api.post('/comentarios', { publicacion_id: relato._id, contenido: newComment });
      setComments(cs => [{ ...res.data.comentario, respuestas: [] }, ...cs]);
      setNewComment('');
      setRelato(r => ({ ...r, total_comentarios: r.total_comentarios + 1 }));
    } catch (err) { console.error(err); } finally { setPosting(false); }
  };

  const submitReply = async (parentId) => {
    if (!replyText.trim() || requireAuth()) return;
    setPosting(true);
    try {
      const res = await api.post('/comentarios', {
        publicacion_id: relato._id,
        contenido: replyText,
        parent_id: parentId
      });
      setComments(cs => cs.map(c =>
        c._id === parentId
          ? { ...c, respuestas: [...(c.respuestas || []), res.data.comentario] }
          : c
      ));
      setReplyText('');
      setReplyTo(null);
      setRelato(r => ({ ...r, total_comentarios: r.total_comentarios + 1 }));
    } catch (err) { console.error(err); } finally { setPosting(false); }
  };

  if (loading) {
    const LoadingShell = isAuthenticated ? PageShell : PublicShell;
    return (
      <LoadingShell activeRail="">
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', width: '100%' }}>
          <div className="spin" style={{ display: 'inline-block', color: 'var(--gold)' }}>
            <HourglassIcon size={36} />
          </div>
          <p style={{ marginTop: 14, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
            Desenrollando el pergamino...
          </p>
        </div>
      </LoadingShell>
    );
  }

  if (!relato) return null;

  const autor = relato.usuario_id;
  const imagenSrc = getImageUrl(relato.imagen);
  const esMio = currentUserId && autor?._id === currentUserId;
  const Shell = isAuthenticated ? PageShell : PublicShell;

  return (
    <Shell activeRail="">
      <main className="relato-detail-page" data-testid="relato-detail-page">
        {/* Volver — solo si está autenticado */}
        {isAuthenticated && (
          <button className="relato-back-link" onClick={() => navigate(-1)} data-testid="relato-back">
            <ArrowRightIcon size={14} style={{ transform: 'rotate(180deg)' }} />
            Volver al archivo
          </button>
        )}

        <article className="relato-article">
          {/* Kicker / categoria */}
          <div className="relato-kicker">
            <OrnateStarIcon size={12} />
            <span
              className="relato-kicker-cat"
              onClick={() => navigate(`/epocas/${encodeURIComponent(relato.categoria)}`)}
              style={{ cursor: 'pointer' }}
            >
              {relato.categoria}
            </span>
            <span className="relato-kicker-dot">·</span>
            <span>{formatFechaCompleta(relato.creado_en)}</span>
          </div>

          {/* Titulo */}
          <h1 className="relato-title" data-testid="relato-title">{relato.titulo}</h1>

          {/* Autor */}
          <div className="relato-author-row">
            <div
              className="relato-author-avatar"
              onClick={() => autor?._id && navigate(`/perfil/${autor._id}`)}
            >
              <img src={getAvatarUrl(autor)} alt={autor?.nombre} />
            </div>
            <div className="relato-author-info">
              <div
                className="relato-author-name"
                onClick={() => autor?._id && navigate(`/perfil/${autor._id}`)}
              >
                {autor?.nombre}
              </div>
              <div className="relato-author-handle">@{autor?.usuario}</div>
            </div>
            {esMio && (
              <button
                className="relato-delete-btn"
                onClick={handleEliminar}
                data-testid="relato-delete-btn"
                title="Romper esta tablilla"
              >
                <TabletDaggerIcon size={18} />
              </button>
            )}
          </div>

          {/* Imagen */}
          {imagenSrc && (
            <figure className="relato-figure">
              <img src={imagenSrc} alt={relato.titulo} />
              <figcaption className="relato-figcaption">{relato.titulo}</figcaption>
            </figure>
          )}

          {/* Contenido */}
          <div className="relato-content" data-testid="relato-content">
            {relato.contenido.split(/\n\n+/).map((p, i) => (
              <p key={i}><HashtagText text={p} /></p>
            ))}
          </div>

          {/* Acciones */}
          <div className="relato-actions" data-testid="relato-actions">
            <button
              onClick={handleEco}
              className={`relato-action ${relato.usuario_dio_eco ? 'active' : ''}`}
              data-testid="relato-eco-btn"
            >
              <CoinLaurelIcon size={22} />
              <span className="relato-action-label">Eco</span>
              <span className="relato-action-count">{relato.total_ecos}</span>
            </button>
            <button className="relato-action" data-testid="relato-comment-btn">
              <ParchmentIcon size={22} />
              <span className="relato-action-label">Comentar</span>
              <span className="relato-action-count">{relato.total_comentarios}</span>
            </button>
            <button onClick={handleCompartir} className="relato-action" data-testid="relato-share-btn">
              <DoveScrollIcon size={22} />
              <span className="relato-action-label">Compartir</span>
            </button>
            <button
              onClick={handleArchivar}
              className={`relato-action ${relato.usuario_archivado ? 'active' : ''}`}
              data-testid="relato-archive-btn"
            >
              <ChestIcon size={22} />
              <span className="relato-action-label">Archivar</span>
              <span className="relato-action-count">{relato.total_archivos}</span>
            </button>
          </div>
        </article>

        {/* CTA "Únete a Chronos" para visitantes anónimos */}
        {!isAuthenticated && (
          <aside className="relato-join-cta" data-testid="relato-join-cta">
            <div className="relato-join-cta-icon">
              <FeatherIcon size={28} />
            </div>
            <div className="relato-join-cta-text">
              <h3>¿Te resonó esta crónica?</h3>
              <p>
                Únete a Chronos para dar tu eco, comentar, guardarla en tu archivo,
                escribir tus propias crónicas y conectar con tu legado familiar.
              </p>
            </div>
            <div className="relato-join-cta-actions">
              <button
                className="public-cta-btn"
                onClick={() => navigate('/registro?redirect=' + encodeURIComponent(`/relato/${id}`))}
                data-testid="cta-registro-btn"
              >
                <FeatherIcon size={14} /> Únete a Chronos
              </button>
              <button
                className="public-link-btn"
                onClick={() => navigate('/login?redirect=' + encodeURIComponent(`/relato/${id}`))}
                data-testid="cta-login-btn"
              >
                Ya soy cronista · Entrar
              </button>
            </div>
          </aside>
        )}

        {/* COMENTARIOS */}
        <section className="relato-comments-section" data-testid="comments-section">
          <h2 className="relato-comments-title">
            <ParchmentIcon size={18} />
            Comentarios del archivo ({relato.total_comentarios})
          </h2>

          {/* Composer — solo si autenticado */}
          {isAuthenticated ? (
            <form className="relato-comment-composer" onSubmit={submitComment}>
              <div className="comment-composer-avatar">
                <img src={getAvatarUrl(user)} alt={user?.nombre} />
              </div>
              <div className="comment-composer-body">
                <textarea
                  className="comment-composer-input"
                  placeholder="Comparte tu valoración sobre este relato..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  data-testid="comment-composer-input"
                />
                <div className="comment-composer-actions">
                  <button
                    type="submit"
                    className="comment-composer-submit"
                    disabled={posting || !newComment.trim()}
                    data-testid="comment-submit-btn"
                  >
                    {posting ? 'Enviando...' : 'Comentar'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              className="relato-comment-locked"
              onClick={() => navigate('/registro?redirect=' + encodeURIComponent(`/relato/${id}`))}
              data-testid="comment-locked-cta"
            >
              <FeatherIcon size={14} /> Únete a Chronos para comentar
            </button>
          )}

          {/* Lista comentarios */}
          {comments.length === 0 ? (
            <div className="comments-empty" data-testid="comments-empty">
              <ParchmentIcon size={36} style={{ color: 'var(--gold)', opacity: 0.6 }} />
              <p>El silencio rodea esta crónica. Sé el primero en comentarla.</p>
            </div>
          ) : (
            <div className="comments-list" data-testid="comments-list">
              {comments.map(c => (
                <div key={c._id} className="comment-thread" data-testid={`comment-${c._id}`}>
                  <div className="comment-main">
                    <div
                      className="comment-avatar"
                      onClick={() => c.usuario_id?._id && navigate(`/perfil/${c.usuario_id._id}`)}
                    >
                      <img src={getAvatarUrl(c.usuario_id)} alt={c.usuario_id?.nombre} />
                    </div>
                    <div className="comment-body">
                      <div className="comment-head">
                        <span
                          className="comment-author"
                          onClick={() => c.usuario_id?._id && navigate(`/perfil/${c.usuario_id._id}`)}
                        >
                          {c.usuario_id?.nombre}
                        </span>
                        <span className="comment-handle">@{c.usuario_id?.usuario}</span>
                        <span className="comment-time">· {formatRel(c.creado_en)}</span>
                      </div>
                      <div className="comment-text">{c.contenido}</div>
                      <div className="comment-actions">
                        <button
                          className="comment-action-link"
                          onClick={() => {
                            if (!isAuthenticated) {
                              navigate('/registro?redirect=' + encodeURIComponent(`/relato/${id}`));
                              return;
                            }
                            setReplyTo(replyTo === c._id ? null : c._id);
                          }}
                          data-testid={`reply-btn-${c._id}`}
                        >
                          Responder
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Composer de respuesta */}
                  {replyTo === c._id && (
                    <div className="comment-reply-form">
                      <textarea
                        className="comment-composer-input"
                        placeholder={`Responder a ${c.usuario_id?.nombre}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        autoFocus
                        data-testid={`reply-input-${c._id}`}
                      />
                      <div className="comment-composer-actions">
                        <button
                          type="button"
                          className="comment-composer-cancel"
                          onClick={() => { setReplyTo(null); setReplyText(''); }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="comment-composer-submit"
                          disabled={posting || !replyText.trim()}
                          onClick={() => submitReply(c._id)}
                          data-testid={`reply-submit-${c._id}`}
                        >
                          {posting ? '...' : 'Responder'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Respuestas anidadas */}
                  {c.respuestas && c.respuestas.length > 0 && (
                    <div className="comment-replies">
                      {c.respuestas.map(r => (
                        <div key={r._id} className="comment-main comment-reply">
                          <div
                            className="comment-avatar small"
                            onClick={() => r.usuario_id?._id && navigate(`/perfil/${r.usuario_id._id}`)}
                          >
                            <img src={getAvatarUrl(r.usuario_id)} alt={r.usuario_id?.nombre} />
                          </div>
                          <div className="comment-body">
                            <div className="comment-head">
                              <span
                                className="comment-author"
                                onClick={() => r.usuario_id?._id && navigate(`/perfil/${r.usuario_id._id}`)}
                              >
                                {r.usuario_id?.nombre}
                              </span>
                              <span className="comment-handle">@{r.usuario_id?.usuario}</span>
                              <span className="comment-time">· {formatRel(r.creado_en)}</span>
                            </div>
                            <div className="comment-text">{r.contenido}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </Shell>
  );
};

export default RelatoDetail;
