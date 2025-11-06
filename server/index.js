import express from 'express';
import cors from 'cors';
import { calculateNutrition, calculateMealNutrition, saveMealToDatabase } from '../db-nutrition-calc.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true, timestamp: Date.now() }));

// GET /nutrition?food=Rice&amount=100&unit=g
app.get('/nutrition', async (req, res) => {
  try {
    const { food, amount = 100, unit = 'g', mock = 'false' } = req.query;
    if (!food) return res.status(400).json({ ok: false, error: 'food query required' });
    const useMock = mock === 'true';
    const data = await calculateNutrition(food, Number(amount), unit, useMock);
    if (!data) return res.status(404).json({ ok: false, error: 'not found' });
    return res.json({ ok: true, data });
  } catch (err) {
    console.error('GET /nutrition error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /meal  { items: [...], totals: { calories, protein, carbs, fat } }
app.post('/meal', async (req, res) => {
  try {
    const { items, totals } = req.body;
    if (!Array.isArray(items) || !totals) return res.status(400).json({ ok: false, error: 'items and totals required' });
    await saveMealToDatabase(items, totals);
    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /meal error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Nutrition API listening on port ${port}`));
