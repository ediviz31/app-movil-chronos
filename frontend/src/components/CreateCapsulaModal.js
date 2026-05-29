/**
 * Modal para crear Cápsula del Tiempo (24h de vida).
 * Texto corto + opcional imagen, época, lugar y año.
 */
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import api from '../services/api';
import haptic from '../utils/haptic';
import { CloseIcon, HourglassIcon } from './HistoricIcons';
import IAImageGenerator from './IAImageGenerator';
import TorchProgress from './TorchProgress';
import { playTorchIgnite, playUploadComplete } from '../utils/chronosSound';

const EPOCAS = [
  'Antigüedad', 'Edad Media', 'Edad Moderna', 'Edad Contemporánea',
  'Roma imperial', 'Grecia clásica', 'Civilizaciones', 'Personajes históricos'
];
const MAX = 320;
const MAX_VIDEO_MB = 60;

const CreateCapsulaModal = ({ isOpen, onClose, onCreated }) => {
  const [texto, setTexto] = useState('');
  const [epoca, setEpoca] = useState('');
  const [lugar, setLugar] = useState('');
  const [anio, setAnio] = useState('');
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState(null);
  const [video, setVideo] = useState(null);
  const [videoName, setVideoName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  const handleImagen = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImagen(f);
    const r = new FileReader();
    r.onloadend = () => setPreview(r.result);
    r.readAsDataURL(f);
  };

  const handleVideo = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
      const sizeMb = (f.size / 1024 / 1024).toFixed(1);
      setError(`Tu video pesa ${sizeMb} MB. El máximo para cápsulas es ${MAX_VIDEO_MB} MB.`);
      return;
    }
    setError('');
    setVideo(f);
    setVideoName(f.name);
  };

  const reset = () => {
    setTexto(''); setEpoca(''); setLugar(''); setAnio('');
    setImagen(null); setPreview(null);
    setVideo(null); setVideoName('');
    setError(''); setUploadProgress(0);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!texto.trim()) { setError('El texto es requerido'); return; }
    if (texto.length > MAX) { setError(`Máximo ${MAX} caracteres`); return; }
    setLoading(true); setError('');
    setUploadProgress(0);
    const hasVideo = !!video;
    if (hasVideo) {
      try { playTorchIgnite(); } catch (_) {}
    }
    try {
      const data = new FormData();
      data.append('texto', texto.trim());
      if (epoca) data.append('epoca', epoca);
      if (lugar.trim()) data.append('lugar', lugar.trim());
      if (anio) data.append('anio', anio);
      if (imagen) data.append('imagen', imagen);
      if (video) data.append('video', video);

      const res = await api.post('/capsulas', data, {
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
      onCreated && onCreated(res.data);
      reset();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear cápsula');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const left = MAX - texto.length;

  const container = typeof document !== 'undefined' ? document.body : null;
  if (!container) return null;

  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={onClose} data-testid="capsule-modal-backdrop">
      <div className="modal-content capsule-create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>
            <HourglassIcon size={26} style={{ color: 'var(--gold)', marginRight: 12, verticalAlign: 'middle' }} />
            Nueva Cápsula del Tiempo
          </h2>
          <button className="modal-close" onClick={onClose} data-testid="capsule-modal-close">
            <CloseIcon size={20} />
          </button>
        </div>

        <p style={{
          margin: '0 0 14px',
          fontFamily: 'var(--font-elegant)',
          fontSize: 12,
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          fontStyle: 'italic'
        }}>
          Tu cápsula brillará durante 24 horas, luego se sellará para siempre.
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">
              Fragmento histórico
              <span style={{ float: 'right', opacity: 0.7, fontSize: 11, fontWeight: 400 }}>
                {left} caracteres
              </span>
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="form-textarea"
              rows={4}
              maxLength={MAX}
              placeholder="Un pensamiento, un descubrimiento, un fragmento del pasado..."
              data-testid="capsule-input-texto"
              required
            />
          </div>

          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Época</label>
              <select
                value={epoca}
                onChange={(e) => setEpoca(e.target.value)}
                className="form-select"
                data-testid="capsule-input-epoca"
              >
                <option value="">— Sin época —</option>
                {EPOCAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Año <span style={{ opacity: 0.6 }}>(opcional)</span></label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                className="form-input"
                placeholder="Ej. 1453"
                data-testid="capsule-input-anio"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Lugar histórico <span style={{ opacity: 0.6 }}>(opcional)</span></label>
            <input
              type="text"
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              className="form-input"
              maxLength={80}
              placeholder="Constantinopla, Tenochtitlán..."
              data-testid="capsule-input-lugar"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Imagen <span style={{ opacity: 0.6 }}>(opcional)</span></label>
            <div className="media-picker">
              <label className="media-picker-btn" data-testid="capsule-btn-camara">
                <span aria-hidden="true">📷</span> Tomar foto
                <input
                  type="file" accept="image/*" capture="environment"
                  onChange={handleImagen}
                  hidden
                />
              </label>
              <label className="media-picker-btn" data-testid="capsule-btn-galeria">
                <span aria-hidden="true">🖼️</span> Subir de galería
                <input
                  type="file" accept="image/*"
                  onChange={handleImagen}
                  hidden
                  data-testid="capsule-input-imagen"
                />
              </label>
            </div>
            {/* Generar imagen con IA */}
            <div style={{ marginTop: 8 }}>
              <IAImageGenerator
                contextHint={
                  [texto?.slice(0, 100), lugar, epoca].filter(Boolean).join(' · ')
                }
                onImageGenerated={({ file, dataUrl }) => {
                  setImagen(file);
                  setPreview(dataUrl);
                }}
              />
            </div>
            {preview && (
              <div className="media-preview">
                <img src={preview} alt="" />
                <button
                  type="button"
                  className="media-preview-remove"
                  onClick={() => { setImagen(null); setPreview(null); }}
                  data-testid="capsule-btn-remove-imagen"
                  aria-label="Quitar imagen"
                >×</button>
              </div>
            )}
          </div>

          {/* Video corto (opcional, máx 60MB) */}
          <div className="form-group">
            <label className="form-label">
              Video corto <span style={{ opacity: 0.6 }}>(opcional · máx {MAX_VIDEO_MB} MB)</span>
            </label>
            <div className="media-picker">
              <label className="media-picker-btn" data-testid="capsule-btn-video-camara">
                <span aria-hidden="true">🎥</span> Grabar
                <input
                  type="file" accept="video/*" capture="environment"
                  onChange={handleVideo}
                  hidden
                />
              </label>
              <label className="media-picker-btn" data-testid="capsule-btn-video-galeria">
                <span aria-hidden="true">📁</span> Subir
                <input
                  type="file" accept="video/*"
                  onChange={handleVideo}
                  hidden
                  data-testid="capsule-input-video"
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
                  data-testid="capsule-btn-remove-video"
                  title="Quitar video"
                >×</button>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !texto.trim()}
              data-testid="capsule-btn-publicar"
            >
              {loading
                ? (video ? 'Encendiendo la antorcha…' : 'Sellando…')
                : 'Encender cápsula'}
            </button>
          </div>

          {/* Barra de antorcha mientras sube con video */}
          {loading && video && (
            <TorchProgress
              progress={uploadProgress}
              label="Avanzando por el archivo…"
            />
          )}
        </form>
      </div>
    </div>,
    container
  );
};

export default CreateCapsulaModal;
