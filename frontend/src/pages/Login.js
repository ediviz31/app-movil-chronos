import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HourglassIcon } from '../components/HistoricIcons';

const Login = () => {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(correo, password);
      // No navegamos manualmente: PublicRoute detectará isAuthenticated=true
      // y redirigirá automáticamente al ?redirect= si está presente, o a '/'.
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciales inválidas');
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <HourglassIcon size={48} />
        </div>
        <h1 className="auth-title">Chronos</h1>
        <p className="auth-subtitle">· Archivo Vivo de la Historia ·</p>

        {error && <div className="error-message" data-testid="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Correo</label>
            <input
              type="email" required
              value={correo} onChange={(e) => setCorreo(e.target.value)}
              className="form-input"
              placeholder="cronista@chronos.com"
              data-testid="input-correo"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
              data-testid="input-password"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="btn-primary" style={{ width: '100%', marginTop: 12 }}
            data-testid="btn-login"
          >
            {loading ? 'Entrando al archivo...' : 'Entrar al Archivo'}
          </button>
        </form>

        <p className="auth-link">
          ¿Aún no eres cronista? <Link to={`/registro${redirect !== '/' ? '?redirect=' + encodeURIComponent(redirect) : ''}`} data-testid="link-registro">Únete a Chronos</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
