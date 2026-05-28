import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * ThemeContext de Chronos.
 *
 * Modos:
 *  - 'auto'  : sigue la hora del día (claro entre 6am-7pm, oscuro resto). Por defecto.
 *  - 'dark'  : tema azul-noche dorado (clásico)
 *  - 'light' : tema pergamino (papel envejecido + sepia + dorado oscuro)
 *
 * El modo elegido se persiste en localStorage como 'chronos_theme_pref'.
 * El "tema efectivo" se aplica como atributo `data-theme` en <html>.
 *
 * En modo 'auto' se recalcula cada 30 minutos y al cambiar la visibilidad de la pestaña.
 */
const ThemeCtx = createContext(null);

const STORAGE_KEY = 'chronos_theme_pref';
const RECHECK_INTERVAL = 30 * 60 * 1000; // 30min

// Determina si la hora actual local es "modo día"
const isDayHour = () => {
  const h = new Date().getHours();
  return h >= 6 && h < 19; // 6:00 - 18:59
};

const resolveEffective = (pref) => {
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return isDayHour() ? 'light' : 'dark';
};

export const ThemeProvider = ({ children }) => {
  const [pref, setPref] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
    } catch (_) {}
    return 'auto';
  });

  const [effective, setEffective] = useState(() => resolveEffective(pref));

  // Aplica el atributo en <html>
  useEffect(() => {
    const eff = resolveEffective(pref);
    setEffective(eff);
    document.documentElement.setAttribute('data-theme', eff);
    // Actualiza el theme-color del navegador para el status bar nativo
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', eff === 'light' ? '#F4ECD8' : '#0a1228');
  }, [pref]);

  // En modo auto: recheck periódico + al volver de background
  useEffect(() => {
    if (pref !== 'auto') return;
    const recompute = () => {
      const eff = resolveEffective('auto');
      setEffective(eff);
      document.documentElement.setAttribute('data-theme', eff);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', eff === 'light' ? '#F4ECD8' : '#0a1228');
    };
    const id = setInterval(recompute, RECHECK_INTERVAL);
    const onVisible = () => { if (document.visibilityState === 'visible') recompute(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pref]);

  const updatePref = useCallback((next) => {
    setPref(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
  }, []);

  // Helper: ciclo dark → light → auto → dark...
  const cyclePref = useCallback(() => {
    setPref(prev => {
      const next = prev === 'dark' ? 'light' : (prev === 'light' ? 'auto' : 'dark');
      try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
      return next;
    });
  }, []);

  return (
    <ThemeCtx.Provider value={{ pref, effective, setPref: updatePref, cyclePref }}>
      {children}
    </ThemeCtx.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
};
