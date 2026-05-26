// Chronos V1.19 - bloqueo de zoom accidental en móvil
(function () {
  // Evita doble tap zoom en navegadores móviles.
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // Safari iOS: evita gestos de pellizco cuando el navegador lo permite.
  document.addEventListener('gesturestart', function (event) {
    event.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturechange', function (event) {
    event.preventDefault();
  }, { passive: false });
  document.addEventListener('gestureend', function (event) {
    event.preventDefault();
  }, { passive: false });
})();
