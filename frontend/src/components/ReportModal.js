/**
 * Modal de reporte comunitario. Genérico para relato/comentario/fragmento/cápsula/usuario.
 *
 * Uso:
 *   <ReportModal
 *     isOpen={open}
 *     onClose={()=>setOpen(false)}
 *     tipoObjetivo="relato"
 *     objetivoId={relato._id}
 *     contextLabel={relato.titulo}
 *   />
 */
import React, { useState } from 'react';
import api from '../services/api';
import haptic from '../utils/haptic';

const MOTIVOS = [
  { id: 'spam',           label: 'Spam o autopromoción excesiva' },
  { id: 'odio',           label: 'Discurso de odio o discriminación' },
  { id: 'desinformacion', label: 'Información histórica falsa o engañosa' },
  { id: 'violencia',      label: 'Violencia explícita o amenazas' },
  { id: 'desnudez',       label: 'Contenido sexual o desnudez' },
  { id: 'plagio',         label: 'Plagio o uso indebido de fuentes' },
  { id: 'acoso',          label: 'Acoso o intimidación' },
  { id: 'otro',           label: 'Otro motivo' }
];

const ReportModal = ({ isOpen, onClose, tipoObjetivo, objetivoId, contextLabel = '' }) => {
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setMotivo('');
    setDetalle('');
    setDone(false);
    setError(null);
    onClose && onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!motivo) { setError('Selecciona un motivo'); return; }
    setSubmitting(true);
    setError(null);
    haptic.light();
    try {
      await api.post('/reportes', {
        tipo_objetivo: tipoObjetivo,
        objetivo_id: objetivoId,
        motivo,
        detalle: detalle.trim()
      });
      setDone(true);
    } catch (e) {
      const msg = e.response?.data?.error || 'No se pudo enviar el reporte';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="report-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      data-testid="report-modal"
    >
      <div className="report-modal" role="dialog" aria-modal="true">
        <div className="report-modal-head">
          <div>
            <div className="report-modal-kicker">◆ Reportar al maestro del archivo ◆</div>
            <h3 className="report-modal-title">
              {done ? 'Reporte recibido' : 'Algo no encaja en esta crónica'}
            </h3>
          </div>
          <button
            type="button"
            className="report-modal-close"
            onClick={handleClose}
            aria-label="Cerrar"
            data-testid="report-modal-close"
          >×</button>
        </div>

        {done ? (
          <div className="report-modal-done">
            <div className="report-modal-done-ico" aria-hidden="true">⌛</div>
            <p>El maestro del archivo revisará tu reporte.</p>
            <p className="report-modal-done-sub">Gracias por mantener viva la integridad de Chronos.</p>
            <button type="button" className="report-modal-submit" onClick={handleClose} data-testid="report-modal-done-btn">
              De acuerdo
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="report-modal-body">
            {contextLabel && (
              <div className="report-modal-context">
                <span className="report-modal-context-lab">Reportando:</span>
                <span className="report-modal-context-val">{contextLabel}</span>
              </div>
            )}

            <div className="report-modal-section-lab">Motivo</div>
            <div className="report-modal-motivos">
              {MOTIVOS.map(m => (
                <label
                  key={m.id}
                  className={`report-modal-motivo ${motivo === m.id ? 'is-active' : ''}`}
                  data-testid={`report-motivo-${m.id}`}
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={m.id}
                    checked={motivo === m.id}
                    onChange={() => setMotivo(m.id)}
                  />
                  <span>{m.label}</span>
                </label>
              ))}
            </div>

            <div className="report-modal-section-lab">
              Detalle <span className="report-modal-opt">(opcional, máx 600)</span>
            </div>
            <textarea
              className="report-modal-textarea"
              placeholder="Cuéntale al maestro del archivo qué observaste…"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value.slice(0, 600))}
              rows={4}
              data-testid="report-modal-detalle"
            />
            <div className="report-modal-counter">{detalle.length}/600</div>

            {error && <div className="report-modal-error">⌛ {error}</div>}

            <div className="report-modal-actions">
              <button type="button" className="report-modal-cancel" onClick={handleClose}>
                Cancelar
              </button>
              <button
                type="submit"
                className="report-modal-submit"
                disabled={submitting || !motivo}
                data-testid="report-modal-submit"
              >
                {submitting ? 'Enviando…' : 'Enviar reporte'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
