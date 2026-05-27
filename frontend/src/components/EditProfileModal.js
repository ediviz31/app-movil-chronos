import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { QuillInkIcon, CloseIcon, HornHeraldIcon } from './HistoricIcons';
import PreferenciasModal from './PreferenciasModal';

const TEMAS = [
  'Civilizaciones', 'Civilizaciones Antiguas', 'Roma imperial', 'Egipto antiguo',
  'Medievo', 'Edad Media', 'Edad Moderna', 'Edad Contemporánea',
  'Leyendas', 'Exploraciones', 'Imperios', 'Filosofía', 'Arte'
];

const EditProfileModal = ({ isOpen, onClose, onSaved }) => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    bio: user?.bio || '',
    interes: user?.interes || '',
    tema_favorito: user?.tema_favorito || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [prefsOpen, setPrefsOpen] = useState(false);

  if (!isOpen) return null;

  const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.nombre.trim()) {
      setError('El nombre no puede estar vacío');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/usuarios/perfil', form);
      updateUser && updateUser(res.data.usuario);
      onSaved && onSaved(res.data.usuario);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      data-testid="edit-profile-backdrop"
    >
      <div
        className="modal-content edit-profile-modal"
        onClick={(e) => e.stopPropagation()}
        data-testid="edit-profile-modal"
      >
        <div className="modal-head">
          <h2><QuillInkIcon size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Editar legado
          </h2>
          <button className="modal-close" onClick={onClose} data-testid="edit-profile-close">
            <CloseIcon size={18} />
          </button>
        </div>

        {error && <div className="error-message" data-testid="edit-profile-error">{error}</div>}

        <form onSubmit={submit} className="edit-profile-form">
          <div className="form-group">
            <label className="form-label">Nombre del cronista</label>
            <input
              className="form-input"
              value={form.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              maxLength={80}
              data-testid="edit-input-nombre"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Biografía</label>
            <textarea
              className="form-textarea"
              value={form.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              maxLength={220}
              placeholder="Describe tu pasión por la historia en pocas líneas..."
              rows={3}
              data-testid="edit-input-bio"
            />
            <small style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)' }}>
              {form.bio.length} / 220
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Interés principal</label>
            <input
              className="form-input"
              value={form.interes}
              onChange={(e) => handleChange('interes', e.target.value)}
              maxLength={60}
              placeholder="Ej. Arquitectura romana, Mitología nórdica..."
              data-testid="edit-input-interes"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Época favorita</label>
            <select
              className="form-select"
              value={form.tema_favorito}
              onChange={(e) => handleChange('tema_favorito', e.target.value)}
              data-testid="edit-input-tema"
            >
              <option value="">Sin especificar</option>
              {TEMAS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPrefsOpen(true)}
              data-testid="open-preferencias-btn"
              style={{ marginRight: 'auto' }}
            >
              <HornHeraldIcon size={12} /> Sonido y privacidad
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              data-testid="edit-profile-cancel"
            >Cancelar</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              data-testid="edit-profile-submit"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
      <PreferenciasModal isOpen={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </div>
  );
};

export default EditProfileModal;
