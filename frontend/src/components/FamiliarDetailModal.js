import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  CloseIcon, FeatherIcon, TempleIcon, CalendarIcon, ChestIcon, QuillInkIcon, TabletDaggerIcon
} from './HistoricIcons';
import { getParentescoLabel, getEpocaDeFecha, formatFechaCorta } from '../utils/parentescoMap';

const FamiliarDetailModal = ({ familiar, onClose, onEdit, onDelete, onUpdated }) => {
  const [efemerides, setEfemerides] = useState([]);
  const [historiaTitulo, setHistoriaTitulo] = useState('');
  const [historiaTexto, setHistoriaTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [historias, setHistorias] = useState(familiar?.historias || []);

  useEffect(() => {
    setHistorias(familiar?.historias || []);
  }, [familiar]);

  // ESC para cerrar
  useEffect(() => {
    if (!familiar) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [familiar, onClose]);

  useEffect(() => {
    if (!familiar?.fecha_nacimiento) { setEfemerides([]); return; }
    // Intentar parsear MM-DD del nacimiento
    const m = String(familiar.fecha_nacimiento).match(/^-?\d{3,4}-(\d{2})-(\d{2})$/);
    if (!m) { setEfemerides([]); return; }
    const fecha = `${m[1]}-${m[2]}`;
    api.get(`/efemerides/fecha/${fecha}`)
      .then(res => setEfemerides(res.data.eventos || []))
      .catch(() => setEfemerides([]));
  }, [familiar]);

  if (!familiar) return null;

  const epoca = getEpocaDeFecha(familiar.fecha_nacimiento);
  const nombreCompleto = `${familiar.nombre}${familiar.apellido ? ' ' + familiar.apellido : ''}`;
  const periodo = (familiar.fecha_nacimiento || familiar.fecha_defuncion)
    ? `${formatFechaCorta(familiar.fecha_nacimiento) || '?'} — ${formatFechaCorta(familiar.fecha_defuncion) || (familiar.fecha_nacimiento ? '' : '?')}`
    : '';

  const submitHistoria = async (e) => {
    e.preventDefault();
    if (!historiaTexto.trim()) return;
    setSaving(true);
    try {
      const res = await api.post(`/familiares/${familiar._id}/historias`, {
        titulo: historiaTitulo, contenido: historiaTexto
      });
      setHistorias(res.data.historias);
      setHistoriaTitulo(''); setHistoriaTexto('');
      onUpdated && onUpdated({ ...familiar, historias: res.data.historias });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const eliminarHistoria = async (hid) => {
    if (!window.confirm('¿Eliminar esta anécdota?')) return;
    try {
      const res = await api.delete(`/familiares/${familiar._id}/historias/${hid}`);
      setHistorias(res.data.historias);
      onUpdated && onUpdated({ ...familiar, historias: res.data.historias });
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar a ${nombreCompleto} del árbol? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/familiares/${familiar._id}`);
      onDelete && onDelete(familiar._id);
      onClose();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="familiar-detail-backdrop">
      <div className="modal-content familiar-detail-modal" onClick={(e) => e.stopPropagation()} data-testid="familiar-detail-modal">
        <div className="modal-head">
          <h2>
            <FeatherIcon size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            {nombreCompleto}
          </h2>
          <button className="modal-close" onClick={onClose} data-testid="familiar-detail-close">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="fam-detail-hero">
          <div className="fam-detail-portrait">
            {familiar.foto
              ? <img src={familiar.foto.startsWith('http') ? familiar.foto : (process.env.REACT_APP_BACKEND_URL + familiar.foto)} alt={nombreCompleto} />
              : <span className="fam-detail-initial">{(familiar.nombre[0] || '?').toUpperCase()}</span>
            }
          </div>
          <div className="fam-detail-meta">
            <div className="fam-detail-parentesco">{getParentescoLabel(familiar.parentesco)}</div>
            {periodo && <div className="fam-detail-period">{periodo}</div>}
            {familiar.lugar_nacimiento && (
              <div className="fam-detail-row"><span>Lugar de nacimiento:</span> {familiar.lugar_nacimiento}</div>
            )}
            {familiar.ocupacion && (
              <div className="fam-detail-row"><span>Oficio:</span> {familiar.ocupacion}</div>
            )}
            {epoca && (
              <div className="profile-badge" style={{ marginTop: 8 }}>
                <TempleIcon size={11} /> {epoca}
              </div>
            )}
          </div>
        </div>

        {familiar.bio && (
          <section className="fam-detail-section">
            <h3 className="fam-detail-section-title"><QuillInkIcon size={14} /> Biografía</h3>
            <p className="fam-detail-bio">{familiar.bio}</p>
          </section>
        )}

        {/* CAPA DE VALOR CHRONOS: contexto histórico */}
        {efemerides.length > 0 && (
          <section className="fam-detail-section">
            <h3 className="fam-detail-section-title">
              <CalendarIcon size={14} /> Cuando nació, en el mundo pasaba...
            </h3>
            <div className="fam-context-events">
              {efemerides.map((ev, i) => (
                <div key={i} className="fam-context-event">
                  <span className="fam-context-year">{ev.anio < 0 ? `${Math.abs(ev.anio)} a.C.` : ev.anio}</span>
                  <span className="fam-context-text">{ev.evento}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* HISTORIAS / ANÉCDOTAS */}
        <section className="fam-detail-section">
          <h3 className="fam-detail-section-title">
            <ChestIcon size={14} /> Anécdotas preservadas ({historias.length})
          </h3>
          <form onSubmit={submitHistoria} className="fam-historia-form">
            <input
              className="form-input" placeholder="Título (opcional)"
              value={historiaTitulo} onChange={(e) => setHistoriaTitulo(e.target.value)} maxLength={120}
              data-testid="historia-titulo-input"
            />
            <textarea
              className="form-textarea" rows={2}
              placeholder="Cuenta una anécdota, recuerdo, o historia sobre esta persona..."
              value={historiaTexto} onChange={(e) => setHistoriaTexto(e.target.value)} maxLength={2000}
              data-testid="historia-contenido-input"
            />
            <button type="submit" className="btn-primary" disabled={saving || !historiaTexto.trim()}
                    style={{ alignSelf: 'flex-end', fontSize: 11 }} data-testid="historia-submit-btn">
              {saving ? 'Guardando...' : '+ Agregar anécdota'}
            </button>
          </form>

          {historias.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--text-muted)', textAlign: 'center', marginTop: 16 }}>
              Aún no hay anécdotas. Comparte la primera.
            </p>
          ) : (
            <div className="fam-historias-list">
              {historias.map((h, idx) => (
                <div key={h._id || idx} className="fam-historia-card" data-testid={`historia-${idx}`}>
                  {h.titulo && <div className="fam-historia-title">{h.titulo}</div>}
                  <p className="fam-historia-text">{h.contenido}</p>
                  <button
                    className="fam-historia-delete"
                    onClick={() => eliminarHistoria(h._id)}
                    title="Eliminar anécdota"
                  >
                    <CloseIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="fam-detail-actions">
          <button className="btn-secondary" onClick={() => onEdit(familiar)} data-testid="familiar-edit-btn">
            <QuillInkIcon size={14} /> Editar
          </button>
          <button className="fam-detail-delete-btn" onClick={handleDelete} data-testid="familiar-delete-btn">
            <TabletDaggerIcon size={14} /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FamiliarDetailModal;
