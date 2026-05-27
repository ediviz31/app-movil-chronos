import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  pushSupported,
  getPushPermissionState,
  getCurrentSubscription,
  subscribeToPush
} from '../utils/pushClient';
import { DoveScrollIcon, CloseIcon } from './HistoricIcons';

const LS_KEY = 'chronos_push_dismissed_v1';
const DELAY_MS = 25000; // mostrar tras 25s para no agobiar al primer paint

/**
 * Banner sutil que propone activar avisos push.
 * Solo aparece si:
 *  - El usuario está autenticado
 *  - El navegador soporta push
 *  - El permiso NO está concedido ni denegado (Notification.permission === 'default')
 *  - No hay subscripción activa
 *  - El usuario no ha pulsado "ahora no" en esta sesión (localStorage flag)
 */
const PushOptInBanner = () => {
  const { isAuthenticated } = useAuth();
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) return;
    if (!pushSupported()) return;
    if (localStorage.getItem(LS_KEY)) return;

    const timer = setTimeout(async () => {
      try {
        const perm = await getPushPermissionState();
        if (perm !== 'default') return; // ya decidió antes
        const sub = await getCurrentSubscription();
        if (sub) return;
        if (!cancelled) setShow(true);
      } catch (_) { /* ignore */ }
    }, DELAY_MS);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [isAuthenticated]);

  const handleActivar = async () => {
    setSubmitting(true);
    try {
      const sub = await subscribeToPush();
      if (sub) setShow(false);
    } catch (err) { console.warn(err); }
    finally { setSubmitting(false); }
  };

  const handleAhoraNo = () => {
    localStorage.setItem(LS_KEY, String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="push-opt-in" data-testid="push-opt-in">
      <div className="push-opt-in-inner">
        <div className="push-opt-in-icon" aria-hidden>
          <DoveScrollIcon size={22} />
        </div>
        <div className="push-opt-in-text">
          <strong>Recibe avisos del archivo</strong>
          <span>
            Te avisaremos cuando otros cronistas resuenen con tus crónicas
            o te envíen una misiva.
          </span>
        </div>
        <div className="push-opt-in-actions">
          <button
            className="push-opt-in-yes"
            onClick={handleActivar}
            disabled={submitting}
            data-testid="push-opt-in-activate"
          >
            {submitting ? 'Activando...' : 'Activar avisos'}
          </button>
          <button
            className="push-opt-in-no"
            onClick={handleAhoraNo}
            data-testid="push-opt-in-dismiss"
            aria-label="Ahora no"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PushOptInBanner;
