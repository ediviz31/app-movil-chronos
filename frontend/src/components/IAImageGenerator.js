/**
 * IAImageGenerator — Botón + diálogo para generar una imagen histórica con IA.
 * Llama a POST /api/ia/imagen, recibe { image_path } y notifica al padre con un
 * pseudo-File para que pueda ser incluida en el FormData del modal de creación.
 */
import React, { useState } from 'react';
import api from '../services/api';
import { getImageUrl } from '../utils/imageHelpers';
import haptic from '../utils/haptic';
import { OrnateStarIcon, CloseIcon } from './HistoricIcons';

const ESTILOS = [
  { id: 'pergamino', label: 'Pergamino' },
  { id: 'cinematic', label: 'Cinemático' },
  { id: 'realista', label: 'Realista' }
];

const IAImageGenerator = ({ onImageGenerated, contextHint }) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(contextHint || '');
  const [estilo, setEstilo] = useState('pergamino');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(null); // { image_path, url }

  const handleOpen = () => {
    haptic.light();
    setOpen(true);
    if (contextHint && !prompt) setPrompt(contextHint);
  };

  const reset = () => {
    setOpen(false);
    setPrompt('');
    setEstilo('pergamino');
    setError('');
    setGenerated(null);
    setLoading(false);
  };

  const generar = async () => {
    if (!prompt.trim()) { setError('Describe la escena que quieres ilustrar'); return; }
    setLoading(true); setError('');
    setGenerated(null);
    try {
      const res = await api.post('/ia/imagen', {
        prompt: prompt.trim(),
        estilo
      });
      const path = res.data?.image_path;
      if (!path) { setError('No se pudo generar la imagen'); return; }
      setGenerated({ image_path: path, url: getImageUrl(path) });
      haptic.success();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar la imagen');
    } finally {
      setLoading(false);
    }
  };

  const usar = async () => {
    if (!generated) return;
    try {
      // Descarga la imagen y la convierte en File para que el padre la suba como
      // si fuera una foto local (mismo flujo del input file).
      const r = await fetch(generated.url);
      const blob = await r.blob();
      const file = new File([blob], `ia-${Date.now()}.png`, { type: blob.type || 'image/png' });
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageGenerated && onImageGenerated({ file, dataUrl: reader.result, sourcePath: generated.image_path });
        reset();
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      setError('No se pudo cargar la imagen generada');
    }
  };

  return (
    <>
      <button
        type="button"
        className="ia-trigger-btn"
        onClick={handleOpen}
        data-testid="ia-image-trigger"
      >
        <OrnateStarIcon size={14} />
        Generar con IA
      </button>

      {open && (
        <div className="ia-overlay" onClick={reset} data-testid="ia-overlay">
          <div className="ia-panel" onClick={(e) => e.stopPropagation()}>
            <div className="ia-panel-head">
              <h3>
                <OrnateStarIcon size={18} style={{ color: 'var(--gold)', marginRight: 8, verticalAlign: 'middle' }} />
                Ilustración con IA
              </h3>
              <button type="button" className="ia-panel-close" onClick={reset} data-testid="ia-close">
                <CloseIcon size={18} />
              </button>
            </div>

            <p className="ia-panel-help">
              Describe la escena histórica y deja que el archivo digital la imagine para ti.
            </p>

            <label className="form-label">Descripción</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="form-textarea"
              rows={3}
              maxLength={500}
              placeholder="Ej. El templo del Coliseo al amanecer, multitud, soldados romanos, atmósfera dramática"
              data-testid="ia-prompt"
            />

            <label className="form-label ia-section-label">Estilo</label>
            <div className="ia-style-row">
              {ESTILOS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`ia-style-btn ${estilo === s.id ? 'is-active' : ''}`}
                  onClick={() => setEstilo(s.id)}
                  data-testid={`ia-estilo-${s.id}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {error && <div className="error-message" style={{ marginTop: 14 }}>{error}</div>}

            {loading && (
              <div className="ia-loading-magic" data-testid="ia-loading">
                <div className="ia-magic-spinner" />
                <div className="ia-loading-magic-text">Imaginando tu escena…</div>
                <div className="ia-loading-magic-sub">◆ El archivo está dibujando ◆</div>
              </div>
            )}

            {generated && !loading && (
              <div className="ia-preview" data-testid="ia-preview">
                <img src={generated.url} alt="Imagen generada" />
              </div>
            )}

            <div className="ia-panel-actions">
              {!generated ? (
                <>
                  <button type="button" className="btn-secondary" onClick={reset}>Cancelar</button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={loading || !prompt.trim()}
                    onClick={generar}
                    data-testid="ia-generar"
                  >
                    {loading ? 'Imaginando…' : 'Generar imagen'}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-secondary" onClick={() => { setGenerated(null); }}>
                    Regenerar
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={usar}
                    data-testid="ia-usar"
                  >
                    Usar esta imagen
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default IAImageGenerator;
