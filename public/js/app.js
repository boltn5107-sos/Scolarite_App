document.addEventListener('click', function (event) {
  const opener = event.target.closest('[data-open-modal]');
  if (opener) {
    const modal = document.getElementById(opener.dataset.openModal);
    if (modal) modal.classList.add('open');
    return;
  }

  const closer = event.target.closest('[data-close-modal]');
  if (closer) {
    const modal = closer.closest('.modal-overlay');
    if (modal) modal.classList.remove('open');
    return;
  }

  if (event.target.classList.contains('modal-overlay')) {
    event.target.classList.remove('open');
  }
});

document.addEventListener('keydown', function (event) {
  if (event.key !== 'Escape') return;
  document.querySelectorAll('.modal-overlay.open').forEach(function (modal) {
    modal.classList.remove('open');
  });
});

document.querySelectorAll('form[data-auto-submit] select').forEach(function (select) {
  select.addEventListener('change', function () {
    select.form.submit();
  });
});
