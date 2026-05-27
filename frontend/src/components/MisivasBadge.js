import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { DoveScrollIcon } from './HistoricIcons';

const POLL_INTERVAL = 20000; // 20s

const MisivasBadge = () => {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get('/misivas/no-leidas');
      setCount(res.data.total || 0);
    } catch (err) {
      // Silencioso
    }
  }, []);

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

  return (
    <button
      className="icon-btn avisos-icon-btn"
      data-testid="topbar-misivas-btn"
      title="Misivas"
      onClick={() => navigate('/misivas')}
    >
      <DoveScrollIcon size={20} />
      {count > 0 && (
        <span className="avisos-badge" data-testid="misivas-badge">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
};

export default MisivasBadge;
