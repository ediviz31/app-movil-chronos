import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HornHeraldIcon } from './HistoricIcons';
import { playChronosAlert, primeAudio } from '../utils/chronosSound';
import haptic from '../utils/haptic';

const POLL_INTERVAL = 25000; // 25s

const AvisosBadge = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const prevCountRef = useRef(0);
  const initializedRef = useRef(false);
  const variante = user?.preferencias?.sonido_aviso || 'cuerno';

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get('/avisos/no-leidos/count');
      const newCount = res.data.total || 0;
      if (initializedRef.current && newCount > prevCountRef.current) {
        playChronosAlert(variante);
        haptic.notify();   // 🔔 vibración al recibir aviso
      }
      prevCountRef.current = newCount;
      initializedRef.current = true;
      setCount(newCount);
    } catch (err) {
      // 401 u otros: ignorar silenciosamente
    }
  }, [variante]);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, POLL_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchCount();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchCount]);

  const handleClick = () => {
    // Inicializa el contexto de audio en el primer click del usuario
    primeAudio();
    navigate('/avisos');
  };

  return (
    <button
      className="icon-btn avisos-icon-btn"
      data-testid="topbar-notif-btn"
      title="Avisos del archivo"
      onClick={handleClick}
    >
      <HornHeraldIcon size={20} />
      {count > 0 && (
        <span className="avisos-badge" data-testid="avisos-badge">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
};

export default AvisosBadge;
