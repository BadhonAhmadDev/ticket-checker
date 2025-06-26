// constants.js

// 🌐 Backend API Base URL (Render backend)
export const API_BASE = 'https://ticket-checker-9rnf.onrender.com';

// ⏰ Vatican Museum time slots (used for ticket checking)
export const timeSlots = [
  "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00",
  "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30"
];

// 🔁 Intervals store (used by each individual checker)
export const intervals = {};

// 🕒 Timeout used for sequential "Start All" mode
export let sequenceTimeout = null;

// 🔔 Notification setting (toggled via checkbox)
export let notificationsEnabled = false;

// 🔁 Whether "Start All" is currently running
export let runningSequential = false;

// 🔊 Number of times to repeat alert audio
export let audioRepeatCount = 3;

// 🛠 Set whether sequential checker is running
export function setRunning(value) {
  runningSequential = value;
}

// 🛠 Set how many times to repeat audio alert
export function setAudioRepeat(val) {
  audioRepeatCount = val;
}

// 🛠 Set whether browser notifications are enabled
export function setNotifications(value) {
  notificationsEnabled = value;
}
