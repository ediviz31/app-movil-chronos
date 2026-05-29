import React, { useEffect, useRef, useState } from 'react';
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
 *
 * Robustez: usa un ref para que el timer solo se programe UNA VEZ por
 * montaje del shell (independiente de re-renders de AuthContext).
 */
const PushOptInBanner = () => {
  const { isAuthenticated } = useAuth();
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const scheduledRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!pushSupported()) return;
    if (scheduledRef.current) return;
    if (localStorage.getItem(LS_KEY)) return;
    scheduledRef.current = true;

    const timer = setTimeout(async () => {
      try {
        const perm = await getPushPermissionState();
        if (perm !== 'default') return;
        const sub = await getCurrentSubscription();
        if (sub) return;
        if (localStorage.getItem(LS_KEY)) return;
        setShow(true);
      } catch (_) { /* ignore */ }
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  const handleActivar = async () => {
    setSubmitting(true);
    // Timeout de seguridad: si por cualquier motivo no termina en 25s,
    // liberamos el botón para evitar que se quede "Activando..." indefinidamente.
    const safetyTimer = setTimeout(() => {
      setSubmitting(false);
    }, 25000);
    try {
      const sub = await subscribeToPush();
      if (sub) {
        setShow(false);
      } else {
        // El usuario denegó o el navegador no soporta. No preguntemos de nuevo.
        localStorage.setItem(LS_KEY, String(Date.now()));
        setShow(false);
      }
    } catch (err) {
      console.warn('Activar avisos error:', err);
      // Marcamos para no insistir si falla
      localStorage.setItem(LS_KEY, String(Date.now()));
      setShow(false);
    } finally {
      clearTimeout(safetyTimer);
      setSubmitting(false);
    }
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
