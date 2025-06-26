import express from 'express';
import axios from 'axios';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 CORS: Allow requests from Firebase Hosting
app.use(cors());
app.use(bodyParser.json());

// ✅ POST /check-tickets — main API used by frontend
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

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
