(function () {
  const forms = document.querySelectorAll('.story-creator-form');

  forms.forEach((form) => {
    const titleInput = form.querySelector('[data-live-title]');
    const contentInput = form.querySelector('[data-live-content]');
    const imageInput = form.querySelector('[data-live-image]');
    const previewTitle = document.querySelector('[data-preview-title]');
    const previewContent = document.querySelector('[data-preview-content]');
    const previewRoute = document.querySelector('[data-preview-route]');
    const previewImage = document.querySelector('[data-preview-image]');
    const previewPlaceholder = document.querySelector('[data-preview-placeholder]');
    const previewFrame = document.querySelector('[data-preview-image-frame]');
    const fileLabel = form.querySelector('[data-file-label]');
    let imageUrl = null;

    function cleanText(value) {
      return (value || '').replace(/\s+/g, ' ').trim();
    }

    function cutText(value, limit) {
      const text = cleanText(value);
      if (text.length <= limit) return text;
      return text.slice(0, limit).trim() + '...';
    }

    function updateCounters() {
      const titleCounter = form.querySelector('[data-count-for="titulo"]');
      const contentCounter = form.querySelector('[data-count-for="contenido"]');
      if (titleCounter && titleInput) titleCounter.textContent = String(titleInput.value.length);
      if (contentCounter && contentInput) contentCounter.textContent = String(contentInput.value.length);
    }

    function updatePreviewText() {
      if (previewTitle && titleInput) {
        previewTitle.textContent = cleanText(titleInput.value) || 'Título de tu relato';
      }
      if (previewContent && contentInput) {
        previewContent.textContent = cutText(contentInput.value, 220) || 'Aquí verás una vista previa del fragmento histórico, memoria, hallazgo o crónica que estás construyendo antes de publicarlo.';
      }
      updateCounters();
    }

    function updateRoute() {
      const selected = form.querySelector('.route-radio-input:checked');
      if (!selected || !previewRoute) return;
      const icon = selected.dataset.routeIcon || 'ri-route-line';
      previewRoute.innerHTML = '<i class="' + icon.replace(/"/g, '') + '"></i> ' + selected.value;
    }

    function updateImageFrameState(hasImage) {
      const frame = previewImage ? previewImage.closest('[data-preview-image-frame]') : null;
      if (!frame) return;
      frame.classList.toggle('has-image', !!hasImage);
      frame.classList.toggle('is-empty', !hasImage);
    }

    function updateImage() {
      if (!imageInput || !previewImage) return;
      const file = imageInput.files && imageInput.files[0] ? imageInput.files[0] : null;

      if (!file) {
        if (previewImage.getAttribute('src')) {
          // En editar relato puede existir imagen actual; no la borramos.
          updateImageFrameState(!previewImage.hidden);
        } else {
          previewImage.hidden = true;
          if (previewPlaceholder) previewPlaceholder.hidden = false;
          updateImageFrameState(false);
        }
        return;
      }

      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = URL.createObjectURL(file);
      previewImage.src = imageUrl;
      previewImage.hidden = false;
      if (previewPlaceholder) previewPlaceholder.hidden = true;
      if (fileLabel) fileLabel.textContent = file.name;
      updateImageFrameState(true);
    }



    function openImageSelector() {
      if (!imageInput) return;
      imageInput.click();
    }

    if (previewFrame && imageInput) {
      previewFrame.addEventListener('click', openImageSelector);
      previewFrame.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openImageSelector();
        }
      });
    }

    if (titleInput) titleInput.addEventListener('input', updatePreviewText);
    if (contentInput) contentInput.addEventListener('input', updatePreviewText);
    if (imageInput) imageInput.addEventListener('change', updateImage);
    form.querySelectorAll('.route-radio-input').forEach((radio) => radio.addEventListener('change', updateRoute));

    updatePreviewText();
    updateRoute();
    if (previewImage) {
      const hasInitialImage = !!previewImage.getAttribute('src') && !previewImage.hidden;
      const frame = previewImage.closest('[data-preview-image-frame]');
      if (frame) {
        frame.classList.toggle('has-image', hasInitialImage);
        frame.classList.toggle('is-empty', !hasInitialImage);
      }
    }
  });
})();
