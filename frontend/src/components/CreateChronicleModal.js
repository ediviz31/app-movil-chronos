import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import haptic from '../utils/haptic';
import { CloseIcon, FeatherIcon } from './HistoricIcons';
import IAImageGenerator from './IAImageGenerator';
import TorchProgress from './TorchProgress';
import { playTorchIgnite, playUploadComplete } from '../utils/chronosSound';

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
    titulo: '', categoria: 'Antigüedad', contenido: '',
    historia_anio: '', historia_lugar: ''
  });
  const [imagen, setImagen] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [video, setVideo] = useState(null);
  const [videoName, setVideoName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0); // 0..100 mientras sube
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
        contenido: draft.contenido || '',
        historia_anio: draft.historia_anio || '',
        historia_lugar: draft.historia_lugar || ''
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
      setFormData({ titulo: '', categoria: 'Antigüedad', contenido: '', historia_anio: '', historia_lugar: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (draftStatus === 'restored') setDraftStatus('idle');
  };

  const handleDiscardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
    setFormData({ titulo: '', categoria: 'Antigüedad', contenido: '', historia_anio: '', historia_lugar: '' });
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

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // 100MB máximo (límite multer del backend)
    const MAX_MB = 100;
    if (file.size > MAX_MB * 1024 * 1024) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      setError(`Tu video pesa ${sizeMb} MB. El máximo es ${MAX_MB} MB. Intenta grabarlo en menor calidad o comprime el archivo.`);
      return;
    }
    setError('');
    setVideo(file);
    setVideoName(file.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    setUploadProgress(0);
    const hasVideo = !!video;
    // Si hay video, encendemos la antorcha
    if (hasVideo) {
      try { playTorchIgnite(); } catch (_) {}
    }
    try {
      const data = new FormData();
      Object.keys(formData).forEach(k => data.append(k, formData[k]));
      if (imagen) data.append('imagen', imagen);
      if (video) data.append('video', video);

      const response = await api.post('/relatos', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            const pct = (e.loaded / e.total) * 100;
            setUploadProgress(pct);
          }
        }
      });
      if (hasVideo) {
        try { playUploadComplete(); } catch (_) {}
      }
      haptic.success();
      // Borrador consumido: limpiar
      try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
      if (onSuccess) onSuccess(response.data.relato);
      setFormData({ titulo: '', categoria: 'Antigüedad', contenido: '', historia_anio: '', historia_lugar: '' });
      setImagen(null); setImagenPreview(null);
      setVideo(null); setVideoName('');
      setUploadProgress(0);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear crónica');
      setUploadProgress(0);
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

          {/* Indicador histórico — opcional: año + lugar narrados */}
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div>
              <label className="form-label">
                Año histórico <span style={{ opacity: 0.6, fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                type="number" name="historia_anio"
                value={formData.historia_anio} onChange={handleChange}
                className="form-input"
                placeholder="Ej. 1453 · -44 a.C."
                data-testid="input-historia-anio"
              />
            </div>
            <div>
              <label className="form-label">
                Lugar histórico <span style={{ opacity: 0.6, fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                type="text" name="historia_lugar" maxLength={80}
                value={formData.historia_lugar} onChange={handleChange}
                className="form-input"
                placeholder="Ej. Constantinopla, Tenochtitlán..."
                data-testid="input-historia-lugar"
              />
            </div>
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
            <label className="form-label">Documento o Imagen <span style={{ opacity: 0.6, fontWeight: 400 }}>(opcional)</span></label>
            <div className="media-picker">
              <label className="media-picker-btn" data-testid="btn-imagen-camara">
                <span aria-hidden="true">📷</span> Tomar foto
                <input
                  type="file" accept="image/*" capture="environment"
                  onChange={handleImageChange}
                  hidden
                />
              </label>
              <label className="media-picker-btn" data-testid="btn-imagen-galeria">
                <span aria-hidden="true">🖼️</span> Subir de galería
                <input
                  type="file" accept="image/*"
                  onChange={handleImageChange}
                  hidden
                  data-testid="input-imagen"
                />
              </label>
            </div>
            {/* Generar imagen con IA */}
            <div style={{ marginTop: 8 }}>
              <IAImageGenerator
                contextHint={
                  [formData.titulo, formData.historia_lugar, formData.contenido?.slice(0, 80)]
                    .filter(Boolean).join(' · ')
                }
                onImageGenerated={({ file, dataUrl }) => {
                  setImagen(file);
                  setImagenPreview(dataUrl);
                }}
              />
            </div>
            {imagenPreview && (
              <div className="media-preview">
                <img src={imagenPreview} alt="Preview" />
                <button
                  type="button"
                  className="media-preview-remove"
                  onClick={() => { setImagen(null); setImagenPreview(null); }}
                  data-testid="btn-remove-imagen"
                  aria-label="Quitar imagen"
                >×</button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Video del sitio histórico <span style={{ opacity: 0.6, fontWeight: 400 }}>(opcional · máx 100 MB)</span>
            </label>
            <div className="media-picker">
              <label className="media-picker-btn" data-testid="btn-video-camara">
                <span aria-hidden="true">🎥</span> Grabar video
                <input
                  type="file" accept="video/*" capture="environment"
                  onChange={handleVideoChange}
                  hidden
                />
              </label>
              <label className="media-picker-btn" data-testid="btn-video-galeria">
                <span aria-hidden="true">📁</span> Subir de galería
                <input
                  type="file" accept="video/*"
                  onChange={handleVideoChange}
                  hidden
                  data-testid="input-video"
                />
              </label>
            </div>
            {video && (
              <div style={{
                marginTop: 10,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--gold-soft)',
                background: 'var(--gold-ghost)',
                fontFamily: 'var(--font-elegant)',
                fontSize: 12,
                letterSpacing: '0.04em',
                color: 'var(--gold)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>📹 {videoName} ({(video.size / 1024 / 1024).toFixed(1)} MB)</span>
                <button
                  type="button"
                  onClick={() => { setVideo(null); setVideoName(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 18, lineHeight: 1
                  }}
                  data-testid="btn-remove-video"
                  title="Quitar video"
                >×</button>
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
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading} data-testid="btn-publicar">
              {loading
                ? (video ? 'Encendiendo la antorcha…' : 'Preservando…')
                : 'Preservar Crónica'}
            </button>
          </div>

          {/* Barra de antorcha: aparece cuando se está subiendo con video */}
          {loading && video && (
            <TorchProgress
              progress={uploadProgress}
              label="Avanzando por el archivo…"
            />
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateChronicleModal;
