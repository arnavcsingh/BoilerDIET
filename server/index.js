import dotenv from "dotenv";
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import { calculateNutrition, calculateMealNutrition, saveMealToDatabase } from '../db-nutrition-calc.js';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true, timestamp: Date.now() }));

// GET /nutrition?food=Rice&amount=100&unit=g
app.get('/nutrition', async (req, res) => {
  try {
    const { food, amount = 100, unit = 'g', mock = 'false' } = req.query;
    console.log('GET /nutrition - food:', food, 'amount:', amount, 'unit:', unit);
    if (!food) return res.status(400).json({ ok: false, error: 'food query required' });
    const useMock = mock === 'true';
    const data = await calculateNutrition(food, Number(amount), unit, useMock);
    console.log('Nutrition result:', data ? 'found' : 'NOT FOUND');
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

// DB helper for menu endpoints (reuse same env-based config as db-nutrition-calc)
const configureDB = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'MySR00tP@s$!',
  database: process.env.DB_NAME || 'diningDB',
  waitForConnections: true,
  connectionLimit: 5
};

// List known dining courts from diningcourthistory
app.get('/diningcourts', async (req, res) => {
  try {
    console.log('Attempting to connect to DB with config:', { host: configureDB.host, user: configureDB.user, database: configureDB.database, hasPassword: !!configureDB.password });
    const conn = await mysql.createConnection(configureDB);
    console.log('DB connection successful');
    const [rows] = await conn.execute(`SELECT DISTINCT DiningCourt FROM diningcourthistory ORDER BY DiningCourt`);
    console.log('Query result:', rows.length, 'rows returned');
    await conn.end();
    const courts = rows.map(r => (r.DiningCourt || r.diningCourt || r.diningcourt));
    console.log('Courts mapped:', courts);
    return res.json({ ok: true, courts });
  } catch (err) {
    console.error('GET /diningcourts error:', err.code, err.sqlState, err.message);
    return res.status(500).json({ ok: false, error: err.message, code: err.code, sqlState: err.sqlState });
  }
});

// Get menu items for a dining court and optionally filter by meal type
app.get('/menu', async (req, res) => {
  try {
    const { court, mealType } = req.query;
    if (!court) return res.status(400).json({ ok: false, error: 'court query required' });
    
    const conn = await mysql.createConnection(configureDB);
    // Use lowercase column names matching actual DB schema (itemId, name, servingSize)
    let sql = `SELECT DISTINCT f.name, f.servingSize FROM diningcourthistory dch
               JOIN foods f ON dch.ItemId = f.itemId
               WHERE dch.DiningCourt = ?`;
    const params = [court];
    
    // Filter by meal type if provided
    if (mealType) {
      sql += ` AND dch.MealType = ?`;
      params.push(mealType);
    }
    
    sql += ` ORDER BY f.name LIMIT 1000`;
    const [rows] = await conn.execute(sql, params);
    await conn.end();
    
    // Deduplicate by food name (first occurrence only) and create unique values
    const seen = new Map();
    const items = [];
    rows.forEach((r, idx) => {
      const foodName = r.name;
      if (!foodName) return;
      const key = foodName.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.set(key, true);
        items.push({
          label: foodName,
          value: `${foodName}_${idx}`, // Unique value to prevent React duplicate key errors
          servingSize: r.servingSize || '100g'
        });
      }
    });
    
    return res.json({ ok: true, items });
  } catch (err) {
    console.error('GET /menu error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Get available meal types
app.get('/mealtypes', async (req, res) => {
  try {
    const mealTypes = ['Breakfast', 'Brunch', 'Lunch', 'Late Lunch', 'Dinner'];
    return res.json({ ok: true, mealTypes });
  } catch (err) {
    console.error('GET /mealtypes error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});
