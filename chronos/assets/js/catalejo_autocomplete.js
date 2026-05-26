document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  const forms = Array.from(document.querySelectorAll('.global-search, .explore-main-search'));
  if (!forms.length) return;

  const escapeHtml = (value) => String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const buildAuthorRow = (autor) => `
    <a class="catalejo-suggestion-row catalejo-author-row" href="${escapeHtml(autor.url)}">
      <span class="catalejo-avatar-wrap"><img src="${escapeHtml(autor.avatar)}" alt=""></span>
      <span class="catalejo-suggestion-copy">
        <strong>${escapeHtml(autor.nombre)}</strong>
        <small>@${escapeHtml(autor.usuario)} · ${escapeHtml(autor.tema)}</small>
        <em>${escapeHtml(autor.especialidad)}</em>
      </span>
      <span class="catalejo-suggestion-seal">${escapeHtml(autor.motivo)}</span>
    </a>`;

  const buildRouteRow = (ruta) => `
    <a class="catalejo-suggestion-row compact" href="${escapeHtml(ruta.url)}">
      <span class="catalejo-mini-icon catalejo-mini-symbol"><i class="${escapeHtml(ruta.icono)}" aria-hidden="true"></i><b>⌖</b></span>
      <span class="catalejo-suggestion-copy">
        <strong>${escapeHtml(ruta.nombre)}</strong>
        <small>${Number(ruta.total || 0)} crónica(s) conectadas</small>
      </span>
    </a>`;

  const buildStoryRow = (relato) => {
    const imagen = relato.imagen || 'assets/img/post-scroll.svg';
    return `
    <a class="catalejo-suggestion-row compact" href="${escapeHtml(relato.url)}">
      <span class="catalejo-mini-icon catalejo-mini-thumb"><img src="${escapeHtml(imagen)}" alt=""></span>
      <span class="catalejo-suggestion-copy">
        <strong>${escapeHtml(relato.titulo)}</strong>
        <small>${escapeHtml(relato.categoria)} · @${escapeHtml(relato.usuario)}</small>
      </span>
    </a>`;
  };

  const renderPanel = (panel, input, data) => {
    const q = input.value.trim();
    const autores = data.autores || [];
    const rutas = data.rutas || [];
    const relatos = data.relatos || [];
    const hasResults = autores.length || rutas.length || relatos.length;

    if (!q || q.length < 2) {
      panel.classList.remove('show');
      panel.innerHTML = '';
      return;
    }

    let html = `
      <div class="catalejo-panel-head">
        <span><span class="catalejo-head-symbol"><img src="assets/icons/explorar.webp" alt=""></span> Catalejo activo</span>
        <strong>${escapeHtml(q)}</strong>
      </div>`;

    if (!hasResults) {
      html += `
        <div class="catalejo-empty">
          <strong>Sin señales claras todavía</strong>
          <p>Prueba con nombre, @cronista, ruta histórica o una palabra del hallazgo.</p>
        </div>`;
    }

    if (autores.length) {
      html += `<div class="catalejo-section-label">Cronistas avistados</div>${autores.map(buildAuthorRow).join('')}`;
    }
    if (rutas.length) {
      html += `<div class="catalejo-section-label">Afiliaciones relacionadas</div>${rutas.map(buildRouteRow).join('')}`;
    }
    if (relatos.length) {
      html += `<div class="catalejo-section-label">Crónicas vinculadas</div>${relatos.map(buildStoryRow).join('')}`;
    }

    html += `
      <a class="catalejo-panel-footer" href="${escapeHtml(data.explore_url || ('explore.php?q=' + encodeURIComponent(q)))}">
        <span>Ver hallazgos completos en el Catalejo</span>
        <i class="ri-arrow-right-line"></i>
      </a>`;

    panel.innerHTML = html;
    panel.classList.add('show');
  };

  const closeAllPanels = (except) => {
    document.querySelectorAll('.catalejo-suggest-panel.show').forEach((panel) => {
      if (panel !== except) panel.classList.remove('show');
    });
  };

  forms.forEach((form) => {
    const input = form.querySelector('input[name="q"]');
    if (!input) return;

    form.classList.add('catalejo-live-form');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');

    const panel = document.createElement('div');
    panel.className = 'catalejo-suggest-panel';
    panel.setAttribute('aria-live', 'polite');
    form.appendChild(panel);

    let timer = null;
    let controller = null;

    const search = () => {
      const q = input.value.trim();
      if (q.length < 2) {
        panel.classList.remove('show');
        panel.innerHTML = '';
        return;
      }

      if (controller) controller.abort();
      controller = new AbortController();

      fetch('catalejo_sugerencias.php?q=' + encodeURIComponent(q), {
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin',
        signal: controller.signal
      })
        .then((response) => response.ok ? response.json() : Promise.reject(response))
        .then((data) => {
          closeAllPanels(panel);
          renderPanel(panel, input, data);
        })
        .catch((error) => {
          if (error && error.name === 'AbortError') return;
          panel.classList.remove('show');
        });
    };

    input.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(search, 180);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 2) {
        window.clearTimeout(timer);
        timer = window.setTimeout(search, 80);
      }
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        panel.classList.remove('show');
      }
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.catalejo-live-form')) {
      closeAllPanels(null);
    }
  });
});
