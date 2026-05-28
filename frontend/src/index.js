import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { registerServiceWorker } from "@/utils/pushClient";

// Registrar el Service Worker para PWA + Web Push
// (no-op si el navegador no lo soporta)
registerServiceWorker();

// Bloquea pinch-zoom y double-tap-zoom en iOS/Android (algunos navegadores
// ignoran el meta viewport user-scalable=no, así que añadimos el respaldo JS).
// Sólo activo en mobile (<=900px) para no romper accesibilidad en desktop.
if (typeof window !== 'undefined') {
  const isMobile = () => window.innerWidth <= 900;
  // Bloquear pinch-zoom de iOS (gestures)
  document.addEventListener('gesturestart', (e) => { if (isMobile()) e.preventDefault(); });
  document.addEventListener('gesturechange', (e) => { if (isMobile()) e.preventDefault(); });
  document.addEventListener('gestureend', (e) => { if (isMobile()) e.preventDefault(); });
  // Bloquear pinch-zoom con touch de 2+ dedos en Android
  document.addEventListener('touchstart', (e) => {
    if (isMobile() && e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchmove', (e) => {
    if (isMobile() && e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  // Bloquear double-tap-to-zoom
  let lastTap = 0;
  document.addEventListener('touchend', (e) => {
    if (!isMobile()) return;
    const now = Date.now();
    if (now - lastTap < 320) e.preventDefault();
    lastTap = now;
  }, { passive: false });
  // Forzar reset de zoom si el usuario logra hacerlo de alguna manera
  document.addEventListener('wheel', (e) => {
    if (isMobile() && e.ctrlKey) e.preventDefault();
  }, { passive: false });
  // Bloquear Ctrl + (=|-|0) en desktop solo si es PWA (window-controls-overlay o standalone)
  const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  if (isStandalone) {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault();
    });
  }
  // Reset agresivo: si por alguna razón el visualViewport cambia escala, lo
  // forzamos de vuelta a 1.0 (último seguro en PWAs instaladas en Android).
  if (window.visualViewport && isMobile()) {
    window.visualViewport.addEventListener('resize', () => {
      if (window.visualViewport.scale > 1.001) {
        // No podemos cambiar la escala vía JS directamente, pero recargando el
        // meta viewport sí. Esto fuerza al navegador a re-evaluarlo.
        const meta = document.querySelector('meta[name="viewport"]');
        if (meta) {
          const orig = meta.getAttribute('content');
          meta.setAttribute('content', orig + ', shrink-to-fit=no');
          setTimeout(() => meta.setAttribute('content', orig), 50);
        }
      }
    });
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
