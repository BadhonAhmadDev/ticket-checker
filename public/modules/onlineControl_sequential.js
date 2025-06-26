import { intervals } from './constants.js';

let onlineRunning = false;

export function stopOnlineLoop() {
  onlineRunning = false;

  // Reset button UI
  document.getElementById("onlineToggleIcon").textContent = "▶";
  document.getElementById("onlineToggleText").textContent = "Online Start All";

  // Remove highlights
  document.querySelectorAll('.ticket-checker').forEach(el => el.classList.remove('running'));

  console.log("🛑 Online sequential loop stopped.");
}

async function runOnlineSequential(validIds, loopInterval) {
  console.log("🚀 Starting online UI-based sequential checking...");
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  onlineRunning = true;

  while (onlineRunning) {
    for (let id of validIds) {
      if (!onlineRunning) break;

      // 🔄 Highlight current checker
      document.querySelectorAll('.ticket-checker').forEach(el => el.classList.remove('running'));
      const currentEl = document.querySelector(`.ticket-checker[data-instance="${id}"]`);
      if (currentEl) currentEl.classList.add('running');

      try {
        // ✅ Trigger local checker (frontend logic with audio, UI, notifications)
        if (intervals[id] && typeof intervals[id].checker === 'function') {
          await intervals[id].checker();
          console.log(`✅ Ran UI checker for ID ${id}`);
        } else {
          console.warn(`⚠️ Checker not found for ID ${id}`);
        }
      } catch (err) {
        console.error(`❌ Error running checker for ID ${id}`, err);
      }

      // ⏳ Wait before next checker
      await delay(loopInterval * 1000);
    }
  }

  // Clean up
  document.querySelectorAll('.ticket-checker').forEach(el => el.classList.remove('running'));
  console.log("🔁 Completed full loop (or stopped).");
}

export function initOnlineToggle() {
  const toggleBtn = document.getElementById("onlineStartToggle");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    if (!onlineRunning) {
      const checkerCount = Number(document.getElementById("checkerCount")?.value || 0);
      const loopInterval = parseInt(document.getElementById("globalLoop")?.value || "10", 10);

      const validIds = [];
      for (let id = 1; id <= checkerCount; id++) {
        const enabled = document.getElementById(`enabled-${id}`)?.value === "true";
        const dateInput = document.getElementById(`date-${id}`)?.value;
        const times = Array.from(document.querySelectorAll(`#timeGrid-${id} .time-thumb.selected`));
        if (enabled && dateInput && times.length > 0) {
          validIds.push(id);
        }
      }

      if (validIds.length === 0) {
        alert("⚠️ No valid enabled checkers found.");
        return;
      }

      // Update button
      document.getElementById("onlineToggleIcon").textContent = "⏸";
      document.getElementById("onlineToggleText").textContent = "Online Stop All";

      runOnlineSequential(validIds, loopInterval);

    } else {
      stopOnlineLoop();
    }
  });
}
