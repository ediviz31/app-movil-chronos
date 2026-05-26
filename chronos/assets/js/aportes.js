// Chronos V1.56 - Menús de aportes y respuestas
(function () {
  function closeOtherDetails(current) {
    document.querySelectorAll('.comment-corner-menu[open], .story-corner-menu[open]').forEach(function (details) {
      if (details !== current) details.removeAttribute('open');
    });
  }

  document.addEventListener('toggle', function (event) {
    const el = event.target;
    if (!(el instanceof HTMLDetailsElement)) return;
    if (el.matches('.comment-corner-menu, .story-corner-menu') && el.open) {
      closeOtherDetails(el);
    }
  }, true);

  document.addEventListener('click', function (event) {
    const target = event.target;
    if (target && target.closest && target.closest('.comment-corner-menu, .story-corner-menu')) return;
    document.querySelectorAll('.comment-corner-menu[open], .story-corner-menu[open]').forEach(function (details) {
      details.removeAttribute('open');
    });
  });
})();
