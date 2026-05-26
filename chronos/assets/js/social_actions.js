// Chronos V1.46 - Acciones sociales
// Permite difundir una crónica copiando su enlace, sin depender de redes externas.
(function () {
  const buttons = document.querySelectorAll('[data-copy-path]');
  if (!buttons.length) return;

  function absoluteUrl(path) {
    try {
      return new URL(path, window.location.href).toString();
    } catch (e) {
      return String(path || window.location.href);
    }
  }

  function showToast(message) {
    let toast = document.querySelector('[data-chronos-toast]');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'chronos-toast';
      toast.setAttribute('data-chronos-toast', '');
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(() => toast.classList.remove('show'), 2300);
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    const input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(input);
    return ok;
  }

  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const url = absoluteUrl(button.getAttribute('data-copy-path'));
      const original = button.innerHTML;
      try {
        await copyText(url);
        button.classList.add('diffuse-done');
        showToast('Enlace de la crónica copiado para difundir.');
        window.setTimeout(() => button.classList.remove('diffuse-done'), 1200);
      } catch (error) {
        showToast('No se pudo copiar automáticamente. Copia el enlace desde la barra del navegador.');
      }
      button.innerHTML = original;
    });
  });
})();
