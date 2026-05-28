import { useEffect, useState } from 'react';

/**
 * Hook para detectar dirección de scroll en mobile.
 * Retorna 'up' | 'down' | 'top'.
 *
 * - Sólo activo cuando window.innerWidth <= 900 (en desktop siempre 'top')
 * - Threshold de 8px para evitar jitter por inercia
 * - Cuando scrollY < 60, fuerza 'top' para que el topbar siempre se muestre arriba
 */
export const useScrollDirection = () => {
  const [direction, setDirection] = useState('top');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastY = window.scrollY || 0;
    let ticking = false;

    const update = () => {
      const y = window.scrollY || 0;
      const isMobile = window.innerWidth <= 900;

      if (!isMobile) {
        setDirection('top');
      } else if (y < 60) {
        setDirection('top');
      } else {
        const dy = y - lastY;
        if (Math.abs(dy) > 8) {
          setDirection(dy > 0 ? 'down' : 'up');
        }
      }
      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return direction;
};

export default useScrollDirection;
