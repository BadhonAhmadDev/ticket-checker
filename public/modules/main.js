import { setupChecker } from './checker.js';
import { startAll, stopAll } from './loopControl.js';
import {
  intervals,
  setRunning,
  setAudioRepeat,
  setNotifications
} from './constants.js';
import { initOnlineToggle } from './onlineControl_sequential.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.side-by-side-container');
  const countInput = document.getElementById('checkerCount');
  const month1Input = document.getElementById('month1Input');
  const month2Input = document.getElementById('month2Input');

  // Load stored settings
  const storedCount = parseInt(localStorage.getItem('checkerCount'), 10) || 62;
  const storedMonth1 = localStorage.getItem('month1Name') || '';
  const storedMonth2 = localStorage.getItem('month2Name') || '';
  const storedLoop = localStorage.getItem('globalLoop');
  const storedRepeat = localStorage.getItem('audioRepeat');
  const storedNotify = localStorage.getItem('notifyToggle');

  countInput.value = storedCount;
  month1Input.value = storedMonth1;
  month2Input.value = storedMonth2;
  if (storedLoop) document.getElementById('globalLoop').value = storedLoop;
  if (storedRepeat) {
    document.getElementById('audioRepeat').value = storedRepeat;
    setAudioRepeat(parseInt(storedRepeat, 10));
  }
  if (storedNotify === 'true') {
    document.getElementById('notifyToggle').checked = true;
    setNotifications(true);
  }

  // Checker Generator
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

  // Count change
  countInput.addEventListener('change', () => {
    const newCount = Math.max(1, Math.min(parseInt(countInput.value, 10) || 1, 1000));
    countInput.value = newCount;
    localStorage.setItem('checkerCount', newCount);
    createCheckers(newCount);
  });

  // Month name changes
  ['month1Input', 'month2Input'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      localStorage.setItem('month1Name', month1Input.value);
      localStorage.setItem('month2Name', month2Input.value);
      createCheckers(parseInt(countInput.value, 10) || 62);
    });
  });

  // Global start/stop button
  const toggleBtn = document.getElementById('globalToggle');
  const toggleIcon = document.getElementById('toggleIcon');
  const toggleText = document.getElementById('toggleText');

  toggleBtn.addEventListener('click', () => {
    if (document.querySelector('.ticket-checker.running')) {
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
    const val = e.target.checked;
    setNotifications(val);
    localStorage.setItem('notifyToggle', val);
    if (val && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  });

  // Audio repeat count
  document.getElementById('audioRepeat').addEventListener('change', e => {
    const val = Math.max(1, parseInt(e.target.value, 10) || 3);
    setAudioRepeat(val);
    localStorage.setItem('audioRepeat', val);
  });

  // Loop interval setting
  document.getElementById('globalLoop').addEventListener('change', e => {
    localStorage.setItem('globalLoop', e.target.value);
  });

  // Export settings
  document.getElementById('exportConfig')?.addEventListener('click', () => {
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
      if (data) config.checkers[i] = JSON.parse(data);
    }

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ticket-checker-config.json';
    link.click();
  });

  // Trigger file input
  document.getElementById('importConfigBtn')?.addEventListener('click', () => {
    document.getElementById('importConfig').click();
  });

  // Import config file
  document.getElementById('importConfig')?.addEventListener('change', event => {
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
          if ('notifyToggle' in config) localStorage.setItem('notifyToggle', config.notifyToggle);
          if (config.month1Name) localStorage.setItem('month1Name', config.month1Name);
          if (config.month2Name) localStorage.setItem('month2Name', config.month2Name);

          alert('✅ Settings imported. Reloading...');
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

  // Hard reset
  document.getElementById('hardResetBtn')?.addEventListener('click', () => {
    if (confirm('⚠️ This will erase ALL settings and reload. Proceed?')) {
      localStorage.clear();
      alert('🗑 All settings cleared. Reloading...');
      setTimeout(() => location.reload(), 1000);
    }
  });

  // ✅ Enable sequential online toggle
  initOnlineToggle();
});
