/**
 * CreateFragmentoModal — Composer para crear un Fragmento del Tiempo (reel histórico).
 * Incluye barra antorcha + sonidos al subir el video.
 */
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import api from '../services/api';
import haptic from '../utils/haptic';
import TorchProgress from './TorchProgress';
import { playTorchIgnite, playUploadComplete } from '../utils/chronosSound';
import { CloseIcon } from './HistoricIcons';

const CATEGORIAS = [
  { id: 'historia_local', label: 'Historia local', ico: '▣' },
  { id: 'personajes', label: 'Personajes', ico: '☼' },
  { id: 'lugares', label: 'Lugares', ico: '◉' },
  { id: 'documentos', label: 'Documentos', ico: '⌑' }
];

const MAX_VIDEO_MB = 100;

const CreateFragmentoModal = ({ isOpen, onClose, onCreated }) => {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('historia_local');
  const [lugar, setLugar] = useState('');
  const [anio, setAnio] = useState('');
  const [fuente, setFuente] = useState('');
  const [video, setVideo] = useState(null);
  const [videoName, setVideoName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  const handleVideo = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`Tu video pesa ${(f.size / 1024 / 1024).toFixed(1)} MB. El máximo es ${MAX_VIDEO_MB} MB.`);
      return;
    }
    setError('');
    setVideo(f);
    setVideoName(f.name);
  };

  const reset = () => {
    setTitulo(''); setDescripcion(''); setCategoria('historia_local');
    setLugar(''); setAnio(''); setFuente('');
    setVideo(null); setVideoName('');
    setError(''); setUploadProgress(0); setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose && onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) { setError('Dale un título al fragmento'); return; }
    if (!video) { setError('Selecciona o graba un video'); return; }
    setLoading(true); setError(''); setUploadProgress(0);
    try { playTorchIgnite(); } catch (_) {}
    try {
      const data = new FormData();
      data.append('titulo', titulo.trim());
      data.append('descripcion', descripcion.trim());
      data.append('categoria', categoria);
      if (lugar.trim()) data.append('lugar', lugar.trim());
      if (anio) data.append('anio', anio);
      if (fuente.trim()) data.append('fuente', fuente.trim());
      data.append('video', video);

      const res = await api.post('/fragmentos', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          if (ev.total) setUploadProgress((ev.loaded / ev.total) * 100);
        }
      });
      try { playUploadComplete(); } catch (_) {}
      haptic.success();
      onCreated && onCreated(res.data);
      reset();
      onClose && onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el fragmento');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const container = typeof document !== 'undefined' ? document.body : null;
  if (!container) return null;

  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={handleClose} data-testid="fragmento-modal-backdrop">
      <div className="modal-content fragmento-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>
            <span style={{ color: 'var(--gold)', marginRight: 12, fontSize: 24 }}>▣</span>
            Nuevo Fragmento del Tiempo
          </h2>
          <button className="modal-close" onClick={handleClose} disabled={loading} data-testid="fragmento-modal-close">
            <CloseIcon size={20} />
          </button>
        </div>

        <p className="fragmento-modal-intro">
          Un video breve que preserva memoria. Lugares, personas, documentos del pasado.
        </p>

        {error && <div className="error-message" data-testid="fragmento-error">{error}</div>}

        <form onSubmit={submit}>
          {/* Categoría */}
          <div className="form-group">
            <label className="form-label">Categoría</label>
            <div className="fragmento-cat-grid">
              {CATEGORIAS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`fragmento-cat-btn ${categoria === c.id ? 'is-active' : ''}`}
                  onClick={() => setCategoria(c.id)}
                  data-testid={`fragmento-cat-${c.id}`}
                >
                  <span aria-hidden="true">{c.ico}</span> {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div className="form-group">
            <label className="form-label">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              className="form-input"
              maxLength={140}
              placeholder="La plaza que cambió con el tiempo"
              data-testid="fragmento-titulo"
              required
            />
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label className="form-label">Descripción <span style={{ opacity: 0.6 }}>(opcional)</span></label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className="form-textarea"
              rows={3}
              maxLength={600}
              placeholder="Cuenta brevemente la historia detrás de este fragmento..."
              data-testid="fragmento-descripcion"
            />
          </div>

          {/* Lugar + Año */}
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Lugar <span style={{ opacity: 0.6 }}>(opcional)</span></label>
              <input
                type="text"
                value={lugar}
                onChange={e => setLugar(e.target.value)}
                className="form-input"
                maxLength={80}
                placeholder="México, Roma..."
                data-testid="fragmento-lugar"
              />
            </div>
            <div>
              <label className="form-label">Año</label>
              <input
                type="number"
                value={anio}
                onChange={e => setAnio(e.target.value)}
                className="form-input"
                placeholder="1920"
                data-testid="fragmento-anio"
              />
            </div>
          </div>

          {/* Fuente */}
          <div className="form-group">
            <label className="form-label">Fuente <span style={{ opacity: 0.6 }}>(opcional)</span></label>
            <input
              type="text"
              value={fuente}
              onChange={e => setFuente(e.target.value)}
              className="form-input"
              maxLength={220}
              placeholder="Archivo municipal / Biblioteca Nacional..."
              data-testid="fragmento-fuente"
            />
          </div>

          {/* Video */}
          <div className="form-group">
            <label className="form-label">
              Video <span style={{ opacity: 0.6 }}>(requerido · máx {MAX_VIDEO_MB} MB)</span>
            </label>
            <div className="media-picker">
              <label className="media-picker-btn" data-testid="fragmento-btn-camara">
                <span aria-hidden="true">🎥</span> Grabar
                <input type="file" accept="video/*" capture="environment" onChange={handleVideo} hidden />
              </label>
              <label className="media-picker-btn" data-testid="fragmento-btn-galeria">
                <span aria-hidden="true">📁</span> Subir
                <input type="file" accept="video/*" onChange={handleVideo} hidden data-testid="fragmento-input-video" />
              </label>
            </div>
            {video && (
              <div className="fragmento-video-info">
                <span>📹 {videoName} ({(video.size / 1024 / 1024).toFixed(1)} MB)</span>
                <button
                  type="button"
                  onClick={() => { setVideo(null); setVideoName(''); }}
                  className="fragmento-video-remove"
                  data-testid="fragmento-btn-remove-video"
                  aria-label="Quitar video"
                >×</button>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={handleClose} disabled={loading}>Cancelar</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !titulo.trim() || !video}
              data-testid="fragmento-btn-publicar"
            >
              {loading ? 'Encendiendo la antorcha…' : 'Preservar fragmento'}
            </button>
          </div>

          {/* Barra antorcha */}
          {loading && video && (
            <TorchProgress progress={uploadProgress} label="Avanzando por el archivo…" />
          )}
        </form>
      </div>
    </div>,
    container
  );
};

export default CreateFragmentoModal;
