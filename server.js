import express from 'express';
import axios from 'axios';
import chalk from 'chalk';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔐 Enable CORS so Firebase frontend can access backend
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 📩 Telegram Setup
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const sendTelegramAlertToGroup = async (message) => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    });
    console.log(chalk.green("📬 Telegram alert sent."));
  } catch (err) {
    console.error(chalk.red("❌ Failed to send Telegram message:"), err.message);
  }
};

// 🔊 Serve audio
app.get('/alert-audio', (req, res) => {
  const audioPath = path.join(__dirname, 'audio.mp3');
  if (fs.existsSync(audioPath)) {
    res.setHeader('Content-Type', 'audio/mpeg');
    fs.createReadStream(audioPath).pipe(res);
  } else {
    res.status(404).send('Audio file not found.');
  }
});

// 🔁 Auto-check loop
let autoCheckInterval = null;
let autoCheckConfig = [];

app.post('/start-auto-check', (req, res) => {
  if (autoCheckInterval) return res.json({ status: 'Already running' });

  const { checkers, loopInterval } = req.body;
  if (!Array.isArray(checkers) || checkers.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid checker list' });
  }

  autoCheckConfig = checkers;
  const delay = loopInterval ? parseInt(loopInterval, 10) * 1000 : 60000;

  const runBackendCheck = async () => {
    console.log(chalk.blue(`🔁 Running backend auto-check (${checkers.length} checkers)...`));

    for (const { visitDate, times } of autoCheckConfig) {
      try {
        const bookingRes = await axios.get('https://tickets.museivaticani.va/api/search/result', {
          params: {
            lang: 'en',
            visitorNum: 2,
            visitDate,
            area: 1,
            who: 2,
            page: 0,
          },
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });

        const visit = bookingRes.data.visits.find(v => v.id === 640 && v.availability === 'AVAILABLE');
        if (!visit) continue;

        const ticketRes = await axios.get('https://tickets.museivaticani.va/api/visit/timeavail', {
          params: {
            lang: 'en',
            visitLang: '',
            visitTypeId: 640,
            visitorNum: 2,
            visitDate,
          },
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });

        const timetable = ticketRes.data.timetable;
        const available = timetable.filter(slot =>
          (slot.availability === 'AVAILABLE' || slot.availability === 'LOW_AVAILABILITY') &&
          times.includes(slot.time)
        );

        if (available.length > 0) {
          const message = `🎫 *Tickets Available!*\n📅 ${visitDate}\n` +
            available.map(s => `🕒 ${s.time}: ${s.availability}`).join('\n');

          await sendTelegramAlertToGroup(message);
        }
      } catch (err) {
        console.error(chalk.red('❌ Backend checker error:'), err.message);
      }
    }
  };

  runBackendCheck();
  autoCheckInterval = setInterval(runBackendCheck, delay);
  res.json({ status: 'Backend auto-check started' });
});

app.post('/stop-auto-check', (req, res) => {
  if (autoCheckInterval) {
    clearInterval(autoCheckInterval);
    autoCheckInterval = null;
    autoCheckConfig = [];
    console.log(chalk.yellow('🛑 Backend auto-check stopped'));
    return res.json({ status: 'Auto check stopped' });
  }
  res.json({ status: 'No active check to stop' });
});

// ✅ /check-tickets route (used by frontend)
app.post('/check-tickets', async (req, res) => {
  const { visitDate, times } = req.body;

  if (!visitDate || !Array.isArray(times) || times.length === 0) {
    return res.status(400).json({ error: 'Invalid request: visitDate and times are required' });
  }

  try {
    const ticketRes = await axios.get('https://tickets.museivaticani.va/api/visit/timeavail', {
      params: {
        lang: 'en',
        visitLang: '',
        visitTypeId: 640,
        visitorNum: 2,
        visitDate,
      },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const timetable = ticketRes.data.timetable || [];
    const availableSlots = timetable.filter(slot =>
      times.includes(slot.time) &&
      (slot.availability === 'AVAILABLE' || slot.availability === 'LOW_AVAILABILITY')
    );

    res.json({ slots: availableSlots });
  } catch (err) {
    console.error('❌ /check-tickets error:', err.message);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(chalk.cyan(`🚀 Server running on port ${PORT}`));
});
