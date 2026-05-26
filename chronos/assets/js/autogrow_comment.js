(function () {
  function autoGrow(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.overflowY = 'hidden';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  function initAutoGrow() {
    const textareas = document.querySelectorAll('.comment-form-social textarea, textarea[data-autogrow="true"]');
    textareas.forEach(function (textarea) {
      textarea.setAttribute('data-autogrow', 'true');
      textarea.style.resize = 'none';
      textarea.style.overflowY = 'hidden';
      textarea.style.boxSizing = 'border-box';
      autoGrow(textarea);

      textarea.addEventListener('input', function () {
        autoGrow(textarea);
      });

      textarea.addEventListener('change', function () {
        autoGrow(textarea);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoGrow);
  } else {
    initAutoGrow();
  }
})();
