import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CloseIcon, HornHeraldIcon, CommunitiesIcon } from './HistoricIcons';
import { playChronosTestChime } from '../utils/chronosSound';

const SONIDOS = [
  { id: 'cuerno', label: 'Cuerno de heraldo', desc: 'Fanfare clásico tipo medieval' },
  { id: 'lira', label: 'Lira griega', desc: 'Arpegio suave de cuerdas pulsadas' },
  { id: 'campana', label: 'Campana de monasterio', desc: 'Tañido grave con resonancia' },
  { id: 'silencio', label: 'Silencio total', desc: 'Solo notificación visual' }
];

const PreferenciasModal = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const [sonido, setSonido] = useState(user?.preferencias?.sonido_aviso || 'cuerno');
  const [arbolPublico, setArbolPublico] = useState(user?.preferencias?.arbol_publico || false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const probar = (id) => {
    setSonido(id);
    playChronosTestChime(id);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/usuarios/preferencias', {
        sonido_aviso: sonido,
        arbol_publico: arbolPublico
      });
      updateUser && updateUser(res.data.usuario);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="preferencias-backdrop">
      <div className="modal-content preferencias-modal" onClick={(e) => e.stopPropagation()} data-testid="preferencias-modal">
        <div className="modal-head">
          <h2>
            <HornHeraldIcon size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Preferencias del cronista
          </h2>
          <button className="modal-close" onClick={onClose} data-testid="preferencias-close">
            <CloseIcon size={18} />
          </button>
        </div>

        <form onSubmit={guardar}>
          {/* SONIDO */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: 12 }}>
              <HornHeraldIcon size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Sonido del cuerno (avisos)
            </label>
            <div className="sound-options" data-testid="sound-options">
              {SONIDOS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`sound-option ${sonido === s.id ? 'active' : ''}`}
                  onClick={() => probar(s.id)}
                  data-testid={`sound-option-${s.id}`}
                >
                  <div className="sound-option-label">{s.label}</div>
                  <div className="sound-option-desc">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* PRIVACIDAD DEL ÁRBOL */}
          <div className="form-group" style={{ marginTop: 24 }}>
            <label className="form-label" style={{ fontSize: 12 }}>
              <CommunitiesIcon size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Visibilidad de tu árbol familiar
            </label>
            <div className="toggle-row" data-testid="arbol-publico-toggle"
                 onClick={() => setArbolPublico(!arbolPublico)}>
              <div className="toggle-text">
                <strong>{arbolPublico ? 'Público' : 'Privado'}</strong>
                <small>
                  {arbolPublico
                    ? 'Otros cronistas pueden explorar tu legado familiar desde tu perfil.'
                    : 'Solo tú puedes ver y editar tu árbol familiar.'}
                </small>
              </div>
              <div className={`toggle-switch ${arbolPublico ? 'on' : ''}`}>
                <span className="toggle-knob"></span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving} data-testid="preferencias-submit-btn">
              {saving ? 'Guardando...' : 'Guardar preferencias'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PreferenciasModal;
