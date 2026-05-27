import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { CloseIcon, PlusOrnateIcon, QuillInkIcon } from './HistoricIcons';
import { PARENTESCO_OPTIONS } from '../utils/parentescoMap';

const initialForm = {
  nombre: '', apellido: '', genero: '', fecha_nacimiento: '', fecha_defuncion: '',
  lugar_nacimiento: '', ocupacion: '', bio: '', parentesco: 'padre', foto: ''
};

const AddFamiliarModal = ({ isOpen, onClose, onSaved, editing = null }) => {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (editing) {
      setForm({
        nombre: editing.nombre || '',
        apellido: editing.apellido || '',
        genero: editing.genero || '',
        fecha_nacimiento: editing.fecha_nacimiento || '',
        fecha_defuncion: editing.fecha_defuncion || '',
        lugar_nacimiento: editing.lugar_nacimiento || '',
        ocupacion: editing.ocupacion || '',
        bio: editing.bio || '',
        parentesco: editing.parentesco || 'padre',
        foto: editing.foto || ''
      });
    } else {
      setForm(initialForm);
    }
    setError('');
  }, [editing, isOpen]);

  if (!isOpen) return null;

  const handle = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true);
    setError('');
    try {
      let saved;
      if (editing) {
        const res = await api.put(`/familiares/${editing._id}`, form);
        saved = res.data.familiar;
      } else {
        const res = await api.post('/familiares', form);
        saved = res.data.familiar;
      }
      // Si hay archivo pendiente, lo subimos ahora
      if (fileRef.current?.files?.[0] && saved._id) {
        setUploadingFoto(true);
        const fd = new FormData();
        fd.append('imagen', fileRef.current.files[0]);
        const photoRes = await api.post(`/familiares/${saved._id}/foto`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        saved.foto = photoRes.data.foto;
        setUploadingFoto(false);
      }
      onSaved && onSaved(saved);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar familiar');
    } finally {
      setSaving(false);
      setUploadingFoto(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="add-familiar-backdrop">
      <div className="modal-content add-familiar-modal" onClick={(e) => e.stopPropagation()} data-testid="add-familiar-modal">
        <div className="modal-head">
          <h2>
            <QuillInkIcon size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            {editing ? 'Editar familiar' : 'Agregar familiar al legado'}
          </h2>
          <button className="modal-close" onClick={onClose} data-testid="add-familiar-close">
            <CloseIcon size={18} />
          </button>
        </div>

        {error && <div className="error-message" data-testid="add-familiar-error">{error}</div>}

        <form onSubmit={submit} className="add-familiar-form">
          {/* FOTO */}
          <div className="form-group" style={{ textAlign: 'center' }}>
            <label className="form-label" style={{ display: 'block' }}>Foto / retrato</label>
            <div className="fam-foto-preview" onClick={() => fileRef.current?.click()}>
              {form.foto
                ? <img src={form.foto.startsWith('http') ? form.foto : (process.env.REACT_APP_BACKEND_URL + form.foto)} alt="" />
                : <PlusOrnateIcon size={28} style={{ color: 'var(--gold)' }} />
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} data-testid="familiar-foto-input"
                   onChange={(e) => { const f = e.target.files[0]; if (f) handle('foto', URL.createObjectURL(f)); }} />
            <small style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)' }}>
              Haz clic para subir
            </small>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-input" value={form.nombre} onChange={(e) => handle('nombre', e.target.value)}
                     maxLength={80} required data-testid="familiar-nombre-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Apellido</label>
              <input className="form-input" value={form.apellido} onChange={(e) => handle('apellido', e.target.value)}
                     maxLength={80} data-testid="familiar-apellido-input" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Parentesco *</label>
              <select className="form-select" value={form.parentesco}
                      onChange={(e) => handle('parentesco', e.target.value)}
                      data-testid="familiar-parentesco-input">
                {PARENTESCO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Género</label>
              <select className="form-select" value={form.genero}
                      onChange={(e) => handle('genero', e.target.value)}>
                <option value="">Sin especificar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Año/Fecha nacimiento</label>
              <input className="form-input" value={form.fecha_nacimiento}
                     onChange={(e) => handle('fecha_nacimiento', e.target.value)}
                     placeholder="1925 o 1925-06-12" data-testid="familiar-nacimiento-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Año/Fecha defunción</label>
              <input className="form-input" value={form.fecha_defuncion}
                     onChange={(e) => handle('fecha_defuncion', e.target.value)}
                     placeholder="(opcional)" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Lugar de nacimiento</label>
            <input className="form-input" value={form.lugar_nacimiento}
                   onChange={(e) => handle('lugar_nacimiento', e.target.value)}
                   maxLength={120} placeholder="Ciudad, país" />
          </div>

          <div className="form-group">
            <label className="form-label">Ocupación / Oficio</label>
            <input className="form-input" value={form.ocupacion}
                   onChange={(e) => handle('ocupacion', e.target.value)}
                   maxLength={80} placeholder="Ej. Carpintero, Médica, Soldado..." />
          </div>

          <div className="form-group">
            <label className="form-label">Biografía / Historia</label>
            <textarea className="form-textarea" rows={3} value={form.bio}
                      onChange={(e) => handle('bio', e.target.value)} maxLength={1500}
                      placeholder="Lo que recuerdas o sabes de esta persona..." />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving || uploadingFoto} data-testid="familiar-submit-btn">
              {saving || uploadingFoto ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Agregar al árbol')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFamiliarModal;
