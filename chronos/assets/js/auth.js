document.addEventListener('DOMContentLoaded', () => {
  const showMessage = (holder, type, text) => {
    if (!holder) return;
    holder.className = `auth-message show ${type}`;
    holder.innerHTML = `<i class="${type === 'success' ? 'ri-checkbox-circle-line' : type === 'info' ? 'ri-information-line' : 'ri-error-warning-line'}"></i><span>${text}</span>`;
  };

  document.querySelectorAll('.password-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.password-wrap')?.querySelector('input');
      if (!input) return;
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      btn.innerHTML = visible ? '<i class="ri-eye-line"></i>' : '<i class="ri-eye-off-line"></i>';
      btn.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });
  });

  document.querySelectorAll('[data-demo-alert]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const holder = document.querySelector('[data-auth-message]');
      showMessage(holder, 'info', link.dataset.demoAlert);
    });
  });

  document.querySelectorAll('[data-auth-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      const holder = form.closest('.auth-card, .story-form-card')?.querySelector('[data-auth-message]');
      const button = form.querySelector('.auth-submit');
      const buttonSpan = button?.querySelector('span');
      const icon = button?.querySelector('i');
      const stop = (input, message) => {
        event.preventDefault();
        showMessage(holder, 'error', message);
        input?.closest('.auth-input')?.classList.add('input-error');
        input?.focus();
        setTimeout(() => input?.closest('.auth-input')?.classList.remove('input-error'), 1400);
      };

      for (const input of form.querySelectorAll('[data-required]')) {
        if (!input.value.trim()) {
          stop(input, `Falta completar: ${input.dataset.required}.`);
          return;
        }
      }

      const email = form.querySelector('[data-email]');
      if (email && !/^\S+@\S+\.\S+$/.test(email.value.trim())) {
        stop(email, 'Escribe un correo electrónico válido.');
        return;
      }

      const minInput = form.querySelector('[data-min]');
      if (minInput && minInput.value.length < Number(minInput.dataset.min)) {
        stop(minInput, `La contraseña debe tener mínimo ${minInput.dataset.min} caracteres.`);
        return;
      }

      for (const matchInput of form.querySelectorAll('[data-match]')) {
        const original = form.querySelector(`[name="${matchInput.dataset.match}"]`);
        if (original && original.value !== matchInput.value) {
          stop(matchInput, 'Las contraseñas no coinciden.');
          return;
        }
      }

      const check = form.querySelector('[data-required-check]');
      if (check && !check.checked) {
        event.preventDefault();
        showMessage(holder, 'error', `Falta ${check.dataset.requiredCheck}.`);
        check.focus();
        return;
      }

      if (button) {
        button.disabled = true;
        button.classList.add('is-loading');
      }
      if (icon) icon.className = 'ri-loader-4-line spinner';
      if (buttonSpan) buttonSpan.textContent = button?.dataset.loadingText || 'Cargando…';

      // En formularios reales dejamos que PHP procese el POST.
      if (form.dataset.realForm === 'true') {
        return;
      }

      event.preventDefault();
      showMessage(holder, 'success', 'Todo listo. Preparando tu entrada a Chronos…');
      setTimeout(() => {
        window.location.href = form.dataset.successUrl || form.getAttribute('action') || 'feed.php';
      }, 900);
    });
  });
});
