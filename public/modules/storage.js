
import { updateSummary } from './checker.js';

export function saveCheckerSettings(id) {
  const visitDate = document.getElementById(`date-${id}`)?.value || '';
  const times = Array.from(document.querySelectorAll(`#timeGrid-${id} .time-thumb.selected`))
    .map(el => el.dataset.value);
  const enabled = document.getElementById(`enabled-${id}`)?.value || 'true';
  const config = { date: visitDate, times, enabled };
  localStorage.setItem(`ticketCheckerConfig_${id}`, JSON.stringify(config));
  updateSummary(id, times);
}

export function loadCheckerSettings(id) {
  const raw = localStorage.getItem(`ticketCheckerConfig_${id}`);
  const grid = document.getElementById(`timeGrid-${id}`);
  const enabledSelect = document.getElementById(`enabled-${id}`);
  const checkerEl = document.querySelector(`.ticket-checker[data-instance="${id}"]`);

  if (raw) {
    const config = JSON.parse(raw);

    if (config.times) {
      grid.querySelectorAll('.time-thumb').forEach(el => {
        el.classList.toggle('selected', config.times.includes(el.dataset.value));
      });
    }

    if (config.date && document.getElementById(`date-${id}`)?._flatpickr) {
      document.getElementById(`date-${id}`)._flatpickr.setDate(config.date, true, "d/m/Y");
    }

    if (config.enabled !== undefined) {
      enabledSelect.value = config.enabled;
      if (checkerEl) checkerEl.style.opacity = config.enabled === 'true' ? '1' : '0.5';
    }

    updateSummary(id, config.times || []);
  } else {
    if (enabledSelect) enabledSelect.value = 'true';
    if (checkerEl) checkerEl.style.opacity = '1';
    saveCheckerSettings(id);
  }
}
