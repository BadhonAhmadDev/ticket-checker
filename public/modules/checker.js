import { API_BASE, audioRepeatCount } from './constants.js';

export async function runChecker(checker, onSuccess, onFailure) {
  const { visitDate, times } = checker;

  try {
    const res = await fetch(`${API_BASE}/check-tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitDate, times })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const available = data.slots || [];

    if (available.length > 0) {
      onSuccess(available); // Display result or update UI
      triggerAudioAlert();  // 🔊 play alert
    } else {
      onFailure(); // No tickets found
    }
  } catch (err) {
    console.error(`❌ Checker error (${visitDate}):`, err.message);
    onFailure();
  }
}

// 🔊 Play alert audio (repeat 3x)
function triggerAudioAlert() {
  const audio = new Audio('https://ticket-checker-9rnf.onrender.com/alert-audio');
  let count = 0;

  audio.addEventListener('ended', () => {
    count++;
    if (count < audioRepeatCount) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  });

  audio.play().catch(err => {
    console.error('🔇 Audio play failed:', err.message);
  });
}
