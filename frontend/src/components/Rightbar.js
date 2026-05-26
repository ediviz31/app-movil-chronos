import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const EPOCAS_ICONOS = {
  'Egipto antiguo': 'ri-pyramid-line',
  'Roma imperial': 'ri-ancient-pavilion-line',
  'Leyendas': 'ri-book-open-line',
  'Exploraciones': 'ri-compass-3-line',
  'Medievo': 'ri-castle-line',
  'Civilizaciones': 'ri-building-4-line',
  'Edad Antigua': 'ri-ancient-gate-line',
  'Edad Media': 'ri-shield-line',
  'Renacimiento': 'ri-palette-line',
  'Edad Moderna': 'ri-ship-line',
  'Edad Contemporánea': 'ri-time-line'
};

const Rightbar = () => {
  const [rutasPopulares, setRutasPopulares] = useState([]);
  const [usuariosSugeridos, setUsuariosSugeridos] = useState([]);
  const [loadingFollow, setLoadingFollow] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const [rutasRes, usuariosRes] = await Promise.all([
        api.get('/rutas/populares'),
        api.get('/usuarios/sugeridos')
      ]);
      setRutasPopulares(rutasRes.data);
      setUsuariosSugeridos(usuariosRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSeguir = async (usuarioId) => {
    setLoadingFollow({ ...loadingFollow, [usuarioId]: true });
    try {
      await api.post(`/seguir/${usuarioId}`);
      setUsuariosSugeridos(usuariosSugeridos.filter(u => u._id !== usuarioId));
    } catch (error) {
      console.error('Error al seguir:', error);
    } finally {
      setLoadingFollow({ ...loadingFollow, [usuarioId]: false });
    }
  };

  const getAvatarSrc = (usuario) => {
    return usuario?.avatar?.startsWith('/uploads')
      ? `${process.env.REACT_APP_BACKEND_URL}${usuario.avatar}`
      : `https://api.dicebear.com/7.x/initials/svg?seed=${usuario?.nombre || 'U'}&backgroundColor=C6A75E`;
  };

  return (
    <aside className="rightbar" data-testid="rightbar">
      <section className="sidebox" data-testid="epocas-populares">
        <h3><i className="ri-sparkling-2-fill"></i> Épocas populares</h3>
        {rutasPopulares.length > 0 ? (
          rutasPopulares.map((ruta) => (
            <a key={ruta.categoria} className="trend" href={`/rutas?categoria=${encodeURIComponent(ruta.categoria)}`} data-testid={`ruta-${ruta.categoria}`}>
              <i className={EPOCAS_ICONOS[ruta.categoria] || 'ri-book-line'}></i>
              <span>{ruta.categoria}</span>
              <strong>{ruta.total >= 1000 ? `${(ruta.total / 1000).toFixed(1)}k` : ruta.total}</strong>
            </a>
          ))
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Aún no hay épocas populares</p>
        )}
        <a className="text-link" href="/explorar">Ver todas las épocas →</a>
      </section>

      <section className="sidebox" data-testid="usuarios-sugeridos">
        <h3><i className="ri-user-star-line"></i> Usuarios sugeridos</h3>
        {usuariosSugeridos.length > 0 ? (
          usuariosSugeridos.map((usuario) => (
            <div key={usuario._id} className="person-row" data-testid={`usuario-${usuario._id}`}>
              <a className="who" href={`/perfil/${usuario._id}`}>
                <img className="person-img" src={getAvatarSrc(usuario)} alt={usuario.nombre} />
                <span>
                  <strong>{usuario.nombre}</strong>
                  <small>@{usuario.usuario} · {usuario.tema_favorito || 'Historia'}</small>
                </span>
              </a>
              <button
                onClick={() => handleSeguir(usuario._id)}
                className="follow"
                disabled={loadingFollow[usuario._id]}
                data-testid={`btn-seguir-${usuario._id}`}
              >
                {loadingFollow[usuario._id] ? '...' : 'Seguir'}
              </button>
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No hay usuarios sugeridos</p>
        )}
        <a className="text-link" href="/explorar">Ver más usuarios →</a>
      </section>

      <section className="sidebox" data-testid="temas-del-dia">
        <h3><i className="ri-hashtag"></i> Temas del día</h3>
        <a className="topic-row" href="/explorar" data-testid="tema-descubrimientos">
          <strong># Descubrimientos</strong>
          <small>1.2k publicaciones</small>
        </a>
        <a className="topic-row" href="/explorar" data-testid="tema-imperios">
          <strong># Imperios</strong>
          <small>980 publicaciones</small>
        </a>
        <a className="topic-row" href="/explorar" data-testid="tema-personajes">
          <strong># PersonajesHistóricos</strong>
          <small>756 publicaciones</small>
        </a>
        <a className="text-link" href="/explorar">Ver todos los temas →</a>
      </section>
    </aside>
  );
};

export default Rightbar;
