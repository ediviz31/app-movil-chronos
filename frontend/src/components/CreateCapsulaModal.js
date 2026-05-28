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

const EPOCAS = [
  'Antigüedad', 'Edad Media', 'Edad Moderna', 'Edad Contemporánea',
  'Roma imperial', 'Grecia clásica', 'Civilizaciones', 'Personajes históricos'
];
const MAX = 320;

const CreateCapsulaModal = ({ isOpen, onClose, onCreated }) => {
  const [texto, setTexto] = useState('');
  const [epoca, setEpoca] = useState('');
  const [lugar, setLugar] = useState('');
  const [anio, setAnio] = useState('');
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleImagen = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImagen(f);
    const r = new FileReader();
    r.onloadend = () => setPreview(r.result);
    r.readAsDataURL(f);
  };

  const reset = () => {
    setTexto(''); setEpoca(''); setLugar(''); setAnio('');
    setImagen(null); setPreview(null); setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!texto.trim()) { setError('El texto es requerido'); return; }
    if (texto.length > MAX) { setError(`Máximo ${MAX} caracteres`); return; }
    setLoading(true); setError('');
    try {
      const data = new FormData();
      data.append('texto', texto.trim());
      if (epoca) data.append('epoca', epoca);
      if (lugar.trim()) data.append('lugar', lugar.trim());
      if (anio) data.append('anio', anio);
      if (imagen) data.append('imagen', imagen);

      const res = await api.post('/capsulas', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      haptic.success();
      onCreated && onCreated(res.data);
      reset();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear cápsula');
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

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !texto.trim()}
              data-testid="capsule-btn-publicar"
            >
              {loading ? 'Sellando...' : 'Encender cápsula'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    container
  );
};

export default CreateCapsulaModal;
