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
const audioFilePath = path.join(__dirname, 'audio.mp3'); // Must be here

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🎵 Secure route to serve audio (not publicly exposed)
app.get('/alert-audio', (req, res) => {
  console.log('📡 Incoming request for audio:', audioFilePath);
  if (!fs.existsSync(audioFilePath)) {
    console.log('❌ File not found!');
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

// 🧠 Ticket checker route
const headers = {
  'User-Agent': 'Mozilla/5.0',
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/plain',
};

app.post('/check-tickets', async (req, res) => {
  const { visitDate, times } = req.body;
  const bookingAvailableId = 640;
  const visitorNum = 2;

  try {
    const bookingRes = await axios.get(
      'https://tickets.museivaticani.va/api/search/result',
      {
        params: {
          lang: 'en',
          visitorNum,
          visitDate,
          area: 1,
          who: 2,
          page: 0,
        },
        headers,
      }
    );

    const bookings = bookingRes.data.visits;
    let output = [];

    for (const visit of bookings) {
      if (visit.id === bookingAvailableId && visit.availability === 'AVAILABLE') {
        const ticketRes = await axios.get(
          'https://tickets.museivaticani.va/api/visit/timeavail',
          {
            params: {
              lang: 'en',
              visitLang: '',
              visitTypeId: bookingAvailableId,
              visitorNum,
              visitDate,
            },
            headers,
          }
        );

        const timetable = ticketRes.data.timetable;

        for (const slot of timetable) {
          const isValid =
            (slot.availability === 'AVAILABLE' ||
              slot.availability === 'LOW_AVAILABILITY') &&
            times.includes(slot.time);
          if (isValid) {
            output.push({ time: slot.time, availability: slot.availability });
            notifier.notify({
              title: 'Tickets Available',
              message: `${slot.time} - ${slot.availability}`,
            });
          }
        }
      }
    }

    res.json({ found: output.length > 0, slots: output });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed to check tickets' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(chalk.green(`🚀 Server running at http://localhost:${port}`));
});
