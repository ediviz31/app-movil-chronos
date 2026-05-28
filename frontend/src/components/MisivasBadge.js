import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DoveScrollIcon } from './HistoricIcons';
import { useNotifications } from '../context/NotificationsContext';

const MisivasBadge = () => {
  const navigate = useNavigate();
  const { misivasCount: count } = useNotifications();

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
