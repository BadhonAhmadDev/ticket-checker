// server.js
import express from 'express';
import axios from 'axios';
import chalk from 'chalk';
import notifier from 'node-notifier';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();
const port = 3000;

// Path helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const audioFilePath = path.join(__dirname, 'audio.mp3');

// Telegram config
const TELEGRAM_BOT_TOKEN = '7909147905:AAH9-pbLUfkTf-YYNj9peiFEvAbeWAAFPro';
const TELEGRAM_CHAT_ID = '-1002706453375';
// const TELEGRAM_CHAT_ID = '5440260132';


async function sendTelegramTo(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, { chat_id: chatId, text });
  } catch (error) {
    console.error(`❌ Failed to message ${chatId}:`, error.response?.data || error.message);
  }
}

function sendTelegramAlertToGroup(text) {
  return sendTelegramTo(TELEGRAM_CHAT_ID, text);
}

let autoCheckInterval = null;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🎵 Secure route to serve audio
app.get('/alert-audio', (req, res) => {
  if (!fs.existsSync(audioFilePath)) {
    return res.status(404).send('Audio file not found');
  }
  const stat = fs.statSync(audioFilePath);
  res.writeHead(200, {
    'Content-Type': 'audio/mpeg',
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes',
  });
  fs.createReadStream(audioFilePath).pipe(res);
});

const headers = {
  'User-Agent': 'Mozilla/5.0',
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/plain',
};

// 🧠 Manual check route (triggered from frontend)
app.post('/check-tickets', async (req, res) => {
  const { visitDate, times } = req.body;
  const bookingAvailableId = 640;
  const visitorNum = 2;
  try {
    const bookingRes = await axios.get('https://tickets.museivaticani.va/api/search/result', {
      params: {
        lang: 'en', visitorNum, visitDate, area: 1, who: 2, page: 0
      },
      headers,
    });

    const bookings = bookingRes.data.visits;
    let output = [];

    for (const visit of bookings) {
      if (visit.id === bookingAvailableId && visit.availability === 'AVAILABLE') {
        const ticketRes = await axios.get('https://tickets.museivaticani.va/api/visit/timeavail', {
          params: {
            lang: 'en', visitLang: '', visitTypeId: bookingAvailableId, visitorNum, visitDate
          },
          headers,
        });

        const timetable = ticketRes.data.timetable;
        for (const slot of timetable) {
          if ((slot.availability === 'AVAILABLE' || slot.availability === 'LOW_AVAILABILITY') && times.includes(slot.time)) {
            output.push({ time: slot.time, availability: slot.availability });
            notifier.notify({ title: 'Tickets Available', message: `${slot.time} - ${slot.availability}` });
          }
        }
      }
    }

    if (output.length > 0) {
      const message = `🎫 Tickets found for ${visitDate} at times: ${output.map(s => s.time).join(', ')}`;
      await sendTelegramAlertToGroup(message);
    }

    res.json({ found: output.length > 0, slots: output });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed to check tickets' });
  }
});

// ✅ Start auto-checking route
app.post('/start-auto-check', async (req, res) => {
  if (autoCheckInterval) return res.json({ status: 'Already running' });

  const { visitDate, times } = req.body;
  if (!visitDate || !Array.isArray(times)) {
    return res.status(400).json({ error: 'Missing visitDate or times' });
  }

  const runCheck = async () => {
    console.log(`🔁 Auto check running for ${visitDate}...`);
    try {
      const bookingRes = await axios.get('https://tickets.museivaticani.va/api/search/result', {
        params: {
          lang: 'en', visitorNum: 2, visitDate, area: 1, who: 2, page: 0
        }, headers
      });

      const bookings = bookingRes.data.visits;
      const visit = bookings.find(v => v.id === 640 && v.availability === 'AVAILABLE');

      if (visit) {
        const ticketRes = await axios.get('https://tickets.museivaticani.va/api/visit/timeavail', {
          params: {
            lang: 'en', visitLang: '', visitTypeId: 640, visitorNum: 2, visitDate
          }, headers
        });

        const timetable = ticketRes.data.timetable;
        const available = timetable.filter(slot =>
          (slot.availability === 'AVAILABLE' || slot.availability === 'LOW_AVAILABILITY') &&
          times.includes(slot.time)
        );

        if (available.length > 0) {
          const message = `🎫 Online Check: Tickets found for ${visitDate}\n${available.map(s => `${s.time}: ${s.availability}`).join('\n')}`;
          await sendTelegramAlertToGroup(message);
        }
      }
    } catch (e) {
      console.error('❌ Auto-check error:', e.message);
    }
  };

  runCheck();
  autoCheckInterval = setInterval(runCheck, 60_000);
  res.json({ status: 'Auto check started' });
});

// 🔴 Stop auto-checking route
app.post('/stop-auto-check', (req, res) => {
  if (autoCheckInterval) {
    clearInterval(autoCheckInterval);
    autoCheckInterval = null;
    console.log('🛑 Auto check stopped');
    return res.json({ status: 'Auto check stopped' });
  }
  res.json({ status: 'No active check to stop' });
});

// Start server
app.listen(port, () => {
  console.log(chalk.green(`🚀 Server running at http://localhost:${port}`));
});
