
import { intervals, sequenceTimeout, runningSequential, setRunning } from './constants.js';

export async function runAllSequentially(validIds, loop) {
  setRunning(true);
  while (runningSequential) {
    for (let id of validIds) {
      if (!runningSequential) break;
      if (document.getElementById(`enabled-${id}`)?.value !== 'true') continue;
      document.querySelectorAll('.ticket-checker').forEach(el => el.classList.remove('running'));
      const checker = intervals[id];
      const el = document.querySelector(`.ticket-checker[data-instance="${id}"]`);
      if (el) el.classList.add('running');
      await checker.checker();
      await new Promise(resolve => {
        setTimeout(resolve, loop * 1000);
      });
    }
  }
}

export function stopAll() {
  clearTimeout(sequenceTimeout);
  setRunning(false);
  Object.values(intervals).forEach(i => clearInterval(i.interval));
  document.querySelectorAll('.ticket-checker').forEach(el => el.classList.remove('running'));
}

export function startAll() {
  const loop = parseInt(document.getElementById('globalLoop').value, 10) || 10;
  const validIds = Object.keys(intervals).filter(id => {
    const date = document.getElementById(`date-${id}`)?.value;
    const times = Array.from(document.querySelectorAll(`#timeGrid-${id} .time-thumb.selected`));
    const enabled = document.getElementById(`enabled-${id}`)?.value === 'true';
    return date && times.length > 0 && enabled;
  });

  if (validIds.length === 0) {
    alert("⚠️ No enabled checkers with valid date and time selected.");
    return;
  }

  stopAll();
  runAllSequentially(validIds, loop);
}
