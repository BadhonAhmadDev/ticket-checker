import express from 'express';
import axios from 'axios';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// ESModule __dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// 🎫 POST /check-tickets
app.post('/check-tickets', async (req, res) => {
  const { visitDate, times } = req.body;

  if (!visitDate || !Array.isArray(times) || times.length === 0) {
    return res.status(400).json({ error: 'Invalid request: visitDate and times required' });
  }

  try {
    const ticketRes = await axios.get('https://tickets.museivaticani.va/api/visit/timeavail', {
      params: {
        lang: 'en',
        visitLang: '',
        visitTypeId: 640,
        visitorNum: 2,
        visitDate
      },
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const timetable = ticketRes.data.timetable || [];

    const availableSlots = timetable.filter(slot =>
      times.includes(slot.time) &&
      ['AVAILABLE', 'LOW_AVAILABILITY'].includes(slot.availability)
    );

    res.json({ slots: availableSlots });
  } catch (err) {
    console.error('❌ /check-tickets error:', err.message);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// 🔊 GET /alert-audio (serves audio.mp3 from root folder)
app.get('/alert-audio', (req, res) => {
  const audioPath = path.join(__dirname, 'audio.mp3'); // ✅ audio.mp3 must be in root

  if (fs.existsSync(audioPath)) {
    res.setHeader('Content-Type', 'audio/mpeg');
    fs.createReadStream(audioPath).pipe(res);
  } else {
    res.status(404).send('Audio file not found.');
  }
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
