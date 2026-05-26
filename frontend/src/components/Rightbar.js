import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { getAvatarUrl } from '../utils/imageHelpers';
import {
  IconStar, IconHashtag, IconPyramid, IconColumn, IconBookOpen,
  IconCompass, IconCastle, IconCrown, IconShield
} from './Icons';

const EPOCAS_ICONOS = {
  'Egipto antiguo': IconPyramid,
  'Roma imperial': IconColumn,
  'Grecia clásica': IconColumn,
  'Leyendas': IconBookOpen,
  'Exploraciones': IconCompass,
  'Medievo': IconCastle,
  'Civilizaciones': IconColumn,
  'Edad Antigua': IconColumn,
  'Edad Media': IconShield,
  'Renacimiento': IconCrown,
  'Edad Moderna': IconCompass,
  'Edad Contemporánea': IconBookOpen,
  'Personajes históricos': IconCrown,
  'América precolombina': IconPyramid,
  'Asia antigua': IconBookOpen
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

  return (
    <aside className="rightbar" data-testid="rightbar">
      <section className="sidebox" data-testid="epocas-populares">
        <h3><IconColumn width={20} height={20} /> Épocas Populares</h3>
        {rutasPopulares.length > 0 ? (
          rutasPopulares.map((ruta, idx) => {
            const IconComponent = EPOCAS_ICONOS[ruta.categoria] || IconBookOpen;
            return (
              <a key={ruta.categoria} className="trend" href={`/rutas?categoria=${encodeURIComponent(ruta.categoria)}`} data-testid={`ruta-${ruta.categoria}`} style={{ paddingLeft: 0 }}>
                <span style={{ display: 'inline-flex', width: 40, height: 40, borderRadius: '50%', background: 'rgba(198, 167, 94, 0.1)', border: '1px solid var(--border-gold)', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-primary)', flexShrink: 0 }}>
                  <IconComponent width={20} height={20} />
                </span>
                <span style={{ flex: 1, fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600 }}>{ruta.categoria}</span>
                <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-light)', fontSize: 14 }}>
                  {ruta.total >= 1000 ? `${(ruta.total / 1000).toFixed(1)}k` : ruta.total}
                </strong>
              </a>
            );
          })
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Aún no hay épocas populares</p>
        )}
        <a className="text-link" href="/explorar">Ver todas las épocas →</a>
      </section>

      <section className="sidebox" data-testid="usuarios-sugeridos">
        <h3><IconStar width={20} height={20} /> Cronistas Sugeridos</h3>
        {usuariosSugeridos.length > 0 ? (
          usuariosSugeridos.map((usuario) => (
            <div key={usuario._id} className="person-row" data-testid={`usuario-${usuario._id}`}>
              <a className="who" href={`/perfil/${usuario._id}`}>
                <img className="person-img" src={getAvatarUrl(usuario)} alt={usuario.nombre} />
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
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>No hay cronistas sugeridos</p>
        )}
        <a className="text-link" href="/explorar">Ver más cronistas →</a>
      </section>

      <section className="sidebox" data-testid="temas-del-dia">
        <h3><IconHashtag width={20} height={20} /> Temas del Día</h3>
        <a className="topic-row" href="/explorar" data-testid="tema-descubrimientos">
          <strong style={{ color: 'var(--gold-light)' }}># Descubrimientos</strong>
          <small>1.2k publicaciones</small>
        </a>
        <a className="topic-row" href="/explorar" data-testid="tema-imperios">
          <strong style={{ color: 'var(--gold-light)' }}># Imperios</strong>
          <small>980 publicaciones</small>
        </a>
        <a className="topic-row" href="/explorar" data-testid="tema-personajes">
          <strong style={{ color: 'var(--gold-light)' }}># PersonajesHistóricos</strong>
          <small>756 publicaciones</small>
        </a>
        <a className="text-link" href="/explorar">Ver todos los temas →</a>
      </section>
    </aside>
  );
};

export default Rightbar;
