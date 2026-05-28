import React, { useEffect, useRef, useState } from 'react';
import { HourglassIcon } from './HistoricIcons';
import haptic from '../utils/haptic';

/**
 * Pull-to-refresh estilo Twitter/Instagram.
 * Sólo se activa cuando el scroll está en top y el usuario tira hacia abajo.
 * Sólo visible/activo en mobile (<=900px) — en desktop pasa-thru.
 *
 * Props:
 *  - onRefresh: async function — se llama cuando el usuario completa el gesto.
 *  - threshold: px que hay que tirar (default 70)
 */
const PullToRefresh = ({ onRefresh, threshold = 70, children }) => {
  const containerRef = useRef(null);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const onTouchStart = (e) => {
      if (refreshing) return;
      if (window.innerWidth > 900) return;
      // Sólo activamos si el scroll del documento está en el top
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 4) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    };

    const onTouchMove = (e) => {
      if (!pullingRef.current) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // Resistencia tipo iOS
      const resisted = Math.min(120, dy * 0.55);
      setPull(resisted);
    };

    const onTouchEnd = async () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      if (pull >= threshold && onRefresh) {
        setRefreshing(true);
        setPull(threshold);
        try { await onRefresh(); } catch (_) {}
        setRefreshing(false);
      }
      setPull(0);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [pull, refreshing, threshold, onRefresh]);

  const opacity = Math.min(1, pull / threshold);
  const rotate = (pull / threshold) * 360;

  return (
    <div ref={containerRef} className="pull-to-refresh-wrap">
      <div
        className="pull-to-refresh-indicator"
        style={{
          transform: `translate(-50%, ${pull - 40}px)`,
          opacity: refreshing ? 1 : opacity
        }}
        data-testid="pull-to-refresh-indicator"
      >
        <div
          className={refreshing ? 'spin' : ''}
          style={{
            transform: refreshing ? 'none' : `rotate(${rotate}deg)`,
            color: 'var(--gold)'
          }}
        >
          <HourglassIcon size={22} />
        </div>
      </div>
      <div
        style={{
          transform: `translateY(${pull * 0.6}px)`,
          transition: pullingRef.current ? 'none' : 'transform 0.25s ease'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
