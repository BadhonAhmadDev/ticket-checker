//  1. Constants & State

const timeSlots = [
  "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00",
  "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00",
  "16:30", "17:00", "17:30"
];

const API_BASE = 'https://ticketchecker-backend.onrender.com';
const intervals = {};
let sequenceTimeout = null;
let notificationsEnabled = false;
let runningSequential = false;
let audioRepeatCount = 3;


// 2. Save & Load Checker Settings

function saveCheckerSettings(id) {
  const visitDate = document.getElementById(`date-${id}`)?.value || '';
  const times = Array.from(document.querySelectorAll(`#timeGrid-${id} .time-thumb.selected`))
    .map(el => el.dataset.value);
  const enabled = document.getElementById(`enabled-${id}`)?.value || 'true';
  const config = { date: visitDate, times, enabled };
  localStorage.setItem(`ticketCheckerConfig_${id}`, JSON.stringify(config));
  updateSummary(id, times);
}

function loadCheckerSettings(id) {
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

function updateSummary(id, times) {
  const summary = document.getElementById(`summary-${id}`);
  if (!summary) return;
  summary.innerHTML = `<strong>Selected:</strong> ${times.length ? times.join(', ') : '(none)'}`;
}



// 3. setupChecker(id, label)

function setupChecker(id, label) {
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
      <table>
        <thead><tr><th>Time</th><th>Availability</th></tr></thead>
        <tbody id="tableBody-${id}"></tbody>
      </table>
    </div>
    <audio id="alertSound-${id}" src="https://ticketchecker-backend.onrender.com/alert-audio" preload="auto"></audio>
  `;

  // Initialize flatpickr date picker
  flatpickr(`#date-${id}`, {
    dateFormat: "d/m/Y",
    defaultDate: "today",
    altInput: true,
    altFormat: "F j, Y",
    onChange: () => saveCheckerSettings(id)
  });

  // Generate time slot buttons
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

  // Handle popup toggle
  document.getElementById(`toggle-${id}`).onclick = () => {
    document.getElementById(`popup-${id}`).classList.toggle('open');
  };

  // Close popup on outside click
  window.addEventListener('click', e => {
    if (!document.getElementById(`popup-${id}`).contains(e.target)) {
      document.getElementById(`popup-${id}`).classList.remove('open');
    }
  });

  // Select All / Clear All buttons
  document.getElementById(`selectAll-${id}`).onclick = () => {
    grid.querySelectorAll('.time-thumb').forEach(el => el.classList.add('selected'));
    saveCheckerSettings(id);
  };

  document.getElementById(`clearAll-${id}`).onclick = () => {
    grid.querySelectorAll('.time-thumb').forEach(el => el.classList.remove('selected'));
    saveCheckerSettings(id);
  };

  // Enable/disable dropdown effect on UI
  document.getElementById(`enabled-${id}`).addEventListener('change', e => {
    el.style.opacity = e.target.value === 'true' ? '1' : '0.5';
    saveCheckerSettings(id);
  });

  // Load saved settings
  loadCheckerSettings(id);
  if (!initialLoadComplete) {
    saveCheckerSettings(id);
    initialLoadComplete = true;
  }

  // Async checker logic with API call
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

      // Highlight checker visually
      const checkerDiv = document.querySelector(`.ticket-checker[data-instance="${id}"]`);
      checkerDiv.classList.toggle('alert-highlight', highlightRed);

      // Play alert audio
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

      // Desktop notification
      if (notificationsEnabled && Notification.permission === 'granted') {
        new Notification('🎫 Tickets Available!', {
          body: `Date: ${visitDate}\nTimes: ${times.join(', ')}`,
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



// 4. Loop Control Functions

function startAll() {
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

async function runAllSequentially(validIds, loop) {
  runningSequential = true;
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
        sequenceTimeout = setTimeout(resolve, loop * 1000);
      });
    }
  }
}

function stopAll() {
  clearTimeout(sequenceTimeout);
  runningSequential = false;
  Object.values(intervals).forEach(i => clearInterval(i.interval));
  document.querySelectorAll('.ticket-checker').forEach(el => el.classList.remove('running'));
}


