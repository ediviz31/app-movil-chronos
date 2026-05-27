import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HourglassIcon } from '../components/HistoricIcons';

const Register = () => {
  const [formData, setFormData] = useState({
    nombre: '', usuario: '', correo: '', password: '',
    tema_favorito: 'Antigüedad'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(formData);
      // No navegamos manualmente: PublicRoute detectará isAuthenticated=true
      // y redirigirá al ?redirect= automáticamente.
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse');
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <HourglassIcon size={48} />
        </div>
        <h1 className="auth-title">Únete a Chronos</h1>
        <p className="auth-subtitle">· Comienza tu viaje en el tiempo ·</p>

        {error && <div className="error-message" data-testid="register-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Nombre del Cronista</label>
            <input type="text" name="nombre" required value={formData.nombre} onChange={handleChange} className="form-input" placeholder="Tu nombre completo" data-testid="input-nombre" />
          </div>
          <div className="form-group">
            <label className="form-label">Identificador</label>
            <input type="text" name="usuario" required value={formData.usuario} onChange={handleChange} className="form-input" placeholder="@usuario" data-testid="input-usuario" />
          </div>
          <div className="form-group">
            <label className="form-label">Correo</label>
            <input type="email" name="correo" required value={formData.correo} onChange={handleChange} className="form-input" placeholder="tu@correo.com" data-testid="input-correo" />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input type="password" name="password" required minLength={6} value={formData.password} onChange={handleChange} className="form-input" placeholder="Mínimo 6 caracteres" data-testid="input-password" />
          </div>
          <div className="form-group">
            <label className="form-label">Época Favorita</label>
            <select name="tema_favorito" value={formData.tema_favorito} onChange={handleChange} className="form-select" data-testid="select-tema">
              <option>Antigüedad</option>
              <option>Edad Media</option>
              <option>Edad Moderna</option>
              <option>Edad Contemporánea</option>
              <option>Civilizaciones</option>
              <option>Leyendas</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: 8 }} data-testid="btn-register">
            {loading ? 'Creando cuenta...' : 'Convertirme en Cronista'}
          </button>
        </form>

        <p className="auth-link">
          ¿Ya eres cronista? <Link to={`/login${redirect !== '/' ? '?redirect=' + encodeURIComponent(redirect) : ''}`} data-testid="link-login">Entra al archivo</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
