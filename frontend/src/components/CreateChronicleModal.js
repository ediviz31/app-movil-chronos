import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import haptic from '../utils/haptic';
import { CloseIcon, FeatherIcon } from './HistoricIcons';

const CATEGORIAS = [
  'Antigüedad', 'Edad Media', 'Edad Moderna', 'Edad Contemporánea',
  'Egipto antiguo', 'Roma imperial', 'Grecia clásica', 'Medievo',
  'Civilizaciones', 'Leyendas', 'Exploraciones',
  'América precolombina', 'Asia antigua', 'Personajes históricos'
];

const DRAFT_KEY = 'chronos_chronicle_draft';
const AUTOSAVE_MS = 5000;

const CreateChronicleModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    titulo: '', categoria: 'Antigüedad', contenido: ''
  });
  const [imagen, setImagen] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Borradores
  const [draftStatus, setDraftStatus] = useState('idle'); // 'idle' | 'saved' | 'restored'
  const [draftMeta, setDraftMeta] = useState(null);       // {ts, age}
  const [hasRestoredOnce, setHasRestoredOnce] = useState(false);
  const lastSavedSnapshot = useRef('');

  // Al abrir el modal: si hay borrador previo y no se ha restaurado aún, ofrecer recuperar
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || (!draft.titulo && !draft.contenido)) return;
      // Sólo restaurar si el modal está vacío y aún no se restauró
      if (formData.titulo || formData.contenido || hasRestoredOnce) return;
      const ageMs = Date.now() - (draft.ts || 0);
      const ageMin = Math.round(ageMs / 60000);
      const ageLabel = ageMin < 1 ? 'hace segundos'
                     : ageMin < 60 ? `hace ${ageMin}m`
                     : ageMin < 1440 ? `hace ${Math.floor(ageMin/60)}h`
                     : `hace ${Math.floor(ageMin/1440)}d`;
      setDraftMeta({ ts: draft.ts, ageLabel });
      // Auto-restaurar valores
      setFormData({
        titulo: draft.titulo || '',
        categoria: draft.categoria || 'Antigüedad',
        contenido: draft.contenido || ''
      });
      setDraftStatus('restored');
      setHasRestoredOnce(true);
    } catch (_) {}
  }, [isOpen]); // eslint-disable-line

  // Autosave cada 5s mientras el modal está abierto y hay contenido
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      const hasContent = formData.titulo.trim() || formData.contenido.trim();
      if (!hasContent) return;
      const snapshot = JSON.stringify(formData);
      if (snapshot === lastSavedSnapshot.current) return;
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...formData, ts: Date.now() }));
        lastSavedSnapshot.current = snapshot;
        setDraftStatus('saved');
      } catch (_) {}
    }, AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [isOpen, formData]);

  // Reset estado al cerrar (formData se restaurará desde localStorage al reabrir si hay borrador)
  useEffect(() => {
    if (!isOpen) {
      setHasRestoredOnce(false);
      setDraftStatus('idle');
      setDraftMeta(null);
      lastSavedSnapshot.current = '';
      setFormData({ titulo: '', categoria: 'Antigüedad', contenido: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (draftStatus === 'restored') setDraftStatus('idle');
  };

  const handleDiscardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
    setFormData({ titulo: '', categoria: 'Antigüedad', contenido: '' });
    setDraftStatus('idle');
    setDraftMeta(null);
    lastSavedSnapshot.current = '';
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagen(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagenPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(k => data.append(k, formData[k]));
      if (imagen) data.append('imagen', imagen);

      const response = await api.post('/relatos', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      haptic.success();
      // Borrador consumido: limpiar
      try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
      if (onSuccess) onSuccess(response.data.relato);
      setFormData({ titulo: '', categoria: 'Antigüedad', contenido: '' });
      setImagen(null); setImagenPreview(null);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear crónica');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="modal-backdrop">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>
            <FeatherIcon size={28} style={{ color: 'var(--gold)', marginRight: 14, verticalAlign: 'middle' }} />
            Nueva Crónica
          </h2>
          <button className="modal-close" onClick={onClose} data-testid="modal-close">
            <CloseIcon size={20} />
          </button>
        </div>

        {error && <div className="error-message" data-testid="modal-error">{error}</div>}

        {/* Banner de borrador recuperado */}
        {draftStatus === 'restored' && draftMeta && (
          <div className="draft-banner draft-banner-restored" data-testid="draft-restored-banner">
            <span>
              <strong>Borrador recuperado</strong> · guardado {draftMeta.ageLabel}
            </span>
            <button
              type="button"
              className="draft-banner-discard"
              onClick={handleDiscardDraft}
              data-testid="draft-discard-btn"
            >
              Descartar
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Título de la crónica</label>
            <input
              type="text" name="titulo" required maxLength={180}
              value={formData.titulo} onChange={handleChange}
              className="form-input"
              placeholder="¿Qué historia quieres preservar?"
              data-testid="input-titulo"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Época</label>
            <select
              name="categoria" value={formData.categoria} onChange={handleChange}
              className="form-select"
              data-testid="select-categoria"
            >
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Crónica</label>
            <textarea
              name="contenido" required value={formData.contenido} onChange={handleChange}
              className="form-textarea" rows={6}
              placeholder="Comparte el relato, fragmento o testimonio histórico..."
              data-testid="input-contenido"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Documento o Imagen (opcional)</label>
            <input
              type="file" accept="image/*" onChange={handleImageChange}
              className="form-input"
              data-testid="input-imagen"
            />
            {imagenPreview && (
              <div style={{ marginTop: 12, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border-mid)' }}>
                <img src={imagenPreview} alt="Preview" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block', filter: 'sepia(0.2) contrast(1.05)' }} />
              </div>
            )}
          </div>

          <div className="form-actions">
            {/* Indicador de autosave (sutil) */}
            <span
              className={`draft-status draft-status-${draftStatus}`}
              data-testid="draft-status"
              aria-live="polite"
            >
              {draftStatus === 'saved' && '· Borrador guardado'}
            </span>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading} data-testid="btn-publicar">
              {loading ? 'Preservando...' : 'Preservar Crónica'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChronicleModal;