// 5. DOMContentLoaded Initialization

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.side-by-side-container');
  const countInput = document.getElementById('checkerCount');
  const month1Input = document.getElementById('month1Input');
  const month2Input = document.getElementById('month2Input');

  // Restore local settings
  const storedCount = parseInt(localStorage.getItem('checkerCount'), 10) || 62;
  const storedMonth1 = localStorage.getItem('month1Name');
  const storedMonth2 = localStorage.getItem('month2Name');
  const storedLoop = localStorage.getItem('globalLoop');
  const storedRepeat = localStorage.getItem('audioRepeat');
  const storedNotify = localStorage.getItem('notifyToggle');

  countInput.value = storedCount;
  if (storedMonth1) month1Input.value = storedMonth1;
  if (storedMonth2) month2Input.value = storedMonth2;
  if (storedLoop) document.getElementById('globalLoop').value = storedLoop;
  if (storedRepeat) {
    document.getElementById('audioRepeat').value = storedRepeat;
    audioRepeatCount = parseInt(storedRepeat, 10);
  }
  if (storedNotify === 'true') {
    document.getElementById('notifyToggle').checked = true;
    notificationsEnabled = true;
  }

  // Create checkers
  const createCheckers = (count) => {
    stopAll();
    container.innerHTML = '';
    Object.keys(intervals).forEach(key => delete intervals[key]);

    for (let i = 1; i <= count; i++) {
      const month = Math.floor((i - 1) / 31) % 2 === 0
        ? (month1Input.value || 'June')
        : (month2Input.value || 'July');
      const day = ((i - 1) % 31) + 1;
      const label = `${month} ${day}`;

      const div = document.createElement('div');
      div.className = 'ticket-checker';
      div.dataset.instance = i;
      container.appendChild(div);
      setupChecker(i, label);
    }
  };

  createCheckers(storedCount);

  // Update checker count
  countInput.addEventListener('change', () => {
    const newCount = Math.max(1, Math.min(parseInt(countInput.value, 10) || 1, 1000));
    countInput.value = newCount;
    localStorage.setItem('checkerCount', newCount);
    createCheckers(newCount);
  });

  // Save custom month names
  ['month1Input', 'month2Input'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      localStorage.setItem('month1Name', month1Input.value);
      localStorage.setItem('month2Name', month2Input.value);
      const currentCount = parseInt(countInput.value, 10) || 62;
      createCheckers(currentCount);
    });
  });

  // Start/Stop All
  const toggleBtn = document.getElementById('globalToggle');
  const toggleIcon = document.getElementById('toggleIcon');
  const toggleText = document.getElementById('toggleText');

  toggleBtn.addEventListener('click', () => {
    if (runningSequential) {
      stopAll();
      toggleIcon.textContent = '▶';
      toggleIcon.className = 'green-icon';
      toggleText.textContent = 'Start All';
    } else {
      startAll();
      toggleIcon.textContent = '⏹';
      toggleIcon.className = 'red-icon';
      toggleText.textContent = 'Stop All';
    }
  });

  // Notification toggle
  document.getElementById('notifyToggle').addEventListener('change', e => {
    notificationsEnabled = e.target.checked;
    localStorage.setItem('notifyToggle', notificationsEnabled);
    if (notificationsEnabled && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  });

  // Audio repeat count
  document.getElementById('audioRepeat').addEventListener('change', e => {
    audioRepeatCount = Math.max(1, parseInt(e.target.value, 10) || 3);
    localStorage.setItem('audioRepeat', audioRepeatCount);
  });

  // Global loop timing
  document.getElementById('globalLoop').addEventListener('change', e => {
    localStorage.setItem('globalLoop', e.target.value);
  });

  // Export settings
  document.getElementById('exportConfig').addEventListener('click', () => {
    const count = parseInt(localStorage.getItem('checkerCount'), 10) || 1;

    const config = {
      checkerCount: count,
      checkers: {},
      globalLoop: document.getElementById('globalLoop').value,
      notifyToggle: document.getElementById('notifyToggle').checked,
      audioRepeat: document.getElementById('audioRepeat').value,
      month1Name: document.getElementById('month1Input').value || 'June',
      month2Name: document.getElementById('month2Input').value || 'July'
    };

    for (let i = 1; i <= count; i++) {
      const data = localStorage.getItem(`ticketCheckerConfig_${i}`);
      if (data) {
        config.checkers[i] = JSON.parse(data);
      }
    }

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ticket-checker-config.json';
    link.click();
  });

  // Import settings
  document.getElementById('importConfigBtn').addEventListener('click', () => {
    document.getElementById('importConfig').click();
  });

  document.getElementById('importConfig').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const config = JSON.parse(e.target.result);
        if (config.checkerCount && config.checkers) {
          localStorage.setItem('checkerCount', config.checkerCount);
          Object.entries(config.checkers).forEach(([id, data]) => {
            localStorage.setItem(`ticketCheckerConfig_${id}`, JSON.stringify(data));
          });

          if (config.globalLoop) localStorage.setItem('globalLoop', config.globalLoop);
          if (config.audioRepeat) localStorage.setItem('audioRepeat', config.audioRepeat);
          if (typeof config.notifyToggle === 'boolean') {
            localStorage.setItem('notifyToggle', config.notifyToggle);
          }

          if (config.month1Name) localStorage.setItem('month1Name', config.month1Name);
          if (config.month2Name) localStorage.setItem('month2Name', config.month2Name);

          alert("✅ Settings imported. Reloading...");
          setTimeout(() => location.reload(), 500);
        } else {
          alert('⚠️ Invalid configuration file.');
        }
      } catch (err) {
        alert('❌ Failed to read configuration: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  // Hard Reset Button
  const resetBtn = document.createElement('button');
  resetBtn.textContent = '🗑 Hard Reset All Settings';
  resetBtn.style.marginTop = '15px';
  resetBtn.onclick = () => {
    if (confirm('⚠️ This will erase ALL settings and reload. Proceed?')) {
      localStorage.clear();
      alert('🗑 All settings cleared. Reloading...');
      setTimeout(() => location.reload(), 1000);
    }
  };
  document.querySelector('.import-export')?.appendChild(resetBtn);
});
