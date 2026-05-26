import React, { useState } from 'react';
import api from '../services/api';

const CATEGORIAS = [
  'Egipto antiguo', 'Roma imperial', 'Grecia clásica', 'Medievo',
  'Civilizaciones', 'Leyendas', 'Exploraciones', 'Edad Antigua',
  'Edad Media', 'Renacimiento', 'Edad Moderna', 'Edad Contemporánea',
  'América precolombina', 'Asia antigua', 'Personajes históricos'
];

const CreateRelatoModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    titulo: '',
    categoria: 'Civilizaciones',
    contenido: ''
  });
  const [imagen, setImagen] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    setError('');
    setLoading(true);

    try {
      const data = new FormData();
      data.append('titulo', formData.titulo);
      data.append('categoria', formData.categoria);
      data.append('contenido', formData.contenido);
      if (imagen) data.append('imagen', imagen);

      const response = await api.post('/relatos', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (onSuccess) onSuccess(response.data.relato);
      setFormData({ titulo: '', categoria: 'Civilizaciones', contenido: '' });
      setImagen(null);
      setImagenPreview(null);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear relato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflow: 'auto'
      }}
      data-testid="modal-crear-relato"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="panel"
        style={{ width: '100%', maxWidth: '640px', padding: '32px', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ font: '500 28px Georgia, serif', color: 'var(--gold-accent)', margin: 0 }}>
            <i className="ri-quill-pen-line" style={{ color: 'var(--gold-primary)', marginRight: '12px' }}></i>
            Nuevo Relato
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '28px', cursor: 'pointer' }} data-testid="btn-cerrar-modal">×</button>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', background: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)', color: '#E57373' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--gold-primary)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Título del relato
            </label>
            <input
              type="text"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              required
              maxLength={180}
              data-testid="input-titulo"
              style={{ width: '100%', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', fontSize: '16px', fontFamily: 'Georgia, serif' }}
              placeholder="¿Qué historia quieres compartir?"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--gold-primary)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Época / Categoría
            </label>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              data-testid="select-categoria"
              style={{ width: '100%', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', fontSize: '14px' }}
            >
              {CATEGORIAS.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--gold-primary)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Contenido
            </label>
            <textarea
              name="contenido"
              value={formData.contenido}
              onChange={handleChange}
              required
              rows={8}
              data-testid="input-contenido"
              style={{ width: '100%', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', fontSize: '14px', resize: 'vertical', lineHeight: 1.6 }}
              placeholder="Cuenta tu historia, comparte un hallazgo o un fragmento del pasado..."
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--gold-primary)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Imagen (opcional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              data-testid="input-imagen"
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '13px' }}
            />
            {imagenPreview && (
              <div style={{ marginTop: '12px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-gold)' }}>
                <img src={imagenPreview} alt="Preview" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', display: 'block' }} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '12px 24px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="create-side"
              data-testid="btn-publicar-relato"
              style={{ margin: 0, padding: '12px 32px', height: 'auto', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, border: 'none' }}
            >
              {loading ? 'Publicando...' : 'Publicar Relato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRelatoModal;
