document.addEventListener('click', function (event) {
  const btn = event.target.closest('.story-content-toggle');
  if (!btn) return;
  const targetId = btn.getAttribute('data-target');
  const box = document.getElementById(targetId);
  if (!box) return;
  const collapsed = box.classList.toggle('is-collapsed');
  btn.textContent = collapsed ? (btn.dataset.expand || 'Seguir leyendo') : (btn.dataset.collapse || 'Mostrar menos');
});
