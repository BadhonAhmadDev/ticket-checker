
import { timeSlots, API_BASE, intervals, audioRepeatCount, notificationsEnabled } from './constants.js';
import { saveCheckerSettings, loadCheckerSettings } from './storage.js';

export function updateSummary(id, times) {
  const summary = document.getElementById(`summary-${id}`);
  if (!summary) return;
  summary.innerHTML = `<strong>Selected:</strong> ${times.length ? times.join(', ') : '(none)'}`;
}

export function setupChecker(id, label) {
  let initialLoadComplete = false;
  const el = document.querySelector(`.ticket-checker[data-instance="${id}"]`);
  el.classList.add(id <= 31 ? 'manual-input' : 'second-input');

  el.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <h2 style="margin: 0;">${label}</h2>
      <div style="display: flex; align-items: center; gap: 6px;">
        <label style="font-size: 12px;">Status:</label>
        <select id="enabled-${id}" style="font-size: 12px;">
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      </div>
    </div>
    <label>Date: <input id="date-${id}" type="text" /></label><br>
    <div class="label-row">
      <label for="toggle-${id}">Select Times:</label>
      <div class="popup-wrapper" id="popup-${id}">
        <button class="popup-toggle" id="toggle-${id}">⏱ Time Slots</button>
        <div class="popup-content">
          <div class="popup-controls">
            <button id="selectAll-${id}">All</button>
            <button id="clearAll-${id}">None</button>
          </div>
          <div class="thumbnail-grid" id="timeGrid-${id}"></div>
        </div>
      </div>
    </div>
    <div class="time-summary" id="summary-${id}"><strong>Selected:</strong> (none)</div>
    <div class="results">
      <table><thead><tr><th>Time</th><th>Availability</th></tr></thead><tbody id="tableBody-${id}"></tbody></table>
    </div>
    <audio id="alertSound-${id}" src="https://ticketchecker-backend.onrender.com/alert-audio" preload="auto"></audio>
  `;

  flatpickr(`#date-${id}`, {
    dateFormat: "d/m/Y",
    defaultDate: "today",
    altInput: true,
    altFormat: "F j, Y",
    onChange: () => saveCheckerSettings(id)
  });

  const grid = document.getElementById(`timeGrid-${id}`);
  timeSlots.forEach(time => {
    const div = document.createElement('div');
    div.className = 'time-thumb';
    div.dataset.value = time;
    div.innerText = time;
    div.onclick = () => {
      div.classList.toggle('selected');
      saveCheckerSettings(id);
    };
    grid.appendChild(div);
  });

  document.getElementById(`toggle-${id}`).onclick = () => {
    document.getElementById(`popup-${id}`).classList.toggle('open');
  };

  window.addEventListener('click', e => {
    if (!document.getElementById(`popup-${id}`).contains(e.target)) {
      document.getElementById(`popup-${id}`).classList.remove('open');
    }
  });

  document.getElementById(`selectAll-${id}`).onclick = () => {
    grid.querySelectorAll('.time-thumb').forEach(el => el.classList.add('selected'));
    saveCheckerSettings(id);
  };

  document.getElementById(`clearAll-${id}`).onclick = () => {
    grid.querySelectorAll('.time-thumb').forEach(el => el.classList.remove('selected'));
    saveCheckerSettings(id);
  };

  document.getElementById(`enabled-${id}`).addEventListener('change', e => {
    el.style.opacity = e.target.value === 'true' ? '1' : '0.5';
    saveCheckerSettings(id);
  });

  loadCheckerSettings(id);
  if (!initialLoadComplete) {
    saveCheckerSettings(id);
    initialLoadComplete = true;
  }

  const check = async () => {
    const visitDate = document.getElementById(`date-${id}`).value;
    const times = Array.from(grid.querySelectorAll('.time-thumb.selected')).map(el => el.dataset.value);
    const enabled = document.getElementById(`enabled-${id}`)?.value === 'true';
    if (!visitDate || times.length === 0 || !enabled) return;

    const res = await fetch(`${API_BASE}/check-tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitDate, times })
    });

    const data = await res.json();
    const tbody = document.getElementById(`tableBody-${id}`);
    tbody.innerHTML = '';

    let highlightRed = false;

    if (data.slots && data.slots.length > 0) {
      data.slots.forEach(slot => {
        const isAvailable = slot.availability === 'AVAILABLE';
        const isLow = slot.availability === 'LOW_AVAILABILITY';
        if (isAvailable || isLow) highlightRed = true;
        const color = isAvailable ? 'green' : 'red';
        tbody.innerHTML += `<tr><td>${slot.time}</td><td style="color:${color}">${slot.availability}</td></tr>`;
      });

      const checkerDiv = document.querySelector(`.ticket-checker[data-instance="${id}"]`);
      checkerDiv.classList.toggle('alert-highlight', highlightRed);

      const audio = document.getElementById(`alertSound-${id}`);
      let playCount = 0;
      const playAudio = () => {
        if (playCount < audioRepeatCount) {
          audio.currentTime = 0;
          audio.play();
          playCount++;
        }
      };
      audio.onended = playAudio;
      playAudio();

      if (notificationsEnabled && Notification.permission === 'granted') {
        new Notification('🎫 Tickets Available!', {
          body: `Date: ${visitDate}
Times: ${times.join(', ')}`,
          icon: 'favicon.ico'
        });
      }

    } else {
      tbody.innerHTML = '<tr><td colspan="2">No tickets</td></tr>';
      document.querySelector(`.ticket-checker[data-instance="${id}"]`)?.classList.remove('alert-highlight');
    }
  };

  intervals[id] = { checker: check, interval: null };
}
