export const timeSlots = [
  "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00",
  "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00",
  "16:30", "17:00", "17:30"
];

export const API_BASE = 'https://ticketchecker-backend.onrender.com';

// Shared app-wide state
export const intervals = {};              // Holds each checker's timer
export let sequenceTimeout = null;        // For sequential loop delay
export let notificationsEnabled = false;  // Toggle for browser notifications
export let runningSequential = false;     // Whether Start All is looping
export let audioRepeatCount = 3;          // Number of alert audio repeats

// Mutators for updating let bindings
export function setRunning(value) {
  runningSequential = value;
}

export function setAudioRepeat(val) {
  audioRepeatCount = val;
}

export function setNotifications(value) {
  notificationsEnabled = value;
}
