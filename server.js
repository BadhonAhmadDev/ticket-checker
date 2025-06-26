import express from 'express';
import axios from 'axios';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve __dirname for ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS for all routes
app.use(cors());
app.use(bodyParser.json());

// ✅ Route: /check-tickets
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

// ✅ Route: /alert-audio (fix for ORB issue)
app.get('/alert-audio', (req, res) => {
  const audioPath = path.join(__dirname, 'audio.mp3'); // File must be in root folder

  if (fs.existsSync(audioPath)) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // ✅ Required for ORB
    res.setHeader('Content-Type', 'audio/mpeg');       // ✅ Ensures correct MIME
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // ✅ ORB fix
    fs.createReadStream(audioPath).pipe(res);
  } else {
    res.status(404).send('Audio file not found.');
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
