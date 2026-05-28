import React, { useEffect } from 'react';
import { usePresence } from '../context/PresenceContext';
import { TorchActiveIcon } from './HistoricIcons';

/**
 * Pequeño indicador que se sobrepone a avatares o se muestra junto a un nombre.
 * Llama haga track(id) en mount; renderiza la antorcha sólo si está online.
 *
 * Variantes:
 *  - dot (default): círculo dorado animado en esquina inferior derecha del avatar
 *  - torch: muestra la antorcha encendida + texto opcional
 *  - mini: sólo el icono pequeño
 */
const PresenceBadge = ({ userId, variant = 'dot', size = 14, showLabel = false }) => {
  const { track, isOnline } = usePresence();
  useEffect(() => { if (userId) track([userId]); }, [userId, track]);

  if (!userId || !isOnline(userId)) return null;

  if (variant === 'dot') {
    return (
      <span
        className="presence-dot"
        data-testid={`presence-dot-${userId}`}
        title="Activo ahora"
      />
    );
  }
  if (variant === 'torch') {
    return (
      <span className="presence-torch" data-testid={`presence-torch-${userId}`}>
        <TorchActiveIcon size={size} />
        {showLabel && <span className="presence-torch-label">Activa ahora</span>}
      </span>
    );
  }
  return (
    <span className="presence-mini" data-testid={`presence-mini-${userId}`}>
      <TorchActiveIcon size={size} />
    </span>
  );
};

export default PresenceBadge;
